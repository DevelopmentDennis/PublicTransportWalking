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

export interface ScheduleWindow {
  days: 'mon-fri' | 'sat' | 'sun';
  fromMinute: number;
  toMinute: number;
  trips: number;
}

export interface TransitPattern {
  id: string;
  label: string;
  trips: number;
  schedule: ScheduleWindow[];
  stops: TransitStop[];
}

export interface TransitDirection {
  id: string;
  label: string;
  stops: TransitStop[];
  patterns: TransitPattern[];
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
  getWalkingEstimate(
    request: WalkingDistanceTimeRequest,
  ): Promise<WalkingDistanceTimeResponse | null>;
}