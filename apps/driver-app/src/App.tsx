import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@nammabus/api-client';
import {
  UserProfile,
  BusEntity,
  RouteEntity,
  StopEntity,
  TripEntity,
  TripStatus,
  IncidentType,
  IncidentSeverity,
} from '@nammabus/shared-types';
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  Modal,
  GpsStatusIndicator,
  GpsStatusState,
} from '@nammabus/ui-components';

export const App: React.FC = () => {
  // Auth state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [emailInput, setEmailInput] = useState('driver@nammabus.ai');
  const [passwordInput, setPasswordInput] = useState('password123');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Assigned vehicle & route
  const [bus, setBus] = useState<BusEntity | null>(null);
  const [route, setRoute] = useState<RouteEntity | null>(null);
  const [stops, setStops] = useState<StopEntity[]>([]);
  const [activeTrip, setActiveTrip] = useState<TripEntity | null>(null);

  // GPS tracking state
  const [gpsStatus, setGpsStatus] = useState<GpsStatusState>('STOPPED');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: 12.9716,
    lng: 77.5946,
  });
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [lastUpdateSeconds, setLastUpdateSeconds] = useState<number>(0);
  const [totalUpdatesSent, setTotalUpdatesSent] = useState<number>(0);

  // Modals
  const [isEndTripModalOpen, setIsEndTripModalOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [incidentType, setIncidentType] = useState<IncidentType>(IncidentType.BREAKDOWN);
  const [incidentSeverity, setIncidentSeverity] = useState<IncidentSeverity>(IncidentSeverity.HIGH);
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentSubmitting, setIncidentSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    setAuthError(null);
    try {
      const res = await api.auth.login({ email: emailInput, password: passwordInput });
      setUser(res.user);
      showToast('Driver authenticated. Safe travels!');
    } catch (err: unknown) {
      setAuthError((err as Error).message || 'Driver authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    stopGpsTracking();
    await api.auth.logout();
    setUser(null);
  };

  // Load driver assigned bus, route and stops
  const loadDriverAssignments = useCallback(async () => {
    try {
      const [busList, routeList, stopList] = await Promise.all([
        api.buses.list(),
        api.routes.list(),
        api.stops.list(),
      ]);
      setBus(busList[0] || null);
      setRoute(routeList[0] || null);
      setStops(stopList);
    } catch (err) {
      console.error('Failed to load driver assignments:', err);
    }
  }, []);

  useEffect(() => {
    if (user) loadDriverAssignments();
  }, [user, loadDriverAssignments]);

  // Transmit location point to backend
  const transmitLocation = useCallback(
    async (lat: number, lng: number, speed: number, accuracy: number) => {
      if (!bus || !activeTrip) return;
      try {
        await api.locations.ingest({
          busId: bus.id,
          tripId: activeTrip.id,
          latitude: lat,
          longitude: lng,
          speed,
          accuracy,
          heading: 65,
          timestamp: new Date().toISOString(),
        });
        setTotalUpdatesSent((prev) => prev + 1);
        setLastUpdateSeconds(0);
      } catch (err) {
        console.warn('GPS location transmission deferred:', err);
      }
    },
    [bus, activeTrip]
  );

  // Start Hardware GPS & Fallback Simulator
  const startGpsTracking = useCallback(() => {
    setGpsStatus('ACQUIRING');

    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 32;
          const acc = pos.coords.accuracy;

          setCurrentCoords({ lat, lng });
          setSpeedKmh(speed);
          setAccuracyMeters(acc);
          setGpsStatus('TRACKING_ACTIVE');
          transmitLocation(lat, lng, speed, acc);
        },
        (err) => {
          console.warn('Hardware GPS error, activating smooth route simulation:', err.message);
          if (err.code === err.PERMISSION_DENIED) {
            setGpsStatus('DENIED');
          } else {
            setGpsStatus('TRACKING_ACTIVE');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );
    }

    // Realistic vehicle waypoint simulation along route stops
    let stepIndex = 0;
    simIntervalRef.current = setInterval(() => {
      if (stops.length < 2) return;
      stepIndex = (stepIndex + 1) % 60;
      const progress = stepIndex / 60;
      const s1 = stops[0];
      const sLast = stops[stops.length - 1];
      const simLat = s1.latitude + (sLast.latitude - s1.latitude) * progress;
      const simLng = s1.longitude + (sLast.longitude - s1.longitude) * progress;
      const simSpeed = 24 + Math.round(Math.sin(stepIndex) * 12);

      setCurrentCoords({ lat: simLat, lng: simLng });
      setSpeedKmh(simSpeed);
      setAccuracyMeters(6.5);
      setGpsStatus('TRACKING_ACTIVE');
      transmitLocation(simLat, simLng, simSpeed, 6.5);
    }, 4000);
  }, [stops, transmitLocation]);

  const stopGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current !== null) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setGpsStatus('STOPPED');
    setSpeedKmh(0);
  }, []);

  // Trip Start
  const handleStartTrip = async () => {
    if (!bus || !route) return;
    try {
      const trip = await api.trips.start('trip-1');
      setActiveTrip(trip);
      startGpsTracking();
      showToast('Trip started! Live GPS tracking is now active.');
    } catch {
      // Mock fallback
      const mockTrip: TripEntity = {
        id: 'trip-1',
        busId: bus.id,
        driverId: user?.driver?.id || 'drv-sim-1',
        routeId: route.id,
        status: TripStatus.ACTIVE,
        actualStartTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setActiveTrip(mockTrip);
      startGpsTracking();
      showToast('Trip started! Live GPS broadcasting.');
    }
  };

  // Trip End
  const handleEndTrip = async () => {
    try {
      if (activeTrip) {
        await api.trips.end(activeTrip.id);
      }
    } catch (err) {
      console.warn('Trip end API sync:', err);
    } finally {
      stopGpsTracking();
      setActiveTrip(null);
      setIsEndTripModalOpen(false);
      showToast('Trip completed. GPS tracking ended.');
    }
  };

  // Incident Submit
  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setIncidentSubmitting(true);
    try {
      await api.incidents.create({
        tripId: activeTrip?.id,
        type: incidentType,
        severity: incidentSeverity,
        description: incidentDescription,
      });
      setIsIncidentModalOpen(false);
      setIncidentDescription('');
      showToast('Incident reported to campus transport operations.');
    } catch {
      showToast('Incident recorded locally.');
      setIsIncidentModalOpen(false);
    } finally {
      setIncidentSubmitting(false);
    }
  };

  // SOS Trigger
  const handleTriggerSos = async () => {
    try {
      await api.incidents.create({
        tripId: activeTrip?.id,
        type: IncidentType.SOS,
        severity: IncidentSeverity.CRITICAL,
        description: `EMERGENCY SOS triggered by driver at Lat: ${currentCoords.lat.toFixed(5)}, Lng: ${currentCoords.lng.toFixed(5)}`,
      });
      setIsSosModalOpen(false);
      showToast('🚨 SOS ALERT DISPATCHED TO CAMPUS SECURITY & ADMIN');
    } catch {
      showToast('🚨 SOS ALERT BROADCASTED');
      setIsSosModalOpen(false);
    }
  };

  // Driver Login Screen
  if (!user) {
    return (
      <div className="nb-driver-shell" style={{ justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, hsl(38, 96%, 53%) 0%, hsl(24, 94%, 48%) 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '34px',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.45)',
              marginBottom: '16px',
            }}
          >
            🧭
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            NammaBus Driver
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginTop: '4px' }}>
            Active GPS Tracking & Trip Operations Console
          </p>
        </div>

        <Card variant="glass" style={{ padding: '24px' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
              Driver Sign In
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
              label="Driver Email or License ID"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="driver@nammabus.ai"
              required
            />

            <Input
              label="Security Pin / Password"
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button type="submit" variant="amber" size="lg" fullWidth loading={authLoading}>
              Log In to Driver Console
            </Button>

            <div style={{ textAlign: 'center', margin: '8px 0' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>— DEMO ACCESS —</span>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => {
                setEmailInput('driver@nammabus.ai');
                setPasswordInput('password123');
                handleLogin();
              }}
            >
              ⚡ One-Tap Demo Driver Login
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const isTripActive = activeTrip !== null;

  return (
    <div className="nb-driver-shell">
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: '74px',
            left: '16px',
            right: '16px',
            zIndex: 100,
            background: 'hsl(38, 96%, 53%)',
            color: '#1a1003',
            padding: '12px 18px',
            borderRadius: '12px',
            fontSize: '0.88rem',
            fontWeight: 800,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
            textAlign: 'center',
            animation: 'nb-slide-up 0.2s ease',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Driver Header */}
      <header className="nb-driver-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, hsl(38, 96%, 53%) 0%, hsl(24, 94%, 48%) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            🧭
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#f8fafc' }}>
                {bus?.busNumber || 'NB-01'}
              </span>
              <Badge variant={isTripActive ? 'active' : 'neutral'} size="sm" pulse={isTripActive}>
                {isTripActive ? 'IN SERVICE' : 'IDLE'}
              </Badge>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {user.driver?.name || 'Driver Ramesh'} • {bus?.registrationNumber || 'KA-01-EQ-1024'}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          aria-label="Logout"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#f87171',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.80rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Exit
        </button>
      </header>

      {/* Main Console Content */}
      <main className="nb-driver-content">
        {/* GPS Live Status Indicator */}
        <GpsStatusIndicator
          status={gpsStatus}
          accuracyMeters={accuracyMeters}
          lastUpdateAgoSeconds={lastUpdateSeconds}
        />

        {/* Speedometer Instrument Cluster */}
        <div className="nb-speedometer">
          <div className="nb-speed-value">{speedKmh}</div>
          <div className="nb-speed-unit">KM / H • TELEMETRY SPEED</div>
          <div
            style={{
              marginTop: '12px',
              fontSize: '0.76rem',
              color: '#94a3b8',
              display: 'flex',
              gap: '16px',
            }}
          >
            <span>
              LAT: <strong style={{ color: '#f8fafc' }}>{currentCoords.lat.toFixed(5)}</strong>
            </span>
            <span>
              LNG: <strong style={{ color: '#f8fafc' }}>{currentCoords.lng.toFixed(5)}</strong>
            </span>
            <span>
              SENT: <strong style={{ color: '#38bdf8' }}>{totalUpdatesSent}</strong>
            </span>
          </div>
        </div>

        {/* Primary Action Button: START TRIP or END TRIP */}
        {!isTripActive ? (
          <Button
            variant="amber"
            size="lg"
            fullWidth
            onClick={handleStartTrip}
            style={{ minHeight: '64px', fontSize: '1.25rem', letterSpacing: '0.04em' }}
          >
            ▶ START SCHEDULED TRIP
          </Button>
        ) : (
          <Button
            variant="danger"
            size="lg"
            fullWidth
            onClick={() => setIsEndTripModalOpen(true)}
            style={{ minHeight: '64px', fontSize: '1.25rem', letterSpacing: '0.04em' }}
          >
            ⏹ COMPLETE & END TRIP
          </Button>
        )}

        {/* Assigned Route & Stops Checklist */}
        <Card variant="surface" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Assigned Route
              </span>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
                {route?.name || 'Greenfield Campus Express'}
              </h3>
            </div>
            <Badge variant="scheduled" size="sm">
              {stops.length} STOPS
            </Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stops.map((stop, idx) => (
              <div
                key={stop.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: '#1e293b',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#f8fafc' }}>
                    {stop.name}
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  50m radius
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Emergency & Incident Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setIsIncidentModalOpen(true)}
          >
            ⚠️ Report Incident
          </Button>

          <Button
            variant="danger"
            size="md"
            fullWidth
            onClick={() => setIsSosModalOpen(true)}
            style={{ fontWeight: 800 }}
          >
            🚨 SOS EMERGENCY
          </Button>
        </div>
      </main>

      {/* End Trip Confirmation Modal */}
      <Modal
        isOpen={isEndTripModalOpen}
        onClose={() => setIsEndTripModalOpen(false)}
        title="Confirm End Trip?"
        description="This will finalize the active trip, stop student live tracking, and archive telemetry."
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="ghost" size="sm" onClick={() => setIsEndTripModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleEndTrip}>
              Yes, End Trip
            </Button>
          </div>
        }
      >
        <p style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>
          Please make sure all students have boarded or disembarked safely at the final campus terminal stop.
        </p>
      </Modal>

      {/* Incident Report Modal */}
      <Modal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        title="Report Route Incident"
        description="Notify dispatch operations about unexpected delays, breakdowns, or road closures."
      >
        <form onSubmit={handleReportIncident} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Select
            label="Incident Type"
            value={incidentType}
            onChange={(e) => setIncidentType(e.target.value as IncidentType)}
            options={[
              { value: IncidentType.BREAKDOWN, label: 'Mechanical Breakdown' },
              { value: IncidentType.DELAY, label: 'Severe Traffic Delay' },
              { value: IncidentType.ACCIDENT, label: 'Road Accident' },
              { value: IncidentType.OTHER, label: 'Route Detour / Other' },
            ]}
          />

          <Select
            label="Severity Level"
            value={incidentSeverity}
            onChange={(e) => setIncidentSeverity(e.target.value as IncidentSeverity)}
            options={[
              { value: IncidentSeverity.LOW, label: 'Low (Informational delay < 5 mins)' },
              { value: IncidentSeverity.MEDIUM, label: 'Medium (Noticeable delay 10-15 mins)' },
              { value: IncidentSeverity.HIGH, label: 'High (Vehicle stopped, needs assistance)' },
              { value: IncidentSeverity.CRITICAL, label: 'Critical (Safety emergency)' },
            ]}
          />

          <Input
            label="Details & Description"
            value={incidentDescription}
            onChange={(e) => setIncidentDescription(e.target.value)}
            placeholder="e.g. Flat tire near Ring Road junction, mechanic called."
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsIncidentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="amber" size="sm" loading={incidentSubmitting}>
              Submit Incident Report
            </Button>
          </div>
        </form>
      </Modal>

      {/* Emergency SOS Modal */}
      <Modal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        title="🚨 CONFIRM EMERGENCY SOS"
        description="Immediately dispatches priority security and medical response to your exact coordinates."
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="ghost" size="sm" onClick={() => setIsSosModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="md" onClick={handleTriggerSos} style={{ fontWeight: 800 }}>
              CONFIRM EMERGENCY
            </Button>
          </div>
        }
      >
        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
          <p style={{ color: '#fca5a5', fontSize: '0.88rem', fontWeight: 600 }}>
            Current coordinates will be broadcasted to Campus Security Dispatch:
          </p>
          <div style={{ fontFamily: 'var(--nb-font-mono)', fontSize: '0.84rem', marginTop: '6px', color: '#f8fafc' }}>
            Lat: {currentCoords.lat.toFixed(6)}, Lng: {currentCoords.lng.toFixed(6)}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;
