'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  CreditCard,
  UploadCloud,
  Camera,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Sparkles,
  RefreshCw,
  Eye,
  Check,
  Zap,
  FlipHorizontal,
  Timer,
  Scan,
  RotateCcw
} from 'lucide-react';
import { apiRequest } from '@/lib/api';

type CaptureTarget = 'front' | 'back';

export default function NicUploadPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params?.id as string;

  const [version, setVersion] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  // Camera & Auto-Scan State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [activeTarget, setActiveTarget] = useState<CaptureTarget>('front');
  const [isMirrored, setIsMirrored] = useState(true); // Mirrored by default so moving right moves right on screen (mirror effect)
  const [shutterFlash, setShutterFlash] = useState(false);

  // 10s Auto-Capture Tracker
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);
  const [countdown, setCountdown] = useState<number>(10);
  const [scanProgress, setScanProgress] = useState<number>(0); // 0 to 100%
  const [scanStatusText, setScanStatusText] = useState<string>('Align card within the frame...');
  const [isTimedOut, setIsTimedOut] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [jobStatus, setJobStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const steadyFramesCount = useRef<number>(0);

  useEffect(() => {
    apiRequest<any>(`/applications/${applicationId}`)
      .then(app => setVersion(app.version))
      .catch(err => setError(err.message));

    return () => {
      stopCamera();
      clearTimers();
    };
  }, [applicationId]);

  const clearTimers = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (timerCountdownRef.current) clearInterval(timerCountdownRef.current);
    scanIntervalRef.current = null;
    timerCountdownRef.current = null;
  };

  // Start Webcam
  const startCamera = async () => {
    setError(null);
    setIsTimedOut(false);
    setCountdown(10);
    setScanProgress(0);
    steadyFramesCount.current = 0;

    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'environment' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraActive(true);
      startAutoScanLoop();
    } catch (err: any) {
      setError('Unable to access camera. Please allow camera permissions or switch to File Upload mode.');
    }
  };

  const stopCamera = () => {
    clearTimers();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  // Reset and start 10s auto-scan loop
  const startAutoScanLoop = useCallback(() => {
    clearTimers();
    setIsTimedOut(false);
    setCountdown(10);
    setScanProgress(0);
    steadyFramesCount.current = 0;
    setScanStatusText('Detecting & focusing on card...');

    // 10-second countdown timer
    let remaining = 10;
    timerCountdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining > 0 ? remaining : 0);

      if (remaining <= 0) {
        clearTimers();
        setIsTimedOut(true);
        setScanStatusText('Auto-capture timed out. Click below to snap manually or retry.');
      }
    }, 1000);

    // Frame focus and stability check (~150ms interval)
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 320;
    offscreenCanvas.height = 200;
    const ctx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

    scanIntervalRef.current = setInterval(() => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 320, 200);
        const imgData = ctx.getImageData(0, 0, 320, 200);
        const data = imgData.data;

        // Simple Laplacian focus estimator
        let laplacianSum = 0;
        let count = 0;
        for (let y = 1; y < 199; y += 2) {
          for (let x = 1; x < 319; x += 2) {
            const idx = (y * 320 + x) * 4;
            const gray = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
            const grayUp = (data[((y - 1) * 320 + x) * 4] * 0.299 + data[((y - 1) * 320 + x) * 4 + 1] * 0.587 + data[((y - 1) * 320 + x) * 4 + 2] * 0.114);
            const grayDown = (data[((y + 1) * 320 + x) * 4] * 0.299 + data[((y + 1) * 320 + x) * 4 + 1] * 0.587 + data[((y + 1) * 320 + x) * 4 + 2] * 0.114);
            const grayLeft = (data[(y * 320 + (x - 1)) * 4] * 0.299 + data[(y * 320 + (x - 1)) * 4 + 1] * 0.587 + data[(y * 320 + (x - 1)) * 4 + 2] * 0.114);
            const grayRight = (data[(y * 320 + (x + 1)) * 4] * 0.299 + data[(y * 320 + (x + 1)) * 4 + 1] * 0.587 + data[(y * 320 + (x + 1)) * 4 + 2] * 0.114);

            const lap = Math.abs(4 * gray - grayUp - grayDown - grayLeft - grayRight);
            laplacianSum += lap;
            count++;
          }
        }

        const sharpnessScore = count > 0 ? laplacianSum / count : 0;

        // If sharp enough and card is steady, advance progress bar
        if (sharpnessScore > 12.0) {
          steadyFramesCount.current += 1;
          const prog = Math.min(100, Math.round((steadyFramesCount.current / 8) * 100));
          setScanProgress(prog);
          setScanStatusText(prog < 60 ? 'Card in focus! Hold steady...' : 'Capturing in a moment...');

          if (prog >= 100) {
            clearTimers();
            executeSnapshot();
          }
        } else {
          // Decay progress if moved or blurry
          steadyFramesCount.current = Math.max(0, steadyFramesCount.current - 1);
          setScanProgress(Math.min(100, Math.round((steadyFramesCount.current / 8) * 100)));
          setScanStatusText('Bring card closer and keep it still...');
        }
      }
    }, 150);
  }, []);

  // Execute snapshot from video
  const executeSnapshot = () => {
    if (!videoRef.current) return;
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d')!;

    // Draw raw camera sensor frame (naturally un-mirrored for accurate OCR text reading)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (blob) {
        const isFront = activeTarget === 'front';
        const fileName = isFront ? 'nic_front_capture.jpg' : 'nic_back_capture.jpg';
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(file);

        if (isFront) {
          setFrontFile(file);
          setFrontPreview(previewUrl);
          // Automatically switch target to back and re-start auto-scan
          if (!backFile) {
            setActiveTarget('back');
            setTimeout(() => {
              startAutoScanLoop();
            }, 800);
          } else {
            stopCamera();
          }
        } else {
          setBackFile(file);
          setBackPreview(previewUrl);
          stopCamera();
        }
      }
    }, 'image/jpeg', 0.95);
  };

  const handleManualCapture = () => {
    clearTimers();
    executeSnapshot();
  };

  const handleRetryScan = () => {
    startAutoScanLoop();
  };

  const handleTabChange = (tab: 'camera' | 'upload') => {
    setActiveTab(tab);
    if (tab === 'upload') {
      stopCamera();
    }
  };

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

  // Demo synthetic sample generator
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

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(420, 90, 140, 180);
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(490, 150, 40, 0, Math.PI * 2);
    ctx.fill();

    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], 'sample_front.jpg', { type: 'image/jpeg' });
        setFrontFile(file);
        setFrontPreview(URL.createObjectURL(file));
      }
    }, 'image/jpeg');

    const canvasBack = document.createElement('canvas');
    canvasBack.width = 600;
    canvasBack.height = 380;
    const ctxB = canvasBack.getContext('2d')!;
    ctxB.fillStyle = '#e2e8f0';
    ctxB.fillRect(0, 0, 600, 380);
    ctxB.fillStyle = '#1e293b';
    ctxB.font = 'bold 20px sans-serif';
    ctxB.fillText('CARD REGISTRAR GENERAL - BACK', 40, 50);

    canvasBack.toBlob(blob => {
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
    stopCamera();

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
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold uppercase tracking-wider">
              <CreditCard className="w-4 h-4" /> Step 3 of 5: Document Capture
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Sri Lankan NIC Verification</h2>
            <p className="text-sm text-slate-400">
              Auto-capture or upload your National Identity Card with real-time focus & orientation correction.
            </p>
          </div>
          <button
            type="button"
            onClick={handleUseSampleOldNic}
            className="self-start sm:self-center text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0"
            title="Generate a synthetic Sri Lankan NIC sample for instant testing"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Demo Sample
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Mode Switcher */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => handleTabChange('camera')}
              className={`py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                activeTab === 'camera'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" /> 10s Auto-Scan Camera
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('upload')}
              className={`py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UploadCloud className="w-4 h-4" /> File Upload
            </button>
          </div>

          {activeTab === 'camera' && cameraActive && (
            <button
              type="button"
              onClick={() => setIsMirrored(prev => !prev)}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition flex items-center gap-1.5"
              title="Flip camera horizontally to fix reversed/mirrored text"
            >
              <FlipHorizontal className="w-4 h-4 text-indigo-400" />
              <span>{isMirrored ? 'Mirrored' : 'Correct Text Orientation'}</span>
            </button>
          )}
        </div>

        {/* ---------------- LIVE 10s AUTO-SCAN VIEWFINDER TAB ---------------- */}
        {activeTab === 'camera' && (
          <div className="space-y-4">
            {/* Target Selector (Front vs Back) */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTarget('front');
                  if (cameraActive) startAutoScanLoop();
                }}
                className={`flex-1 p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                  activeTarget === 'front'
                    ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400'
                }`}
              >
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider block opacity-70">
                    Side 1
                  </span>
                  <span className="text-xs font-semibold text-white">Front of NIC</span>
                </div>
                {frontPreview ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                    ✓
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTarget('back');
                  if (cameraActive) startAutoScanLoop();
                }}
                className={`flex-1 p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                  activeTarget === 'back'
                    ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400'
                }`}
              >
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider block opacity-70">
                    Side 2
                  </span>
                  <span className="text-xs font-semibold text-white">Back of NIC</span>
                </div>
                {backPreview ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                    ✓
                  </span>
                ) : null}
              </button>
            </div>

            {/* Live Camera Box */}
            <div className="relative bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 aspect-[16/10] flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-transform ${
                  isMirrored ? 'transform -scale-x-100' : ''
                } ${cameraActive ? 'block' : 'hidden'}`}
              />

              {shutterFlash && (
                <div className="absolute inset-0 bg-white/80 animate-fade-out pointer-events-none z-30" />
              )}

              {/* Camera Off Placeholder */}
              {!cameraActive && (
                <div className="text-center p-6 space-y-4 max-w-sm">
                  <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                    <Scan className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">
                      Auto-Scan {activeTarget === 'front' ? 'Front Side' : 'Back Side'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Hold the card steady inside the frame. Camera will auto-focus and auto-capture within 10 seconds.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 mx-auto"
                  >
                    <Camera className="w-4 h-4" /> Start Auto-Scanner
                  </button>
                </div>
              )}

              {/* Card Alignment Boundary & Auto-Scan HUD */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4">
                  {/* Top Status & 10s Timer */}
                  <div className="flex items-center gap-3 w-full justify-between px-2">
                    <div className="bg-slate-900/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-700 text-xs text-white font-medium shadow-lg flex items-center gap-2">
                      <Scan className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      <span>{scanStatusText}</span>
                    </div>

                    <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5 shadow-lg">
                      <Timer className="w-3.5 h-3.5" />
                      <span>{countdown}s</span>
                    </div>
                  </div>

                  {/* Rectangular Card Outline with Focus Progress */}
                  <div className="relative w-[85%] max-w-[480px] aspect-[1.58/1] rounded-2xl border-2 border-dashed border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.3)] flex items-center justify-center">
                    {/* Corner Reticles */}
                    <div className="absolute top-2 left-2 w-5 h-5 border-t-4 border-l-4 border-emerald-300 rounded-tl" />
                    <div className="absolute top-2 right-2 w-5 h-5 border-t-4 border-r-4 border-emerald-300 rounded-tr" />
                    <div className="absolute bottom-2 left-2 w-5 h-5 border-b-4 border-l-4 border-emerald-300 rounded-bl" />
                    <div className="absolute bottom-2 right-2 w-5 h-5 border-b-4 border-r-4 border-emerald-300 rounded-br" />

                    {/* Circular Stability Indicator */}
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-300 bg-slate-900/80 px-4 py-1 rounded-full border border-emerald-500/30">
                        {activeTarget === 'front' ? 'NIC Front Side' : 'NIC Back Side'}
                      </span>

                      {scanProgress > 0 && (
                        <div className="w-32 bg-slate-900/80 rounded-full h-2 p-0.5 border border-emerald-500/40">
                          <div
                            className="bg-emerald-400 h-full rounded-full transition-all duration-150"
                            style={{ width: `${scanProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Controls (Manual Snap / Retry) */}
                  <div className="pointer-events-auto flex items-center gap-3">
                    {isTimedOut ? (
                      <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-slate-700">
                        <button
                          type="button"
                          onClick={handleRetryScan}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-indigo-400" /> Retry 10s Scan
                        </button>
                        <button
                          type="button"
                          onClick={handleManualCapture}
                          className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition flex items-center gap-1.5"
                        >
                          <Camera className="w-3.5 h-3.5" /> Force Snap
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleManualCapture}
                        className="px-6 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs shadow-xl shadow-indigo-500/30 transition transform hover:scale-105 flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" /> Snap Now ({activeTarget === 'front' ? 'Front' : 'Back'})
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- FILE UPLOAD TAB ---------------- */}
        {activeTab === 'upload' && (
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
        )}

        {/* Captured Images Review Strip */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Captured Document Review:</span>
            <span className="text-slate-400 text-[11px]">Both sides required</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
              {frontPreview ? (
                <img src={frontPreview} alt="Front preview" className="w-16 h-11 rounded-md object-cover border border-slate-700 shrink-0" />
              ) : (
                <div className="w-16 h-11 rounded-md bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 text-xs shrink-0">
                  Empty
                </div>
              )}
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold text-white block truncate">NIC Front</span>
                <span className="text-[10px] text-slate-400 block">
                  {frontFile ? `${(frontFile.size / 1024).toFixed(0)} KB ready` : 'Not captured'}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
              {backPreview ? (
                <img src={backPreview} alt="Back preview" className="w-16 h-11 rounded-md object-cover border border-slate-700 shrink-0" />
              ) : (
                <div className="w-16 h-11 rounded-md bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 text-xs shrink-0">
                  Empty
                </div>
              )}
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold text-white block truncate">NIC Back</span>
                <span className="text-[10px] text-slate-400 block">
                  {backFile ? `${(backFile.size / 1024).toFixed(0)} KB ready` : 'Not captured'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Processing State */}
        {processing && (
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-3 text-indigo-300 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span>{jobStatus}</span>
          </div>
        )}

        {/* Submit Form */}
        <form onSubmit={handleUpload}>
          <button
            type="submit"
            disabled={uploading || processing || !frontFile || !backFile}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl font-medium transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
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
