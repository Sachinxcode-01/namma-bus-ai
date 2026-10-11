import React from 'react';

export type CardVariant = 'surface' | 'glass' | 'elevated' | 'bordered';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
  glow?: 'none' | 'primary' | 'amber' | 'emerald' | 'rose' | 'electric';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'glass',
  interactive = false,
  glow = 'none',
  children,
  className = '',
  style,
  ...props
}) => {
  const getGlowShadow = () => {
    switch (glow) {
      case 'primary':
        return '0 0 24px rgba(255, 255, 255, 0.12), 0 8px 24px rgba(0, 0, 0, 0.7)';
      case 'electric':
        return '0 0 24px rgba(0, 112, 243, 0.25), 0 8px 24px rgba(0, 0, 0, 0.7)';
      case 'amber':
        return '0 0 24px rgba(245, 166, 35, 0.22), 0 8px 24px rgba(0, 0, 0, 0.7)';
      case 'emerald':
        return '0 0 24px rgba(0, 229, 153, 0.22), 0 8px 24px rgba(0, 0, 0, 0.7)';
      case 'rose':
        return '0 0 24px rgba(255, 0, 128, 0.22), 0 8px 24px rgba(0, 0, 0, 0.7)';
      default:
        return '0 4px 16px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06)';
    }
  };

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'glass':
        return {
          background: 'rgba(10, 10, 10, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderTop: '1px solid rgba(255, 255, 255, 0.16)',
        };
      case 'elevated':
        return {
          background: '#111111',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        };
      case 'bordered':
        return {
          background: '#0a0a0a',
          border: '1px solid rgba(255, 255, 255, 0.14)',
        };
      case 'surface':
      default:
        return {
          background: '#0a0a0a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderTop: '1px solid rgba(255, 255, 255, 0.14)',
        };
    }
  };

  return (
    <div
      className={`nb-card ${interactive ? 'nb-card-interactive' : ''} ${className}`}
      style={{
        borderRadius: 'var(--nb-radius-lg, 12px)',
        padding: '20px',
        boxShadow: getGlowShadow(),
        color: 'var(--nb-text-primary, #ededed)',
        transition: interactive
          ? 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease'
          : undefined,
        cursor: interactive ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        ...getVariantStyles(),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
