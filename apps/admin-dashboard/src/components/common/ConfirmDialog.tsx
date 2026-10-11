import React, { useState } from 'react';
import { Modal, Button, IconAlertCircle } from '@nammabus/ui-components';

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
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
          padding: '14px 16px',
          borderRadius: '8px',
          backgroundColor:
            variant === 'danger'
              ? 'rgba(239, 68, 68, 0.08)'
              : 'rgba(245, 166, 35, 0.08)',
          border: `1px solid ${
            variant === 'danger'
              ? 'rgba(239, 68, 68, 0.25)'
              : 'rgba(245, 166, 35, 0.25)'
          }`,
          color: '#888888',
          fontSize: '0.86rem',
          lineHeight: '1.5',
        }}
      >
        <IconAlertCircle
          size={18}
          color={variant === 'danger' ? '#f87171' : '#f5a623'}
          style={{ marginTop: '2px', flexShrink: 0 }}
        />
        <div>
          <strong style={{ color: '#ededed', display: 'block', marginBottom: '2px' }}>
            Notice: Critical Operation
          </strong>
          Please review carefully. This will update live transport state across driver and student apps immediately.
        </div>
      </div>
    </Modal>
  );
};
