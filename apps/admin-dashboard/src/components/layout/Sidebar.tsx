import React from 'react';
import { Button, Badge } from '@nammabus/ui-components';
import { AdminTab } from '../../types';
import { UserProfile } from '@nammabus/shared-types';

interface SidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  user: UserProfile | null;
  onLogout: () => void;
  openIncidentsCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogout,
  openIncidentsCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems: { id: AdminTab; label: string; icon: string; count?: number }[] = [
    { id: 'overview', label: 'Fleet Overview', icon: '📊' },
    { id: 'live', label: 'Live GPS Radar', icon: '📡' },
    { id: 'buses', label: 'Fleet Buses', icon: '🚌' },
    { id: 'drivers', label: 'Driver Roster', icon: '🧑‍✈️' },
    { id: 'routes', label: 'Routes & Stops', icon: '🗺️' },
    { id: 'trips', label: 'Trip Monitoring', icon: '⏱️' },
    {
      id: 'incidents',
      label: 'Incidents & SOS',
      icon: '🚨',
      count: openIncidentsCount > 0 ? openIncidentsCount : undefined,
    },
    { id: 'broadcast', label: 'Broadcast Alerts', icon: '📢' },
    { id: 'settings', label: 'System & Audit', icon: '⚙️' },
  ];

  const handleNavClick = (tab: AdminTab) => {
    onSelectTab(tab);
    if (isOpenMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="nb-sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`nb-sidebar ${isOpenMobile ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="nb-sidebar-header">
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(265, 89%, 66%) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)',
              flexShrink: 0,
            }}
          >
            🚌
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: '1.02rem',
                color: '#f8fafc',
                letterSpacing: '-0.01em',
              }}
            >
              NammaBus AI
            </div>
            <div
              style={{
                fontSize: '0.68rem',
                color: '#38bdf8',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              College Operations
            </div>
          </div>
          <button
            type="button"
            className="nb-mobile-close-btn"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="nb-sidebar-menu" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`nb-menu-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nb-menu-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                {item.count !== undefined && (
                  <Badge variant="danger" size="sm" pulse>
                    {item.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Session Footer */}
        <div className="nb-sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.85rem',
              }}
            >
              A
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#f8fafc',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.email || 'admin@nammabus.ai'}
              </div>
              <div style={{ fontSize: '0.70rem', color: '#10b981', fontWeight: 600 }}>
                ● Authorized Admin
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={onLogout}
            style={{ fontSize: '0.80rem' }}
          >
            Log Out Session
          </Button>
        </div>
      </aside>
    </>
  );
};
