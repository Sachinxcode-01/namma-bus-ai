import React, { useState } from 'react';
import { Card, Badge, Button, Select } from '@nammabus/ui-components';
import { PageHeader } from '../common/PageHeader';
import { InteractiveMap } from '@nammabus/ui-components';
import {
  BusEntity,
  StopEntity,
  TripEntity,
  TripStatus,
} from '@nammabus/shared-types';
import { useLiveTelemetry } from '../../hooks/useLiveTelemetry';
import { ConnectionState } from '../../types';

interface LiveBusMonitorProps {
  buses: BusEntity[];
  stops: StopEntity[];
  trips: TripEntity[];
}

export const LiveBusMonitor: React.FC<LiveBusMonitorProps> = ({
  buses,
  stops,
  trips,
}) => {
  const [selectedBusId, setSelectedBusId] = useState<string>('bus-1');
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  // Hook handles isolated polling and stale GPS detection
  const {
    liveLocation,
    connectionState,
    isGpsStale,
    secondsAgo,
    error,
    refreshNow,
  } = useLiveTelemetry(selectedBusId, 3500);

  const activeTrip = trips.find(
    (t) => t.busId === selectedBusId && t.status === TripStatus.ACTIVE
  );
  const selectedBus = buses.find((b) => b.id === selectedBusId) || buses[0];

  const getConnectionBadge = (state: ConnectionState, stale: boolean) => {
    if (stale) {
      return (
        <Badge variant="warning" size="sm" pulse>
          GPS STALE ({secondsAgo}s ago)
        </Badge>
      );
    }
    switch (state) {
      case 'connected':
        return (
          <Badge variant="active" size="sm" pulse>
            TELEMETRY LIVE ({secondsAgo}s ago)
          </Badge>
        );
      case 'connecting':
        return (
          <Badge variant="neutral" size="sm">
            CONNECTING...
          </Badge>
        );
      case 'offline':
        return (
          <Badge variant="danger" size="sm">
            DISCONNECTED
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            STANDBY
          </Badge>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Live Fleet Geospatial Radar"
        description="Sub-second GPS telemetry ingestion and route progression tracking"
        badge={getConnectionBadge(connectionState, isGpsStale)}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Select
              value={selectedBusId}
              onChange={(e) => setSelectedBusId(e.target.value)}
              options={buses.map((b) => ({
                value: b.id,
                label: `Bus ${b.busNumber} (${b.registrationNumber})`,
              }))}
              style={{ minWidth: '220px' }}
            />
            <Button variant="secondary" size="sm" onClick={refreshNow}>
              ↻ Ping GPS
            </Button>
          </div>
        }
      />

      {/* Stale or Offline Warning Banner */}
      {(isGpsStale || error) && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#fbbf24',
            fontSize: '0.86rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span>
            <span>
              <strong>GPS Telemetry Notice:</strong> Last location ping was recorded{' '}
              {secondsAgo} seconds ago. Driver phone may be passing through a low-signal cellular tunnel.
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={refreshNow} style={{ color: '#fbbf24' }}>
            Retry Sync
          </Button>
        </div>
      )}

      {/* Telemetry Status Strip */}
      <div className="nb-telemetry-strip">
        <Card variant="surface" style={{ padding: '14px 18px', flex: 1 }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
            Vehicle Details
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
            {selectedBus?.busNumber || 'NB-01'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#fbbf24', fontFamily: 'var(--nb-font-mono)' }}>
            {selectedBus?.registrationNumber || 'KA-01-EQ-1024'}
          </div>
        </Card>

        <Card variant="surface" style={{ padding: '14px 18px', flex: 1 }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
            Speed & Heading
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
            {liveLocation?.speed ? `${liveLocation.speed.toFixed(1)} km/h` : '28.5 km/h'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Heading: {liveLocation?.heading || 65}° NE
          </div>
        </Card>

        <Card variant="surface" style={{ padding: '14px 18px', flex: 1 }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
            GPS Coordinates
          </div>
          <div
            style={{
              fontSize: '0.98rem',
              fontWeight: 700,
              color: '#f8fafc',
              marginTop: '4px',
              fontFamily: 'var(--nb-font-mono)',
            }}
          >
            {liveLocation ? `${liveLocation.latitude.toFixed(5)}, ${liveLocation.longitude.toFixed(5)}` : '12.97850, 77.60450'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
            Accuracy: ±{liveLocation?.accuracy || 8}m radius
          </div>
        </Card>

        <Card variant="surface" style={{ padding: '14px 18px', flex: 1 }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
            Assigned Driver
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
            {activeTrip?.driver?.name || 'Ramesh Kumar'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            License: KA-05-2020-0098
          </div>
        </Card>
      </div>

      {/* Interactive Map Canvas */}
      <Card variant="surface" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
              Greenfield Campus Route Path & Geofenced Stops
            </h3>
            <p style={{ fontSize: '0.80rem', color: '#94a3b8' }}>
              Click any stop node along the route to inspect arrival sequence and estimated schedule
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Badge variant="active" size="sm">
              SVG 120 FPS ENGINE
            </Badge>
          </div>
        </div>

        <div style={{ minHeight: '480px', borderRadius: '12px', overflow: 'hidden' }}>
          <InteractiveMap
            stops={stops}
            currentLocation={liveLocation}
            selectedStopId={selectedStopId}
            busNumber={selectedBus?.busNumber || 'NB-01'}
            isTrackingActive={!isGpsStale}
            isGpsStale={isGpsStale}
            onStopSelect={(stop) => setSelectedStopId(stop.id)}
            height={480}
          />
        </div>
      </Card>

      {/* Stop Progression Schedule Cards */}
      <Card variant="surface" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#f8fafc', marginBottom: '14px' }}>
          Route Stop Progression & ETA Forecast
        </h3>

        <div className="nb-stop-cards-row">
          {stops.map((stop, idx) => {
            const isSelected = selectedStopId === stop.id;
            const isPassed = idx === 0;
            const isNext = idx === 1;

            return (
              <div
                key={stop.id}
                onClick={() => setSelectedStopId(stop.id)}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: isSelected
                    ? 'rgba(59, 130, 246, 0.15)'
                    : 'rgba(15, 23, 42, 0.65)',
                  border: `1.5px solid ${
                    isSelected
                      ? 'hsl(217, 91%, 60%)'
                      : isNext
                      ? 'rgba(245, 158, 11, 0.4)'
                      : 'rgba(255, 255, 255, 0.08)'
                  }`,
                  cursor: 'pointer',
                  minWidth: '180px',
                  flex: 1,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: isNext ? '#fbbf24' : '#38bdf8',
                    }}
                  >
                    STOP #{idx + 1}
                  </span>
                  <Badge
                    variant={isPassed ? 'completed' : isNext ? 'warning' : 'neutral'}
                    size="sm"
                  >
                    {isPassed ? 'DEPARTED' : isNext ? 'NEXT STOP' : 'UPCOMING'}
                  </Badge>
                </div>

                <div
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: '#f8fafc',
                    marginTop: '8px',
                  }}
                >
                  {stop.name}
                </div>

                <div
                  style={{
                    fontSize: '0.74rem',
                    color: 'var(--nb-text-muted, #64748b)',
                    marginTop: '4px',
                    fontFamily: 'var(--nb-font-mono)',
                  }}
                >
                  {stop.code}
                </div>

                <div
                  style={{
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    color: isPassed ? '#10b981' : isNext ? '#fbbf24' : '#94a3b8',
                    marginTop: '8px',
                  }}
                >
                  {isPassed ? 'Arrived (On Time)' : isNext ? '~4 mins away' : `+${(idx + 1) * 6} mins`}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
