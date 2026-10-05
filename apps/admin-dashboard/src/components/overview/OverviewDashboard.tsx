import React from 'react';
import { Card, Badge, Button } from '@nammabus/ui-components';
import { MetricCard } from '../common/MetricCard';
import { PageHeader } from '../common/PageHeader';
import { InteractiveMap } from '@nammabus/ui-components';
import {
  BusEntity,
  TripEntity,
  StopEntity,
  IncidentEntity,
  LiveLocationEntity,
  IncidentStatus,
  IncidentSeverity,
  TripStatus,
} from '@nammabus/shared-types';
import { AdminTab, MetricSummary } from '../../types';

interface OverviewDashboardProps {
  metrics: MetricSummary;
  buses: BusEntity[];
  trips: TripEntity[];
  stops: StopEntity[];
  incidents: IncidentEntity[];
  liveLocation: LiveLocationEntity | null;
  onNavigateTab: (tab: AdminTab) => void;
  onResolveIncident: (id: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  metrics,
  buses,
  trips,
  stops,
  incidents,
  liveLocation,
  onNavigateTab,
  onResolveIncident,
}) => {
  const activeTrips = trips.filter((t) => t.status === TripStatus.ACTIVE);
  const openIncidents = incidents.filter((i) => i.status !== IncidentStatus.RESOLVED);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <PageHeader
        title="College Fleet Operations Monitor"
        description="Real-time telemetry, active student transit trips, and safety control"
        badge={
          <Badge variant="active" size="sm" pulse>
            SYSTEM ACTIVE
          </Badge>
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigateTab('broadcast')}
            >
              📢 Dispatch Alert
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigateTab('live')}
            >
              📡 Open Live Radar
            </Button>
          </>
        }
      />

      {/* Critical Incident Alert Banner (if any) */}
      {metrics.criticalIncidentsCount > 0 && (
        <div
          role="alert"
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.35) 100%)',
            border: '1.5px solid rgba(239, 68, 68, 0.6)',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.35)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>🚨</span>
            <div>
              <div style={{ fontWeight: 800, color: '#fecaca', fontSize: '0.98rem' }}>
                URGENT: {metrics.criticalIncidentsCount} Critical Emergency / SOS Incident Reported
              </div>
              <div style={{ fontSize: '0.82rem', color: '#fca5a5', marginTop: '2px' }}>
                Immediate dispatch verification required for student passenger safety.
              </div>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onNavigateTab('incidents')}
          >
            Review Emergency Console →
          </Button>
        </div>
      )}

      {/* 4 Core Operational Metric Cards */}
      <div className="nb-metrics-grid">
        <MetricCard
          label="Active Fleet Buses"
          value={`${metrics.activeBusesCount} / ${metrics.totalBusesCount}`}
          subtext="100% active telemetry pinging"
          subtextStatus="positive"
          icon="🚌"
          glow="primary"
          onClick={() => onNavigateTab('buses')}
        />

        <MetricCard
          label="Active Trips Running"
          value={metrics.activeTripsCount}
          subtext={activeTrips.length > 0 ? 'Greenfield Express in transit' : 'No active trips'}
          subtextStatus={activeTrips.length > 0 ? 'positive' : 'neutral'}
          icon="⏱️"
          glow="amber"
          onClick={() => onNavigateTab('trips')}
        />

        <MetricCard
          label="Drivers On Duty"
          value={`${metrics.onDutyDriversCount} / ${metrics.totalDriversCount}`}
          subtext="Assigned & authenticated"
          subtextStatus="positive"
          icon="🧑‍✈️"
          glow="emerald"
          onClick={() => onNavigateTab('drivers')}
        />

        <MetricCard
          label="Open Safety Incidents"
          value={metrics.openIncidentsCount}
          subtext={
            metrics.openIncidentsCount > 0
              ? 'Requires staff acknowledgement'
              : 'All transit routes normal'
          }
          subtextStatus={metrics.openIncidentsCount > 0 ? 'negative' : 'positive'}
          icon="⚠️"
          glow={metrics.openIncidentsCount > 0 ? 'rose' : 'none'}
          onClick={() => onNavigateTab('incidents')}
        />
      </div>

      {/* Main Grid: Live Radar Preview & Active Trips */}
      <div className="nb-overview-split-grid">
        {/* Left: Live Map Radar */}
        <Card variant="surface" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                Live Geospatial Fleet Radar
              </h3>
              <p style={{ fontSize: '0.80rem', color: 'var(--nb-text-secondary, #94a3b8)' }}>
                GPS Telemetry tracking Bus NB-01 along Greenfield Campus Route
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('live')}
            >
              Full Screen Map ↗
            </Button>
          </div>

          <div style={{ flex: 1, minHeight: '340px' }}>
            <InteractiveMap
              stops={stops}
              currentLocation={liveLocation}
              busNumber="NB-01"
              height={340}
            />
          </div>
        </Card>

        {/* Right: Active Trips & Open Incidents Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Trips Card */}
          <Card variant="surface" style={{ padding: '20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                Active Trips In Progress
              </h3>
              <Badge variant="active" size="sm">
                {activeTrips.length} RUNNING
              </Badge>
            </div>

            {activeTrips.length === 0 ? (
              <div
                style={{
                  padding: '30px 20px',
                  textAlign: 'center',
                  color: 'var(--nb-text-muted, #64748b)',
                  fontSize: '0.86rem',
                }}
              >
                No trips currently in active transit.
              </div>
            ) : (
              <div className="nb-table-container">
                <table className="nb-table">
                  <thead>
                    <tr>
                      <th>Bus</th>
                      <th>Route</th>
                      <th>Driver</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTrips.map((trip) => (
                      <tr key={trip.id}>
                        <td style={{ fontWeight: 800, color: '#fbbf24' }}>
                          {trip.bus?.busNumber || 'NB-01'}
                        </td>
                        <td>{trip.route?.name || 'Greenfield Express'}</td>
                        <td>{trip.driver?.name || 'Ramesh Kumar'}</td>
                        <td>
                          <Badge variant="active" size="sm" pulse>
                            ACTIVE
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Quick Incidents Triage Card */}
          <Card variant="surface" style={{ padding: '20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                Safety & Incident Queue
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab('incidents')}
              >
                View All ({incidents.length}) →
              </Button>
            </div>

            {openIncidents.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  borderRadius: '10px',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                }}
              >
                ✓ All transport safety channels clear. No unresolved incidents.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {openIncidents.slice(0, 3).map((inc) => (
                  <div
                    key={inc.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Badge
                          variant={
                            inc.severity === IncidentSeverity.CRITICAL
                              ? 'danger'
                              : inc.severity === IncidentSeverity.HIGH
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {inc.type}
                        </Badge>
                        <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f8fafc' }}>
                          {inc.description}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--nb-text-muted, #64748b)',
                          marginTop: '4px',
                        }}
                      >
                        {new Date(inc.createdAt).toLocaleTimeString()}
                      </div>
                    </div>

                    <Button
                      variant="amber"
                      size="sm"
                      onClick={() => onResolveIncident(inc.id)}
                    >
                      Resolve
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
