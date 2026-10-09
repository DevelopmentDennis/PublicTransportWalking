import { describe, expect, it } from "vitest";
import { getLocalDataGuide, getLocalTransitCatalog } from "./transitData";

describe("local transit data", () => {
  it("loads Augsburg tram and bus lines from the clean asset files", () => {
    const catalog = getLocalTransitCatalog();
    const lineOne = catalog.lines.find((line) => line.id === "tram-1");
    const lineTwo = catalog.lines.find((line) => line.id === "tram-2");
    const bus210 = catalog.lines.find((line) => line.id === "bus-210");

    expect(
      lineOne?.directions.some((direction) => direction.label === "Göggingen"),
    ).toBe(true);
    expect(
      lineTwo?.directions.some(
        (direction) => direction.label === "Augsburg West P+R",
      ),
    ).toBe(true);
    expect(
      bus210?.directions.some(
        (direction) => direction.label === "Friedberg, Bahnhof",
      ),
    ).toBe(true);
    expect(
      catalog.stations.some((station) => station.name === "Augsburg Hbf"),
    ).toBe(true);
    expect(
      catalog.stations.every((station) => Number.isFinite(station.latitude)),
    ).toBe(true);
  });

  it("includes the approved sample records and coordinate precision in the data guide", () => {
    const guide = getLocalDataGuide();

    expect(guide.records[0]).toMatchObject({
      record: "Augsburg Hbf",
      coordinates: "48.36544, 10.88557",
      status: "Available",
    });
    expect(guide.records[1]).toMatchObject({
      record: "Eingang Süd",
      coordinates: "48.36518, 10.88693",
    });
    expect(guide.records[2]?.record).toBe(
      "Augsburg, Lechh., N. Ostfriedh. → Göggingen",
    );
  });
});
