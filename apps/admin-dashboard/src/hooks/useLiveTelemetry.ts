import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@nammabus/api-client';
import { LiveLocationEntity } from '@nammabus/shared-types';
import { ConnectionState } from '../types';

export function useLiveTelemetry(busId: string = 'bus-1', pollIntervalMs: number = 4000) {
  const [liveLocation, setLiveLocation] = useState<LiveLocationEntity | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [isGpsStale, setIsGpsStale] = useState<boolean>(false);
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  const fetchTelemetry = useCallback(async () => {
    try {
      const loc = await api.buses.getLiveLocation(busId);
      if (!isMountedRef.current) return;

      setLiveLocation(loc);
      setError(null);

      // Check timestamp freshness
      const updateTime = new Date(loc.timestamp).getTime();
      const now = Date.now();
      const elapsedSec = Math.max(0, Math.floor((now - updateTime) / 1000));
      setSecondsAgo(elapsedSec);

      // If older than 45 seconds, mark as stale
      if (elapsedSec > 45) {
        setIsGpsStale(true);
        setConnectionState('stale');
      } else {
        setIsGpsStale(false);
        setConnectionState('connected');
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Telemetry sync failed';
      setError(msg);
      setConnectionState('offline');
      setIsGpsStale(true);
    }
  }, [busId]);

  useEffect(() => {
    isMountedRef.current = true;
    setConnectionState('connecting');

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, pollIntervalMs);

    // Local ticker to increment secondsAgo smoothly
    const ticker = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      clearInterval(ticker);
    };
  }, [fetchTelemetry, pollIntervalMs]);

  return {
    liveLocation,
    connectionState,
    isGpsStale,
    secondsAgo,
    error,
    refreshNow: fetchTelemetry,
  };
}
