import React, { useState, useEffect } from 'react';
import { Badge, IconSearch, IconIncident } from '@nammabus/ui-components';
import { AdminTab } from '../../types';

interface TopbarProps {
  currentTab: AdminTab;
  onOpenMobileMenu: () => void;
  openIncidentsCount: number;
  onSelectTab: (tab: AdminTab) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentTab,
  onOpenMobileMenu,
  openIncidentsCount,
  onSelectTab,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTabTitle = (tab: AdminTab) => {
    switch (tab) {
      case 'overview':
        return 'Operations Overview';
      case 'live':
        return 'Live GPS Radar';
      case 'buses':
        return 'Fleet Bus Registry';
      case 'drivers':
        return 'Driver Roster';
      case 'routes':
        return 'Route & Geofences';
      case 'trips':
        return 'Trip Monitor & ETA';
      case 'incidents':
        return 'Emergency & SOS Desk';
      case 'broadcast':
        return 'Broadcast Alerts';
      case 'settings':
        return 'System Diagnostics';
      default:
        return 'Control Center';
    }
  };

  return (
    <header className="nb-admin-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          type="button"
          className="nb-hamburger-btn"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>

        {/* Vercel-Style Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: '#666666', fontWeight: 500 }}>NammaBus</span>
          <span style={{ fontSize: '0.75rem', color: '#333333' }}>/</span>
          <h2
            style={{
              fontSize: '0.94rem',
              fontWeight: 600,
              color: '#ffffff',
              letterSpacing: '-0.015em',
              margin: 0,
            }}
          >
            {getTabTitle(currentTab)}
          </h2>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 6px',
              fontSize: '0.64rem',
              fontWeight: 600,
              borderRadius: '4px',
              background: '#141414',
              color: '#888888',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontFamily: 'var(--nb-font-mono, monospace)',
              letterSpacing: '0.04em',
            }}
          >
            PROD
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Quick Search Trigger */}
        <div className="nb-topbar-search" onClick={() => onSelectTab('overview')} title="Quick Navigate">
          <IconSearch size={14} color="#888888" />
          <span>Quick actions</span>
          <span className="nb-topbar-kbd">⌘K</span>
        </div>

        {openIncidentsCount > 0 && (
          <button
            type="button"
            onClick={() => onSelectTab('incidents')}
            style={{
              background: 'rgba(255, 0, 128, 0.12)',
              border: '1px solid rgba(255, 0, 128, 0.35)',
              color: '#ff0080',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <IconIncident size={14} color="#ff0080" />
            <span>{openIncidentsCount} Incident{openIncidentsCount > 1 ? 's' : ''}</span>
          </button>
        )}

        {/* Live Clock Strip */}
        <div className="nb-topbar-clock" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge variant="active" size="sm" pulse>
            TELEMETRY LIVE
          </Badge>
          <span
            style={{
              fontFamily: 'var(--nb-font-mono, monospace)',
              fontSize: '0.78rem',
              fontWeight: 500,
              color: '#ededed',
            }}
          >
            {timeStr}
          </span>
        </div>
      </div>
    </header>
  );
};
