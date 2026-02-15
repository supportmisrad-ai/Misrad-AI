'use client';

import React, { useState, useCallback } from 'react';

interface ContractorPortalLinkCopyProps {
  token: string;
}

const ContractorPortalLinkCopy: React.FC<ContractorPortalLinkCopyProps> = ({ token }) => {
  const [copied, setCopied] = useState(false);

  const link = typeof window !== 'undefined'
    ? `${window.location.origin}/portal/ops/${encodeURIComponent(token)}`
    : `/portal/ops/${encodeURIComponent(token)}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const input = document.createElement('input');
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [link]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link}
          dir="ltr"
          className="flex-1 h-10 rounded-lg border border-emerald-200 bg-white px-3 text-sm font-mono text-slate-800 outline-none select-all"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={handleCopy}
          className={`shrink-0 h-10 inline-flex items-center justify-center rounded-lg px-4 text-sm font-bold transition-all duration-150 shadow-sm ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {copied ? 'הועתק!' : 'העתק'}
        </button>
      </div>
    </div>
  );
};

export default ContractorPortalLinkCopy;
