'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, KeyRound, ArrowRight, Loader2, Shield } from 'lucide-react';
import { apiRequest, setToken } from '@/lib/api';

export default function StartPage() {
  const router = useRouter();
  const [contact, setContact] = useState('+94771234567');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [demoHint, setDemoHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ challengeId: string; demoCodeHint?: string }>('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ contactLookup: contact }),
      });
      setChallengeId(res.challengeId);
      if (res.demoCodeHint) {
        setDemoHint(res.demoCodeHint);
        setOtpCode(res.demoCodeHint); // Pre-fill for convenience in demo
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const authRes = await apiRequest<{ token: string }>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ challengeId, otpCode }),
      });
      setToken(authRes.token);

      // Create or resume application draft
      const appRes = await apiRequest<{ id: string }>('/applications', {
        method: 'POST',
      });
      router.push(`/onboarding/${appRes.id}/consent`);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Applicant Verification</h2>
          <p className="text-sm text-slate-400">
            {!challengeId ? 'Enter your contact number to begin onboarding' : 'Enter the verification code sent to your contact'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        {!challengeId ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Mobile Number or Email
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="+9477XXXXXXX"
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Request OTP Code'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Verification Code
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="text"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="6-digit code"
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-600 tracking-widest text-center font-mono focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
              {demoHint && (
                <p className="text-xs text-amber-400 mt-2 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  Demo hint: Your local test OTP code is <strong>{demoHint}</strong>.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Continue'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
