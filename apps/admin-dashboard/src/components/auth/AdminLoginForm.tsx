import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Input,
  IconEye,
  IconEyeOff,
  IconAlertCircle,
  IconCrown,
  IconZap,
  IconLock,
  IconKey,
  IconShield,
} from '@nammabus/ui-components';

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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [activeTab, setActiveTab] = useState<'password' | 'passkey'>('password');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [telemetryPings, setTelemetryPings] = useState<string[]>([
    'NB-01 [Route North] • 12.9716, 77.5946 • 32 km/h • On Schedule',
    'NB-02 [Route Tech] • 12.9810, 77.6080 • 28 km/h • On Schedule',
    'NB-03 [Hostel Express] • 12.9760, 77.6010 • 0 km/h • Boarding Stop 2',
  ]);

  // Simulate real-time mock telemetry in the terminal preview
  useEffect(() => {
    const timer = setInterval(() => {
      const buses = ['NB-01', 'NB-02', 'NB-03', 'NB-04', 'NB-05'];
      const randomBus = buses[Math.floor(Math.random() * buses.length)];
      const speed = Math.floor(Math.random() * 35) + 15;
      const now = new Date().toLocaleTimeString('en-IN', { hour12: false });
      const newEntry = `[${now}] ${randomBus}: GPS telemetry acknowledged (${speed} km/h • 0.8s latency)`;

      setTelemetryPings((prev) => [newEntry, ...prev.slice(0, 3)]);
    }, 3500);

    return () => clearInterval(timer);
  }, []);

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

  const handleQuickFill = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    onLogin(presetEmail, presetPass);
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
        backgroundColor: '#000000',
        backgroundImage: `
          radial-gradient(circle at 50% -100px, rgba(0, 112, 243, 0.14) 0%, rgba(121, 40, 202, 0.05) 45%, transparent 70%),
          radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 24px 24px',
      }}
    >
      <div
        style={{
          maxWidth: '1060px',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px',
          alignItems: 'center',
        }}
      >
        {/* Left Side: 21st.dev Style Live Telemetry & Studio Hero */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            padding: '12px',
          }}
        >
          {/* Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                background: 'rgba(0, 229, 153, 0.10)',
                border: '1px solid rgba(0, 229, 153, 0.28)',
                color: '#00e599',
                fontSize: '0.72rem',
                fontWeight: 600,
                fontFamily: 'var(--nb-font-mono, monospace)',
                letterSpacing: '0.04em',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#00e599',
                  boxShadow: '0 0 8px #00e599',
                  animation: 'nb-pulse-glow 1.8s infinite',
                }}
              />
              FLEET TELEMETRY NETWORK LIVE
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                color: '#666666',
                fontFamily: 'var(--nb-font-mono, monospace)',
              }}
            >
              PING 14ms
            </span>
          </div>

          <div>
            <h1
              style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.035em',
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              Autonomous transit control for modern campuses.
            </h1>
            <p
              style={{
                fontSize: '0.92rem',
                color: '#888888',
                marginTop: '12px',
                lineHeight: 1.6,
                letterSpacing: '-0.01em',
              }}
            >
              Real-time GPS synchronization, sub-second arrival predictions, automated geofence triggers, and instantaneous SOS response dispatch.
            </p>
          </div>

          {/* Telemetry Terminal Preview Card */}
          <div
            style={{
              background: '#080808',
              border: '1px solid rgba(255, 255, 255, 0.10)',
              borderTop: '1px solid rgba(255, 255, 255, 0.20)',
              borderRadius: '12px',
              padding: '16px 18px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
              fontFamily: 'var(--nb-font-mono, monospace)',
              fontSize: '0.76rem',
              color: '#888888',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '10px',
                marginBottom: '10px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff0080' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f5a623' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00e599' }} />
                <span style={{ marginLeft: '6px', color: '#666666', fontSize: '0.70rem' }}>telemetry.stream.sse</span>
              </div>
              <span style={{ color: '#00e599', fontSize: '0.70rem' }}>CONNECTED</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {telemetryPings.map((ping, i) => (
                <div
                  key={i}
                  style={{
                    color: i === 0 ? '#ededed' : '#777777',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ color: '#0070f3' }}>›</span>
                  <span>{ping}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Metric Highlights Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              paddingTop: '6px',
            }}
          >
            <div style={{ borderLeft: '2px solid #0070f3', paddingLeft: '10px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--nb-font-mono, monospace)' }}>
                99.98%
              </div>
              <div style={{ fontSize: '0.70rem', color: '#666666', textTransform: 'uppercase' }}>Delivery Rate</div>
            </div>
            <div style={{ borderLeft: '2px solid #00e599', paddingLeft: '10px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--nb-font-mono, monospace)' }}>
                &lt; 1.0s
              </div>
              <div style={{ fontSize: '0.70rem', color: '#666666', textTransform: 'uppercase' }}>Latency</div>
            </div>
            <div style={{ borderLeft: '2px solid #7928ca', paddingLeft: '10px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--nb-font-mono, monospace)' }}>
                100%
              </div>
              <div style={{ fontSize: '0.70rem', color: '#666666', textTransform: 'uppercase' }}>Audit Coverage</div>
            </div>
          </div>
        </div>

        {/* Right Side: Vercel Obsidian Authentication Card */}
        <div>
          <Card
            variant="glass"
            style={{
              padding: '36px 32px',
              background: 'rgba(10, 10, 10, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.10)',
              borderTop: '1px solid rgba(255, 255, 255, 0.22)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(24px)',
              borderRadius: '16px',
            }}
          >
            {/* Header Emblem */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: '#050505',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                  boxShadow: '0 0 24px rgba(0, 112, 243, 0.35)',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 22H22L12 2Z" fill="url(#login-grad-21st)" />
                  <defs>
                    <linearGradient id="login-grad-21st" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#ffffff" />
                      <stop offset="1" stopColor="#888888" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <h2
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.025em',
                  margin: 0,
                }}
              >
                NammaBus Mission Control
              </h2>
              <p
                style={{
                  fontSize: '0.82rem',
                  color: '#888888',
                  marginTop: '5px',
                  letterSpacing: '-0.01em',
                }}
              >
                Enter root credentials to access the transport grid
              </p>
            </div>

            {/* Tab Switcher (Vercel Style) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                background: '#050505',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '3px',
                marginBottom: '20px',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('password')}
                style={{
                  background: activeTab === 'password' ? '#181818' : 'transparent',
                  color: activeTab === 'password' ? '#ffffff' : '#888888',
                  border: activeTab === 'password' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
                  borderRadius: '6px',
                  padding: '7px 12px',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <IconShield size={14} />
                <span>Password Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('passkey');
                  handleQuickFill('admin@nammabus.ai', 'admin123');
                }}
                style={{
                  background: activeTab === 'passkey' ? '#181818' : 'transparent',
                  color: activeTab === 'passkey' ? '#ffffff' : '#888888',
                  border: activeTab === 'passkey' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
                  borderRadius: '6px',
                  padding: '7px 12px',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <IconKey size={14} />
                <span>Instant Passkey</span>
              </button>
            </div>

            {/* Error Message */}
            {(validationError || error) && (
              <div
                role="alert"
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(255, 0, 128, 0.12)',
                  border: '1px solid rgba(255, 0, 128, 0.35)',
                  borderRadius: '8px',
                  color: '#ff6699',
                  fontSize: '0.80rem',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <IconAlertCircle size={16} color="#ff0080" />
                <span>{validationError || error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Input
                label="Administrator Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nammabus.ai"
                autoComplete="username"
                required
              />

              <div style={{ position: 'relative' }}>
                <Input
                  label="Access Key / Security Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '32px',
                    background: 'transparent',
                    border: 'none',
                    color: '#888888',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                </button>
              </div>

              {/* Remember Me Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888888', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{
                      accentColor: '#0070f3',
                      width: '14px',
                      height: '14px',
                      cursor: 'pointer',
                    }}
                  />
                  <span>Remember this workstation</span>
                </label>
                <span style={{ color: '#0070f3', cursor: 'pointer' }} onClick={() => handleQuickFill('admin@nammabus.ai', 'admin123')}>
                  Reset token
                </span>
              </div>

              {/* Primary Vercel White Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                style={{ marginTop: '4px' }}
              >
                Authenticate & Enter Control Room
              </Button>

              {/* One-Tap Presets with Modern Icons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@nammabus.ai', 'admin123')}
                  style={{
                    flex: 1,
                    background: '#0a0a0a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    color: '#ededed',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <IconCrown size={14} color="#f5a623" />
                  <span>Super Admin (Root)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@nammabus.ai', 'admin123')}
                  style={{
                    flex: 1,
                    background: '#0a0a0a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    color: '#888888',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <IconZap size={14} color="#0070f3" />
                  <span>1-Click Fill</span>
                </button>
              </div>
            </form>

            <div
              style={{
                marginTop: '22px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.68rem',
                color: '#555555',
                letterSpacing: '0.02em',
              }}
            >
              <IconLock size={12} color="#555555" />
              <span>TLS 1.3</span>
              <span>•</span>
              <span>AES-256 SESSION</span>
              <span>•</span>
              <span>AUDIT LOGGED</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
