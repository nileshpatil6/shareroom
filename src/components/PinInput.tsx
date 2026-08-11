'use client';

import React, { useRef } from 'react';

export const CODE_LENGTH = 6;

interface PinInputProps {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
}

const sanitize = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function PinInput({ value, onChange, onComplete, disabled }: PinInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] || '');

  const commit = (next: string[], focusIndex: number) => {
    const fullCode = next.join('').slice(0, CODE_LENGTH);
    onChange(fullCode);

    if (focusIndex >= 0 && focusIndex < CODE_LENGTH) {
      inputsRef.current[focusIndex]?.focus();
    }

    if (fullCode.length === CODE_LENGTH && onComplete) {
      onComplete(fullCode);
    }
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const typed = sanitize(e.target.value);
    if (!typed) {
      const next = [...chars];
      next[index] = '';
      commit(next, index);
      return;
    }

    // Typing or pasting multiple chars into one box fills forward
    const next = [...chars];
    let cursor = index;
    for (const ch of typed) {
      if (cursor >= CODE_LENGTH) break;
      next[cursor] = ch;
      cursor++;
    }
    commit(next, Math.min(cursor, CODE_LENGTH - 1));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chars[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputsRef.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = sanitize(e.clipboardData.getData('text'));
    if (!pasted) return;

    const next = [...chars];
    let cursor = index;
    for (const ch of pasted) {
      if (cursor >= CODE_LENGTH) break;
      next[cursor] = ch;
      cursor++;
    }
    commit(next, Math.min(cursor, CODE_LENGTH - 1));
  };

  return (
    <div className="flex items-center justify-center gap-2 my-4">
      {chars.map((char, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputsRef.current[idx] = el;
          }}
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={CODE_LENGTH}
          value={char}
          disabled={disabled}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={(e) => handlePaste(idx, e)}
          className="w-11 h-14 text-center text-2xl font-extrabold font-mono uppercase bg-zinc-900 border-2 border-zinc-700/80 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-zinc-100 outline-none transition-all shadow-inner disabled:opacity-50"
          placeholder="•"
        />
      ))}
    </div>
  );
}
