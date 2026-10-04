import React from 'react';

export type CardVariant = 'surface' | 'glass' | 'elevated' | 'bordered';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
  glow?: 'none' | 'primary' | 'amber' | 'emerald' | 'rose';
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
        return '0 0 20px rgba(59, 130, 246, 0.25), 0 4px 20px rgba(0,0,0,0.4)';
      case 'amber':
        return '0 0 20px rgba(245, 158, 11, 0.25), 0 4px 20px rgba(0,0,0,0.4)';
      case 'emerald':
        return '0 0 20px rgba(16, 185, 129, 0.25), 0 4px 20px rgba(0,0,0,0.4)';
      case 'rose':
        return '0 0 20px rgba(239, 68, 68, 0.25), 0 4px 20px rgba(0,0,0,0.4)';
      default:
        return 'var(--nb-shadow-md, 0 4px 12px rgba(0,0,0,0.4))';
    }
  };

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'glass':
        return {
          background: 'var(--nb-bg-glass-card, rgba(26, 34, 52, 0.65))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--nb-border-subtle, rgba(255, 255, 255, 0.08))',
        };
      case 'elevated':
        return {
          background: 'var(--nb-bg-surface-elevated, #1e293b)',
          border: '1px solid var(--nb-border-medium, rgba(255, 255, 255, 0.12))',
        };
      case 'bordered':
        return {
          background: 'var(--nb-bg-surface, #151d2f)',
          border: '1px solid var(--nb-border-medium, rgba(255, 255, 255, 0.15))',
        };
      case 'surface':
      default:
        return {
          background: 'var(--nb-bg-surface, #151d2f)',
          border: '1px solid var(--nb-border-subtle, rgba(255, 255, 255, 0.06))',
        };
    }
  };

  return (
    <div
      className={`nb-card ${interactive ? 'nb-card-interactive' : ''} ${className}`}
      style={{
        borderRadius: 'var(--nb-radius-lg, 16px)',
        padding: '18px',
        boxShadow: getGlowShadow(),
        color: 'var(--nb-text-primary, #f8fafc)',
        transition: interactive ? 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease' : undefined,
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
