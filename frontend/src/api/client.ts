import { getLocalTransitCatalog } from './transitData';
import type {
  ApiClient,
  ServiceHealth,
  WalkingDistanceTimeRequest,
  WalkingDistanceTimeResponse,
} from './types';

export const liveClient: ApiClient = {
  async getServiceHealth() {
    const response = await fetch('/api/health');
    if (!response.ok) throw new Error(await readErrorMessage(response));
    return parseServiceHealth(await response.json());
  },

  async getTransitCatalog() {
    return getLocalTransitCatalog();
  },

  async getWalkingEstimate(request: WalkingDistanceTimeRequest) {
    const response = await fetch('/api/GetDistanceTime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (response.status === 404) return null;
    if (!response.ok) throw new Error(await readErrorMessage(response));
    return parseWalkingEstimate(await response.json());
  },
};

function parseServiceHealth(value: unknown): ServiceHealth {
  if (
    typeof value !== 'object' || value === null ||
    !('status' in value) || typeof value.status !== 'string' ||
    !('services' in value) || typeof value.services !== 'object' || value.services === null ||
    !('functions' in value.services) || typeof value.services.functions !== 'string' ||
    !('walkingRoutes' in value.services) || typeof value.services.walkingRoutes !== 'string'
  ) {
    throw new Error('The walking service returned an invalid health response.');
  }
  return value as ServiceHealth;
}

function parseWalkingEstimate(value: unknown): WalkingDistanceTimeResponse {
  if (
    typeof value !== 'object' || value === null ||
    !('distanceMeters' in value) || typeof value.distanceMeters !== 'number' || !Number.isFinite(value.distanceMeters) ||
    !('durationSeconds' in value) || typeof value.durationSeconds !== 'number' || !Number.isFinite(value.durationSeconds)
  ) {
    throw new Error('The walking service returned an invalid estimate.');
  }
  return { distanceMeters: value.distanceMeters, durationSeconds: value.durationSeconds };
}

async function readErrorMessage(response: Response): Promise<string> {
  const message = (await response.text()).trim();
  return message || `Walking service request failed (${response.status}).`;
}