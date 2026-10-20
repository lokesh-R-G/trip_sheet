import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { useFleetStore } from '../../services/store';
import { Driver } from '../../types';
import { formatCurrency, formatDate, formatDateTime, formatKm } from '../../utils/formatters';
import {
  User,
  BadgeDollarSign,
  Truck,
  HandCoins,
  Receipt,
  Percent,
  WalletCards,
  History,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  FileText
} from 'lucide-react';

interface DriverDetailModalProps {
  driver: Driver | null;
  isOpen: boolean;
  onClose: () => void;
  onIssueAdvance?: (driver: Driver) => void;
}

export const DriverDetailModal: React.FC<DriverDetailModalProps> = ({
  driver,
  isOpen,
  onClose,
  onIssueAdvance
}) => {
  const { salaryStructures, trips, advances, auditLogs, payrollRuns } = useFleetStore();
  const [activeTab, setActiveTab] = useState<
    'profile' | 'salary' | 'trips' | 'advances' | 'expenses' | 'deductions' | 'payroll' | 'audit'
  >('profile');

  if (!driver) return null;

  const currentSalary = salaryStructures.find(s => s.id === driver.salaryStructureId);
  const driverTrips = trips.filter(t => t.driverId === driver.id);
  const driverAdvances = advances.filter(a => a.driverId === driver.id);
  const driverAuditLogs = auditLogs.filter(a => a.entityId === driver.id || a.entityLabel.includes(driver.fullName));

  // Collect all expenses submitted by this driver
  const driverExpenses = driverTrips.flatMap(t => t.expenses);

  // Collect fuel deductions for this driver
  const driverDeductions = driverTrips.map(t => ({
    tripNumber: t.tripNumber,
    date: t.startDate,
    distance: t.distance.acceptedDistance,
    actualMileage: t.fuel.tripMileageKmPerLitre,
    benchmark: t.fuelDeduction.benchmarkMileage,
    excessFuel: t.fuelDeduction.excessFuelLitres,
    potentialDeduction: t.fuelDeduction.potentialDeductionAmount,
    approvedDeduction: t.fuelDeduction.approvedDeductionAmount,
    status: t.fuelDeduction.reviewStatus
  }));

  // Collect payroll records for this driver
  const driverPayrolls = payrollRuns.flatMap(run =>
    run.records
      .filter(r => r.driverId === driver.id)
      .map(rec => ({ ...rec, month: run.month, runStatus: run.status }))
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${driver.fullName} (${driver.driverNumber})`}
      subtitle={`Operational Driver Profile & Integrated Financial Ledger`}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Top Financial Ledger Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3.5">
          <div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Employment Status
            </span>
            <div className="mt-1">
              <Badge status={driver.status} />
            </div>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Assigned Vehicle
            </span>
            <div className="mt-1 font-bold text-gray-900 text-sm">
              {driver.assignedVehicleReg || 'Floating Pool'}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Outstanding Advance
            </span>
            <div className="mt-1 font-bold text-rose-700 text-sm">
              {formatCurrency(driver.outstandingAdvance)}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Lifetime Trips
            </span>
            <div className="mt-1 font-bold text-emerald-800 text-sm">
              {driverTrips.length} completed
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-gray-200 overflow-x-auto text-xs font-medium space-x-1">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'salary', label: 'Salary Structure', icon: BadgeDollarSign },
            { id: 'trips', label: `Trips (${driverTrips.length})`, icon: Truck },
            { id: 'advances', label: `Advances (${driverAdvances.length})`, icon: HandCoins },
            { id: 'expenses', label: `Expenses (${driverExpenses.length})`, icon: Receipt },
            { id: 'deductions', label: `Fuel Deductions (${driverDeductions.length})`, icon: Percent },
            { id: 'payroll', label: `Payroll (${driverPayrolls.length})`, icon: WalletCards },
            { id: 'audit', label: 'Audit History', icon: History }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 py-2 px-3 border-b-2 font-semibold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-md'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Profile */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200">
              <h4 className="font-bold text-gray-900 uppercase text-[11px] tracking-wider text-emerald-800">
                Personal & Contact Details
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-900">{driver.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{driver.email || 'No email provided'}</span>
                </div>
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span>{driver.address || 'Address unrecorded'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Joining Date: {formatDate(driver.joiningDate)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200">
              <h4 className="font-bold text-gray-900 uppercase text-[11px] tracking-wider text-emerald-800">
                Statutory License & Compliance
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-gray-500">Commercial License #</span>
                  <span className="font-mono font-bold text-gray-900">{driver.licenseNumber}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-gray-500">License Expiry</span>
                  <span className="font-bold text-emerald-800">{formatDate(driver.licenseExpiry)}</span>
                </div>
                {driver.notes && (
                  <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-gray-700">
                    <span className="font-semibold text-emerald-900 block mb-0.5">Operational Remarks</span>
                    {driver.notes}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Salary Structure */}
        {activeTab === 'salary' && (
          <div className="space-y-4 text-xs">
            {currentSalary ? (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{currentSalary.name}</h4>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{currentSalary.code} • Effective from {formatDate(currentSalary.effectiveDate)}</p>
                  </div>
                  <Badge status={currentSalary.isActive ? 'active' : 'inactive'} />
                </div>

                <div className="divide-y divide-gray-100">
                  {currentSalary.components.map(c => (
                    <div key={c.id} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-gray-800">{c.name}</span>
                        <span className="text-gray-400 ml-2">({c.applicabilityRules})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.type === 'earning'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-rose-50 text-rose-800'
                          }`}
                        >
                          {c.type.toUpperCase()}
                        </span>
                        <span className="font-bold text-gray-900 min-w-16 text-right">
                          {formatCurrency(c.amountOrPercentage)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl">
                No active salary structure assigned. Assign one from Driver Salary Structures.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Trips */}
        {activeTab === 'trips' && (
          <div className="space-y-2 text-xs">
            {driverTrips.length > 0 ? (
              <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden bg-white">
                {driverTrips.map(trip => (
                  <div key={trip.id} className="p-3 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-800">{trip.tripNumber}</span>
                        <Badge status={trip.status} />
                        <span className="text-gray-400">• {trip.vehicleReg}</span>
                      </div>
                      <div className="text-gray-500 mt-1">
                        {trip.startingLocation} → {trip.finalDestination}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{formatKm(trip.distance.acceptedDistance)}</div>
                      <div className="text-[11px] text-gray-500">
                        Fuel: {trip.fuel.acceptedFuelLitres}L • {trip.fuel.tripMileageKmPerLitre || '—'} km/L
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-center text-gray-500">No trips recorded for this driver yet.</p>
            )}
          </div>
        )}

        {/* Tab 4: Advances */}
        {activeTab === 'advances' && (
          <div className="space-y-3 text-xs">
            {driverAdvances.length > 0 ? (
              <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden bg-white">
                {driverAdvances.map(adv => (
                  <div key={adv.id} className="p-3 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{adv.referenceNumber}</span>
                        <Badge status={adv.status} />
                        <span className="text-gray-400">({adv.advanceType.replace(/_/g, ' ')})</span>
                      </div>
                      <div className="text-gray-500 mt-1">
                        Issued on {formatDate(adv.advanceDate)} via {adv.paymentMethod}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{formatCurrency(adv.advanceAmount)}</div>
                      <div className="text-[11px] text-rose-600 font-semibold">
                        Outstanding: {formatCurrency(adv.outstandingBalance)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-center text-gray-500">No advances recorded for this driver.</p>
            )}
          </div>
        )}

        {/* Tab 5: Expenses */}
        {activeTab === 'expenses' && (
          <div className="space-y-2 text-xs">
            {driverExpenses.length > 0 ? (
              <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden bg-white">
                {driverExpenses.map(exp => (
                  <div key={exp.id} className="p-3 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{exp.category}</span>
                        <Badge status={exp.approvalStatus} />
                        <span className="text-gray-400 text-[11px]">• {exp.tripNumber}</span>
                      </div>
                      <p className="text-gray-600 mt-0.5">{exp.description}</p>
                    </div>
                    <div className="text-right font-bold text-gray-900">
                      {formatCurrency(exp.approvedAmount || exp.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-center text-gray-500">No expenses submitted.</p>
            )}
          </div>
        )}

        {/* Tab 6: Fuel Deductions */}
        {activeTab === 'deductions' && (
          <div className="space-y-2 text-xs">
            {driverDeductions.length > 0 ? (
              <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden bg-white">
                {driverDeductions.map((ded, i) => (
                  <div key={i} className="p-3 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-800">{ded.tripNumber}</span>
                        <Badge status={ded.status} />
                      </div>
                      <div className="text-gray-500 mt-1">
                        Actual: {ded.actualMileage || '—'} km/L vs Benchmark: {ded.benchmark} km/L • Excess Fuel: {ded.excessFuel}L
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-rose-700">
                        {formatCurrency(ded.approvedDeduction || ded.potentialDeduction)}
                      </div>
                      <div className="text-[10px] text-gray-400 capitalize">{ded.status.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-center text-gray-500">No fuel deductions logged.</p>
            )}
          </div>
        )}

        {/* Tab 7: Payroll History */}
        {activeTab === 'payroll' && (
          <div className="space-y-2 text-xs">
            {driverPayrolls.length > 0 ? (
              <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden bg-white">
                {driverPayrolls.map(pay => (
                  <div key={pay.id} className="p-3 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">Month: {pay.month}</span>
                        <Badge status={pay.paymentStatus} />
                      </div>
                      <div className="text-gray-500 mt-1">
                        Gross: {formatCurrency(pay.grossEarnings)} • Deductions: {formatCurrency(pay.totalDeductions)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-800 text-sm">
                        Net: {formatCurrency(pay.netPayable)}
                      </div>
                      <div className="text-[10px] text-gray-400">{pay.paymentReference || 'Unpaid'}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-center text-gray-500">No payroll entries for this driver.</p>
            )}
          </div>
        )}

        {/* Tab 8: Audit History */}
        {activeTab === 'audit' && (
          <div className="space-y-2 text-xs">
            {driverAuditLogs.length > 0 ? (
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                {driverAuditLogs.map(log => (
                  <div key={log.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800 font-mono text-[11px]">{log.action}</span>
                      <span className="text-[10px] text-gray-400">{formatDateTime(log.timestamp)}</span>
                    </div>
                    <p className="text-gray-600 mt-1">{log.newValue || log.reason || 'Record updated'}</p>
                    <div className="text-[10px] text-gray-400 mt-0.5">By: {log.changedBy}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-center text-gray-500">No audit records for this driver.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
