import React, { useState, useEffect } from 'react';
import { Badge } from '@nammabus/ui-components';
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
        return 'Campus Transport Operations';
      case 'live':
        return 'Live GPS Fleet Radar';
      case 'buses':
        return 'Bus Fleet Registry';
      case 'drivers':
        return 'Authorized Driver Roster';
      case 'routes':
        return 'Route & Stop Manager';
      case 'trips':
        return 'Trip Schedule & Performance';
      case 'incidents':
        return 'Incident & Safety Response Desk';
      case 'broadcast':
        return 'Campus Alert Broadcast Center';
      case 'settings':
        return 'System Diagnostics & Audit';
      default:
        return 'Transport Control';
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
          ☰
        </button>

        <div>
          <h2
            style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              color: '#f8fafc',
              letterSpacing: '-0.01em',
              margin: 0,
            }}
          >
            {getTabTitle(currentTab)}
          </h2>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
            Control Center • College Transport Authority
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {openIncidentsCount > 0 && (
          <button
            type="button"
            onClick={() => onSelectTab('incidents')}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '0.9rem' }}>🚨</span>
            <span>{openIncidentsCount} Open Incident{openIncidentsCount > 1 ? 's' : ''}</span>
          </button>
        )}

        <div className="nb-topbar-clock" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge variant="active" size="sm" pulse>
            LIVE
          </Badge>
          <span
            style={{
              fontFamily: 'var(--nb-font-mono, monospace)',
              fontSize: '0.84rem',
              fontWeight: 600,
              color: '#cbd5e1',
            }}
          >
            {timeStr}
          </span>
        </div>
      </div>
    </header>
  );
};
