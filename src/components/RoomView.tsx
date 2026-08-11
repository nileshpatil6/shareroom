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
} from 'lucide-react';
import Link from 'next/link';

interface RoomViewProps {
  roomCode: string;
}

export function RoomView({ roomCode }: RoomViewProps) {
  const [items, setItems] = useState<RoomItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Retrieve admin token from localStorage if this user created the room
  const [adminToken] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`admin_token_${roomCode}`) || undefined;
    }
    return undefined;
  });

  const fetchRoomData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      let url = `/api/room?code=${roomCode}`;
      const token = typeof window !== 'undefined' ? localStorage.getItem(`admin_token_${roomCode}`) : null;
      if (token) {
        url += `&token=${token}`;
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
  }, [roomCode]);

  // Initial load & Polling every 3 seconds for real-time room sync
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) await fetchRoomData();
    };
    load();

    const interval = setInterval(() => {
      if (isMounted) fetchRoomData();
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchRoomData]);

  const handleDeleteItem = async (itemId: string) => {
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/room/delete?code=${roomCode}&itemId=${itemId}&token=${adminToken}`, {
        method: 'DELETE',
      });
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
        <p className="text-zinc-400 text-sm font-medium">Entering Room #{roomCode}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100">
        <div className="max-w-md w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
            <Info className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100">Room Not Found</h2>
          <p className="text-zinc-400 text-sm">
            Room code <span className="font-mono font-semibold text-zinc-200">#{roomCode}</span> does not exist or has expired.
          </p>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-md"
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
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
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
                  Room <span className="text-indigo-400">#{roomCode}</span>
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
            <button
              onClick={copyRoomCode}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-200 transition-all"
              title="Copy 4-digit code"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copiedCode ? 'Copied' : `#${roomCode}`}</span>
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

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Banner Alert for Auto-Erasure after 10 Days */}
        <div className="flex items-center justify-between p-4 mb-8 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-100">Automatic 10-Day Blob Cleanup</p>
              <p className="text-amber-300/80 mt-0.5">
                All shared files (max 10MB) and code snippets are stored on Vercel Blob and automatically purged after 10 days to keep storage clean.
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
            <span className="text-xs text-zinc-500">Auto-syncs every 3s</span>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center bg-zinc-900/40">
              <Inbox className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-zinc-300">Room is currently empty</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                Be the first to share text, format code blocks, or upload files (up to 10MB) in Room #{roomCode}.
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
