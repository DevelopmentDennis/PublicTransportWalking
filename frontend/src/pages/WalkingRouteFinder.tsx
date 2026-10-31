import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRightRegular,
  ArrowUpRightRegular,
  ClockRegular,
  LocationRegular,
  WarningRegular,
} from "@fluentui/react-icons";
import {
  Button,
  Card,
  CardHeader,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  MessageBar,
  MessageBarBody,
  Select,
  Skeleton,
  SkeletonItem,
  Text,
  Title1,
  Title2,
} from "@fluentui/react-components";
import { AnimatePresence, motion } from "motion/react";
import { api } from "../api";
import {
  describeSchedule,
  isRunningAt,
  pickPattern,
} from "../api/patterns";
import type {
  TransitCatalog,
  TransitPattern,
  TransitStop,
  WalkingDistanceTimeResponse,
} from "../api/types";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";

const AUTO_PATTERN = "auto";

export function WalkingRouteFinder() {
  const [catalog, setCatalog] = useState<TransitCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedLineId, setSelectedLineId] = useState("");
  const [selectedStationId, setSelectedStationId] = useState("");
  const [selectedDirectionId, setSelectedDirectionId] = useState("");
  const [selectedPatternId, setSelectedPatternId] = useState(AUTO_PATTERN);
  const [formError, setFormError] = useState<string | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<WalkingDistanceTimeResponse | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    api
      .getTransitCatalog()
      .then((result) => {
        if (active) setCatalog(result);
      })
      .catch((error: unknown) => {
        if (active)
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load local transit data.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retryKey]);

  const selectedLine =
    catalog?.lines.find((line) => line.id === selectedLineId) ??
    catalog?.lines[0];
  const selectedDirection =
    selectedLine?.directions.find(
      (direction) => direction.id === selectedDirectionId,
    ) ?? selectedLine?.directions[0];
  const selectedStation =
    selectedLine?.stops.find((station) => station.id === selectedStationId) ??
    selectedLine?.stops[0];
  const autoPattern = selectedDirection
    ? pickPattern(selectedDirection.patterns, new Date(), selectedStation)
    : undefined;
  const selectedPattern =
    selectedPatternId === AUTO_PATTERN
      ? autoPattern
      : (selectedDirection?.patterns.find(
          (pattern) => pattern.id === selectedPatternId,
        ) ?? autoPattern);
  const stationOptions = useMemo(
    () =>
      [...(selectedLine?.stops ?? [])].sort((left, right) =>
        left.name.localeCompare(right.name, "de"),
      ),
    [selectedLine],
  );

  function handleLineChange(lineId: string): void {
    const line = catalog?.lines.find((item) => item.id === lineId);
    setSelectedLineId(lineId);
    setSelectedStationId(line?.stops[0]?.id ?? "");
    setSelectedDirectionId(line?.directions[0]?.id ?? "");
    setSelectedPatternId(AUTO_PATTERN);
    clearResult();
  }

  function clearResult(): void {
    setFormError(null);
    setEstimateError(null);
    setEstimate(null);
  }

  async function handleSubmit(
    event?: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event?.preventDefault();
    clearResult();
    if (!selectedLine || !selectedDirection || !selectedStation || !selectedPattern) {
      setFormError(
        "Choose a transit line, current station, and direction before requesting a walk.",
      );
      return;
    }
    const destination = getNextStop(selectedPattern, selectedStation);
    if (!destination) {
      setFormError(
        "This is the final stop in the selected direction. Choose another station or direction.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.getWalkingEstimate({
        origin: {
          latitude: selectedStation.latitude,
          longitude: selectedStation.longitude,
        },
        destination: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
      });
      if (!result) {
        setFormError(
          "No walking route is available for this selection. Choose another station or direction.",
        );
        return;
      }
      setEstimate(result);
    } catch (error: unknown) {
      setEstimateError(
        error instanceof Error
          ? error.message
          : "Unable to refresh the walking estimate.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label="Loading Augsburg route records" />;
  if (loadError) {
    return (
      <ErrorState
        title="Local transit data temporarily unavailable"
        message={loadError}
        onRetry={() => setRetryKey((current) => current + 1)}
      />
    );
  }
  if (!catalog || catalog.lines.length === 0) {
    return (
      <EmptyState
        title="No local route records"
        message="No bundled transit records are available. Reload the local route data to try again."
        actionLabel="Reload route data"
        onAction={() => setRetryKey((current) => current + 1)}
      />
    );
  }

  const targetStop =
    selectedPattern && selectedStation
      ? getNextStop(selectedPattern, selectedStation)
      : undefined;
  const mapUrl = targetStop
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${targetStop.latitude},${targetStop.longitude}`)}`
    : undefined;

  return (
    <motion.div
      className="page-flow finder-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <section className="finder-hero" aria-labelledby="finder-title">
        <svg
          className="hero-mesh"
          aria-hidden="true"
          viewBox="0 0 800 400"
          preserveAspectRatio="none"
        >
          <defs>
            <radialGradient id="accent-mesh" cx="0%" cy="0%" r="80%">
              <stop
                offset="0%"
                stopColor="var(--brand-accent)"
                stopOpacity="0.55"
              />
              <stop
                offset="100%"
                stopColor="var(--brand-accent)"
                stopOpacity="0"
              />
            </radialGradient>
            <radialGradient id="primary-mesh" cx="100%" cy="100%" r="80%">
              <stop
                offset="0%"
                stopColor="var(--brand-primary)"
                stopOpacity="0.55"
              />
              <stop
                offset="100%"
                stopColor="var(--brand-primary)"
                stopOpacity="0"
              />
            </radialGradient>
          </defs>
          <rect width="800" height="400" fill="url(#accent-mesh)" />
          <rect width="800" height="400" fill="url(#primary-mesh)" />
        </svg>
        <div className="hero-content">
          <Text className="eyebrow">
            <span className="eyebrow-dot" />
            Augsburg wayfinding console
          </Text>
          <Title1 id="finder-title">
            Find the walk to your next transit stop.
          </Title1>
          <Text className="hero-subtitle">
            Choose a line, station, and direction to walk to the next stop
            before the next ride arrives.
          </Text>
          <div className="hero-actions">
            <Button
              appearance="primary"
              icon={<LocationRegular />}
              onClick={() =>
                document
                  .getElementById("route-form")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Plan a station walk
            </Button>
          </div>
        </div>
      </section>

      <section className="section-heading" aria-labelledby="lookup-title">
        <div>
          <Title2 id="lookup-title">
            <LocationRegular />
            Walking route lookup
          </Title2>
          <Text>Local route records paired with a walking estimate</Text>
        </div>
        <span className="availability-badge">
          <span className="status-dot" />
          Network data ready
        </span>
      </section>

      <Card className="lookup-card">
        <CardHeader
          header={<Text weight="semibold">Choose your current ride</Text>}
          description={
            <Text size={200}>
              Select where you are and the direction your service is heading.
            </Text>
          }
          className="lookup-card-header"
        />
        <form
          id="route-form"
          className="route-form"
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
        >
          <Field
            label="Transit line"
            required
            validationState={formError && !selectedLine ? "error" : "none"}
            validationMessage={
              formError && !selectedLine ? "Choose a transit line." : undefined
            }
          >
            <Select
              value={selectedLine?.id ?? ""}
              onChange={(_, data) => handleLineChange(data.value)}
            >
              {catalog.lines.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Current station"
            required
            validationState={
              formError && !selectedStation ? "error" : "warning"
            }
            validationMessage={
              formError && !selectedStation
                ? "Choose a current station."
                : "The estimate targets the next stop in the selected direction."
            }
          >
            <Select
              value={selectedStation?.id ?? ""}
              onChange={(_, data) => {
                setSelectedStationId(data.value);
                clearResult();
              }}
            >
              {stationOptions.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Direction"
            required
            validationState={formError && !selectedDirection ? "error" : "none"}
            validationMessage={
              formError && !selectedDirection
                ? "Choose a direction."
                : undefined
            }
          >
            <Select
              value={selectedDirection?.id ?? ""}
              onChange={(_, data) => {
                setSelectedDirectionId(data.value);
                setSelectedPatternId(AUTO_PATTERN);
                clearResult();
              }}
            >
              {selectedLine?.directions.map((direction) => (
                <option key={direction.id} value={direction.id}>
                  {direction.label}
                </option>
              ))}
            </Select>
          </Field>
          {selectedDirection && selectedDirection.patterns.length > 1 && (
            <Field
              label="Route variant"
              validationState="none"
              validationMessage={
                selectedPattern
                  ? `Runs ${describeSchedule(selectedPattern.schedule)}${
                      selectedPatternId === AUTO_PATTERN
                        ? " · picked for the current time"
                        : ""
                    }`
                  : undefined
              }
            >
              <Select
                value={selectedPatternId}
                onChange={(_, data) => {
                  setSelectedPatternId(data.value);
                  clearResult();
                }}
              >
                <option value={AUTO_PATTERN}>
                  Automatic (current time)
                </option>
                {selectedDirection.patterns.map((pattern) => (
                  <option key={pattern.id} value={pattern.id}>
                    {patternOptionLabel(pattern)}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {formError && (
            <MessageBar intent="warning" className="form-message">
              <MessageBarBody>
                <WarningRegular />
                {formError}
              </MessageBarBody>
            </MessageBar>
          )}
          {estimateError && (
            <ErrorState
              message={estimateError}
              onRetry={() => {
                void handleSubmit();
              }}
            />
          )}
          <div className="form-actions">
            <Button
              type="submit"
              appearance="primary"
              icon={<ArrowRightRegular />}
              disabled={submitting}
            >
              {submitting ? "Finding the walk…" : "Submit"}
            </Button>
          </div>
        </form>
      </Card>

      <AnimatePresence>
        {estimate &&
          selectedLine &&
          selectedStation &&
          targetStop &&
          mapUrl && (
            <Dialog
              open
              onOpenChange={(_, data) => {
                if (!data.open) setEstimate(null);
              }}
            >
              <DialogSurface className="result-surface">
                <motion.div
                  className="result-dialog"
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                >
                  <DialogBody>
                    <Text className="result-kicker">
                      {selectedLine.label} · next stop
                    </Text>
                    <DialogTitle>Walk to {targetStop.name}</DialogTitle>
                    <DialogContent>
                      From {selectedStation.name} in the direction of{" "}
                      {selectedDirection?.label}.
                    </DialogContent>
                    <div className="result-stats">
                      <div>
                        <Text size={200}>Distance</Text>
                        <strong>
                          {formatDistance(estimate.distanceMeters)}
                        </strong>
                      </div>
                      <div>
                        <Text size={200}>Walking time</Text>
                        <strong>
                          {formatDuration(estimate.durationSeconds)}
                        </strong>
                      </div>
                    </div>
                    <MessageBar intent="warning">
                      <MessageBarBody>
                        <strong>Note:</strong> Walking, bicycling, and two-wheel
                        routes are in beta and might sometimes be missing clear
                        sidewalks, pedestrian paths, or bicycling paths.
                      </MessageBarBody>
                    </MessageBar>
                    <DialogActions>
                      <Button
                        appearance="primary"
                        as="a"
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        icon={<ArrowUpRightRegular />}
                      >
                        Open in Maps
                      </Button>
                      <Button
                        appearance="subtle"
                        onClick={() => setEstimate(null)}
                      >
                        Close
                      </Button>
                    </DialogActions>
                  </DialogBody>
                </motion.div>
              </DialogSurface>
            </Dialog>
          )}
      </AnimatePresence>

      {submitting && (
        <Card className="estimate-loading">
          <Skeleton aria-label="Calculating walking estimate">
            <SkeletonItem shape="rectangle" size={20} />
          </Skeleton>
          <Text>Checking the walking route…</Text>
          <ClockRegular />
        </Card>
      )}
      <div className="page-note">
        <Text size={200}>
          Walking estimates are provided by the live Google Routes service.
        </Text>
      </div>
    </motion.div>
  );
}

function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toLocaleString("en", { maximumFractionDigits: 1 })} km`
    : `${meters} m`;
}

function formatDuration(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function patternOptionLabel(pattern: TransitPattern): string {
  const running = isRunningAt(pattern, new Date()) ? " · now" : "";
  return `${pattern.label} · ${describeSchedule(pattern.schedule)}${running}`;
}

function getNextStop(
  direction: { stops: TransitStop[] },
  station: TransitStop,
): TransitStop | undefined {
  const currentIndex = direction.stops.findIndex(
    (stop) => stop.id === station.id || stop.name === station.name,
  );
  if (currentIndex < 0) return direction.stops.at(-1);
  return direction.stops[currentIndex + 1];
}
