import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { API_BASE } from '../services/incident.api';

const COMMANDS = [
  {
    title: 'Cart with no currency (TypeError)',
    command: `curl -X POST ${API_BASE}/api/demo/checkout -H 'Content-Type: application/json' -d '{"customer_id":"cus_1","total":49.99}'`,
  },
  {
    title: 'Empty order (ZeroDivisionError)',
    command: `curl ${API_BASE}/api/demo/orders/ord_empty/average-price`,
  },
  {
    title: 'Payment provider down (TimeoutError)',
    command: `curl -X POST ${API_BASE}/api/demo/payments/charge -H 'Content-Type: application/json' -d '{"customer_id":"cus_9","amount":120}'`,
  },
];

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable on plain http origins; the command stays selectable.
    }
  };
  return (
    <button className="btn h-8 shrink-0 !px-2.5 text-xs" onClick={copy} aria-label="Copy command">
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

/** Commands that make the demo service crash, so people can start an incident. */
export const TriggerHelp: React.FC = () => (
  <ul className="divide-y divide-line text-left">
    {COMMANDS.map((c) => (
      <li key={c.title} className="px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">{c.title}</p>
          <CopyButton text={c.command} />
        </div>
        <pre className="scroll-slim mt-2 overflow-x-auto rounded-md border border-line bg-sunken px-3 py-2 font-mono text-xs leading-5 text-muted">{c.command}</pre>
      </li>
    ))}
  </ul>
);
