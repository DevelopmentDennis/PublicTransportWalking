import stationRecords from '../../../assets/stations.json';
import type {
  DataGuide,
  TransitCatalog,
  TransitDirection,
  TransitLine,
  TransitMode,
  TransitStop,
} from './types';

interface CoordinateRecord {
  lat: number;
  lng: number;
}

const tramAssets = import.meta.glob<unknown>('../../../assets/tram/*_clean.json', {
  eager: true,
  import: 'default',
});
const busAssets = import.meta.glob<unknown>('../../../assets/bus/clean/*_clean.json', {
  eager: true,
  import: 'default',
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseStop(value: unknown): TransitStop | null {
  if (!isRecord(value) || !isRecord(value.coord)) return null;

  const { id, name, shortName, coord } = value;
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    typeof coord.lat !== 'number' ||
    typeof coord.lng !== 'number'
  ) {
    return null;
  }

  return {
    id,
    name,
    ...(typeof shortName === 'string' ? { shortName } : {}),
    latitude: coord.lat,
    longitude: coord.lng,
  };
}

function parseStopList(value: unknown): TransitStop[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const stop = parseStop(item);
    return stop ? [stop] : [];
  });
}

function createDirection(id: string, label: string, stops: TransitStop[]): TransitDirection {
  return { id, label, stops };
}

function parseTramAsset(value: unknown, source: string): TransitLine | null {
  if (!isRecord(value) || typeof value.line !== 'string' || typeof value.direction !== 'string') {
    return null;
  }

  const stops = parseStopList(value.stops);
  if (stops.length < 2) return null;

  const direction = createDirection(`${value.line}-outbound`, value.direction, stops);
  const reverseStops = [...stops].reverse();
  const reverseDirection = createDirection(
    `${value.line}-inbound`,
    reverseStops.at(-1)?.shortName ?? reverseStops.at(-1)?.name ?? stops[0]!.name,
    reverseStops,
  );
  const directions = [direction, reverseDirection];

  return {
    id: `tram-${value.line}`,
    mode: 'tram',
    number: value.line,
    label: `Tram line ${value.line}`,
    source,
    directions,
    stops: uniqueStops(directions.flatMap((item) => item.stops)),
  };
}

function parseBusAsset(value: unknown, source: string): TransitLine | null {
  if (!isRecord(value) || typeof value.line !== 'string' || !Array.isArray(value.directions)) {
    return null;
  }

  const directions = value.directions.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const label = typeof item.headsign === 'string' ? item.headsign : item.direction;
    if (typeof label !== 'string') return [];
    const stops = parseStopList(item.stops);
    return stops.length > 1 ? [createDirection(`${value.line}-${index}`, label, stops)] : [];
  });
  if (directions.length === 0) return null;

  return {
    id: `bus-${value.line}`,
    mode: 'bus',
    number: value.line,
    label: `Bus ${value.line}`,
    source,
    directions,
    stops: uniqueStops(directions.flatMap((item) => item.stops)),
  };
}

function parseStationCatalog(): TransitStop[] {
  if (!Array.isArray(stationRecords)) return [];

  return stationRecords.flatMap((item) => {
    if (!isRecord(item)) return [];
    const { id, name, latitude, longitude } = item;
    if (
      typeof id !== 'string' ||
      typeof name !== 'string' ||
      typeof latitude !== 'number' ||
      typeof longitude !== 'number'
    ) {
      return [];
    }

    return [{ id, name, latitude, longitude }];
  });
}

function uniqueStops(stops: TransitStop[]): TransitStop[] {
  const byId = new Map<string, TransitStop>();
  for (const stop of stops) byId.set(stop.id, stop);
  return [...byId.values()];
}

function sourceName(path: string): string {
  return path.replace('../../../', '');
}

function sortLines(left: TransitLine, right: TransitLine): number {
  if (left.mode !== right.mode) return left.mode === 'tram' ? -1 : 1;
  return Number(left.number) - Number(right.number);
}

export function getLocalTransitCatalog(): TransitCatalog {
  const lines = [
    ...Object.entries(tramAssets).flatMap(([path, value]) => {
      const line = parseTramAsset(value, sourceName(path));
      return line ? [line] : [];
    }),
    ...Object.entries(busAssets).flatMap(([path, value]) => {
      const line = parseBusAsset(value, sourceName(path));
      return line ? [line] : [];
    }),
  ].sort(sortLines);

  const stations = uniqueStops([
    ...parseStationCatalog(),
    ...lines.flatMap((line) => line.stops),
  ]);

  return { lines, stations };
}

export function getLocalDataGuide(): DataGuide {
  const catalog = getLocalTransitCatalog();
  const tramLines = catalog.lines.filter((line) => line.mode === 'tram');
  const busLines = catalog.lines.filter((line) => line.mode === 'bus');
  const lineOne = tramLines.find((line) => line.number === '1');
  const origin = lineOne?.directions.find((direction) => direction.label === 'Göggingen')?.stops[0];
  const destination = lineOne?.directions.find((direction) => direction.label === 'Göggingen')?.stops.at(-1);
  const mainStation = catalog.stations.find((station) => station.name === 'Augsburg Hbf');
  const southEntrance = catalog.stations.find((station) => station.name === 'Eingang Süd');

  return {
    stationCount: catalog.stations.length,
    records: [
      {
        dataset: 'Station catalog',
        record: 'Augsburg Hbf',
        coordinates: formatCoordinates(mainStation),
        status: 'Available',
      },
      {
        dataset: 'Station catalog',
        record: 'Eingang Süd',
        coordinates: formatCoordinates(southEntrance),
        status: 'Available',
      },
      {
        dataset: 'Linie 1',
        record: `${origin?.name ?? 'Augsburg, Lechh., N. Ostfriedh.'} → ${destination?.name ?? 'Göggingen'}`,
        coordinates: 'Augsburg network',
        status: 'Available',
      },
    ],
    coverage: [
      {
        id: 'linie-1',
        title: 'Linie 1',
        description: 'Tram route records from Augsburg, Lechh., N. Ostfriedh. to Göggingen.',
        source: 'assets/linie1.json · assets/tram/linie1_clean.json',
        recordCount: tramLines.find((line) => line.number === '1')?.stops.length ?? 0,
      },
      {
        id: 'tram-routes',
        title: 'Tram routes',
        description: 'Clean stop sequences for Linie 1, Linie 2, Linie 3, Linie 4, and Linie 6.',
        source: 'assets/tram/ · 5 clean route files',
        recordCount: tramLines.length,
      },
      {
        id: 'bus-routes',
        title: 'Bus clean routes',
        description: 'Clean route records for Augsburg bus services in the local dataset.',
        source: 'assets/bus/clean/ · 28 route files',
        recordCount: busLines.length,
      },
    ],
  };
}

function formatCoordinates(stop: TransitStop | undefined): string {
  if (!stop) return 'Unavailable';
  return `${stop.latitude.toFixed(5)}, ${stop.longitude.toFixed(5)}`;
}

export function isTransitMode(value: TransitMode): boolean {
  return value === 'tram' || value === 'bus';
}

export function toCoordinateRecord(stop: TransitStop): CoordinateRecord {
  return { lat: stop.latitude, lng: stop.longitude };
}