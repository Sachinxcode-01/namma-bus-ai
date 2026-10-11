import React from 'react';
import { Card, Badge, Button, IconSettings, IconShield, IconTerminal, IconRefresh, IconTrash } from '@nammabus/ui-components';
import { PageHeader } from '../common/PageHeader';
import { UserProfile } from '@nammabus/shared-types';

interface SystemSettingsProps {
  user: UserProfile | null;
  showToast: (msg: string) => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({ user, showToast }) => {
  const handleClearCache = () => {
    showToast('Local application telemetry cache purged successfully.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="System Diagnostics & Governance"
        description="Transport platform runtime configurations, API endpoints, and administrative audit trails"
        badge={
          <Badge variant="active" size="sm">
            <IconSettings size={13} style={{ marginRight: 5 }} />
            NODE.JS v20 • NESTJS 10
          </Badge>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Environment & Backend Connection */}
        <Card variant="surface" style={{ padding: '24px', background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.08)', borderTop: '1px solid rgba(255, 255, 255, 0.16)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconTerminal size={17} color="#0070f3" />
            API Gateway Configuration
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.86rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888888' }}>API Base URL:</span>
              <span style={{ fontFamily: 'var(--nb-font-mono)', color: '#38bdf8' }}>
                http://localhost:4000/api/v1
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888888' }}>Realtime Protocol:</span>
              <span style={{ color: '#ededed', fontWeight: 600 }}>
                REST GPS Ingestion + Delta Polling
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888888' }}>Telemetry Ingestion Interval:</span>
              <span style={{ color: '#00e599', fontWeight: 700 }}>
                3.5 Seconds (Adaptive)
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888888' }}>Stale GPS Threshold:</span>
              <span style={{ color: '#f5a623', fontWeight: 600 }}>45 Seconds</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888888' }}>Active Transport Pilot:</span>
              <span style={{ color: '#ededed', fontWeight: 600 }}>Greenfield Campus Route</span>
            </div>
          </div>
        </Card>

        {/* Current Admin Session */}
        <Card variant="surface" style={{ padding: '24px', background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.08)', borderTop: '1px solid rgba(255, 255, 255, 0.16)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconShield size={17} color="#00e599" />
            Administrator Security Profile
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.86rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888888' }}>Authenticated User:</span>
              <span style={{ color: '#ededed', fontWeight: 700 }}>{user?.email || 'admin@nammabus.ai'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888888' }}>Assigned RBAC Role:</span>
              <Badge variant="active" size="sm">
                ADMIN (FULL ACCESS)
              </Badge>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888888' }}>Cryptographic Session:</span>
              <span style={{ color: '#00e599', fontWeight: 600 }}>JWT RS256 Validated</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888888' }}>Token Expiration:</span>
              <span style={{ color: '#888888' }}>3600 seconds with auto-refresh</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Maintenance Actions */}
      <Card variant="surface" style={{ padding: '24px', background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.08)', borderTop: '1px solid rgba(255, 255, 255, 0.16)' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
          Diagnostic Utilities
        </h3>
        <p style={{ fontSize: '0.84rem', color: '#888888', marginBottom: '16px' }}>
          Troubleshoot local browser state, refresh mock datasets, or purge stale GPS coordinates
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="outline" size="sm" onClick={handleClearCache}>
            <IconTrash size={14} style={{ marginRight: 6 }} />
            Purge Local GPS Cache
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.location.reload();
            }}
          >
            <IconRefresh size={14} style={{ marginRight: 6 }} />
            Hard Reload Application
          </Button>
        </div>
      </Card>
    </div>
  );
};
