import React, { useState } from 'react';
import { Card, Badge, Button, Input, Select } from '@nammabus/ui-components';
import { PageHeader } from '../common/PageHeader';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { NotificationEntity, NotificationType } from '@nammabus/shared-types';

interface BroadcastCenterProps {
  notifications: NotificationEntity[];
  onDispatchBroadcast: (data: {
    title: string;
    body: string;
    type?: NotificationType;
  }) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const BroadcastCenter: React.FC<BroadcastCenterProps> = ({
  notifications,
  onDispatchBroadcast,
  showToast,
}) => {
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastType, setBroadcastType] = useState<NotificationType>(NotificationType.BROADCAST);
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'GREENFIELD'>('ALL');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleTriggerConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim()) {
      showToast('Notification headline is required.', 'error');
      return;
    }
    if (!broadcastBody.trim()) {
      showToast('Notification body message cannot be empty.', 'error');
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirmSend = async () => {
    try {
      setSubmitting(true);
      await onDispatchBroadcast({
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
        type: broadcastType,
      });
      showToast('Push alert broadcast dispatched to student & driver devices.');
      setBroadcastTitle('');
      setBroadcastBody('');
    } catch {
      showToast('Failed to dispatch broadcast notification.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeBadge = (type: NotificationType) => {
    switch (type) {
      case NotificationType.CANCELLATION:
      case NotificationType.BREAKDOWN:
        return <Badge variant="danger" size="sm">URGENT</Badge>;
      case NotificationType.DELAY:
      case NotificationType.ROUTE_ANOMALY:
        return <Badge variant="warning" size="sm">DELAY</Badge>;
      default:
        return <Badge variant="active" size="sm">ANNOUNCEMENT</Badge>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Campus Alert Broadcast Center"
        description="Dispatch real-time push announcements, delay alerts, and safety notices to student and driver apps"
        badge={
          <Badge variant="active" size="sm">
            FCM MULTICAST READY
          </Badge>
        }
      />

      <div className="nb-broadcast-grid">
        {/* Broadcast Dispatch Form */}
        <Card variant="surface" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
              Dispatch Operational Notification
            </h3>
            <p style={{ fontSize: '0.80rem', color: '#94a3b8', marginTop: '2px' }}>
              Requires explicit confirmation before delivery to prevent accidental notification spam.
            </p>
          </div>

          <form onSubmit={handleTriggerConfirmation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Select
              label="Notification Category"
              value={broadcastType}
              onChange={(e) => setBroadcastType(e.target.value as NotificationType)}
              options={[
                { value: NotificationType.BROADCAST, label: 'General Transport Announcement' },
                { value: NotificationType.DELAY, label: 'Bus Schedule Delay Notice' },
                { value: NotificationType.ROUTE_ANOMALY, label: 'Route Detour / Traffic Notice' },
                { value: NotificationType.BREAKDOWN, label: 'Breakdown / Vehicle Replacement' },
                { value: NotificationType.CANCELLATION, label: 'Trip Cancellation Alert' },
              ]}
            />

            <Select
              label="Target Audience Scope"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value as 'ALL' | 'GREENFIELD')}
              options={[
                { value: 'ALL', label: 'All Registered Students & Drivers (Campus Wide)' },
                { value: 'GREENFIELD', label: 'Greenfield Campus Express Subscribers Only' },
              ]}
            />

            <Input
              label="Alert Headline / Title"
              placeholder="e.g. Weather Alert: Evening bus departure delayed 15 mins"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              required
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--nb-text-secondary, #94a3b8)' }}>
                Message Body
              </label>
              <textarea
                rows={4}
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                placeholder="Enter detailed instructions for passengers..."
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  border: '1.5px solid var(--nb-border-subtle, rgba(255, 255, 255, 0.12))',
                  borderRadius: '10px',
                  color: '#f8fafc',
                  fontSize: '0.90rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              style={{ marginTop: '8px' }}
            >
              📢 Review & Broadcast Alert
            </Button>
          </form>
        </Card>

        {/* Broadcast History Log */}
        <Card variant="surface" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
              Recent Notification Dispatch Log
            </h3>
            <p style={{ fontSize: '0.80rem', color: '#94a3b8', marginTop: '2px' }}>
              Audit trail of dispatched campus transportation communications
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getTypeBadge(notif.type)}
                    <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.88rem' }}>
                      {notif.title}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--nb-text-muted, #64748b)' }}>
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4 }}>
                  {notif.body}
                </p>

                <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                  ✓ Delivered to student mobile push subscribers
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Confirmation Dialog before broadcast */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Confirm Campus-Wide Notification Broadcast"
        description={`You are about to dispatch "${broadcastTitle}" to ${
          targetAudience === 'ALL' ? 'ALL campus transport users' : 'Greenfield route subscribers'
        }. Push notifications cannot be retracted once sent.`}
        confirmLabel="Confirm & Dispatch Broadcast"
        variant="primary"
        onConfirm={handleConfirmSend}
        onClose={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};
