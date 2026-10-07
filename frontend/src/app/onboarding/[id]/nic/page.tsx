'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CreditCard, UploadCloud, CheckCircle2, AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function NicUploadPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params?.id as string;

  const [version, setVersion] = useState<number>(0);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [jobStatus, setJobStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<any>(`/applications/${applicationId}`)
      .then(app => setVersion(app.version))
      .catch(err => setError(err.message));
  }, [applicationId]);

  const handleFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFrontFile(file);
      setFrontPreview(URL.createObjectURL(file));
    }
  };

  const handleBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBackFile(file);
      setBackPreview(URL.createObjectURL(file));
    }
  };

  // Helper to create synthetic test NIC cards for immediate evaluation without real card upload
  const handleUseSampleOldNic = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 380;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, 600, 380);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 580, 360);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('SRI LANKA NATIONAL IDENTITY CARD', 40, 50);

    ctx.font = 'bold 26px monospace';
    ctx.fillText('850151234V', 40, 110);

    ctx.font = '18px sans-serif';
    ctx.fillText('Name: SUNIL PERERA', 40, 160);
    ctx.fillText('DOB: 1985-01-15', 40, 200);
    ctx.fillText('Address: No. 45 Galle Road, Colombo', 40, 240);

    // Draw simple portrait silhouette
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(420, 90, 140, 180);
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(490, 150, 40, 0, Math.PI * 2);
    ctx.fill();

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'sample_front.jpg', { type: 'image/jpeg' });
        setFrontFile(file);
        setFrontPreview(URL.createObjectURL(file));
      }
    }, 'image/jpeg');

    // Back card
    const canvasBack = document.createElement('canvas');
    canvasBack.width = 600;
    canvasBack.height = 380;
    const ctxB = canvasBack.getContext('2d')!;
    ctxB.fillStyle = '#e2e8f0';
    ctxB.fillRect(0, 0, 600, 380);
    ctxB.fillStyle = '#1e293b';
    ctxB.font = 'bold 20px sans-serif';
    ctxB.fillText('CARD REGISTRAR GENERAL - BACK', 40, 50);

    canvasBack.toBlob((blob) => {
      if (blob) {
        const fileB = new File([blob], 'sample_back.jpg', { type: 'image/jpeg' });
        setBackFile(fileB);
        setBackPreview(URL.createObjectURL(fileB));
      }
    }, 'image/jpeg');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontFile || !backFile) {
      setError('Please provide both front and back images.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('frontImage', frontFile);
      formData.append('backImage', backFile);
      formData.append('expectedVersion', version.toString());

      const res = await apiRequest<{ jobId: string; generation: number }>(`/applications/${applicationId}/nic`, {
        method: 'POST',
        body: formData,
      });

      setUploading(false);
      setProcessing(true);
      setJobStatus('Queued for OCR processing...');

      // Poll job status
      const pollInterval = setInterval(async () => {
        try {
          const job = await apiRequest<{ state: string }>(`/jobs/${res.jobId}`);
          setJobStatus(`OCR Extraction: ${job.state}...`);
          if (job.state === 'COMPLETED' || job.state === 'FAILED') {
            clearInterval(pollInterval);
            setProcessing(false);
            router.push(`/onboarding/${applicationId}/confirm`);
          }
        } catch {
          clearInterval(pollInterval);
          setProcessing(false);
          router.push(`/onboarding/${applicationId}/confirm`);
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setUploading(false);
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold uppercase tracking-wider">
              <CreditCard className="w-4 h-4" /> Step 3 of 5: Document Capture
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Sri Lankan NIC Verification</h2>
          </div>
          <button
            type="button"
            onClick={handleUseSampleOldNic}
            className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
            title="Generate a synthetic valid Sri Lankan NIC sample for testing"
          >
            <Sparkles className="w-3.5 h-3.5" /> Sample Card
          </button>
        </div>

        <p className="text-sm text-slate-400">
          Upload clear photos of your National Identity Card. Old layout (9 digits + V/X) and New smart layout (12 digits) are supported.
        </p>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl">
            {error}
          </div>
        )}

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <div className="font-semibold text-slate-200">📸 Quality Guidelines for High Accuracy:</div>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li>Ensure all 4 corners of the card are visible within the frame.</li>
            <li>Place on a dark, flat background with neutral lighting to avoid glare.</li>
            <li>Ensure the printed NIC number and photo are sharp and readable.</li>
          </ul>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Front upload */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                NIC Front Side
              </label>
              <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-2xl p-4 text-center cursor-pointer relative bg-slate-900/40 min-h-[160px] flex flex-col items-center justify-center">
                {frontPreview ? (
                  <img src={frontPreview} alt="Front preview" className="max-h-32 rounded-lg object-contain" />
                ) : (
                  <div className="space-y-2">
                    <UploadCloud className="w-8 h-8 text-slate-500 mx-auto" />
                    <span className="text-xs text-slate-400 block">Click to select Front image</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFrontChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Back upload */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                NIC Back Side
              </label>
              <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-2xl p-4 text-center cursor-pointer relative bg-slate-900/40 min-h-[160px] flex flex-col items-center justify-center">
                {backPreview ? (
                  <img src={backPreview} alt="Back preview" className="max-h-32 rounded-lg object-contain" />
                ) : (
                  <div className="space-y-2">
                    <UploadCloud className="w-8 h-8 text-slate-500 mx-auto" />
                    <span className="text-xs text-slate-400 block">Click to select Back image</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleBackChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {processing && (
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-3 text-indigo-300 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span>{jobStatus}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || processing || !frontFile || !backFile}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Uploading & Encrypting...
              </>
            ) : processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Analyzing Document...
              </>
            ) : (
              <>
                Submit & Extract Details <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
