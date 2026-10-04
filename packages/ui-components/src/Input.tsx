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
              fontSize: '0.84rem',
              fontWeight: 600,
              color: 'var(--nb-text-secondary, #94a3b8)',
              letterSpacing: '0.01em',
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
                left: '14px',
                color: 'var(--nb-text-muted, #64748b)',
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
              minHeight: '44px', // Accessible touch target
              padding: icon ? '10px 14px 10px 42px' : '10px 14px',
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              border: `1.5px solid ${error ? 'hsl(348, 83%, 55%)' : 'var(--nb-border-subtle, rgba(255, 255, 255, 0.12))'}`,
              borderRadius: 'var(--nb-radius-md, 10px)',
              color: 'var(--nb-text-primary, #f8fafc)',
              fontSize: '0.92rem',
              fontFamily: 'var(--nb-font-sans, inherit)',
              outline: 'none',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
              ...style,
            }}
            {...props}
          />
        </div>
        {error ? (
          <span style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 500 }}>
            {error}
          </span>
        ) : helperText ? (
          <span style={{ fontSize: '0.78rem', color: 'var(--nb-text-muted, #64748b)' }}>
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
              fontSize: '0.84rem',
              fontWeight: 600,
              color: 'var(--nb-text-secondary, #94a3b8)',
            }}
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`nb-select ${error ? 'nb-input-error' : ''} ${className}`}
          style={{
            width: '100%',
            minHeight: '44px',
            padding: '10px 14px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            border: `1.5px solid ${error ? 'hsl(348, 83%, 55%)' : 'var(--nb-border-subtle, rgba(255, 255, 255, 0.12))'}`,
            borderRadius: 'var(--nb-radius-md, 10px)',
            color: 'var(--nb-text-primary, #f8fafc)',
            fontSize: '0.92rem',
            fontFamily: 'var(--nb-font-sans, inherit)',
            outline: 'none',
            cursor: 'pointer',
            ...style,
          }}
          {...props}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
              style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}
            >
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 500 }}>
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
