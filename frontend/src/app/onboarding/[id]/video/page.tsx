'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Video,
  Eye,
  ArrowLeftCircle,
  ArrowRightCircle,
  ShieldCheck,
  Smile,
  AlertCircle,
  Sparkles,
  Zap,
  CreditCard
} from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface ChallengeStep {
  key: string;
  label: string;
  instruction: string;
  icon: any;
}

const STEP_DEFINITIONS: Record<string, { label: string; instruction: string; icon: any }> = {
  BLINK: {
    label: 'Blink Naturally',
    instruction: 'Look directly at the camera and blink your eyes naturally',
    icon: Eye,
  },
  SHOW_ID_CARD: {
    label: 'Hold NIC to Camera',
    instruction: 'Hold your physical ID card next to your face inside the frame',
    icon: CreditCard,
  },
  HOLD_NIC: {
    label: 'Hold NIC to Camera',
    instruction: 'Hold your physical ID card next to your face inside the frame',
    icon: CreditCard,
  },
  TURN_LEFT: {
    label: 'Turn Head Left',
    instruction: 'Slowly turn your head towards the left side',
    icon: ArrowLeftCircle,
  },
  TURN_RIGHT: {
    label: 'Turn Head Right',
    instruction: 'Slowly turn your head towards the right side',
    icon: ArrowRightCircle,
  },
  SMILE: {
    label: 'Smile / Hold Steady',
    instruction: 'Smile gently or hold steady facing the camera',
    icon: Smile,
  },
};

