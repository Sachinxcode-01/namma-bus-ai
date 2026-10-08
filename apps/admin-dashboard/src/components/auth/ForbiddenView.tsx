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
        backgroundColor: '#060913',
      }}
    >
      <Card
        variant="glass"
        glow="rose"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '36px',
          textAlign: 'center',
          border: '1px solid rgba(239, 68, 68, 0.35)',
        }}
      >
        <div
          style={{
            fontSize: '48px',
            marginBottom: '16px',
            lineHeight: 1,
          }}
        >
          🛡️
        </div>

        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#f87171',
            letterSpacing: '-0.01em',
            marginBottom: '8px',
          }}
        >
          403 Forbidden: Admin Access Required
        </h1>

        <p
          style={{
            fontSize: '0.88rem',
            color: 'var(--nb-text-secondary, #94a3b8)',
            lineHeight: 1.5,
            marginBottom: '20px',
          }}
        >
          You are currently signed in as <strong style={{ color: '#f8fafc' }}>{userEmail}</strong>.
          This account does not have college transport administrator permissions.
        </p>

        <div
          style={{
            padding: '14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.80rem',
            color: '#94a3b8',
            marginBottom: '24px',
            textAlign: 'left',
          }}
        >
          <div>• If you are a Student, please use the <strong>Student Mobile / Web App</strong>.</div>
          <div style={{ marginTop: '4px' }}>• If you are a Driver, please use the <strong>Driver Navigation App</strong>.</div>
          <div style={{ marginTop: '4px' }}>• For administrative access, log in using your staff admin credentials.</div>
        </div>

        <Button variant="primary" size="md" fullWidth onClick={onLogout}>
          Sign Out & Return to Login
        </Button>
      </Card>
    </div>
  );
};
