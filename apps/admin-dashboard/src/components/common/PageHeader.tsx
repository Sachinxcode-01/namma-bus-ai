import React from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  actions,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '4px',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1
            style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: '#f8fafc',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h1>
          {badge}
        </div>
        <p
          style={{
            fontSize: '0.84rem',
            color: 'var(--nb-text-secondary, #94a3b8)',
            marginTop: '4px',
          }}
        >
          {description}
        </p>
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
};
