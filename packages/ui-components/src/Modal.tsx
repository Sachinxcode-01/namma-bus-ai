import React, { useEffect } from 'react';
import { Button } from './Button';
import { IconClose } from './icons';

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
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
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
          backgroundColor: '#0a0a0a',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          borderTop: '1px solid rgba(255, 255, 255, 0.22)',
          borderRadius: isBottomSheet ? '16px 16px 0 0' : '14px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
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
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
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
                color: '#ffffff',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              {title}
            </h3>
            {description && (
              <p
                style={{
                  fontSize: '0.80rem',
                  color: '#888888',
                  marginTop: '3px',
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
              color: '#888888',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '22px',
            overflowY: 'auto',
            flex: 1,
            color: '#ededed',
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div
            style={{
              padding: '16px 22px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: '#050505',
            }}
          >
            {footer}
          </div>
        ) : (
          <div
            style={{
              padding: '14px 22px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: '#050505',
            }}
          >
            <Button variant="secondary" size="sm" onClick={onClose}>
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
