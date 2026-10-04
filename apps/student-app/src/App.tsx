import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@nammabus/api-client';
import {
  UserProfile,
  BusEntity,
  RouteEntity,
  StopEntity,
  LiveLocationEntity,
  TripEtaResponse,
  NotificationEntity,
} from '@nammabus/shared-types';
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  InteractiveMap,
  EtaTicker,
  EmptyState,
} from '@nammabus/ui-components';
import { StudentHeader } from './components/StudentHeader';
import { StopProgressionList } from './components/StopProgressionList';
import { NotificationsModal } from './components/NotificationsModal';
import { ProfileModal } from './components/ProfileModal';

export const App: React.FC = () => {
  // Auth state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [emailInput, setEmailInput] = useState('student@nammabus.ai');
  const [passwordInput, setPasswordInput] = useState('password123');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // App domain state
  const [buses, setBuses] = useState<BusEntity[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>('bus-1');
  const [routes, setRoutes] = useState<RouteEntity[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-1');
  const [stops, setStops] = useState<StopEntity[]>([]);
  const [selectedStopId, setSelectedStopId] = useState<string>('stop-3');
  const [liveLocation, setLiveLocation] = useState<LiveLocationEntity | null>(null);
  const [etaData, setEtaData] = useState<TripEtaResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationEntity[]>([]);
  const [alertEnabled, setAlertEnabled] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState<'track' | 'schedule' | 'alerts'>('track');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Check existing login
  useEffect(() => {
    const stored = api.getStoredUser();
    if (stored) {
      setUser(stored);
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await api.auth.login({ email: emailInput, password: passwordInput });
      setUser(res.user);
      showToast('Welcome back, ' + (res.user.student?.name || 'Student') + '!');
    } catch (err: unknown) {
      setAuthError((err as Error).message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.auth.logout();
    setUser(null);
    setIsProfileOpen(false);
  };

  // Fetch initial transport data
  const loadData = useCallback(async () => {
    try {
      const [busList, routeList, stopList, notifList] = await Promise.all([
        api.buses.list(),
        api.routes.list(),
        api.stops.list(),
        api.notifications.list(),
      ]);
      setBuses(busList);
      setRoutes(routeList);
      setStops(stopList);
      setNotifications(notifList);

      if (busList.length > 0 && !selectedBusId) setSelectedBusId(busList[0].id);
      if (routeList.length > 0 && !selectedRouteId) setSelectedRouteId(routeList[0].id);
      if (stopList.length > 0 && !selectedStopId) setSelectedStopId(stopList[2]?.id || stopList[0].id);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }, [selectedBusId, selectedRouteId, selectedStopId]);

  // Live polling for GPS location & ETA (every 5 seconds)
  const pollLive = useCallback(async () => {
    if (!selectedBusId) return;
    try {
      const [loc, eta] = await Promise.all([
        api.buses.getLiveLocation(selectedBusId),
        api.trips.getEta('trip-1'),
      ]);
      setLiveLocation(loc);
      setEtaData(eta);
    } catch (err) {
      console.warn('Live location polling error:', err);
    }
  }, [selectedBusId]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, loadData]);

  useEffect(() => {
    if (!user) return;
    pollLive();
    const interval = setInterval(pollLive, 5000);
    return () => clearInterval(interval);
  }, [user, pollLive]);

  // Selected stop ETA info
  const selectedStopEta = etaData?.stops.find((s) => s.stopId === selectedStopId);
  const currentBus = buses.find((b) => b.id === selectedBusId);

  // If not logged in, render Student Login
  if (!user) {
    return (
      <div className="nb-mobile-shell" style={{ justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.45)',
              marginBottom: '16px',
            }}
          >
            🚌
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            NammaBus AI
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginTop: '4px' }}>
            Smart Student Bus Tracking & Arrival Alerts
          </p>
        </div>

        <Card variant="glass" style={{ padding: '24px' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
              Student Sign In
            </h2>

            {authError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#f87171',
                  fontSize: '0.82rem',
                }}
              >
                {authError}
              </div>
            )}

            <Input
              label="College Email or USN"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="e.g. prem.student@nammabus.ai"
              required
            />

            <Input
              label="Password"
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button type="submit" variant="primary" size="lg" fullWidth loading={authLoading}>
              Sign In to Track Bus
            </Button>

            <div style={{ textAlign: 'center', margin: '8px 0' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>— OR DEMO ACCESS —</span>
            </div>

            <Button
              type="button"
              variant="amber"
              size="md"
              fullWidth
              onClick={() => {
                setEmailInput('student@nammabus.ai');
                setPasswordInput('password123');
                handleLogin();
              }}
            >
              ⚡ One-Tap Demo Student Login
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="nb-mobile-shell">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: '74px',
            left: '16px',
            right: '16px',
            zIndex: 100,
            background: 'hsl(217, 91%, 60%)',
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: '12px',
            fontSize: '0.84rem',
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            textAlign: 'center',
            animation: 'nb-slide-up 0.2s ease',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <StudentHeader
        user={user}
        unreadCount={notifications.filter((n) => !n.isRead).length}
        onOpenNotifications={() => setIsNotifOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main Content Area */}
      <main className="nb-content">
        {/* Route & Bus Selector Card */}
        <Card variant="surface" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Selected Route"
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              options={routes.map((r) => ({ value: r.id, label: r.name }))}
            />
            <Select
              label="Bus Fleet ID"
              value={selectedBusId}
              onChange={(e) => setSelectedBusId(e.target.value)}
              options={buses.map((b) => ({ value: b.id, label: `${b.busNumber} (${b.capacity} seats)` }))}
            />
          </div>
        </Card>

        {activeTab === 'track' && (
          <>
            {/* ETA Countdown Ticker */}
            <EtaTicker
              stopName={selectedStopEta?.stopName || 'Engineering Annex'}
              estimatedMinutes={selectedStopEta?.estimatedMinutes ?? 8}
              distanceRemainingMeters={selectedStopEta?.distanceRemainingMeters ?? 1400}
              delayMinutes={etaData?.currentDelayMinutes ?? 0}
              status={selectedStopEta?.status || 'NEXT'}
              busNumber={currentBus?.busNumber || 'NB-01'}
              isLive={true}
            />

            {/* Live Interactive Map */}
            <InteractiveMap
              stops={stops}
              currentLocation={liveLocation}
              selectedStopId={selectedStopId}
              busNumber={currentBus?.busNumber || 'NB-01'}
              isTrackingActive={true}
              onStopSelect={(stop) => {
                setSelectedStopId(stop.id);
                showToast(`Target boarding stop set to ${stop.name}`);
              }}
              height={320}
            />

            {/* 10-Minute Alert Subscription Banner */}
            <Card
              variant="bordered"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>⏰</span>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc' }}>
                    10-Min Arrival Alarm
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Auto-alert before bus reaches your stop
                  </div>
                </div>
              </div>
              <Button
                variant={alertEnabled ? 'amber' : 'outline'}
                size="sm"
                onClick={() => {
                  setAlertEnabled(!alertEnabled);
                  showToast(alertEnabled ? 'Alert disabled' : '10-minute alert activated!');
                }}
              >
                {alertEnabled ? '🔔 ACTIVE' : 'SET ALARM'}
              </Button>
            </Card>

            {/* Stop Progression Timeline */}
            <StopProgressionList
              stops={etaData?.stops || []}
              selectedStopId={selectedStopId}
              onSelectStop={(id) => {
                setSelectedStopId(id);
                showToast('Target stop updated');
              }}
            />
          </>
        )}

        {activeTab === 'schedule' && (
          <Card variant="surface" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginBottom: '14px' }}>
              Greenfield Campus Express Timetable
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <span style={{ fontWeight: 600 }}>Morning Trip 1</span>
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>07:45 AM - 08:30 AM</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)' }}>
                <span style={{ fontWeight: 700 }}>Morning Trip 2 (Active Now)</span>
                <span style={{ color: '#fbbf24', fontWeight: 700 }}>08:45 AM - 09:30 AM</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <span style={{ fontWeight: 600 }}>Evening Return Trip</span>
                <span style={{ color: '#94a3b8' }}>04:45 PM - 05:30 PM</span>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'alerts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
              Recent Trip Alerts
            </h3>
            {notifications.map((n) => (
              <Card key={n.id} variant="glass" style={{ padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Badge variant="scheduled" size="sm">{n.type}</Badge>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>{n.title}</h4>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>{n.body}</p>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="nb-bottom-nav">
        <button
          className={`nb-nav-btn ${activeTab === 'track' ? 'active' : ''}`}
          onClick={() => setActiveTab('track')}
        >
          <span className="nb-nav-icon">📍</span>
          <span>Live Map</span>
        </button>
        <button
          className={`nb-nav-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          <span className="nb-nav-icon">📅</span>
          <span>Schedule</span>
        </button>
        <button
          className={`nb-nav-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <span className="nb-nav-icon">🔔</span>
          <span>Alerts</span>
        </button>
      </nav>

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        onMarkAllRead={() => {
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
          showToast('All notifications marked as read');
        }}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default App;
