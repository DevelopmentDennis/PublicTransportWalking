import transitIndex from '../../../assets/transit/index.json';
import type {
  ScheduleWindow,
  TransitCatalog,
  TransitDirection,
  TransitLine,
  TransitMode,
  TransitPattern,
  TransitStop,
} from './types';

interface IndexStation {
  n: string;
  la: number;
  lo: number;
}

interface IndexDirection {
  d: string;
  hs: string;
  seq: string[][];
  sch?: [ScheduleWindow['days'], number, number, number][][];
}

interface IndexLine {
  file: string;
  line: string;
  agency: string;
  type: string;
  name: string;
  dirs: IndexDirection[];
}

interface TransitIndex {
  stations: Record<string, IndexStation>;
  lines: IndexLine[];
}

const index = transitIndex as unknown as TransitIndex;

function parseIndexLine(line: IndexLine): TransitLine | null {
  if (line.type !== 'tram' && line.type !== 'bus') return null;
  const mode: TransitMode = line.type;
  const base = line.file.replace(/\.json$/, '').slice(mode.length + 1);

  const directions = line.dirs.flatMap((item, dirIndex): TransitDirection[] => {
    const patterns = item.seq.flatMap((ids, patternIndex): TransitPattern[] => {
      const stops = ids.flatMap((id): TransitStop[] => {
        const station = index.stations[id];
        return station ? [{ id, name: station.n, latitude: station.la, longitude: station.lo }] : [];
      });
      if (stops.length < 2) return [];
      const schedule = (item.sch?.[patternIndex] ?? []).map(
        ([days, fromMinute, toMinute, trips]) => ({ days, fromMinute, toMinute, trips }),
      );
      return [
        {
          id: `${base}-${dirIndex}-${patternIndex}`,
          isMain: patternIndex === 0,
          trips: schedule.reduce((sum, window) => sum + window.trips, 0),
          schedule,
          stops,
        },
      ];
    });
    if (patterns.length === 0) return [];
    return [{ id: `${base}-${dirIndex}`, label: item.hs, stops: patterns[0]!.stops, patterns }];
  });
  if (directions.length === 0) return null;

  const hasSuffix = base !== line.line.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return {
    id: `${mode}-${base}`,
    mode,
    number: line.line,
    agency: hasSuffix ? line.agency : undefined,
    source: `assets/transit/index.json · ${line.file}`,
    directions,
    stops: uniqueStops(directions.flatMap((item) => item.patterns.flatMap((pattern) => pattern.stops))),
  };
}

function uniqueStops(stops: TransitStop[]): TransitStop[] {
  const byId = new Map<string, TransitStop>();
  for (const stop of stops) byId.set(stop.id, stop);
  return [...byId.values()];
}

function sortLines(left: TransitLine, right: TransitLine): number {
  if (left.mode !== right.mode) return left.mode === 'tram' ? -1 : 1;
  return left.number.localeCompare(right.number, 'de', { numeric: true }) || (left.agency ?? '').localeCompare(right.agency ?? '', 'de');
}

export function getLocalTransitCatalog(): TransitCatalog {
  const lines = index.lines
    .flatMap((item) => {
      const line = parseIndexLine(item);
      return line ? [line] : [];
    })
    .sort(sortLines);

  return { lines };
}
