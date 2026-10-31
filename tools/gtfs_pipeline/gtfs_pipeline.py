"""Download the gtfs.de feed and build per-line stop sequences for a region.

Usage:
  python gtfs_pipeline.py --list-agencies   # review which operators serve the region
  python gtfs_pipeline.py                   # download (if changed) and build output
Standard library only; the zip is streamed, never fully extracted.
"""
import argparse
import collections
import csv
import io
import json
import math
import os
import re
import shutil
import sys
import urllib.error
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
TYPE_PREFIX = {0: "tram", 3: "bus"}


def load_config(path):
    cfg = json.loads(Path(path).read_text(encoding="utf-8"))
    for key in ("cacheDir", "outputDir"):
        p = Path(cfg[key])
        cfg[key] = p if p.is_absolute() else HERE / p
    return cfg


def download(url, cache_dir, force):
    """Download the zip unless the server's ETag says it is unchanged."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    zip_path = cache_dir / "gtfs.zip"
    state_path = cache_dir / "state.json"
    state = json.loads(state_path.read_text()) if state_path.exists() else {}
    headers = {}
    if zip_path.exists() and state.get("etag") and not force:
        headers["If-None-Match"] = state["etag"]
    try:
        resp = urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60)
    except urllib.error.HTTPError as e:
        if e.code == 304:
            print("Feed unchanged since last download, using cached zip.")
            return zip_path, state
        raise
    total = int(resp.headers.get("Content-Length") or 0)
    tmp = zip_path.with_suffix(".part")
    done = 0
    with resp, open(tmp, "wb") as f:
        while True:
            chunk = resp.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
            done += len(chunk)
            if total:
                print(f"\rDownloading {done / 1e6:.0f}/{total / 1e6:.0f} MB", end="", flush=True)
    print()
    os.replace(tmp, zip_path)
    state = {
        "etag": resp.headers.get("ETag"),
        "lastModified": resp.headers.get("Last-Modified"),
        "downloadedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    state_path.write_text(json.dumps(state, indent=2))
    return zip_path, state


def open_csv(zf, name):
    return csv.DictReader(io.TextIOWrapper(zf.open(name), encoding="utf-8-sig", newline=""))


def read_stops(zf):
    return {r["stop_id"]: r for r in open_csv(zf, "stops.txt")}


def region_platforms(stops, region):
    """Platforms within region.radiusKm of the region centre."""
    clat, clng, radius = region["centerLat"], region["centerLng"], region["radiusKm"]
    kx = 111.32 * math.cos(math.radians(clat))
    ids = set()
    for sid, r in stops.items():
        if r["location_type"] == "1":
            continue
        try:
            lat, lng = float(r["stop_lat"]), float(r["stop_lon"])
        except ValueError:
            continue
        if math.hypot((lat - clat) * 111.32, (lng - clng) * kx) <= radius:
            ids.add(sid)
    return ids


def stop_time_lines(zf):
    """Yield raw lines of stop_times.txt plus the column indexes we rely on."""
    f = io.TextIOWrapper(zf.open("stop_times.txt"), encoding="utf-8-sig", newline="")
    header = next(csv.reader([f.readline()]))
    col = {name: i for i, name in enumerate(header)}
    return f, col


def count_region_stops(zf, platforms):
    """Pass 1: number of region platforms visited by each trip."""
    f, col = stop_time_lines(zf)
    i_trip, i_stop = col["trip_id"], col["stop_id"]
    split = max(i_trip, i_stop) + 1
    counts = collections.Counter()
    with f:
        for line in f:
            p = line.split(",", split)
            if p[i_stop] in platforms:
                counts[p[i_trip]] += 1
    return counts


def load_trip_rows(zf, wanted):
    """Pass 2: ordered (sequence, stop_id, headsign) rows of the wanted trips."""
    f, col = stop_time_lines(zf)
    i_trip, i_stop, i_seq = col["trip_id"], col["stop_id"], col["stop_sequence"]
    i_hs = col.get("stop_headsign")
    rows = collections.defaultdict(list)
    with f:
        for line in f:
            if line.split(",", 1)[0] not in wanted:
                continue
            p = next(csv.reader([line]))
            rows[p[i_trip]].append((int(p[i_seq]), p[i_stop], p[i_hs] if i_hs is not None else ""))
    return rows


def pick_routes(zf, counts, cfg):
    """Return candidate routes (bus etc.) that touch the region often enough."""
    routes = {r["route_id"]: r for r in open_csv(zf, "routes.txt")}
    agencies = {r["agency_id"]: r["agency_name"] for r in open_csv(zf, "agency.txt")}
    best = collections.defaultdict(int)
    ntrips = collections.Counter()
    trip_route = {}
    for r in open_csv(zf, "trips.txt"):
        if r["trip_id"] in counts:
            rid = r["route_id"]
            trip_route[r["trip_id"]] = rid
            best[rid] = max(best[rid], counts[r["trip_id"]])
            ntrips[rid] += 1
    cand = {}
    for rid, m in best.items():
        r = routes[rid]
        if int(r["route_type"]) not in cfg["routeTypes"] or m < cfg["minRegionStops"]:
            continue
        cand[rid] = {
            "routeId": rid, "line": r["route_short_name"], "longName": r["route_long_name"],
            "type": int(r["route_type"]), "agency": agencies.get(r["agency_id"], r["agency_id"]),
            "regionTrips": ntrips[rid],
        }
    return cand, trip_route


def list_agencies(cand):
    by = collections.defaultdict(list)
    for c in cand.values():
        by[c["agency"]].append(c)
    for name, lst in sorted(by.items(), key=lambda x: -len(x[1])):
        lines = sorted({c["line"] for c in lst})
        print(f"{name} | routes={len(lst)} | lines: {', '.join(lines[:25])}{' ...' if len(lines) > 25 else ''}")


def build_directions(seqs, total_trips, low_volume):
    """Split trip sequences into two directions and keep distinct route variants."""
    min_variant = 1 if total_trips < low_volume else 2
    main = max(seqs.items(), key=lambda kv: (kv[1]["n"], len(kv[0])))[0]
    idx = {s: i for i, s in enumerate(main)}
    dirs = {0: [], 1: []}
    for seq, info in seqs.items():
        if seq == main:
            dirs[0].append((seq, info))
            continue
        pos = [idx[s] for s in seq if s in idx]
        if len(pos) < 2:
            dirs[1].append((seq, info))
            continue
        inc = sum(b > a for a, b in zip(pos, pos[1:]))
        dec = sum(b < a for a, b in zip(pos, pos[1:]))
        dirs[0 if inc >= dec else 1].append((seq, info))
    result = []
    for d in (0, 1):
        group = dirs[d]
        tot = sum(i["n"] for _, i in group)
        if tot == 0 or (d == 1 and tot < max(1, 0.03 * total_trips)):
            continue
        top = max(i["n"] for _, i in group)
        seq, info = max((x for x in group if x[1]["n"] >= 0.2 * top), key=lambda x: (len(x[0]), x[1]["n"]))
        steps = set(zip(seq, seq[1:]))
        variants = []
        for s2, i2 in sorted(group, key=lambda x: -x[1]["n"]):
            if s2 == seq or i2["n"] < min_variant or not (set(zip(s2, s2[1:])) - steps):
                continue
            variants.append((s2, i2))
        result.append((d, seq, info, variants))
    return result


def make_stops(seq, platforms, stops):
    out = []
    for sid, pid in zip(seq, platforms):
        st, pl = stops[sid], stops[pid]
        code = pl["platform_code"] if "platform_code" in pl else ""
        out.append({
            "id": sid, "name": st["stop_name"],
            "shortName": st["stop_name"] + (" " + code if code else ""),
            "platformId": pid,
            "coord": {"lat": float(pl["stop_lat"]), "lng": float(pl["stop_lon"])},
        })
    return out


def headsign(info, seq, stops):
    return info["hs"].most_common(1)[0][0] if info["hs"] else stops[seq[-1]]["stop_name"]


def slug(text):
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def station_of(stops, pid):
    par = stops[pid]["parent_station"]
    return par if par and par in stops else pid


def build_lines(cfg, cand, trip_route, rows, stops):
    seqs_by_route = collections.defaultdict(lambda: collections.defaultdict(
        lambda: {"n": 0, "plat": collections.Counter(), "hs": collections.Counter()}))
    for tid, lst in rows.items():
        lst.sort()
        sts, pls = [], []
        try:
            for _, pid, _h in lst:
                sid = station_of(stops, pid)
                if sts and sts[-1] == sid:
                    continue
                sts.append(sid)
                pls.append(pid)
        except KeyError:
            continue
        if len(sts) < 2:
            continue
        entry = seqs_by_route[trip_route[tid]][tuple(sts)]
        entry["n"] += 1
        entry["plat"][tuple(pls)] += 1
        if lst[-1][2]:
            entry["hs"][lst[-1][2]] += 1

    # routes of one operator with the same line number are one line
    groups = collections.defaultdict(list)
    for rid in seqs_by_route:
        c = cand[rid]
        groups[(c["type"], c["agency"], c["line"])].append(rid)

    lines = []
    for (rtype, agency, number), rids in groups.items():
        merged = collections.defaultdict(lambda: {"n": 0, "plat": collections.Counter(), "hs": collections.Counter()})
        for rid in rids:
            for seq, info in seqs_by_route[rid].items():
                m = merged[seq]
                m["n"] += info["n"]
                m["plat"].update(info["plat"])
                m["hs"].update(info["hs"])
        total = sum(i["n"] for i in merged.values())
        directions = []
        for d, seq, info, variants in build_directions(merged, total, cfg["lowVolumeTrips"]):
            entry = {"direction": str(d), "headsign": headsign(info, seq, stops), "trips": info["n"],
                     "stops": make_stops(seq, info["plat"].most_common(1)[0][0], stops)}
            if variants:
                entry["variants"] = [{"trips": i2["n"], "headsign": headsign(i2, s2, stops),
                                      "stops": make_stops(s2, i2["plat"].most_common(1)[0][0], stops)}
                                     for s2, i2 in variants]
            directions.append(entry)
        if not directions:
            continue
        lead = max(rids, key=lambda r: cand[r]["regionTrips"])
        first, last = directions[0]["stops"][0]["name"], directions[0]["stops"][-1]["name"]
        lines.append({"line": number, "name": cand[lead]["longName"] or f"{first} - {last}",
                      "agency": agency, "type": TYPE_PREFIX.get(rtype, str(rtype)),
                      "routeIds": sorted(rids), "directions": directions})
    return lines


def write_outputs(cfg, lines, stops, platforms, state):
    out = cfg["outputDir"]
    lines_dir = out / "lines"
    if lines_dir.exists():
        shutil.rmtree(lines_dir)
    lines_dir.mkdir(parents=True, exist_ok=True)

    taken = collections.Counter((ln["type"], slug(ln["line"])) for ln in lines)
    for ln in lines:
        base = f"{ln['type']}_{slug(ln['line'])}"
        if taken[(ln["type"], slug(ln["line"]))] > 1:
            base += "_" + slug(ln["agency"])
        ln["file"] = f"{base}.json"
        (lines_dir / ln["file"]).write_text(json.dumps(ln, ensure_ascii=False, indent=2), encoding="utf-8")

    # stations of the region with their platforms
    stations = {}
    for pid in platforms:
        sid = station_of(stops, pid)
        s = stops.get(sid, stops[pid])
        entry = stations.setdefault(sid, {"id": sid, "name": s["stop_name"], "lat": float(s["stop_lat"]),
                                          "lng": float(s["stop_lon"]), "platforms": []})
        p = stops[pid]
        entry["platforms"].append({"id": pid, "platformCode": p.get("platform_code") or None,
                                   "lat": float(p["stop_lat"]), "lng": float(p["stop_lon"])})
    station_list = sorted(stations.values(), key=lambda s: (s["name"], s["id"]))
    (out / "stops.json").write_text(json.dumps(station_list, ensure_ascii=False, indent=1), encoding="utf-8")

    # compact index for the backend: stations once, sequences as id lists
    used = {}
    index_lines = []
    for ln in sorted(lines, key=lambda x: (x["type"], x["line"], x["agency"])):
        dirs = []
        for d in ln["directions"]:
            seqs = [d["stops"]] + [v["stops"] for v in d.get("variants", [])]
            for s in (x for sq in seqs for x in sq):
                used[s["id"]] = {"n": s["name"], "la": s["coord"]["lat"], "lo": s["coord"]["lng"]}
            dirs.append({"d": d["direction"], "hs": d["headsign"], "seq": [[s["id"] for s in sq] for sq in seqs]})
        index_lines.append({"file": ln["file"], "line": ln["line"], "agency": ln["agency"], "type": ln["type"],
                            "name": ln["name"], "dirs": dirs})
    index = {"generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
             "feedLastModified": state.get("lastModified"), "stations": used, "lines": index_lines}
    (out / "index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return len(station_list)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", default=str(HERE / "config.json"))
    ap.add_argument("--list-agencies", action="store_true", help="print operators serving the region and exit")
    ap.add_argument("--force-download", action="store_true", help="ignore ETag and download again")
    ap.add_argument("--no-download", action="store_true", help="use the cached zip as is")
    args = ap.parse_args()
    cfg = load_config(args.config)

    if args.no_download:
        zip_path = cfg["cacheDir"] / "gtfs.zip"
        sp = cfg["cacheDir"] / "state.json"
        state = json.loads(sp.read_text()) if sp.exists() else {}
    else:
        zip_path, state = download(cfg["feedUrl"], cfg["cacheDir"], args.force_download)

    with zipfile.ZipFile(zip_path) as zf:
        stops = read_stops(zf)
        platforms = region_platforms(stops, cfg["region"])
        print(f"Region platforms: {len(platforms)}")
        counts = count_region_stops(zf, platforms)
        cand, trip_route = pick_routes(zf, counts, cfg)
        print(f"Candidate routes: {len(cand)}")
        if args.list_agencies:
            list_agencies(cand)
            return
        allowed = {a.lower() for a in cfg["agencies"]}
        if not allowed:
            sys.exit("config.agencies is empty; run with --list-agencies and pick operators.")
        exclude = re.compile(cfg["excludeNamePattern"], re.I) if cfg.get("excludeNamePattern") else None
        sel = {rid: c for rid, c in cand.items() if c["agency"].lower() in allowed
               and not (exclude and (exclude.search(c["line"]) or exclude.search(c["longName"])))}
        print(f"Selected routes: {len(sel)} (after agency and on-demand filter)")
        wanted = {t for t, r in trip_route.items() if r in sel}
        rows = load_trip_rows(zf, wanted)

    lines = build_lines(cfg, sel, trip_route, rows, stops)
    n_stations = write_outputs(cfg, lines, stops, platforms, state)
    print(f"Wrote {len(lines)} lines and {n_stations} stations to {cfg['outputDir']}")


if __name__ == "__main__":
    main()
