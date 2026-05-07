import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Layers } from "lucide-react";
import { GripVertical, Trash2, Plus, Printer, Save, X, ChevronDown, ChevronRight, FileDown, CheckCircle, Upload, FileText, ExternalLink, MapPin } from "lucide-react";
import SignatureManager from "@/components/signatures/SignatureManager";
import PDFFieldMapper from "@/components/formbuilder/PDFFieldMapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

// ─── Field library ───────────────────────────────────────────────────────────
const FIELD_GROUPS = [
  {
    label: "Contact",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    fields: [
      { key: "contact_full_name",             label: "Full Name" },
      { key: "contact_email",                 label: "Email" },
      { key: "contact_phone",                 label: "Phone" },
      { key: "contact_role",                  label: "Role (Buyer/Seller…)" },
      { key: "contact_buyer_agent_name",      label: "Buyer's Agent Name" },
      { key: "contact_buyer_agent_brokerage", label: "Buyer's Agent Brokerage" },
      { key: "contact_broker_address",        label: "Broker Address" },
      { key: "contact_broker_city",           label: "Broker City" },
      { key: "contact_broker_state",          label: "Broker State" },
      { key: "contact_broker_zip",            label: "Broker ZIP" },
      { key: "contact_broker_license",        label: "Broker License #" },
      { key: "contact_broker_supervisor",     label: "Broker Supervisor" },
    ],
  },
  {
    label: "Transaction",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    fields: [
      { key: "tx_property_address",    label: "Property Address" },
      { key: "tx_city",                label: "City" },
      { key: "tx_state",               label: "State" },
      { key: "tx_zip",                 label: "ZIP Code" },
      { key: "tx_county",              label: "County" },
      { key: "tx_mls_number",          label: "MLS #" },
      { key: "tx_buyer_name",          label: "Buyer Name" },
      { key: "tx_buyer_email",         label: "Buyer Email" },
      { key: "tx_buyer_phone",         label: "Buyer Phone" },
      { key: "tx_seller_name",         label: "Seller Name" },
      { key: "tx_seller_email",        label: "Seller Email" },
      { key: "tx_seller_phone",        label: "Seller Phone" },
      { key: "tx_purchase_price",      label: "Purchase Price" },
      { key: "tx_earnest_money",       label: "Earnest Money" },
      { key: "tx_commission_percent",  label: "Commission %" },
      { key: "tx_closing_date",        label: "Closing Date" },
      { key: "tx_contract_date",       label: "Contract Date" },
      { key: "tx_inspection_deadline", label: "Inspection Deadline" },
      { key: "tx_title_company",       label: "Title Company" },
      { key: "tx_lender_name",         label: "Lender Name" },
    ],
  },
  {
    label: "Agent Profile",
    color: "bg-violet-100 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
    fields: [
      { key: "agent_name",                 label: "Agent Name" },
      { key: "agent_license",              label: "Agent License #" },
      { key: "agent_phone",                label: "Agent Phone" },
      { key: "agent_email",                label: "Agent Email" },
      { key: "brokerage_name",             label: "Brokerage Name" },
      { key: "brokerage_license",          label: "Brokerage License #" },
      { key: "brokerage_address",          label: "Brokerage Address" },
      { key: "brokerage_city",             label: "Brokerage City" },
      { key: "brokerage_state",            label: "Brokerage State" },
      { key: "brokerage_zip",              label: "Brokerage ZIP" },
      { key: "office_phone",               label: "Office Phone" },
      { key: "office_email",               label: "Office Email" },
      { key: "broker_supervisor",          label: "Broker Supervisor" },
      { key: "broker_supervisor_email",    label: "Supervisor Email" },
      { key: "default_commission_percent", label: "Default Commission %" },
      { key: "default_title_company",      label: "Default Title Company" },
    ],
  },
  {
    label: "Custom",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    fields: [
      { key: "custom_text",      label: "Text Field" },
      { key: "custom_date",      label: "Date Field" },
      { key: "custom_number",    label: "Number Field" },
      { key: "custom_signature", label: "Signature Line" },
      { key: "custom_initials",  label: "Initials Line" },
      { key: "custom_checkbox",  label: "Checkbox" },
      { key: "custom_paragraph", label: "Paragraph / Notes" },
    ],
  },
];

