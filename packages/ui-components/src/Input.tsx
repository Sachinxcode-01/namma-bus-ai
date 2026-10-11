import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', id, style, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: '0.80rem',
              fontWeight: 500,
              color: '#888888',
              letterSpacing: '-0.01em',
            }}
          >
            {label}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {icon && (
            <span
              style={{
                position: 'absolute',
                left: '12px',
                color: '#666666',
                display: 'inline-flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              {icon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`nb-input ${error ? 'nb-input-error' : ''} ${className}`}
            style={{
              width: '100%',
              minHeight: '40px',
              padding: icon ? '9px 12px 9px 38px' : '9px 14px',
              backgroundColor: '#0a0a0a',
              border: `1px solid ${error ? '#ff0080' : 'rgba(255, 255, 255, 0.12)'}`,
              borderRadius: '8px',
              color: '#ededed',
              fontSize: '0.88rem',
              fontFamily: 'var(--nb-font-sans, inherit)',
              outline: 'none',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.6)',
              ...style,
            }}
            {...props}
          />
        </div>
        {error ? (
          <span style={{ fontSize: '0.74rem', color: '#ff0080', fontWeight: 500 }}>
            {error}
          </span>
        ) : helperText ? (
          <span style={{ fontSize: '0.74rem', color: '#666666' }}>
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', id, style, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {label && (
          <label
            htmlFor={selectId}
            style={{
              fontSize: '0.80rem',
              fontWeight: 500,
              color: '#888888',
              letterSpacing: '-0.01em',
            }}
          >
            {label}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <select
            id={selectId}
            ref={ref}
            className={`nb-select ${error ? 'nb-select-error' : ''} ${className}`}
            style={{
              width: '100%',
              minHeight: '40px',
              padding: '9px 36px 9px 14px',
              backgroundColor: '#0a0a0a',
              border: `1px solid ${error ? '#ff0080' : 'rgba(255, 255, 255, 0.12)'}`,
              borderRadius: '8px',
              color: '#ededed',
              fontSize: '0.88rem',
              fontFamily: 'var(--nb-font-sans, inherit)',
              outline: 'none',
              appearance: 'none',
              cursor: 'pointer',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              ...style,
            }}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled} style={{ background: '#0a0a0a', color: '#ededed' }}>
                {opt.label}
              </option>
            ))}
          </select>
          <span
            style={{
              position: 'absolute',
              right: '12px',
              color: '#888888',
              pointerEvents: 'none',
              fontSize: '0.72rem',
            }}
          >
            ▼
          </span>
        </div>
        {error && (
          <span style={{ fontSize: '0.74rem', color: '#ff0080', fontWeight: 500 }}>
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
