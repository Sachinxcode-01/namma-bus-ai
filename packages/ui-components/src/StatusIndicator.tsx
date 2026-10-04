import React from 'react';

export type GpsStatusState =
  | 'TRACKING_ACTIVE'
  | 'ACQUIRING'
  | 'STALE'
  | 'DISABLED'
  | 'DENIED'
  | 'STOPPED';

export interface GpsStatusIndicatorProps {
  status: GpsStatusState;
  accuracyMeters?: number | null;
  lastUpdateAgoSeconds?: number;
}

export const GpsStatusIndicator: React.FC<GpsStatusIndicatorProps> = ({
  status,
  accuracyMeters,
  lastUpdateAgoSeconds,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'TRACKING_ACTIVE':
        return {
          label: 'GPS ACTIVE',
          color: '#10b981',
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.3)',
          icon: '🟢',
          sub: accuracyMeters ? `±${Math.round(accuracyMeters)}m accuracy` : 'High precision',
        };
      case 'ACQUIRING':
        return {
          label: 'ACQUIRING FIX...',
          color: '#3b82f6',
          bg: 'rgba(59, 130, 246, 0.15)',
          border: 'rgba(59, 130, 246, 0.3)',
          icon: '📡',
          sub: 'Searching for satellites',
        };
      case 'STALE':
        return {
          label: 'SIGNAL STALE',
          color: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.3)',
          icon: '⚠️',
          sub: lastUpdateAgoSeconds ? `${lastUpdateAgoSeconds}s since last update` : 'Delayed signal',
        };
      case 'DISABLED':
        return {
          label: 'GPS DISABLED',
          color: '#ef4444',
          bg: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.3)',
          icon: '❌',
          sub: 'Turn on location services in device settings',
        };
      case 'DENIED':
        return {
          label: 'PERMISSION DENIED',
          color: '#ef4444',
          bg: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.3)',
          icon: '🚫',
          sub: 'Location access blocked by browser/app',
        };
      case 'STOPPED':
      default:
        return {
          label: 'TRACKING IDLE',
          color: '#94a3b8',
          bg: 'rgba(148, 163, 184, 0.12)',
          border: 'rgba(148, 163, 184, 0.2)',
          icon: '⏸️',
          sub: 'Trip not started',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: 'var(--nb-radius-md, 10px)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1rem' }}>{config.icon}</span>
        <div>
          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: config.color,
              letterSpacing: '0.04em',
            }}
          >
            {config.label}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--nb-text-muted, #64748b)' }}>
            {config.sub}
          </div>
        </div>
      </div>
      {status === 'TRACKING_ACTIVE' && (
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            color: '#34d399',
          }}
        >
          LIVE
        </span>
      )}
    </div>
  );
};
