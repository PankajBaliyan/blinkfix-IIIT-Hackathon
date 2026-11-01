import React, { useState } from 'react';
import { GitCompare, Copy, Check, FileCode } from 'lucide-react';
import { Scenario } from '../types';

interface CodeDiffViewerProps {
  scenario: Scenario;
}

export const CodeDiffViewer: React.FC<CodeDiffViewerProps> = ({ scenario }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(scenario.fixedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-obsidian-750 bg-obsidian-900/90 overflow-hidden shadow-xl">
      {/* Diff Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-obsidian-850 border-b border-obsidian-750">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-terminal-cyan" />
          <span className="font-mono text-xs font-bold text-white">
            Unified Code Diff
          </span>
          <span className="text-slate-600 font-mono text-xs">|</span>
          <span className="font-mono text-xs text-slate-300 flex items-center gap-1">
            <FileCode className="w-3.5 h-3.5 text-slate-400" />
            <span>{scenario.file}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            -2
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-green/15 text-terminal-green border border-terminal-green/30">
            +3
          </span>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded bg-obsidian-800 hover:bg-obsidian-700 text-slate-300 text-xs font-mono transition border border-obsidian-700"
            title="Copy Patched Code"
          >
            {copied ? <Check className="w-3 h-3 text-terminal-green" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Code Diff Body */}
      <div className="p-4 bg-obsidian-950 font-mono text-xs overflow-x-auto leading-relaxed">
        <div className="text-slate-500 select-none pb-2 border-b border-obsidian-850">
          @@ -1,9 +1,11 @@ {scenario.file}
        </div>

        {scenario.id === 'payments-typeerror' ? (
          <div className="pt-2 space-y-0.5">
            <div className="text-slate-400">
              <span className="text-slate-600 select-none mr-3">1</span>
              <span>const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);</span>
            </div>
            <div className="text-slate-400">
              <span className="text-slate-600 select-none mr-3">2</span>
              <span>&nbsp;</span>
            </div>
            <div className="text-slate-400">
              <span className="text-slate-600 select-none mr-3">3</span>
              <span>async function processPayment(cart, customer) &#123;</span>
            </div>
            <div className="bg-red-500/10 text-red-300 -mx-4 px-4 py-0.5 border-l-2 border-red-500">
              <span className="text-red-500 select-none mr-3 font-bold">-</span>
              <span className="text-slate-600 select-none mr-3">4</span>
              <span>&nbsp;&nbsp;// Bug: user currency metadata is undefined when cart.currency is omitted</span>
            </div>
            <div className="bg-red-500/15 text-red-300 -mx-4 px-4 py-0.5 border-l-2 border-red-500">
              <span className="text-red-500 select-none mr-3 font-bold">-</span>
              <span className="text-slate-600 select-none mr-3">5</span>
              <span>&nbsp;&nbsp;const amountInCents = cart.total * cart.currency.exchangeRate;</span>
            </div>
            <div className="bg-terminal-green/10 text-emerald-300 -mx-4 px-4 py-0.5 border-l-2 border-terminal-green">
              <span className="text-terminal-green select-none mr-3 font-bold">+</span>
              <span className="text-slate-600 select-none mr-3">4</span>
              <span>&nbsp;&nbsp;// Safe patch: optional chaining with fallback exchange rate and currency code</span>
            </div>
            <div className="bg-terminal-green/15 text-emerald-300 -mx-4 px-4 py-0.5 border-l-2 border-terminal-green font-semibold">
              <span className="text-terminal-green select-none mr-3 font-bold">+</span>
              <span className="text-slate-600 select-none mr-3">5</span>
              <span>&nbsp;&nbsp;const rate = cart?.currency?.exchangeRate ?? 1.0;</span>
            </div>
            <div className="bg-terminal-green/15 text-emerald-300 -mx-4 px-4 py-0.5 border-l-2 border-terminal-green font-semibold">
              <span className="text-terminal-green select-none mr-3 font-bold">+</span>
              <span className="text-slate-600 select-none mr-3">6</span>
              <span>&nbsp;&nbsp;const currencyCode = cart?.currency?.code ?? 'usd';</span>
            </div>
            <div className="bg-terminal-green/10 text-emerald-300 -mx-4 px-4 py-0.5 border-l-2 border-terminal-green">
              <span className="text-terminal-green select-none mr-3 font-bold">+</span>
              <span className="text-slate-600 select-none mr-3">7</span>
              <span>&nbsp;&nbsp;const amountInCents = cart.total * rate;</span>
            </div>
            <div className="text-slate-400">
              <span className="text-slate-600 select-none mr-3">8</span>
              <span>&nbsp;&nbsp;return await stripe.charges.create(&#123;</span>
            </div>
            <div className="text-slate-400">
              <span className="text-slate-600 select-none mr-3">9</span>
              <span>&nbsp;&nbsp;&nbsp;&nbsp;amount: Math.round(amountInCents),</span>
            </div>
          </div>
        ) : (
          <div className="pt-2 text-slate-300">
            <pre><code>{scenario.fixedCode}</code></pre>
          </div>
        )}
      </div>
    </div>
  );
};

