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
  Combobox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  MessageBar,
  MessageBarBody,
  Option,
  Select,
  Skeleton,
  SkeletonItem,
  Text,
  Title1,
  Title2,
} from "@fluentui/react-components";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
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
import {
  formatDistance,
  formatDuration,
  lineLabel,
  patternLabel,
} from "../i18n/format";

const AUTO_PATTERN = "auto";

export function WalkingRouteFinder() {
  const { t } = useTranslation();
  const [catalog, setCatalog] = useState<TransitCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedLineId, setSelectedLineId] = useState("");
  const [selectedStationId, setSelectedStationId] = useState("");
  const [selectedDirectionId, setSelectedDirectionId] = useState("");
  const [selectedPatternId, setSelectedPatternId] = useState(AUTO_PATTERN);
  const [lineQuery, setLineQuery] = useState<string | null>(null);
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
              : t("finder.loadErrorFallback"),
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
  // Not memoized so labels follow the active UI language.
  const lineFilter = lineQuery?.trim().toLocaleLowerCase() ?? "";
  const filteredLines =
    catalog == null || lineFilter === ""
      ? (catalog?.lines ?? [])
      : catalog.lines.filter((line) =>
          `${lineLabel(line)} ${line.id}`
            .toLocaleLowerCase()
            .includes(lineFilter),
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
      setFormError(t("finder.errorIncomplete"));
      return;
    }
    const destination = getNextStop(selectedPattern, selectedStation);
    if (!destination) {
      setFormError(t("finder.errorFinalStop"));
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
        setFormError(t("finder.errorNoRoute"));
        return;
      }
      setEstimate(result);
    } catch (error: unknown) {
      setEstimateError(
        error instanceof Error
          ? error.message
          : t("finder.errorEstimate"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label={t("finder.loading")} />;
  if (loadError) {
    return (
      <ErrorState
        title={t("finder.loadErrorTitle")}
        message={loadError}
        onRetry={() => setRetryKey((current) => current + 1)}
      />
    );
  }
  if (!catalog || catalog.lines.length === 0) {
    return (
      <EmptyState
        title={t("finder.emptyTitle")}
        message={t("finder.emptyMessage")}
        actionLabel={t("finder.emptyAction")}
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
            {t("finder.eyebrow")}
          </Text>
          <Title1 id="finder-title">{t("finder.title")}</Title1>
          <Text className="hero-subtitle">{t("finder.subtitle")}</Text>
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
              {t("finder.planWalk")}
            </Button>
          </div>
        </div>
      </section>

      <section className="section-heading" aria-labelledby="lookup-title">
        <div>
          <Title2 id="lookup-title">
            <LocationRegular />
            {t("finder.lookupTitle")}
          </Title2>
          <Text>{t("finder.lookupSubtitle")}</Text>
        </div>
        <span className="availability-badge">
          <span className="status-dot" />
          {t("finder.networkReady")}
        </span>
      </section>

      <Card className="lookup-card">
        <CardHeader
          header={<Text weight="semibold">{t("finder.cardHeader")}</Text>}
          description={
            <Text size={200}>{t("finder.cardDescription")}</Text>
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
            label={t("finder.line")}
            required
            validationState={formError && !selectedLine ? "error" : "none"}
            validationMessage={
              formError && !selectedLine ? t("finder.lineRequired") : undefined
            }
          >
            <Combobox
              freeform
              value={lineQuery ?? (selectedLine ? lineLabel(selectedLine) : "")}
              selectedOptions={selectedLine ? [selectedLine.id] : []}
              placeholder={t("finder.linePlaceholder")}
              onChange={(event) => setLineQuery(event.target.value)}
              onOptionSelect={(_, data) => {
                // Also fires with optionValue undefined when typing clears the
                // selection; only react to an actual option pick.
                if (!data.optionValue) return;
                handleLineChange(data.optionValue);
                setLineQuery(null);
              }}
              onBlur={() => setLineQuery(null)}
            >
              {filteredLines.map((line) => (
                <Option key={line.id} value={line.id} text={lineLabel(line)}>
                  {lineLabel(line)}
                </Option>
              ))}
              {filteredLines.length === 0 && (
                <Option
                  disabled
                  value="__no-results"
                  text={t("finder.lineNoResults")}
                >
                  {t("finder.lineNoResults")}
                </Option>
              )}
            </Combobox>
          </Field>
          <Field
            label={t("finder.station")}
            required
            validationState={
              formError && !selectedStation ? "error" : "warning"
            }
            validationMessage={
              formError && !selectedStation
                ? t("finder.stationRequired")
                : t("finder.stationHint")
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
            label={t("finder.direction")}
            required
            validationState={formError && !selectedDirection ? "error" : "none"}
            validationMessage={
              formError && !selectedDirection
                ? t("finder.directionRequired")
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
              label={t("finder.variant")}
              validationState="none"
              validationMessage={
                selectedPattern
                  ? `${t("finder.variantRuns", {
                      schedule: describeSchedule(selectedPattern.schedule),
                    })}${
                      selectedPatternId === AUTO_PATTERN
                        ? t("finder.variantAuto")
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
                  {t("finder.variantAutoOption")}
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
              {submitting ? t("finder.submitting") : t("finder.submit")}
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
                      {t("finder.nextStop", { line: lineLabel(selectedLine) })}
                    </Text>
                    <DialogTitle>
                      {t("finder.walkTo", { stop: targetStop.name })}
                    </DialogTitle>
                    <DialogContent>
                      {t("finder.fromTo", {
                        station: selectedStation.name,
                        direction: selectedDirection?.label,
                      })}
                    </DialogContent>
                    <div className="result-stats">
                      <div>
                        <Text size={200}>{t("finder.distance")}</Text>
                        <strong>
                          {formatDistance(estimate.distanceMeters)}
                        </strong>
                      </div>
                      <div>
                        <Text size={200}>{t("finder.walkingTime")}</Text>
                        <strong>
                          {formatDuration(estimate.durationSeconds)}
                        </strong>
                      </div>
                    </div>
                    <MessageBar intent="warning">
                      <MessageBarBody>
                        <strong>{t("finder.noteLabel")}</strong>{" "}
                        {t("finder.note")}
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
                        {t("finder.openMaps")}
                      </Button>
                      <Button
                        appearance="subtle"
                        onClick={() => setEstimate(null)}
                      >
                        {t("finder.close")}
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
          <Skeleton aria-label={t("finder.calculating")}>
            <SkeletonItem shape="rectangle" size={20} />
          </Skeleton>
          <Text>{t("finder.checkingRoute")}</Text>
          <ClockRegular />
        </Card>
      )}
      <div className="page-note">
        <Text size={200}>{t("finder.providerNote")}</Text>
      </div>
    </motion.div>
  );
}

function patternOptionLabel(pattern: TransitPattern): string {
  const running = isRunningAt(pattern, new Date())
    ? i18n.t("finder.variantNow")
    : "";
  return `${patternLabel(pattern)} · ${describeSchedule(pattern.schedule)}${running}`;
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
