import React, { useState } from 'react';
import { Card, Badge, Button, Input, Modal } from '@nammabus/ui-components';
import { PageHeader } from '../common/PageHeader';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { BusEntity } from '@nammabus/shared-types';

interface BusManagementProps {
  buses: BusEntity[];
  onAddBus: (bus: { busNumber: string; registrationNumber: string; capacity: number }) => Promise<unknown>;
  onUpdateBus: (id: string, bus: Partial<BusEntity>) => Promise<unknown>;
  onToggleStatus: (id: string) => Promise<unknown>;
  onDeleteBus: (id: string) => Promise<unknown>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const BusManagement: React.FC<BusManagementProps> = ({
  buses,
  onAddBus,
  onUpdateBus,
  onToggleStatus,
  onDeleteBus,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<BusEntity | null>(null);
  const [viewingBus, setViewingBus] = useState<BusEntity | null>(null);
  const [deactivatingBusId, setDeactivatingBusId] = useState<string | null>(null);
  const [deletingBusId, setDeletingBusId] = useState<string | null>(null);

  // Form states
  const [busNumber, setBusNumber] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [capacity, setCapacity] = useState('54');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filtering
  const filteredBuses = buses.filter((bus) => {
    const matchesSearch =
      bus.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bus.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && bus.isActive) ||
      (statusFilter === 'INACTIVE' && !bus.isActive);
    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    setBusNumber('');
    setRegNumber('');
    setCapacity('54');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (bus: BusEntity) => {
    setEditingBus(bus);
    setBusNumber(bus.busNumber);
    setRegNumber(bus.registrationNumber);
    setCapacity(bus.capacity.toString());
    setFormError(null);
  };

  const validateForm = () => {
    if (!busNumber.trim()) return 'Bus identifier (e.g. NB-03) is required.';
    if (!regNumber.trim()) return 'RTO registration number (e.g. KA-01-EQ-3096) is required.';
    const capNum = parseInt(capacity, 10);
    if (isNaN(capNum) || capNum < 10 || capNum > 100) {
      return 'Seating capacity must be a realistic number between 10 and 100 seats.';
    }
    return null;
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }

    try {
      setSubmitting(true);
      await onAddBus({
        busNumber: busNumber.trim().toUpperCase(),
        registrationNumber: regNumber.trim().toUpperCase(),
        capacity: parseInt(capacity, 10),
      });
      setIsAddModalOpen(false);
      showToast(`Bus ${busNumber.toUpperCase()} added to fleet successfully.`);
    } catch {
      showToast('Failed to register bus.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBus) return;
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }

    try {
      setSubmitting(true);
      await onUpdateBus(editingBus.id, {
        busNumber: busNumber.trim().toUpperCase(),
        registrationNumber: regNumber.trim().toUpperCase(),
        capacity: parseInt(capacity, 10),
      });
      setEditingBus(null);
      showToast(`Bus ${busNumber.toUpperCase()} details updated.`);
    } catch {
      showToast('Failed to update bus.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmToggle = async () => {
    if (!deactivatingBusId) return;
    const target = buses.find((b) => b.id === deactivatingBusId);
    await onToggleStatus(deactivatingBusId);
    showToast(
      `Bus ${target?.busNumber} marked as ${target?.isActive ? 'Inactive' : 'Active'}.`
    );
    setDeactivatingBusId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingBusId) return;
    const target = buses.find((b) => b.id === deletingBusId);
    await onDeleteBus(deletingBusId);
    showToast(`Bus ${target?.busNumber} removed from system.`);
    setDeletingBusId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Bus Fleet Management"
        description="Register, inspect, and manage college transport vehicles and operational readiness"
        badge={
          <Badge variant="neutral" size="sm">
            {buses.length} TOTAL BUSES
          </Badge>
        }
        actions={
          <Button variant="primary" size="sm" onClick={handleOpenAdd}>
            + Add New Bus
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <Card variant="surface" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <Input
              placeholder="Search by bus number or registration plate..."
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
              All ({buses.length})
            </Button>
            <Button
              variant={statusFilter === 'ACTIVE' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('ACTIVE')}
            >
              Active ({buses.filter((b) => b.isActive).length})
            </Button>
            <Button
              variant={statusFilter === 'INACTIVE' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('INACTIVE')}
            >
              Inactive ({buses.filter((b) => !b.isActive).length})
            </Button>
          </div>
        </div>
      </Card>

      {/* Fleet Buses Table */}
      <Card variant="surface" style={{ padding: '20px' }}>
        {filteredBuses.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--nb-text-muted, #64748b)',
            }}
          >
            No fleet vehicles match the active search criteria.
          </div>
        ) : (
          <div className="nb-table-container">
            <table className="nb-table">
              <thead>
                <tr>
                  <th>Bus Code</th>
                  <th>RTO Registration</th>
                  <th>Capacity</th>
                  <th>Assigned Route</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuses.map((bus) => (
                  <tr key={bus.id}>
                    <td>
                      <button
                        type="button"
                        onClick={() => setViewingBus(bus)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontWeight: 800,
                          color: '#fbbf24',
                          cursor: 'pointer',
                          fontSize: '0.92rem',
                          padding: 0,
                          textDecoration: 'underline',
                        }}
                      >
                        {bus.busNumber}
                      </button>
                    </td>
                    <td style={{ fontFamily: 'var(--nb-font-mono)', fontSize: '0.86rem' }}>
                      {bus.registrationNumber}
                    </td>
                    <td>{bus.capacity} Seats</td>
                    <td style={{ color: '#38bdf8' }}>Greenfield Express</td>
                    <td>
                      <Badge variant={bus.isActive ? 'active' : 'neutral'} size="sm">
                        {bus.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </td>
                    <td style={{ color: 'var(--nb-text-muted, #64748b)', fontSize: '0.80rem' }}>
                      {new Date(bus.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(bus)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant={bus.isActive ? 'ghost' : 'outline'}
                          size="sm"
                          onClick={() => setDeactivatingBusId(bus.id)}
                          style={{
                            color: bus.isActive ? '#f87171' : '#10b981',
                          }}
                        >
                          {bus.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingBusId(bus.id)}
                          style={{ color: 'var(--nb-text-muted, #64748b)' }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Bus Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New College Bus"
        description="Add a registered transit vehicle to the college transport fleet"
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
            label="Bus Identifier / Fleet Code"
            placeholder="e.g. NB-03"
            value={busNumber}
            onChange={(e) => setBusNumber(e.target.value)}
            required
          />

          <Input
            label="Official RTO Registration Number"
            placeholder="e.g. KA-01-EQ-3096"
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value)}
            required
          />

          <Input
            label="Passenger Seating Capacity"
            type="number"
            placeholder="54"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              Save Vehicle to Fleet
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Bus Modal */}
      <Modal
        isOpen={!!editingBus}
        onClose={() => setEditingBus(null)}
        title={`Edit Bus: ${editingBus?.busNumber}`}
        description="Modify fleet code, registration number or seating specifications"
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
            label="Bus Identifier / Fleet Code"
            value={busNumber}
            onChange={(e) => setBusNumber(e.target.value)}
            required
          />

          <Input
            label="Official RTO Registration Number"
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value)}
            required
          />

          <Input
            label="Passenger Seating Capacity"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditingBus(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Bus Details Modal */}
      <Modal
        isOpen={!!viewingBus}
        onClose={() => setViewingBus(null)}
        title={`Bus Details: ${viewingBus?.busNumber}`}
        description="Comprehensive vehicle telemetry and assignment status"
      >
        {viewingBus && (
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
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Fleet Identifier</span>
                <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '1.1rem' }}>
                  {viewingBus.busNumber}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>RTO Registration</span>
                <div style={{ fontFamily: 'var(--nb-font-mono)', fontWeight: 700 }}>
                  {viewingBus.registrationNumber}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Seating Capacity</span>
                <div style={{ fontWeight: 700 }}>{viewingBus.capacity} passengers</div>
              </div>

              <div>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Status</span>
                <div>
                  <Badge variant={viewingBus.isActive ? 'active' : 'neutral'} size="sm">
                    {viewingBus.isActive ? 'ACTIVE IN SERVICE' : 'DEACTIVATED'}
                  </Badge>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <Button variant="secondary" size="sm" onClick={() => setViewingBus(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialog for Deactivate/Activate */}
      <ConfirmDialog
        isOpen={!!deactivatingBusId}
        title="Confirm Fleet Status Modification"
        description="Changing vehicle operational status affects route dispatch scheduling."
        confirmLabel="Update Operational Status"
        variant="amber"
        onConfirm={handleConfirmToggle}
        onClose={() => setDeactivatingBusId(null)}
      />

      {/* Confirmation Dialog for Delete */}
      <ConfirmDialog
        isOpen={!!deletingBusId}
        title="Confirm Vehicle Deletion"
        description="Are you sure you want to permanently remove this bus from the transport fleet? This cannot be undone."
        confirmLabel="Permanently Delete Bus"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingBusId(null)}
      />
    </div>
  );
};
