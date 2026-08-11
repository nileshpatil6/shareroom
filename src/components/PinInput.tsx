'use client';

import React, { useRef } from 'react';

interface PinInputProps {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
}

export function PinInput({ value, onChange, onComplete, disabled }: PinInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = [value[0] || '', value[1] || '', value[2] || '', value[3] || ''];

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const lastChar = val.slice(-1);
    if (val && !/^\d$/.test(lastChar)) return;

    const newDigits = [...digits];
    newDigits[index] = lastChar;

    const fullCode = newDigits.join('');
    onChange(fullCode);

    if (lastChar && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }

    if (fullCode.length === 4 && onComplete) {
      onComplete(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{4}$/.test(pasteData)) {
      onChange(pasteData);
      inputsRef.current[3]?.focus();
      if (onComplete) onComplete(pasteData);
    }
  };

  return (
    <div className="flex items-center justify-center space-x-3 my-4">
      {[0, 1, 2, 3].map((idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputsRef.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[idx]}
          disabled={disabled}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          className="w-14 h-16 text-center text-3xl font-extrabold font-mono bg-zinc-900 border-2 border-zinc-700/80 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-zinc-100 outline-none transition-all shadow-inner disabled:opacity-50"
          placeholder="•"
        />
      ))}
    </div>
  );
}
