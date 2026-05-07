import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  PenLine, Upload, Send, CheckCircle2, Clock, X, Plus, ExternalLink,
  FileText, Trash2, Copy, Search, Shield, Link as LinkIcon, History, FilePlus, Eye, Download, Loader2
} from "lucide-react";
import SignaturePad from "@/components/signatures/SignaturePad";
import { format } from "date-fns";
import { toast } from "sonner";

const ROLES = [
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "buyer_agent", label: "Buyer's Agent" },
  { value: "seller_agent", label: "Seller's Agent" },
  { value: "other", label: "Other" },
];

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock, color: "bg-amber-50 text-amber-700 border-amber-200" },
  signed:  { label: "Signed",  icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  declined:{ label: "Declined",icon: X, color: "bg-red-50 text-red-700 border-red-200" },
};

const generateToken = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// ── Upload & Send Document modal ─────────────────────────────────────────────
function NewDocumentModal({ open, onClose, onCreated }) {
  const [step, setStep] = useState(1); // 1=doc info, 2=add signers
  const [docName, setDocName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);
  const [fileName, setFileName] = useState("");
  const [signers, setSigners] = useState([{ name: "", email: "", role: "buyer" }]);
  const [recentSearch, setRecentSearch] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const { data: clientDocs = [] } = useQuery({
    queryKey: ["client-docs-esig", currentUser?.email],
    queryFn: () => base44.entities.ClientDocument.filter({ generated_by: currentUser.email }, "-created_date", 30),
    enabled: !!currentUser && open,
  });

  const { data: txDocs = [] } = useQuery({
    queryKey: ["tx-docs-esig", currentUser?.email],
    queryFn: () => base44.entities.TransactionDocument.filter({ created_by: currentUser.email }, "-created_date", 30),
    enabled: !!currentUser && open,
  });

  const recentForms = useMemo(() => {
    const combined = [
      ...clientDocs.map((d) => ({ id: d.id, name: d.name, fileUrl: d.file_url, subtitle: d.contact_name || "", source: "Client Doc" })),
      ...txDocs.filter((d) => d.doc_type === "form").map((d) => ({ id: d.id, name: d.name, fileUrl: null, subtitle: d.transaction_address || "", source: "Transaction" })),
    ];
    const q = recentSearch.toLowerCase();
    return q ? combined.filter((d) => d.name.toLowerCase().includes(q) || d.subtitle.toLowerCase().includes(q)) : combined;
  }, [clientDocs, txDocs, recentSearch]);

  const reset = () => { setStep(1); setDocName(""); setFileUrl(null); setFileName(""); setSigners([{ name: "", email: "", role: "buyer" }]); setRecentSearch(""); };

  const handleClose = () => { reset(); onClose(); };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFileUrl(file_url);
    setFileName(file.name);
    if (!docName) setDocName(file.name.replace(/\.[^.]+$/, ""));
    setUploading(false);
  };

  const selectRecentForm = (form) => {
    setDocName(form.name);
    if (form.fileUrl) { setFileUrl(form.fileUrl); setFileName(form.name); }
    setRecentSearch("");
  };

  const addSigner = () => setSigners((s) => [...s, { name: "", email: "", role: "buyer" }]);
  const updateSigner = (i, field, val) => setSigners((s) => s.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  const removeSigner = (i) => setSigners((s) => s.filter((_, idx) => idx !== i));

  const handleCreate = () => {
    const validSigners = signers.filter((s) => s.name && s.email);
    onCreated({ docName, fileUrl, fileName, signers: validSigners });
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg overflow-y-auto" style={{ maxHeight: "85vh" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-4 h-4" /> New Signature Request
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Document */}
        {step === 1 && (
          <div className="space-y-4 pt-2">
            {/* Recent forms search */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Search Recent Forms</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={recentSearch}
                  onChange={(e) => setRecentSearch(e.target.value)}
                  placeholder="Find a previously created form…"
                  className="pl-9 text-sm"
                />
              </div>
              {(recentSearch || recentForms.length > 0) && (
                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 divide-y divide-slate-100">
                  {recentForms.length === 0 ? (
                    <p className="text-xs text-slate-400 px-3 py-2">No matching forms found</p>
                  ) : (
                    recentForms.slice(0, 8).map((form) => (
                      <button
                        key={form.id}
                        onClick={() => selectRecentForm(form)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white transition-colors text-left"
                      >
                        <FileText className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{form.name}</p>
                          {form.subtitle && <p className="text-xs text-slate-400 truncate">{form.subtitle}</p>}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0 bg-slate-200 px-1.5 py-0.5 rounded-full">{form.source}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="flex-1 h-px bg-slate-200" />
              <span>or enter manually</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Document Name *</Label>
              <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g. Buyer Broker Agreement" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Upload Document (optional)</Label>
              <label className="flex items-center gap-3 p-3 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-colors">
                <input type="file" accept=".pdf,.doc,.docx,.png,.jpg" className="hidden" onChange={handleUpload} />
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-sm text-slate-500">{fileName || "Choose PDF, DOC, or image…"}</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
              <Button size="sm" disabled={!docName.trim()} onClick={() => setStep(2)}
                className="bg-[#1e3a5f] text-white hover:bg-[#2a4f7c]">
                Next: Add Signers →
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Signers */}
        {step === 2 && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-600 font-medium">Add signers for <span className="text-violet-700">{docName}</span></p>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {signers.map((s, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Signer {i + 1}</span>
                    {signers.length > 1 && (
                      <button onClick={() => removeSigner(i)} className="text-slate-300 hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <Input value={s.name} onChange={(e) => updateSigner(i, "name", e.target.value)} placeholder="Full name *" className="h-8 text-sm" />
                  <Input type="email" value={s.email} onChange={(e) => updateSigner(i, "email", e.target.value)} placeholder="Email address *" className="h-8 text-sm" />
                  <Select value={s.role} onValueChange={(v) => updateSigner(i, "role", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <button onClick={addSigner} className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium">
              <Plus className="w-3.5 h-3.5" /> Add Another Signer
            </button>
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>← Back</Button>
              <Button size="sm"
                disabled={!signers.some((s) => s.name && s.email)}
                onClick={handleCreate}
                className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-1.5">
                <Send className="w-3.5 h-3.5" /> Create & Generate Links
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
function AuditLog({ doc, requests }) {
  const events = useMemo(() => {
    const list = [];
    // Document created event (from earliest request creation date)
    const earliest = [...requests].sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
    if (earliest?.created_date) {
      list.push({ ts: new Date(earliest.created_date), icon: FilePlus, color: "text-slate-500 bg-slate-100", label: "Document Created", detail: doc.form_name });
    }
    // Per-signer events
    requests.forEach((req) => {
      // Sent / request created
      if (req.created_date) {
        list.push({ ts: new Date(req.created_date), icon: Eye, color: "text-blue-500 bg-blue-50", label: "Sent for Signature", detail: `${req.signer_name} (${ROLES.find((r) => r.value === req.signer_role)?.label || req.signer_role})` });
      }
      // Signed
      if (req.status === "signed" && req.signed_at) {
        list.push({ ts: new Date(req.signed_at), icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50", label: "Signed", detail: `${req.signer_name} · ${req.signer_email || ""}` });
      }
      // Declined
      if (req.status === "declined") {
        const ts = req.signed_at ? new Date(req.signed_at) : new Date(req.updated_date || req.created_date);
        list.push({ ts, icon: X, color: "text-red-500 bg-red-50", label: "Declined", detail: `${req.signer_name} · ${req.signer_email || ""}` });
      }
    });
    return list.sort((a, b) => a.ts - b.ts);
  }, [doc, requests]);

  if (events.length === 0) return <p className="text-xs text-slate-400 text-center py-4">No audit events yet.</p>;

  return (
    <div className="relative pl-5">
      {/* vertical line */}
      <div className="absolute left-[17px] top-3 bottom-3 w-px bg-slate-100" />
      <div className="space-y-3">
        {events.map((ev, i) => {
          const Icon = ev.icon;
          return (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${ev.color}`}>
                <Icon className="w-3 h-3" />
              </div>
              <div className="pb-1">
                <p className="text-sm font-medium text-slate-800 leading-tight">{ev.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{ev.detail}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{format(ev.ts, "MMM d, yyyy · h:mm a")}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Document card ─────────────────────────────────────────────────────────────
function DocCard({ doc, requests, onDelete, onInAppSign, onFinalize }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("signers"); // "signers" | "audit"
  const [finalizing, setFinalizing] = useState(false);
  const signed = requests.filter((r) => r.status === "signed").length;
  const pending = requests.filter((r) => r.status === "pending").length;
  const allSigned = requests.length > 0 && signed === requests.length;

  // Check if final PDF already exists (all requests point to same finalized url)
  const finalUrl = allSigned && requests[0]?.file_url ? requests[0].file_url : null;

  const handleFinalize = async (e) => {
    e.stopPropagation();
    setFinalizing(true);
    await onFinalize(doc.id);
    setFinalizing(false);
  };

  const copyLink = (token) => {
    const url = `${window.location.origin}/Sign?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className={`bg-white rounded-2xl border transition-all ${allSigned ? "border-emerald-200" : "border-slate-100"}`}>
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${allSigned ? "bg-emerald-50" : "bg-slate-50"}`}>
          <FileText className={`w-5 h-5 ${allSigned ? "text-emerald-500" : "text-slate-400"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate">{doc.form_name}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {requests.length} signer{requests.length !== 1 ? "s" : ""}
            {" · "}
            <span className="text-emerald-600">{signed} signed</span>
            {pending > 0 && <>, <span className="text-amber-600">{pending} pending</span></>}
            {doc.created_date && <> · {format(new Date(doc.created_date), "MMM d, yyyy")}</>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {allSigned && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Complete</span>}
          {allSigned && (
            finalUrl ? (
              <a href={finalUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors text-xs font-medium" title="Download finalized PDF">
                <Download className="w-3.5 h-3.5" /> Final PDF
              </a>
            ) : (
              <button onClick={handleFinalize} disabled={finalizing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors text-xs font-medium disabled:opacity-60">
                {finalizing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Finalizing…</> : <><Download className="w-3.5 h-3.5" /> Finalize PDF</>}
              </button>
            )
          )}
          {!allSigned && doc.file_url && (
            <a href={doc.file_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" title="Open document">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-slate-50">
          {/* Tab bar */}
          <div className="flex gap-1 px-5 pt-3 pb-1">
            {[
              { key: "signers", label: "Signers" },
              { key: "audit", label: "Audit Log", icon: History },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === t.key ? "bg-[#1e3a5f] text-white" : "text-slate-500 hover:bg-slate-100"}`}
              >
                {t.icon && <t.icon className="w-3 h-3" />}
                {t.label}
              </button>
            ))}
          </div>

          {/* Signers tab */}
          {activeTab === "signers" && (
            <div className="px-5 pb-4 pt-2 space-y-2">
              {requests.map((req) => {
                const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                return (
                  <div key={req.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                    <Icon className={`w-4 h-4 shrink-0 ${req.status === "signed" ? "text-emerald-500" : req.status === "declined" ? "text-red-400" : "text-amber-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{req.signer_name}</p>
                      <p className="text-xs text-slate-400">
                        {ROLES.find((r) => r.value === req.signer_role)?.label}
                        {req.signer_email && ` · ${req.signer_email}`}
                        {req.status === "signed" && req.signed_at && ` · Signed ${format(new Date(req.signed_at), "MMM d, yyyy h:mm a")}`}
                      </p>
                    </div>
                    {req.status === "signed" && req.signature_data && (
                      <img src={req.signature_data} alt="sig" className="h-8 max-w-[100px] object-contain border border-slate-200 rounded bg-white p-0.5 shrink-0" />
                    )}
                    {req.status === "pending" && req.token && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => copyLink(req.token)}
                          className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors" title="Copy signing link">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <a href={`${window.location.origin}/Sign?token=${req.token}`} target="_blank" rel="noreferrer"
                          className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors" title="Open signing link">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={() => onInAppSign(doc)}
                className="w-full mt-1 flex items-center justify-center gap-2 py-2 text-xs font-medium text-violet-600 border border-violet-200 rounded-xl hover:bg-violet-50 transition-colors">
                <PenLine className="w-3.5 h-3.5" /> Sign In-App
              </button>
            </div>
          )}

          {/* Audit Log tab */}
          {activeTab === "audit" && (
            <div className="px-5 pb-4 pt-3">
              <AuditLog doc={doc} requests={requests} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── In-app sign modal ─────────────────────────────────────────────────────────
function InAppSignModal({ open, doc, onClose, onSigned }) {
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("buyer");
  const [showPad, setShowPad] = useState(false);

  if (!doc) return null;

  const handleSigned = (sigData) => {
    onSigned({ doc, signerName, signerRole, sigData });
    setSignerName(""); setSignerRole("buyer"); setShowPad(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => { setShowPad(false); setSignerName(""); onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Sign: {doc.form_name}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          {!showPad ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Your Full Name</Label>
                <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Role</Label>
                <Select value={signerRole} onValueChange={setSignerRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" disabled={!signerName.trim()} onClick={() => setShowPad(true)}
                  className="bg-[#1e3a5f] text-white hover:bg-[#2a4f7c] gap-1.5">
                  <PenLine className="w-3.5 h-3.5" /> Continue to Sign
                </Button>
              </div>
            </>
          ) : (
            <SignaturePad signerName={signerName} onSave={handleSigned} onCancel={() => setShowPad(false)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ESignature() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | pending | complete
  const [showNew, setShowNew] = useState(false);
  const [inAppDoc, setInAppDoc] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const { data: allRequests = [], isLoading } = useQuery({
    queryKey: ["esig-requests-all"],
    queryFn: () => base44.entities.SignatureRequest.list("-created_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SignatureRequest.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["esig-requests-all"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SignatureRequest.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["esig-requests-all"] }),
  });

  // Group requests by a doc identifier (form_doc_id or a synthesized group key)
  const docGroups = useMemo(() => {
    const map = {};
    allRequests.forEach((r) => {
      const key = r.form_doc_id || `standalone_${r.form_name}_${r.transaction_address || ""}`;
      if (!map[key]) {
        map[key] = {
          id: key,
          form_name: r.form_name || "Untitled Document",
          transaction_address: r.transaction_address,
          file_url: r.file_url || null,
          created_date: r.created_date,
          requests: [],
        };
      }
      map[key].requests.push(r);
    });
    return Object.values(map).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [allRequests]);

  const filtered = docGroups.filter((d) => {
    const matchesSearch = !search ||
      d.form_name.toLowerCase().includes(search.toLowerCase()) ||
      (d.transaction_address || "").toLowerCase().includes(search.toLowerCase());
    const allSigned = d.requests.length > 0 && d.requests.every((r) => r.status === "signed");
    const hasPending = d.requests.some((r) => r.status === "pending");
    if (filter === "complete") return matchesSearch && allSigned;
    if (filter === "pending") return matchesSearch && hasPending;
    return matchesSearch;
  });

  const stats = {
    total: allRequests.length,
    signed: allRequests.filter((r) => r.status === "signed").length,
    pending: allRequests.filter((r) => r.status === "pending").length,
  };

  const handleNewDocument = async ({ docName, fileUrl, fileName, signers }) => {
    const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await Promise.all(signers.map((s) =>
      createMutation.mutateAsync({
        form_doc_id: docId,
        form_name: docName,
        file_url: fileUrl || null,
        signer_name: s.name,
        signer_email: s.email,
        signer_role: s.role,
        status: "pending",
        token: generateToken(),
      })
    ));
    toast.success(`Signature request created for ${signers.length} signer${signers.length !== 1 ? "s" : ""}`);
  };

  const handleDeleteDoc = (docId) => {
    const group = docGroups.find((d) => d.id === docId);
    if (!group) return;
    if (!confirm(`Delete "${group.form_name}" and all ${group.requests.length} signature request(s)?`)) return;
    group.requests.forEach((r) => deleteMutation.mutate(r.id));
  };

  const handleFinalize = async (docId) => {
    const group = docGroups.find((d) => d.id === docId);
    if (!group) return;
    const result = await base44.functions.invoke("finalizeSignedDocument", { form_doc_id: docId });
    if (result.data?.file_url) {
      toast.success("Finalized PDF with certificate of completion generated!");
      qc.invalidateQueries({ queryKey: ["esig-requests-all"] });
    } else {
      toast.error("Finalization failed — please try again.");
    }
  };

  const handleInAppSigned = ({ doc, signerName, signerRole, sigData }) => {
    createMutation.mutate({
      form_doc_id: doc.id,
      form_name: doc.form_name,
      transaction_address: doc.transaction_address,
      file_url: doc.file_url || null,
      signer_name: signerName,
      signer_role: signerRole,
      status: "signed",
      token: generateToken(),
      signature_data: sigData,
      signed_at: new Date().toISOString(),
    });
    toast.success("Signature applied successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">E-Signature</h1>
          <p className="text-sm text-slate-500 mt-1">Send, track, and manage electronic signatures</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2">
          <Plus className="w-4 h-4" /> New Signature Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Requests", value: stats.total, color: "text-slate-800" },
          { label: "Pending", value: stats.pending, color: "text-amber-600" },
          { label: "Signed", value: stats.signed, color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Legal compliance note */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3.5 text-sm text-blue-800">
        <Shield className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
        <p>Signatures collected on this platform are legally binding under the <strong>ESIGN Act</strong> and <strong>UETA</strong>. Each signature is time-stamped and tied to a unique secure token.</p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents…" className="pl-10" />
        </div>
        <div className="flex gap-2">
          {["all", "pending", "complete"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors capitalize ${filter === f ? "bg-[#1e3a5f] text-white" : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-2 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
          <PenLine className="w-10 h-10 mb-3 opacity-30" />
          <p className="font-medium text-slate-600">No signature requests yet</p>
          <p className="text-sm mt-1 mb-4">Create your first request to get started.</p>
          <Button onClick={() => setShowNew(true)} className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2">
            <Plus className="w-4 h-4" /> New Signature Request
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <DocCard
              key={doc.id}
              doc={doc}
              requests={doc.requests}
              onDelete={handleDeleteDoc}
              onInAppSign={setInAppDoc}
              onFinalize={handleFinalize}
            />
          ))}
        </div>
      )}

      <NewDocumentModal open={showNew} onClose={() => setShowNew(false)} onCreated={handleNewDocument} />
      <InAppSignModal open={!!inAppDoc} doc={inAppDoc} onClose={() => setInAppDoc(null)} onSigned={handleInAppSigned} />
    </div>
  );
}