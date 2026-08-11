'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RoomItem } from '@/lib/types';
import { ItemCard } from './ItemCard';
import { ShareForm } from './ShareForm';
import {
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
  Share2,
  ArrowLeft,
  Info,
  Clock,
  Sparkles,
  Inbox,
  PlusCircle,
  KeyRound,
  LogOut,
  AlertCircle,
  X,
} from 'lucide-react';
import Link from 'next/link';

interface RoomViewProps {
  roomCode: string;
}

const CODE_REGEX = /^[A-Z0-9]{6}$/;
const MIN_PASSWORD_LENGTH = 4;

export function RoomView({ roomCode: rawRoomCode }: RoomViewProps) {
  const roomCode = (rawRoomCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  const [items, setItems] = useState<RoomItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Room creation (when the code has no room yet)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Admin login modal
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [adminToken, setAdminToken] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      const code = (rawRoomCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      return localStorage.getItem(`admin_token_${code}`) || undefined;
    }
    return undefined;
  });

  const fetchRoomData = useCallback(
    async (showRefreshing = false) => {
      if (!CODE_REGEX.test(roomCode)) {
        setError('Invalid room code. Codes are 6 letters/numbers.');
        setLoading(false);
        return;
      }

      if (showRefreshing) setIsRefreshing(true);
      try {
        let url = `/api/room?code=${roomCode}`;
        const token = typeof window !== 'undefined' ? localStorage.getItem(`admin_token_${roomCode}`) : null;
        if (token) {
          url += `&token=${encodeURIComponent(token)}`;
        }

        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Room not found');
        }

        setItems(data.items || []);
        setIsAdmin(Boolean(data.isAdmin));
        setError(null);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load room data';
        setError(msg);
      } finally {
        setLoading(false);
        if (showRefreshing) {
          setTimeout(() => setIsRefreshing(false), 500);
        }
      }
    },
    [roomCode]
  );

  // Initial load & polling (paused while the room is in an error state)
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) await fetchRoomData();
    };
    load();

    const interval = setInterval(() => {
      // Skip polling for a hidden tab; the focus handler catches it up
      if (isMounted && !error && document.visibilityState === 'visible') {
        fetchRoomData();
      }
    }, 2000);

    const onVisible = () => {
      if (isMounted && document.visibilityState === 'visible') fetchRoomData();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [fetchRoomData, error]);

  const handleCreateThisRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Admin password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    setIsCreatingRoom(true);
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: roomCode, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create room');
      }
      if (data.adminToken) {
        localStorage.setItem(`admin_token_${roomCode}`, data.adminToken);
        setAdminToken(data.adminToken);
      }
      setNewPassword('');
      setError(null);
      await fetchRoomData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating room';
      setError(msg);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/room/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: roomCode, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem(`admin_token_${roomCode}`, data.adminToken);
      setAdminToken(data.adminToken);
      setIsAdmin(true);
      setAdminPassword('');
      setShowAdminLogin(false);
      await fetchRoomData();
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem(`admin_token_${roomCode}`);
    setAdminToken(undefined);
    setIsAdmin(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!adminToken) return;
    try {
      const res = await fetch(
        `/api/room/delete?code=${roomCode}&itemId=${itemId}&token=${encodeURIComponent(adminToken)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const copyRoomLink = async () => {
    const link = `${window.location.origin}/room/${roomCode}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-zinc-400 text-sm font-medium">Entering Room {roomCode}...</p>
      </div>
    );
  }

  if (error) {
    const codeIsValid = CODE_REGEX.test(roomCode);

    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100">
        <div className="max-w-md w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-8 text-center space-y-5 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100">
              {codeIsValid ? `Room ${roomCode} Not Created Yet` : 'Invalid Room Code'}
            </h2>
            <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
              {codeIsValid ? (
                <>
                  No active room exists for code{' '}
                  <span className="font-mono font-semibold text-zinc-200">{roomCode}</span>. Create it now by setting an
                  admin password.
                </>
              ) : (
                <>Room codes are exactly 6 letters or numbers, e.g. K7P2XM.</>
              )}
            </p>
          </div>

          {codeIsValid && (
            <form onSubmit={handleCreateThisRoom} className="space-y-2 text-left">
              <label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                <KeyRound className="w-3 h-3 text-emerald-400" />
                Admin password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={`Min ${MIN_PASSWORD_LENGTH} characters`}
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs outline-none focus:border-emerald-500 placeholder:text-zinc-600"
              />
              <button
                type="submit"
                disabled={isCreatingRoom}
                className="w-full flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
              >
                {isCreatingRoom ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Room {roomCode}</span>
                  </>
                )}
              </button>
            </form>
          )}

          <Link
            href="/"
            className="w-full inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-all border border-zinc-700/60"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Leave Room"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black font-mono tracking-tight text-white">
                  Room <span className="text-indigo-400">{roomCode}</span>
                </h1>
                {isAdmin && (
                  <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">Instant Code, Text & File Sharing</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {isAdmin ? (
              <button
                onClick={handleAdminLogout}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-all"
                title="Exit admin mode on this device"
              >
                <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Exit Admin</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setLoginError(null);
                  setShowAdminLogin(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/15 border border-emerald-500/30 hover:bg-emerald-600/25 text-emerald-300 text-xs font-medium transition-all"
                title="Log in with the room's admin password"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin Login</span>
              </button>
            )}

            <button
              onClick={copyRoomCode}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-200 transition-all"
              title="Copy room code"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copiedCode ? 'Copied' : roomCode}</span>
            </button>

            <button
              onClick={copyRoomLink}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium transition-all"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied' : 'Share Room'}</span>
            </button>

            <button
              onClick={() => fetchRoomData(true)}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Refresh Room"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Admin login modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleAdminLogin}
            className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  Admin Login
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Enter the admin password for room{' '}
                  <span className="font-mono text-zinc-200">{roomCode}</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminLogin(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loginError && (
              <div className="flex items-center space-x-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Admin password"
              autoFocus
              autoComplete="current-password"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs outline-none focus:border-emerald-500 placeholder:text-zinc-600"
            />

            <button
              type="submit"
              disabled={isLoggingIn || !adminPassword}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all disabled:opacity-50"
            >
              {isLoggingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Unlock Admin Controls</span>
            </button>
          </form>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Banner Alert for Auto-Erasure after 10 Days */}
        <div className="flex items-center justify-between p-4 mb-8 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-100">Automatic 10-Day Cleanup</p>
              <p className="text-amber-300/80 mt-0.5">
                All shared files (max 10MB) and code snippets are stored on Vercel Blob and automatically purged after 10
                days to keep storage clean.
              </p>
            </div>
          </div>
        </div>

        {/* Sharing Form */}
        <ShareForm roomCode={roomCode} adminToken={adminToken} onItemAdded={() => fetchRoomData()} />

        {/* Shared Items Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Room Stream ({items.length})</span>
            </h3>
            <span className="text-xs text-zinc-500">Auto-syncs every 2s</span>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center bg-zinc-900/40">
              <Inbox className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-zinc-300">Room is currently empty</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                Be the first to share text, format code blocks, or upload files (up to 10MB) in Room {roomCode}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} isAdmin={isAdmin} onDelete={handleDeleteItem} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
