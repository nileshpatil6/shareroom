'use client';

import React, { useState, useRef } from 'react';
import { FileText, Code, UploadCloud, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface ShareFormProps {
  roomCode: string;
  adminToken?: string;
  onItemAdded: () => void;
}

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'html', label: 'HTML / XML' },
  { id: 'css', label: 'CSS' },
  { id: 'json', label: 'JSON' },
  { id: 'sql', label: 'SQL' },
  { id: 'bash', label: 'Bash / Shell' },
  { id: 'plaintext', label: 'Plain Text' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function ShareForm({ roomCode, adminToken, onItemAdded }: ShareFormProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'code' | 'file'>('text');
  const [textContent, setTextContent] = useState('');
  const [codeContent, setCodeContent] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg(`Selected file is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Maximum allowed limit is 10 MB.`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg(`Selected file is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Maximum allowed limit is 10 MB.`);
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmitTextOrCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const isCode = activeTab === 'code';
    const content = isCode ? codeContent : textContent;

    if (!content.trim()) {
      setErrorMsg(`Please enter some ${isCode ? 'code' : 'text'} before sharing.`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/room/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: roomCode,
          type: activeTab,
          content: content,
          language: isCode ? selectedLanguage : undefined,
          adminToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to share content');
      }

      if (isCode) {
        setCodeContent('');
      } else {
        setTextContent('');
      }

      setSuccessMsg(`${isCode ? 'Code' : 'Text'} shared successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      onItemAdded();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedFile) {
      setErrorMsg('Please select a file to upload.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrorMsg(`File size exceeds 10 MB limit.`);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('code', roomCode);
      if (adminToken) {
        formData.append('adminToken', adminToken);
      }

      const res = await fetch('/api/room/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload file');
      }

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setSuccessMsg('File uploaded successfully! (Auto-erases after 10 days)');
      setTimeout(() => setSuccessMsg(null), 4000);
      onItemAdded();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'File upload failed';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl mb-8">
      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-zinc-800 pb-4 mb-5">
        <button
          onClick={() => {
            setActiveTab('text');
            setErrorMsg(null);
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'text'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Share Text</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('code');
            setErrorMsg(null);
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'code'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Share Formatted Code</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('file');
            setErrorMsg(null);
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'file'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Share File (Max 10MB)</span>
        </button>
      </div>

      {/* Error & Success Banners */}
      {errorMsg && (
        <div className="flex items-center space-x-2.5 p-3.5 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center space-x-2.5 p-3.5 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form Content */}
      {activeTab === 'text' && (
        <form onSubmit={handleSubmitTextOrCode} className="space-y-4">
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Paste or write any text message, link, note, or instructions here..."
            rows={4}
            className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-zinc-100 text-sm outline-none transition-all placeholder:text-zinc-500 font-sans resize-y"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              <span>Post Text</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'code' && (
        <form onSubmit={handleSubmitTextOrCode} className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <label className="text-xs font-medium text-zinc-400">Select Programming Language:</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-mono outline-none focus:border-indigo-500"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={codeContent}
            onChange={(e) => setCodeContent(e.target.value)}
            placeholder="Paste code snippet here..."
            rows={6}
            className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-zinc-100 text-xs font-mono outline-none transition-all placeholder:text-zinc-500 leading-relaxed resize-y"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code className="w-4 h-4" />}
              <span>Share Code Block</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'file' && (
        <form onSubmit={handleSubmitFile} className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-700 hover:border-indigo-500/80 rounded-2xl p-8 text-center bg-zinc-950/60 hover:bg-zinc-950 transition-all cursor-pointer group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-3 rounded-full bg-indigo-500/10 group-hover:bg-indigo-500/20 text-indigo-400 transition-colors">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200">
                  {selectedFile ? selectedFile.name : 'Click to upload or drag & drop file'}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {selectedFile
                    ? `File Size: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                    : 'Max file size: 10 MB (Auto-erases after 10 days)'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              <span>Upload to Room</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
