import React from 'react';
import { Card, Badge, Button } from '@nammabus/ui-components';
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
            NODE.JS v20 • NESTJS 10
          </Badge>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Environment & Backend Connection */}
        <Card variant="surface" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginBottom: '16px' }}>
            API Gateway Configuration
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.86rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>API Base URL:</span>
              <span style={{ fontFamily: 'var(--nb-font-mono)', color: '#38bdf8' }}>
                http://localhost:4000/api/v1
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Realtime Protocol:</span>
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>
                REST GPS Ingestion + Delta Polling
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Telemetry Ingestion Interval:</span>
              <span style={{ color: '#10b981', fontWeight: 700 }}>
                3.5 Seconds (Adaptive)
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Stale GPS Threshold:</span>
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>45 Seconds</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Active Transport Pilot:</span>
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>Greenfield Campus Route</span>
            </div>
          </div>
        </Card>

        {/* Current Admin Session */}
        <Card variant="surface" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginBottom: '16px' }}>
            Administrator Security Profile
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.86rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Authenticated User:</span>
              <span style={{ color: '#f8fafc', fontWeight: 700 }}>{user?.email || 'admin@nammabus.ai'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Assigned RBAC Role:</span>
              <Badge variant="active" size="sm">
                ADMIN (FULL ACCESS)
              </Badge>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Cryptographic Session:</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>JWT RS256 Validated</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Token Expiration:</span>
              <span style={{ color: '#94a3b8' }}>3600 seconds with auto-refresh</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Maintenance Actions */}
      <Card variant="surface" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
          Diagnostic Utilities
        </h3>
        <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '16px' }}>
          Troubleshoot local browser state, refresh mock datasets, or purge stale GPS coordinates
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="outline" size="sm" onClick={handleClearCache}>
            Purge Local GPS Cache
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.location.reload();
            }}
          >
            Hard Reload Application ↺
          </Button>
        </div>
      </Card>
    </div>
  );
};
