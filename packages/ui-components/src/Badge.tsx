import React from 'react';

export type BadgeVariant =
  | 'active'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'vercel';

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
          bg: 'rgba(0, 229, 153, 0.10)',
          text: '#00e599',
          border: 'rgba(0, 229, 153, 0.28)',
          dot: '#00e599',
        };
      case 'warning':
        return {
          bg: 'rgba(245, 166, 35, 0.10)',
          text: '#f5a623',
          border: 'rgba(245, 166, 35, 0.28)',
          dot: '#f5a623',
        };
      case 'danger':
        return {
          bg: 'rgba(255, 0, 128, 0.12)',
          text: '#ff0080',
          border: 'rgba(255, 0, 128, 0.32)',
          dot: '#ff0080',
        };
      case 'scheduled':
      case 'info':
        return {
          bg: 'rgba(0, 112, 243, 0.10)',
          text: '#0070f3',
          border: 'rgba(0, 112, 243, 0.28)',
          dot: '#0070f3',
        };
      case 'vercel':
        return {
          bg: '#ffffff',
          text: '#000000',
          border: '#ffffff',
          dot: '#000000',
        };
      case 'completed':
        return {
          bg: 'rgba(255, 255, 255, 0.06)',
          text: '#ededed',
          border: 'rgba(255, 255, 255, 0.14)',
          dot: '#888888',
        };
      case 'cancelled':
        return {
          bg: 'rgba(255, 0, 128, 0.08)',
          text: '#ff6699',
          border: 'rgba(255, 0, 128, 0.20)',
          dot: '#ff0080',
        };
      case 'neutral':
      default:
        return {
          bg: 'rgba(255, 255, 255, 0.05)',
          text: '#888888',
          border: 'rgba(255, 255, 255, 0.10)',
          dot: '#555555',
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
        fontSize: size === 'sm' ? '0.68rem' : '0.74rem',
        fontWeight: 600,
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
      <span
        style={{
          width: size === 'sm' ? '5px' : '6px',
          height: size === 'sm' ? '5px' : '6px',
          borderRadius: '50%',
          backgroundColor: colors.dot,
          boxShadow: `0 0 6px ${colors.dot}`,
          animation: pulse ? 'nb-pulse-glow 1.8s infinite' : 'none',
          display: 'inline-block',
        }}
      />
      {children}
    </span>
  );
};
