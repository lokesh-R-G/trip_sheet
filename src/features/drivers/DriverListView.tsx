import React, { useState } from 'react';
import { useFleetStore } from '../../services/store';
import { Driver } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CreateDriverModal } from './CreateDriverModal';
import { DriverDetailModal } from './DriverDetailModal';
import {
  UserPlus,
  Eye,
  FileSpreadsheet,
  HandCoins,
  History,
  Phone,
  Truck,
  ShieldCheck,
  PowerOff
} from 'lucide-react';

export const DriverListView: React.FC = () => {
  const { drivers, updateDriver } = useFleetStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredDrivers = React.useMemo(() => {
    if (statusFilter === 'all') return drivers;
    return drivers.filter(d => d.status === statusFilter);
  }, [drivers, statusFilter]);

  const handleOpenDetail = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsDetailModalOpen(true);
  };

  const handleToggleStatus = (driver: Driver) => {
    const nextStatus = driver.status === 'active' ? 'on_leave' : 'active';
    updateDriver(driver.id, { status: nextStatus });
  };

  const columns: Column<Driver>[] = [
    {
      key: 'driverNumber',
      header: 'Driver #',
      sortable: true,
      render: d => (
        <span className="font-mono font-bold text-emerald-800 text-xs">
          {d.driverNumber}
        </span>
      )
    },
    {
      key: 'fullName',
      header: 'Driver Name',
      sortable: true,
      render: d => (
        <div>
          <div className="font-semibold text-gray-900">{d.fullName}</div>
          <div className="text-[11px] text-gray-400 font-mono">Lic: {d.licenseNumber}</div>
        </div>
      )
    },
    {
      key: 'phone',
      header: 'Contact #',
      render: d => (
        <div className="flex items-center gap-1.5 text-gray-600">
          <Phone className="w-3.5 h-3.5 text-gray-400" />
          <span>{d.phone}</span>
        </div>
      )
    },
    {
      key: 'joiningDate',
      header: 'Joining Date',
      sortable: true,
      render: d => <span>{formatDate(d.joiningDate)}</span>
    },
    {
      key: 'salaryStructureName',
      header: 'Assigned Salary Structure',
      sortable: true,
      render: d => (
        <span className="font-medium text-gray-700">
          {d.salaryStructureName || <span className="text-gray-400 italic">Unassigned</span>}
        </span>
      )
    },
    {
      key: 'assignedVehicleReg',
      header: 'Current Vehicle',
      sortable: true,
      render: d => (
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <Truck className="w-3.5 h-3.5 text-gray-400" />
          <span>{d.assignedVehicleReg || 'Floating Pool'}</span>
        </div>
      )
    },
    {
      key: 'outstandingAdvance',
      header: 'Outstanding Advance',
      sortable: true,
      align: 'right',
      render: d => (
        <span className={`font-bold ${d.outstandingAdvance > 0 ? 'text-rose-700' : 'text-gray-400'}`}>
          {formatCurrency(d.outstandingAdvance)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: d => <Badge status={d.status} />
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: d => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => handleOpenDetail(d)}
            title="View Driver & Financial Ledger"
            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleStatus(d)}
            title={d.status === 'active' ? 'Mark On Leave' : 'Mark Active'}
            className="p-1.5 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
          >
            <PowerOff className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Driver Profiles & Ledger</h2>
          <p className="text-xs text-gray-500">
            {drivers.length} commercial fleet drivers enrolled in operational payroll
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Driver</span>
        </button>
      </div>

      {/* Data Table */}
      <DataTable
        data={filteredDrivers}
        columns={columns}
        searchPlaceholder="Search by name, driver #, phone, or license..."
        searchFilter={(d, q) =>
          d.fullName.toLowerCase().includes(q) ||
          d.driverNumber.toLowerCase().includes(q) ||
          d.phone.includes(q) ||
          d.licenseNumber.toLowerCase().includes(q) ||
          (d.assignedVehicleReg?.toLowerCase().includes(q) ?? false)
        }
        filterComponent={
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white text-gray-700"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="on_leave">On Leave</option>
            <option value="suspended">Suspended</option>
          </select>
        }
        onRowClick={d => handleOpenDetail(d)}
      />

      {/* Create Driver Modal */}
      <CreateDriverModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Driver Detail & Ledger Modal */}
      <DriverDetailModal
        driver={selectedDriver}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDriver(null);
        }}
      />
    </div>
  );
};
