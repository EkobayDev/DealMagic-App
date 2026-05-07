import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ExternalLink, RefreshCw, MapPin, Bed, Bath, Square, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";

export default function OKCListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchListings = async () => {
    setLoading(true);
    const res = await base44.functions.invoke("getOKCListings", {});
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const filtered = (res.data?.listings || []).filter((l) => {
      if (!l.date_listed) return false;
      try { return parseISO(l.date_listed) >= cutoff; } catch { return false; }
    });
    setListings(filtered);
    setLastFetched(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const formatPrice = (price) =>
    price ? `$${price.toLocaleString()}` : "—";

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try { return format(parseISO(dateStr), "MMM d, yyyy"); } catch { return dateStr; }
  };

  const buildZillowUrl = (listing) => {
    if (listing.zillow_url) return listing.zillow_url;
    const slug = listing.address.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-");
    return `https://www.zillow.com/homes/${slug}_rb/`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New OKC Metro Listings</h1>
          <p className="text-sm text-slate-500 mt-1">Newly active listings in the last 7 days</p>
          {lastFetched && (
            <p className="text-xs text-slate-400 mt-0.5">
              Updated {format(lastFetched, "MMM d, h:mm a")}
            </p>
          )}
        </div>
        <Button
          onClick={fetchListings}
          disabled={loading}
          variant="outline"
          className="gap-2 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Fetching latest OKC Metro listings…</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
          <MapPin className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="text-sm">No listings found. Try refreshing.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400">{listings.length} listing{listings.length !== 1 ? "s" : ""} found</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {listings.map((listing, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow flex flex-col gap-3"
              >
                {/* Address + Zillow link */}
                <div>
                  <a
                    href={buildZillowUrl(listing)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-start gap-1.5 leading-snug"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {listing.address}
                  </a>
                  {listing.city && (
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {listing.city}
                    </p>
                  )}
                </div>

                {/* Price */}
                <p className="text-xl font-bold text-slate-900">{formatPrice(listing.list_price)}</p>

                {/* Details row */}
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  {listing.beds > 0 && (
                    <span className="flex items-center gap-1">
                      <Bed className="w-3.5 h-3.5" /> {listing.beds} bd
                    </span>
                  )}
                  {listing.baths > 0 && (
                    <span className="flex items-center gap-1">
                      <Bath className="w-3.5 h-3.5" /> {listing.baths} ba
                    </span>
                  )}
                  {listing.sqft > 0 && (
                    <span className="flex items-center gap-1">
                      <Square className="w-3.5 h-3.5" /> {listing.sqft?.toLocaleString()} sqft
                    </span>
                  )}
                </div>

                {/* Active badge */}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 w-fit">
                  ● Active
                </span>

                {/* Date listed */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Listed {formatDate(listing.date_listed)}
                  </span>
                  {listing.days_on_market !== undefined && listing.days_on_market !== null && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      {listing.days_on_market === 0 ? "New today" : `${listing.days_on_market}d on market`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}