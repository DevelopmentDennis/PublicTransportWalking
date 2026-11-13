import { describe, expect, it } from "vitest";
import { describeSchedule, getWalkingStops, pickPattern } from "./patterns";
import { getLocalTransitCatalog } from "./transitData";
import type { TransitPattern } from "./types";

function pattern(id: string, trips: number, from: number, to: number): TransitPattern {
  return {
    id,
    isMain: true,
    trips,
    schedule: [{ days: "mon-fri", fromMinute: from, toMinute: to, trips }],
    stops: [
      { id: "a", name: "A", latitude: 0, longitude: 0 },
      { id: "b", name: "B", latitude: 0, longitude: 0 },
    ],
  };
}

describe("pickPattern", () => {
  const morning = pattern("morning", 10, 300, 780);
  const afternoon = pattern("afternoon", 8, 840, 1140);
  // 2026-11-02 is a Monday
  const at = (hour: number, minute = 0, day = 2) => new Date(2026, 10, day, hour, minute);

  it("picks the pattern running at the given time", () => {
    expect(pickPattern([morning, afternoon], at(9))?.id).toBe("morning");
    expect(pickPattern([morning, afternoon], at(15))?.id).toBe("afternoon");
  });

  describe("getWalkingStops", () => {
    it("uses the selected pattern's platforms, not the station list's coordinates", () => {
      const route = pattern("route", 1, 0, 60);
      route.stops[0]!.latitude = 1;
      route.stops[1]!.latitude = 2;
      const selectedStation = { ...route.stops[0]!, latitude: 99 };
      expect(getWalkingStops(route, selectedStation)).toEqual(route.stops);
      expect(getWalkingStops(route, route.stops[1]!)).toBeUndefined();
      expect(getWalkingStops(route, { ...selectedStation, id: "missing", name: "missing" })).toBeUndefined();
    });
  });

  it("keeps a pattern active while its last trip is still running", () => {
    expect(pickPattern([morning, afternoon], at(13, 30))?.id).toBe("morning");
  });

  it("falls back to the nearest window, or the busiest pattern when nothing runs", () => {
    expect(pickPattern([morning, afternoon], at(23))?.id).toBe("afternoon");
    expect(pickPattern([morning, afternoon], at(10, 0, 7))?.id).toBe("morning");
  });

  it("prefers patterns that serve the selected station", () => {
    const short = { ...afternoon, stops: [{ id: "c", name: "C", latitude: 0, longitude: 0 }, afternoon.stops[1]!] };
    const station = { id: "a", name: "A", latitude: 0, longitude: 0 };
    expect(pickPattern([short, morning], at(15), station)?.id).toBe("morning");
  });

  it("formats schedule windows", () => {
    expect(describeSchedule(afternoon.schedule)).toBe("Mon–Fri 14:00–19:00");
  });
});

describe("bus 100 variants", () => {
  it("switches between the full and short route by time of day", () => {
    const line = getLocalTransitCatalog().lines.find((item) => item.id === "bus-100");
    const outbound = line?.directions[0];
    expect(outbound?.patterns.length).toBeGreaterThan(1);

    const monday = (hour: number) => new Date(2026, 10, 2, hour);
    const morning = pickPattern(outbound!.patterns, monday(9));
    const afternoon = pickPattern(outbound!.patterns, monday(16));
    expect(morning?.stops.length).toBeGreaterThan(afternoon!.stops.length);
  });
});
