import i18n from ".";
import type { TransitLine, TransitPattern } from "../api/types";

export function lineLabel(line: TransitLine): string {
  const name = i18n.t(`transit.${line.mode}`, { number: line.number });
  return line.agency
    ? i18n.t("transit.withAgency", { name, agency: line.agency })
    : name;
}

export function patternLabel(pattern: TransitPattern): string {
  return i18n.t(pattern.isMain ? "transit.fullRoute" : "transit.variantRoute", {
    first: pattern.stops[0]?.name,
    last: pattern.stops.at(-1)?.name,
    count: pattern.stops.length,
  });
}

export function formatDistance(meters: number): string {
  return meters >= 1000
    ? i18n.t("units.kilometers", {
        value: (meters / 1000).toLocaleString(i18n.language, {
          maximumFractionDigits: 1,
        }),
      })
    : i18n.t("units.meters", { value: meters });
}

export function formatDuration(seconds: number): string {
  return i18n.t("units.minutes", {
    value: Math.max(1, Math.round(seconds / 60)),
  });
}
