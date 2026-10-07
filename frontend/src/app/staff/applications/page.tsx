'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Eye, Clock, CheckCircle2, AlertTriangle, ArrowRight, Loader2, ListFilter, History } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function StaffApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = () => {
    setLoading(true);
    apiRequest<any>('/staff/applications?page=0&size=50')
      .then(res => setApplications(res.items || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  const getBadge = (decision: string) => {
    switch (decision) {
      case 'DEMO_CHECKS_PASSED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Demo Passed</span>;
      case 'REVIEW_REQUIRED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">Review Required</span>;
      case 'RECAPTURE_REQUIRED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">Recapture Req</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-600/30">Approved</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-600/20 text-rose-300 border border-rose-600/30">Rejected</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">Pending</span>;
    }
  };

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-400" /> Compliance Review Queue
          </h1>
          <p className="text-sm text-slate-400">
            Pending applicant verifications requiring compliance assessment or recapture guidance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/staff/audit"
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 flex items-center gap-2 transition"
          >
            <History className="w-4 h-4 text-slate-400" /> Audit Trail
          </Link>
          <button
            onClick={fetchApplications}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-medium text-white transition"
          >
            Refresh Queue
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-2xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : applications.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-3">
          <Clock className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-lg font-semibold text-white">No applications in queue</h3>
          <p className="text-sm text-slate-400">Completed applicant onboarding submissions will appear here.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Applicant Name</th>
                  <th className="px-6 py-4">Masked NIC</th>
                  <th className="px-6 py-4">Lifecycle</th>
                  <th className="px-6 py-4">Decision</th>
                  <th className="px-6 py-4">Mode</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 font-medium text-white">
                      {app.customerName}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {app.maskedNic}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="font-mono text-slate-400">{app.lifecycle}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getBadge(app.decision)}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-amber-300/80">
                      {app.operatingMode}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/staff/applications/${app.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-xs font-medium transition"
                      >
                        <Eye className="w-3.5 h-3.5" /> Review Case
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
