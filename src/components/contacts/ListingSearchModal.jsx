import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { ExternalLink, Bed, Bath, Square, Calendar, Search } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function ListingSearchModal({ open, onClose, contact }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && contact?.notes) {
      setListings([]);
      setLoading(true);
      base44.functions.invoke("searchListingsByNotes", { notes: contact.notes })
        .then((res) => setListings(res.data?.listings || []))
        .finally(() => setLoading(false));
    }
  }, [open, contact]);

  const formatPrice = (p) => p ? `$${p.toLocaleString()}` : "—";
  const formatDate = (d) => {
    try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d || "—"; }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-600" />
            Listings for {contact?.full_name}
          </DialogTitle>
        </DialogHeader>

        {contact?.notes && (
          <div className="bg-slate-50 rounded-xl px-4 py-3 text-xs text-slate-600 border border-slate-100">
            <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">Search criteria (from notes)</span>
            {contact.notes}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Searching current listings…</p>
          </div>
        ) : listings.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-10">No matching listings found.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">{listings.length} listing{listings.length !== 1 ? "s" : ""} found</p>
            {listings.map((l, idx) => (
              <div key={idx} className="bg-white border border-slate-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <a
                      href={l.zillow_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-blue-600 hover:underline flex items-start gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      {l.address}
                    </a>
                    {(l.city || l.state || l.zip) && (
                      <p className="text-sm text-slate-500 mt-0.5">
                        {[l.city, l.state, l.zip].filter(Boolean).join(", ")}
                      </p>
                    )}
                    <p className="text-xl font-bold text-slate-900 mt-1">{formatPrice(l.list_price)}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-1.5">
                      {l.beds > 0 && <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" />{l.beds} bd</span>}
                      {l.baths > 0 && <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{l.baths} ba</span>}
                      {l.sqft > 0 && <span className="flex items-center gap-1"><Square className="w-3.5 h-3.5" />{l.sqft?.toLocaleString()} sqft</span>}
                      {l.date_listed && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Listed {formatDate(l.date_listed)}</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    ● Active
                  </span>
                </div>
                {l.match_reason && (
                  <p className="mt-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5 border border-emerald-100">
                    ✓ {l.match_reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}