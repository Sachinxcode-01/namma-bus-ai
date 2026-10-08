import React, { useState } from 'react';
import { Card, Button, Input } from '@nammabus/ui-components';

interface AdminLoginFormProps {
  onLogin: (email: string, password?: string) => Promise<unknown>;
  loading: boolean;
  error: string | null;
}

export const AdminLoginForm: React.FC<AdminLoginFormProps> = ({
  onLogin,
  loading,
  error,
}) => {
  const [email, setEmail] = useState('admin@nammabus.ai');
  const [password, setPassword] = useState('admin123');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!email.trim()) {
      setValidationError('Please enter your administrator email address.');
      return;
    }
    if (!password || password.length < 6) {
      setValidationError('Password must be at least 6 characters long.');
      return;
    }

    try {
      await onLogin(email, password);
    } catch {
      // Handled via error prop
    }
  };

  const handleDemoFill = () => {
    setEmail('admin@nammabus.ai');
    setPassword('admin123');
    onLogin('admin@nammabus.ai', 'admin123');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'radial-gradient(circle at 50% 25%, #0f1f3d 0%, #060913 100%)',
      }}
    >
      <Card
        variant="glass"
        glow="primary"
        style={{
          maxWidth: '440px',
          width: '100%',
          padding: '36px 32px',
          border: '1px solid rgba(59, 130, 246, 0.25)',
        }}
      >
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(265, 89%, 66%) 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              marginBottom: '16px',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.45)',
            }}
          >
            🏢
          </div>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#f8fafc',
              letterSpacing: '-0.02em',
            }}
          >
            NammaBus Mission Control
          </h1>
          <p
            style={{
              fontSize: '0.84rem',
              color: 'var(--nb-text-secondary, #94a3b8)',
              marginTop: '6px',
            }}
          >
            Authorized College Transport Administration
          </p>
        </div>

        {/* Error Banners */}
        {(validationError || error) && (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '10px',
              color: '#fca5a5',
              fontSize: '0.84rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>⚠️</span>
            <span>{validationError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Administrator Email"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            placeholder="admin@nammabus.ai"
            autoComplete="username"
            required
          />

          <Input
            label="Security Password"
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            style={{ marginTop: '8px' }}
          >
            Access Transport Control Desk
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={handleDemoFill}
            disabled={loading}
          >
            ⚡ One-Tap Administrator Demo Sign-In
          </Button>
        </form>

        <div
          style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--nb-border-subtle, rgba(255, 255, 255, 0.08))',
            textAlign: 'center',
            fontSize: '0.74rem',
            color: 'var(--nb-text-muted, #64748b)',
          }}
        >
          Protected System. All access requests are cryptographically audited with correlation IDs.
        </div>
      </Card>
    </div>
  );
};
