import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileText, Camera, ShieldCheck, UserCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="space-y-12 py-8">
      {/* Hero section */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
          Sri Lankan Investment Onboarding Platform
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Seamless, Verified Remote <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Identity Onboarding</span>
        </h1>
        <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
          Submit NIC details once, verify with real-time OCR extraction, and complete a live camera challenge. Fast, secure, and fully auditable.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/onboarding/start"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium shadow-lg shadow-indigo-500/25 transition group"
          >
            Start Customer Onboarding
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/staff/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-medium transition"
          >
            Reviewer Staff Portal
          </Link>
        </div>
      </div>

      {/* Workflow steps */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white">1. Contact & Consent</h3>
          <p className="text-sm text-slate-400">
            Instant local OTP authentication followed by versioned statutory KYC consent.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white">2. NIC Extraction</h3>
          <p className="text-sm text-slate-400">
            Capture front and back NIC. Old (9V/X) and New (12 digits) layout detection with deterministic validation.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Camera className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white">3. Liveness Challenge</h3>
          <p className="text-sm text-slate-400">
            Random interactive movements (Turn Left, Turn Right, Blink) evaluated server-side with single-use nonces.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white">4. Verification & Audit</h3>
          <p className="text-sm text-slate-400">
            Facial comparison, policy evaluation, reviewer case assignment, and append-only audit trail.
          </p>
        </div>
      </div>

      {/* Notice alert */}
      <div className="glass-panel p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-200/90 text-sm space-y-2">
        <div className="font-semibold text-amber-300 flex items-center gap-2">
          <span>⚠️</span> Local Demonstration Pilot Notice
        </div>
        <p className="leading-relaxed">
          This system operates in <strong className="text-white">LOCAL_DEMO</strong> mode. Verified runs culminate in <span className="font-mono text-xs bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200">DEMO_CHECKS_PASSED</span> or <span className="font-mono text-xs bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200">REVIEW_REQUIRED</span>. No real regulatory approval or live financial investment accounts are created.
        </p>
      </div>
    </div>
  );
}