const ALL_FIELDS_MAP = Object.fromEntries(
  FIELD_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, { ...f, group: g.label, color: g.color, dot: g.dot }]))
);

const groupColor = (key) => ALL_FIELDS_MAP[key]?.color || "bg-slate-100 text-slate-600 border-slate-200";

let idCounter = 1;
const makeId = () => `field_${idCounter++}`;

const FORM_DEFS = {
  "uniform-contract": { name: "Uniform Contract of Sale of Real Estate", fields: ["tx_buyer_name","tx_seller_name","tx_property_address","tx_city","tx_county","tx_zip","tx_purchase_price","tx_earnest_money","tx_closing_date","tx_title_company","tx_lender_name","tx_inspection_deadline"] },
  "counter-offer": { name: "Counter Offer", fields: ["tx_buyer_name","tx_seller_name","tx_property_address","tx_purchase_price","tx_closing_date"] },
  "compensatory-compensation": { name: "Compensatory Compensation Agreement", fields: ["tx_buyer_name","contact_buyer_agent_name","contact_buyer_agent_brokerage","tx_property_address","tx_city","tx_county","tx_zip","tx_purchase_price","tx_seller_name","tx_closing_date","tx_contract_date"] },
  "deed-fraud-disclosure": { name: "Deed Fraud Disclosure and Advisory", fields: ["tx_buyer_name","tx_seller_name","tx_property_address","tx_city","tx_county","tx_zip","tx_closing_date","tx_title_company","contact_buyer_agent_name"] },
  "buyer-broker-agreement": { name: "Buyer Broker Agreement", fields: ["tx_buyer_name","contact_email","contact_phone","agent_name","brokerage_name","tx_property_address","tx_city","tx_county","tx_zip","tx_earnest_money","tx_lender_name","custom_signature"] },
  "wire-fraud-disclosure": { name: "Wire Fraud Disclosure and Advisory", fields: ["tx_buyer_name","tx_seller_name","tx_property_address","tx_city","tx_county","tx_zip","tx_closing_date","tx_title_company","tx_lender_name","contact_buyer_agent_name","contact_buyer_agent_brokerage"] },
  "exclusive-listing": { name: "Exclusive Right-to-Sell Listing Agreement", fields: ["tx_seller_name","tx_property_address","tx_city","tx_zip","tx_mls_number","agent_name","brokerage_name","tx_commission_percent","tx_closing_date","custom_signature"] },
  "contract-addendum": { name: "Contract Addendum", fields: ["tx_buyer_name","tx_seller_name","tx_property_address","tx_contract_date","custom_paragraph","custom_signature"] },
  "inspection-addendum": { name: "Inspection Addendum", fields: ["tx_buyer_name","tx_seller_name","tx_property_address","tx_inspection_deadline","custom_paragraph","custom_signature"] },
  "mutual-release": { name: "Mutual Release of Contract", fields: ["tx_buyer_name","tx_seller_name","tx_property_address","tx_earnest_money","tx_contract_date","custom_paragraph","custom_signature"] },
};

