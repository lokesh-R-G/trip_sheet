import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { useFleetStore } from '../../services/store';
import { EmploymentStatus } from '../../types';

interface CreateDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDriverCreated?: (driverId: string) => void;
}

export const CreateDriverModal: React.FC<CreateDriverModalProps> = ({
  isOpen,
  onClose,
  onDriverCreated
}) => {
  const { addDriver, vehicles, salaryStructures } = useFleetStore();

  const [driverNumber, setDriverNumber] = useState(`DRV-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('2030-12-31');
  const [status, setStatus] = useState<EmploymentStatus>('active');
  const [assignedVehicleId, setAssignedVehicleId] = useState('');
  const [salaryStructureId, setSalaryStructureId] = useState(salaryStructures[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!driverNumber.trim() || !fullName.trim() || !phone.trim() || !licenseNumber.trim()) {
      setErrorMessage('Please fill in all mandatory fields (Driver Number, Name, Phone, and License Number).');
      return;
    }

    const assignedVehicle = vehicles.find(v => v.id === assignedVehicleId);
    const assignedSalary = salaryStructures.find(s => s.id === salaryStructureId);

    const result = addDriver({
      driverNumber: driverNumber.trim(),
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim(),
      joiningDate,
      licenseNumber: licenseNumber.trim(),
      licenseExpiry,
      status,
      currentVehicleId: assignedVehicleId || undefined,
      assignedVehicleReg: assignedVehicle?.registrationNumber,
      salaryStructureId: salaryStructureId || undefined,
      salaryStructureName: assignedSalary?.name,
      notes: notes.trim() || undefined
    });

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to create driver.');
      return;
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Driver Profile"
      subtitle="Register an operational commercial fleet pilot with license verification and salary attribution."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-medium">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Driver Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={driverNumber}
              onChange={e => setDriverNumber(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-gray-50/50"
              placeholder="e.g. DRV-2026-009"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Full Legal Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              placeholder="e.g. Ananth Narayan"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Contact Phone <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              placeholder="+91 98765 43210"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              placeholder="optional@fleet.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Driving License Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={licenseNumber}
              onChange={e => setLicenseNumber(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              placeholder="e.g. TN-04-2018-0081290"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">License Expiry Date</label>
            <input
              type="date"
              value={licenseExpiry}
              onChange={e => setLicenseExpiry(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Joining Date</label>
            <input
              type="date"
              value={joiningDate}
              onChange={e => setJoiningDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Employment Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as EmploymentStatus)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white"
            >
              <option value="active">Active Pilot</option>
              <option value="on_leave">On Authorized Leave</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Assign Salary Structure</label>
            <select
              value={salaryStructureId}
              onChange={e => setSalaryStructureId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white"
            >
              <option value="">Select Salary Structure...</option>
              {salaryStructures.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Initial Vehicle Assignment</label>
            <select
              value={assignedVehicleId}
              onChange={e => setAssignedVehicleId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white"
            >
              <option value="">Unassigned (Floating Pool)</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} ({v.vehicleType} - {v.tonnage}T)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Residential Address</label>
          <textarea
            rows={2}
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            placeholder="Door No, Street, City, State, PIN"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Operational Remarks / Background</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            placeholder="Special certifications, hazardous materials endorsement, etc."
          />
        </div>

        <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
          >
            Save Driver Profile
          </button>
        </div>
      </form>
    </Modal>
  );
};
