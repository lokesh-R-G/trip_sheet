import React from 'react';
import { ShieldCheck, UserCheck, Key, Lock, Users } from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const UsersPermissionsView: React.FC = () => {
  const users = [
    {
      id: 'usr-1',
      name: 'Lokesh Kumar',
      email: 'lokeshCA2004@gmail.com',
      role: 'Fleet Operations Superadmin',
      permissions: ['All Permissions', 'Payroll Finalization', 'TLCM Gateway Sync', 'Audit Sign-off'],
      status: 'active',
      lastLogin: '2026-10-20 03:30'
    },
    {
      id: 'usr-2',
      name: 'Venkatesh Rao',
      email: 'venkatesh.r@apexhaul.com',
      role: 'Fleet Accountant & Cashier',
      permissions: ['Advance Disbursements', 'Expense Reconciliations', 'Fuel Deduction Review'],
      status: 'active',
      lastLogin: '2026-10-19 17:15'
    },
    {
      id: 'usr-3',
      name: 'Anand Sundaram',
      email: 'anand.s@apexhaul.com',
      role: 'Depot Yard Supervisor',
      permissions: ['Trip Sheet Generation', 'Odometer Capture', 'Fuel Bunkering Entries'],
      status: 'active',
      lastLogin: '2026-10-20 01:45'
    },
    {
      id: 'usr-4',
      name: 'Meenakshi Iyer',
      email: 'meenakshi.i@apexhaul.com',
      role: 'Internal Audit Controller',
      permissions: ['Read-only Audit Log', 'Fuel Deduction Adjustment Audit', 'Immutable Archive Inspection'],
      status: 'active',
      lastLogin: '2026-10-18 11:20'
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-gray-900 tracking-tight">Users & Role-Based Access Control (RBAC)</h2>
        <p className="text-xs text-gray-500">
          Manage system operator credentials, operational roles, and separation of duties for fleet accounting and dispatch
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs divide-y divide-gray-200 text-xs">
        {users.map(u => (
          <div key={u.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                {u.name.charAt(0)}
              </div>
              <div>
                <span className="font-bold text-gray-900 text-sm block">{u.name}</span>
                <span className="text-gray-500">{u.email}</span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-gray-800 block">{u.role}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {u.permissions.map((p, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-right">
              <Badge status={u.status} />
              <span className="text-[10px] text-gray-400 block mt-1">Last: {u.lastLogin}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
