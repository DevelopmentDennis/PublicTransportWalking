import { useEffect, useState } from "react";
import {
  ArrowClockwiseRegular,
  CheckmarkCircleRegular,
  DataTrendingRegular,
  LocationRegular,
  TableRegular,
  ArrowSwapRegular,
  VehicleBusRegular,
} from "@fluentui/react-icons";
import {
  Button,
  Card,
  CardHeader,
  CardPreview,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Title1,
  Title2,
} from "@fluentui/react-components";
import { motion } from "motion/react";
import { api } from "../api";
import type { DataGuide } from "../api/types";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";

export function RouteDataGuide() {
  const [guide, setGuide] = useState<DataGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getDataGuide()
      .then((data) => {
        if (active) setGuide(data);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to read local transit records.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retryKey]);

  if (loading) return <LoadingState label="Loading local transit records" />;
  if (error)
    return (
      <ErrorState
        title="Local transit data temporarily unavailable"
        message={error}
        onRetry={() => setRetryKey((current) => current + 1)}
      />
    );
  if (!guide || guide.records.length === 0) {
    return (
      <EmptyState
        title="No local transit records"
        message="No bundled tram or bus records are available. Reload the route data to try again."
        actionLabel="Reload route data"
        onAction={() => setRetryKey((current) => current + 1)}
      />
    );
  }

  return (
    <motion.div
      className="page-flow data-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <section className="data-intro" aria-labelledby="data-title">
        <span className="coverage-pill">Local network reference</span>
        <Title1 id="data-title">Transit data, ready for wayfinding</Title1>
        <Text>
          Browse the bundled Augsburg station catalog and route files that power
          the walking assistant. The finder pairs these records with the walking
          distance and time service.
        </Text>
        <div className="data-intro-action">
          <Button
            appearance="primary"
            icon={<LocationRegular />}
            as="a"
            href="/"
          >
            Open route finder
          </Button>
        </div>
      </section>

      <section className="data-section" aria-labelledby="records-title">
        <div className="section-heading">
          <div>
            <Title2 id="records-title">
              <TableRegular />
              Representative records
            </Title2>
            <Text>stations.json and tram line data</Text>
          </div>
          <span className="record-count">
            {guide.stationCount.toLocaleString("en")} local stops
          </span>
        </div>
        <Card className="table-card">
          <CardPreview className="table-preview">
            <div className="table-scroll">
              <Table aria-label="Representative transit records">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Dataset</TableHeaderCell>
                    <TableHeaderCell>Record</TableHeaderCell>
                    <TableHeaderCell>Coordinates or journey</TableHeaderCell>
                    <TableHeaderCell>Coverage</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guide.records.map((record) => (
                    <TableRow key={`${record.dataset}-${record.record}`}>
                      <TableCell>{record.dataset}</TableCell>
                      <TableCell>
                        <Text weight="semibold">{record.record}</Text>
                      </TableCell>
                      <TableCell>{record.coordinates}</TableCell>
                      <TableCell>
                        <span className="table-status">
                          <CheckmarkCircleRegular />
                          {record.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardPreview>
        </Card>
      </section>

      <section className="data-section" aria-labelledby="coverage-title">
        <div className="section-heading">
          <div>
            <Title2 id="coverage-title">
              <DataTrendingRegular />
              Dataset coverage
            </Title2>
            <Text>Bundled for local lookup</Text>
          </div>
          <span className="coverage-summary">
            {guide.coverage.length} datasets
          </span>
        </div>
        <div className="coverage-list">
          {guide.coverage.map((dataset) => (
            <Card key={dataset.id} className="coverage-card">
              <CardHeader
                image={
                  <span className="dataset-icon">
                    {dataset.id === "bus-routes" ? (
                      <VehicleBusRegular />
                    ) : dataset.id === "tram-routes" ? (
                      <ArrowSwapRegular />
                    ) : (
                      <LocationRegular />
                    )}
                  </span>
                }
                header={<Text weight="semibold">{dataset.title}</Text>}
                description={<Text>{dataset.description}</Text>}
              />
              <div className="coverage-card-meta">
                <Text size={200}>{dataset.source}</Text>
                <Text size={200}>
                  {dataset.recordCount.toLocaleString("en")} records
                </Text>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <MessageBar intent="info" className="data-note">
        <MessageBarBody>
          <MessageBarTitle>Local data only</MessageBarTitle>
          Route selection and station coordinates come from bundled assets.
          Walking estimates come from the live route service.
          <Button
            appearance="subtle"
            icon={<ArrowClockwiseRegular />}
            as="a"
            href="/"
          >
            Return to finder
          </Button>
        </MessageBarBody>
      </MessageBar>
    </motion.div>
  );
}
