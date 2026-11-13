import { describe, expect, it } from "vitest";
import { getLocalTransitCatalog } from "./transitData";

describe("local transit data", () => {
  it("loads tram and bus lines with directions, patterns and stop coordinates", () => {
    const { lines } = getLocalTransitCatalog();

    expect(lines.some((line) => line.mode === "tram")).toBe(true);
    expect(lines.some((line) => line.mode === "bus")).toBe(true);
    for (const line of lines) {
      expect(line.directions.length).toBeGreaterThan(0);
      for (const direction of line.directions) {
        expect(direction.patterns.length).toBeGreaterThan(0);
        for (const stop of direction.patterns.flatMap((p) => p.stops)) {
          expect(Number.isFinite(stop.latitude)).toBe(true);
          expect(Number.isFinite(stop.longitude)).toBe(true);
        }
      }
    }
  });

  it.each(["200", "202"])("uses the outbound Unterm Berg platform on line %s", (number) => {
    const line = getLocalTransitCatalog().lines.find((item) => item.id === `bus-${number}`);
    const patterns = line?.directions.flatMap((direction) => direction.patterns) ?? [];
    const outbound = patterns.filter((pattern) =>
      pattern.stops.some((stop, index) =>
        stop.name === "Friedberg, West P+R" && pattern.stops[index + 1]?.name === "Friedberg, Unterm Berg",
      ),
    );
    expect(outbound.length).toBeGreaterThan(0);
    for (const pattern of outbound) {
      const index = pattern.stops.findIndex((stop) => stop.name === "Friedberg, West P+R");
      expect(pattern.stops[index + 1]).toMatchObject({ latitude: 48.356243, longitude: 10.971403 });
    }

    const inbound = patterns.find((pattern) =>
      pattern.stops.some((stop, index) =>
        stop.name === "Friedberg, Unterm Berg" && pattern.stops[index + 1]?.name === "Friedberg, West P+R",
      ),
    );
    expect(inbound?.stops.find((stop) => stop.name === "Friedberg, Unterm Berg")).toMatchObject({
      latitude: 48.3564,
      longitude: 10.971538,
    });
  });
});
