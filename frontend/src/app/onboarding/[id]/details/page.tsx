'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { User, Briefcase, DollarSign, Globe, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function DetailsPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params?.id as string;

  const [version, setVersion] = useState<number>(0);
  const [fullName, setFullName] = useState('Sunil Perera');
  const [dob, setDob] = useState('1985-01-15');
  const [address, setAddress] = useState('No. 45 Galle Road, Colombo 03, Sri Lanka');
  const [employment, setEmployment] = useState('Employed - Private Sector');
  const [sourceOfFunds, setSourceOfFunds] = useState('Salary / Savings');
  const [taxResidency, setTaxResidency] = useState('Sri Lanka');
  const [pep, setPep] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<any>(`/applications/${applicationId}`)
      .then(app => {
        setVersion(app.version);
        if (app.fullName) setFullName(app.fullName);
        if (app.dateOfBirth) setDob(app.dateOfBirth);
        if (app.addressLine) setAddress(app.addressLine);
      })
      .catch(err => setError(err.message))
      .finally(() => setFetching(false));
  }, [applicationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiRequest(`/applications/${applicationId}/details`, {
        method: 'PATCH',
        body: JSON.stringify({
          expectedVersion: version,
          fullName,
          dateOfBirth: dob,
          addressLine: address,
          employmentStatus: employment,
          sourceOfFunds,
          taxResidency,
          pepDeclaration: pep
        })
      });

      router.push(`/onboarding/${applicationId}/nic`);
    } catch (err: any) {
      setError(err.message || 'Failed to save details');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold uppercase tracking-wider">
            <User className="w-4 h-4" /> Step 2 of 5: Applicant Profile
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Personal & Financial Profile</h2>
          <p className="text-sm text-slate-400">
            Enter your basic identifying details and statutory investment declarations.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
              Identity Information
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Legal Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Date of Birth</label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tax Residency</label>
                <select
                  value={taxResidency}
                  onChange={e => setTaxResidency(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="Sri Lanka">Sri Lanka</option>
                  <option value="Other">Other / Dual</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Residential Address</label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
              Financial & Regulatory Declarations
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Employment Status</label>
                <select
                  value={employment}
                  onChange={e => setEmployment(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="Employed - Private Sector">Employed - Private Sector</option>
                  <option value="Employed - Public Sector">Employed - Public Sector</option>
                  <option value="Self-Employed / Business Owner">Self-Employed / Business Owner</option>
                  <option value="Retired">Retired</option>
                  <option value="Student / Other">Student / Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Primary Source of Funds</label>
                <select
                  value={sourceOfFunds}
                  onChange={e => setSourceOfFunds(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="Salary / Savings">Salary / Savings</option>
                  <option value="Business Profits">Business Profits</option>
                  <option value="Inheritance / Investments">Inheritance / Investments</option>
                </select>
              </div>
            </div>

            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={pep}
                onChange={e => setPep(e.target.checked)}
                className="mt-1 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
              />
              <span className="text-xs text-slate-300">
                Are you or an immediate family member a Politically Exposed Person (PEP)?
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  (Includes senior government officials, military commanders, or state enterprise executives).
                </span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 pt-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save & Proceed to NIC Upload'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
