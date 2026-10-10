import { useState, useEffect, useRef, useCallback } from 'react';
import { api, RealtimeStreamStatus } from '@nammabus/api-client';
import { TripEtaBroadcastEvent } from '@nammabus/shared-types';

export interface UseTripEtaStreamResult {
  eta: TripEtaBroadcastEvent | null;
  status: RealtimeStreamStatus;
  lastPingAt: string | null;
  lastEventAt: string | null;
  error: string | null;
  reconnectCount: number;
  reconnectNow: () => void;
}

/**
 * useTripEtaStream
 * Reusable real-time hook subscribing to trip arrival predictions via SSE.
 * Automatically manages connection lifecycle, parsing, keepalives,
 * staleness detection, and jittered exponential backoff reconnection.
 */
export function useTripEtaStream(tripId?: string | null): UseTripEtaStreamResult {
  const [eta, setEta] = useState<TripEtaBroadcastEvent | null>(null);
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

  const STALE_THRESHOLD_MS = 45000; // 45 seconds

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
    if (!tripId || !isMountedRef.current) return;

    cleanup();
    statusRef.current = 'connecting';
    setStatus('connecting');
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const streamUrl = api.realtime.getTripEtaStreamUrl(tripId);
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
          throw new Error(`Authentication failure [${response.status}]: Access denied to ETA stream`);
        }
        if (response.status === 429) {
          throw new Error('Connection limit exceeded [429]: Too many concurrent real-time streams');
        }
        throw new Error(`Stream connection rejected with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by browser or proxy');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEvent = 'message';

      lastActivityMsRef.current = Date.now();

      // Staleness detector interval
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

              if (currentEvent === 'trip_eta_updated') {
                setEta(data as TripEtaBroadcastEvent);
                statusRef.current = 'live';
                setStatus('live');
                setLastEventAt(new Date().toISOString());
              } else if (currentEvent === 'ping') {
                setLastPingAt(data.timestamp || new Date().toISOString());
                if ((statusRef.current as string) === 'stale') {
                  statusRef.current = 'live';
                  setStatus('live');
                }
              } else if (currentEvent === 'error') {
                setError(data.message || 'Stream error frame received');
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

      const message = err instanceof Error ? err.message : 'Real-time stream connection lost';
      setError(message);
      statusRef.current = 'error';
      setStatus('error');

      // Schedule reconnection with jittered exponential backoff (max 30s)
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
  }, [tripId, cleanup]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  const reconnectNow = useCallback(() => {
    reconnectCountRef.current = 0;
    setReconnectCount(0);
    connect();
  }, [connect]);

  return {
    eta,
    status,
    lastPingAt,
    lastEventAt,
    error,
    reconnectCount,
    reconnectNow,
  };
}
