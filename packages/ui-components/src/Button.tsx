import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'amber' | 'danger' | 'ghost' | 'outline' | 'electric';
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
          background: '#ffffff',
          color: '#000000',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 0 16px rgba(255, 255, 255, 0.18), inset 0 1px 0 rgba(255, 255, 255, 1)',
          fontWeight: 600,
        };
      case 'electric':
        return {
          background: 'linear-gradient(135deg, #0070f3 0%, #7928ca 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 16px rgba(0, 112, 243, 0.35)',
          fontWeight: 600,
        };
      case 'amber':
        return {
          background: 'rgba(245, 166, 35, 0.12)',
          color: '#f5a623',
          border: '1px solid rgba(245, 166, 35, 0.35)',
          boxShadow: '0 0 14px rgba(245, 166, 35, 0.2)',
          fontWeight: 600,
        };
      case 'danger':
        return {
          background: 'rgba(255, 0, 128, 0.12)',
          color: '#ff0080',
          border: '1px solid rgba(255, 0, 128, 0.35)',
          boxShadow: '0 0 14px rgba(255, 0, 128, 0.2)',
          fontWeight: 600,
        };
      case 'secondary':
        return {
          background: '#111111',
          color: '#ededed',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 2px 8px rgba(0, 0, 0, 0.5)',
          fontWeight: 500,
        };
      case 'outline':
        return {
          background: 'transparent',
          color: '#ededed',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          fontWeight: 500,
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: '#888888',
          border: '1px solid transparent',
          fontWeight: 500,
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
          fontSize: '0.80rem',
          minHeight: '34px',
          borderRadius: 'var(--nb-radius-sm, 6px)',
          letterSpacing: '-0.01em',
        };
      case 'lg':
        return {
          padding: '12px 22px',
          fontSize: '0.96rem',
          minHeight: '48px',
          borderRadius: 'var(--nb-radius-md, 8px)',
          letterSpacing: '-0.01em',
        };
      case 'md':
      default:
        return {
          padding: '8px 16px',
          fontSize: '0.86rem',
          minHeight: '40px',
          borderRadius: 'var(--nb-radius-md, 8px)',
          letterSpacing: '-0.01em',
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
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
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
            width: '14px',
            height: '14px',
            border: '2px solid rgba(255, 255, 255, 0.25)',
            borderTopColor: variant === 'primary' ? '#000000' : '#ffffff',
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
