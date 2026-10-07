'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, ArrowLeft, CheckCircle2, AlertTriangle, FileText, Camera, User, Lock, Loader2, Image as ImageIcon } from 'lucide-react';
import { apiRequest, API_BASE, getToken } from '@/lib/api';

export default function StaffCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params?.id as string;

  const [caseData, setCaseData] = useState<any>(null);
  const [decision, setDecision] = useState<string>('DEMO_CHECKS_PASSED');
  const [reason, setReason] = useState<string>('All document clarity guidelines and movement challenge checks satisfied.');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchCaseDetail();
  }, [applicationId]);

  const fetchCaseDetail = () => {
    setLoading(true);
    apiRequest<any>(`/staff/applications/${applicationId}`)
      .then(res => setCaseData(res))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A mandatory reason is required for any manual compliance action.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await apiRequest<any>(`/staff/applications/${applicationId}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          expectedVersion: caseData.version,
          decision,
          reason: reason.trim()
        })
      });
      setSuccess(`Decision successfully recorded: ${res.newDecision}`);
      fetchCaseDetail();
    } catch (err: any) {
      setError(err.message || 'Failed to record decision');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-8 text-center text-slate-400">
        Application not found.
      </div>
    );
  }

  const token = getToken();

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      {/* Top back nav */}
      <div className="flex items-center justify-between">
        <Link
          href="/staff/applications"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Queue
        </Link>
        <span className="text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono">
          App ID: {caseData.id}
        </span>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-2xl">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" /> {success}
        </div>
      )}

      {/* Case Header Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{caseData.profile?.fullName || 'Applicant'}</h1>
            <p className="text-xs text-slate-400 mt-1">DOB: {caseData.profile?.dateOfBirth} • Address: {caseData.profile?.address}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold font-mono">
              Status: {caseData.decision}
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
              {caseData.operatingMode}
            </span>
          </div>
        </div>

        {/* Extracted vs Confirmed Differences */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Raw OCR Extraction vs Applicant Confirmed Values
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-500 font-medium block">Raw NIC Extraction:</span>
              <p className="font-mono text-slate-300">{caseData.extractionDiff?.raw_nicNumber || 'N/A'}</p>
              <span className="text-slate-500 font-medium block pt-1">Raw Name:</span>
              <p className="text-slate-300">{caseData.extractionDiff?.raw_fullName || 'N/A'}</p>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-500 font-medium block">Confirmed NIC Number:</span>
              <p className="font-mono text-emerald-400 font-semibold">{caseData.extractionDiff?.confirmed_nicNumber || 'Pending'}</p>
              <span className="text-slate-500 font-medium block pt-1">Confirmed Name:</span>
              <p className="text-emerald-400 font-semibold">{caseData.extractionDiff?.confirmed_fullName || 'Pending'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Checks Checklist */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Automated Verification Check Outcomes
        </h3>
        <div className="grid grid-cols-1 gap-2.5">
          {caseData.checks?.map((chk: any, idx: number) => (
            <div key={idx} className="p-3.5 bg-slate-900/40 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-medium text-white block">{chk.checkType.replace(/_/g, ' ')}</span>
                <span className="text-[11px] text-slate-500">Provider: {chk.provider} • Mode: {chk.executionMode}</span>
              </div>
              <div className="text-right">
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  chk.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
                  chk.status === 'FAIL' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' :
                  chk.status === 'UNKNOWN' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {chk.status}
                </span>
                {chk.reasonCodes && (
                  <span className="block text-[10px] text-amber-400 mt-0.5">{chk.reasonCodes}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Protected Evidence Viewer */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-400" /> Protected Evidence (Audited Stream)
          </h3>
          <span className="text-[11px] text-slate-500">Streaming accesses are logged to audit events</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {caseData.evidence?.map((ev: any) => (
            <div key={ev.evidenceId} className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 space-y-2">
              <div className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>{ev.kind.replace(/_/g, ' ')}</span>
                <span className="text-[10px] text-slate-500">Gen {ev.generation}</span>
              </div>
              <div className="aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800/80">
                {ev.mime.startsWith('image/') ? (
                  <img
                    src={`${API_BASE}/staff/evidence/${ev.evidenceId}`}
                    alt={ev.kind}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={`${API_BASE}/staff/evidence/${ev.evidenceId}`}
                    controls
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <a
                href={`${API_BASE}/staff/evidence/${ev.evidenceId}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 block text-center pt-1"
              >
                Open Full Resolution
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Reviewer Action Form */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Record Reviewer Compliance Action
        </h3>

        <form onSubmit={handleDecision} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Action</label>
              <select
                value={decision}
                onChange={e => setDecision(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="DEMO_CHECKS_PASSED">Demo Checks Passed (Permitted in Demo Mode)</option>
                <option value="RECAPTURE_REQUIRED">Request Recapture (Blur / Glare / Movement)</option>
                <option value="REJECTED">Reject Application (Suspicious / Fraud)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mandatory Reviewer Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="State the detailed compliance reason for this decision..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Reviewer Decision'}
          </button>
        </form>
      </div>
    </div>
  );
}
