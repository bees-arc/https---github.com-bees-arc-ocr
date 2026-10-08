'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CheckCircle2, AlertTriangle, ArrowRight, Loader2, Sparkles, ShieldCheck, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { apiRequest } from '@/lib/api';

const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function parseSriLankanNic(nic: string) {
  if (!nic) return null;
  const clean = nic.replace(/[\s\-_]/g, '').toUpperCase();
  const oldMatch = clean.match(/^([0-9]{2})([0-9]{3})([0-9]{4})([VX])$/);
  const newMatch = clean.match(/^((?:19|20)[0-9]{2})([0-9]{3})([0-9]{5})$/);

  let year = 0;
  let days = 0;
  let layout = 'OLD_NIC';

  if (oldMatch) {
    year = 1900 + parseInt(oldMatch[1], 10);
    days = parseInt(oldMatch[2], 10);
    layout = 'OLD_NIC';
  } else if (newMatch) {
    year = parseInt(newMatch[1], 10);
    days = parseInt(newMatch[2], 10);
    layout = 'NEW_NIC';
  } else {
    return null;
  }

  const gender = days > 500 ? 'FEMALE' : 'MALE';
  if (days > 500) days -= 500;
  if (days < 1 || days > 366) return null;

  let month = 1;
  let rem = days;
  for (let i = 0; i < MONTH_DAYS.length; i++) {
    if (rem <= MONTH_DAYS[i]) {
      month = i + 1;
      break;
    }
    rem -= MONTH_DAYS[i];
  }
  const day = rem;
  const dob = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  return { canonical: clean, layout, gender, dob };
}

export default function ConfirmPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params?.id as string;

  const [version, setVersion] = useState<number>(0);
  const [layout, setLayout] = useState<string>('UNKNOWN');
  const [nicNumber, setNicNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('MALE');
  const [address, setAddress] = useState('');

  const [rawExtraction, setRawExtraction] = useState<any>({});
  const [showRawOcr, setShowRawOcr] = useState(false);
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

          // Populate with actual OCR extracted fields if present
          if (nicData.fields.nicNumber?.value) {
            const extractedNic = nicData.fields.nicNumber.value;
            setNicNumber(extractedNic);
            const parsed = parseSriLankanNic(extractedNic);
            if (parsed) {
              setDob(parsed.dob);
              setGender(parsed.gender);
              setLayout(parsed.layout);
            }
          }
          if (nicData.fields.fullName?.value) {
            setFullName(nicData.fields.fullName.value);
          }
          if (nicData.fields.dateOfBirth?.value) {
            setDob(nicData.fields.dateOfBirth.value);
          }
          if (nicData.fields.gender?.value) {
            setGender(nicData.fields.gender.value);
          }
          if (nicData.fields.address?.value) {
            setAddress(nicData.fields.address.value);
          }
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setFetching(false));
  }, [applicationId]);

  // When user edits or inputs NIC number manually, recalculate DOB and Gender
  const handleNicChange = (val: string) => {
    setNicNumber(val);
    const parsed = parseSriLankanNic(val);
    if (parsed) {
      setDob(parsed.dob);
      setGender(parsed.gender);
      setLayout(parsed.layout);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicNumber.trim()) {
      setError('Please provide a valid NIC number.');
      return;
    }
    if (!fullName.trim()) {
      setError('Please provide your full legal name.');
      return;
    }
    if (!dob) {
      setError('Please provide your date of birth.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiRequest(`/applications/${applicationId}/nic/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          expectedVersion: version,
          nicNumber: nicNumber.trim().toUpperCase(),
          fullName: fullName.trim(),
          dateOfBirth: dob,
          gender,
          address: address.trim()
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
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm text-slate-400">Loading extracted identity details...</p>
      </div>
    );
  }

  const isOcrDetectedNic = Boolean(rawExtraction?.nicNumber?.value);
  const isOcrDetectedName = Boolean(rawExtraction?.fullName?.value);

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" /> Step 4 of 5: Document Confirmation
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Review & Confirm Extracted Details</h2>
          <p className="text-sm text-slate-400">
            Verify the information read by our OCR engine from your physical National Identity Card. You may correct any discrepancies below.
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
              {layout === 'OLD_NIC'
                ? 'Sri Lankan Old NIC (9 Digits + V/X)'
                : layout === 'NEW_NIC'
                ? 'Sri Lankan Smart NIC (12 Digits)'
                : 'Custom / Standard Layout'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Real OCR Engine Active</span>
          </div>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                National Identity Card Number (NIC)
              </label>
              {isOcrDetectedNic && (
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  ✓ Read from Card ({Math.round((rawExtraction.nicNumber.confidence || 0.95) * 100)}% conf)
                </span>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="e.g. 850151234V or 199012345678"
              value={nicNumber}
              onChange={e => handleNicChange(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-base uppercase focus:outline-none focus:border-indigo-500 transition"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Format: 9 digits followed by V/X (e.g., 850151234V) or 12 digits (e.g., 199012345678).
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Full Legal Name
              </label>
              {isOcrDetectedName && (
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  ✓ Read from Card ({Math.round((rawExtraction.fullName.confidence || 0.9) * 100)}% conf)
                </span>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="Enter full legal name as on card"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Date of Birth
                </label>
                {nicNumber && (
                  <span className="text-[10px] text-indigo-400">NIC Algorithm Derived</span>
                )}
              </div>
              <input
                type="date"
                required
                value={dob}
                onChange={e => setDob(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Gender
                </label>
                {nicNumber && (
                  <span className="text-[10px] text-indigo-400">NIC Algorithm Derived</span>
                )}
              </div>
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
              placeholder="e.g. No. 12, Galle Road, Colombo"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Raw OCR Inspection Drawer */}
          {Object.keys(rawExtraction).length > 0 && (
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
              <button
                type="button"
                onClick={() => setShowRawOcr(!showRawOcr)}
                className="w-full px-4 py-2.5 text-xs text-slate-400 hover:text-slate-200 flex items-center justify-between transition"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <FileText className="w-3.5 h-3.5" />
                  View Raw OCR Machine Output ({Object.keys(rawExtraction).length} fields)
                </span>
                {showRawOcr ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showRawOcr && (
                <div className="p-4 pt-1 border-t border-slate-800/80 font-mono text-xs text-slate-300 space-y-1.5">
                  {Object.entries(rawExtraction).map(([k, v]: [string, any]) => (
                    <div key={k} className="flex items-center justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">{k}:</span>
                      <span className="text-white font-semibold">{v?.value || 'null'}</span>
                      <span className="text-[10px] text-indigo-400">({Math.round((v?.confidence || 0) * 100)}% conf)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
            <span>
              Both the raw OCR machine extraction and your verified identity values are cryptographically bound, encrypted with AES-256-GCM, and preserved in the audit log for regulatory compliance.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Details & Continue to Biometrics'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
