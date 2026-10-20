import React, { useState } from 'react';
import { useFleetStore } from '../../services/store';
import { Sliders, Save, CheckCircle2, ShieldCheck, Fuel, Network, RefreshCw } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, resetAllData } = useFleetStore();

  const [companyName, setCompanyName] = useState(settings.companyName);
  const [companyAddress, setCompanyAddress] = useState(settings.companyAddress);
  const [companyPhone, setCompanyPhone] = useState(settings.companyPhone);
  const [fuelPrice, setFuelPrice] = useState(settings.defaultFuelPricePerLitre);
  const [tolerance, setTolerance] = useState(settings.defaultBenchmarkTolerancePercent);
  const [endpoint, setEndpoint] = useState(settings.tlcmApiEndpoint);
  const [autoHold, setAutoHold] = useState(settings.autoHoldTyreAttributionOnDiscrepancy);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      companyName,
      companyAddress,
      companyPhone,
      defaultFuelPricePerLitre: Number(fuelPrice),
      defaultBenchmarkTolerancePercent: Number(tolerance),
      tlcmApiEndpoint: endpoint,
      autoHoldTyreAttributionOnDiscrepancy: autoHold
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-5 max-w-4xl text-xs">
      <div>
        <h2 className="text-base font-bold text-gray-900 tracking-tight">System Configuration & Policies</h2>
        <p className="text-xs text-gray-500">
          Global operational parameters, fuel price valuation benchmarks, and TLCM Pro API integration settings
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>System configuration saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Company Profile */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
          <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">
            Company Identity (Payslip Header)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Company Legal Name</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={companyPhone}
                onChange={e => setCompanyPhone(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Operating Logistics Address</label>
            <input
              type="text"
              value={companyAddress}
              onChange={e => setCompanyAddress(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
            />
          </div>
        </div>

        {/* Operational Financials */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
          <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">
            Fuel Valuation & Mileage Benchmark Defaults
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Default Diesel Fuel Price (₹ / Litre)
              </label>
              <input
                type="number"
                step="0.05"
                value={fuelPrice}
                onChange={e => setFuelPrice(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 font-mono font-bold"
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">
                Applied to calculate potential fuel deductions when excess consumption occurs.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Default Mileage Tolerance Buffer (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={tolerance}
                onChange={e => setTolerance(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 font-mono font-bold"
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">
                Permitted excess percentage over expected fuel before deduction begins.
              </span>
            </div>
          </div>
        </div>

        {/* TLCM Pro Integration Settings */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
          <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">
            TLCM Pro Integration Endpoint (API Backend)
          </h3>
          <div>
            <label className="block font-semibold text-gray-700 mb-1">TLCM Pro Backend API Gateway URL</label>
            <input
              type="text"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 font-mono bg-white"
            />
            <span className="text-[10px] text-gray-400 mt-0.5 block">
              Rule 20: Communicates through the API gateway. Direct database writes to TLCM Pro are strictly blocked.
            </span>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
              <input
                type="checkbox"
                checked={autoHold}
                onChange={e => setAutoHold(e.target.checked)}
                className="rounded text-emerald-700 focus:ring-emerald-600"
              />
              <span>Auto-Hold Tyre Attribution on Odometer Discrepancy (Rule 10 & 21)</span>
            </label>
            <p className="text-[11px] text-gray-500 ml-6 mt-0.5">
              Suspends tyre distance attribution jobs whenever an odometer sequence discrepancy is flagged.
            </p>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset all demo fleet data back to original state?')) {
                resetAllData();
              }
            }}
            className="px-3.5 py-2 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo Store</span>
          </button>

          <button
            type="submit"
            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg flex items-center gap-2 shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
