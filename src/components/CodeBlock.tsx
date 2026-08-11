'use client';

import React, { useState, useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markup'; // HTML/XML
import { Copy, Check, Code2 } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export function CodeBlock({ code, language = 'javascript', title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Prism.highlightAll();
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const getLanguageAlias = (lang: string) => {
    const l = lang.toLowerCase();
    if (l === 'js' || l === 'javascript') return 'javascript';
    if (l === 'ts' || l === 'typescript') return 'typescript';
    if (l === 'py' || l === 'python') return 'python';
    if (l === 'html' || l === 'xml') return 'markup';
    if (l === 'css') return 'css';
    if (l === 'json') return 'json';
    if (l === 'sql') return 'sql';
    if (l === 'bash' || l === 'sh' || l === 'shell') return 'bash';
    return 'javascript';
  };

  const normLang = getLanguageAlias(language);

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-900 shadow-xl my-2">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950/80 border-b border-zinc-800 text-xs font-mono text-zinc-400">
        <div className="flex items-center space-x-2">
          <Code2 className="w-4 h-4 text-indigo-400" />
          <span className="font-medium text-zinc-200">{title || `${normLang} code`}</span>
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] uppercase font-semibold">
            {normLang}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            copied
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50'
          }`}
          title="Copy code as is"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Syntax Highlighted View */}
      <div className="relative overflow-x-auto p-4 bg-zinc-950 font-mono text-sm leading-relaxed text-zinc-100">
        <pre className="!bg-transparent !p-0 !m-0 overflow-x-auto font-mono text-sm">
          <code className={`language-${normLang}`}>{code}</code>
        </pre>
      </div>
    </div>
  );
}
