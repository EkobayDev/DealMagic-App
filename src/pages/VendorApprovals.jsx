import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, Clock, Globe, Mail, Phone, MapPin, Play, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending:  { label: "Pending",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200" },
};

const CATEGORY_COLORS = {
  appraisers: "bg-purple-100 text-purple-700",
  inspectors: "bg-blue-100 text-blue-700",
  lawn: "bg-green-100 text-green-700",
  roofers: "bg-orange-100 text-orange-700",
  termite: "bg-red-100 text-red-700",
  title: "bg-teal-100 text-teal-700",
  make_ready_cleaning: "bg-pink-100 text-pink-700",
  painters: "bg-indigo-100 text-indigo-700",
  flooring: "bg-amber-100 text-amber-700",
  handyman: "bg-cyan-100 text-cyan-700",
  hauling_debris: "bg-stone-100 text-stone-700",
};

export default function VendorApprovals() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("pending");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["pending_vendors"],
    queryFn: () => base44.entities.PendingVendor.list("-created_date", 200),
  });

  const approveMutation = useMutation({
    mutationFn: async (pv) => {
      // Create the real Vendor record
      await base44.entities.Vendor.create({
        business_name: pv.business_name,
        category: pv.category,
        contact_name: pv.contact_name,
        email: pv.email,
        cell_phone: pv.cell_phone,
        website: pv.website,
        address: pv.address,
        city: pv.city,
        state: pv.state,
        zip: pv.zip,
        logo_url: pv.logo_url,
        contact_photo_url: pv.contact_photo_url,
        elevator_pitch_url: pv.elevator_pitch_url,
        notes: pv.notes,
        liked_by: [],
      });
      // Update pending record status
      await base44.entities.PendingVendor.update(pv.id, { status: "approved" });
      // Notify vendor
      await base44.functions.invoke("notifyVendorApproval", { vendor: pv, approved: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending_vendors"] });
      qc.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor approved and added to the directory!");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ pv, reason }) => {
      await base44.entities.PendingVendor.update(pv.id, { status: "rejected", rejection_reason: reason });
      await base44.functions.invoke("notifyVendorApproval", { vendor: pv, approved: false, reason });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending_vendors"] });
      setRejectingId(null);
      setRejectReason("");
      toast.success("Vendor application rejected.");
    },
  });

  const filtered = pending.filter((p) => filter === "all" || p.status === filter);

  const counts = {
    pending: pending.filter((p) => p.status === "pending").length,
    approved: pending.filter((p) => p.status === "approved").length,
    rejected: pending.filter((p) => p.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendor Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">Review and approve vendor registration applications</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-fit">
            <span>Registration link:</span>
            <code className="text-violet-600 font-mono select-all">{window.location.origin}/VendorRegister</code>
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/VendorRegister`); toast.success("Link copied!"); }}
              className="text-violet-500 hover:text-violet-700 underline">Copy</button>
          </div>
        </div>
        <img
          src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
          alt="DealMagic"
          className="h-20 w-auto object-contain"
          style={{ mixBlendMode: "multiply" }}
        />
      </div>

      {/* Stats + filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["pending", "approved", "rejected", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              filter === s ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== "all" && counts[s] > 0 && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${filter === s ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                {counts[s]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Applications */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <Clock className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="text-sm">No {filter !== "all" ? filter : ""} applications found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((pv) => {
            const statusCfg = STATUS_CONFIG[pv.status] || STATUS_CONFIG.pending;
            const catColor = CATEGORY_COLORS[pv.category] || "bg-slate-100 text-slate-500";
            return (
              <div key={pv.id} className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-start gap-4">
                  {/* Contact photo */}
                  <div className="shrink-0">
                    {pv.contact_photo_url ? (
                      <img src={pv.contact_photo_url} alt={pv.contact_name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-200" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl font-bold">
                        {pv.business_name?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {pv.logo_url && <img src={pv.logo_url} alt="logo" className="h-6 w-auto object-contain rounded border border-slate-100" />}
                          <p className="font-bold text-slate-900 text-lg">{pv.business_name}</p>
                          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${catColor}`}>
                            {pv.category?.replace(/_/g, " ")}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.cls}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5">{pv.contact_name}</p>
                      </div>

                      {pv.status === "pending" && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => { setRejectingId(pv.id); setRejectReason(""); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button
                            onClick={() => approveMutation.mutate(pv)}
                            disabled={approveMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold transition-colors disabled:opacity-60"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {pv.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{pv.email}</span>}
                      {pv.cell_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{pv.cell_phone}</span>}
                      {pv.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[pv.city, pv.state].filter(Boolean).join(", ")}</span>}
                      {pv.website && (
                        <a href={pv.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-violet-600 hover:underline">
                          <Globe className="w-3 h-3" /> Website <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>

                    {pv.notes && (
                      <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 italic">"{pv.notes}"</p>
                    )}

                    {pv.elevator_pitch_url && (
                      <div className="mt-2">
                        <video
                          src={pv.elevator_pitch_url}
                          controls
                          className="rounded-xl border border-slate-200 max-h-40 w-full object-cover"
                        />
                      </div>
                    )}

                    {pv.status === "rejected" && pv.rejection_reason && (
                      <p className="mt-2 text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">
                        Rejection reason: {pv.rejection_reason}
                      </p>
                    )}

                    <p className="text-[10px] text-slate-300 mt-2">
                      Submitted {pv.created_date ? new Date(pv.created_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "recently"}
                    </p>
                  </div>
                </div>

                {/* Reject dialog inline */}
                {rejectingId === pv.id && (
                  <div className="mt-4 border-t border-slate-100 pt-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-500">Reason for rejection (optional, sent to vendor):</p>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                      placeholder="e.g. Category is full, incomplete information, service area not covered..."
                      className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-300 resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setRejectingId(null)} className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                      <button
                        onClick={() => rejectMutation.mutate({ pv, reason: rejectReason })}
                        disabled={rejectMutation.isPending}
                        className="px-3 py-1.5 text-xs bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}