export default function FormBuilder() {
  const urlParams = new URLSearchParams(window.location.search);
  const preloadFormId = urlParams.get("formId");
  const preloadDef = preloadFormId ? FORM_DEFS[preloadFormId] : null;

  const buildInitialCanvas = (def) => {
    if (!def) return [];
    return def.fields.map((key) => {
      const d = ALL_FIELDS_MAP[key];
      return { instanceId: makeId(), key, label: d?.label || key };
    });
  };

  const initialCanvas = buildInitialCanvas(preloadDef);

  const [formTitle, setFormTitle] = useState(preloadDef?.name || "Custom Form");
  const [canvasFields, setCanvasFields] = useState(initialCanvas);
  const [collapsed, setCollapsed] = useState({});
  const [fieldLabels, setFieldLabels] = useState(() =>
    Object.fromEntries(initialCanvas.map((f) => [f.instanceId, f.label]))
  );
  const [fieldValues, setFieldValues] = useState({});
  const [selectedTx, setSelectedTx] = useState("");
  const [selectedContact, setSelectedContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedDocId, setSavedDocId] = useState(null);
  const [selectedFormKey, setSelectedFormKey] = useState(preloadFormId || "");
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState(null);
  const [uploadedPdfName, setUploadedPdfName] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [fieldPins, setFieldPins] = useState({}); // { instanceId: { page, x, y } }
  const [showMapper, setShowMapper] = useState(false);

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Please upload a PDF file."); return; }
    setPdfUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploadedPdfUrl(file_url);
    setUploadedPdfName(file.name);
    setShowPdfViewer(true);
    setShowMapper(false);
    setFieldPins({});
    setPdfUploading(false);
    toast.success(`"${file.name}" uploaded — use "Map Fields" to place values on the PDF.`);
  };

  const handleSelectForm = (key) => {
    setSelectedFormKey(key);
    if (!key || key === "blank") {
      setFormTitle("Custom Form");
      setCanvasFields([]);
      setFieldLabels({});
      setFieldValues({});
      setSavedDocId(null);
      return;
    }
    const def = FORM_DEFS[key];
    if (!def) return;
    const canvas = buildInitialCanvas(def);
    setFormTitle(def.name);
    setCanvasFields(canvas);
    setFieldLabels(Object.fromEntries(canvas.map((f) => [f.instanceId, f.label])));
    setFieldValues({});
    setSavedDocId(null);
  };

  const handleDeleteDoc = async () => {
    if (!savedDocId) return;
    if (!confirm("Delete this saved form document?")) return;
    await base44.entities.TransactionDocument.delete(savedDocId);
    setSavedDocId(null);
    toast.success("Form document deleted.");
  };

  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-updated_date", 200),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("full_name", 500),
  });

  const { data: pdfTemplates = [] } = useQuery({
    queryKey: ["pdf-templates"],
    queryFn: () => base44.entities.PDFTemplate.list("-updated_date", 100),
  });

  const handleLoadPdfTemplate = (template) => {
    setUploadedPdfUrl(template.pdf_url);
    setUploadedPdfName(template.pdf_name || template.name);
    // Convert TemplatePDFMapper mappings (array) → FormBuilder fieldPins format ({instanceId: {page,x,y}})
    // Each mapping uses fieldKey as key; we need to create canvas fields + pins
    const newCanvas = [];
    const newLabels = {};
    const newPins = {};
    (template.field_mappings || []).forEach((m) => {
      const instanceId = makeId();
      const fieldDef = ALL_FIELDS_MAP[m.fieldKey];
      newCanvas.push({ instanceId, key: m.fieldKey, label: m.label || fieldDef?.label || m.fieldKey });
      newLabels[instanceId] = m.label || fieldDef?.label || m.fieldKey;
      newPins[instanceId] = { page: m.page, x: m.x, y: m.y };
    });
    setCanvasFields(newCanvas);
    setFieldLabels(newLabels);
    setFieldPins(newPins);
    setFieldValues({});
    setShowMapper(true);
    setShowPdfViewer(false);
    setShowTemplateModal(false);
    toast.success(`Loaded template "${template.name}" — select a transaction to fill.`);
  };

  const toggleGroup = (label) => setCollapsed((p) => ({ ...p, [label]: !p[label] }));

  const addFieldToCanvas = (fieldKey) => {
    const def = ALL_FIELDS_MAP[fieldKey];
    if (!def) return;
    const instanceId = makeId();
    setCanvasFields((prev) => [...prev, { instanceId, key: fieldKey, label: def.label }]);
    setFieldLabels((prev) => ({ ...prev, [instanceId]: def.label }));
  };

  const removeField = (instanceId) => {
    setCanvasFields((prev) => prev.filter((f) => f.instanceId !== instanceId));
    setFieldLabels((prev) => { const n = { ...prev }; delete n[instanceId]; return n; });
    setFieldValues((prev) => { const n = { ...prev }; delete n[instanceId]; return n; });
  };

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (source.droppableId === "palette" && destination.droppableId === "canvas") {
      const def = ALL_FIELDS_MAP[draggableId];
      if (!def) return;
      const instanceId = makeId();
      setCanvasFields((prev) => {
        const next = [...prev];
        next.splice(destination.index, 0, { instanceId, key: draggableId, label: def.label });
        return next;
      });
      setFieldLabels((prev) => ({ ...prev, [instanceId]: def.label }));
      return;
    }

    if (source.droppableId === "canvas" && destination.droppableId === "canvas") {
      setCanvasFields((prev) => {
        const next = [...prev];
        const [moved] = next.splice(source.index, 1);
        next.splice(destination.index, 0, moved);
        return next;
      });
    }
  };

  const buildSnapshot = () =>
    canvasFields.map((f) => ({ key: f.key, label: fieldLabels[f.instanceId] || f.label, value: fieldValues[f.instanceId] || "" }));

  // ── Save to TransactionDocument ──────────────────────────────────────────
  const handleSave = async () => {
    if (canvasFields.length === 0) { toast.error("Add at least one field before saving."); return; }
    setSaving(true);
    const tx = transactions.find((t) => t.id === selectedTx);
    const contact = contacts.find((c) => c.id === selectedContact);
    const payload = {
      transaction_id: selectedTx || "none",
      transaction_address: tx?.property_address || (contact ? `Contact: ${contact.full_name}` : "Custom Form"),
      doc_type: "form",
      name: formTitle,
      form_id: "custom-builder",
      data: {
        title: formTitle,
        contact_id: selectedContact || null,
        contact_name: contact?.full_name || null,
        fields: buildSnapshot(),
      },
      notes: [
        tx ? `Transaction: ${tx.property_address}` : null,
        contact ? `Contact: ${contact.full_name}` : null,
      ].filter(Boolean).join(" | ") || "",
    };

    let result;
    if (savedDocId) {
      result = await base44.entities.TransactionDocument.update(savedDocId, { data: payload.data, name: formTitle });
    } else {
      result = await base44.entities.TransactionDocument.create(payload);
      if (result?.id) setSavedDocId(result.id);
    }
    setSaving(false);
    toast.success("Form saved successfully!");
  };

  // ── Export PDF ───────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (canvasFields.length === 0) { toast.error("Add fields before exporting."); return; }
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(formTitle, margin, y);
    y += 8;

    if (selectedTx) {
      const tx = transactions.find((t) => t.id === selectedTx);
      if (tx) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(`Property: ${tx.property_address}`, margin, y);
        y += 6;
      }
    }
    if (selectedContact) {
      const contact = contacts.find((c) => c.id === selectedContact);
      if (contact) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(`Contact: ${contact.full_name}`, margin, y);
        y += 6;
      }
    }

    doc.setTextColor(0);
    y += 4;
    doc.setDrawColor(200);
    doc.line(margin, y, 210 - margin, y);
    y += 8;

    // Fields (2 columns)
    const colW = (210 - margin * 2 - 8) / 2;
    let col = 0;
    let rowStartY = y;

    canvasFields.forEach((f) => {
      const label = fieldLabels[f.instanceId] || f.label;
      const value = fieldValues[f.instanceId] || "";
      const x = margin + col * (colW + 8);

      if (y > 270) { doc.addPage(); y = margin; rowStartY = y; col = 0; }

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100);
      doc.text(label.toUpperCase(), x, y);

      if (f.key === "custom_signature" || f.key === "custom_initials") {
        doc.setDrawColor(150);
        doc.line(x, y + 10, x + colW, y + 10);
        y += col === 1 ? 18 : 0;
      } else if (f.key === "custom_checkbox") {
        doc.setDrawColor(150);
        doc.rect(x, y + 3, 5, 5);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);
        doc.text(value || "Check here", x + 7, y + 8);
        y += col === 1 ? 14 : 0;
      } else if (f.key === "custom_paragraph") {
        doc.setDrawColor(200);
        doc.rect(x, y + 3, colW, 20);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        if (value) doc.text(value, x + 2, y + 10, { maxWidth: colW - 4 });
        y += col === 1 ? 28 : 0;
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);
        doc.text(value || "", x, y + 6);
        doc.setDrawColor(180);
        doc.line(x, y + 8, x + colW, y + 8);
        y += col === 1 ? 16 : 0;
      }

      if (col === 0) { col = 1; }
      else { col = 0; rowStartY = y; }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`${formTitle} — Page ${i} of ${pageCount}`, margin, 290);
      doc.text(new Date().toLocaleDateString(), 210 - margin, 290, { align: "right" });
    }

    doc.save(`${formTitle.replace(/\s+/g, "_")}.pdf`);
    toast.success("PDF downloaded!");
  };

  // ── Export PDF with field overlays on uploaded PDF ──────────────────────
  const handleExportFilledPDF = async () => {
    if (!uploadedPdfUrl || Object.keys(fieldPins).length === 0) {
      toast.error("Upload a PDF and map at least one field first.");
      return;
    }
    toast("Generating filled PDF…");

    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const pdfBytes = await fetch(uploadedPdfUrl).then((r) => r.arrayBuffer());
    const pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
    const numPgs = pdfDoc.numPages;

    const { jsPDF: JsPDF } = await import("jspdf");
    const outDoc = new JsPDF({ unit: "pt", format: "letter" });
    const PAGE_W_PT = 612;
    const PAGE_H_PT = 792;

    for (let pageNum = 1; pageNum <= numPgs; pageNum++) {
      if (pageNum > 1) outDoc.addPage();
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });

      // Render page to canvas
      const offscreen = document.createElement("canvas");
      offscreen.width = viewport.width;
      offscreen.height = viewport.height;
      await page.render({ canvasContext: offscreen.getContext("2d"), viewport }).promise;
      const imgData = offscreen.toDataURL("image/jpeg", 0.92);

      outDoc.addImage(imgData, "JPEG", 0, 0, PAGE_W_PT, PAGE_H_PT);

      // Overlay mapped field values for this page
      const pinsOnPage = Object.entries(fieldPins).filter(([, pin]) => pin.page === pageNum);
      pinsOnPage.forEach(([instanceId, pin]) => {
        const value = fieldValues[instanceId] || "";
        if (!value) return;
        const xPt = pin.x * PAGE_W_PT;
        const yPt = pin.y * PAGE_H_PT;
        outDoc.setFontSize(9);
        outDoc.setFont("helvetica", "normal");
        outDoc.setTextColor(0, 0, 0);
        outDoc.text(value, xPt, yPt);
      });
    }

    outDoc.save(`${formTitle.replace(/\s+/g, "_")}_filled.pdf`);

    // Track export in PDFTemplateExport for analytics
    const tx = transactions.find((t) => t.id === selectedTx);
    await base44.entities.PDFTemplateExport.create({
      template_id: uploadedPdfName || "form-builder",
      template_name: formTitle,
      transaction_id: tx?.id || null,
      transaction_address: tx?.property_address || null,
    }).catch(() => {}); // non-blocking

    toast.success("Filled PDF downloaded!");
  };

  const handlePrint = () => window.print();
  const handleClear = () => { if (!canvasFields.length) return; setCanvasFields([]); setFieldLabels({}); setFieldValues({}); setSavedDocId(null); setFieldPins({}); };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col h-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Form Builder</h1>
            <p className="text-sm text-slate-500 mt-0.5">Drag fields from the palette · attach to a transaction & contact · save or export</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleClear} className="gap-1.5 text-red-500 border-red-200 hover:bg-red-50">
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 print:hidden">
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5 print:hidden">
              <FileDown className="w-3.5 h-3.5" /> Export PDF
            </Button>
            {uploadedPdfUrl && (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowMapper((v) => !v)} className={`gap-1.5 print:hidden ${showMapper ? "border-violet-400 text-violet-700 bg-violet-50" : ""}`}>
                  <MapPin className="w-3.5 h-3.5" /> {showMapper ? "Hide Mapper" : "Map Fields"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportFilledPDF} className="gap-1.5 print:hidden border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  <FileDown className="w-3.5 h-3.5" /> Export Filled PDF
                </Button>
              </>
            )}
            {savedDocId && (
              <Button size="sm" variant="outline" onClick={handleDeleteDoc} className="gap-1.5 text-red-500 border-red-200 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600]">
              {savedDocId ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving…" : savedDocId ? "Update" : "Save"}
            </Button>
          </div>
        </div>

        {/* Choose Form */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 print:hidden">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 space-y-1 min-w-[200px]">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Choose a Form Template</label>
              <Select value={selectedFormKey} onValueChange={handleSelectForm}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select a form to load…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">— Blank / Custom —</SelectItem>
                  {Object.entries(FORM_DEFS).map(([key, def]) => (
                    <SelectItem key={key} value={key}>{def.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upload PDF to Fill</label>
              <div className="flex items-center gap-2">
                {pdfTemplates.length > 0 && (
                  <button
                    onClick={() => setShowTemplateModal(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 h-10 rounded-lg border border-violet-300 bg-violet-50 text-violet-700 text-sm font-medium hover:bg-violet-100 transition-colors"
                  >
                    <Layers className="w-4 h-4" /> Load Template
                  </button>
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
                  <div className={`inline-flex items-center gap-2 px-3 py-2 h-10 rounded-lg border text-sm font-medium transition-colors ${
                    uploadedPdfUrl
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"
                  }`}>
                    {pdfUploading ? (
                      <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Uploading…</span>
                    ) : uploadedPdfUrl ? (
                      <><FileText className="w-4 h-4" /><span className="max-w-[120px] truncate">{uploadedPdfName}</span></>
                    ) : (
                      <><Upload className="w-4 h-4" /> Upload PDF</>  
                    )}
                  </div>
                </label>
                {uploadedPdfUrl && (
                  <>
                    <button
                      onClick={() => setShowPdfViewer((v) => !v)}
                      className="px-3 py-2 h-10 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      {showPdfViewer ? "Hide PDF" : "Show PDF"}
                    </button>
                    <a href={uploadedPdfUrl} target="_blank" rel="noopener noreferrer"
                      className="p-2 h-10 w-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                      title="Open PDF in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => { setUploadedPdfUrl(null); setUploadedPdfName(null); setShowPdfViewer(false); setShowMapper(false); setFieldPins({}); }}
                      className="p-2 h-10 w-10 flex items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-colors"
                      title="Remove PDF"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {selectedFormKey && selectedFormKey !== "blank" && (
              <Button variant="outline" size="sm" onClick={() => handleSelectForm("blank")} className="gap-1.5 text-slate-500 mt-5 shrink-0">
                <X className="w-3.5 h-3.5" /> Clear Form
              </Button>
            )}
          </div>
        </div>

        {/* PDF Viewer / Mapper */}
        {uploadedPdfUrl && showMapper && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 print:hidden">
            <PDFFieldMapper
              pdfUrl={uploadedPdfUrl}
              pdfName={uploadedPdfName}
              canvasFields={canvasFields}
              fieldLabels={fieldLabels}
              fieldValues={fieldValues}
              fieldPins={fieldPins}
              onPinsChange={setFieldPins}
              allFieldsMap={ALL_FIELDS_MAP}
            />
          </div>
        )}
        {uploadedPdfUrl && showPdfViewer && !showMapper && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden print:hidden" style={{ height: 600 }}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 truncate max-w-xs">{uploadedPdfName}</span>
              </div>
              <button onClick={() => setShowPdfViewer(false)} className="p-1 rounded hover:bg-slate-200 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <iframe
              src={`${uploadedPdfUrl}#toolbar=1&navpanes=0`}
              className="w-full"
              style={{ height: 554 }}
              title="PDF Viewer"
            />
          </div>
        )}

        {/* Transaction & Contact selectors */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Attach to Transaction (optional)</Label>
            <Select value={selectedTx} onValueChange={setSelectedTx}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select a transaction…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {transactions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.property_address}{t.city ? `, ${t.city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Attach to Contact (optional)</Label>
            <Select value={selectedContact} onValueChange={setSelectedContact}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select a contact…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}{c.email ? ` — ${c.email}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* ── Palette ── */}
          <aside className="w-64 shrink-0 bg-white rounded-2xl border border-slate-100 flex flex-col overflow-hidden print:hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Field Palette</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click or drag to add</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {FIELD_GROUPS.map((group) => (
                <div key={group.label} className="rounded-xl border border-slate-100 overflow-hidden">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${group.dot}`} />
                    <span className="text-xs font-semibold text-slate-700 flex-1">{group.label}</span>
                    {collapsed[group.label]
                      ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                  {!collapsed[group.label] && (
                    <Droppable droppableId="palette" isDropDisabled={true}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="p-1.5 space-y-1">
                          {group.fields.map((f, idx) => (
                            <Draggable key={f.key} draggableId={f.key} index={idx}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => addFieldToCanvas(f.key)}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-grab text-xs font-medium transition-all select-none ${group.color} ${snapshot.isDragging ? "shadow-lg scale-105" : "hover:opacity-80"}`}
                                >
                                  <GripVertical className="w-3 h-3 opacity-50 shrink-0" />
                                  <span className="truncate">{f.label}</span>
                                  <Plus className="w-3 h-3 ml-auto shrink-0 opacity-60" />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  )}
                </div>
              ))}
            </div>
          </aside>

          {/* ── Canvas ── */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Form title */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4 print:rounded-none print:border-0 print:border-b print:border-slate-300">
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="text-xl font-bold border-0 shadow-none p-0 h-auto focus-visible:ring-0 text-slate-900 bg-transparent"
                placeholder="Form Title"
              />
              {(selectedTx || selectedContact) && (
                <p className="text-xs text-slate-400 mt-1">
                  {[
                    selectedTx && transactions.find(t => t.id === selectedTx)?.property_address,
                    selectedContact && contacts.find(c => c.id === selectedContact)?.full_name,
                  ].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>

            <Droppable droppableId="canvas">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 bg-white rounded-2xl border-2 transition-colors p-4 overflow-y-auto print:border-0 print:rounded-none ${
                    snapshot.isDraggingOver ? "border-violet-400 bg-violet-50/30" : "border-dashed border-slate-200"
                  }`}
                >
                  {canvasFields.length === 0 && !snapshot.isDraggingOver && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20 pointer-events-none">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        <GripVertical className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-medium">Drop fields here</p>
                      <p className="text-sm text-slate-300 mt-1">Drag from the palette or click any field to add it</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {canvasFields.map((f, idx) => (
                      <Draggable key={f.instanceId} draggableId={f.instanceId} index={idx}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`group bg-white rounded-xl border transition-all ${snapshot.isDragging ? "shadow-xl border-violet-400 scale-105" : "border-slate-200 hover:border-slate-300"}`}
                          >
                            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 print:hidden">
                              <div {...provided.dragHandleProps} className="cursor-grab text-slate-300 hover:text-slate-500">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${groupColor(f.key)}`}>
                                {ALL_FIELDS_MAP[f.key]?.group || "Custom"}
                              </span>
                              <button
                                onClick={() => removeField(f.instanceId)}
                                className="ml-auto p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="p-3 space-y-1.5">
                              {/* Editable label */}
                              <input
                                value={fieldLabels[f.instanceId] || f.label}
                                onChange={(e) => setFieldLabels((p) => ({ ...p, [f.instanceId]: e.target.value }))}
                                className="w-full text-xs font-semibold text-slate-500 bg-transparent border-0 focus:outline-none p-0 print:hidden"
                                placeholder="Field label"
                              />
                              <p className="text-xs font-semibold text-slate-500 hidden print:block">
                                {fieldLabels[f.instanceId] || f.label}
                              </p>

                              {/* Field input */}
                              {f.key === "custom_checkbox" ? (
                                <div className="flex items-center gap-2 py-1">
                                  <input type="checkbox" className="w-4 h-4 border border-slate-300 rounded" />
                                  <span className="text-sm text-slate-400">Check here</span>
                                </div>
                              ) : f.key === "custom_signature" || f.key === "custom_initials" ? (
                                <div className="border-b border-slate-300 mt-6 mb-1" />
                              ) : f.key === "custom_paragraph" ? (
                                <textarea
                                  rows={3}
                                  value={fieldValues[f.instanceId] || ""}
                                  onChange={(e) => setFieldValues((p) => ({ ...p, [f.instanceId]: e.target.value }))}
                                  placeholder="Enter notes…"
                                  className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none"
                                />
                              ) : (
                                <Input
                                  value={fieldValues[f.instanceId] || ""}
                                  onChange={(e) => setFieldValues((p) => ({ ...p, [f.instanceId]: e.target.value }))}
                                  type={f.key === "custom_date" ? "date" : f.key === "custom_number" ? "number" : "text"}
                                  placeholder="Enter value…"
                                  className="h-8 text-sm"
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>

        {/* PDF Template Picker Modal */}
        {showTemplateModal && (
          <Dialog open onOpenChange={() => setShowTemplateModal(false)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-violet-500" /> Load a Saved PDF Template
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 pt-2 max-h-[60vh] overflow-y-auto">
                {pdfTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleLoadPdfTemplate(t)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-violet-300 hover:bg-violet-50 transition-all text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{t.name}</p>
                      <p className="text-xs text-slate-400">{(t.field_mappings || []).length} fields mapped · {t.pdf_name || "PDF"}</p>
                    </div>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Signature Workflow */}
        <SignatureManager
          formDocId={savedDocId}
          formName={formTitle}
          transactionAddress={
            [
              selectedTx && transactions.find((t) => t.id === selectedTx)?.property_address,
              selectedContact && contacts.find((c) => c.id === selectedContact)?.full_name,
            ].filter(Boolean).join(" · ") || ""
          }
          fieldValues={fieldValues}
        />

      </div>
    </DragDropContext>
  );
}