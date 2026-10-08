import React, { useState } from 'react';
import { Card, Badge, Button, Input, Modal, Select } from '@nammabus/ui-components';
import { PageHeader } from '../common/PageHeader';
import { ExtendedDriverProfile, DriverDutyStatus } from '../../types';

interface DriverManagementProps {
  drivers: ExtendedDriverProfile[];
  onAddDriver: (data: { name: string; licenseNumber: string; phone: string; assignedBus?: string }) => void;
  onUpdateDriver: (id: string, partial: Partial<ExtendedDriverProfile>) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const DriverManagement: React.FC<DriverManagementProps> = ({
  drivers,
  onAddDriver,
  onUpdateDriver,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DriverDutyStatus>('ALL');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<ExtendedDriverProfile | null>(null);
  const [viewingDriver, setViewingDriver] = useState<ExtendedDriverProfile | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [dutyStatus, setDutyStatus] = useState<DriverDutyStatus>('STANDBY');
  const [assignedBus, setAssignedBus] = useState('NB-01');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || driver.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    setName('');
    setLicenseNumber('');
    setPhone('');
    setAssignedBus('NB-01');
    setDutyStatus('STANDBY');
    setFormError(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (driver: ExtendedDriverProfile) => {
    setEditingDriver(driver);
    setName(driver.name);
    setLicenseNumber(driver.licenseNumber);
    setPhone(driver.phone);
    setDutyStatus(driver.status || 'STANDBY');
    setAssignedBus(driver.assignedBus || 'NB-01');
    setFormError(null);
  };

  const validateForm = () => {
    if (!name.trim()) return 'Driver full name is required.';
    if (!licenseNumber.trim()) return 'Commercial driver license number is required.';
    if (!phone.trim() || phone.trim().length < 8) {
      return 'Valid contact phone number is required (at least 8 digits).';
    }
    return null;
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }

    onAddDriver({
      name: name.trim(),
      licenseNumber: licenseNumber.trim().toUpperCase(),
      phone: phone.trim(),
      assignedBus,
    });
    setIsAddOpen(false);
    showToast(`Driver ${name.trim()} enrolled successfully.`);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }

    try {
      setSubmitting(true);
      await onUpdateDriver(editingDriver.id, {
        name: name.trim(),
        licenseNumber: licenseNumber.trim().toUpperCase(),
        phone: phone.trim(),
        status: dutyStatus,
        assignedBus,
      });
      setEditingDriver(null);
      showToast(`Driver ${name.trim()} profile updated.`);
    } catch {
      showToast('Failed to update driver.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status?: DriverDutyStatus) => {
    switch (status) {
      case 'ON_DUTY':
        return (
          <Badge variant="active" size="sm" pulse>
            ON DUTY
          </Badge>
        );
      case 'OFF_DUTY':
        return (
          <Badge variant="neutral" size="sm">
            OFF DUTY
          </Badge>
        );
      default:
        return (
          <Badge variant="warning" size="sm">
            STANDBY
          </Badge>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Authorized Driver Roster"
        description="Monitor staff duty allocations, commercial licenses, and assigned fleet vehicles"
        badge={
          <Badge variant="neutral" size="sm">
            {drivers.length} ENROLLED DRIVERS
          </Badge>
        }
        actions={
          <Button variant="primary" size="sm" onClick={handleOpenAdd}>
            + Enroll New Driver
          </Button>
        }
      />

      {/* Filter and Search */}
      <Card variant="surface" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <Input
              placeholder="Search by driver name, license, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <Button
              variant={statusFilter === 'ALL' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('ALL')}
            >
              All ({drivers.length})
            </Button>
            <Button
              variant={statusFilter === 'ON_DUTY' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('ON_DUTY')}
            >
              On Duty ({drivers.filter((d) => d.status === 'ON_DUTY').length})
            </Button>
            <Button
              variant={statusFilter === 'STANDBY' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('STANDBY')}
            >
              Standby ({drivers.filter((d) => d.status === 'STANDBY').length})
            </Button>
          </div>
        </div>
      </Card>

      {/* Drivers Table */}
      <Card variant="surface" style={{ padding: '20px' }}>
        {filteredDrivers.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--nb-text-muted, #64748b)',
            }}
          >
            No driver records found matching query.
          </div>
        ) : (
          <div className="nb-table-container">
            <table className="nb-table">
              <thead>
                <tr>
                  <th>Driver Name</th>
                  <th>Commercial License</th>
                  <th>Contact Phone</th>
                  <th>Assigned Vehicle</th>
                  <th>Duty Status</th>
                  <th>Enrolled</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => (
                  <tr key={driver.id}>
                    <td>
                      <button
                        type="button"
                        onClick={() => setViewingDriver(driver)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontWeight: 700,
                          color: '#f8fafc',
                          cursor: 'pointer',
                          fontSize: '0.90rem',
                          padding: 0,
                          textDecoration: 'underline',
                        }}
                      >
                        {driver.name}
                      </button>
                    </td>
                    <td style={{ fontFamily: 'var(--nb-font-mono)', fontSize: '0.84rem' }}>
                      {driver.licenseNumber}
                    </td>
                    <td style={{ color: '#38bdf8' }}>{driver.phone}</td>
                    <td>
                      <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                        {driver.assignedBus || 'NB-01'}
                      </span>
                    </td>
                    <td>{getStatusBadge(driver.status)}</td>
                    <td style={{ color: 'var(--nb-text-muted, #64748b)', fontSize: '0.80rem' }}>
                      {new Date(driver.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(driver)}
                      >
                        Edit / Reassign
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Driver Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Enroll Transport Driver"
        description="Register a professional college driver with license verification"
      >
        <form onSubmit={handleSaveAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {formError && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                borderRadius: '8px',
                color: '#fca5a5',
                fontSize: '0.82rem',
              }}
            >
              ⚠️ {formError}
            </div>
          )}

          <Input
            label="Full Legal Name"
            placeholder="e.g. Ramesh Kumar"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="RTO Commercial Driving License"
            placeholder="e.g. KA-05-2020-0098"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            required
          />

          <Input
            label="Mobile Phone Number"
            placeholder="e.g. +91 9845012345"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <Select
            label="Assigned Fleet Bus"
            value={assignedBus}
            onChange={(e) => setAssignedBus(e.target.value)}
            options={[
              { value: 'NB-01', label: 'NB-01 (Greenfield Express)' },
              { value: 'NB-02', label: 'NB-02 (Hostel Shuttle)' },
              { value: 'Unassigned', label: 'Unassigned (Reserve Pool)' },
            ]}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Enroll Driver
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Driver Modal */}
      <Modal
        isOpen={!!editingDriver}
        onClose={() => setEditingDriver(null)}
        title={`Edit Driver: ${editingDriver?.name}`}
        description="Update contact, duty assignment, or vehicle allocation"
      >
        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {formError && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                borderRadius: '8px',
                color: '#fca5a5',
                fontSize: '0.82rem',
              }}
            >
              ⚠️ {formError}
            </div>
          )}

