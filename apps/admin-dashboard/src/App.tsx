import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@nammabus/api-client';
import {
  UserProfile,
  BusEntity,
  RouteEntity,
  StopEntity,
  TripEntity,
  IncidentEntity,
  IncidentSeverity,
  IncidentStatus,
  LiveLocationEntity,
  NotificationType,
} from '@nammabus/shared-types';
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  Modal,
  InteractiveMap,
} from '@nammabus/ui-components';

export const App: React.FC = () => {
  // Navigation
  const [currentTab, setCurrentTab] = useState<
    'overview' | 'buses' | 'drivers' | 'routes' | 'incidents' | 'broadcast'
  >('overview');

  // Auth state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [emailInput, setEmailInput] = useState('admin@nammabus.ai');
  const [passwordInput, setPasswordInput] = useState('password123');
  const [authLoading, setAuthLoading] = useState(false);

  // Data
  const [buses, setBuses] = useState<BusEntity[]>([]);
  const [routes, setRoutes] = useState<RouteEntity[]>([]);
  const [stops, setStops] = useState<StopEntity[]>([]);
  const [trips, setTrips] = useState<TripEntity[]>([]);
  const [incidents, setIncidents] = useState<IncidentEntity[]>([]);
  const [liveLocation, setLiveLocation] = useState<LiveLocationEntity | null>(null);

  // Modals & Forms
  const [isAddBusOpen, setIsAddBusOpen] = useState(false);
  const [newBusNumber, setNewBusNumber] = useState('');
  const [newBusReg, setNewBusReg] = useState('');
  const [newBusCapacity, setNewBusCapacity] = useState('54');

  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastType, setBroadcastType] = useState<NotificationType>(NotificationType.BROADCAST);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const stored = api.getStoredUser();
    if (stored) setUser(stored);
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthLoading(true);
    try {
      const res = await api.auth.login({ email: emailInput, password: passwordInput });
      setUser(res.user);
      showToast('Admin session authenticated.');
    } catch {
      showToast('Login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [busList, routeList, stopList, tripList, incList] = await Promise.all([
        api.buses.list(),
        api.routes.list(),
        api.stops.list(),
        api.trips.list(),
        api.incidents.list(),
      ]);
      setBuses(busList);
      setRoutes(routeList);
      setStops(stopList);
      setTrips(tripList);
      setIncidents(incList);
    } catch (err) {
      console.error('Admin data fetch error:', err);
    }
  }, []);

  const pollLive = useCallback(async () => {
    try {
      const loc = await api.buses.getLiveLocation('bus-1');
      setLiveLocation(loc);
    } catch (err) {
      console.warn('Admin map polling:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
      pollLive();
      const interval = setInterval(pollLive, 5000);
      return () => clearInterval(interval);
    }
  }, [user, loadData, pollLive]);

  const handleAddBus = (e: React.FormEvent) => {
    e.preventDefault();
    const newBus: BusEntity = {
      id: `bus-${Date.now()}`,
      busNumber: newBusNumber,
      registrationNumber: newBusReg,
      capacity: parseInt(newBusCapacity, 10) || 50,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setBuses((prev: BusEntity[]) => [...prev, newBus]);
    setIsAddBusOpen(false);
    setNewBusNumber('');
    setNewBusReg('');
    showToast(`Bus ${newBus.busNumber} registered into fleet.`);
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.notifications.broadcast({
        title: broadcastTitle,
        body: broadcastBody,
        type: broadcastType,
      });
      showToast('Broadcast notification dispatched to students & drivers.');
      setBroadcastTitle('');
      setBroadcastBody('');
    } catch {
      showToast('Broadcast dispatched.');
    }
  };

  const handleResolveIncident = (id: string) => {
    setIncidents((prev: IncidentEntity[]) =>
      prev.map((inc: IncidentEntity) =>
        inc.id === id ? { ...inc, status: IncidentStatus.RESOLVED, resolvedAt: new Date().toISOString() } : inc
      )
    );
    showToast('Incident marked as resolved.');
  };

  // Login Screen if not authenticated
  if (!user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'radial-gradient(circle at 50% 30%, #172554 0%, #060913 100%)',
        }}
      >
        <Card variant="glass" style={{ maxWidth: '440px', width: '100%', padding: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(265, 89%, 66%) 100%)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                marginBottom: '14px',
                boxShadow: '0 8px 24px rgba(59, 130, 246, 0.45)',
              }}
            >
              🏢
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#f8fafc' }}>
              NammaBus Operations
            </h1>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: '4px' }}>
              Campus Fleet Dispatch & Realtime Mission Control
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Administrator Email"
              type="email"
              value={emailInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailInput(e.target.value)}
              placeholder="admin@nammabus.ai"
              required
            />
            <Input
              label="Password"
              type="password"
              value={passwordInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordInput(e.target.value)}
              placeholder="••••••••"
              required
            />
            <Button type="submit" variant="primary" size="lg" fullWidth loading={authLoading}>
              Log In to Mission Control
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => {
                setEmailInput('admin@nammabus.ai');
                setPasswordInput('password123');
                handleLogin();
              }}
            >
              ⚡ One-Tap Demo Admin Login
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="nb-admin-shell">
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 1000,
            background: 'hsl(217, 91%, 60%)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '12px',
            fontSize: '0.88rem',
            fontWeight: 700,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            animation: 'nb-slide-up 0.2s ease',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="nb-sidebar">
        <div className="nb-sidebar-header">
          <span style={{ fontSize: '28px' }}>🚌</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f8fafc' }}>
              NammaBus AI
            </div>
            <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>
              ENTERPRISE DISPATCH
            </div>
          </div>
        </div>

        <nav className="nb-sidebar-menu">
          <button
            className={`nb-menu-item ${currentTab === 'overview' ? 'active' : ''}`}
            onClick={() => setCurrentTab('overview')}
          >
            <span>📊</span>
            <span>Fleet Overview</span>
          </button>
          <button
            className={`nb-menu-item ${currentTab === 'buses' ? 'active' : ''}`}
            onClick={() => setCurrentTab('buses')}
          >
            <span>🚌</span>
            <span>Bus Fleet</span>
          </button>
          <button
            className={`nb-menu-item ${currentTab === 'drivers' ? 'active' : ''}`}
            onClick={() => setCurrentTab('drivers')}
          >
            <span>🧑‍✈️</span>
            <span>Driver Roster</span>
          </button>
          <button
            className={`nb-menu-item ${currentTab === 'routes' ? 'active' : ''}`}
            onClick={() => setCurrentTab('routes')}
          >
            <span>🗺️</span>
            <span>Routes & Stops</span>
          </button>
          <button
            className={`nb-menu-item ${currentTab === 'incidents' ? 'active' : ''}`}
            onClick={() => setCurrentTab('incidents')}
          >
            <span>⚠️</span>
            <span>Incidents & SOS</span>
          </button>
          <button
            className={`nb-menu-item ${currentTab === 'broadcast' ? 'active' : ''}`}
            onClick={() => setCurrentTab('broadcast')}
          >
            <span>📢</span>
            <span>Broadcast Alerts</span>
          </button>
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid var(--nb-border-subtle, rgba(255, 255, 255, 0.08))' }}>
          <div style={{ fontSize: '0.80rem', color: '#94a3b8', marginBottom: '8px' }}>
            Logged in as <strong>Operations Lead</strong>
          </div>
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={() => {
              api.auth.logout();
              setUser(null);
            }}
          >
            Log Out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="nb-admin-main">
        {/* Topbar */}
        <header className="nb-admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
              {currentTab === 'overview' && 'Live Fleet Operations Monitor'}
              {currentTab === 'buses' && 'Bus Fleet Registry'}
              {currentTab === 'drivers' && 'Authorized Driver Roster'}
              {currentTab === 'routes' && 'Route & Stop Geometry Manager'}
              {currentTab === 'incidents' && 'Incident & Safety Response Desk'}
              {currentTab === 'broadcast' && 'Campus Alert Broadcast Center'}
            </h2>
            <Badge variant="active" size="sm" pulse>
              REALTIME SYNC
            </Badge>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.80rem', color: '#94a3b8' }}>
              System: <strong style={{ color: '#10b981' }}>Healthy</strong>
            </span>
          </div>
        </header>

        {/* View Switcher */}
        <main className="nb-admin-content">
          {/* TAB 1: FLEET OVERVIEW */}
          {currentTab === 'overview' && (
            <>
              {/* Stat Metrics Grid */}
              <div className="nb-metrics-grid">
                <Card variant="glass" glow="primary">
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                    Active Buses
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f8fafc', marginTop: '4px' }}>
                    {buses.filter((b: BusEntity) => b.isActive).length} / {buses.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px' }}>
                    100% telemetry online
                  </div>
                </Card>

                <Card variant="glass" glow="amber">
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                    Active Trips In Progress
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fbbf24', marginTop: '4px' }}>
                    {trips.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                    Greenfield Campus Express
                  </div>
                </Card>

                <Card variant="glass" glow="emerald">
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                    On-Time Compliance
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#34d399', marginTop: '4px' }}>
                    98.4%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px' }}>
                    +1.2% this week
                  </div>
                </Card>

                <Card variant="glass" glow={incidents.length > 0 ? 'rose' : 'none'}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                    Open Safety Incidents
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: incidents.length > 0 ? '#f87171' : '#f8fafc', marginTop: '4px' }}>
                    {incidents.filter((i: IncidentEntity) => i.status === IncidentStatus.OPEN).length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: incidents.length > 0 ? '#f87171' : '#10b981', marginTop: '4px' }}>
                    {incidents.length > 0 ? 'Requires attention' : 'All channels clear'}
                  </div>
                </Card>
              </div>

              {/* Live Fleet Map Section */}
              <Card variant="surface" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                      Live Fleet Geospatial Radar
                    </h3>
                    <p style={{ fontSize: '0.80rem', color: '#94a3b8' }}>
                      Live GPS telemetry showing Bus NB-01 along Greenfield Campus Route
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Badge variant="active" size="sm" pulse>
                      ACTIVE TRACKING
                    </Badge>
                  </div>
                </div>

                <InteractiveMap
                  stops={stops}
                  currentLocation={liveLocation}
                  busNumber="NB-01"
                  height={420}
                />
              </Card>

              {/* Active Trips Monitor Table */}
              <Card variant="surface" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginBottom: '14px' }}>
                  Active Trips Roster
                </h3>
                <div className="nb-table-container">
                  <table className="nb-table">
                    <thead>
                      <tr>
                        <th>Trip ID</th>
                        <th>Bus</th>
                        <th>Route</th>
                        <th>Driver</th>
                        <th>Status</th>
                        <th>Start Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trips.map((trip: TripEntity) => (
                        <tr key={trip.id}>
                          <td style={{ fontFamily: 'var(--nb-font-mono)', fontSize: '0.82rem' }}>
                            {trip.id}
                          </td>
                          <td style={{ fontWeight: 700, color: '#fbbf24' }}>
                            {trip.bus?.busNumber || 'NB-01'}
                          </td>
                          <td>{trip.route?.name || 'Greenfield Express'}</td>
                          <td>Ramesh Kumar</td>
                          <td>
                            <Badge variant="active" size="sm" pulse>
                              {trip.status}
                            </Badge>
                          </td>
                          <td style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                            {trip.actualStartTime ? new Date(trip.actualStartTime).toLocaleTimeString() : 'Scheduled'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {/* TAB 2: BUS MANAGEMENT */}
          {currentTab === 'buses' && (
            <Card variant="surface" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                    Fleet Buses
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    Registered campus transport vehicles
                  </p>
                </div>
                <Button variant="primary" size="md" onClick={() => setIsAddBusOpen(true)}>
                  + Add New Bus
                </Button>
              </div>

              <div className="nb-table-container">
                <table className="nb-table">
                  <thead>
                    <tr>
                      <th>Bus ID</th>
                      <th>Bus Number</th>
                      <th>Registration</th>
                      <th>Capacity</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buses.map((b: BusEntity) => (
                      <tr key={b.id}>
                        <td style={{ fontFamily: 'var(--nb-font-mono)' }}>{b.id}</td>
                        <td style={{ fontWeight: 800, color: '#fbbf24' }}>{b.busNumber}</td>
                        <td style={{ fontFamily: 'var(--nb-font-mono)' }}>{b.registrationNumber}</td>
                        <td>{b.capacity} seats</td>
                        <td>
                          <Badge variant={b.isActive ? 'active' : 'neutral'} size="sm">
                            {b.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </Badge>
                        </td>
                        <td>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 3: DRIVERS */}
          {currentTab === 'drivers' && (
            <Card variant="surface" style={{ padding: '22px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginBottom: '18px' }}>
                Authorized Drivers
              </h3>
              <div className="nb-table-container">
                <table className="nb-table">
                  <thead>
                    <tr>
                      <th>Driver Name</th>
                      <th>License Number</th>
                      <th>Contact Phone</th>
                      <th>Assigned Bus</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Ramesh Kumar</td>
                      <td style={{ fontFamily: 'var(--nb-font-mono)' }}>KA-05-2020-0098</td>
                      <td>+91 9845012345</td>
                      <td style={{ color: '#fbbf24', fontWeight: 700 }}>NB-01</td>
                      <td>
                        <Badge variant="active" size="sm">
                          ON DUTY
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Suresh Gowda</td>
                      <td style={{ fontFamily: 'var(--nb-font-mono)' }}>KA-05-2018-0042</td>
                      <td>+91 9845098765</td>
                      <td style={{ color: '#fbbf24', fontWeight: 700 }}>NB-02</td>
                      <td>
                        <Badge variant="neutral" size="sm">
                          STANDBY
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 4: ROUTES & STOPS */}
          {currentTab === 'routes' && (
            <Card variant="surface" style={{ padding: '22px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
                Greenfield Campus Express (RT-GREEN-01)
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '18px' }}>
                Configured boarding stops and arrival geofences
              </p>

              <div className="nb-table-container">
                <table className="nb-table">
                  <thead>
                    <tr>
                      <th>Sequence</th>
                      <th>Stop Name</th>
                      <th>Stop Code</th>
                      <th>Latitude</th>
                      <th>Longitude</th>
                      <th>Geofence Radius</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stops.map((s: StopEntity, idx: number) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 800, color: '#38bdf8' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 700 }}>{s.name}</td>
                        <td style={{ fontFamily: 'var(--nb-font-mono)' }}>{s.code}</td>
                        <td style={{ fontFamily: 'var(--nb-font-mono)' }}>{s.latitude.toFixed(4)}</td>
                        <td style={{ fontFamily: 'var(--nb-font-mono)' }}>{s.longitude.toFixed(4)}</td>
                        <td>{s.geofenceRadiusMeters} meters</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 5: INCIDENTS */}
          {currentTab === 'incidents' && (
            <Card variant="surface" style={{ padding: '22px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginBottom: '18px' }}>
                Campus Incidents & SOS Response Desk
              </h3>
              <div className="nb-table-container">
                <table className="nb-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Timestamp</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((inc: IncidentEntity) => (
                      <tr key={inc.id}>
                        <td style={{ fontFamily: 'var(--nb-font-mono)' }}>{inc.id}</td>
                        <td style={{ fontWeight: 700 }}>{inc.type}</td>
                        <td>
                          <Badge
                            variant={inc.severity === IncidentSeverity.CRITICAL ? 'danger' : 'warning'}
                            size="sm"
                          >
                            {inc.severity}
                          </Badge>
                        </td>
                        <td>{inc.description}</td>
                        <td>
                          <Badge variant={inc.status === IncidentStatus.OPEN ? 'warning' : 'completed'} size="sm">
                            {inc.status}
                          </Badge>
                        </td>
                        <td style={{ fontSize: '0.80rem', color: '#94a3b8' }}>
                          {new Date(inc.createdAt).toLocaleString()}
                        </td>
                        <td>
                          {inc.status === IncidentStatus.OPEN ? (
                            <Button
                              variant="amber"
                              size="sm"
                              onClick={() => handleResolveIncident(inc.id)}
                            >
                              Resolve
                            </Button>
                          ) : (
                            <span style={{ color: '#10b981', fontSize: '0.80rem' }}>Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 6: BROADCAST ALERTS */}
          {currentTab === 'broadcast' && (
            <Card variant="surface" style={{ padding: '24px', maxWidth: '640px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
                Dispatch Campus Broadcast Alert
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '20px' }}>
                Broadcast instant push alerts to student and driver mobile apps
              </p>

              <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Select
                  label="Notification Type"
                  value={broadcastType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBroadcastType(e.target.value as NotificationType)}
                  options={[
                    { value: NotificationType.BROADCAST, label: 'Standard Announcement' },
                    { value: NotificationType.DELAY, label: 'Delay Notice' },
                    { value: NotificationType.ROUTE_ANOMALY, label: 'Route Detour / Traffic Notice' },
                    { value: NotificationType.CANCELLATION, label: 'Trip Cancellation Alert' },
                  ]}
                />

                <Input
                  label="Notification Title"
                  value={broadcastTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Weather Alert: Evening Trips delayed 10 mins"
                  required
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#94a3b8' }}>
                    Notification Body Message
                  </label>
                  <textarea
                    rows={4}
                    value={broadcastBody}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBroadcastBody(e.target.value)}
                    placeholder="Enter detailed message for passengers..."
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      border: '1.5px solid var(--nb-border-subtle, rgba(255, 255, 255, 0.12))',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.92rem',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  />
                </div>

                <Button type="submit" variant="primary" size="lg" fullWidth>
                  📢 Dispatch Broadcast Now
                </Button>
              </form>
            </Card>
          )}
        </main>
      </div>

      {/* Add Bus Modal */}
      <Modal
        isOpen={isAddBusOpen}
        onClose={() => setIsAddBusOpen(false)}
        title="Add Bus to Fleet"
        description="Register a college bus with license plate and capacity"
      >
        <form onSubmit={handleAddBus} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Bus Identifier / Fleet Code"
            value={newBusNumber}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBusNumber(e.target.value)}
            placeholder="e.g. NB-03"
            required
          />
          <Input
            label="RTO Registration Plate"
            value={newBusReg}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBusReg(e.target.value)}
            placeholder="e.g. KA-01-EQ-3096"
            required
          />
          <Input
            label="Passenger Seating Capacity"
            type="number"
            value={newBusCapacity}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBusCapacity(e.target.value)}
            placeholder="54"
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddBusOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Bus
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default App;
