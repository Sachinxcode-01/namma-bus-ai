import React from 'react';
import { ToastNotification } from '../../types';

interface ToastProps {
  toast: ToastNotification | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const getBg = () => {
    switch (toast.type) {
      case 'success':
        return 'linear-gradient(135deg, hsl(158, 64%, 40%) 0%, hsl(158, 64%, 30%) 100%)';
      case 'error':
        return 'linear-gradient(135deg, hsl(348, 83%, 50%) 0%, hsl(348, 83%, 38%) 100%)';
      case 'warning':
        return 'linear-gradient(135deg, hsl(38, 96%, 48%) 0%, hsl(38, 96%, 36%) 100%)';
      default:
        return 'linear-gradient(135deg, hsl(217, 91%, 55%) 0%, hsl(224, 76%, 45%) 100%)';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 10000,
        background: getBg(),
        color: '#ffffff',
        padding: '12px 18px',
        borderRadius: '12px',
        fontSize: '0.88rem',
        fontWeight: 600,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45), 0 0 1px 1px rgba(255, 255, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: 'nb-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        maxWidth: '420px',
      }}
    >
      <span
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.8rem',
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {getIcon()}
      </span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close notification"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.8)',
          cursor: 'pointer',
          fontSize: '1rem',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ×
      </button>
    </div>
  );
};
