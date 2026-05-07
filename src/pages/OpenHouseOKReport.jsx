import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, ExternalLink, Home, DollarSign, Eye, Search, MapPin, FileDown } from "lucide-react";
import jsPDF from "jspdf";

const formatPrice = (p) => p ? `$${Number(p).toLocaleString()}` : "—";

const formatDate = (d) => {
  if (!d) return "—";
  try {
    const parts = d.split("/");
    if (parts.length === 3) {
      return new Date(`${parts[2]}-${parts[0].padStart(2,"0")}-${parts[1].padStart(2,"0")}`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    return d;
  } catch { return d; }
};

export default function OpenHouseOKReport() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [scrapedAt, setScrapedAt] = useState(null);
  const [search, setSearch] = useState("");

  const listingSchema = {
    type: "object",
    properties: {
      listings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            address: { type: "string" },
            city: { type: "string" },
            beds: { type: "number" },
            baths: { type: "number" },
            sqft: { type: "number" },
            price: { type: "number" },
            date_listed: { type: "string" },
            tours: { type: "number" },
            status: { type: "string" },
            url: { type: "string" }
          }
        }
      }
    }
  };

  const runSweep = async () => {
    setLoading(true);

    // Two separate calls to keep response size small and avoid JSON parse errors
    setLoadingStep("Fetching active listings…");
    const [activeResult, soldResult] = await Promise.all([
      base44.integrations.Core.InvokeLLM({
        model: "gemini_3_flash",
        add_context_from_internet: true,
        prompt: `Visit www.openhouseok.com and extract ONLY the active "for sale" listings currently shown on the page.

For each listing return:
- address: street address (e.g. "123 Main St")
- city: city name (e.g. "Norman")
- beds: bedrooms as integer
- baths: bathrooms as number
- sqft: square footage as integer
- price: listing price as integer (no $ or commas)
- date_listed: MM/DD/YYYY
- tours: virtual tour view count as integer
- status: always "for_sale"
- url: full showhome.htm URL

Only include currently active for-sale listings.`,
        response_json_schema: listingSchema
      }),
      base44.integrations.Core.InvokeLLM({
        model: "gemini_3_flash",
        add_context_from_internet: true,
        prompt: `Visit www.openhouseok.com and extract ONLY listings that are NO LONGER for sale — meaning sold, pending, off market, or otherwise inactive.

For each listing return:
- address: street address (e.g. "123 Main St")
- city: city name (e.g. "Norman")
- beds: bedrooms as integer
- baths: bathrooms as number
- sqft: square footage as integer
- price: last known price as integer (no $ or commas)
- date_listed: MM/DD/YYYY
- tours: virtual tour view count as integer
- status: "sold", "pending", "off_market", or "coming_soon" as appropriate
- url: full showhome.htm URL

Only include listings that are no longer actively for sale.`,
        response_json_schema: listingSchema
      })
    ]);

    setLoadingStep("Processing results…");
    const combined = [
      ...(activeResult.listings || []),
      ...(soldResult.listings || [])
    ];
    setListings(combined);
    setScrapedAt(new Date().toISOString());
    setLoading(false);
    setLoadingStep("");
  };

  const filtered = listings.filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return l.address?.toLowerCase().includes(s) || l.city?.toLowerCase().includes(s);
  });

  const forSaleCount = listings.filter((l) => l.status === "for_sale").length;
  const soldCount = listings.filter((l) => l.status === "sold").length;
  const pendingCount = listings.filter((l) => l.status === "pending").length;
  const comingSoonCount = listings.filter((l) => l.status === "coming_soon").length;
  const avgPrice = listings.length
    ? Math.round(listings.reduce((sum, l) => sum + (l.price || 0), 0) / listings.length)
    : 0;
  const totalTours = listings.reduce((sum, l) => sum + (l.tours || 0), 0);

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const sweepDate = scrapedAt ? new Date(scrapedAt).toLocaleString() : new Date().toLocaleString();

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("OpenHouseOK.com Report", 14, 16);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Swept: ${sweepDate}  |  Total: ${listings.length}  |  For Sale: ${forSaleCount}  |  Sold: ${soldCount}  |  Pending: ${pendingCount}  |  Coming Soon: ${comingSoonCount}`, 14, 23);

    doc.setTextColor(0);
    const headers = ["Address", "City", "Price", "Bed/Bath", "Sq Ft", "Listed", "Tours", "Status"];
    const colWidths = [60, 30, 28, 22, 22, 28, 18, 24];
    let x = 14, y = 32;

    // Header row
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(30, 58, 95);
    doc.setTextColor(255, 255, 255);
    doc.rect(x, y - 5, colWidths.reduce((a, b) => a + b, 0), 7, "F");
    headers.forEach((h, i) => {
      doc.text(h, x + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 2, y);
    });
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    filtered.forEach((l, idx) => {
      if (y > 190) { doc.addPage(); y = 14; }
      if (idx % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(14, y - 4, colWidths.reduce((a, b) => a + b, 0), 7, "F"); }
      const row = [
        l.address || "—",
        l.city || "—",
        formatPrice(l.price),
        `${l.beds || 0}bd / ${l.baths || 0}ba`,
        l.sqft ? l.sqft.toLocaleString() : "—",
        formatDate(l.date_listed),
        l.tours ? l.tours.toLocaleString() : "—",
        STATUS_CONFIG[l.status]?.label || l.status || "—"
      ];
      row.forEach((cell, i) => {
        const cx = 14 + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 2;
        doc.text(String(cell).substring(0, 30), cx, y);
      });
      y += 7;
    });

    doc.save(`OpenHouseOK-Report-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const cityMap = {};
  listings.forEach((l) => { const c = l.city || "Unknown"; cityMap[c] = (cityMap[c] || 0) + 1; });
  const cities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">OpenHouseOK.com Report</h1>
          <p className="text-sm text-slate-500 mt-1">
            Live sweep of all listings on{" "}
            <a href="https://www.openhouseok.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
              openhouseok.com <ExternalLink className="w-3 h-3" />
            </a>
          </p>
          {scrapedAt && (
            <p className="text-xs text-slate-400 mt-1">Last swept: {new Date(scrapedAt).toLocaleString()}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {listings.length > 0 && (
            <Button
              onClick={exportPDF}
              variant="outline"
              className="gap-2"
            >
              <FileDown className="w-4 h-4" />
              Export PDF
            </Button>
          )}
          <Button
            onClick={runSweep}
            disabled={loading}
            className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {listings.length === 0 ? "Run Sweep" : "Re-Sweep"}
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">{loadingStep}</p>
          <p className="text-xs text-slate-400">This may take 30–60 seconds…</p>
        </div>
      )}

      {/* Stats */}
      {!loading && listings.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard icon={Home} label="Total" value={listings.length} color="text-blue-600" bg="bg-blue-50" />
            <StatCard icon={Home} label="For Sale" value={forSaleCount} color="text-emerald-600" bg="bg-emerald-50" />
            <StatCard icon={Home} label="Sold" value={soldCount} color="text-red-600" bg="bg-red-50" />
            <StatCard icon={Home} label="Pending" value={pendingCount} color="text-amber-600" bg="bg-amber-50" />
            <StatCard icon={Home} label="Coming Soon" value={comingSoonCount} color="text-purple-600" bg="bg-purple-50" />
            <StatCard icon={DollarSign} label="Avg. Price" value={formatPrice(avgPrice)} color="text-slate-600" bg="bg-slate-100" />
            <StatCard icon={Eye} label="Tour Views" value={totalTours.toLocaleString()} color="text-purple-600" bg="bg-purple-50" />
          </div>

          {/* City Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" /> Listings by City
            </h2>
            <div className="flex flex-wrap gap-2">
              {cities.map(([city, count]) => (
                <button
                  key={city}
                  onClick={() => setSearch(city)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-[#FFFF00]/30 hover:border-yellow-400 transition-colors"
                >
                  {city} · {count}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by address or city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">All Listings</h2>
              <span className="text-xs text-slate-400">{filtered.length} shown</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3">Address</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3 hidden md:table-cell">City</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3">Price</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3 hidden lg:table-cell">Bed/Bath</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3 hidden lg:table-cell">Sq Ft</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3 hidden xl:table-cell">Listed</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3 hidden xl:table-cell">Tours</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((l, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        {l.url ? (
                          <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                            {l.address} <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-slate-800">{l.address}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell text-sm text-slate-500">{l.city}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-slate-800">{formatPrice(l.price)}</td>
                      <td className="px-5 py-3 hidden lg:table-cell text-sm text-slate-500">{l.beds}bd / {l.baths}ba</td>
                      <td className="px-5 py-3 hidden lg:table-cell text-sm text-slate-500">{l.sqft ? l.sqft.toLocaleString() : "—"}</td>
                      <td className="px-5 py-3 hidden xl:table-cell text-sm text-slate-500">{formatDate(l.date_listed)}</td>
                      <td className="px-5 py-3 hidden xl:table-cell text-sm text-slate-500">{l.tours ? l.tours.toLocaleString() : "—"}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={l.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && listings.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center text-slate-400">
          <Home className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-medium mb-1">No listings loaded yet</p>
          <p className="text-xs">Click "Run Sweep" to fetch all current listings from OpenHouseOK.com</p>
        </div>
      )}
    </div>
  );
}

const STATUS_CONFIG = {
  for_sale:    { label: "For Sale",    cls: "bg-emerald-50 text-emerald-700" },
  sold:        { label: "Sold",        cls: "bg-red-50 text-red-700" },
  pending:     { label: "Pending",     cls: "bg-amber-50 text-amber-700" },
  off_market:  { label: "Off Market",  cls: "bg-slate-100 text-slate-500" },
  coming_soon: { label: "Coming Soon", cls: "bg-purple-50 text-purple-700" },
  other:       { label: "Other",       cls: "bg-slate-100 text-slate-500" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.other;
  return (
    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}