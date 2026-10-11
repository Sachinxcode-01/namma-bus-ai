import React from 'react';
import {
  Button,
  Badge,
  IconOverview,
  IconRadar,
  IconBus,
  IconDriver,
  IconRoute,
  IconTrip,
  IconIncident,
  IconBroadcast,
  IconSettings,
  IconLogOut,
  IconClose,
} from '@nammabus/ui-components';
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
  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Fleet Overview', icon: <IconOverview size={17} /> },
    { id: 'live', label: 'Live GPS Radar', icon: <IconRadar size={17} /> },
    { id: 'buses', label: 'Fleet Buses', icon: <IconBus size={17} /> },
    { id: 'drivers', label: 'Driver Roster', icon: <IconDriver size={17} /> },
    { id: 'routes', label: 'Routes & Stops', icon: <IconRoute size={17} /> },
    { id: 'trips', label: 'Trip Monitoring', icon: <IconTrip size={17} /> },
    {
      id: 'incidents',
      label: 'Incidents & SOS',
      icon: <IconIncident size={17} />,
      count: openIncidentsCount > 0 ? openIncidentsCount : undefined,
    },
    { id: 'broadcast', label: 'Broadcast Alerts', icon: <IconBroadcast size={17} /> },
    { id: 'settings', label: 'System & Audit', icon: <IconSettings size={17} /> },
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
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#0a0a0a',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(0, 112, 243, 0.25)',
              flexShrink: 0,
            }}
          >
            {/* Vercel Geometric Prism Icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 22H22L12 2Z" fill="url(#vercel-grad-sidebar)" />
              <defs>
                <linearGradient id="vercel-grad-sidebar" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#ffffff" />
                  <stop offset="1" stopColor="#888888" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.94rem',
                color: '#ffffff',
                letterSpacing: '-0.02em',
              }}
            >
              NammaBus AI
            </div>
            <div
              style={{
                fontSize: '0.64rem',
                color: '#888888',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Control Panel
            </div>
          </div>
          <button
            type="button"
            className="nb-mobile-close-btn"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          >
            <IconClose size={18} />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#171717',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.80rem',
                fontFamily: 'var(--nb-font-mono, monospace)',
              }}
            >
              ADM
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  color: '#ededed',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.email || 'admin@nammabus.ai'}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#00e599', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#00e599', display: 'inline-block' }} />
                Root Authority
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            icon={<IconLogOut size={13} />}
            onClick={onLogout}
          >
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
};
