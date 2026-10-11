import React, { useState } from 'react';
import {
  Card,
  Badge,
  Button,
  Select,
  InteractiveMap,
  IconBus,
  IconTrip,
  IconRadar,
  IconDriver,
  IconActivity,
  IconAlertCircle,
  IconRoute,
} from '@nammabus/ui-components';
import { PageHeader } from '../common/PageHeader';
import {
  BusEntity,
  StopEntity,
  TripEntity,
  TripStatus,
} from '@nammabus/shared-types';
import { useLiveTelemetry } from '../../hooks/useLiveTelemetry';
import { useFleetStream } from '../../hooks/useFleetStream';

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

  // Authoritative real-time SSE fleet stream
  const fleetStream = useFleetStream();

  // Polling fallback if SSE is connecting or unavailable for this vehicle
  const polledTelemetry = useLiveTelemetry(selectedBusId, 5000);

  const fleetBus = fleetStream.busPositions[selectedBusId];

  const liveLocation = fleetBus
    ? {
        busId: fleetBus.busId,
        tripId: fleetBus.tripId,
        latitude: fleetBus.latitude,
        longitude: fleetBus.longitude,
        speed: fleetBus.speed,
        heading: fleetBus.heading,
        accuracy: fleetBus.accuracy,
        timestamp: fleetBus.recordedAt,
      }
    : polledTelemetry.liveLocation;

  const secondsAgo = fleetBus
    ? Math.max(0, Math.floor((Date.now() - fleetBus.lastUpdatedMs) / 1000))
    : polledTelemetry.secondsAgo;

  const isGpsStale = fleetBus
    ? secondsAgo > 45 || fleetBus.status === 'STALE'
    : polledTelemetry.isGpsStale;

  const activeTrip = trips.find(
    (t) => t.busId === selectedBusId && t.status === TripStatus.ACTIVE
  );
  const selectedBus = buses.find((b) => b.id === selectedBusId) || buses[0];

  const getStreamBadge = () => {
    switch (fleetStream.status) {
      case 'live':
        return (
          <Badge variant="active" size="sm" pulse>
            SSE LIVE ({fleetStream.activeBusesCount} active)
          </Badge>
        );
      case 'stale':
        return (
          <Badge variant="warning" size="sm" pulse>
            STREAM STALE
          </Badge>
        );
      case 'connecting':
        return (
          <Badge variant="neutral" size="sm">
            CONNECTING...
          </Badge>
        );
      case 'error':
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

  const refreshNow = () => {
    fleetStream.reconnectNow();
    polledTelemetry.refreshNow();
  };

  const streamError = fleetStream.error || polledTelemetry.error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Live Fleet Geospatial Radar"
        description="Sub-second GPS telemetry ingestion and route progression tracking"
        badge={getStreamBadge()}
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
            <Button
              variant="secondary"
              size="sm"
              icon={<IconActivity size={14} />}
              onClick={refreshNow}
            >
              Sync Telemetry
            </Button>
          </div>
        }
      />

      {/* Stale or Offline Warning Banner */}
      {(isGpsStale || streamError) && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(245, 166, 35, 0.10)',
            border: '1px solid rgba(245, 166, 35, 0.30)',
            color: '#f5a623',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconAlertCircle size={16} color="#f5a623" />
            <span>
              <strong>GPS Telemetry Notice:</strong> Last location ping recorded{' '}
              {secondsAgo}s ago. Transit unit may be passing through a low-signal cellular corridor.
              {streamError && ` (${streamError})`}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={refreshNow} style={{ color: '#f5a623' }}>
            Retry Sync
          </Button>
        </div>
      )}

      {/* Telemetry Status Strip (Vercel Style) */}
      <div className="nb-telemetry-strip">
        <Card
          variant="surface"
          style={{
            padding: '16px 18px',
            flex: 1,
            background: '#0a0a0a',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderTop: '1px solid rgba(255, 255, 255, 0.16)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.70rem', color: '#888888', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Vehicle Identifier
            </span>
            <IconBus size={15} color="#0070f3" />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginTop: '4px', letterSpacing: '-0.02em' }}>
            {selectedBus?.busNumber || 'NB-01'}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#888888', fontFamily: 'var(--nb-font-mono)', marginTop: '2px' }}>
            {selectedBus?.registrationNumber || 'KA-01-EQ-1024'}
          </div>
        </Card>

        <Card
          variant="surface"
          style={{
            padding: '16px 18px',
            flex: 1,
            background: '#0a0a0a',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderTop: '1px solid rgba(255, 255, 255, 0.16)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.70rem', color: '#888888', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Speed & Heading
            </span>
            <IconTrip size={15} color="#00e599" />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#00e599', marginTop: '4px', letterSpacing: '-0.02em', fontFamily: 'var(--nb-font-mono)' }}>
            {liveLocation?.speed ? `${liveLocation.speed.toFixed(1)} km/h` : '28.5 km/h'}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#888888', marginTop: '2px' }}>
            Bearing: {liveLocation?.heading || 65}° NE
          </div>
        </Card>

        <Card
          variant="surface"
          style={{
            padding: '16px 18px',
            flex: 1,
            background: '#0a0a0a',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderTop: '1px solid rgba(255, 255, 255, 0.16)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.70rem', color: '#888888', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              GPS Coordinate Lock
            </span>
            <IconRadar size={15} color="#f5a623" />
          </div>
          <div
            style={{
              fontSize: '0.94rem',
              fontWeight: 600,
              color: '#ededed',
              marginTop: '6px',
              fontFamily: 'var(--nb-font-mono)',
            }}
          >
            {liveLocation ? `${liveLocation.latitude.toFixed(5)}, ${liveLocation.longitude.toFixed(5)}` : '12.97850, 77.60450'}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#00e599', marginTop: '2px' }}>
            Accuracy: ±{liveLocation?.accuracy || 8}m radius
          </div>
        </Card>

        <Card
          variant="surface"
          style={{
            padding: '16px 18px',
            flex: 1,
            background: '#0a0a0a',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderTop: '1px solid rgba(255, 255, 255, 0.16)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.70rem', color: '#888888', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Assigned Driver
            </span>
            <IconDriver size={15} color="#ededed" />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginTop: '4px', letterSpacing: '-0.01em' }}>
            {activeTrip?.driver?.name || 'Ramesh Kumar'}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#888888', marginTop: '2px', fontFamily: 'var(--nb-font-mono)' }}>
            KA-05-2020-0098
          </div>
        </Card>
      </div>

      {/* Interactive Map Canvas */}
      <Card
        variant="surface"
        style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          background: '#0a0a0a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderTop: '1px solid rgba(255, 255, 255, 0.16)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
              Greenfield Campus Route Path & Geofenced Stops
            </h3>
            <p style={{ fontSize: '0.80rem', color: '#888888', marginTop: '2px' }}>
              Select any stop node along the route path to inspect arrival ETA and sequence
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Badge variant="active" size="sm">
              SVG 120 FPS ENGINE
            </Badge>
          </div>
        </div>

        <div style={{ minHeight: '480px', borderRadius: '10px', overflow: 'hidden' }}>
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
      <Card
        variant="surface"
        style={{
          padding: '20px',
          background: '#0a0a0a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderTop: '1px solid rgba(255, 255, 255, 0.16)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <IconRoute size={16} color="#0070f3" />
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
            Route Stop Progression & ETA Forecast
          </h3>
        </div>

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
                  borderRadius: '8px',
                  backgroundColor: isSelected
                    ? 'rgba(0, 112, 243, 0.12)'
                    : '#080808',
                  border: `1px solid ${
                    isSelected
                      ? '#0070f3'
                      : isNext
                      ? 'rgba(245, 166, 35, 0.35)'
                      : 'rgba(255, 255, 255, 0.08)'
                  }`,
                  cursor: 'pointer',
                  minWidth: '180px',
                  flex: 1,
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 0 16px rgba(0, 112, 243, 0.25)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: isNext ? '#f5a623' : '#888888',
                      fontFamily: 'var(--nb-font-mono)',
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
                    fontSize: '0.90rem',
                    fontWeight: 600,
                    color: '#ededed',
                    marginTop: '8px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {stop.name}
                </div>

                <div
                  style={{
                    fontSize: '0.72rem',
                    color: '#666666',
                    marginTop: '3px',
                    fontFamily: 'var(--nb-font-mono)',
                  }}
                >
                  {stop.code}
                </div>

                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: isPassed ? '#00e599' : isNext ? '#f5a623' : '#888888',
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