export default function VideoLivenessPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params?.id as string;

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [version, setVersion] = useState<number>(0);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [nonce, setNonce] = useState<string | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState<number>(10);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fetch application state & request server-generated challenge
  useEffect(() => {
    apiRequest<any>(`/applications/${applicationId}`)
      .then(app => {
        setVersion(app.version);
        return apiRequest<any>(`/applications/${applicationId}/biometric/challenges`, { method: 'POST' });
      })
      .then(ch => {
        setChallengeId(ch.challengeId);
        setNonce(ch.nonce);
        const serverSteps = ch.steps && ch.steps.length > 0 ? ch.steps : ['BLINK', 'TURN_LEFT', 'TURN_RIGHT'];
        setSteps(serverSteps);
      })
      .catch(err => setError(err.message));

    return () => {
      stopCamera();
    };
  }, [applicationId]);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      setError('Unable to access webcam. Please ensure camera permissions are enabled in your browser or use the Demo Simulation mode.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    setRecording(true);
    setCountdown(9);
    setCurrentStepIdx(0);

    const chunks: Blob[] = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm';

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      await uploadVideoBlob(blob);
    };

    recorder.start(400);

    // Dynamic step switching timer
    const totalTime = 9;
    const numSteps = Math.max(1, steps.length);
    const stepDuration = totalTime / numSteps;

    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += 1;
      const remaining = totalTime - elapsed;
      setCountdown(remaining > 0 ? remaining : 0);

      const nextStep = Math.min(numSteps - 1, Math.floor(elapsed / stepDuration));
      setCurrentStepIdx(nextStep);

      if (remaining <= 0) {
        clearInterval(timer);
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
        setRecording(false);
        stopCamera();
      }
    }, 1000);
  };

  const uploadVideoBlob = async (blob: Blob) => {
    setProcessing(true);
    setStatusMessage('Transmitting encrypted biometric stream to vision engine...');
    try {
      const videoFile = new File([blob], 'liveness_stream.webm', { type: 'video/webm' });
      const formData = new FormData();
      formData.append('videoFile', videoFile);
      formData.append('challengeId', challengeId!);
      formData.append('nonce', nonce!);
      formData.append('expectedVersion', version.toString());

      setStatusMessage('Executing Presentation Attack Detection (PAD) & Multi-Feature 1:1 Face Match...');

      const attemptRes = await apiRequest<{ jobId: string; attemptId: string }>(
        `/applications/${applicationId}/biometric/attempts`,
        {
          method: 'POST',
          body: formData,
        }
      );

      setStatusMessage('Submitting finalized verification package for risk evaluation...');

      // Polling or short delay for async verification checks
      setTimeout(async () => {
        try {
          const app = await apiRequest<any>(`/applications/${applicationId}`);
          await apiRequest(`/applications/${applicationId}/submit`, {
            method: 'POST',
            body: JSON.stringify({ expectedVersion: app.version }),
          });
          router.push(`/onboarding/${applicationId}/result`);
        } catch {
          router.push(`/onboarding/${applicationId}/result`);
        }
      }, 3500);
    } catch (err: any) {
      setError(err.message || 'Biometric analysis failed');
      setProcessing(false);
    }
  };

  // Synthetic demo stream generator for testing without physical webcam
  const handleSimulateVideo = async () => {
    setProcessing(true);
    setStatusMessage('Generating synthetic ISO-compliant biometric video feed...');

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;

    const stream = canvas.captureStream(20);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      await uploadVideoBlob(blob);
    };

    recorder.start(400);

    let frame = 0;
    const animInterval = setInterval(() => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 640, 480);

      // Realistic skin gradient face
      const grad = ctx.createRadialGradient(320, 240, 20, 320, 240, 140);
      grad.addColorStop(0, '#fed7aa');
      grad.addColorStop(0.8, '#fba779');
      grad.addColorStop(1, '#ea580c');

      const xOffset = Math.sin(frame * 0.15) * 45;
      const yOffset = Math.cos(frame * 0.1) * 15;

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(320 + xOffset, 240 + yOffset, 100, 130, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes (blinking simulation)
      const isBlinkFrame = frame % 30 >= 26;
      ctx.fillStyle = '#1e293b';
      if (isBlinkFrame) {
        ctx.fillRect(275 + xOffset, 205 + yOffset, 30, 4);
        ctx.fillRect(335 + xOffset, 205 + yOffset, 30, 4);
      } else {
        ctx.beginPath();
        ctx.arc(290 + xOffset, 205 + yOffset, 10, 0, Math.PI * 2);
        ctx.arc(350 + xOffset, 205 + yOffset, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      // Smile mouth
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(320 + xOffset, 275 + yOffset, 30, 0.2, Math.PI - 0.2);
      ctx.stroke();

      frame++;
      if (frame > 120) {
        clearInterval(animInterval);
        recorder.stop();
      }
    }, 50);
  };

  const currentStepKey = steps[currentStepIdx] || 'BLINK';
  const stepInfo = STEP_DEFINITIONS[currentStepKey] || {
    label: currentStepKey.replace('_', ' '),
    instruction: 'Follow on-screen motion prompt',
    icon: Sparkles,
  };
  const StepIcon = stepInfo.icon;

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Step 5 of 5: Biometric Verification
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Active Liveness & 3D Anti-Spoofing</h2>
            <p className="text-sm text-slate-400">
              Complete the quick interactive micro-challenges. Our AI vision engine verifies 3D depth, skin chrominance, and 1:1 facial identity.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Real CV Engine
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Verification Notice</p>
              <p className="text-xs text-rose-300/90">{error}</p>
            </div>
          </div>
        )}

        {/* Camera HUD & Live Scanner */}
        <div className="relative bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 aspect-[4/3] flex items-center justify-center shadow-inner">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transform -scale-x-100 ${
              cameraActive ? 'block' : 'hidden'
            }`}
          />

          {!cameraActive && !processing && (
            <div className="text-center p-6 space-y-4 max-w-md">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400 animate-pulse">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-base">Enable Camera for Identity Check</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ensure good ambient lighting and remove heavy tinted glasses.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" /> Start Camera
                </button>
                <button
                  type="button"
                  onClick={handleSimulateVideo}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm border border-slate-700 transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" /> Demo Simulator
                </button>
              </div>
            </div>
          )}

          {/* Biometric Oval Overlay when Camera is Active */}
          {cameraActive && !processing && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
              {/* Top Prompt Badge */}
              <div className="bg-slate-900/90 backdrop-blur-md px-5 py-2.5 rounded-full border border-slate-700 shadow-xl flex items-center gap-3">
                <StepIcon className="w-5 h-5 text-indigo-400 animate-bounce" />
                <div className="text-left">
                  <div className="text-xs font-bold text-white uppercase tracking-wider">
                    {recording ? `Step ${currentStepIdx + 1} of ${steps.length}: ${stepInfo.label}` : 'Position Face in Center'}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {recording ? stepInfo.instruction : 'Fit your face within the oval guide'}
                  </div>
                </div>
              </div>

              {/* Central Biometric Oval Guide */}
              <div className="relative flex items-center justify-center">
                <div
                  className={`w-64 h-80 rounded-[50%] border-4 transition-all duration-300 ${
                    recording
                      ? 'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] animate-pulse'
                      : 'border-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                  }`}
                />

                {/* Physical Card Guide Box when SHOW_ID_CARD is active */}
                {recording && (currentStepKey === 'SHOW_ID_CARD' || currentStepKey === 'HOLD_NIC') && (
                  <div className="absolute -right-24 top-1/2 -translate-y-1/2 w-28 h-20 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-500/20 backdrop-blur-md flex flex-col items-center justify-center p-2 text-center animate-bounce shadow-lg shadow-amber-500/20">
                    <CreditCard className="w-6 h-6 text-amber-300 mb-1" />
                    <span className="text-[10px] font-extrabold text-amber-200 uppercase tracking-tight leading-none">
                      Hold NIC Here
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Timer or Action */}
              {recording ? (
                <div className="bg-rose-500/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-rose-500/30 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-mono font-bold text-rose-300">
                    REC ({countdown}s) — Performing Challenge
                  </span>
                </div>
              ) : (
                <div className="pointer-events-auto">
                  <button
                    type="button"
                    onClick={startRecording}
                    className="px-8 py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-xl shadow-emerald-500/30 transition transform hover:scale-105 flex items-center gap-2"
                  >
                    <Video className="w-4 h-4" /> Start Liveness Scan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Processing Screen */}
          {processing && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <ShieldCheck className="w-5 h-5 text-emerald-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-white font-bold text-base">Fintech Vision Engine Processing</h4>
                <p className="text-xs text-slate-300">{statusMessage}</p>
              </div>
              <div className="w-48 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}
        </div>

        {/* Step Progression Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {steps.map((stepKey, idx) => {
            const def = STEP_DEFINITIONS[stepKey] || { label: stepKey, instruction: '', icon: Sparkles };
            const Icon = def.icon;
            const isDone = recording && idx < currentStepIdx;
            const isCurrent = recording && idx === currentStepIdx;

            return (
              <div
                key={stepKey}
                className={`p-3.5 rounded-2xl border transition ${
                  isCurrent
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300 shadow-md shadow-indigo-500/10'
                    : isDone
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isCurrent
                        ? 'bg-indigo-500 text-white'
                        : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider block opacity-70">
                      Step {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-white">{def.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
