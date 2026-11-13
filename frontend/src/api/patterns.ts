import i18n from '../i18n';
import type {
  ScheduleWindow,
  TransitPattern,
  TransitStop,
} from './types';

// Minutes after a window's last first-stop departure during which that trip is still running.
const TRIP_TAIL_MINUTES = 90;

const dayKinds = ['sun', 'mon-fri', 'mon-fri', 'mon-fri', 'mon-fri', 'mon-fri', 'sat'] as const;

function dayKindOf(date: Date): ScheduleWindow['days'] {
  return dayKinds[date.getDay()]!;
}

function previousDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1, 12);
}

export function formatMinutes(minutes: number): string {
  const wrapped = minutes % 1440;
  const hours = Math.floor(wrapped / 60);
  return `${String(hours).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

export function describeSchedule(schedule: ScheduleWindow[]): string {
  if (schedule.length === 0) return i18n.t('schedule.none');
  return schedule
    .map(
      (window) =>
        `${i18n.t(`schedule.${window.days}`)} ${formatMinutes(window.fromMinute)}–${formatMinutes(window.toMinute)}`,
    )
    .join(', ');
}

// 0 when the pattern runs at the given time, 1 inside the trailing tail, otherwise the distance in minutes + 2.
function timeDistance(pattern: TransitPattern, now: Date): number {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = dayKindOf(now);
  const yesterday = dayKindOf(previousDay(now));
  let best = Number.POSITIVE_INFINITY;

  for (const window of pattern.schedule) {
    const candidates: number[] = [];
    if (window.days === today) candidates.push(minutes);
    if (window.days === yesterday && window.toMinute >= 1440) candidates.push(minutes + 1440);
    for (const t of candidates) {
      let distance: number;
      if (t >= window.fromMinute && t <= window.toMinute) distance = 0;
      else if (t > window.toMinute && t <= window.toMinute + TRIP_TAIL_MINUTES) distance = 1;
      else distance = 2 + Math.min(Math.abs(t - window.fromMinute), Math.abs(t - window.toMinute));
      best = Math.min(best, distance);
    }
  }
  return best;
}

function indexOfStop(pattern: TransitPattern, station: TransitStop): number {
  return pattern.stops.findIndex((stop) => stop.id === station.id || stop.name === station.name);
}

export function getWalkingStops(pattern: TransitPattern, station: TransitStop): [TransitStop, TransitStop] | undefined {
  const index = indexOfStop(pattern, station);
  const origin = pattern.stops[index];
  const destination = pattern.stops[index + 1];
  return origin && destination ? [origin, destination] : undefined;
}

// Picks the pattern that is running at `now`; prefers patterns that serve the station with a following stop.
export function pickPattern(
  patterns: TransitPattern[],
  now: Date,
  station?: TransitStop,
): TransitPattern | undefined {
  if (patterns.length === 0) return undefined;
  let candidates = patterns;
  if (station) {
    const serving = patterns.filter((pattern) => {
      const index = indexOfStop(pattern, station);
      return index >= 0 && index < pattern.stops.length - 1;
    });
    if (serving.length > 0) candidates = serving;
  }

  let best = candidates[0]!;
  let bestDistance = timeDistance(best, now);
  for (const pattern of candidates.slice(1)) {
    const distance = timeDistance(pattern, now);
    if (distance < bestDistance || (distance === bestDistance && pattern.trips > best.trips)) {
      best = pattern;
      bestDistance = distance;
    }
  }
  return best;
}

export function isRunningAt(pattern: TransitPattern, now: Date): boolean {
  return timeDistance(pattern, now) <= 1;
}
