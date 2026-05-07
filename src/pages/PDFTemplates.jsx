import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Upload, Pencil, Trash2, FileText, Download, Save, CheckCircle, Layers, Cloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import TemplatePDFMapper, { FIELD_GROUPS_FLAT, BBA_SOURCE_MAP } from "@/components/pdftemplates/TemplatePDFMapper";
import TemplateAnalytics from "@/components/pdftemplates/TemplateAnalytics";
import FillTemplateModal from "@/components/pdftemplates/FillTemplateModal";

// ── Template Editor Modal ────────────────────────────────────────────────────
function TemplateEditorModal({ template, onClose, onSaved }) {
  const [name, setName] = useState(template?.name || "");
  const [notes, setNotes] = useState(template?.notes || "");
  const [pdfUrl, setPdfUrl] = useState(template?.pdf_url || null);
  const [pdfName, setPdfName] = useState(template?.pdf_name || null);
  const [uploading, setUploading] = useState(false);
  const [mappings, setMappings] = useState(template?.field_mappings || []);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null); // null | "saving" | "saved"
  const savedTemplateId = useRef(template?.id || null);
  const autoSaveTimer = useRef(null);
  const isFirstRender = useRef(true);

  // Auto-save: debounce on mappings/name/notes changes (only for existing or once PDF is set)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!pdfUrl || !name.trim()) return;

    setAutoSaveStatus("saving");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(async () => {
      const data = { name: name.trim(), pdf_url: pdfUrl, pdf_name: pdfName, field_mappings: mappings, notes };
      if (savedTemplateId.current) {
        await base44.entities.PDFTemplate.update(savedTemplateId.current, data);
      } else {
        const result = await base44.entities.PDFTemplate.create(data);
        if (result?.id) savedTemplateId.current = result.id;
      }
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
    toast.success(`"${file.name}" uploaded. Now map your fields.`);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Give this template a name."); return; }
    if (!pdfUrl) { toast.error("Upload a PDF first."); return; }
    setSaving(true);
    const data = { name: name.trim(), pdf_url: pdfUrl, pdf_name: pdfName, field_mappings: mappings, notes };
    if (savedTemplateId.current) {
      await base44.entities.PDFTemplate.update(savedTemplateId.current, data);
    } else {
      await base44.entities.PDFTemplate.create(data);
    }
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
            {template?.id ? "Edit Template" : "New PDF Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Name & notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Template Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Buyer Broker Agreement" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about this template…" />
            </div>
          </div>

          {/* PDF Upload */}
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                pdfUrl ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"
              }`}>
                {uploading ? (
                  <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Uploading…</>
                ) : pdfUrl ? (
                  <><FileText className="w-4 h-4" />{pdfName}</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload PDF Template</>
                )}
              </div>
            </label>
            {pdfUrl && (
              <button onClick={() => { setPdfUrl(null); setPdfName(null); setMappings([]); }} className="p-2 rounded-lg border border-red-200 text-red-400 hover:bg-red-50">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mapper */}
          {pdfUrl && (
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                Define Field Mappings — {mappings.length} field{mappings.length !== 1 ? "s" : ""} mapped
              </p>
              <TemplatePDFMapper
                pdfUrl={pdfUrl}
                mappings={mappings}
                onMappingsChange={setMappings}
                templateId={template?.id}
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {autoSaveStatus === "saving" && (
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="w-3 h-3 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin" /> Auto-saving…
              </span>
            )}
            {autoSaveStatus === "saved" && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                <Cloud className="w-3.5 h-3.5" /> Auto-saved
              </span>
            )}
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

// ── Main Page ────────────────────────────────────────────────────────────────
export default function PDFTemplates() {
  const qc = useQueryClient();
  const [editorTemplate, setEditorTemplate] = useState(null); // null = closed, {} = new, {...} = edit
  const [fillTemplate, setFillTemplate] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["pdf-templates"],
    queryFn: () => base44.entities.PDFTemplate.list("-updated_date", 100),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-updated_date", 200),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("full_name", 500),
  });

  const { data: agentProfiles = [] } = useQuery({
    queryKey: ["agent-profile"],
    queryFn: () => base44.entities.AgentProfile.list("-created_date", 1),
  });

  const { data: exports = [] } = useQuery({
    queryKey: ["pdf-template-exports"],
    queryFn: () => base44.entities.PDFTemplateExport.list("-created_date", 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PDFTemplate.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pdf-templates"] }),
  });

  const handleDelete = (t) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    deleteMutation.mutate(t.id);
    toast.success("Template deleted.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">PDF Template Engine</h1>
          <p className="text-sm text-slate-500 mt-1">Upload PDF templates, define field coordinate mappings once, then auto-fill from any transaction.</p>
        </div>
        <Button onClick={() => setEditorTemplate({})} className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2">
          <Plus className="w-4 h-4" /> New Template
        </Button>
      </div>

      {/* Analytics panel */}
      {(templates.length > 0 || exports.length > 0) && (
        <TemplateAnalytics templates={templates} exports={exports} />
      )}

      {/* Empty state */}
      {!isLoading && templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-violet-300" />
          </div>
          <p className="text-slate-500 font-medium">No templates yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-5">Upload a PDF, map field coordinates, and reuse it with any transaction.</p>
          <Button onClick={() => setEditorTemplate({})} className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2">
            <Plus className="w-4 h-4" /> Create First Template
          </Button>
        </div>
      )}

      {/* Template grid */}
      {isLoading && (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {templates.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{t.name}</p>
                <p className="text-xs text-slate-400 truncate">{t.pdf_name || "PDF template"}</p>
                {t.notes && <p className="text-xs text-slate-400 italic mt-0.5 truncate">{t.notes}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full font-medium">{(t.field_mappings || []).length} fields mapped</span>
              <span className="text-slate-300">·</span>
              <span>{new Date(t.updated_date || t.created_date).toLocaleDateString()}</span>
            </div>

            <div className="flex gap-2 mt-auto pt-1">
              <Button
                size="sm"
                onClick={() => setFillTemplate(t)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Fill &amp; Export
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditorTemplate(t)} className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDelete(t)} className="gap-1.5 text-red-400 border-red-200 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Editor modal */}
      {editorTemplate !== null && (
        <TemplateEditorModal
          template={editorTemplate?.id ? editorTemplate : null}
          onClose={() => setEditorTemplate(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["pdf-templates"] }); }}
        />
      )}

      {/* Fill modal */}
      {fillTemplate && (
        <FillTemplateModal
          template={fillTemplate}
          transactions={transactions}
          contacts={contacts}
          agentProfiles={agentProfiles}
          onClose={() => setFillTemplate(null)}
          onExported={() => qc.invalidateQueries({ queryKey: ["pdf-template-exports"] })}
        />
      )}
    </div>
  );
}