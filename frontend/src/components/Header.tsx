'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Info, User, LogOut, CheckCircle2 } from 'lucide-react';
import { apiRequest, getToken, clearToken } from '@/lib/api';

export default function Header() {
  const [mode, setMode] = useState<string>('LOCAL_DEMO');
  const [capabilities, setCapabilities] = useState<any>(null);
  const [showCapModal, setShowCapModal] = useState<boolean>(false);
  const [hasToken, setHasToken] = useState<boolean>(false);

  useEffect(() => {
    setHasToken(!!getToken());
    apiRequest<any>('/capabilities')
      .then(res => {
        if (res.operatingMode) setMode(res.operatingMode);
        setCapabilities(res);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    clearToken();
    setHasToken(false);
    window.location.href = '/';
  };

  return (
    <>
      <header className="border-b border-slate-800 glass-panel sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Identity Onboarding Lab
                </span>
                <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  Sri Lankan Pilot
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            {/* Mode Badge */}
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              mode === 'LOCAL_DEMO'
                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${mode === 'LOCAL_DEMO' ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              {mode === 'LOCAL_DEMO' ? 'LOCAL DEMO' : 'INSTITUTION MODE'}
            </span>

            {/* Capability Info Button */}
            <button
              onClick={() => setShowCapModal(true)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
              title="Inspect System Capabilities"
            >
              <Info className="w-5 h-5" />
            </button>

            {/* Staff portal link */}
            <Link
              href="/staff/applications"
              className="hidden md:inline-flex text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800/40 border border-slate-800 transition"
            >
              Staff Queue
            </Link>

            {hasToken && (
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800/60 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Capability Modal */}
      {showCapModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" /> System Capabilities Report
              </h3>
              <button
                onClick={() => setShowCapModal(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-slate-300">OCR Engine:</span>
                  <span className="text-xs bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">REAL</span>
                </div>
                <p className="text-xs text-slate-400">Tesseract 5.x (English, Sinhala, Tamil). Deterministic Sri Lankan Old/New NIC layout parsing.</p>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-slate-300">Camera Movement Liveness:</span>
                  <span className="text-xs bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">REAL_EXPERIMENTAL</span>
                </div>
                <p className="text-xs text-slate-400">Server-analyzed video flow checking random actions (Turn Left, Turn Right, Blink) with 90s single-use nonces.</p>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-slate-300">Passive Anti-Spoofing (PAD):</span>
                  <span className="text-xs bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">UNKNOWN</span>
                </div>
                <p className="text-xs text-slate-400">Certified ISO 30107-3 PAD weights are absent. System transparently marks PAD as UNKNOWN without fabricating a positive score.</p>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-slate-300">Face Comparison:</span>
                  <span className="text-xs bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">REAL_EXPERIMENTAL</span>
                </div>
                <p className="text-xs text-slate-400">Card portrait compared with live best video frame using calibrated Cosine Similarity (threshold 0.65).</p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowCapModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
