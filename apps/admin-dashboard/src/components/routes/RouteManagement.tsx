import React, { useState } from 'react';
import { Card, Badge, Button, Input, Modal } from '@nammabus/ui-components';
import { PageHeader } from '../common/PageHeader';
import { RouteEntity, StopEntity } from '@nammabus/shared-types';

interface RouteManagementProps {
  routes: RouteEntity[];
  stops: StopEntity[];
  onAddRoute: (data: { name: string; code: string; description?: string }) => Promise<unknown>;
  onAddStop: (data: {
    name: string;
    code: string;
    latitude: number;
    longitude: number;
    geofenceRadiusMeters: number;
  }) => Promise<unknown>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const RouteManagement: React.FC<RouteManagementProps> = ({
  routes,
  stops,
  onAddRoute,
  onAddStop,
  showToast,
}) => {
  const [isAddRouteOpen, setIsAddRouteOpen] = useState(false);
  const [isAddStopOpen, setIsAddStopOpen] = useState(false);

  // Route form
  const [routeName, setRouteName] = useState('');
  const [routeCode, setRouteCode] = useState('');
  const [routeDesc, setRouteDesc] = useState('');

  // Stop form
  const [stopName, setStopName] = useState('');
  const [stopCode, setStopCode] = useState('');
  const [latitude, setLatitude] = useState('12.9750');
  const [longitude, setLongitude] = useState('77.6000');
  const [radius, setRadius] = useState('50');

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeRoute = routes[0] || {
    id: 'route-1',
    name: 'Greenfield Campus Express',
    code: 'RT-GREEN-01',
    description: 'Direct express route connecting student hostels to Main Academic Complex',
    isActive: true,
  };

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!routeName.trim()) {
      setFormError('Route name is required.');
      return;
    }
    if (!routeCode.trim()) {
      setFormError('Route code (e.g. RT-NORTH-02) is required.');
      return;
    }

