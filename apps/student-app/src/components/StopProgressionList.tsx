import React from 'react';
import { Card, Badge } from '@nammabus/ui-components';
import { StopEtaDto } from '@nammabus/shared-types';

export interface StopProgressionListProps {
  stops: StopEtaDto[];
  selectedStopId?: string | null;
  onSelectStop: (stopId: string) => void;
}

export const StopProgressionList: React.FC<StopProgressionListProps> = ({
  stops,
  selectedStopId,
  onSelectStop,
}) => {
  return (
    <Card variant="surface" style={{ padding: '16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#f8fafc' }}>
            Route Progression
          </h3>
          <p style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
            Tap any stop to set your boarding alert
          </p>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
          {stops.filter((s) => s.status === 'PASSED').length}/{stops.length} STOPS
        </span>
      </div>

      <div className="nb-timeline">
        {stops.map((stop, idx) => {
          const isSelected = selectedStopId === stop.stopId;
          const isPassed = stop.status === 'PASSED';
          const isApproaching = stop.status === 'APPROACHING' || stop.status === 'NEXT';

          return (
            <div
              key={stop.stopId}
              className="nb-timeline-item"
              onClick={() => onSelectStop(stop.stopId)}
              style={{
                cursor: 'pointer',
                opacity: isPassed ? 0.6 : 1,
              }}
            >
              <div
                className={`nb-timeline-node ${
                  isSelected ? 'target' : isApproaching ? 'approaching' : isPassed ? 'passed' : ''
                }`}
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isSelected
                    ? 'rgba(59, 130, 246, 0.12)'
                    : 'rgba(255, 255, 255, 0.02)',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: isSelected
                    ? '1px solid rgba(59, 130, 246, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc' }}>
                      {idx + 1}. {stop.stopName}
                    </span>
                    {isSelected && (
                      <Badge variant="scheduled" size="sm">
                        MY STOP
                      </Badge>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                    {isPassed
                      ? 'Departed'
                      : stop.distanceRemainingMeters
                      ? `${Math.round(stop.distanceRemainingMeters)}m remaining`
                      : 'Scheduled stop'}
                  </div>
                </div>

                <div>
                  {isPassed ? (
                    <span style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 700 }}>
                      ✓
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.84rem',
                        fontWeight: 800,
                        color: isApproaching ? '#fbbf24' : '#60a5fa',
                      }}
                    >
                      {stop.estimatedMinutes <= 1 ? '<1m' : `${stop.estimatedMinutes}m`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