          <Input
            label="Full Legal Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Commercial License Number"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            required
          />

          <Input
            label="Contact Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <Select
            label="Duty Status"
            value={dutyStatus}
            onChange={(e) => setDutyStatus(e.target.value as DriverDutyStatus)}
            options={[
              { value: 'ON_DUTY', label: 'On Duty (Active Shifts)' },
              { value: 'STANDBY', label: 'Standby (On Call)' },
              { value: 'OFF_DUTY', label: 'Off Duty' },
            ]}
          />

          <Select
            label="Allocated Vehicle"
            value={assignedBus}
            onChange={(e) => setAssignedBus(e.target.value)}
            options={[
              { value: 'NB-01', label: 'NB-01 (Greenfield Express)' },
              { value: 'NB-02', label: 'NB-02 (Hostel Shuttle)' },
              { value: 'Unassigned', label: 'Unassigned' },
            ]}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingDriver(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              Save Updates
            </Button>
          </div>
        </form>
      </Modal>

      {/* Driver Details Modal */}
      <Modal
        isOpen={!!viewingDriver}
        onClose={() => setViewingDriver(null)}
        title={`Driver Profile: ${viewingDriver?.name}`}
        description="Commercial credentials and operations history"
      >
        {viewingDriver && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Driver Name</span>
                <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '1.05rem' }}>
                  {viewingDriver.name}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>License</span>
                <div style={{ fontFamily: 'var(--nb-font-mono)', fontWeight: 700 }}>
                  {viewingDriver.licenseNumber}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Phone Number</span>
                <div style={{ fontWeight: 700, color: '#38bdf8' }}>{viewingDriver.phone}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Duty Status</span>
                <div>{getStatusBadge(viewingDriver.status)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <Button variant="secondary" size="sm" onClick={() => setViewingDriver(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
