import React from 'react';
import { Modal, Badge, Button, EmptyState } from '@nammabus/ui-components';
import { NotificationEntity, NotificationType } from '@nammabus/shared-types';

export interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationEntity[];
  onMarkAllRead: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
}) => {
  const getBadgeVariant = (type: NotificationType) => {
    switch (type) {
      case NotificationType.ETA_10_MIN:
        return 'warning';
      case NotificationType.BREAKDOWN:
      case NotificationType.CANCELLATION:
        return 'danger';
      case NotificationType.TRIP_STARTED:
      case NotificationType.STOP_REACHED:
        return 'active';
      default:
        return 'info';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Arrival & Trip Alerts"
      description="Live notifications for your subscribed campus bus route"
      variant="bottom-sheet"
      footer={
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
          <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
            Mark All Read
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No alerts right now"
          description="You will receive live ETA updates and arrival alerts once the bus starts its trip."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              style={{
                background: notif.isRead
                  ? 'rgba(255, 255, 255, 0.02)'
                  : 'rgba(59, 130, 246, 0.08)',
                border: notif.isRead
                  ? '1px solid rgba(255, 255, 255, 0.06)'
                  : '1px solid rgba(59, 130, 246, 0.3)',
                padding: '14px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge variant={getBadgeVariant(notif.type)} size="sm">
                  {notif.type.replace(/_/g, ' ')}
                </Badge>
                <span style={{ fontSize: '0.70rem', color: '#64748b' }}>
                  {new Date(notif.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                {notif.title}
              </h4>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
                {notif.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};
