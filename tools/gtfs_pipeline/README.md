# GTFS pipeline

Builds per-line stop sequences for the Augsburg region from the gtfs.de national feed.
Python 3, standard library only.

```
python gtfs_pipeline.py --list-agencies   # which operators serve the region
python gtfs_pipeline.py                   # download if changed, then build
```

Other flags: `--force-download`, `--no-download` (use the cached zip).

- **Download:** `feedUrl` in `config.json`. The `ETag` is stored in `.cache/state.json`, so an unchanged feed is not downloaded again. The zip is streamed and never extracted (`stop_times.txt` is about 2 GB).
- **Config:** `region` (centre and `radiusKm` around Augsburg Hbf), `minRegionStops`, `routeTypes` (0 = tram, 3 = bus), `agencies`, `excludeNamePattern` (on-demand buses) and `lowVolumeTrips`.
- **Run time:** about 1 minute plus the download.

## Output (`output/`)

| File | Content |
|---|---|
| `lines/<type>_<line>[_<agency>].json` | One file per line. Directions with ordered `stops`, plus `variants` (short-turn or alternative routes) |
| `stops.json` | Region stations with their platforms |
| `index.json` | Compact lookup for the backend: stations once, line sequences as ID lists |

Every direction and variant carries a `schedule`: windows of first-stop departures per day type (`mon-fri`, `sat`, `sun`), e.g. `{"days":"mon-fri","from":"14:04","to":"19:04","fromMin":844,"toMin":1144,"trips":8}`. Departures less than 90 minutes apart form one window; times past midnight keep minutes above 1440. In `index.json` this is `sch`, parallel to `seq`, as `[days, fromMin, toMin, trips]`.

Stop IDs are the feed's numeric `stop_id`s. They can change between feed versions, so always rebuild everything and replace the whole output.

`index.json` is also copied to `publishIndexTo` (`assets/transit/index.json`), which the frontend bundles.

Monthly update: re-run the script and commit the new `assets/transit/index.json`.
