'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Camera, RefreshCw, CheckCircle2, ArrowRight, Loader2, Video, Eye, ArrowLeftCircle, ArrowRightCircle } from 'lucide-react';
import { apiRequest } from '@/lib/api';

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
        setSteps(ch.steps || ['TURN_LEFT', 'BLINK']);
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
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      setError('Unable to access camera. Please allow camera permissions or use the simulation mode.');
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
    setCountdown(10);
    setCurrentStepIdx(0);

    const chunks: Blob[] = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
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

    recorder.start(500);

    // Timer countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 6) setCurrentStepIdx(1);
        if (prev <= 1) {
          clearInterval(timer);
          recorder.stop();
          setRecording(false);
          stopCamera();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const uploadVideoBlob = async (blob: Blob) => {
    setProcessing(true);
    setStatusMessage('Uploading and analyzing biometric challenge...');
    try {
      const videoFile = new File([blob], 'liveness.webm', { type: 'video/webm' });
      const formData = new FormData();
      formData.append('videoFile', videoFile);
      formData.append('challengeId', challengeId!);
      formData.append('nonce', nonce!);
      formData.append('expectedVersion', version.toString());

      const attemptRes = await apiRequest<{ jobId: string; attemptId: string }>(`/applications/${applicationId}/biometric/attempts`, {
        method: 'POST',
        body: formData,
      });

      setStatusMessage('Processing movement compliance and face verification...');

      // Wait a moment for background job then submit application
      setTimeout(async () => {
        try {
          const app = await apiRequest<any>(`/applications/${applicationId}`);
          await apiRequest(`/applications/${applicationId}/submit`, {
            method: 'POST',
            body: JSON.stringify({ expectedVersion: app.version })
          });
          router.push(`/onboarding/${applicationId}/result`);
        } catch {
          router.push(`/onboarding/${applicationId}/result`);
        }
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Biometric analysis failed');
      setProcessing(false);
    }
  };

  // Synthetic video generator for local testing when camera is unavailable
  const handleSimulateVideo = async () => {
    setProcessing(true);
    setStatusMessage('Generating synthetic challenge video for demonstration...');

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d')!;

    const stream = canvas.captureStream(15);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      await uploadVideoBlob(blob);
    };

    recorder.start();

    // Draw simple animated face frames
    let frame = 0;
    const animInterval = setInterval(() => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 320, 240);

      // Draw head
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(160 + Math.sin(frame * 0.2) * 15, 120, 50, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(145 + Math.sin(frame * 0.2) * 15, 110, 6, 0, Math.PI * 2);
      ctx.arc(175 + Math.sin(frame * 0.2) * 15, 110, 6, 0, Math.PI * 2);
      ctx.fill();

      frame++;
      if (frame > 75) {
        clearInterval(animInterval);
        recorder.stop();
      }
    }, 66);
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'TURN_LEFT': return <ArrowLeftCircle className="w-5 h-5 text-indigo-400" />;
      case 'TURN_RIGHT': return <ArrowRightCircle className="w-5 h-5 text-indigo-400" />;
      case 'BLINK': return <Eye className="w-5 h-5 text-indigo-400" />;
      default: return <Video className="w-5 h-5 text-indigo-400" />;
    }
  };

  const getStepTitle = (step: string) => {
    switch (step) {
      case 'TURN_LEFT': return 'Slowly turn your head to the left';
      case 'TURN_RIGHT': return 'Slowly turn your head to the right';
      case 'BLINK': return 'Blink your eyes naturally twice';
      default: return 'Look straight at the camera';
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold uppercase tracking-wider">
            <Camera className="w-4 h-4" /> Step 5 of 5: Live Camera Session
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Interactive Liveness Challenge</h2>
          <p className="text-sm text-slate-400">
            Follow the live instructions. Your session challenge actions are randomly selected by the server and expire in 90 seconds.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl">
            {error}
          </div>
        )}

        {/* Challenge Step Checklist */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Assigned Challenge Sequence:
          </span>
          <div className="flex flex-col sm:flex-row gap-2">
            {steps.map((st, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border flex-1 transition ${
                  recording && currentStepIdx === idx
                    ? 'bg-indigo-600/20 border-indigo-500 text-white animate-pulse'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {getStepIcon(st)}
                <span>Action {idx + 1}: {st.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Camera Display Box */}
        <div className="relative aspect-[4/3] bg-slate-900/90 rounded-2xl border-2 border-slate-800 overflow-hidden flex flex-col items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover mirror ${cameraActive ? 'block' : 'hidden'}`}
          />

          {/* Oval Face Guide Overlay */}
          {cameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-64 border-2 border-dashed border-indigo-400/60 rounded-[50%] shadow-[0_0_50px_rgba(99,102,241,0.2)]"></div>
            </div>
          )}

          {!cameraActive && !processing && (
            <div className="text-center p-6 space-y-3">
              <Camera className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">Click below to activate your browser webcam</p>
              <button
                type="button"
                onClick={startCamera}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition"
              >
                Enable Camera
              </button>
            </div>
          )}

          {/* Current Step Instruction Banner during recording */}
          {recording && (
            <div className="absolute top-4 inset-x-4 bg-slate-950/80 backdrop-blur-md border border-indigo-500/30 p-3 rounded-xl flex items-center justify-between text-white">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {getStepIcon(steps[currentStepIdx] || '')}
                <span>{getStepTitle(steps[currentStepIdx] || '')}</span>
              </div>
              <span className="font-mono text-sm px-2 py-0.5 rounded bg-indigo-500 text-white font-bold">
                {countdown}s
              </span>
            </div>
          )}

          {processing && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-sm font-medium text-white">{statusMessage}</p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="space-y-3">
          {cameraActive && !recording && !processing && (
            <button
              type="button"
              onClick={startRecording}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-medium transition shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
            >
              <Video className="w-5 h-5" /> Start 10-Second Recording
            </button>
          )}

          {!processing && (
            <button
              type="button"
              onClick={handleSimulateVideo}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl text-xs transition"
            >
              Simulate Video Capture (Test Demo Mode)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
