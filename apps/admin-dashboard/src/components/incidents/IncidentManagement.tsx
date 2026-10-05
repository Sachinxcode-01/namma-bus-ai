import React, { useState } from 'react';
import { Card, Badge, Button, Input, Modal, Select } from '@nammabus/ui-components';
import { PageHeader } from '../common/PageHeader';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  IncidentEntity,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
} from '@nammabus/shared-types';

interface IncidentManagementProps {
  incidents: IncidentEntity[];
  onResolveIncident: (id: string) => Promise<void> | void;
  onCreateIncident: (data: {
    type: IncidentEntity['type'];
    severity: IncidentEntity['severity'];
    description: string;
    tripId?: string;
  }) => Promise<unknown>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const IncidentManagement: React.FC<IncidentManagementProps> = ({
  incidents,
  onResolveIncident,
  onCreateIncident,
  showToast,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [resolvingIncidentId, setResolvingIncidentId] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Form states
  const [type, setType] = useState<IncidentType>(IncidentType.BREAKDOWN);
  const [severity, setSeverity] = useState<IncidentSeverity>(IncidentSeverity.HIGH);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredIncidents = incidents.filter((inc) => {
    if (statusFilter === 'OPEN') return inc.status !== IncidentStatus.RESOLVED;
    if (statusFilter === 'RESOLVED') return inc.status === IncidentStatus.RESOLVED;
    return true;
  });

  const criticalOpen = incidents.filter(
    (i) => i.status !== IncidentStatus.RESOLVED && i.severity === IncidentSeverity.CRITICAL
  );

  const handleConfirmResolve = async () => {
    if (!resolvingIncidentId) return;
    await onResolveIncident(resolvingIncidentId);
    showToast('Incident resolved and marked in audit logs.');
    setResolvingIncidentId(null);
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast('Please provide a description of the incident.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await onCreateIncident({
        type,
        severity,
        description: description.trim(),
        tripId: 'trip-1',
      });
      setIsReportOpen(false);
      setDescription('');
      showToast('Incident logged into emergency triage console.');
    } catch {
      showToast('Failed to log incident.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityBadge = (sev: IncidentSeverity) => {
    switch (sev) {
      case IncidentSeverity.CRITICAL:
        return (
          <Badge variant="danger" size="sm" pulse>
            CRITICAL SOS
          </Badge>
        );
      case IncidentSeverity.HIGH:
        return (
          <Badge variant="warning" size="sm">
            HIGH
          </Badge>
        );
      case IncidentSeverity.MEDIUM:
        return (
          <Badge variant="warning" size="sm">
            MEDIUM
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            LOW
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case IncidentStatus.OPEN:
        return (
          <Badge variant="danger" size="sm">
            OPEN (NEW)
          </Badge>
        );
      case IncidentStatus.IN_PROGRESS:
        return (
          <Badge variant="warning" size="sm">
            IN PROGRESS
          </Badge>
        );
      case IncidentStatus.RESOLVED:
        return (
          <Badge variant="completed" size="sm">
            RESOLVED
          </Badge>
        );
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Incident & Safety Response Console"
        description="Monitor driver distress signals, breakdowns, route anomalies, and emergency SOS"
        badge={
          <Badge variant={criticalOpen.length > 0 ? 'danger' : 'neutral'} size="sm">
            {incidents.filter((i) => i.status !== IncidentStatus.RESOLVED).length} ACTIVE INCIDENT{incidents.length > 1 ? 'S' : ''}
          </Badge>
        }
        actions={
          <Button variant="danger" size="sm" onClick={() => setIsReportOpen(true)}>
            + Log Operational Incident
          </Button>
        }
      />

      {/* High-visibility Critical SOS Warning Banner */}
      {criticalOpen.length > 0 && (
        <div
          role="alert"
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.35) 100%)',
            border: '1.5px solid rgba(239, 68, 68, 0.65)',
            boxShadow: '0 0 24px rgba(239, 68, 68, 0.4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '2rem', lineHeight: 1 }}>🚨</span>
            <div>
              <div style={{ fontWeight: 800, color: '#fecaca', fontSize: '1.05rem' }}>
                ACTIVE EMERGENCY SOS SIGNAL DETECTED
              </div>
              <div style={{ fontSize: '0.84rem', color: '#fca5a5', marginTop: '2px' }}>
                Driver or vehicle triggered priority emergency beacon. Campus security and medical team alerted.
              </div>
            </div>
          </div>
          <Badge variant="danger" size="sm" pulse>
            REQUIRES IMMEDIATE RESPONSE
          </Badge>
        </div>
      )}

      {/* Filter Bar */}
      <Card variant="surface" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant={statusFilter === 'ALL' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('ALL')}
          >
            All Incidents ({incidents.length})
          </Button>
          <Button
            variant={statusFilter === 'OPEN' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('OPEN')}
          >
            Open / Active ({incidents.filter((i) => i.status !== IncidentStatus.RESOLVED).length})
          </Button>
          <Button
            variant={statusFilter === 'RESOLVED' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('RESOLVED')}
          >
            Resolved ({incidents.filter((i) => i.status === IncidentStatus.RESOLVED).length})
          </Button>
        </div>
      </Card>

      {/* Incidents Table */}
      <Card variant="surface" style={{ padding: '20px' }}>
        {filteredIncidents.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: '#34d399',
              fontWeight: 600,
            }}
          >
            ✓ No incidents matching selected filter. All operations normal.
          </div>
        ) : (
          <div className="nb-table-container">
            <table className="nb-table">
              <thead>
                <tr>
                  <th>Incident ID</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Reported Time</th>
                  <th style={{ textAlign: 'right' }}>Resolution Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((inc) => (
                  <tr key={inc.id}>
                    <td style={{ fontFamily: 'var(--nb-font-mono)', fontSize: '0.82rem' }}>
                      {inc.id}
                    </td>
                    <td style={{ fontWeight: 700, color: '#f8fafc' }}>{inc.type}</td>
                    <td>{getSeverityBadge(inc.severity)}</td>
                    <td style={{ maxWidth: '320px', lineHeight: 1.4 }}>{inc.description}</td>
                    <td>{getStatusBadge(inc.status)}</td>
                    <td style={{ color: 'var(--nb-text-muted, #64748b)', fontSize: '0.80rem' }}>
                      {new Date(inc.createdAt).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {inc.status !== IncidentStatus.RESOLVED ? (
                        <Button
                          variant="amber"
                          size="sm"
                          onClick={() => setResolvingIncidentId(inc.id)}
                        >
                          Mark Resolved
                        </Button>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.78rem',
                            color: '#10b981',
                            fontWeight: 700,
                          }}
                        >
                          Resolved ✓
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Confirmation Dialog for Resolving Incident */}
      <ConfirmDialog
        isOpen={!!resolvingIncidentId}
        title="Resolve Safety Incident"
        description="Verify that corrective operational or medical actions were completed. This will close the incident ticket."
        confirmLabel="Confirm Incident Resolved"
        variant="amber"
        onConfirm={handleConfirmResolve}
        onClose={() => setResolvingIncidentId(null)}
      />

      {/* Report New Incident Modal */}
      <Modal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        title="Log Operational Incident"
        description="Record driver dispatch call, mechanical issue or route emergency"
      >
        <form onSubmit={handleSaveReport} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Select
            label="Incident Classification"
            value={type}
            onChange={(e) => setType(e.target.value as IncidentType)}
            options={[
              { value: IncidentType.BREAKDOWN, label: 'Vehicle Breakdown / Mechanical Failure' },
              { value: IncidentType.DELAY, label: 'Severe Traffic / Schedule Delay' },
              { value: IncidentType.ACCIDENT, label: 'Road Accident / Collision' },
              { value: IncidentType.SOS, label: 'Emergency Distress SOS Beacon' },
              { value: IncidentType.OTHER, label: 'Other Operational Anomaly' },
            ]}
          />

          <Select
            label="Severity Rating"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
            options={[
              { value: IncidentSeverity.CRITICAL, label: 'CRITICAL (Immediate safety hazard)' },
              { value: IncidentSeverity.HIGH, label: 'HIGH (Route blocked or delayed >30 mins)' },
              { value: IncidentSeverity.MEDIUM, label: 'MEDIUM (Minor breakdown / delayed 15 mins)' },
              { value: IncidentSeverity.LOW, label: 'LOW (Informational)' },
            ]}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--nb-text-secondary, #94a3b8)' }}>
              Incident Description & Location Details
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Engine overheating near Ring Road junction; standby bus dispatched."
              required
              style={{
                width: '100%',
                padding: '10px 14px',
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsReportOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="sm" loading={submitting}>
              Log Incident Now
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
