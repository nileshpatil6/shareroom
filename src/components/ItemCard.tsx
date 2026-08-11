'use client';

import React, { useState } from 'react';
import { RoomItem } from '@/lib/types';
import { CodeBlock } from './CodeBlock';
import {
  Copy,
  Check,
  Download,
  Trash2,
  Clock,
  ShieldCheck,
  FileArchive,
  FileCode,
  FileImage,
  FileSpreadsheet,
  File,
} from 'lucide-react';

interface ItemCardProps {
  item: RoomItem;
  isAdmin: boolean;
  onDelete?: (itemId: string) => void;
}

export function ItemCard({ item, isAdmin, onDelete }: ItemCardProps) {
  const [copiedText, setCopiedText] = useState(false);
  const [now] = useState(() => Date.now());

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getTimeRemaining = (expiresAt: number, currentMs: number) => {
    const diff = expiresAt - currentMs;
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left`;
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const getFileIcon = (fileName?: string, mimeType?: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext) || mimeType?.startsWith('image/')) {
      return <FileImage className="w-8 h-8 text-sky-400" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FileArchive className="w-8 h-8 text-amber-400" />;
    }
    if (['js', 'ts', 'py', 'html', 'css', 'json', 'cpp', 'java'].includes(ext)) {
      return <FileCode className="w-8 h-8 text-emerald-400" />;
    }
    if (['csv', 'xlsx', 'xls'].includes(ext)) {
      return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
    }
    return <File className="w-8 h-8 text-indigo-400" />;
  };

  return (
    <div className="group relative rounded-2xl bg-zinc-900/90 border border-zinc-800 p-5 shadow-lg backdrop-blur-sm transition-all hover:border-zinc-700/80">
      {/* Header Info */}
      <div className="flex items-center justify-between gap-3 mb-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center space-x-2.5">
          {item.authorAdmin ? (
            <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Share</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium">
              Shared Item
            </span>
          )}

          <span className="text-xs text-zinc-500">
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Expiration badge */}
          <div
            className="flex items-center space-x-1 text-[11px] font-medium text-amber-400/90 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full"
            title="Auto-erases after 10 days"
          >
            <Clock className="w-3 h-3" />
            <span>{getTimeRemaining(item.expiresAt, now)}</span>
          </div>

          {/* Admin delete button */}
          {isAdmin && onDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content renderer */}
      {item.type === 'code' ? (
        <CodeBlock code={item.content} language={item.language} title={item.title} />
      ) : item.type === 'file' ? (
        <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
          <div className="flex items-center space-x-4 min-w-0">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex-shrink-0">
              {getFileIcon(item.fileName, item.mimeType)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-zinc-100 truncate text-sm">{item.fileName || 'Shared File'}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{formatSize(item.fileSize)} • Max 10MB limit</p>
            </div>
          </div>

          <a
            href={item.content}
            target="_blank"
            rel="noopener noreferrer"
            download={item.fileName || 'download'}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-md shadow-indigo-600/20 flex-shrink-0 ml-3"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </a>
        </div>
      ) : (
        /* Text item */
        <div className="space-y-3">
          {item.title && item.title !== 'Text Note' && (
            <h4 className="font-medium text-zinc-200 text-sm">{item.title}</h4>
          )}

          <div className="relative p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-200 text-sm whitespace-pre-wrap leading-relaxed font-sans">
            {item.content}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleCopyText}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                copiedText
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50'
              }`}
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied Text</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
