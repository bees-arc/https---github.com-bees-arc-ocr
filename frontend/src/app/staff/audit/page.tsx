'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, History, Loader2, Database } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function StaffAuditTrailPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<any>('/staff/audit?page=0&size=100')
      .then(res => setLogs(res.items || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center justify-between">
        <Link
          href="/staff/applications"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Review Queue
        </Link>
        <span className="text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono">
          Append-Only Compliance Trail
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-indigo-400" /> Security & Workflow Audit Trail
        </h1>
        <p className="text-sm text-slate-400">
          Traceable chain of custody recording all applicant actions, evidence accesses, and staff review actions
        </p>
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
      ) : logs.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-3">
          <Database className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-lg font-semibold text-white">No audit records yet</h3>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Timestamp (UTC)</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Application ID</th>
                  <th className="px-6 py-4">Safe Metadata</th>
                  <th className="px-6 py-4">Correlation ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                      {log.createdAt}
                    </td>
                    <td className="px-6 py-4 text-indigo-300 font-semibold font-sans">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {log.applicationId ? log.applicationId.substring(0, 8) + '...' : 'System'}
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-sans">
                      {log.safeMetadata || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-[11px]">
                      {log.correlationId ? log.correlationId.substring(0, 12) + '...' : '-'}
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
