import React from 'react';

export type BadgeVariant =
  | 'active'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  pulse = false,
  size = 'md',
}) => {
  const getColors = () => {
    switch (variant) {
      case 'active':
        return {
          bg: 'rgba(16, 185, 129, 0.16)',
          text: '#34d399',
          border: 'rgba(52, 211, 153, 0.3)',
          dot: '#10b981',
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.16)',
          text: '#fbbf24',
          border: 'rgba(251, 191, 36, 0.3)',
          dot: '#f59e0b',
        };
      case 'danger':
        return {
          bg: 'rgba(239, 68, 68, 0.18)',
          text: '#f87171',
          border: 'rgba(248, 113, 113, 0.35)',
          dot: '#ef4444',
        };
      case 'scheduled':
      case 'info':
        return {
          bg: 'rgba(59, 130, 246, 0.16)',
          text: '#60a5fa',
          border: 'rgba(96, 165, 250, 0.3)',
          dot: '#3b82f6',
        };
      case 'completed':
        return {
          bg: 'rgba(148, 163, 184, 0.14)',
          text: '#cbd5e1',
          border: 'rgba(203, 213, 225, 0.25)',
          dot: '#94a3b8',
        };
      case 'cancelled':
        return {
          bg: 'rgba(244, 63, 94, 0.14)',
          text: '#fda4af',
          border: 'rgba(253, 164, 175, 0.25)',
          dot: '#f43f5e',
        };
      case 'neutral':
      default:
        return {
          bg: 'rgba(255, 255, 255, 0.08)',
          text: '#94a3b8',
          border: 'rgba(255, 255, 255, 0.12)',
          dot: '#64748b',
        };
    }
  };

  const colors = getColors();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        fontSize: size === 'sm' ? '0.70rem' : '0.78rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        borderRadius: '9999px',
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}
    >
      {(pulse || variant === 'active') && (
        <span
          style={{
            position: 'relative',
            display: 'inline-flex',
            width: '6px',
            height: '6px',
          }}
        >
          <span
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              backgroundColor: colors.dot,
              animation: 'nb-bus-pulse 1.8s infinite cubic-bezier(0, 0, 0.2, 1)',
            }}
          />
          <span
            style={{
              position: 'relative',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: colors.dot,
            }}
          />
        </span>
      )}
      {children}
    </span>
  );
};
