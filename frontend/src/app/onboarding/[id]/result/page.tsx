'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, RefreshCw, Shield, Eye, ArrowRight, Loader2, Clock } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function ResultPage() {
  const params = useParams();
  const applicationId = params?.id as string;

  const [application, setApplication] = useState<any>(null);
  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest<any>(`/applications/${applicationId}`),
      apiRequest<any[]>(`/applications/${applicationId}/checks`)
    ])
      .then(([app, checkList]) => {
        setApplication(app);
        setChecks(checkList);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [applicationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const decision = application?.decision || 'PENDING';

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        {/* Outcome Header */}
        <div className="text-center space-y-3">
          {decision === 'DEMO_CHECKS_PASSED' && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Demo Checks Passed</h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                All configured local automated validation checks were completed successfully.
              </p>
            </>
          )}

          {decision === 'REVIEW_REQUIRED' && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Application Queued for Review</h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Your application requires manual review by our compliance team before completion.
              </p>
            </>
          )}

          {decision === 'RECAPTURE_REQUIRED' && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Recapture Required</h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Document image clarity or video quality was insufficient. Please retake the capture.
              </p>
            </>
          )}
        </div>

        {/* Operating Mode Disclaimer Banner */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-200 block mb-0.5">Verification Integrity Label:</strong>
          Operating Mode: <span className="font-mono text-amber-300">{application?.operatingMode}</span>. In Local Demonstration Mode, passing checks indicate simulation success. No live investment account has been created or approved.
        </div>

        {/* Individual Verification Checks Table */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Verification Check Outcomes & Capabilities
          </h3>

          <div className="space-y-2">
            {checks.length === 0 ? (
              <p className="text-xs text-slate-500">No checks evaluated yet.</p>
            ) : (
              checks.map((check) => (
                <div
                  key={check.id}
                  className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-medium text-slate-200 block">
                      {check.checkType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Provider: {check.provider || 'internal'} • Mode: {check.executionMode}
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        check.status === 'PASS'
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : check.status === 'FAIL'
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                          : check.status === 'UNKNOWN'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {check.status}
                    </span>
                    {check.reasonCodes && (
                      <span className="block text-[10px] text-amber-400 mt-0.5">
                        {check.reasonCodes}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Navigation & actions */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 py-3 text-center rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-sm font-medium transition"
          >
            Return to Home
          </Link>

          <Link
            href={`/staff/applications/${applicationId}`}
            className="flex-1 py-3 text-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5"
          >
            <Eye className="w-4 h-4" /> View in Staff Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
