import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './index';

afterEach(() => vi.unstubAllGlobals());

describe('live walking API client', () => {
  it('posts coordinates to the Functions endpoint and parses the estimate', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ distanceMeters: 850, durationSeconds: 660 }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.getWalkingEstimate({
      origin: { latitude: 48.36544, longitude: 10.88557 },
      destination: { latitude: 48.338303, longitude: 10.867737 },
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/GetDistanceTime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { latitude: 48.36544, longitude: 10.88557 },
        destination: { latitude: 48.338303, longitude: 10.867737 },
      }),
    });
    expect(result).toEqual({ distanceMeters: 850, durationSeconds: 660 });
  });

  it('returns null when the service reports that no route exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('No walking route was found.', { status: 404 })));

    await expect(api.getWalkingEstimate({
      origin: { latitude: 48.36544, longitude: 10.88557 },
      destination: { latitude: 48.338303, longitude: 10.867737 },
    })).resolves.toBeNull();
  });

  it('surfaces provider errors from the service response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Route provider unavailable.', { status: 502 })));

    await expect(api.getWalkingEstimate({
      origin: { latitude: 48.36544, longitude: 10.88557 },
      destination: { latitude: 48.338303, longitude: 10.867737 },
    })).rejects.toThrow('Route provider unavailable.');
  });

  it('reads health from the running Functions API', async () => {
    const health = { status: 'healthy', services: { functions: 'healthy', walkingRoutes: 'configured' } };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(health), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.getServiceHealth()).resolves.toEqual(health);
    expect(fetchMock).toHaveBeenCalledWith('/api/health');
  });
});