import React from 'react';
import { Modal, Button, Badge } from '@nammabus/ui-components';
import { UserProfile } from '@nammabus/shared-types';

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Profile"
      description="Manage account preferences and campus transport subscription"
      variant="bottom-sheet"
      footer={
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
          <Button variant="danger" size="sm" onClick={onLogout}>
            Log Out
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'hsl(217, 91%, 60%)',
              color: '#ffffff',
              fontSize: '22px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {user?.student?.name ? user.student.name.charAt(0) : 'S'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
                {user?.student?.name || 'Authorized Student'}
              </h4>
              <Badge variant="active" size="sm">
                VERIFIED
              </Badge>
            </div>
            <div style={{ fontSize: '0.80rem', color: '#94a3b8' }}>
              USN: {user?.student?.usn || '1RV23CS001'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {user?.email || 'student@nammabus.ai'}
            </div>
          </div>
        </div>

        {/* Transport Preferences */}
        <div
          style={{
            padding: '14px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
            College Transport Subscription
          </span>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
            <span style={{ color: '#94a3b8' }}>Assigned Bus:</span>
            <span style={{ fontWeight: 700, color: '#fbbf24' }}>NB-01 (Greenfield Express)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
            <span style={{ color: '#94a3b8' }}>Default Boarding Stop:</span>
            <span style={{ fontWeight: 700, color: '#60a5fa' }}>Engineering Annex</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
            <span style={{ color: '#94a3b8' }}>10-Minute Proximity Push:</span>
            <span style={{ fontWeight: 700, color: '#10b981' }}>Enabled</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
