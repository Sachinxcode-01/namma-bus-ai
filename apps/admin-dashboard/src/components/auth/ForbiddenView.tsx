import React from 'react';
import { Card, Button } from '@nammabus/ui-components';

interface ForbiddenViewProps {
  userEmail: string;
  onLogout: () => void;
}

export const ForbiddenView: React.FC<ForbiddenViewProps> = ({ userEmail, onLogout }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: '#000000',
        backgroundImage: `
          radial-gradient(circle at 50% 30%, rgba(255, 0, 128, 0.12) 0%, transparent 60%),
          radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 24px 24px',
      }}
    >
      <Card
        variant="glass"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '36px 30px',
          textAlign: 'center',
          background: 'rgba(10, 10, 10, 0.90)',
          border: '1px solid rgba(255, 0, 128, 0.35)',
          borderTop: '1px solid rgba(255, 0, 128, 0.50)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 0, 128, 0.15)',
          borderRadius: '16px',
        }}
      >
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '12px',
            background: 'rgba(255, 0, 128, 0.12)',
            border: '1px solid rgba(255, 0, 128, 0.35)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '26px',
            marginBottom: '16px',
            boxShadow: '0 0 20px rgba(255, 0, 128, 0.25)',
          }}
        >
          🛡️
        </div>

        <h1
          style={{
            fontSize: '1.45rem',
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.025em',
            marginBottom: '8px',
          }}
        >
          Access Restricted: 403 Forbidden
        </h1>

        <p
          style={{
            fontSize: '0.86rem',
            color: '#888888',
            lineHeight: 1.5,
            marginBottom: '20px',
          }}
        >
          Authenticated as <strong style={{ color: '#ededed' }}>{userEmail}</strong>.
          This identity is not granted root administrator permissions for the campus transit authority.
        </p>

        <div
          style={{
            padding: '14px',
            borderRadius: '8px',
            backgroundColor: '#050505',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.78rem',
            color: '#888888',
            marginBottom: '24px',
            textAlign: 'left',
            lineHeight: 1.6,
          }}
        >
          <div>• Students: Access transit live maps on the <strong>Student Web / Mobile App</strong>.</div>
          <div>• Drivers: Transmit GPS updates through the <strong>Driver Navigation Terminal</strong>.</div>
          <div>• Administrators: Sign in using an authorized root email.</div>
        </div>

        <Button variant="primary" size="md" fullWidth onClick={onLogout}>
          Sign Out & Return to Terminal
        </Button>
      </Card>
    </div>
  );
};
