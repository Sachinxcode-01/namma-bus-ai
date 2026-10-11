import React from 'react';
import { Card } from '@nammabus/ui-components';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  subtextStatus?: 'positive' | 'warning' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  glow?: 'primary' | 'amber' | 'emerald' | 'rose' | 'electric' | 'none';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  subtextStatus = 'neutral',
  icon,
  glow = 'none',
  onClick,
}) => {
  const getSubtextColor = () => {
    switch (subtextStatus) {
      case 'positive':
        return '#00e599';
      case 'warning':
        return '#f5a623';
      case 'negative':
        return '#ff0080';
      default:
        return '#888888';
    }
  };

  return (
    <Card
      variant="glass"
      glow={glow}
      interactive={!!onClick}
      style={{
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        background: '#0a0a0a',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderTop: '1px solid rgba(255, 255, 255, 0.16)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#888888',
          }}
        >
          {label}
        </span>
        {icon && (
          <span
            style={{
              fontSize: '1.15rem',
              lineHeight: 1,
              opacity: 0.9,
            }}
          >
            {icon}
          </span>
        )}
      </div>

      <div
        style={{
          fontSize: '2.1rem',
          fontWeight: 700,
          color: '#ffffff',
          marginTop: '8px',
          letterSpacing: '-0.03em',
          fontFamily: 'var(--nb-font-mono, monospace)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>

      {subtext && (
        <div
          style={{
            fontSize: '0.76rem',
            fontWeight: 500,
            color: getSubtextColor(),
            marginTop: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: getSubtextColor(),
              display: 'inline-block',
            }}
          />
          {subtext}
        </div>
      )}
    </Card>
  );
};
