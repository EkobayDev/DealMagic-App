import React, { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, GripVertical, Pencil, Check, X,
  ArrowLeft, Upload, FileText, MapPin, List, ChevronDown, Download, Save, Share2, History, UserCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import TemplatePDFMapper from "@/components/pdftemplates/TemplatePDFMapper";
import SourceFieldsEditor from "@/components/bbsa/SourceFieldsEditor";
import BBSAVersionHistory from "@/components/bbsa/BBSAVersionHistory";
import ClientDocuments from "@/components/bbsa/ClientDocuments";
import BBSASharedTemplate from "@/components/bbsa/BBSASharedTemplate";
import { loadPdfJs } from "@/lib/pdfjs-loader";

// ── Default source options (used as initial state) ───────────────────────────
const DEFAULT_SOURCE_OPTIONS = [
  { group: "Client", options: [
    { value: "contact_full_name",                 label: "Full Name" },
    { value: "contact_email",                     label: "Email" },
    { value: "contact_phone",                     label: "Phone" },
    { value: "contact_initials",                  label: "Initials" },
    { value: "contact_address",                   label: "Address" },
    { value: "contact_city",                      label: "City" },
    { value: "contact_state",                     label: "State" },
    { value: "contact_zip",                       label: "ZIP" },
    { value: "contact2_name",                     label: "Co-Buyer Full Name" },
    { value: "contact2_phone",                    label: "Co-Buyer Phone" },
    { value: "contact2_email",                    label: "Co-Buyer Email" },
    { value: "contact2_relation",                 label: "Co-Buyer Relation" },
    { value: "contact_buyer_agent_name",          label: "Buyer Agent Name" },
    { value: "contact_buyer_agent_brokerage",     label: "Buyer Agent Brokerage" },
    { value: "contact_broker_address",            label: "Broker Address" },
    { value: "contact_broker_city",               label: "Broker City" },
    { value: "contact_broker_state",              label: "Broker State" },
    { value: "contact_broker_zip",                label: "Broker ZIP" },
    { value: "contact_broker_license",            label: "Broker License #" },
    { value: "contact_broker_supervisor",         label: "Broker Supervisor" },
    { value: "contact_broker_supervisor_email",   label: "Broker Supervisor Email" },
    { value: "contact_broker_supervisor_website", label: "Broker Supervisor Website" },
  ]},
  { group: "Agent Profile", options: [
    { value: "agent_name",          label: "Agent Name" },
    { value: "agent_license",       label: "Agent License #" },
    { value: "agent_phone",         label: "Agent Phone" },
    { value: "agent_email",         label: "Agent Email" },
    { value: "brokerage_name",      label: "Brokerage Name" },
    { value: "brokerage_license",   label: "Brokerage License #" },
    { value: "brokerage_address",   label: "Brokerage Address" },
    { value: "brokerage_city",      label: "Brokerage City" },
    { value: "brokerage_state",     label: "Brokerage State" },
    { value: "brokerage_zip",       label: "Brokerage ZIP" },
    { value: "office_phone",        label: "Office Phone" },
    { value: "broker_supervisor",   label: "Broker Supervisor" },
  ]},
  { group: "Utility / Dates", options: [
    { value: "today_date",          label: "Today's Date" },
    { value: "date_plus_60d",       label: "Date + 60 Days" },
    { value: "date_plus_90d",       label: "Date + 90 Days" },
    { value: "date_plus_6mo",       label: "Date + 6 Months" },
  ]},
  { group: "Contact", options: [
    { value: "contact_full_name",        label: "Contact Full Name" },
    { value: "contact_email",            label: "Contact Email" },
    { value: "contact_phone",            label: "Contact Phone" },
    { value: "contact_initials",         label: "Contact Initials" },
    { value: "contact_address",          label: "Contact Address" },
    { value: "contact_city",             label: "Contact City" },
    { value: "contact_state",            label: "Contact State" },
    { value: "contact_zip",              label: "Contact ZIP" },
    { value: "contact2_name",            label: "Co-Buyer Full Name" },
    { value: "contact2_phone",           label: "Co-Buyer Phone" },
    { value: "contact2_email",           label: "Co-Buyer Email" },
    { value: "contact2_relation",        label: "Co-Buyer Relation" },
    { value: "contact_buyer_agent_name", label: "Buyer Agent Name" },
    { value: "contact_buyer_agent_brokerage", label: "Buyer Agent Brokerage" },
    { value: "contact_broker_address",   label: "Broker Address" },
    { value: "contact_broker_city",      label: "Broker City" },
    { value: "contact_broker_state",     label: "Broker State" },
    { value: "contact_broker_zip",       label: "Broker ZIP" },
    { value: "contact_broker_license",   label: "Broker License #" },
    { value: "contact_broker_supervisor",label: "Broker Supervisor" },
    { value: "contact_broker_supervisor_email", label: "Broker Supervisor Email" },
    { value: "contact_broker_supervisor_website", label: "Broker Supervisor Website" },
  ]},
];

const UTILITY_FIELDS = [
  { key: "today_date",    label: "Today's Date" },
  { key: "date_plus_60d", label: "Date + 60 Days" },
  { key: "date_plus_90d", label: "Date + 90 Days" },
  { key: "date_plus_6mo", label: "Date + 6 Months" },
];

function newField() {
  return {
    id: `f_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    label: "",
    sourceKey: "",        // maps to a SOURCE_OPTIONS value
    defaultValue: "",     // static default shown in Fill tab
    validation: [],       // array of validation rules: { type: 'required' | 'email' | 'minLength', value?: number }
  };
}

// Validate a field value against its rules
function validateField(value, rules) {
  const errors = [];
  if (!rules || rules.length === 0) return errors;
  
  rules.forEach((rule) => {
    if (rule.type === "required" && !String(value).trim()) {
      errors.push("This field is required");
    }
    if (rule.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.push("Please enter a valid email");
    }
    if (rule.type === "minLength" && value && String(value).length < (rule.value || 0)) {
      errors.push(`Minimum ${rule.value} characters required`);
    }
  });
  
  return errors;
}

// ── Single draggable field row ───────────────────────────────────────────────
function FieldRow({ field, index, onUpdate, onDelete, dragHandleProps, sourceOptions }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 group" onMouseDown={(e) => {
      // Allow inputs/selects to be focused
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        e.stopPropagation();
      }
    }}>
      {/* Main row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag handle — only this element gets dragHandleProps */}
        <div {...dragHandleProps} className="shrink-0 cursor-grab">
          <GripVertical className="w-4 h-4 text-slate-300" />
        </div>

        {/* Index badge */}
        <span className="text-[10px] font-bold text-slate-300 w-5 text-center shrink-0">{index + 1}</span>

        {/* Label — always editable inline */}
        <input
          value={field.label}
          onChange={(e) => onUpdate(field.id, { label: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Field label…"
          className="flex-1 min-w-0 text-sm font-medium text-slate-800 border border-slate-200 rounded-lg px-2 py-1 hover:border-slate-300 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-400 placeholder:text-slate-300 placeholder:font-normal bg-white"
        />

        {/* Source mapping dropdown */}
        <div className="relative shrink-0">
          <select
            value={field.sourceKey}
            onChange={(e) => onUpdate(field.id, { sourceKey: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-xs border border-slate-200 rounded-lg pl-2 pr-6 py-1.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-400 appearance-none bg-white max-w-[200px]"
          >
            <option value="">— Auto-populate from —</option>
            {sourceOptions.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(field.id)}
          className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1 transition-colors shrink-0"
          title="Delete field"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Default value row */}
      <div className="flex items-center gap-2 px-3 py-2.5 pl-12">
        <span className="text-[10px] text-slate-400 shrink-0 w-24">Default value:</span>
        <input
          value={field.defaultValue || ""}
          onChange={(e) => onUpdate(field.id, { defaultValue: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder={field.sourceKey ? "Leave blank to use auto-populated value" : "Static default shown in Fill tab…"}
          className="flex-1 text-xs text-slate-600 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400 placeholder:text-slate-300 bg-white"
        />
      </div>

      {/* Validation rules row */}
      <div className="px-3 pb-2.5 pl-12">
        <span className="text-[10px] text-slate-400 shrink-0 block mb-1.5">Validation rules:</span>
        <div className="space-y-1.5">
          {field.validation && field.validation.length > 0 && (
            field.validation.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded bg-violet-50 text-violet-700 border border-violet-200 font-medium flex-1 truncate">
                  {rule.type === "required" && "Required"}
                  {rule.type === "email" && "Email format"}
                  {rule.type === "minLength" && `Min ${rule.value} chars`}
                </span>
                <button
                  onClick={() => onUpdate(field.id, { validation: field.validation.filter((_, i) => i !== idx) })}
                  className="text-slate-300 hover:text-red-400 transition-colors shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
          <div className="flex items-center gap-1.5">
            <select
              onChange={(e) => {
                if (!e.target.value) return;
                const type = e.target.value;
                let rule = { type };
                if (type === "minLength") rule.value = 1;
                onUpdate(field.id, { validation: [...(field.validation || []), rule] });
                e.target.value = "";
              }}
              className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white"
            >
              <option value="">+ Add rule…</option>
              <option value="required">Required</option>
              <option value="email">Email format</option>
              <option value="minLength">Minimum length</option>
            </select>
            {field.validation?.some((r) => r.type === "minLength") && (
              <input
                type="number"
                min="1"
                max="999"
                value={field.validation?.find((r) => r.type === "minLength")?.value || 1}
                onChange={(e) => {
                  const newVal = parseInt(e.target.value) || 1;
                  onUpdate(field.id, {
                    validation: field.validation.map((r) => r.type === "minLength" ? { ...r, value: newVal } : r)
                  });
                }}
                className="w-12 text-xs border border-slate-200 rounded-lg px-1 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white"
              />
            )}
          </div>
        </div>
      </div>

      {/* Conditional logic row */}
      <div className="px-3 pb-2.5 pl-12">
        <span className="text-[10px] text-slate-400 shrink-0 block mb-1">Conditional logic:</span>
        <textarea
          value={field.conditionalLogic || ""}
          onChange={(e) => onUpdate(field.id, { conditionalLogic: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Conditions / rules for when/how to populate this field…"
          rows={2}
          className="w-full text-xs text-slate-600 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400 placeholder:text-slate-300 bg-white resize-none"
        />
      </div>
    </div>
  );
}



// ── Main page ────────────────────────────────────────────────────────────────
export default function BBSABuilder() {
  const { user: currentUser, isLoadingAuth } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [tab, setTab] = useState(null); // null until role is known
  const [sessionId, setSessionId] = useState(null); // BBSABuilderSession ID
  const [sessionName, setSessionName] = useState("My BBSA Builder");
  const [fields, setFields] = useState([]);
  const [sourceOptions, setSourceOptions] = useState(DEFAULT_SOURCE_OPTIONS);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfName, setPdfName] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [mappings, setMappings] = useState([]); // pins on the PDF
  const [fieldValues, setFieldValues] = useState({}); // { fieldId: value }
  const [exporting, setExporting] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const autoSaveRef = React.useRef(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Set initial tab once auth finishes loading AND currentUser is available
  useEffect(() => {
    if (!isLoadingAuth && currentUser && tab === null) {
      setTab(currentUser.role === "admin" ? "fields" : "template");
    }
  }, [isLoadingAuth, currentUser]);

  // Fetch agent profile + brokerage for auto-populating Fill tab
  const { data: agentProfiles = [] } = useQuery({
    queryKey: ["agent-profiles-bbsa", currentUser?.email],
    queryFn: () => base44.entities.AgentProfile.list("agent_name", 10),
    enabled: !!currentUser,
  });

  const { data: brokerages = [] } = useQuery({
    queryKey: ["brokerages-bbsa"],
    queryFn: () => base44.entities.Brokerage.list("brokerage_name", 100),
    enabled: !!currentUser,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-bbsa", currentUser?.email, currentUser?.role],
    queryFn: () =>
      currentUser?.role === "admin"
        ? base44.entities.Contact.list("full_name", 200)
        : base44.entities.Contact.filter({ created_by: currentUser.email }, "full_name", 200),
    enabled: !!currentUser,
  });

  const { data: bbaDefaultsRecords = [] } = useQuery({
    queryKey: ["bba-defaults-bbsa", currentUser?.email],
    queryFn: async () => {
      if (!agentProfiles.length) return [];
      const myProfile = agentProfiles.find((a) => a.email?.toLowerCase() === currentUser?.email?.toLowerCase()) || agentProfiles[0];
      if (!myProfile) return [];
      return base44.entities.AgentBBADefaults.filter({ agent_profile_id: myProfile.id }, "-updated_date", 1);
    },
    enabled: !!currentUser && agentProfiles.length > 0,
  });
  const bbaDefaults = bbaDefaultsRecords[0] || null;

  // Resolve agent profile matching the current user
  const agentProfile = agentProfiles.find(
    (a) => a.email?.toLowerCase() === currentUser?.email?.toLowerCase()
  ) || agentProfiles[0] || null;

  // Find matching brokerage from the agent's brokerage license
  const brokerage = brokerages.find(
    (b) => b.license_id === agentProfile?.brokerage_license_number
  ) || null;

  // Build a flat map of sourceKey → value from agent/brokerage data
  function buildSourceValueMap() {
    const ap = agentProfile || {};
    const br = brokerage || {};
    const today = new Date();
    const fmt = (d) => d.toLocaleDateString();
    const add = (days) => { const d = new Date(today); d.setDate(d.getDate() + days); return fmt(d); };
    const addM = (m) => { const d = new Date(today); d.setMonth(d.getMonth() + m); return fmt(d); };
    return {
      // Agent Profile
      agent_name:         ap.agent_name || "",
      agent_license:      ap.license_number || "",
      agent_phone:        ap.phone || "",
      agent_email:        ap.email || "",
      brokerage_name:     ap.brokerage_name || br.brokerage_name || "",
      brokerage_license:  ap.brokerage_license_number || br.license_id || "",
      brokerage_address:  ap.brokerage_address || br.address || "",
      brokerage_city:     ap.brokerage_city || br.city || "",
      brokerage_state:    ap.brokerage_state || br.state || "",
      brokerage_zip:      ap.brokerage_zip || br.zip || "",
      office_phone:       ap.office_phone || br.main_phone || "",
      broker_supervisor:  ap.broker_supervisor || br.broker_name || "",
      // Utility dates
      today_date:         fmt(today),
      date_plus_60d:      add(60),
      date_plus_90d:      add(90),
      date_plus_6mo:      addM(6),
      // BBA Defaults
      bba_default_commission_percent:  bbaDefaults?.commission_percent != null ? String(bbaDefaults.commission_percent) : "",
      bba_default_compensation_type:   bbaDefaults?.compensation_type || "",
      bba_default_commission_amount:   bbaDefaults?.commission_amount != null ? String(bbaDefaults.commission_amount) : "",
      bba_default_financing_type:      bbaDefaults?.financing_type || "",
      bba_default_property_type:       bbaDefaults?.property_type || "",
      bba_default_agreement_duration:  bbaDefaults?.agreement_duration_months != null ? `${bbaDefaults.agreement_duration_months} months` : "",
      bba_default_city:                bbaDefaults?.city || "",
      bba_default_county:              bbaDefaults?.county || "",
      bba_default_state:               bbaDefaults?.state || "",
      bba_default_lender_name:         bbaDefaults?.lender_name || "",
    };
  }

  // Build a map of sourceKey → value from a selected Contact record
  function buildContactValueMap(contact) {
    if (!contact) return {};
    const initials = contact.full_name
      ? contact.full_name.split(" ").map((n) => n[0]).join(".") + "."
      : "";
    return {
      contact_full_name:                    contact.full_name || "",
      contact_email:                        contact.email || "",
      contact_phone:                        contact.phone || "",
      contact_initials:                     initials,
      contact_address:                      contact.address || "",
      contact_city:                         contact.city || "",
      contact_state:                        contact.state || "",
      contact_zip:                          contact.zip || "",
      contact2_name:                        contact.contact2_name || "",
      contact2_phone:                       contact.contact2_phone || "",
      contact2_email:                       contact.contact2_email || "",
      contact2_relation:                    contact.contact2_relation || "",
      contact_buyer_agent_name:             contact.buyer_agent_name || "",
      contact_buyer_agent_brokerage:        contact.buyer_agent_brokerage || "",
      contact_broker_address:               contact.broker_address || "",
      contact_broker_city:                  contact.broker_city || "",
      contact_broker_state:                 contact.broker_state || "",
      contact_broker_zip:                   contact.broker_zip || "",
      contact_broker_license:               contact.broker_license_number || "",
      contact_broker_supervisor:            contact.broker_supervisor || "",
      contact_broker_supervisor_email:      contact.broker_supervisor_email || "",
      contact_broker_supervisor_website:    contact.broker_supervisor_website || "",
      // legacy keys kept for backwards compat
      contact_name:                         contact.full_name || "",
      buyer_email:                          contact.email || "",
      buyer_phone:                          contact.phone || "",
      buyer_agent_name:                     contact.buyer_agent_name || "",
      buyer_agent_brokerage:                contact.buyer_agent_brokerage || "",
      brokerage_name:                       contact.buyer_agent_brokerage || "",
      brokerage_address:                    contact.broker_address || "",
      brokerage_city:                       contact.broker_city || "",
      brokerage_state:                      contact.broker_state || "",
      brokerage_zip:                        contact.broker_zip || "",
      brokerage_license:                    contact.broker_license_number || "",
      broker_supervisor:                    contact.broker_supervisor || "",
    };
  }

  // When a contact is selected, clear and repopulate all fields from agent + contact data
  const handleContactSelect = (contactId) => {
    setSelectedContactId(contactId);
    const sourceMap = buildSourceValueMap();
    const contactMap = contactId ? buildContactValueMap(contacts.find((c) => c.id === contactId)) : {};
    const merged = { ...sourceMap, ...contactMap };
    const updated = {};
    fields.forEach((f) => {
      if (f.sourceKey && merged[f.sourceKey] !== undefined && merged[f.sourceKey] !== "") {
        updated[f.id] = merged[f.sourceKey];
      } else if (f.defaultValue) {
        updated[f.id] = f.defaultValue;
      }
    });
    setFieldValues(updated);
  };

  // Load own session; if none exists, fall back to the admin's shared template
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ["bbsa-sessions", currentUser?.email],
    queryFn: () =>
      currentUser
        ? base44.entities.BBSABuilderSession.filter({ created_by: currentUser.email }, "-updated_date", 1)
        : Promise.resolve([]),
    enabled: !!currentUser,
  });

  const { data: sharedSessions = [], isLoading: isLoadingShared } = useQuery({
    queryKey: ["bbsa-shared-sessions"],
    queryFn: () => base44.entities.BBSABuilderSession.filter({ isShared: true }, "-updated_date", 1),
    enabled: !!currentUser,
  });

  // Load template data into local state from a session object
  const loadSessionData = (session) => {
    setSessionName(session.name);
    setFields(session.fields || []);
    const loadedOptions = session.sourceOptions?.length ? session.sourceOptions : DEFAULT_SOURCE_OPTIONS;
    const filtered = loadedOptions.filter((g) => g.group !== "BBA Defaults" && g.group !== "BBA Record");
    const clientGroup = DEFAULT_SOURCE_OPTIONS.find((g) => g.group === "Client");
    const hasClient = filtered.some((g) => g.group === "Client");
    setSourceOptions(hasClient ? filtered : [clientGroup, ...filtered]);
    setMappings(session.mappings || []);
    setPdfUrl(session.pdfUrl || null);
    setPdfName(session.pdfName || null);
    if (session.fieldValues) setFieldValues(session.fieldValues);
  };

  useEffect(() => {
    if (sessionId) return;
    if (!currentUser) return;
    // Wait for both queries to finish loading
    if (isLoadingSessions || isLoadingShared) return;

    const ownSession = sessions[0];
    const sharedSession = sharedSessions[0];
    // Non-admins fall back to the shared template if they have no own session
    const fallback = currentUser?.role !== "admin" ? sharedSession : null;
    const session = ownSession || fallback;

    setSessionLoaded(true);

    if (!session) return;

    loadSessionData(session);

    // Only bind the sessionId for their own session (not a shared template loaded as read-only)
    if (!session.isShared || currentUser?.role === "admin") {
      setSessionId(session.id);
    }
  }, [sessions, sharedSessions, currentUser, isLoadingSessions, isLoadingShared]);

  // Handler for agents clicking "Use This Template" from the Template tab
  const handleUseTemplate = (template) => {
    loadSessionData(template);
    setFieldValues({});
    setSelectedContactId("");
    // Don't bind sessionId — agents get their own copy on first auto-save
    setSessionLoaded(true);
    setTab("fill");
  };

  // Mutation to save session
  const saveMutation = useMutation({
    mutationFn: (data) =>
      sessionId
        ? base44.entities.BBSABuilderSession.update(sessionId, data)
        : base44.entities.BBSABuilderSession.create({ name: sessionName, ...data }),
    onSuccess: (result) => {
      if (!sessionId && result?.id) setSessionId(result.id);
    },
  });

  // ── Field management ───────────────────────────────────────────────────────
  const addField = () => setFields((f) => [...f, newField()]);

  const updateField = (id, changes) =>
    setFields((f) => f.map((field) => field.id === id ? { ...field, ...changes } : field));

  const deleteField = (id) => setFields((f) => f.filter((field) => field.id !== id));

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = [...fields];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setFields(reordered);
  };

  // ── Auto-save to database ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    if (!sessionLoaded) return; // Don't auto-save until the session has been loaded
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      saveMutation.mutate({
        name: sessionName,
        fields,
        sourceOptions,
        mappings,
        pdfUrl,
        pdfName,
        fieldValues,
      });
    }, 1200);
    return () => clearTimeout(autoSaveRef.current);
  }, [fields, sourceOptions, mappings, pdfUrl, pdfName, sessionName, fieldValues, currentUser, sessionLoaded]);

  // ── PDF upload ─────────────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Please upload a PDF file."); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPdfUrl(file_url);
      setPdfName(file.name);
      setMappings([]);
      toast.success(`"${file.name}" uploaded.`);
    } finally {
      setUploading(false);
    }
  };

  // Auto-populate fields when switching to Fill tab
  useEffect(() => {
    if (tab !== "fill") return;
    const sourceMap = buildSourceValueMap();
    const contactMap = selectedContactId
      ? buildContactValueMap(contacts.find((c) => c.id === selectedContactId))
      : {};
    const merged = { ...sourceMap, ...contactMap };
    setFieldValues((prev) => {
      const updated = { ...prev };
      fields.forEach((f) => {
        if (f.sourceKey && merged[f.sourceKey] !== undefined) {
          updated[f.id] = merged[f.sourceKey];
          return;
        }
        if (!updated[f.id] && f.defaultValue) {
          updated[f.id] = f.defaultValue;
        }
      });
      return updated;
    });
  }, [tab, fields, agentProfile, brokerage, selectedContactId, contacts]);

  const handleExportPDF = async () => {
    if (!pdfUrl) { toast.error("No PDF uploaded. Add a PDF template first."); return; }
    if (mappings.length === 0) { toast.error("No fields pinned on the PDF yet."); return; }
    
    // Validate all fields
    const validationErrors = [];
    fields.forEach((f) => {
      const errors = validateField(fieldValues[f.id], f.validation);
      if (errors.length > 0) {
        validationErrors.push(`${f.label}: ${errors.join(", ")}`);
      }
    });
    if (validationErrors.length > 0) {
      toast.error(`Please fix validation errors:\n${validationErrors.join("\n")}`);
      return;
    }
    
    setExporting(true);
    toast("Generating PDF…");
    try {
      const pdfjsLib = await loadPdfJs();
      const { jsPDF } = await import("jspdf");

      const pdfBytes = await fetch(pdfUrl).then((r) => r.arrayBuffer());
      const pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
      const numPages = pdfDoc.numPages;
      let outDoc;

      for (let p = 1; p <= numPages; p++) {
        const page = await pdfDoc.getPage(p);
        const vp = page.getViewport({ scale: 1.0 });
        const W = vp.width, H = vp.height;

        if (p === 1) {
          outDoc = new jsPDF({ unit: "pt", format: [W, H] });
        } else {
          outDoc.addPage([W, H]);
        }

        // Render page to canvas
        const renderVp = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        canvas.width = renderVp.width;
        canvas.height = renderVp.height;
        await page.render({ canvasContext: canvas.getContext("2d"), viewport: renderVp }).promise;
        outDoc.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, W, H);

        // Overlay field values for this page
        const currentSourceMap = buildSourceValueMap();
        mappings.filter((m) => m.page === p).forEach((m) => {
          const field = fields.find((f) => f.id === m.fieldKey);
          const utilityField = !field ? UTILITY_FIELDS.find((u) => u.key === m.fieldKey) : null;
          if (!field && !utilityField) return;
          const value = field
            ? (fieldValues[field.id] || (field.sourceKey ? currentSourceMap[field.sourceKey] : "") || field.defaultValue || "")
            : (currentSourceMap[m.fieldKey] || "");
          if (!value) return;
          outDoc.setFontSize(11);
          outDoc.setFont("helvetica", "bold");
          outDoc.setTextColor(0, 0, 0);
          outDoc.text(value, m.x * W, m.y * H);
        });
      }

      // Trigger browser download
      const fileName = `BBSA_${new Date().toLocaleDateString().replace(/\//g, "-")}.pdf`;
      outDoc.save(fileName);

      // Save to Client Documents repository if a contact is selected
      if (selectedContactId) {
        const contact = contacts.find((c) => c.id === selectedContactId);
        try {
          const pdfBlob = outDoc.output("blob");
          const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });
          const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
          await base44.entities.ClientDocument.create({
            contact_id: selectedContactId,
            contact_name: contact?.full_name || "Unknown",
            doc_type: "bbsa",
            name: fileName,
            file_url,
            generated_by: currentUser?.email || "",
          });
          toast.success("PDF saved to Client Documents!");
        } catch (saveErr) {
          toast.error("PDF downloaded but could not save to Client Documents: " + saveErr.message);
        }
      } else {
        toast.success("PDF downloaded!");
      }
    } catch (err) {
      toast.error("Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  // Publish current session as shared template (admin only)
  const [publishing, setPublishing] = useState(false);

  const doPublish = async ({ fields: f, sourceOptions: so, mappings: m, pdfUrl: pu, pdfName: pn, label }) => {
    // Snapshot current as a version before publishing
    const existingVersions = await base44.entities.BBSATemplateVersion.list("-version_number", 1);
    const nextVersion = (existingVersions[0]?.version_number || 0) + 1;
    await base44.entities.BBSATemplateVersion.create({
      version_number: nextVersion,
      label: label || `Published v${nextVersion}`,
      fields: f,
      sourceOptions: so,
      mappings: m,
      pdfUrl: pu,
      pdfName: pn,
      published_by: currentUser?.email,
    });

    // Un-share any existing shared sessions, then save current as shared
    const existing = await base44.entities.BBSABuilderSession.filter({ isShared: true }, "-updated_date", 100);
    await Promise.all(existing.map((s) => base44.entities.BBSABuilderSession.update(s.id, { isShared: false })));
    const data = { name: sessionName, fields: f, sourceOptions: so, mappings: m, pdfUrl: pu, pdfName: pn, isShared: true };
    if (sessionId) {
      await base44.entities.BBSABuilderSession.update(sessionId, data);
    } else {
      const result = await base44.entities.BBSABuilderSession.create(data);
      if (result?.id) setSessionId(result.id);
    }
  };

  const handlePublishTemplate = async () => {
    setPublishing(true);
    try {
      await doPublish({ fields, sourceOptions, mappings, pdfUrl, pdfName });
      toast.success("Template published — all agents will now see this template.");
    } catch (err) {
      toast.error("Publish failed: " + err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleRestoreVersion = async (snapshot) => {
    // Apply the snapshot locally
    setFields(snapshot.fields || []);
    setSourceOptions(snapshot.sourceOptions?.length ? snapshot.sourceOptions : DEFAULT_SOURCE_OPTIONS);
    setMappings(snapshot.mappings || []);
    setPdfUrl(snapshot.pdfUrl || null);
    setPdfName(snapshot.pdfName || null);
    // Publish the restored version (this also creates a new version entry)
    await doPublish({ ...snapshot });
    toast.success("Version restored and published to agents.");
  };

  const mappedCount = fields.filter((f) => mappings.some((m) => m.fieldKey === f.id)).length;

  // Don't render until auth is done and tab is set (so isAdmin is definitively known)
  if (isLoadingAuth || !currentUser || tab === null) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
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
          <h1 className="text-xl font-bold text-slate-900">BBSA Builder</h1>
          <p className="text-sm text-slate-400 mt-0.5">Define your fields, map data sources, then pin them on your PDF</p>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Session name..."
              className="text-xs bg-slate-100 rounded px-2 py-1 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            {saveMutation.status === "pending" && <span className="text-[10px] text-slate-400">Saving...</span>}
            {saveMutation.status === "success" && <span className="text-[10px] text-emerald-600">✓ Saved</span>}
          </div>
        </div>
        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className={`px-2.5 py-1 rounded-full font-medium ${fields.length > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100"}`}>
            {fields.length} field{fields.length !== 1 ? "s" : ""}
          </span>
          {pdfUrl && (
            <span className="px-2.5 py-1 rounded-full font-medium bg-violet-100 text-violet-700">
              {mappedCount}/{fields.length} pinned
            </span>
          )}
          {isAdmin && (
            <Button
              onClick={handlePublishTemplate}
              disabled={publishing || fields.length === 0}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 ml-2"
            >
              {publishing
                ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publishing…</>
                : <><Share2 className="w-3.5 h-3.5" /> Publish to Agents</>}
            </Button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex rounded-xl border border-slate-200 overflow-hidden w-fit">
        {isAdmin && (
          <button
            onClick={() => setTab("fields")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${tab === "fields" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
          >
            <List className="w-4 h-4" /> Fields
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setTab("sources")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${tab === "sources" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
          >
            <Pencil className="w-4 h-4" /> Source Fields
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setTab("pdf")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${tab === "pdf" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
          >
            <MapPin className="w-4 h-4" /> PDF Mapper
          </button>
        )}
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
        {isAdmin && (
          <button
            onClick={() => setTab("history")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${tab === "history" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
          >
            <History className="w-4 h-4" /> Version History
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setTab("documents")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${tab === "documents" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
          >
            <FileText className="w-4 h-4" /> Client Documents (Admin)
          </button>
        )}
        {!isAdmin && (
          <button
            onClick={() => setTab("documents")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${tab === "documents" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
          >
            <FileText className="w-4 h-4" /> Client Documents
          </button>
        )}
      </div>

      {/* ── TAB: Source Fields ───────────────────────────────────────────────── */}
      {tab === "sources" && isAdmin && (
        <SourceFieldsEditor sourceOptions={sourceOptions} onChangeSourceOptions={setSourceOptions} />
      )}

      {/* ── TAB: Version History ─────────────────────────────────────────────── */}
      {tab === "history" && isAdmin && (
        <BBSAVersionHistory onRestore={handleRestoreVersion} />
      )}

      {/* ── TAB: Fields ──────────────────────────────────────────────────────── */}
      {tab === "fields" && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Add the fields you want, name them, and optionally map each to a data source so it auto-populates.
            </p>
            <Button onClick={addField} className="bg-slate-900 text-white hover:bg-slate-800 gap-2 shrink-0">
              <Plus className="w-4 h-4" /> Add Field
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
              <FileText className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-medium">No fields yet</p>
              <p className="text-sm mt-1 mb-4">Click "Add Field" to start building your form</p>
              <Button onClick={addField} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Add First Field
              </Button>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="w-4 shrink-0" />
                <span className="w-5 shrink-0" />
                <span className="flex-1">Field Label</span>
                <span className="w-[200px] shrink-0 hidden sm:block">Auto-populate from</span>
                <span className="w-4 shrink-0" />
              </div>

              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="fields">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                      {fields.map((field, idx) => (
                        <Draggable key={field.id} draggableId={field.id} index={idx}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              className={snap.isDragging ? "opacity-70 shadow-lg" : ""}
                            >
                              <FieldRow
                                dragHandleProps={prov.dragHandleProps}
                                field={field}
                                index={idx}
                                onUpdate={updateField}
                                onDelete={deleteField}
                                sourceOptions={sourceOptions}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              <button
                onClick={addField}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:border-violet-400 hover:text-violet-600 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" /> Add Field
              </button>

              {fields.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setTab("pdf")}
                    className="flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-800 px-4 py-2 rounded-xl border border-violet-200 hover:bg-violet-50 transition-colors"
                  >
                    <MapPin className="w-4 h-4" /> Continue to PDF Mapper →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: Fill & Export ───────────────────────────────────────────────── */}
      {tab === "fill" && (
        <div className="space-y-4">
          {fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
              <FileText className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-medium">No fields defined yet</p>
              <p className="text-sm mt-1 mb-4">Go to the <button onClick={() => setTab("fields")} className="underline text-violet-600">Fields tab</button> to add fields first.</p>
            </div>
          ) : (
            <>
              {/* Agent/Brokerage auto-fill indicator */}
              {agentProfile && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5 flex items-center gap-3 text-xs text-violet-700">
                  <span className="font-semibold">Auto-filled from:</span>
                  <span>{agentProfile.agent_name}</span>
                  {brokerage && <><span className="text-violet-300">·</span><span>{brokerage.brokerage_name}</span></>}
                  {!brokerage && agentProfile.brokerage_name && <><span className="text-violet-300">·</span><span>{agentProfile.brokerage_name}</span></>}
                </div>
              )}

              {/* Client dropdown */}
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
                  <button
                    onClick={() => { setSelectedContactId(""); }}
                    className="text-slate-300 hover:text-red-400 transition-colors shrink-0"
                    title="Clear client"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Enter values for each field. Agent &amp; brokerage fields are auto-filled from your profile.</p>
                <Button
                  onClick={handleExportPDF}
                  disabled={exporting || !pdfUrl}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0"
                >
                  {exporting
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
                    : <><Download className="w-4 h-4" /> Download PDF</>}
                </Button>
              </div>

              {!pdfUrl && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                  No PDF template uploaded yet — go to the <button onClick={() => setTab("pdf")} className="underline font-medium">PDF Mapper tab</button> to upload one.
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
                        <span className={`text-sm font-medium w-[300px] shrink-0 truncate ${hasError ? "text-red-600" : "text-slate-700"}`}>
                          {field.label || <span className="italic text-slate-300">Untitled</span>}
                          {field.validation?.some((r) => r.type === "required") && <span className="text-red-500 ml-1">*</span>}
                        </span>
                        <Input
                          value={fieldValues[field.id] || ""}
                          onChange={(e) => setFieldValues((v) => ({ ...v, [field.id]: e.target.value }))}
                          placeholder={field.sourceKey ? `Auto: ${sourceOptions.flatMap(g => g.options).find(o => o.value === field.sourceKey)?.label || field.sourceKey}` : "Enter value…"}
                          className={`w-1/4 h-8 text-sm ${hasError ? "border-red-300 focus:ring-red-400" : ""}`}
                        />
                        {mappings.some((m) => m.fieldKey === field.id) ? (
                          <span className="text-[10px] text-emerald-600 font-medium shrink-0">✓ pinned</span>
                        ) : (
                          <span className="text-[10px] text-slate-300 shrink-0">not pinned</span>
                        )}
                      </div>
                      {hasError && (
                        <div className="ml-9 space-y-0.5">
                          {errors.map((err, i) => (
                            <p key={i} className="text-[10px] text-red-600 font-medium">{err}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleExportPDF}
                  disabled={exporting || !pdfUrl}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  {exporting
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
                    : <><Download className="w-4 h-4" /> Download Filled PDF</>}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: Template ────────────────────────────────────────────────────── */}
      {tab === "template" && (
        <BBSASharedTemplate onUseTemplate={handleUseTemplate} />
      )}

      {/* ── TAB: Client Documents ────────────────────────────────────────────── */}
      {tab === "documents" && (
        <ClientDocuments contacts={contacts} />
      )}

      {/* ── TAB: PDF Mapper ───────────────────────────────────────────────────── */}
      {tab === "pdf" && isAdmin && (
        <div className="space-y-4">
          {/* PDF upload */}
          {!pdfUrl ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
              <Upload className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-medium text-slate-600 mb-1">Upload your PDF template</p>
              <p className="text-sm mb-5">Then click to pin each field onto the document</p>
              <label className="cursor-pointer">
                <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors">
                  {uploading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> Choose PDF</>}
                </div>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              {/* PDF info bar */}
              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
                <FileText className="w-5 h-5 text-violet-500 shrink-0" />
                <span className="text-sm font-medium text-slate-700 flex-1 truncate">{pdfName}</span>
                <label className="cursor-pointer">
                  <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
                  <span className="text-xs text-slate-400 hover:text-violet-600 cursor-pointer transition-colors">Replace PDF</span>
                </label>
              </div>

              {/* Fields to pin — reminder */}
              {fields.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                  No fields defined yet — go to the <button onClick={() => setTab("fields")} className="underline font-medium">Fields tab</button> to add some first.
                </div>
              )}

              {/* PDF Mapper — pass user-defined fields as the available "field list" */}
              <BBSAMapperWrapper
                pdfUrl={pdfUrl}
                fields={fields}
                mappings={mappings}
                onMappingsChange={setMappings}
                onExportPDF={handleExportPDF}
                fieldValues={fieldValues}
                sourceMap={buildSourceValueMap()}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BBSAMapperWrapper({ pdfUrl, fields, mappings, onMappingsChange, onExportPDF, fieldValues = {}, sourceMap = {} }) {
  // Convert user-defined fields to the format TemplatePDFMapper expects (fieldKey, label)
  const convertedMappings = mappings.map((m) => {
    const field = fields.find((f) => f.id === m.fieldKey);
    return {
      ...m,
      pinId: m.pinId || m.fieldKey,
      fieldKey: field?.id || m.fieldKey,
      label: field?.label || m.label || "Field",
    };
  });

  // E-Signature fields from FIELD_GROUPS_FLAT
  const ESIG_FIELDS = [
    { key: "esig_signature_buyer",   label: "Buyer Signature",             group: "E-Signature" },
    { key: "esig_signature_buyer2",  label: "Co-Buyer Signature",          group: "E-Signature" },
    { key: "esig_signature_seller",  label: "Seller Signature",            group: "E-Signature" },
    { key: "esig_signature_agent",   label: "Agent Signature",             group: "E-Signature" },
    { key: "esig_signature_broker",  label: "Broker/Supervisor Signature", group: "E-Signature" },
    { key: "esig_initials_buyer",    label: "Buyer Initials",              group: "E-Signature" },
    { key: "esig_initials_buyer2",   label: "Co-Buyer Initials",           group: "E-Signature" },
    { key: "esig_initials_seller",   label: "Seller Initials",             group: "E-Signature" },
    { key: "esig_initials_agent",    label: "Agent Initials",              group: "E-Signature" },
    { key: "esig_date_buyer",        label: "Buyer Signature Date",        group: "E-Signature" },
    { key: "esig_date_buyer2",       label: "Co-Buyer Signature Date",     group: "E-Signature" },
    { key: "esig_date_seller",       label: "Seller Signature Date",       group: "E-Signature" },
    { key: "esig_date_agent",        label: "Agent Signature Date",        group: "E-Signature" },
  ];

  // Convert fields to availableFields format for dropdown, append utility and e-signature fields
  const availableFields = [
    ...fields.map((f) => ({ key: f.id, label: f.label || "Untitled", group: "Fields" })),
    ...UTILITY_FIELDS.map((u) => ({ ...u, group: "Utility" })),
    ...ESIG_FIELDS,
  ];

  // Build preview values: prefer entered fieldValues, fall back to sourceMap auto-value
  const previewValues = {};
  fields.forEach((f) => {
    const val = fieldValues[f.id] || (f.sourceKey ? sourceMap[f.sourceKey] : "") || f.defaultValue || "";
    if (val) previewValues[f.id] = val;
  });
  // Always include utility/date preview values keyed by their own key
  UTILITY_FIELDS.forEach((u) => {
    if (sourceMap[u.key]) previewValues[u.key] = sourceMap[u.key];
  });

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 p-4">
      <TemplatePDFMapper
        pdfUrl={pdfUrl}
        mappings={convertedMappings}
        onMappingsChange={(newMappings) => {
          onMappingsChange(newMappings.map((m) => ({
            pinId: m.pinId,
            fieldKey: m.fieldKey,
            label: m.label,
            page: m.page,
            x: m.x,
            y: m.y,
          })));
        }}
        previewValues={previewValues}
        availableFields={availableFields}
        templateId={null}
        onSave={() => toast.success("Mappings saved!")}
        onExportPDF={onExportPDF}
      />
    </div>
  );
}