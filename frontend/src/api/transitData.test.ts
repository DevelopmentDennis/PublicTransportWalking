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
});
