import React from 'react';
import { Card } from '@nammabus/ui-components';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  subtextStatus?: 'positive' | 'warning' | 'negative' | 'neutral';
  icon?: string;
  glow?: 'primary' | 'amber' | 'emerald' | 'rose' | 'none';
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
        return '#34d399';
      case 'warning':
        return '#fbbf24';
      case 'negative':
        return '#f87171';
      default:
        return 'var(--nb-text-muted, #64748b)';
    }
  };

  return (
    <Card
      variant="glass"
      glow={glow}
      style={{
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease',
      }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span
          style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--nb-text-secondary, #94a3b8)',
          }}
        >
          {label}
        </span>
        {icon && (
          <span
            style={{
              fontSize: '1.25rem',
              lineHeight: 1,
              opacity: 0.85,
            }}
          >
            {icon}
          </span>
        )}
      </div>

      <div
        style={{
          fontSize: '2.1rem',
          fontWeight: 900,
          color: '#f8fafc',
          marginTop: '6px',
          letterSpacing: '-0.02em',
          fontFamily: 'var(--nb-font-sans)',
        }}
      >
        {value}
      </div>

      {subtext && (
        <div
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: getSubtextColor(),
            marginTop: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {subtext}
        </div>
      )}
    </Card>
  );
};
