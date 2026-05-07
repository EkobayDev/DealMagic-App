import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, CheckCircle2, User, Home, DollarSign,
  Calendar, FileText, Sparkles, Save, ChevronRight, GripVertical, X, Pencil, Check,
  Layers, Download, ChevronDown, MapPin
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format, addMonths } from "date-fns";
import { Link } from "react-router-dom";
import FillTemplateModal from "@/components/pdftemplates/FillTemplateModal";
import TemplatePDFMapper from "@/components/pdftemplates/TemplatePDFMapper";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ─── Steps ────────────────────────────────────────────────────────────────────
// Each step's `id` maps directly to a BuyerBrokerAgreement entity field
const STEPS = [
  {
    id: "contact_name",
    section: "Buyer Information",
    icon: User,
    question: "What is the buyer's full legal name?",
    hint: "Include all buyers if co-purchasing (e.g. John & Jane Smith)",
    placeholder: "Full legal name(s)",
    type: "text",
  },
  {
    id: "buyer_initials",
    section: "Buyer Information",
    icon: User,
    question: "What are the buyer's initials?",
    hint: "Auto-derived — edit if needed (e.g. JS for John Smith)",
    placeholder: "JS",
    type: "text",
  },
  {
    id: "buyer_email",
    section: "Buyer Information",
    icon: User,
    question: "What is the buyer's email address?",
    placeholder: "buyer@email.com",
    type: "email",
    optional: true,
  },
  {
    id: "buyer_phone",
    section: "Buyer Information",
    icon: User,
    question: "What is the buyer's phone number?",
    placeholder: "(405) 555-1234",
    type: "tel",
    optional: true,
  },
  {
    id: "property_address",
    section: "Property",
    icon: Home,
    question: "Is there a specific property in mind?",
    hint: "Enter the address or a general area description",
    placeholder: "123 Main St or 'NW OKC area'",
    type: "text",
    optional: true,
  },
  {
    id: "city",
    section: "Property",
    icon: Home,
    question: "What city is the buyer looking in?",
    placeholder: "Oklahoma City",
    type: "text",
    optional: true,
  },
  {
    id: "county",
    section: "Property",
    icon: Home,
    question: "What county?",
    placeholder: "Oklahoma County",
    type: "text",
    optional: true,
  },
  {
    id: "zip",
    section: "Property",
    icon: Home,
    question: "ZIP code (if known)?",
    placeholder: "73101",
    type: "text",
    optional: true,
  },
  {
    id: "property_type",
    section: "Property",
    icon: Home,
    question: "What type of property is the buyer looking for?",
    type: "select",
    options: [
      { value: "single_family", label: "Single Family" },
      { value: "condo", label: "Condo" },
      { value: "multi_family", label: "Multi-Family" },
      { value: "land", label: "Land" },
      { value: "commercial", label: "Commercial" },
    ],
  },
  {
    id: "purchase_price",
    section: "Financing",
    icon: DollarSign,
    question: "What is the buyer's estimated purchase budget?",
    hint: "Approximate price range they are approved or comfortable with",
    placeholder: "300000",
    type: "number",
    prefix: "$",
  },
  {
    id: "lender_name",
    section: "Financing",
    icon: DollarSign,
    question: "Has the buyer been pre-approved? If so, who is the lender?",
    hint: "Leave blank if not yet pre-approved",
    placeholder: "Lender name",
    type: "text",
    optional: true,
  },
  {
    id: "financing_type",
    section: "Financing",
    icon: DollarSign,
    question: "What type of financing does the buyer plan to use?",
    type: "select",
    options: [
      { value: "conventional", label: "Conventional" },
      { value: "fha", label: "FHA" },
      { value: "va", label: "VA" },
      { value: "cash", label: "Cash" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "compensation_type",
    section: "Compensation",
    icon: DollarSign,
    question: "How will buyer agent compensation be structured?",
    type: "select",
    options: [
      { value: "percent", label: "Percentage of Purchase Price" },
      { value: "flat", label: "Flat Fee" },
    ],
  },
  {
    id: "commission_percent",
    section: "Compensation",
    icon: DollarSign,
    question: "What is the agreed buyer's agent compensation percentage?",
    hint: "Enter as a number (e.g. 3 for 3%)",
    placeholder: "3",
    type: "number",
    suffix: "%",
    showIf: (values) => values.compensation_type !== "flat",
  },
  {
    id: "commission_amount",
    section: "Compensation",
    icon: DollarSign,
    question: "What is the flat fee compensation amount?",
    placeholder: "5000",
    type: "number",
    prefix: "$",
    showIf: (values) => values.compensation_type === "flat",
  },
  {
    id: "agreement_start_date",
    section: "Agreement Terms",
    icon: Calendar,
    question: "When does this agreement start?",
    hint: "Typically today's date",
    type: "date",
  },
  {
    id: "agreement_end_date",
    section: "Agreement Terms",
    icon: Calendar,
    question: "When does this agreement expire?",
    hint: "Typically 3–6 months from start date",
    type: "date",
  },
  {
    id: "closing_date",
    section: "Agreement Terms",
    icon: Calendar,
    question: "Estimated closing date (if known)?",
    type: "date",
    optional: true,
  },
];

// Derive initials from a name string
function deriveInitials(name) {
  if (!name) return "";
  return name
    .split(/[\s&,]+/)
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join("");
}

export default function BuyerBrokerInterview() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({});
  const [stepOrder, setStepOrder] = useState(STEPS.map((s) => s.id));
  const [customSteps, setCustomSteps] = useState([]);
  const [profileId, setProfileId] = useState(null);
  const saveTimerRef = useRef(null);
  const [reordering, setReordering] = useState(false);
  const [editingStepId, setEditingStepId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newFieldId, setNewFieldId] = useState("");
  const [agentDefaults, setAgentDefaults] = useState({});
  const [complete, setComplete] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedBBA, setSavedBBA] = useState(null);

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [fillExportOpen, setFillExportOpen] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const qc = useQueryClient();

  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-interview", currentUser?.email, currentUser?.role],
    queryFn: () =>
      currentUser?.role === "admin"
        ? base44.entities.Contact.list("full_name", 200)
        : base44.entities.Contact.filter({ created_by: currentUser.email }, "full_name", 200),
    enabled: !!currentUser,
  });

  const { data: agentProfiles = [] } = useQuery({
    queryKey: ["agent-profiles-interview"],
    queryFn: () => base44.entities.AgentProfile.list("agent_name", 100),
  });

  const { data: brokerages = [] } = useQuery({
    queryKey: ["brokerages-interview"],
    queryFn: () => base44.entities.Brokerage.list("brokerage_name", 200),
  });

  const { data: pdfTemplates = [] } = useQuery({
    queryKey: ["pdf-templates-bbi"],
    queryFn: () => base44.entities.PDFTemplate.list("-updated_date", 100),
  });

  // Auto-select BBA 2026 template as default if nothing chosen yet
  useEffect(() => {
    if (pdfTemplates.length && !selectedTemplate) {
      const bba2026 = pdfTemplates.find((t) => t.name.toLowerCase().includes("bba 2026")) || pdfTemplates[0];
      if (bba2026) setSelectedTemplate(bba2026);
    }
  }, [pdfTemplates]);

  // Load agent defaults + BBI config from profile
  useEffect(() => {
    if (agentProfiles.length === 0) return;
    base44.auth.me().then((user) => {
      const myProfile =
        agentProfiles.find((a) => a.email?.toLowerCase() === user?.email?.toLowerCase()) ||
        agentProfiles.find((a) => a.license_number === user?.license_number) ||
        agentProfiles[0];

      if (!myProfile) return;

      setProfileId(myProfile.id);

      const brokerage = brokerages.find((b) => b.license_id === myProfile.brokerage_license_number);

      setAgentDefaults({
        agent_name: myProfile.agent_name || "",
        agent_license: myProfile.license_number || "",
        agent_phone: myProfile.phone || "",
        agent_email: myProfile.email || "",
        brokerage_name: myProfile.brokerage_name || "",
        brokerage_license: myProfile.brokerage_license_number || "",
        brokerage_address: brokerage?.address || myProfile.brokerage_address || "",
        brokerage_city: brokerage?.city || myProfile.brokerage_city || "",
        brokerage_state: brokerage?.state || myProfile.brokerage_state || "OK",
        brokerage_zip: brokerage?.zip || myProfile.brokerage_zip || "",
        office_phone: myProfile.office_phone || brokerage?.main_phone || "",
        broker_supervisor: myProfile.broker_supervisor || brokerage?.broker_name || "",
      });

      // Load persisted BBI question config
      if (myProfile.bbi_step_order?.length) setStepOrder(myProfile.bbi_step_order);
      if (myProfile.bbi_custom_steps?.length) setCustomSteps(myProfile.bbi_custom_steps);

      // Auto-select preferred PDF template (stored on profile) or default to BBA 2026
      if (myProfile.bbi_pdf_template_id && pdfTemplates.length) {
        const t = pdfTemplates.find((t) => t.id === myProfile.bbi_pdf_template_id);
        if (t) setSelectedTemplate(t);
      }
    }).catch(() => {});
  }, [agentProfiles, brokerages]);

  // Set default dates
  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const sixMonths = format(addMonths(new Date(), 6), "yyyy-MM-dd");
    setValues((v) => ({
      agreement_start_date: today,
      agreement_end_date: sixMonths,
      compensation_type: "percent",
      commission_percent: "3",
      financing_type: "conventional",
      property_type: "single_family",
      ...v,
    }));
  }, []);

  // Debounced autosave of BBI config to AgentProfile
  useEffect(() => {
    if (!profileId) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const serializable = customSteps.map(({ icon: _icon, ...rest }) => rest);
      base44.entities.AgentProfile.update(profileId, {
        bbi_step_order: stepOrder,
        bbi_custom_steps: serializable,
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(saveTimerRef.current);
  }, [stepOrder, customSteps, profileId]);

  // All steps = built-in (with overrides applied) + new custom steps
  const allSteps = [
    ...STEPS.map((s) => {
      const override = customSteps.find((c) => c.id === s.id && c.isOverride);
      return override ? { ...s, question: override.question } : s;
    }),
    ...customSteps.filter((s) => !s.isOverride).map((s) => ({ ...s, icon: s.icon || FileText })),
  ];

  const addCustomQuestion = () => {
    const q = newQuestion.trim();
    if (!q) return;
    // Always generate a unique ID — never allow collisions with existing step IDs
    const baseId = newFieldId.trim().replace(/\s+/g, "_").toLowerCase() || `custom_${Date.now()}`;
    const allIds = [...STEPS.map((s) => s.id), ...customSteps.map((s) => s.id)];
    let id = baseId;
    let suffix = 2;
    while (allIds.includes(id)) { id = `${baseId}_${suffix++}`; }

    // Do NOT include icon — it's a React component and not serializable.
    // The allSteps computed value always injects FileText for custom steps.
    const newStep = {
      id,
      section: "Custom",
      question: q,
      type: "text",
      optional: true,
      isCustom: true,
    };
    setCustomSteps((prev) => [...prev, newStep]);
    setStepOrder((prev) => [...prev, id]);
    setNewQuestion("");
    setNewFieldId("");
  };

  const removeStep = (id) => {
    setStepOrder((prev) => prev.filter((sid) => sid !== id));
    setCustomSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const startEditing = (s) => {
    setEditingStepId(s.id);
    setEditingText(s.question);
  };

  const commitEdit = (id) => {
    const text = editingText.trim();
    if (!text) { setEditingStepId(null); return; }
    setCustomSteps((prev) =>
      prev.map((s) => s.id === id ? { ...s, question: text } : s)
    );
    // Also allow editing built-in steps by storing overrides in customSteps
    // If id is not already a custom step, add an override entry
    if (!customSteps.find((s) => s.id === id)) {
      const original = STEPS.find((s) => s.id === id);
      if (original) {
        setCustomSteps((prev) => [...prev, { ...original, question: text, isOverride: true }]);
        // Remove icon to keep serializable (icon restored from allSteps logic)
      }
    }
    setEditingStepId(null);
  };

  // Compute visible steps based on showIf, respecting custom order
  const orderedSteps = stepOrder
    .map((id) => allSteps.find((s) => s.id === id))
    .filter(Boolean);
  const visibleSteps = orderedSteps.filter((s) => !s.showIf || s.showIf(values));

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const newOrder = [...stepOrder];
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setStepOrder(newOrder);
  };
  const totalSteps = visibleSteps.length;
  // Clamp step if visibleSteps shrinks (e.g. showIf hides the current step)
  const clampedStep = Math.min(step, Math.max(0, totalSteps - 1));
  if (clampedStep !== step) setStep(clampedStep);
  const currentStep = visibleSteps[clampedStep];
  const progress = totalSteps > 0 ? (clampedStep / totalSteps) * 100 : 0;
  const currentValue = values[currentStep?.id] || "";
  const canAdvance = currentStep?.optional || currentStep?.type === "select"
    ? true
    : String(currentValue).trim().length > 0;

  // Auto-derive initials when buyer name is set
  useEffect(() => {
    if (currentStep?.id === "buyer_initials" && !values.buyer_initials && values.contact_name) {
      setValues((v) => ({ ...v, buyer_initials: deriveInitials(v.contact_name) }));
    }
  }, [step]);

  const handleNext = () => {
    if (step < totalSteps - 1) setStep((s) => s + 1);
    else setComplete(true);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && canAdvance && currentStep?.type !== "select") handleNext();
  };

  const fillFromContact = (c) => {
    if (!c) { setSelectedContact(null); return; }
    setSelectedContact(c);
    // Map known contact fields → BBI fields
    const contactMapping = {
      contact_name: c.full_name,
      buyer_initials: deriveInitials(c.full_name),
      buyer_email: c.email,
      buyer_phone: c.phone,
      city: c.city,
      zip: c.zip,
      county: c.county,
    };
    setValues((v) => {
      const updated = { ...v };
      Object.entries(contactMapping).forEach(([key, val]) => {
        if (val) updated[key] = val;
      });
      return updated;
    });
  };

  const saveTemplateChoice = async (template) => {
    setSelectedTemplate(template);
    setTemplatePickerOpen(false);
    if (profileId) {
      base44.entities.AgentProfile.update(profileId, { bbi_pdf_template_id: template.id }).catch(() => {});
    }
  };

  // Convert current interview values → a fake "transaction" shape for FillTemplateModal
  const bbaAsTransaction = () => ({
    id: savedBBA?.id || "preview",
    property_address: values.property_address,
    city: values.city,
    county: values.county,
    zip: values.zip,
    buyer_name: values.contact_name,
    buyer_email: values.buyer_email,
    buyer_phone: values.buyer_phone,
    purchase_price: values.purchase_price ? Number(values.purchase_price) : undefined,
    commission_percent: values.commission_percent ? Number(values.commission_percent) : undefined,
    commission_amount: values.commission_amount ? Number(values.commission_amount) : undefined,
    lender_name: values.lender_name,
    closing_date: values.closing_date,
  });

  const handleSave = async () => {
    setSaving(true);
    const bbaData = {
      ...agentDefaults,
      ...values,
      contact_name: values.contact_name || selectedContact?.full_name || "",
      contact_id: selectedContact?.id || "",
      status: "draft",
    };
    const created = await base44.entities.BuyerBrokerAgreement.create(bbaData);
    setSavedBBA(created);
    setSaving(false);
  };



  // ── Complete Screen ──────────────────────────────────────────────────────────
  if (complete) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <div className="text-center space-y-3">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-bold text-slate-900">Interview Complete!</h2>
          <p className="text-slate-500">Review and save to create a Buyer Broker Agreement record.</p>
        </div>

        {/* Agent Summary */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Agent / Brokerage (auto-filled)</p>
          {[
            ["Agent", agentDefaults.agent_name],
            ["License", agentDefaults.agent_license],
            ["Brokerage", agentDefaults.brokerage_name],
            ["Brokerage License", agentDefaults.brokerage_license],
            ["Office Address", [agentDefaults.brokerage_address, agentDefaults.brokerage_city, agentDefaults.brokerage_state, agentDefaults.brokerage_zip].filter(Boolean).join(", ")],
            ["Office Phone", agentDefaults.office_phone],
            ["Broker Supervisor", agentDefaults.broker_supervisor],
          ].filter(([, v]) => v).map(([label, val]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-slate-400">{label}</span>
              <span className="font-medium text-slate-800 text-right max-w-[60%] truncate">{val}</span>
            </div>
          ))}
        </div>

        {/* Buyer Summary */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Buyer & Agreement Summary</p>
          {visibleSteps.map((s) => {
            const val = values[s.id];
            if (!val) return null;
            const label = s.question.replace("?", "").replace(/^(What is the buyer's|What|Is there a|Has the buyer been|How will|When does|Estimated)/, "").trim();
            return (
              <div key={s.id} className="flex justify-between text-sm">
                <span className="text-slate-500 capitalize">{label}</span>
                <span className="font-medium text-slate-800 text-right max-w-[55%] truncate">
                  {s.prefix}{val}{s.suffix}
                </span>
              </div>
            );
          })}
        </div>

        {/* Link to contact */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Link to Contact (optional)</p>
          <Select
            value={selectedContact?.id || ""}
            onValueChange={(id) => {
              const c = contacts.find((c) => c.id === id);
              fillFromContact(c || null);
            }}
          >
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Select a contact…" />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="font-medium">{c.full_name}</span>
                  {c.email && <span className="text-slate-400 ml-2 text-xs">{c.email}</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedContact && (
            <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5">
              <div className="w-7 h-7 rounded-full bg-violet-200 flex items-center justify-center text-violet-700 font-bold text-xs shrink-0">
                {selectedContact.full_name?.[0]?.toUpperCase()}
              </div>
              <p className="text-sm font-semibold text-violet-800 flex-1">{selectedContact.full_name}</p>
              <button onClick={() => fillFromContact(null)} className="text-xs text-violet-400 hover:text-violet-700">Clear</button>
            </div>
          )}
        </div>

        {savedBBA ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold bg-emerald-50 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4" /> BBA record created successfully!
            </div>
            {selectedTemplate && (
              <Button onClick={() => setFillExportOpen(true)} variant="outline" className="w-full gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                <Download className="w-4 h-4" /> Fill &amp; Export PDF ({selectedTemplate.name})
              </Button>
            )}
            <Link to="/BuyerBrokerAgreements">
              <Button className="w-full bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2 font-bold">
                <FileText className="w-4 h-4" /> View in Buyer Broker Agreements <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setComplete(false); setStep(totalSteps - 1); }} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Go Back
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2 font-bold">
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Buyer Broker Agreement"}
            </Button>
          </div>
        )}

        {/* Fill & Export modal */}
        {fillExportOpen && selectedTemplate && (
          <FillTemplateModal
            template={selectedTemplate}
            transactions={[bbaAsTransaction()]}
            contacts={contacts}
            agentProfiles={agentProfiles}
            onClose={() => setFillExportOpen(false)}
            onExported={() => {}}
          />
        )}
      </div>
    );
  }

  // ── Interview Screen ─────────────────────────────────────────────────────────
  if (!currentStep) return null;

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/Forms" className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <h1 className="text-xl font-bold text-slate-900">Buyer Broker Interview</h1>
          </div>
          <p className="text-sm text-slate-500">Fields map directly to your BBA template</p>
        </div>
        <div className="flex items-center gap-2">
          {/* PDF Template badge */}
          <div className="relative">
            <button
              onClick={() => setTemplatePickerOpen((o) => !o)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${selectedTemplate ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}
            >
              <Layers className="w-3.5 h-3.5" />
              {selectedTemplate ? selectedTemplate.name : "No Template"}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {templatePickerOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl w-72 p-3 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Choose PDF Template</p>
                {pdfTemplates.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center">No templates found</p>
                ) : (
                  pdfTemplates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => saveTemplateChoice(t)}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors text-sm ${selectedTemplate?.id === t.id ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "border-slate-100 hover:border-violet-300 hover:bg-violet-50"}`}
                    >
                      <Layers className="w-4 h-4 shrink-0 text-violet-400" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{t.name}</p>
                        <p className="text-[11px] text-slate-400">{(t.field_mappings || []).length} fields mapped</p>
                      </div>
                      {selectedTemplate?.id === t.id && <Check className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />}
                    </button>
                  ))
                )}
                <button onClick={() => setTemplatePickerOpen(false)} className="w-full text-xs text-slate-400 hover:text-slate-600 pt-1">Close</button>
              </div>
            )}
          </div>
          {/* Map Fields button — only shown when a template is selected */}
          {selectedTemplate && (
            <button
              onClick={() => setMappingOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-colors"
              title="Map PDF fields"
            >
              <MapPin className="w-3.5 h-3.5" />
              Map Fields
            </button>
          )}
          <button
            onClick={() => setReordering((r) => !r)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${reordering ? "bg-violet-100 border-violet-300 text-violet-700" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}
          >
            {reordering ? "Close Editor" : "Edit Questions"}
          </button>
        </div>
      </div>

      {/* Reorder panel */}
      {reordering && (
        <div className="bg-white rounded-2xl border border-violet-200 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Drag to reorder questions</p>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="steps">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                  {stepOrder.map((id, index) => {
                    const s = allSteps.find((st) => st.id === id);
                    if (!s) return null;
                    return (
                      <Draggable key={id} draggableId={id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-colors ${snapshot.isDragging ? "bg-violet-50 border-violet-300 shadow-md" : "bg-slate-50 border-slate-200"}`}
                          >
                            <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="w-5 h-5 rounded flex items-center justify-center bg-slate-200 shrink-0">
                              {React.createElement(s.icon, { className: "w-3 h-3 text-slate-500" })}
                            </div>
                            {editingStepId === id ? (
                              <input
                                autoFocus
                                type="text"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") commitEdit(id); if (e.key === "Escape") setEditingStepId(null); }}
                                className="flex-1 text-sm px-2 py-0.5 rounded border border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-400"
                              />
                            ) : (
                              <span className="flex-1 text-slate-700 truncate">{s.question}</span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${s.isCustom ? "bg-violet-100 text-violet-600" : "bg-slate-200 text-slate-400"}`}>{s.section}</span>
                            {editingStepId === id ? (
                              <button onClick={() => commitEdit(id)} className="text-violet-500 hover:text-violet-700 transition-colors shrink-0 ml-1">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button onClick={() => startEditing(s)} className="text-slate-300 hover:text-violet-500 transition-colors shrink-0 ml-1">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => removeStep(id)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          {/* Add new question */}
          <div className="border-t border-slate-100 pt-3 mt-2 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Add a question</p>
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomQuestion()}
              placeholder="Question text (e.g. Do you have pets?)"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <input
              type="text"
              value={newFieldId}
              onChange={(e) => setNewFieldId(e.target.value)}
              placeholder="Field key (optional, e.g. has_pets)"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <Button
              onClick={addCustomQuestion}
              disabled={!newQuestion.trim()}
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
            >
              + Add Question
            </Button>
          </div>

          <button
            onClick={() => {
              const def = STEPS.map((s) => s.id);
              setStepOrder(def);
              setCustomSteps([]);
              if (profileId) base44.entities.AgentProfile.update(profileId, { bbi_step_order: def, bbi_custom_steps: [] }).catch(() => {});
            }}
            className="text-xs text-slate-400 hover:text-slate-600 mt-1"
          >
            Reset to default order
          </button>
        </div>
      )}

      {/* Contact quick-fill */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Quick-fill from Contact</p>
        {contacts.length === 0 ? (
          <p className="text-sm text-slate-400">No contacts found.</p>
        ) : (
          <Select
            value={selectedContact?.id || ""}
            onValueChange={(id) => {
              const c = contacts.find((c) => c.id === id);
              fillFromContact(c || null);
            }}
          >
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Select a contact to auto-fill…" />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="font-medium">{c.full_name}</span>
                  {c.email && <span className="text-slate-400 ml-2 text-xs">{c.email}</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {selectedContact && (
          <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2">
            <div className="w-6 h-6 rounded-full bg-violet-200 flex items-center justify-center text-violet-700 font-bold text-xs shrink-0">
              {selectedContact.full_name?.[0]?.toUpperCase()}
            </div>
            <p className="text-sm font-semibold text-violet-800 flex-1">{selectedContact.full_name}</p>
            <button onClick={() => fillFromContact(null)} className="text-xs text-violet-400 hover:text-violet-700">Clear</button>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-400">
          <span>{currentStep.section}</span>
          <span>Step {step + 1} of {totalSteps}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div className="bg-violet-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            {React.createElement(currentStep.icon, { className: "w-5 h-5 text-violet-600" })}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-900">{currentStep.question}</h2>
            {currentStep.hint && <p className="text-sm text-slate-400 mt-1">{currentStep.hint}</p>}
          </div>
        </div>

        {currentStep.type === "select" ? (
          <Select
            value={values[currentStep.id] || ""}
            onValueChange={(v) => setValues((prev) => ({ ...prev, [currentStep.id]: v }))}
          >
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {currentStep.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="relative">
            {currentStep.prefix && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{currentStep.prefix}</span>
            )}
            <Input
              autoFocus
              type={currentStep.type === "number" ? "text" : currentStep.type}
              value={currentValue}
              onChange={(e) => setValues((v) => ({ ...v, [currentStep.id]: e.target.value }))}
              onKeyDown={handleKeyDown}
              placeholder={currentStep.placeholder || ""}
              className={`h-12 text-base ${currentStep.prefix ? "pl-7" : ""} ${currentStep.suffix ? "pr-8" : ""}`}
            />
            {currentStep.suffix && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{currentStep.suffix}</span>
            )}
          </div>
        )}

        {currentStep.optional && (
          <p className="text-xs text-slate-400 -mt-3">Optional — press Next to skip</p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        )}
        <Button
          onClick={handleNext}
          disabled={!canAdvance}
          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white gap-2"
        >
          {step === totalSteps - 1 ? "Review & Finish" : "Next"}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-center text-xs text-slate-400">Press Enter to advance • All fields editable on the final form</p>

      {/* PDF Field Mapper modal */}
      {mappingOpen && selectedTemplate && (
        <Dialog open onOpenChange={() => setMappingOpen(false)}>
          <DialogContent className="max-w-[95vw] w-full h-[92vh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 py-3 border-b border-slate-100 shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base">
                <MapPin className="w-4 h-4 text-violet-500" />
                Map Fields — <span className="text-violet-700">{selectedTemplate.name}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <TemplatePDFMapper
                pdfUrl={selectedTemplate.pdf_url}
                mappings={selectedTemplate.field_mappings || []}
                onMappingsChange={async (newMappings) => {
                  await base44.entities.PDFTemplate.update(selectedTemplate.id, { field_mappings: newMappings });
                  setSelectedTemplate((t) => ({ ...t, field_mappings: newMappings }));
                }}
              />
            </div>
            <div className="px-6 py-3 border-t border-slate-100 flex justify-end shrink-0">
              <Button onClick={() => setMappingOpen(false)} className="bg-violet-600 hover:bg-violet-700 text-white">
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}