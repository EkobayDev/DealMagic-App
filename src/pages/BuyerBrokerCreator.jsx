import React, { useState, useEffect, useRef } from "react";
import { FileText, Download, ChevronDown, X, UserCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import ClientDocuments from "@/components/bbsa/ClientDocuments";
import BBSASharedTemplate from "@/components/bbsa/BBSASharedTemplate";
import { loadPdfJs } from "@/lib/pdfjs-loader";

const UTILITY_FIELDS = [
  { key: "today_date",    label: "Today's Date" },
  { key: "date_plus_60d", label: "Date + 60 Days" },
  { key: "date_plus_90d", label: "Date + 90 Days" },
  { key: "date_plus_6mo", label: "Date + 6 Months" },
];

function validateField(value, rules) {
  const errors = [];
  if (!rules || rules.length === 0) return errors;
  rules.forEach((rule) => {
    if (rule.type === "required" && !String(value || "").trim()) errors.push("This field is required");
    if (rule.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.push("Please enter a valid email");
    if (rule.type === "minLength" && value && String(value).length < (rule.value || 0)) errors.push(`Minimum ${rule.value} characters required`);
  });
  return errors;
}

export default function BuyerBrokerCreator() {
  const { user: currentUser, isLoadingAuth } = useAuth();
  const [tab, setTab] = useState("template");
  const [sessionId, setSessionId] = useState(null);
  const [fields, setFields] = useState([]);
  const [sourceOptions, setSourceOptions] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [exporting, setExporting] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const autoSaveRef = useRef(null);

  // Fetch agent profile + brokerage
  const { data: agentProfiles = [] } = useQuery({
    queryKey: ["agent-profiles-bbc", currentUser?.email],
    queryFn: () => base44.entities.AgentProfile.list("agent_name", 10),
    enabled: !!currentUser,
  });
  const { data: brokerages = [] } = useQuery({
    queryKey: ["brokerages-bbc"],
    queryFn: () => base44.entities.Brokerage.list("brokerage_name", 100),
    enabled: !!currentUser,
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-bbc", currentUser?.email],
    queryFn: () => base44.entities.Contact.filter({ created_by: currentUser.email }, "full_name", 200),
    enabled: !!currentUser,
  });
  const { data: bbaDefaultsRecords = [] } = useQuery({
    queryKey: ["bba-defaults-bbc", currentUser?.email],
    queryFn: async () => {
      if (!agentProfiles.length) return [];
      const myProfile = agentProfiles.find((a) => a.email?.toLowerCase() === currentUser?.email?.toLowerCase()) || agentProfiles[0];
      if (!myProfile) return [];
      return base44.entities.AgentBBADefaults.filter({ agent_profile_id: myProfile.id }, "-updated_date", 1);
    },
    enabled: !!currentUser && agentProfiles.length > 0,
  });
  const bbaDefaults = bbaDefaultsRecords[0] || null;

  const agentProfile = agentProfiles.find((a) => a.email?.toLowerCase() === currentUser?.email?.toLowerCase()) || agentProfiles[0] || null;
  const brokerage = brokerages.find((b) => b.license_id === agentProfile?.brokerage_license_number) || null;

  function buildSourceValueMap() {
    const ap = agentProfile || {};
    const br = brokerage || {};
    const today = new Date();
    const fmt = (d) => d.toLocaleDateString();
    const add = (days) => { const d = new Date(today); d.setDate(d.getDate() + days); return fmt(d); };
    const addM = (m) => { const d = new Date(today); d.setMonth(d.getMonth() + m); return fmt(d); };
    return {
      agent_name: ap.agent_name || "", agent_license: ap.license_number || "",
      agent_phone: ap.phone || "", agent_email: ap.email || "",
      brokerage_name: ap.brokerage_name || br.brokerage_name || "",
      brokerage_license: ap.brokerage_license_number || br.license_id || "",
      brokerage_address: ap.brokerage_address || br.address || "",
      brokerage_city: ap.brokerage_city || br.city || "",
      brokerage_state: ap.brokerage_state || br.state || "",
      brokerage_zip: ap.brokerage_zip || br.zip || "",
      office_phone: ap.office_phone || br.main_phone || "",
      broker_supervisor: ap.broker_supervisor || br.broker_name || "",
      today_date: fmt(today), date_plus_60d: add(60), date_plus_90d: add(90), date_plus_6mo: addM(6),
      bba_default_commission_percent: bbaDefaults?.commission_percent != null ? String(bbaDefaults.commission_percent) : "",
      bba_default_lender_name: bbaDefaults?.lender_name || "",
    };
  }

  function buildContactValueMap(contact) {
    if (!contact) return {};
    const initials = contact.full_name ? contact.full_name.split(" ").map((n) => n[0]).join(".") + "." : "";
    return {
      contact_full_name: contact.full_name || "", contact_email: contact.email || "",
      contact_phone: contact.phone || "", contact_initials: initials,
      contact_address: contact.address || "", contact_city: contact.city || "",
      contact_state: contact.state || "", contact_zip: contact.zip || "",
      contact2_name: contact.contact2_name || "", contact2_phone: contact.contact2_phone || "",
      contact2_email: contact.contact2_email || "", contact2_relation: contact.contact2_relation || "",
      contact_buyer_agent_name: contact.buyer_agent_name || "",
      contact_buyer_agent_brokerage: contact.buyer_agent_brokerage || "",
      contact_broker_address: contact.broker_address || "", contact_broker_city: contact.broker_city || "",
      contact_broker_state: contact.broker_state || "", contact_broker_zip: contact.broker_zip || "",
      contact_broker_license: contact.broker_license_number || "",
      contact_broker_supervisor: contact.broker_supervisor || "",
      contact_name: contact.full_name || "", buyer_email: contact.email || "", buyer_phone: contact.phone || "",
    };
  }

  const handleContactSelect = (contactId) => {
    setSelectedContactId(contactId);
    const merged = { ...buildSourceValueMap(), ...(contactId ? buildContactValueMap(contacts.find((c) => c.id === contactId)) : {}) };
    const updated = {};
    fields.forEach((f) => {
      if (f.sourceKey && merged[f.sourceKey]) updated[f.id] = merged[f.sourceKey];
      else if (f.defaultValue) updated[f.id] = f.defaultValue;
    });
    setFieldValues(updated);
  };

  // Load shared template session
  const { data: sharedSessions = [], isLoading: isLoadingShared } = useQuery({
    queryKey: ["bbsa-shared-bbc"],
    queryFn: () => base44.entities.BBSABuilderSession.filter({ isShared: true }, "-updated_date", 1),
    enabled: !!currentUser,
  });
  const { data: ownSessions = [], isLoading: isLoadingOwn } = useQuery({
    queryKey: ["bbsa-own-bbc", currentUser?.email],
    queryFn: () => base44.entities.BBSABuilderSession.filter({ created_by: currentUser.email }, "-updated_date", 1),
    enabled: !!currentUser,
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      sessionId
        ? base44.entities.BBSABuilderSession.update(sessionId, data)
        : base44.entities.BBSABuilderSession.create({ name: "Buyer Broker Creator", ...data }),
    onSuccess: (result) => { if (!sessionId && result?.id) setSessionId(result.id); },
  });

  const loadSessionData = (session) => {
    setFields(session.fields || []);
    setSourceOptions(session.sourceOptions || []);
    setMappings(session.mappings || []);
    setPdfUrl(session.pdfUrl || null);
    if (session.fieldValues) setFieldValues(session.fieldValues);
  };

  useEffect(() => {
    if (!currentUser || isLoadingShared || isLoadingOwn) return;
    const ownSession = ownSessions[0];
    const sharedSession = sharedSessions[0];
    const session = ownSession || sharedSession;
    setSessionLoaded(true);
    if (!session) return;
    loadSessionData(session);
    if (ownSession) setSessionId(ownSession.id);
  }, [ownSessions, sharedSessions, currentUser, isLoadingShared, isLoadingOwn]);

  const handleUseTemplate = (template) => {
    loadSessionData(template);
    setFieldValues({});
    setSelectedContactId("");
    setSessionLoaded(true);
    setTab("fill");
  };

  // Auto-save
  useEffect(() => {
    if (!currentUser || !sessionLoaded) return;
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      saveMutation.mutate({ fields, sourceOptions, mappings, pdfUrl, fieldValues });
    }, 1500);
    return () => clearTimeout(autoSaveRef.current);
  }, [fields, fieldValues, currentUser, sessionLoaded]);

  // Auto-populate on fill tab
  useEffect(() => {
    if (tab !== "fill") return;
    const merged = { ...buildSourceValueMap(), ...(selectedContactId ? buildContactValueMap(contacts.find((c) => c.id === selectedContactId)) : {}) };
    setFieldValues((prev) => {
      const updated = { ...prev };
      fields.forEach((f) => {
        if (f.sourceKey && merged[f.sourceKey] !== undefined) { updated[f.id] = merged[f.sourceKey]; return; }
        if (!updated[f.id] && f.defaultValue) updated[f.id] = f.defaultValue;
      });
      return updated;
    });
  }, [tab, fields, agentProfile, brokerage, selectedContactId, contacts]);

  const handleExportPDF = async () => {
    if (!pdfUrl) { toast.error("No PDF template available. Ask your admin to publish a template."); return; }
    if (mappings.length === 0) { toast.error("No fields are pinned on the PDF yet."); return; }

    const validationErrors = [];
    fields.forEach((f) => {
      const errors = validateField(fieldValues[f.id], f.validation);
      if (errors.length > 0) validationErrors.push(`${f.label}: ${errors.join(", ")}`);
    });
    if (validationErrors.length > 0) { toast.error(`Please fix:\n${validationErrors.join("\n")}`); return; }

    setExporting(true);
    toast("Generating PDF…");
    try {
      const pdfjsLib = await loadPdfJs();
      const { jsPDF } = await import("jspdf");
      const pdfBytes = await fetch(pdfUrl).then((r) => r.arrayBuffer());
      const pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
      const numPages = pdfDoc.numPages;
      let outDoc;
      const currentSourceMap = buildSourceValueMap();

      for (let p = 1; p <= numPages; p++) {
        const page = await pdfDoc.getPage(p);
        const vp = page.getViewport({ scale: 1.0 });
        const W = vp.width, H = vp.height;
        if (p === 1) { outDoc = new jsPDF({ unit: "pt", format: [W, H] }); } else { outDoc.addPage([W, H]); }
        const renderVp = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        canvas.width = renderVp.width; canvas.height = renderVp.height;
        await page.render({ canvasContext: canvas.getContext("2d"), viewport: renderVp }).promise;
        outDoc.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, W, H);

        mappings.filter((m) => m.page === p).forEach((m) => {
          const field = fields.find((f) => f.id === m.fieldKey);
          const utilityField = !field ? UTILITY_FIELDS.find((u) => u.key === m.fieldKey) : null;
          if (!field && !utilityField) return;
          const value = field
            ? (fieldValues[field.id] || (field.sourceKey ? currentSourceMap[field.sourceKey] : "") || field.defaultValue || "")
            : (currentSourceMap[m.fieldKey] || "");
          if (!value) return;
          outDoc.setFontSize(11); outDoc.setFont("helvetica", "bold"); outDoc.setTextColor(0, 0, 0);
          outDoc.text(value, m.x * W, m.y * H);
        });
      }

      const fileName = `BBA_${new Date().toLocaleDateString().replace(/\//g, "-")}.pdf`;
      outDoc.save(fileName);

      if (selectedContactId) {
        const contact = contacts.find((c) => c.id === selectedContactId);
        try {
          const pdfBlob = outDoc.output("blob");
          const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });
          const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
          await base44.entities.ClientDocument.create({
            contact_id: selectedContactId, contact_name: contact?.full_name || "Unknown",
            doc_type: "bbsa", name: fileName, file_url, generated_by: currentUser?.email || "",
          });
          toast.success("PDF saved to Client Documents!");
        } catch { toast.success("PDF downloaded!"); }
      } else {
        toast.success("PDF downloaded!");
      }
    } catch (err) {
      toast.error("Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  if (isLoadingAuth || !currentUser) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/Forms" className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">Buyer Broker Creator</h1>
          <p className="text-sm text-slate-400 mt-0.5">Load the template, fill in your client's details, and export the PDF</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {saveMutation.status === "pending" && <span className="text-slate-400">Saving...</span>}
          {saveMutation.status === "success" && <span className="text-emerald-600">✓ Saved</span>}
        </div>
      </div>

      {/* Tab bar — only 3 tabs */}
      <div className="flex rounded-xl border border-slate-200 overflow-hidden w-fit">
        <button
          onClick={() => setTab("template")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${tab === "template" ? "bg-blue-700 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
        >
          <FileText className="w-4 h-4" /> Template
        </button>
        <button
          onClick={() => setTab("fill")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${tab === "fill" ? "bg-emerald-700 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
        >
          <Download className="w-4 h-4" /> Fill & Export
        </button>
        <button
          onClick={() => setTab("documents")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${tab === "documents" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
        >
          <FileText className="w-4 h-4" /> Client Documents
        </button>
      </div>

      {/* ── TAB: Template ── */}
      {tab === "template" && (
        <BBSASharedTemplate onUseTemplate={handleUseTemplate} />
      )}

      {/* ── TAB: Fill & Export ── */}
      {tab === "fill" && (
        <div className="space-y-4">
          {fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
              <FileText className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-medium">No template loaded yet</p>
              <p className="text-sm mt-1 mb-4">Go to the <button onClick={() => setTab("template")} className="underline text-blue-600">Template tab</button> and click "Use This Template".</p>
            </div>
          ) : (
            <>
              {agentProfile && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5 flex items-center gap-3 text-xs text-violet-700">
                  <span className="font-semibold">Auto-filled from:</span>
                  <span>{agentProfile.agent_name}</span>
                  {(brokerage?.brokerage_name || agentProfile.brokerage_name) && (
                    <><span className="text-violet-300">·</span><span>{brokerage?.brokerage_name || agentProfile.brokerage_name}</span></>
                  )}
                </div>
              )}

              {/* Client picker */}
              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
                <UserCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm font-medium text-slate-600 shrink-0">Client:</span>
                <div className="relative flex-1">
                  <select
                    value={selectedContactId}
                    onChange={(e) => handleContactSelect(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-400 appearance-none bg-white"
                  >
                    <option value="">— Select a client to auto-fill buyer fields —</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name}{c.email ? ` — ${c.email}` : ""}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
                {selectedContactId && (
                  <button onClick={() => setSelectedContactId("")} className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Agent &amp; brokerage fields are auto-filled from your profile.</p>
                <Button onClick={handleExportPDF} disabled={exporting || !pdfUrl} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0">
                  {exporting
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
                    : <><Download className="w-4 h-4" /> Download PDF</>}
                </Button>
              </div>

              {!pdfUrl && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                  No PDF in this template yet. Contact your admin to publish a template with a PDF.
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
                {fields.map((field, idx) => {
                  const errors = validateField(fieldValues[field.id], field.validation);
                  const hasError = errors.length > 0;
                  return (
                    <div key={field.id} className="px-4 py-3 space-y-1.5">
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-slate-300 w-5 shrink-0 text-center">{idx + 1}</span>
                        <span className={`text-sm font-medium w-[240px] shrink-0 truncate ${hasError ? "text-red-600" : "text-slate-700"}`}>
                          {field.label || <span className="italic text-slate-300">Untitled</span>}
                          {field.validation?.some((r) => r.type === "required") && <span className="text-red-500 ml-1">*</span>}
                        </span>
                        <Input
                          value={fieldValues[field.id] || ""}
                          onChange={(e) => setFieldValues((v) => ({ ...v, [field.id]: e.target.value }))}
                          placeholder={field.sourceKey ? `Auto: ${field.sourceKey}` : "Enter value…"}
                          className={`flex-1 h-8 text-sm ${hasError ? "border-red-300 focus:ring-red-400" : ""}`}
                        />
                      </div>
                      {hasError && errors.map((err, i) => (
                        <p key={i} className="text-[10px] text-red-600 font-medium ml-9">{err}</p>
                      ))}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleExportPDF} disabled={exporting || !pdfUrl} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  {exporting
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
                    : <><Download className="w-4 h-4" /> Download Filled PDF</>}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: Client Documents ── */}
      {tab === "documents" && (
        <ClientDocuments contacts={contacts} />
      )}
    </div>
  );
}