"use client";

import { useState, useCallback } from "react";

interface CopyableIdProps {
  /** The text to display */
  label: string;
  /** The full value to copy (defaults to label if not provided) */
  copyValue?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A small inline ID badge that copies its value to the clipboard on click.
 * Shows a "Copied!" tooltip on hover-then-click.
 */
export default function CopyableId({ label, copyValue, className = "" }: CopyableIdProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(copyValue || label);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = copyValue || label;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [copyValue, label]);

  return (
    <span
      onClick={handleCopy}
      className={`relative inline-flex items-center gap-1 cursor-pointer group ${className}`}
      title={copied ? "Copied!" : `Click to copy: ${copyValue || label}`}
    >
      <span className="group-hover:text-violet-600 transition-colors">{label}</span>
      {/* Copy icon, visible on hover */}
      <svg
        className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity text-gray-400 group-hover:text-violet-500 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      {/* Copied tooltip */}
      {copied && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded whitespace-nowrap z-50 pointer-events-none">
          Copied!
        </span>
      )}
    </span>
  );
}
