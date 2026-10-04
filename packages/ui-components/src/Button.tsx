import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'amber' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          background: 'linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(224, 76%, 48%) 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
        };
      case 'amber':
        return {
          background: 'linear-gradient(135deg, hsl(38, 96%, 53%) 0%, hsl(34, 93%, 45%) 100%)',
          color: '#1a1003',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 14px 0 rgba(245, 158, 11, 0.35)',
          fontWeight: 700,
        };
      case 'danger':
        return {
          background: 'linear-gradient(135deg, hsl(348, 83%, 58%) 0%, hsl(348, 83%, 45%) 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.35)',
        };
      case 'secondary':
        return {
          background: 'var(--nb-bg-surface-elevated, #243048)',
          color: 'var(--nb-text-primary, #f8fafc)',
          border: '1px solid var(--nb-border-medium, rgba(255, 255, 255, 0.14))',
        };
      case 'outline':
        return {
          background: 'transparent',
          color: 'var(--nb-text-primary, #f8fafc)',
          border: '1.5px solid var(--nb-border-medium, rgba(255, 255, 255, 0.2))',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--nb-text-secondary, #94a3b8)',
          border: 'none',
        };
      default:
        return {};
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          padding: '6px 12px',
          fontSize: '0.8125rem',
          minHeight: '36px',
          borderRadius: 'var(--nb-radius-sm, 6px)',
        };
      case 'lg':
        return {
          padding: '14px 24px',
          fontSize: '1rem',
          minHeight: '52px',
          borderRadius: 'var(--nb-radius-md, 12px)',
        };
      case 'md':
      default:
        return {
          padding: '10px 18px',
          fontSize: '0.90rem',
          minHeight: '44px', // Minimum accessible touch target
          borderRadius: 'var(--nb-radius-md, 10px)',
        };
    }
  };

  return (
    <button
      disabled={disabled || loading}
      className={`nb-btn nb-btn-${variant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontFamily: 'var(--nb-font-sans, inherit)',
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform var(--nb-duration-fast, 150ms) ease, box-shadow var(--nb-duration-fast, 150ms) ease, background var(--nb-duration-fast, 150ms) ease',
        width: fullWidth ? '100%' : 'auto',
        outline: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        ...getVariantStyles(),
        ...getSizeStyles(),
      }}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderTopColor: '#ffffff',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'nb-spin 0.6s linear infinite',
          }}
        />
      ) : (
        icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
