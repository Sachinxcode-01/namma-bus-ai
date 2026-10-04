import React from 'react';
import { Badge } from '@nammabus/ui-components';
import { UserProfile } from '@nammabus/shared-types';

export interface StudentHeaderProps {
  user: UserProfile | null;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({
  user,
  unreadCount,
  onOpenNotifications,
  onOpenProfile,
}) => {
  return (
    <header className="nb-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(265, 89%, 66%) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
          }}
        >
          🚌
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', color: '#f8fafc' }}>
              NammaBus
            </span>
            <Badge variant="scheduled" size="sm">
              STUDENT
            </Badge>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            {user?.student?.name ? `Hi, ${user.student.name.split(' ')[0]}` : 'Smart Campus Tracking'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onOpenNotifications}
          aria-label="Open notifications"
          style={{
            position: 'relative',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          🔔
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #0a0f1d',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenProfile}
          aria-label="Open student profile"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          👤
        </button>
      </div>
    </header>
  );
};
