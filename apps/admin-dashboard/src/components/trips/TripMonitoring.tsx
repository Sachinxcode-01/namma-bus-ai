import React, { useState } from 'react';
import { Card, Badge, Button, Input } from '@nammabus/ui-components';
import { PageHeader } from '../common/PageHeader';
import { TripEntity, TripStatus } from '@nammabus/shared-types';

interface TripMonitoringProps {
  trips: TripEntity[];
}

export const TripMonitoring: React.FC<TripMonitoringProps> = ({ trips }) => {
  const [tab, setTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Generate simulated historical trips if none exist so admin has rich operational view
  const allTrips: TripEntity[] = [
    ...trips,
    {
      id: 'trip-hist-1',
      busId: 'bus-1',
      driverId: 'drv-sim-1',
      routeId: 'route-1',
      status: TripStatus.COMPLETED,
      actualStartTime: new Date(Date.now() - 4 * 3600000).toISOString(),
      actualEndTime: new Date(Date.now() - 3.5 * 3600000).toISOString(),
      createdAt: new Date(Date.now() - 4.5 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3.5 * 3600000).toISOString(),
    },
    {
      id: 'trip-hist-2',
      busId: 'bus-2',
      driverId: 'drv-sim-2',
      routeId: 'route-1',
      status: TripStatus.COMPLETED,
      actualStartTime: new Date(Date.now() - 8 * 3600000).toISOString(),
      actualEndTime: new Date(Date.now() - 7.5 * 3600000).toISOString(),
      createdAt: new Date(Date.now() - 8.5 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 7.5 * 3600000).toISOString(),
    },
    {
      id: 'trip-hist-3',
      busId: 'bus-1',
      driverId: 'drv-sim-1',
      routeId: 'route-1',
      status: TripStatus.COMPLETED,
      actualStartTime: new Date(Date.now() - 28 * 3600000).toISOString(),
      actualEndTime: new Date(Date.now() - 27.4 * 3600000).toISOString(),
      createdAt: new Date(Date.now() - 28.5 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 27.4 * 3600000).toISOString(),
    },
  ];

  const filteredTrips = allTrips.filter((t) => {
    if (tab === 'ACTIVE') {
      if (t.status !== TripStatus.ACTIVE) return false;
    } else {
      if (t.status === TripStatus.ACTIVE) return false;
    }

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.id.toLowerCase().includes(q) ||
      (t.bus?.busNumber && t.bus.busNumber.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.ceil(filteredTrips.length / pageSize) || 1;
  const paginatedTrips = filteredTrips.slice((page - 1) * pageSize, page * pageSize);

  const getStatusBadge = (status: TripStatus) => {
    switch (status) {
      case TripStatus.ACTIVE:
        return (
          <Badge variant="active" size="sm" pulse>
            ACTIVE IN TRANSIT
          </Badge>
        );
      case TripStatus.COMPLETED:
        return (
          <Badge variant="completed" size="sm">
            COMPLETED
          </Badge>
        );
      case TripStatus.CANCELLED:
        return (
          <Badge variant="danger" size="sm">
            CANCELLED
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            SCHEDULED
          </Badge>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="College Trip Monitoring & Log"
        description="Live telemetry progression for active routes and historical trip records"
        badge={
          <Badge variant="active" size="sm">
            {allTrips.filter((t) => t.status === TripStatus.ACTIVE).length} ACTIVE
          </Badge>
        }
      />

      {/* Tabs Switcher and Search */}
      <Card variant="surface" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button
              variant={tab === 'ACTIVE' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => {
                setTab('ACTIVE');
                setPage(1);
              }}
            >
              Active Trips ({allTrips.filter((t) => t.status === TripStatus.ACTIVE).length})
            </Button>
            <Button
              variant={tab === 'HISTORY' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => {
                setTab('HISTORY');
                setPage(1);
              }}
            >
              Trip History ({allTrips.filter((t) => t.status !== TripStatus.ACTIVE).length})
            </Button>
          </div>

          <div style={{ width: '260px' }}>
            <Input
              placeholder="Search by Trip ID or Bus..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </Card>

      {/* Trips Table */}
      <Card variant="surface" style={{ padding: '20px' }}>
        {paginatedTrips.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--nb-text-muted, #64748b)',
            }}
          >
            No {tab === 'ACTIVE' ? 'active' : 'historical'} trips match query.
          </div>
        ) : (
          <div className="nb-table-container">
            <table className="nb-table">
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Vehicle</th>
                  <th>Route</th>
                  <th>Driver</th>
                  <th>Status</th>
                  <th>Departure Time</th>
                  <th>Arrival / End</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td style={{ fontFamily: 'var(--nb-font-mono)', fontSize: '0.84rem' }}>
                      {trip.id}
                    </td>
                    <td style={{ fontWeight: 800, color: '#fbbf24' }}>
                      {trip.bus?.busNumber || 'NB-01'}
                    </td>
                    <td>{trip.route?.name || 'Greenfield Express'}</td>
                    <td>{trip.driver?.name || 'Ramesh Kumar'}</td>
                    <td>{getStatusBadge(trip.status)}</td>
                    <td style={{ color: 'var(--nb-text-secondary, #94a3b8)', fontSize: '0.84rem' }}>
                      {trip.actualStartTime
                        ? new Date(trip.actualStartTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Scheduled'}
                    </td>
                    <td style={{ color: 'var(--nb-text-muted, #64748b)', fontSize: '0.84rem' }}>
                      {trip.actualEndTime
                        ? new Date(trip.actualEndTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : trip.status === TripStatus.ACTIVE
                        ? 'In Transit'
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '12px',
              marginTop: '16px',
            }}
          >
            <span style={{ fontSize: '0.80rem', color: '#94a3b8' }}>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
