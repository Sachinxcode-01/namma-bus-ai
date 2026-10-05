import React, { useState } from 'react';
import { useAdminAuth } from './hooks/useAdminAuth';
import { useFleetData } from './hooks/useFleetData';
import { useLiveTelemetry } from './hooks/useLiveTelemetry';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { Toast } from './components/common/Toast';
import { AdminLoginForm } from './components/auth/AdminLoginForm';
import { ForbiddenView } from './components/auth/ForbiddenView';
import { OverviewDashboard } from './components/overview/OverviewDashboard';
import { LiveBusMonitor } from './components/live/LiveBusMonitor';
import { BusManagement } from './components/buses/BusManagement';
import { DriverManagement } from './components/drivers/DriverManagement';
import { RouteManagement } from './components/routes/RouteManagement';
import { TripMonitoring } from './components/trips/TripMonitoring';
import { IncidentManagement } from './components/incidents/IncidentManagement';
import { BroadcastCenter } from './components/notifications/BroadcastCenter';
import { SystemSettings } from './components/settings/SystemSettings';
import { AdminTab, ToastNotification } from './types';

export const App: React.FC = () => {
  // Navigation
  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);

  // Authentication State
  const {
    user,
    isAuthenticated,
    isForbidden,
    authLoading,
    authError,
    login,
    logout,
  } = useAdminAuth();

  // Fleet Operational Data State
  const {
    buses,
    drivers,
    routes,
    stops,
    trips,
    incidents,
    notifications,
    metrics,
    loading,
    error,
    addBus,
    updateBus,
    toggleBusStatus,
    deleteBus,
    addDriver,
    updateDriver,
    addRoute,
    addStop,
    resolveIncident,
    createIncident,
    dispatchBroadcast,
  } = useFleetData();

  // Shared preview telemetry for overview
  const { liveLocation } = useLiveTelemetry('bus-1', 4000);

  // Toast System
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const showToast = (message: string, type: ToastNotification['type'] = 'success') => {
    const id = `toast-${Date.now()}`;
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 4000);
  };

  // View: Non-Authenticated -> Admin Login
  if (!isAuthenticated && !isForbidden) {
    return (
      <>
        <Toast toast={toast} onClose={() => setToast(null)} />
        <AdminLoginForm
          onLogin={async (email, password) => {
            await login(email, password);
            showToast('Authenticated successfully with Administrator privileges.');
          }}
          loading={authLoading}
          error={authError}
        />
      </>
    );
  }

  // View: Authenticated as Non-Admin (Student/Driver role) -> 403 Forbidden
  if (isForbidden && user) {
    return (
      <ForbiddenView
        userEmail={user.email}
        onLogout={logout}
      />
    );
  }

  return (
    <div className="nb-admin-shell">
      {/* Toast Feedback */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        user={user}
        onLogout={() => {
          logout();
          showToast('Administrator session closed.');
        }}
        openIncidentsCount={metrics.openIncidentsCount}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
      />

      {/* Main Mission Control Shell */}
      <div className="nb-admin-main">
        {/* Topbar */}
        <Topbar
          currentTab={currentTab}
          onOpenMobileMenu={() => setIsOpenMobile(true)}
          openIncidentsCount={metrics.openIncidentsCount}
          onSelectTab={setCurrentTab}
        />

        {/* Global Loading / Network Error Banner */}
        {error && (
          <div
            role="alert"
            style={{
              margin: '16px 28px 0',
              padding: '12px 18px',
              borderRadius: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              fontSize: '0.86rem',
            }}
          >
            ⚠️ Backend Connection Warning: {error}. Running in resilient local simulation mode.
          </div>
        )}

        {/* Content View Switching */}
        <main className="nb-admin-content" role="region" aria-label="Control Content">
          {currentTab === 'overview' && (
            <OverviewDashboard
              metrics={metrics}
              buses={buses}
              trips={trips}
              stops={stops}
              incidents={incidents}
              liveLocation={liveLocation}
              onNavigateTab={setCurrentTab}
              onResolveIncident={resolveIncident}
            />
          )}

          {currentTab === 'live' && (
            <LiveBusMonitor
              buses={buses}
              stops={stops}
              trips={trips}
            />
          )}

          {currentTab === 'buses' && (
            <BusManagement
              buses={buses}
              onAddBus={addBus}
              onUpdateBus={updateBus}
              onToggleStatus={toggleBusStatus}
              onDeleteBus={deleteBus}
              showToast={showToast}
            />
          )}

          {currentTab === 'drivers' && (
            <DriverManagement
              drivers={drivers}
              onAddDriver={addDriver}
              onUpdateDriver={updateDriver}
              showToast={showToast}
            />
          )}

          {currentTab === 'routes' && (
            <RouteManagement
              routes={routes}
              stops={stops}
              onAddRoute={addRoute}
              onAddStop={addStop}
              showToast={showToast}
            />
          )}

          {currentTab === 'trips' && (
            <TripMonitoring
              trips={trips}
            />
          )}

          {currentTab === 'incidents' && (
            <IncidentManagement
              incidents={incidents}
              onResolveIncident={resolveIncident}
              onCreateIncident={createIncident}
              showToast={showToast}
            />
          )}

          {currentTab === 'broadcast' && (
            <BroadcastCenter
              notifications={notifications}
              onDispatchBroadcast={dispatchBroadcast}
              showToast={showToast}
            />
          )}

          {currentTab === 'settings' && (
            <SystemSettings
              user={user}
              showToast={showToast}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
