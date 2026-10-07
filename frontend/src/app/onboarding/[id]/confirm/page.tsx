'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CheckCircle2, AlertTriangle, ArrowRight, Loader2, Edit3, ShieldAlert } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function ConfirmPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params?.id as string;

  const [version, setVersion] = useState<number>(0);
  const [layout, setLayout] = useState<string>('OLD_NIC');
  const [nicNumber, setNicNumber] = useState('850151234V');
  const [fullName, setFullName] = useState('SUNIL PERERA');
  const [dob, setDob] = useState('1985-01-15');
  const [gender, setGender] = useState('MALE');
  const [address, setAddress] = useState('No. 45 Galle Road, Colombo');

  const [rawExtraction, setRawExtraction] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest<any>(`/applications/${applicationId}`),
      apiRequest<any>(`/applications/${applicationId}/nic`)
    ])
      .then(([app, nicData]) => {
        setVersion(app.version);
        if (nicData && nicData.fields) {
          setRawExtraction(nicData.fields);
          if (nicData.layout) setLayout(nicData.layout);
          if (nicData.fields.nicNumber?.value) setNicNumber(nicData.fields.nicNumber.value);
          if (nicData.fields.fullName?.value) setFullName(nicData.fields.fullName.value);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setFetching(false));
  }, [applicationId]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiRequest(`/applications/${applicationId}/nic/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          expectedVersion: version,
          nicNumber,
          fullName,
          dateOfBirth: dob,
          gender,
          address
        })
      });

      router.push(`/onboarding/${applicationId}/video`);
    } catch (err: any) {
      setError(err.message || 'Confirmation failed');
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
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" /> Step 4 of 5: Document Confirmation
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Review & Confirm Extracted Details</h2>
          <p className="text-sm text-slate-400">
            Verify the information extracted from your National Identity Card. Correct any discrepancies before continuing.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl">
            {error}
          </div>
        )}

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Detected Card Format:</span>
            <span className="font-semibold text-white text-sm">
              {layout === 'OLD_NIC' ? 'Sri Lankan Old NIC (9 Digits + V/X)' : layout === 'NEW_NIC' ? 'Sri Lankan Smart NIC (12 Digits)' : 'Standard Format'}
            </span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
            OCR Processed
          </span>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              National Identity Card Number (NIC)
            </label>
            <input
              type="text"
              required
              value={nicNumber}
              onChange={e => setNicNumber(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-base uppercase focus:outline-none focus:border-indigo-500 transition"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Format: 9 digits followed by V/X (e.g., 850151234V) or 12 digits (e.g., 200006001234).
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Full Legal Name
            </label>
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
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                required
                value={dob}
                onChange={e => setDob(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Both the raw OCR extraction and your confirmed values are stored separately for auditing compliance.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Details & Continue to Live Camera'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
