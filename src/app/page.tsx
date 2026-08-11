'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PinInput, CODE_LENGTH } from '@/components/PinInput';
import {
  ShieldCheck,
  Zap,
  Lock,
  FileCode,
  UploadCloud,
  Clock,
  ArrowRight,
  PlusCircle,
  Sparkles,
  Loader2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

const CODE_REGEX = /^[A-Z0-9]{6}$/;
const MIN_PASSWORD_LENGTH = 4;

export default function HomePage() {
  const router = useRouter();
  const [pinCode, setPinCode] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleJoin = (codeToJoin?: string) => {
    const code = (codeToJoin || pinCode).toUpperCase();
    setErrorMsg(null);

    if (!CODE_REGEX.test(code)) {
      setErrorMsg('Please enter a valid 6-character room code (e.g. K7P2XM)');
      return;
    }

    setIsJoining(true);
    router.push(`/room/${code}`);
  };

  const handleCreateRoom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const codeToUse = customCode ? customCode.toUpperCase() : undefined;

    if (codeToUse && !CODE_REGEX.test(codeToUse)) {
      setErrorMsg('Custom room code must be exactly 6 letters/numbers');
      return;
    }

    if (adminPassword.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(`Admin password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    setIsCreating(true);

    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToUse, password: adminPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      // Save admin session token for this room
      if (typeof window !== 'undefined' && data.adminToken) {
        localStorage.setItem(`admin_token_${data.code}`, data.adminToken);
      }

      router.push(`/room/${data.code}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating room';
      setErrorMsg(msg);
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Background Subtle Gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/30 via-zinc-950 to-zinc-950 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white font-mono">
              Share<span className="text-indigo-400">Room</span>
            </h1>
            <p className="text-[11px] text-zinc-400">Instant Room Sharing</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>10-Day Blob Auto-Erasure</span>
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-4xl mx-auto w-full px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Vercel Blob Storage Integration</span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight max-w-2xl leading-tight">
          Share Code, Text & Files via a{' '}
          <span className="text-indigo-400 underline decoration-indigo-500/40">6-Character Code</span>
        </h2>
        <p className="text-zinc-400 text-sm sm:text-base max-w-xl mt-4 leading-relaxed">
          Create a room with your own admin password, then share just the code. Guests join with the code alone; only
          the admin password unlocks delete controls.
        </p>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-6 flex items-center space-x-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs max-w-md w-full">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Join / Create Card Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full mt-10 text-left">
          {/* Card 1: Join Room */}
          <div className="rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Join Existing Room</span>
                <Lock className="w-4 h-4 text-zinc-500" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100">Enter Room Code</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Just the {CODE_LENGTH}-character code, no password needed to join.
              </p>

              <PinInput
                value={pinCode}
                onChange={setPinCode}
                onComplete={(code) => handleJoin(code)}
                disabled={isJoining}
              />
            </div>

            <button
              onClick={() => handleJoin()}
              disabled={isJoining || pinCode.length !== CODE_LENGTH}
              className="w-full mt-4 flex items-center justify-center space-x-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-40"
            >
              {isJoining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Join Room {pinCode || '••••••'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Card 2: Create Room */}
          <form
            onSubmit={handleCreateRoom}
            className="rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Create New Room</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100">Become Room Admin</h3>
              <p className="text-xs text-zinc-400 mt-1">Set a code and an admin password you can log back in with.</p>

              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-400">Room code (optional)</label>
                  <input
                    type="text"
                    maxLength={CODE_LENGTH}
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="Auto-generate if empty"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono tracking-widest outline-none focus:border-emerald-500 placeholder:text-zinc-600 placeholder:tracking-normal"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                    <KeyRound className="w-3 h-3 text-emerald-400" />
                    Admin password (required)
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder={`Min ${MIN_PASSWORD_LENGTH} characters`}
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs outline-none focus:border-emerald-500 placeholder:text-zinc-600"
                  />
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Keep it private. Anyone with the code can post; only this password grants admin.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full mt-6 flex items-center justify-center space-x-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Room & Get Code</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl w-full mt-16 text-left">
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
              <FileCode className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-sm text-zinc-200">Formatted Code & Copy</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Syntax highlights JS, Python, HTML, SQL, etc., with a 1-click button to copy shared code as is.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-sm text-zinc-200">Max 10MB File Share</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Upload images, PDFs, archives, or docs up to 10 MB per file using Vercel Blob storage.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-sm text-zinc-200">Auto-Erased in 10 Days</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Files and snippets automatically expire after 10 days to prevent Vercel Blob from filling up.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
        ShareRoom • Free Vercel Deployment & Blob Storage Ready
      </footer>
    </div>
  );
}
