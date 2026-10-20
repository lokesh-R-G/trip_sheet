import React, { useState } from 'react';
import { useFleetStore } from '../../services/store';
import { SalaryStructure, SalaryComponent } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Plus,
  BadgeDollarSign,
  UserCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

export const SalaryStructureView: React.FC = () => {
  const { salaryStructures, drivers, addSalaryStructure, assignSalaryStructure } = useFleetStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);

  // Form states for creating structure
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [components, setComponents] = useState<SalaryComponent[]>([
    {
      id: 'c1',
      name: 'Basic Salary',
      type: 'earning',
      calculationType: 'fixed',
      amountOrPercentage: 20000,
      applicabilityRules: 'Monthly baseline earnings',
      isActive: true
    },
    {
      id: 'c2',
      name: 'House Rent Allowance (HRA)',
      type: 'earning',
      calculationType: 'fixed',
      amountOrPercentage: 4000,
      applicabilityRules: 'Standard housing allowance',
      isActive: true
    },
    {
      id: 'c3',
      name: 'Trip Bata Allowance',
      type: 'earning',
      calculationType: 'fixed',
      amountOrPercentage: 3500,
      applicabilityRules: 'Per diem per trip',
      isActive: true
    },
    {
      id: 'c4',
      name: 'Driver Welfare Fund',
      type: 'deduction',
      calculationType: 'fixed',
      amountOrPercentage: 500,
      applicabilityRules: 'Safety and welfare deduction',
      isActive: true
    }
  ]);

  // Form state for assignment
  const [assignDriverId, setAssignDriverId] = useState(drivers[0]?.id || '');
  const [assignStructureId, setAssignStructureId] = useState(salaryStructures[0]?.id || '');
  const [assignEffectiveFrom, setAssignEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);

  const handleAddComponent = () => {
    const newComp: SalaryComponent = {
      id: `c-${Date.now()}`,
      name: 'New Custom Allowance',
      type: 'earning',
      calculationType: 'fixed',
      amountOrPercentage: 1500,
      applicabilityRules: 'Operational allowance rule',
      isActive: true
    };
    setComponents([...components, newComp]);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    addSalaryStructure({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      effectiveDate,
      isActive: true,
      components
    });

    setIsCreateModalOpen(false);
    setName('');
    setCode('');
    setDescription('');
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignDriverId || !assignStructureId) return;

    assignSalaryStructure(assignDriverId, assignStructureId, assignEffectiveFrom);
    setIsAssignModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Driver Salary Structures</h2>
          <p className="text-xs text-gray-500">
            Define reusable remuneration packages and assign them with effective-dating (Rule 18: Historical assignments preserved)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <UserCheck className="w-4 h-4 text-emerald-700" />
            <span>Assign to Driver</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Salary Package</span>
          </button>
        </div>
      </div>

      {/* Salary Structures Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {salaryStructures.map(struct => {
          const assignedDrivers = drivers.filter(d => d.salaryStructureId === struct.id);
          const totalEarnings = struct.components
            .filter(c => c.type === 'earning')
            .reduce((sum, c) => sum + c.amountOrPercentage, 0);
          const totalDeductions = struct.components
            .filter(c => c.type === 'deduction')
            .reduce((sum, c) => sum + c.amountOrPercentage, 0);

          return (
            <div
              key={struct.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all"
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {struct.code}
                    </span>
                    <h3 className="text-sm font-bold text-gray-900 mt-2">{struct.name}</h3>
                  </div>
                  <Badge status={struct.isActive ? 'active' : 'inactive'} />
                </div>

                <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                  {struct.description}
                </p>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Total Baseline</span>
                    <span className="text-sm font-bold text-emerald-800">{formatCurrency(totalEarnings)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Fixed Deductions</span>
                    <span className="text-sm font-bold text-rose-700">{formatCurrency(totalDeductions)}</span>
                  </div>
                </div>

                {/* Components breakdown */}
                <div className="mt-4 space-y-1.5 bg-gray-50/70 p-3 rounded-lg border border-gray-100 text-xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Configured Components ({struct.components.length})
                  </span>
                  {struct.components.map(comp => (
                    <div key={comp.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            comp.type === 'earning' ? 'bg-emerald-600' : 'bg-rose-500'
                          }`}
                        />
                        <span className="text-gray-700 truncate">{comp.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(comp.amountOrPercentage)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">
                  {assignedDrivers.length} driver{assignedDrivers.length === 1 ? '' : 's'} assigned
                </span>
                <button
                  onClick={() => {
                    setAssignStructureId(struct.id);
                    setIsAssignModalOpen(true);
                  }}
                  className="font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                >
                  Assign Drivers <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create Salary Structure */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Remuneration Structure"
        subtitle="Define a reusable package with configurable earnings, Bata allowances, and deductions."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Structure Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Express Container Inter-State"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Structure Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="e.g. SS-EXP-INT"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Operational Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Applicability guidelines, vehicle class, outstation norms..."
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Salary Components
              </label>
              <button
                type="button"
                onClick={handleAddComponent}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Component
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {components.map((comp, idx) => (
                <div
                  key={comp.id}
                  className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 flex items-center gap-2 text-xs"
                >
                  <input
                    type="text"
                    value={comp.name}
                    onChange={e => {
                      const updated = [...components];
                      updated[idx].name = e.target.value;
                      setComponents(updated);
                    }}
                    placeholder="Component Name"
                    className="flex-1 px-2 py-1 rounded border border-gray-300 bg-white"
                  />
                  <select
                    value={comp.type}
                    onChange={e => {
                      const updated = [...components];
                      updated[idx].type = e.target.value as any;
                      setComponents(updated);
                    }}
                    className="w-24 px-2 py-1 rounded border border-gray-300 bg-white"
                  >
                    <option value="earning">Earning</option>
                    <option value="deduction">Deduction</option>
                  </select>
                  <input
                    type="number"
                    value={comp.amountOrPercentage}
                    onChange={e => {
                      const updated = [...components];
                      updated[idx].amountOrPercentage = Number(e.target.value);
                      setComponents(updated);
                    }}
                    placeholder="Amount"
                    className="w-24 px-2 py-1 rounded border border-gray-300 bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setComponents(components.filter((_, i) => i !== idx))}
                    className="text-rose-500 hover:text-rose-700 px-1 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
            >
              Save Structure
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Assign Salary Structure */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Remuneration Package"
        subtitle="Bind an effective-dated salary structure to a driver. Finalized historical payroll remains unaffected."
        maxWidth="md"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Select Driver *</label>
            <select
              value={assignDriverId}
              onChange={e => setAssignDriverId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
            >
              {drivers.map(d => (
                <option key={d.id} value={d.id}>
                  {d.fullName} ({d.driverNumber}) — Currently: {d.salaryStructureName || 'None'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Assign Package *</label>
            <select
              value={assignStructureId}
              onChange={e => setAssignStructureId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
            >
              {salaryStructures.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Effective-From Date *</label>
            <input
              type="date"
              required
              value={assignEffectiveFrom}
              onChange={e => setAssignEffectiveFrom(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-[11px] text-emerald-800 leading-relaxed">
            <strong>Rule 18 Audit Compliance:</strong> When assigning a new salary structure, previously finalized payroll records for earlier months will remain strictly unchanged.
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
            >
              Confirm Assignment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
