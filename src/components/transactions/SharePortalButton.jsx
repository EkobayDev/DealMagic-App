import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link2, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SharePortalButton({ transaction, onTokenSaved }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [portalUrl, setPortalUrl] = useState(
    transaction?.portal_token
      ? `${window.location.origin}/ClientPortal?token=${transaction.portal_token}`
      : null
  );

  const generateLink = async () => {
    setLoading(true);
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await base44.entities.Transaction.update(transaction.id, { portal_token: token });
    const url = `${window.location.origin}/ClientPortal?token=${token}`;
    setPortalUrl(url);
    if (onTokenSaved) onTokenSaved(token);
    setLoading(false);
    copyToClipboard(url);
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url || portalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (!portalUrl) {
    return (
      <Button
        onClick={generateLink}
        disabled={loading}
        variant="outline"
        className="gap-2 text-sm"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
        {loading ? "Generating…" : "Share Client Portal"}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
        <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
        <p className="text-xs text-slate-500 flex-1 truncate">{portalUrl}</p>
        <button
          onClick={() => copyToClipboard()}
          className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
          title="Copy link"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-[11px] text-slate-400">
        {copied ? "✓ Link copied to clipboard!" : "Share this link with your client — no login required."}
      </p>
    </div>
  );
}