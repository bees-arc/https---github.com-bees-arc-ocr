'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ShieldCheck, ArrowRight, Loader2, CheckSquare, Square } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function ConsentPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params?.id as string;

  const [kycConsent, setKycConsent] = useState(false);
  const [commsConsent, setCommsConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycConsent) {
      setError('You must accept the identity verification consent to proceed.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Record mandatory KYC verification consent
      await apiRequest(`/applications/${applicationId}/consents`, {
        method: 'POST',
        body: JSON.stringify({
          consentType: 'IDENTITY_VERIFICATION',
          version: 'v1.0-2026',
          accepted: true,
          consentText: 'I consent to the collection, OCR extraction, and biometric video analysis of my National Identity Card for identity onboarding.'
        })
      });

      // Optionally record communication consent
      if (commsConsent) {
        await apiRequest(`/applications/${applicationId}/consents`, {
          method: 'POST',
          body: JSON.stringify({
            consentType: 'OPTIONAL_COMMUNICATION',
            version: 'v1.0-2026',
            accepted: true,
            consentText: 'I agree to receive investment portfolio updates and educational notifications.'
          })
        });
      }

      router.push(`/onboarding/${applicationId}/details`);
    } catch (err: any) {
      setError(err.message || 'Failed to record consent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Step 1 of 5: Statutory Consent
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Terms & Data Processing Consent</h2>
          <p className="text-sm text-slate-400">
            Please review the required regulatory declarations before submitting identity evidence.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl">
            {error}
          </div>
        )}

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-3 leading-relaxed max-h-56 overflow-y-auto">
          <p className="font-semibold text-slate-200">
            Sri Lankan Financial Intelligence & KYC Data Processing Notice (Version v1.0-2026)
          </p>
          <p>
            1. <strong>Identity Document Processing:</strong> You are submitting photographs of your official Sri Lankan National Identity Card (NIC) for optical character recognition (OCR), image quality verification, and document portrait extraction.
          </p>
          <p>
            2. <strong>Facial & Movement Biometrics:</strong> You will complete a short, interactive camera session performing randomized movements (head rotation, blinking) to analyze live video presentation and match your live facial features against your NIC portrait.
          </p>
          <p>
            3. <strong>Data Privacy & Encryption:</strong> All personal identifying information (PII) is encrypted at rest using AES-256-GCM. Raw video captures are automatically purged after 24 hours in demonstration evaluation mode.
          </p>
          <p>
            4. <strong>Auditing & Review:</strong> All verification results are logged in an immutable, append-only audit trail and reviewed by authorized compliance staff.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <label
            onClick={() => setKycConsent(!kycConsent)}
            className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition select-none"
          >
            {kycConsent ? (
              <CheckSquare className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            ) : (
              <Square className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
            )}
            <div className="text-sm">
              <span className="font-medium text-white block">
                Mandatory Identity Verification Consent <span className="text-rose-400">*</span>
              </span>
              <span className="text-xs text-slate-400">
                I authorize the collection and automated processing of my NIC images and live camera recording for remote identity onboarding.
              </span>
            </div>
          </label>

          <label
            onClick={() => setCommsConsent(!commsConsent)}
            className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition select-none"
          >
            {commsConsent ? (
              <CheckSquare className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            ) : (
              <Square className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
            )}
            <div className="text-sm">
              <span className="font-medium text-slate-300 block">
                Optional Communications (Marketing & Portfolio Updates)
              </span>
              <span className="text-xs text-slate-400">
                I agree to receive occasional investment market newsletters and informational notifications.
              </span>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading || !kycConsent}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Accept & Proceed to Personal Details'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
