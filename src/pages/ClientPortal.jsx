import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import { CheckCircle2, Clock, AlertTriangle, Home, Calendar, FileText, PenLine, ChevronRight } from "lucide-react";

const STATUS_LABEL = {
  active: { label: "Active Listing", color: "bg-emerald-100 text-emerald-700" },
  under_contract: { label: "Under Contract", color: "bg-blue-100 text-blue-700" },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700" },
  closed: { label: "Closed", color: "bg-slate-100 text-slate-600" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
  expired: { label: "Expired", color: "bg-slate-100 text-slate-500" },
};

const DEADLINE_STYLE = {
  overdue: { bg: "bg-red-50 border-red-200", label: "text-red-600", badge: "bg-red-100 text-red-700", icon: AlertTriangle },
  today: { bg: "bg-amber-50 border-amber-200", label: "text-amber-700", badge: "bg-amber-100 text-amber-700", icon: Clock },
  urgent: { bg: "bg-orange-50 border-orange-200", label: "text-orange-700", badge: "bg-orange-100 text-orange-700", icon: Clock },
  upcoming: { bg: "bg-slate-50 border-slate-200", label: "text-slate-700", badge: "bg-slate-100 text-slate-600", icon: Calendar },
};

function deadlineBadgeText(d) {
  if (d.status === "overdue") return `${Math.abs(d.diffDays)}d overdue`;
  if (d.status === "today") return "Due today";
  if (d.diffDays === 1) return "Tomorrow";
  return `In ${d.diffDays} days`;
}

export default function ClientPortal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    if (!token) { setError("No portal link token found."); setLoading(false); return; }
    base44.functions.invoke("getClientPortal", { token })
      .then((res) => {
        if (res.data?.error) setError(res.data.error);
        else setData(res.data);
      })
      .catch(() => setError("Failed to load portal. Please try again."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Link Not Found</h1>
        <p className="text-slate-500 text-sm">{error}</p>
        <p className="text-slate-400 text-xs mt-3">Contact your agent for a new portal link.</p>
      </div>
    </div>
  );

  const { transaction: tx, deadlines, signature_requests } = data;
  const statusInfo = STATUS_LABEL[tx.status] || { label: tx.status, color: "bg-slate-100 text-slate-600" };
  const pendingDocs = signature_requests.filter(r => r.status === "pending");
  const signedDocs = signature_requests.filter(r => r.status === "signed");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="text-white py-8 px-6" style={{ backgroundColor: "#1e3a5f" }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <img
              src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
              alt="DealMagic"
              className="h-12 w-auto object-contain bg-white rounded-lg px-2 py-1"
            />
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Home className="w-5 h-5 text-[#FFFF00]" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-snug">{tx.property_address}</h1>
              <p className="text-slate-300 text-sm">{[tx.city, tx.state, tx.zip].filter(Boolean).join(", ")}</p>
              <span className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Key Info */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Transaction Summary</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {tx.purchase_price > 0 && (
              <div>
                <p className="text-slate-400 text-xs">Purchase Price</p>
                <p className="font-semibold text-slate-800">${tx.purchase_price?.toLocaleString()}</p>
              </div>
            )}
            {tx.closing_date && (
              <div>
                <p className="text-slate-400 text-xs">Closing Date</p>
                <p className="font-semibold text-slate-800">
                  {format(parseISO(tx.closing_date), "MMMM d, yyyy")}
                </p>
              </div>
            )}
            {tx.transaction_type && (
              <div>
                <p className="text-slate-400 text-xs">Type</p>
                <p className="font-semibold text-slate-800 capitalize">{tx.transaction_type}</p>
              </div>
            )}
            {tx.representing && (
              <div>
                <p className="text-slate-400 text-xs">Represented As</p>
                <p className="font-semibold text-slate-800 capitalize">{tx.representing}</p>
              </div>
            )}
          </div>
        </div>

        {/* Documents to Sign */}
        {pendingDocs.length > 0 && (
          <div className="bg-white rounded-2xl border border-amber-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <PenLine className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wider">
                Action Required — {pendingDocs.length} Document{pendingDocs.length !== 1 ? "s" : ""} to Sign
              </h2>
            </div>
            <div className="space-y-2">
              {pendingDocs.map((doc) => (
                <a
                  key={doc.id}
                  href={`/Sign?token=${doc.token}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-100 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{doc.form_name}</p>
                      <p className="text-xs text-slate-500">Tap to review & sign</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Signed Docs */}
        {signedDocs.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Signed Documents</h2>
            </div>
            <div className="space-y-2">
              {signedDocs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{doc.form_name}</p>
                    {doc.signed_at && (
                      <p className="text-xs text-slate-400">
                        Signed {format(new Date(doc.signed_at), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deadlines */}
        {deadlines.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Important Dates</h2>
            </div>
            <div className="space-y-2">
              {deadlines.map((d, i) => {
                const style = DEADLINE_STYLE[d.status];
                const Icon = style.icon;
                return (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${style.bg}`}>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${style.label} shrink-0`} />
                      <div>
                        <p className={`text-sm font-semibold ${style.label}`}>{d.label}</p>
                        <p className="text-xs text-slate-400">{format(parseISO(d.date), "MMMM d, yyyy")}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                      {deadlineBadgeText(d)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pendingDocs.length === 0 && deadlines.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-300" />
            <p className="text-sm">Everything is up to date. No action needed.</p>
          </div>
        )}

        <p className="text-center text-xs text-slate-300 pb-6">Powered by DealMagic Oklahoma · This link was shared securely by your agent.</p>
      </div>
    </div>
  );
}