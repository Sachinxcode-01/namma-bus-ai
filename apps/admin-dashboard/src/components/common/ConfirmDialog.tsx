import React, { useState } from 'react';
import { Modal, Button } from '@nammabus/ui-components';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'amber' | 'primary';
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Confirmation action error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={title}
      description={description}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant}
            size="sm"
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div
        style={{
          padding: '14px',
          borderRadius: '10px',
          backgroundColor:
            variant === 'danger'
              ? 'rgba(239, 68, 68, 0.1)'
              : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${
            variant === 'danger'
              ? 'rgba(239, 68, 68, 0.25)'
              : 'rgba(245, 158, 11, 0.25)'
          }`,
          color: 'var(--nb-text-secondary, #94a3b8)',
          fontSize: '0.86rem',
          lineHeight: '1.5',
        }}
      >
        <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '4px' }}>
          Notice: Destructive / Critical Operation
        </strong>
        Please review carefully. This will update live transport state across driver and student apps immediately.
      </div>
    </Modal>
  );
};
