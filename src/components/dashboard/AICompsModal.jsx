import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, TrendingUp, TrendingDown, Minus, MapPin, DollarSign, BarChart2 } from "lucide-react";

export function AICompsBadge({ transaction, className = "" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors border border-violet-200 ${className}`}
        title="AI Listing Comps"
      >
        <Sparkles className="w-2.5 h-2.5" />
        AI Comps
      </button>
      <AICompsModal open={open} onClose={() => setOpen(false)} transaction={transaction} />
    </>
  );
}

export default function AICompsModal({ open, onClose, transaction }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const address = [transaction?.property_address, transaction?.city, transaction?.state, transaction?.zip]
    .filter(Boolean).join(", ");

  const fetchComps = async () => {
    if (result || loading) return;
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a real estate analyst. Provide comparable sales (comps) analysis for this listing:

Address: ${address}
Property Type: ${transaction?.property_type?.replace("_", " ") || "single family"}
Price: ${(transaction?.purchase_price || transaction?.listing_price) ? `$${(transaction.purchase_price || transaction.listing_price).toLocaleString()}` : "unknown"}
Status: ${transaction?.status || "active"}

Return a JSON object with:
- market_value_low: number (estimated low value)
- market_value_high: number (estimated high value)
- comps: array of 3-4 objects each with { address: string, sale_price: number, sqft: number, price_per_sqft: number, proximity: string, beds: number, baths: number, sold_date: string }
- recommendation: "overpriced" | "underpriced" | "priced_correctly"
- recommendation_note: string (1-2 sentences explaining why)
- market_summary: string (2-3 sentences on local market conditions)`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          market_value_low: { type: "number" },
          market_value_high: { type: "number" },
          comps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                address: { type: "string" },
                sale_price: { type: "number" },
                sqft: { type: "number" },
                price_per_sqft: { type: "number" },
                proximity: { type: "string" },
                beds: { type: "number" },
                baths: { type: "number" },
                sold_date: { type: "string" },
              }
            }
          },
          recommendation: { type: "string" },
          recommendation_note: { type: "string" },
          market_summary: { type: "string" },
        }
      }
    });
    setResult(res);
    setLoading(false);
  };

  useEffect(() => {
    if (open) { setResult(null); fetchComps(); }
  }, [open]);

  const fmt = (n) => n != null ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—";

  const recConfig = {
    overpriced: { label: "Overpriced", color: "bg-red-50 text-red-700 border-red-200", icon: TrendingDown },
    underpriced: { label: "Underpriced", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: TrendingUp },
    priced_correctly: { label: "Priced Correctly", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Minus },
  };

  const rec = recConfig[result?.recommendation] || recConfig.priced_correctly;
  const RecIcon = rec.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-violet-500" />
            AI Listing Comps
          </DialogTitle>
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" /> {address}
          </p>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            <span className="text-sm">Researching comps & market data...</span>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4 pt-1">

            {/* Market Value Range */}
            <div className="bg-violet-50 rounded-xl p-4 border border-violet-100 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-400 mb-1">Estimated Market Value</p>
                <p className="text-2xl font-bold text-violet-800">
                  {fmt(result.market_value_low)} – {fmt(result.market_value_high)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-violet-300 shrink-0" />
            </div>

            {/* Pricing Recommendation */}
            <div className={`rounded-xl p-4 border flex items-start gap-3 ${rec.color}`}>
              <RecIcon className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">{rec.label}</p>
                <p className="text-xs mt-0.5 leading-relaxed opacity-80">{result.recommendation_note}</p>
              </div>
            </div>

            {/* Comparable Sales */}
            {result.comps?.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5" /> Comparable Sales
                </p>
                <div className="space-y-2">
                  {result.comps.map((c, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 grid grid-cols-[1fr_auto] gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800 truncate">{c.address}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {c.beds && <span className="text-xs text-slate-500">{c.beds} bd</span>}
                          {c.baths && <span className="text-xs text-slate-500">{c.baths} ba</span>}
                          {c.sqft && <span className="text-xs text-slate-500">{Number(c.sqft).toLocaleString()} sqft</span>}
                          {c.price_per_sqft && <span className="text-xs text-slate-400">{fmt(c.price_per_sqft)}/sqft</span>}
                          <span className="text-xs text-slate-400">{c.proximity}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-800">{fmt(c.sale_price)}</p>
                        {c.sold_date && <p className="text-[10px] text-slate-400 mt-0.5">{c.sold_date}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Market Summary */}
            {result.market_summary && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Market Conditions</p>
                <p className="text-sm text-slate-600 leading-relaxed">{result.market_summary}</p>
              </div>
            )}

            <p className="text-[10px] text-slate-300 text-center">AI-generated analysis · Not a licensed appraisal</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}