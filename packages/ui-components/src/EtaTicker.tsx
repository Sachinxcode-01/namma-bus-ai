import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';

export interface EtaTickerProps {
  stopName: string;
  estimatedMinutes: number;
  distanceRemainingMeters?: number;
  delayMinutes?: number;
  status?: 'PASSED' | 'APPROACHING' | 'NEXT' | 'UPCOMING' | 'ARRIVED';
  busNumber?: string;
  isLive?: boolean;
}

export const EtaTicker: React.FC<EtaTickerProps> = ({
  stopName,
  estimatedMinutes,
  distanceRemainingMeters,
  delayMinutes = 0,
  status = 'NEXT',
  busNumber = 'NB-01',
  isLive = true,
}) => {
  const getEtaDisplay = () => {
    if (status === 'ARRIVED') return 'AT STOP';
    if (status === 'PASSED') return 'DEPARTED';
    if (estimatedMinutes <= 1) return '< 1 MIN';
    return `${estimatedMinutes} MIN`;
  };

  const getDistanceDisplay = () => {
    if (!distanceRemainingMeters) return null;
    if (distanceRemainingMeters >= 1000) {
      return `${(distanceRemainingMeters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(distanceRemainingMeters)} m`;
  };

  return (
    <Card
      variant="glass"
      glow={estimatedMinutes <= 10 ? 'amber' : 'primary'}
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge variant="scheduled" size="sm">
            BUS {busNumber}
          </Badge>
          {isLive && (
            <Badge variant="active" size="sm" pulse>
              LIVE GPS
            </Badge>
          )}
        </div>
        {delayMinutes > 2 ? (
          <Badge variant="warning" size="sm">
            +{delayMinutes}m DELAY
          </Badge>
        ) : (
          <Badge variant="active" size="sm">
            ON SCHEDULE
          </Badge>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <span
            style={{
              fontSize: '0.80rem',
              color: 'var(--nb-text-muted, #64748b)',
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            Destination Stop
          </span>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--nb-text-primary, #f8fafc)',
              marginTop: '2px',
            }}
          >
            {stopName}
          </h2>
          {distanceRemainingMeters && (
            <span
              style={{
                fontSize: '0.82rem',
                color: 'var(--nb-text-secondary, #94a3b8)',
                display: 'inline-block',
                marginTop: '2px',
              }}
            >
              📍 {getDistanceDisplay()} remaining
            </span>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--nb-text-muted, #64748b)',
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            Estimated Arrival
          </span>
          <div
            style={{
              fontSize: '2.1rem',
              fontWeight: 900,
              fontFamily: 'var(--nb-font-sans)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginTop: '4px',
              color: estimatedMinutes <= 10 ? 'hsl(38, 96%, 53%)' : 'hsl(217, 91%, 60%)',
              textShadow:
                estimatedMinutes <= 10
                  ? '0 0 20px rgba(245, 158, 11, 0.4)'
                  : '0 0 20px rgba(59, 130, 246, 0.4)',
            }}
          >
            {getEtaDisplay()}
          </div>
        </div>
      </div>
    </Card>
  );
};
