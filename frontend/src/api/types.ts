export type TransitMode = 'tram' | 'bus';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface TransitStop extends Coordinate {
  id: string;
  name: string;
  shortName?: string;
}

export interface TransitDirection {
  id: string;
  label: string;
  stops: TransitStop[];
}

export interface TransitLine {
  id: string;
  mode: TransitMode;
  number: string;
  label: string;
  source: string;
  directions: TransitDirection[];
  stops: TransitStop[];
}

export interface TransitCatalog {
  lines: TransitLine[];
  stations: TransitStop[];
}

export interface DataGuideRecord {
  dataset: string;
  record: string;
  coordinates: string;
  status: 'Available';
}

export interface DatasetCoverage {
  id: string;
  title: string;
  description: string;
  source: string;
  recordCount: number;
}

export interface DataGuide {
  records: DataGuideRecord[];
  coverage: DatasetCoverage[];
  stationCount: number;
}

export interface WalkingDistanceTimeRequest {
  origin: Coordinate;
  destination: Coordinate;
}

export interface WalkingDistanceTimeResponse {
  distanceMeters: number;
  durationSeconds: number;
}

export interface ServiceHealth {
  status: string;
  services: {
    functions: string;
    walkingRoutes: string;
  };
}

export interface ApiClient {
  getServiceHealth(): Promise<ServiceHealth>;
  getTransitCatalog(): Promise<TransitCatalog>;
  getDataGuide(): Promise<DataGuide>;
  getWalkingEstimate(
    request: WalkingDistanceTimeRequest,
  ): Promise<WalkingDistanceTimeResponse | null>;
}