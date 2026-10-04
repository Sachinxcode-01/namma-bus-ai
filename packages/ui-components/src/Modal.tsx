import React, { useEffect } from 'react';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'center' | 'bottom-sheet';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'center',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isBottomSheet = variant === 'bottom-sheet';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: isBottomSheet ? 'flex-end' : 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: isBottomSheet ? '0' : '16px',
        animation: 'nb-fade-in 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nb-modal-title"
        style={{
          width: '100%',
          maxWidth: isBottomSheet ? '100%' : '520px',
          maxHeight: isBottomSheet ? '88vh' : '85vh',
          backgroundColor: 'var(--nb-bg-surface-elevated, #1a2234)',
          border: '1px solid var(--nb-border-bright, rgba(255, 255, 255, 0.18))',
          borderRadius: isBottomSheet ? '24px 24px 0 0' : 'var(--nb-radius-xl, 20px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'nb-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--nb-border-subtle, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3
              id="nb-modal-title"
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: 'var(--nb-text-primary, #f8fafc)',
              }}
            >
              {title}
            </h3>
            {description && (
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--nb-text-secondary, #94a3b8)',
                  marginTop: '2px',
                }}
              >
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--nb-text-muted, #64748b)',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '22px',
            overflowY: 'auto',
            flex: 1,
            color: 'var(--nb-text-primary, #f8fafc)',
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: '16px 22px',
              borderTop: '1px solid var(--nb-border-subtle, rgba(255, 255, 255, 0.08))',
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
