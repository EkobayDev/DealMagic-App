import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Handshake, Search, Trash2, ChevronDown, ChevronUp, Plus, Pencil, Download, Layers, Save, X, Upload, FileText, Cloud, ClipboardEdit, Check } from "lucide-react";
import PDFFormFiller from "@/components/pdftemplates/PDFFormFiller";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import BBAModal from "@/components/bba/BBAModal";
import FillTemplateModal from "@/components/pdftemplates/FillTemplateModal";
import TemplatePDFMapper from "@/components/pdftemplates/TemplatePDFMapper";

// ── Inline Template Editor (field mapping) ───────────────────────────────────
function TemplateEditorModal({ template, onClose, onSaved }) {
  const [name, setName] = useState(template?.name || "");
  const [notes, setNotes] = useState(template?.notes || "");
  const [pdfUrl, setPdfUrl] = useState(template?.pdf_url || null);
  const [pdfName, setPdfName] = useState(template?.pdf_name || null);
  const [uploading, setUploading] = useState(false);
  const [mappings, setMappings] = useState(template?.field_mappings || []);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);
  const autoSaveTimer = React.useRef(null);
  const isFirst = React.useRef(true);

  React.useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    if (!pdfUrl || !name.trim()) return;
    setAutoSaveStatus("saving");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      await base44.entities.PDFTemplate.update(template.id, { name: name.trim(), pdf_url: pdfUrl, pdf_name: pdfName, field_mappings: mappings, notes });
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus(null), 3000);
    }, 2000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [mappings, name, notes]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Please upload a PDF."); return; }
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPdfUrl(file_url);
    setPdfName(file.name);
    setMappings([]);
    setUploading(false);
    toast.success(`"${file.name}" uploaded.`);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Give this template a name."); return; }
    if (!pdfUrl) { toast.error("Upload a PDF first."); return; }
    setSaving(true);
    await base44.entities.PDFTemplate.update(template.id, { name: name.trim(), pdf_url: pdfUrl, pdf_name: pdfName, field_mappings: mappings, notes });
    setSaving(false);
    toast.success("Template saved!");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-violet-500" />
            Edit Template — {template.name}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Template Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${pdfUrl ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"}`}>
                {uploading ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Uploading…</> : pdfUrl ? <><FileText className="w-4 h-4" />{pdfName}</> : <><Upload className="w-4 h-4" /> Replace PDF</>}
              </div>
            </label>
          </div>
          {pdfUrl && (
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                Field Mappings — {mappings.length} field{mappings.length !== 1 ? "s" : ""} mapped
              </p>
              <TemplatePDFMapper pdfUrl={pdfUrl} mappings={mappings} onMappingsChange={setMappings} />
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {autoSaveStatus === "saving" && <span className="flex items-center gap-1.5 text-xs text-slate-400"><div className="w-3 h-3 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin" /> Auto-saving…</span>}
            {autoSaveStatus === "saved" && <span className="flex items-center gap-1.5 text-xs text-emerald-600"><Cloud className="w-3.5 h-3.5" /> Auto-saved</span>}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : "Save Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Expanded BBA Row with add/edit/delete fields ─────────────────────────────
function ExpandedBBARow({ b, openEdit, openFillExport, onRefresh }) {
  const [customAnswers, setCustomAnswers] = useState(b.custom_answers || {});
  const [addingKey, setAddingKey] = useState("");
  const [addingVal, setAddingVal] = useState("");
  const [editingKey, setEditingKey] = useState(null); // key being edited
  const [editingVal, setEditingVal] = useState("");
  const [saving, setSaving] = useState(false);

  const saveCustom = async (updated) => {
    setSaving(true);
    await base44.entities.BuyerBrokerAgreement.update(b.id, { custom_answers: updated });
    setSaving(false);
    onRefresh();
  };

  const handleAdd = async () => {
    const key = addingKey.trim();
    const val = addingVal.trim();
    if (!key) return;
    const updated = { ...customAnswers, [key]: val };
    setCustomAnswers(updated);
    setAddingKey("");
    setAddingVal("");
    await saveCustom(updated);
  };

  const handleDelete = async (key) => {
    const updated = { ...customAnswers };
    delete updated[key];
    setCustomAnswers(updated);
    await saveCustom(updated);
  };

  const startEdit = (key) => {
    setEditingKey(key);
    setEditingVal(customAnswers[key] || "");
  };

  const commitEdit = async () => {
    if (!editingKey) return;
    const updated = { ...customAnswers, [editingKey]: editingVal };
    setCustomAnswers(updated);
    setEditingKey(null);
    await saveCustom(updated);
  };

  return (
    <tr>
      <td colSpan={6} className="bg-slate-50 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <Detail label="Buyer Phone" value={b.buyer_phone} />
          <Detail label="Buyer Initials" value={b.buyer_initials} />
          <Detail label="Purchase Price" value={b.purchase_price ? `$${Number(b.purchase_price).toLocaleString()}` : null} />
          <Detail label="Financing" value={b.financing_type} />
          <Detail label="Property Type" value={b.property_type?.replace(/_/g, " ")} />
          <Detail label="Lender" value={b.lender_name} />
          <Detail label="County" value={b.county} />
          <Detail label="Closing Date" value={b.closing_date} />
          <Detail label="Agent" value={b.agent_name} />
          <Detail label="Agent License" value={b.agent_license} />
          <Detail label="Brokerage" value={b.brokerage_name} />
          <Detail label="Office Phone" value={b.office_phone} />
          <Detail label="Broker Supervisor" value={b.broker_supervisor} />
          <Detail label="Notes" value={b.notes} />
          <Detail label="Created" value={b.created_date ? format(new Date(b.created_date), "MMM d, yyyy h:mm a") : null} />
        </div>

        {/* Custom Fields with add/edit/delete */}
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Custom Fields</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {Object.entries(customAnswers).map(([k, v]) => (
              <div key={k} className="group relative bg-white border border-slate-100 rounded-lg px-2.5 py-2">
                <p className="text-slate-400 font-medium text-[10px] mb-0.5">{k}</p>
                {editingKey === k ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={editingVal}
                      onChange={(e) => setEditingVal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingKey(null); }}
                      className="flex-1 text-xs border border-violet-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-400 min-w-0"
                    />
                    <button onClick={commitEdit} className="text-emerald-500 hover:text-emerald-700 shrink-0"><Check className="w-3 h-3" /></button>
                    <button onClick={() => setEditingKey(null)} className="text-slate-300 hover:text-slate-500 shrink-0"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <p className="text-slate-700 text-xs truncate">{v || "—"}</p>
                )}
                {/* Edit & Delete buttons on hover */}
                {editingKey !== k && (
                  <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5">
                    <button onClick={() => startEdit(k)} className="p-0.5 rounded hover:bg-violet-50 text-slate-300 hover:text-violet-500" title="Edit">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDelete(k)} className="p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400" title="Delete">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Add field row */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={addingKey}
              onChange={(e) => setAddingKey(e.target.value)}
              placeholder="Field name"
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 w-36"
            />
            <input
              value={addingVal}
              onChange={(e) => setAddingVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Value"
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 w-48"
            />
            <button
              onClick={handleAdd}
              disabled={!addingKey.trim() || saving}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 font-medium"
            >
              <Plus className="w-3 h-3" /> Add Field
            </button>
            {saving && <span className="text-xs text-slate-400">Saving…</span>}
          </div>
        </div>

        <div className="mt-3 pt-2 flex items-center gap-4">
          <button
            onClick={(e) => openEdit(b, e)}
            className="text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" /> Edit this record
          </button>
          <button
            onClick={(e) => openFillExport(b, e)}
            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"
          >
            <Download className="w-3 h-3" /> Fill &amp; Export PDF
          </button>
        </div>
      </td>
    </tr>
  );
}

const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  signed: "bg-emerald-100 text-emerald-700",
  expired: "bg-red-100 text-red-600",
};

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-slate-400 font-medium">{label}</p>
      <p className="text-slate-700">{value || "—"}</p>
    </div>
  );
}

export default function BuyerBrokerAgreements() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBba, setEditingBba] = useState(null); // null = new
  const [fillExportBba, setFillExportBba] = useState(null); // BBA being exported
  const [fillTemplate, setFillTemplate] = useState(null); // selected PDF template for export
  const [editingTemplate, setEditingTemplate] = useState(null); // template being field-mapped
  const [fillingBba, setFillingBba] = useState(null); // BBA being filled via PDF form filler
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: bbas = [], isLoading } = useQuery({
    queryKey: ["bbas", currentUser?.email, currentUser?.role],
    queryFn: () =>
      currentUser?.role === "admin"
        ? base44.entities.BuyerBrokerAgreement.list("-created_date", 500)
        : base44.entities.BuyerBrokerAgreement.filter({ created_by: currentUser.email }, "-created_date", 500),
    enabled: !!currentUser,
  });

  const { data: pdfTemplates = [] } = useQuery({
    queryKey: ["pdf-templates-bba"],
    queryFn: () => base44.entities.PDFTemplate.list("-updated_date", 100),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-bba-page", currentUser?.email, currentUser?.role],
    queryFn: () =>
      currentUser?.role === "admin"
        ? base44.entities.Contact.list("full_name", 500)
        : base44.entities.Contact.filter({ created_by: currentUser.email }, "full_name", 500),
    enabled: !!currentUser,
  });

  const { data: agentProfiles = [] } = useQuery({
    queryKey: ["agent-profiles-bba-page"],
    queryFn: () => base44.entities.AgentProfile.list("-created_date", 1),
  });

  // Convert a BBA record into a fake "transaction" shape so FillTemplateModal can resolve fields
  const bbaToTransaction = (b) => ({
    id: b.id,
    property_address: b.property_address,
    city: b.city,
    county: b.county,
    zip: b.zip,
    buyer_name: b.contact_name,
    buyer_email: b.buyer_email,
    buyer_phone: b.buyer_phone,
    purchase_price: b.purchase_price,
    commission_percent: b.commission_percent,
    commission_amount: b.commission_amount,
    lender_name: b.lender_name,
    closing_date: b.closing_date,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BuyerBrokerAgreement.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bbas"] }),
  });

  const openNew = () => { setEditingBba(null); setModalOpen(true); };
  const openEdit = (bba, e) => { e.stopPropagation(); setEditingBba(bba); setModalOpen(true); };

  const openFillExport = async (bba, e) => {
    e.stopPropagation();
    setFillExportBba(bba);
    // Always fetch the freshest template so questions persist correctly
    const freshTemplates = await base44.entities.PDFTemplate.list("-updated_date", 100);
    const bba2026 = freshTemplates.find((t) => t.name.toLowerCase().includes("bba 2026"));
    if (bba2026) setFillTemplate(bba2026);
    // Also update the cache
    qc.setQueryData(["pdf-templates-bba"], freshTemplates);
  };

  const filtered = bbas.filter((b) => {
    const matchesSearch =
      !search ||
      (b.contact_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.property_address || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.agent_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statCounts = {
    all: bbas.length,
    draft: bbas.filter((b) => b.status === "draft").length,
    sent: bbas.filter((b) => b.status === "sent").length,
    signed: bbas.filter((b) => b.status === "signed").length,
    expired: bbas.filter((b) => b.status === "expired").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Handshake className="w-6 h-6 text-violet-500" />
            Buyer Broker Agreements
          </h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage all BBA records.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {pdfTemplates.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                const bba2026 = pdfTemplates.find((t) => t.name.toLowerCase().includes("bba 2026")) || pdfTemplates[0];
                setEditingTemplate(bba2026);
              }}
              className="gap-2"
            >
              <Layers className="w-4 h-4" /> Edit Template Fields
            </Button>
          )}
          <Button onClick={openNew} className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2">
            <Plus className="w-4 h-4" /> New BBA
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, address, or agent…"
            className="pl-9 h-10"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["all", "draft", "sent", "signed", "expired"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s} ({statCounts[s]})
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <Handshake className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No BBA records found</p>
          <p className="text-sm mt-1 mb-4">Create one manually or export a BBA-type PDF template with a contact selected.</p>
          <Button onClick={openNew} className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2">
            <Plus className="w-4 h-4" /> New BBA
          </Button>
        </div>
      )}

      {/* Table */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-500">Buyer</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Property</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Compensation</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Dates</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((b) => {
                  const isExpanded = expandedId === b.id;
                  return (
                    <React.Fragment key={b.id}>
                      <tr
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : b.id)}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{b.contact_name || "—"}</p>
                          <p className="text-xs text-slate-400">{b.buyer_email || ""}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <p className="truncate max-w-[180px]">{b.property_address || "—"}</p>
                          {b.city && <p className="text-xs text-slate-400">{b.city}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {b.compensation_type === "percent" && b.commission_percent != null
                            ? <span className="font-medium">{b.commission_percent}%</span>
                            : b.compensation_type === "flat" && b.commission_amount != null
                            ? <span className="font-medium">${Number(b.commission_amount).toLocaleString()}</span>
                            : <span className="text-slate-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {b.agreement_start_date && format(new Date(b.agreement_start_date), "MM/dd/yy")}
                          {b.agreement_start_date && b.agreement_end_date && " → "}
                          {b.agreement_end_date && format(new Date(b.agreement_end_date), "MM/dd/yy")}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`capitalize ${STATUS_STYLES[b.status] || "bg-slate-100 text-slate-600"}`}>
                            {b.status || "draft"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setFillingBba(b); }}
                              className="p-1 text-slate-300 hover:text-blue-600"
                              title="Fill Form (click fields)"
                            >
                              <ClipboardEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => openFillExport(b, e)}
                              className="p-1 text-slate-300 hover:text-emerald-600"
                              title="Fill & Export PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => openEdit(b, e)}
                              className="p-1 text-slate-300 hover:text-violet-600"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button className="p-1 text-slate-300 hover:text-slate-600">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Delete this BBA record?")) deleteMutation.mutate(b.id);
                              }}
                              className="p-1 text-slate-300 hover:text-red-500"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <ExpandedBBARow
                          b={b}
                          openEdit={openEdit}
                          openFillExport={openFillExport}
                          onRefresh={() => qc.invalidateQueries({ queryKey: ["bbas"] })}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BBA Edit Modal */}
      <BBAModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        bba={editingBba}
        onSaved={() => qc.invalidateQueries({ queryKey: ["bbas"] })}
      />

      {/* Template picker dialog */}
      {fillExportBba && !fillTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setFillExportBba(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-slate-800 mb-1">Choose a PDF Template</h2>
            <p className="text-xs text-slate-400 mb-4">Select which template to fill with this BBA record's data.</p>
            {pdfTemplates.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No PDF templates found. Create one in PDF Templates first.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {pdfTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFillTemplate(t)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-colors"
                  >
                    <Download className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{t.name}</p>
                      <p className="text-xs text-slate-400">{(t.field_mappings || []).length} fields mapped</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setFillExportBba(null)} className="mt-4 w-full text-xs text-slate-400 hover:text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Template Field Mapping Editor */}
      {editingTemplate && (
        <TemplateEditorModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["pdf-templates-bba"] });
          }}
        />
      )}

      {/* PDF Form Filler Modal */}
      {fillingBba && (() => {
        const template = pdfTemplates.find((t) => t.name.toLowerCase().includes("bba 2026")) || pdfTemplates[0];
        if (!template) return null;
        return (
          <Dialog open onOpenChange={() => setFillingBba(null)}>
            <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 gap-0">
              <DialogHeader className="px-6 py-4 border-b border-slate-100 shrink-0">
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardEdit className="w-5 h-5 text-blue-500" />
                  Fill Form — {fillingBba.contact_name}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-hidden px-6 py-4">
                <PDFFormFiller
                  pdfUrl={template.pdf_url}
                  mappings={template.field_mappings || []}
                  fieldValues={fillingBba.field_values || {}}
                  onSave={async (updatedValues) => {
                    await base44.entities.BuyerBrokerAgreement.update(fillingBba.id, { field_values: updatedValues });
                    qc.invalidateQueries({ queryKey: ["bbas"] });
                  }}
                  onClose={() => setFillingBba(null)}
                />
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Fill & Export Modal */}
      {fillExportBba && fillTemplate && (
        <FillTemplateModal
          template={fillTemplate}
          transactions={[bbaToTransaction(fillExportBba)]}
          contacts={contacts}
          agentProfiles={agentProfiles}
          onClose={() => {
            setFillExportBba(null);
            setFillTemplate(null);
            qc.invalidateQueries({ queryKey: ["pdf-templates-bba"] });
          }}
          onExported={() => qc.invalidateQueries({ queryKey: ["pdf-template-exports"] })}
        />
      )}
    </div>
  );
}