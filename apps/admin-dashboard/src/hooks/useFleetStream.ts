import { useState, useEffect, useRef, useCallback } from 'react';
import { api, RealtimeStreamStatus } from '@nammabus/api-client';

export interface FleetBusLocation {
  tripId: string;
  busId: string;
  routeId: string;
  routeCode: string;
  busNumber: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
  receivedAt: string;
  status: string;
  signalQuality: string;
  locationId: string;
  lastUpdatedMs: number;
}

export interface UseFleetStreamResult {
  busPositions: Record<string, FleetBusLocation>;
  status: RealtimeStreamStatus;
  activeBusesCount: number;
  lastPingAt: string | null;
  lastEventAt: string | null;
  error: string | null;
  reconnectCount: number;
  reconnectNow: () => void;
}

/**
 * useFleetStream
 * Subscribes to authoritative real-time fleet GPS telemetry via SSE (GET /locations/fleet/stream).
 * Manages full fleet state map, heartbeat monitoring, staleness detection,
 * and resilient reconnection with exponential backoff.
 */
export function useFleetStream(): UseFleetStreamResult {
  const [busPositions, setBusPositions] = useState<Record<string, FleetBusLocation>>({});
  const [status, setStatus] = useState<RealtimeStreamStatus>('connecting');
  const [lastPingAt, setLastPingAt] = useState<string | null>(null);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState<number>(0);

  const statusRef = useRef<RealtimeStreamStatus>('connecting');
  const reconnectCountRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staleCheckIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityMsRef = useRef<number>(Date.now());
  const isMountedRef = useRef<boolean>(true);

  const STALE_THRESHOLD_MS = 45000;

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (staleCheckIntervalRef.current) {
      clearInterval(staleCheckIntervalRef.current);
      staleCheckIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!isMountedRef.current) return;

    cleanup();
    statusRef.current = 'connecting';
    setStatus('connecting');
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const streamUrl = api.realtime.getFleetStreamUrl();
    const token = api.getAccessToken();

    try {
      const response = await fetch(streamUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication failure [${response.status}]: Administrator role required for fleet stream`);
        }
        if (response.status === 429) {
          throw new Error('Connection limit exceeded [429]: Too many concurrent stream connections');
        }
        throw new Error(`Fleet stream rejected with HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by browser environment');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEvent = 'message';

      lastActivityMsRef.current = Date.now();

      // Periodic staleness inspector
      staleCheckIntervalRef.current = setInterval(() => {
        if (!isMountedRef.current) return;
        const elapsed = Date.now() - lastActivityMsRef.current;
        if (elapsed > STALE_THRESHOLD_MS) {
          statusRef.current = 'stale';
          setStatus('stale');
        }
      }, 5000);

      while (isMountedRef.current) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.substring(6).trim();
          } else if (trimmed.startsWith('data:')) {
            const rawData = trimmed.substring(5).trim();
            try {
              const data = JSON.parse(rawData);
              lastActivityMsRef.current = Date.now();

              if (currentEvent === 'fleet_location_update' || currentEvent === 'location_update') {
                const locData = data as FleetBusLocation;
                const busKey = locData.busId || locData.busNumber;

                setBusPositions((prev) => ({
                  ...prev,
                  [busKey]: {
                    ...locData,
                    lastUpdatedMs: Date.now(),
                  },
                }));
                statusRef.current = 'live';
                setStatus('live');
                setLastEventAt(new Date().toISOString());
              } else if (currentEvent === 'ping') {
                setLastPingAt(data.timestamp || new Date().toISOString());
                if ((statusRef.current as RealtimeStreamStatus) === 'stale') {
                  statusRef.current = 'live';
                  setStatus('live');
                }
              } else if (currentEvent === 'error') {
                setError(data.message || 'Stream error event received');
              }
            } catch {
              // Ignore non-JSON chunks
            }
          } else if (trimmed === '') {
            currentEvent = 'message';
          }
        }
      }

      if (isMountedRef.current && !controller.signal.aborted) {
        const attempt = reconnectCountRef.current + 1;
        reconnectCountRef.current = attempt;
        setReconnectCount(attempt);
        const backoffMs = Math.min(1000 * Math.pow(1.4, attempt) + Math.random() * 1000, 30000);

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, backoffMs);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      if (!isMountedRef.current) return;

      const message = err instanceof Error ? err.message : 'Fleet telemetry stream disconnected';
      setError(message);
      statusRef.current = 'error';
      setStatus('error');

      const attempt = reconnectCountRef.current + 1;
      reconnectCountRef.current = attempt;
      setReconnectCount(attempt);
      const backoffMs = Math.min(1000 * Math.pow(1.4, attempt) + Math.random() * 1000, 30000);

      reconnectTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          connect();
        }
      }, backoffMs);
    } finally {
      if (staleCheckIntervalRef.current) {
        clearInterval(staleCheckIntervalRef.current);
        staleCheckIntervalRef.current = null;
      }
    }
  }, [cleanup]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reconnectNow = useCallback(() => {
    reconnectCountRef.current = 0;
    setReconnectCount(0);
    connect();
  }, [connect]);

  return {
    busPositions,
    status,
    activeBusesCount: Object.keys(busPositions).length,
    lastPingAt,
    lastEventAt,
    error,
    reconnectCount,
    reconnectNow,
  };
}