    try {
      setSubmitting(true);
      await onAddRoute({
        name: routeName.trim(),
        code: routeCode.trim().toUpperCase(),
        description: routeDesc.trim(),
      });
      setIsAddRouteOpen(false);
      showToast(`Route ${routeCode.toUpperCase()} configured.`);
    } catch {
      showToast('Failed to create route.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveStop = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseInt(radius, 10);

    if (!stopName.trim()) {
      setFormError('Stop name is required.');
      return;
    }
    if (!stopCode.trim()) {
      setFormError('Stop code (e.g. STP-LIB) is required.');
      return;
    }
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setFormError('Latitude must be a valid coordinate between -90 and 90.');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setFormError('Longitude must be a valid coordinate between -180 and 180.');
      return;
    }
    if (isNaN(rad) || rad < 10 || rad > 500) {
      setFormError('Geofence radius must be between 10m and 500m.');
      return;
    }

    try {
      setSubmitting(true);
      await onAddStop({
        name: stopName.trim(),
        code: stopCode.trim().toUpperCase(),
        latitude: lat,
        longitude: lng,
        geofenceRadiusMeters: rad,
      });
      setIsAddStopOpen(false);
      showToast(`Stop ${stopName} registered with ${rad}m geofence.`);
    } catch {
      showToast('Failed to register stop.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Routes & Sequential Stops Manager"
        description="Configure college transit corridors, stop ordering, and GPS arrival geofences"
        badge={
          <Badge variant="active" size="sm">
            {routes.length} ROUTE{routes.length > 1 ? 'S' : ''} • {stops.length} STOPS
          </Badge>
        }
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" size="sm" onClick={() => setIsAddStopOpen(true)}>
              + Add Boarding Stop
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsAddRouteOpen(true)}>
              + Create New Route
            </Button>
          </div>
        }
      />

      {/* Visual Workflow: Route -> Stops -> Bus -> Trip */}
      <Card variant="surface" style={{ padding: '18px 24px' }}>
        <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>
          Transport Architecture Relationship Model
        </div>
        <div className="nb-flow-steps">
          <div className="nb-flow-step">
            <span className="nb-step-badge">1</span>
            <div>
              <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.92rem' }}>
                Route Corridor
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                {activeRoute.code} ({activeRoute.name})
              </div>
            </div>
          </div>

          <div className="nb-flow-arrow">→</div>

          <div className="nb-flow-step">
            <span className="nb-step-badge">2</span>
            <div>
              <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.92rem' }}>
                Sequential Stops
              </div>
              <div style={{ fontSize: '0.78rem', color: '#38bdf8' }}>
                {stops.length} Geofenced Waypoints
              </div>
            </div>
          </div>

          <div className="nb-flow-arrow">→</div>

          <div className="nb-flow-step">
            <span className="nb-step-badge">3</span>
            <div>
              <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.92rem' }}>
                Assigned Bus
              </div>
              <div style={{ fontSize: '0.78rem', color: '#fbbf24' }}>
                NB-01 (54 Passenger Seats)
              </div>
            </div>
          </div>

          <div className="nb-flow-arrow">→</div>

          <div className="nb-flow-step">
            <span className="nb-step-badge">4</span>
            <div>
              <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.92rem' }}>
                Live Transit Trip
              </div>
              <div style={{ fontSize: '0.78rem', color: '#10b981' }}>
                Active Driver Telemetry
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Route Detail Card */}
      <Card variant="surface" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                {activeRoute.name}
              </h3>
              <Badge variant="active" size="sm">
                PRIMARY ROUTE
              </Badge>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: '4px' }}>
              {activeRoute.description || 'Hostel to Academic Corridor'}
            </p>
          </div>
          <span style={{ fontFamily: 'var(--nb-font-mono)', color: '#38bdf8', fontWeight: 700 }}>
            {activeRoute.code}
          </span>
        </div>

        {/* Stops Sequence Table */}
        <div className="nb-table-container">
          <table className="nb-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Seq #</th>
                <th>Stop Name</th>
                <th>Stop Code</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Geofence Radius</th>
                <th>Est. Offset</th>
              </tr>
            </thead>
            <tbody>
              {stops.map((stop, idx) => (
                <tr key={stop.id}>
                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        color: '#60a5fa',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                      }}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{stop.name}</td>
                  <td style={{ fontFamily: 'var(--nb-font-mono)', fontSize: '0.84rem' }}>
                    {stop.code}
                  </td>
                  <td style={{ fontFamily: 'var(--nb-font-mono)', fontSize: '0.84rem' }}>
                    {stop.latitude.toFixed(5)}
                  </td>
                  <td style={{ fontFamily: 'var(--nb-font-mono)', fontSize: '0.84rem' }}>
                    {stop.longitude.toFixed(5)}
                  </td>
                  <td>
                    <Badge variant="neutral" size="sm">
                      {stop.geofenceRadiusMeters} meters
                    </Badge>
                  </td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>
                    +{idx * 6} mins
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Route Modal */}
      <Modal
        isOpen={isAddRouteOpen}
        onClose={() => setIsAddRouteOpen(false)}
        title="Configure New Bus Route"
        description="Establish a named transit corridor for college bus schedules"
      >
        <form onSubmit={handleSaveRoute} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {formError && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                borderRadius: '8px',
                color: '#fca5a5',
                fontSize: '0.82rem',
              }}
            >
              ⚠️ {formError}
            </div>
          )}

          <Input
            label="Route Name"
            placeholder="e.g. North Hostel Express"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            required
          />

          <Input
            label="Route Code"
            placeholder="e.g. RT-NORTH-02"
            value={routeCode}
            onChange={(e) => setRouteCode(e.target.value)}
            required
          />

          <Input
            label="Route Description"
            placeholder="e.g. Direct pickup from North Campus Hostels to Lab Block"
            value={routeDesc}
            onChange={(e) => setRouteDesc(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddRouteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              Create Route
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Stop Modal */}
      <Modal
        isOpen={isAddStopOpen}
        onClose={() => setIsAddStopOpen(false)}
        title="Register Geofenced Bus Stop"
        description="Coordinates define the arrival trigger zone for student notifications"
      >
        <form onSubmit={handleSaveStop} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {formError && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                borderRadius: '8px',
                color: '#fca5a5',
                fontSize: '0.82rem',
              }}
            >
              ⚠️ {formError}
            </div>
          )}

          <Input
            label="Stop Name"
            placeholder="e.g. Mechanical Workshop Circle"
            value={stopName}
            onChange={(e) => setStopName(e.target.value)}
            required
          />

          <Input
            label="Stop Code"
            placeholder="e.g. STP-MECH"
            value={stopCode}
            onChange={(e) => setStopCode(e.target.value)}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Latitude"
              placeholder="12.9750"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              required
            />
            <Input
              label="Longitude"
              placeholder="77.6000"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              required
            />
          </div>

          <Input
            label="Arrival Geofence Radius (Meters)"
            type="number"
            placeholder="50"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddStopOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              Register Stop
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
