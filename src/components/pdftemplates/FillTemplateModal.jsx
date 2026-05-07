import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Download, X, CheckCircle, ChevronRight, ChevronLeft, Plus, Pencil, Trash2, Check, ArrowUp, ArrowDown, MapPin, PenLine } from "lucide-react";
import SignaturePad from "@/components/signatures/SignaturePad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BBA_SOURCE_MAP, FIELD_GROUPS_FLAT } from "./TemplatePDFMapper";
import TemplatePDFMapper from "./TemplatePDFMapper";

// Maps a template fieldKey to the value from a transaction/contact record
function resolveFieldValue(fieldKey, tx, agentProfile, overrides = {}, contact = null) {
  if (overrides[fieldKey] !== undefined) return overrides[fieldKey];

  if (BBA_SOURCE_MAP[fieldKey]) {
    return resolveFieldValue(BBA_SOURCE_MAP[fieldKey], tx, agentProfile, overrides, contact);
  }

  // Contact-specific field overrides (takes priority over tx buyer fields when a contact is selected)
  if (contact) {
    const contactMap = {
      tx_buyer_name: contact.full_name,
      tx_buyer_email: contact.email,
      tx_buyer_phone: contact.phone,
      contact_full_name: contact.full_name,
      contact_email: contact.email,
      contact_phone: contact.phone,
      contact_role: contact.role,
      contact_initials: contact.full_name
        ? contact.full_name.split(/\s+/).map((n) => n[0]).join("").toUpperCase()
        : "",
      contact_buyer_agent_name: contact.buyer_agent_name,
      contact_buyer_agent_brokerage: contact.buyer_agent_brokerage,
      contact_broker_address: contact.broker_address,
      contact_broker_city: contact.broker_city,
      contact_broker_state: contact.broker_state,
      contact_broker_zip: contact.broker_zip,
      contact_broker_license: contact.broker_license_number,
      contact_broker_supervisor: contact.broker_supervisor,
    };
    if (contactMap[fieldKey] !== undefined) return contactMap[fieldKey] || "";
  }

  if (fieldKey === "checkmark" || fieldKey.startsWith("checkmark_")) return overrides[fieldKey] !== undefined ? overrides[fieldKey] : "✓";

  const txMap = {
    today_date: new Date().toLocaleDateString(),
    date_plus_3mo: (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toLocaleDateString(); })(),
    date_plus_6mo: (() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d.toLocaleDateString(); })(),
    date_plus_60d: (() => { const d = new Date(); d.setDate(d.getDate() + 60); return d.toLocaleDateString(); })(),
    date_plus_90d: (() => { const d = new Date(); d.setDate(d.getDate() + 90); return d.toLocaleDateString(); })(),
    date_plus_180d: (() => { const d = new Date(); d.setDate(d.getDate() + 180); return d.toLocaleDateString(); })(),
    tx_property_address: tx?.property_address,
    tx_city: tx?.city,
    tx_state: tx?.state,
    tx_zip: tx?.zip,
    tx_county: tx?.county,
    tx_mls_number: tx?.mls_number,
    tx_buyer_name: tx?.buyer_name,
    tx_buyer_email: tx?.buyer_email,
    tx_buyer_phone: tx?.buyer_phone,
    tx_seller_name: tx?.seller_name,
    tx_seller_email: tx?.seller_email,
    tx_seller_phone: tx?.seller_phone,
    tx_purchase_price: tx?.purchase_price ? `$${Number(tx.purchase_price).toLocaleString()}` : "",
    tx_earnest_money: tx?.earnest_money ? `$${Number(tx.earnest_money).toLocaleString()}` : "",
    tx_commission_percent: tx?.commission_percent ? `${tx.commission_percent}%` : "",
    tx_commission_amount: tx?.commission_amount ? `$${Number(tx.commission_amount).toLocaleString()}` : "",
    tx_closing_date: tx?.closing_date || "",
    tx_contract_date: tx?.contract_date || "",
    tx_inspection_deadline: tx?.inspection_deadline || "",
    tx_title_company: tx?.title_company,
    tx_lender_name: tx?.lender_name,
    tx_transaction_fee: tx?.transaction_fee ? `$${Number(tx.transaction_fee).toLocaleString()}` : "",
    contact_initials: tx?.buyer_name
      ? tx.buyer_name.split(/\s+/).map((n) => n[0]).join("").toUpperCase()
      : "",
    agent_name: agentProfile?.agent_name,
    agent_license: agentProfile?.license_number,
    agent_phone: agentProfile?.phone,
    agent_email: agentProfile?.email,
    brokerage_name: agentProfile?.brokerage_name,
    brokerage_license: agentProfile?.brokerage_license_number,
    brokerage_address: agentProfile?.brokerage_address,
    brokerage_city: agentProfile?.brokerage_city,
    brokerage_state: agentProfile?.brokerage_state,
    brokerage_zip: agentProfile?.brokerage_zip,
    office_phone: agentProfile?.office_phone,
    office_email: agentProfile?.office_email,
    broker_supervisor: agentProfile?.broker_supervisor,
  };
  return txMap[fieldKey] || "";
}

// ── Smart question detection ─────────────────────────────────────────────────
// Returns a list of questions based on which fields are mapped in the template
function detectQuestions(fieldMappings) {
  const keys = new Set(fieldMappings.map((m) => m.fieldKey));
  const questions = [];

  // Compensation type — % vs flat fee
  const hasCommPct = keys.has("bba_commission_percent") || keys.has("tx_commission_percent");
  const hasCommAmt = keys.has("bba_commission_amount") || keys.has("tx_commission_amount");
  if (hasCommPct && hasCommAmt) {
    questions.push({
      id: "compensation_type",
      label: "Compensation Type",
      hint: "Which form of compensation applies to this agreement?",
      type: "radio",
      options: [
        { value: "percent", label: "Percentage of sale price" },
        { value: "flat", label: "Flat fee amount" },
      ],
      default: "percent",
    });
  }

  // Compensation % value override (if % selected above, or no flat)
  if (hasCommPct) {
    questions.push({
      id: "compensation_percent_value",
      label: "Compensation Percentage",
      hint: "Enter the agreed compensation percentage (e.g. 3)",
      type: "text",
      inputSuffix: "%",
      placeholder: "e.g. 3",
      dependsOn: { id: "compensation_type", value: "percent" },
    });
  }

  // Flat fee value override
  if (hasCommAmt) {
    questions.push({
      id: "compensation_flat_value",
      label: "Flat Fee Amount",
      hint: "Enter the agreed flat fee dollar amount",
      type: "text",
      inputPrefix: "$",
      placeholder: "e.g. 5000",
      dependsOn: { id: "compensation_type", value: "flat" },
    });
  }

  // Property type
  if (keys.has("tx_property_address") || keys.has("bba_property_address")) {
    questions.push({
      id: "property_type",
      label: "Property Type",
      hint: "Select the type of property",
      type: "radio",
      options: [
        { value: "single_family", label: "Single Family" },
        { value: "condo", label: "Condo / Townhouse" },
        { value: "multi_family", label: "Multi-Family" },
        { value: "land", label: "Land / Lot" },
        { value: "commercial", label: "Commercial" },
      ],
      default: "single_family",
      optional: true,
    });
  }

  // Financing type
  if (keys.has("tx_lender_name") || keys.has("bba_lender_name")) {
    questions.push({
      id: "financing_type",
      label: "Financing Type",
      hint: "How is the buyer financing the purchase?",
      type: "radio",
      options: [
        { value: "conventional", label: "Conventional" },
        { value: "fha", label: "FHA" },
        { value: "va", label: "VA" },
        { value: "cash", label: "Cash" },
        { value: "other", label: "Other" },
      ],
      default: "conventional",
      optional: true,
    });
  }

  // Custom text fields — already handled inline, but include here so user sees them in step 1
  const customFields = fieldMappings.filter((m) => m.fieldKey === "custom_text");
  customFields.forEach((m) => {
    const key = `custom_${m.page}_${m.x}`;
    questions.push({
      id: key,
      label: m.label || "Custom Text",
      hint: `Page ${m.page} — enter the value for this field`,
      type: "text",
      placeholder: "Enter value…",
      isCustomField: true,
      fieldKey: m.fieldKey,
      page: m.page,
      x: m.x,
    });
  });

  return questions;
}

// Build field overrides from questionnaire answers
function buildOverrides(answers, questions) {
  const overrides = {};
  const compType = answers["compensation_type"];

  questions.forEach((q) => {
    if (q.isCustomField) return; // handled separately

    if (q.id === "compensation_type") return;

    if (q.id === "compensation_percent_value" && answers[q.id]) {
      const val = answers[q.id];
      overrides["tx_commission_percent"] = `${val}%`;
      overrides["bba_commission_percent"] = `${val}%`;
      // blank out flat fee fields if % chosen
      if (compType === "percent") {
        overrides["tx_commission_amount"] = "";
        overrides["bba_commission_amount"] = "";
      }
    }

    if (q.id === "compensation_flat_value" && answers[q.id]) {
      const val = answers[q.id];
      overrides["tx_commission_amount"] = `$${Number(val.replace(/[^0-9.]/g, "")).toLocaleString()}`;
      overrides["bba_commission_amount"] = overrides["tx_commission_amount"];
      // blank out percent fields if flat chosen
      if (compType === "flat") {
        overrides["tx_commission_percent"] = "";
        overrides["bba_commission_percent"] = "";
      }
    }
  });

  return overrides;
}

// ── Step 1: Questionnaire ────────────────────────────────────────────────────
function QuestionnaireStep({ questions, answers, onChange, logic, onLogicChange }) {
  if (questions.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">No additional questions needed — proceed to review.</p>
    );
  }

  return (
    <div className="space-y-5">
      {questions.map((q) => {
        // Hide if depends on another answer that isn't selected
        if (q.dependsOn) {
          if (answers[q.dependsOn.id] !== q.dependsOn.value) return null;
        }

        return (
          <div key={q.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2.5">
            <div>
              <p className="text-sm font-semibold text-slate-700">{q.label}{q.optional ? <span className="text-slate-400 font-normal text-xs ml-1">(optional)</span> : ""}</p>
              {q.hint && <p className="text-xs text-slate-400">{q.hint}</p>}
            </div>

            {q.type === "radio" && (
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(q.id, opt.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                      (answers[q.id] || q.default) === opt.value
                        ? "border-violet-400 bg-violet-50 text-violet-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      (answers[q.id] || q.default) === opt.value ? "border-violet-500" : "border-slate-300"
                    }`}>
                      {(answers[q.id] || q.default) === opt.value && (
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 block" />
                      )}
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {q.type === "text" && (
              <div className="relative">
                {q.inputPrefix && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{q.inputPrefix}</span>
                )}
                <Input
                  value={answers[q.id] || ""}
                  onChange={(e) => onChange(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  className={`h-9 bg-white ${q.inputPrefix ? "pl-7" : ""} ${q.inputSuffix ? "pr-8" : ""}`}
                />
                {q.inputSuffix && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{q.inputSuffix}</span>
                )}
              </div>
            )}

            {/* Logic / notes field */}
            <div className="pt-1 border-t border-slate-200">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Logic / Notes</p>
              <textarea
                value={logic[q.id] || ""}
                onChange={(e) => onLogicChange(q.id, e.target.value)}
                placeholder="Record any logic, conditions, or notes for this question…"
                rows={2}
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-300 resize-none text-slate-600 placeholder:text-slate-300"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Question Editor ──────────────────────────────────────────────────────────
function QuestionEditor({ questions, onAdd, onUpdate, onDelete, onMoveUp, onMoveDown, answers, resolvedValues, template, onMappingsChange }) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newHint, setNewHint] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editHint, setEditHint] = useState("");
  const [plottingQuestion, setPlottingQuestion] = useState(null); // question being plotted

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    const id = `custom_q_${Date.now()}`;
    onAdd({ id, label: newLabel.trim(), hint: newHint.trim(), type: "text", placeholder: "Enter value…", isUserDefined: true });
    setNewLabel("");
    setNewHint("");
    setAdding(false);
  };

  const startEdit = (q) => {
    setEditingId(q.id);
    setEditLabel(q.label);
    setEditHint(q.hint || "");
  };

  const saveEdit = (id) => {
    onUpdate(id, { label: editLabel.trim(), hint: editHint.trim() });
    setEditingId(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Questions</p>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add question
          </button>
        )}
      </div>

      {/* Existing questions */}
      {questions.length === 0 && !adding && (
        <p className="text-xs text-slate-400 text-center py-3">No questions for this template. Click "Add question" to create one.</p>
      )}
      <div className="space-y-1.5">
        {questions.map((q, idx) => (
          <div key={q.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            {editingId === q.id ? (
              <div className="space-y-2">
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="Question label"
                  className="h-8 text-xs"
                  autoFocus
                />
                <Input
                  value={editHint}
                  onChange={(e) => setEditHint(e.target.value)}
                  placeholder="Hint / description (optional)"
                  className="h-8 text-xs"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                  <button onClick={() => saveEdit(q.id)} className="flex items-center gap-1 text-xs text-emerald-600 font-semibold hover:text-emerald-800">
                    <Check className="w-3 h-3" /> Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                {/* Reorder arrows */}
                <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
                  <button
                    onClick={() => onMoveUp(q.id)}
                    disabled={questions.indexOf(q) === 0}
                    className="p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-500 disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onMoveDown(q.id)}
                    disabled={questions.indexOf(q) === questions.length - 1}
                    className="p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-500 disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    <span className="text-slate-400 font-normal mr-1">{idx + 1}.</span>{q.label}
                  </p>
                  {q.hint && <p className="text-xs text-slate-400 truncate">{q.hint}</p>}
                  {/* Show resolved field value */}
                  {(() => {
                    // For user-defined questions, show their answer
                    if (q.isUserDefined) {
                      const val = answers?.[q.id];
                      return val
                        ? <p className="text-xs mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md inline-block font-medium">{val}</p>
                        : <p className="text-[10px] text-slate-300 mt-0.5 italic">No answer yet</p>;
                    }
                    // For mapped fields, find the resolved value
                    const fieldDef = FIELD_GROUPS_FLAT.find((f) => f.key === q.id || q.id.startsWith("custom_"));
                    const mappedField = resolvedValues?.find((m) => {
                      if (q.isCustomField) return m.fieldKey === "custom_text" && m.page === q.page;
                      return m.fieldKey === q.id || (fieldDef && m.fieldKey === fieldDef.key);
                    });
                    const val = mappedField?.value || answers?.[q.id];
                    return val
                      ? <p className="text-xs mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md inline-block font-medium truncate max-w-full">{val}</p>
                      : <p className="text-[10px] text-slate-300 mt-0.5">{q.type === "radio" ? "Choice" : "Text"}{q.isUserDefined ? " · custom" : " · auto-detected"}</p>;
                  })()}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Plot button — only for fields that exist in the template mappings */}
                  {template && onMappingsChange && (
                    <button
                      onClick={() => setPlottingQuestion(q)}
                      title="Plot field on PDF"
                      className="p-1 rounded hover:bg-violet-50 text-slate-300 hover:text-violet-500"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => startEdit(q)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete(q.id)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new question form */}
      {adding && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 space-y-2">
          <p className="text-xs font-semibold text-violet-700">New Question</p>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Question label (e.g. Specific property notes)"
            className="h-8 text-xs bg-white"
            autoFocus
          />
          <Input
            value={newHint}
            onChange={(e) => setNewHint(e.target.value)}
            placeholder="Hint / description (optional)"
            className="h-8 text-xs bg-white"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setAdding(false); setNewLabel(""); setNewHint(""); }} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
            <button onClick={handleAdd} disabled={!newLabel.trim()} className="flex items-center gap-1 text-xs text-violet-700 font-semibold hover:text-violet-900 disabled:opacity-40">
              <Check className="w-3 h-3" /> Add
            </button>
          </div>
        </div>
      )}

      {/* Plot dialog — full PDF mapper for a single question's field */}
      {plottingQuestion && template && (
        <Dialog open onOpenChange={() => setPlottingQuestion(null)}>
          <DialogContent className="max-w-[95vw] w-full h-[92vh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 py-3 border-b border-slate-100 shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base">
                <MapPin className="w-4 h-4 text-violet-500" />
                Plot field: <span className="text-violet-700">{plottingQuestion.label}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <TemplatePDFMapper
                pdfUrl={template.pdf_url}
                mappings={template.field_mappings || []}
                onMappingsChange={onMappingsChange}
              />
            </div>
            <div className="px-6 py-3 border-t border-slate-100 flex justify-end shrink-0">
              <Button onClick={() => setPlottingQuestion(null)} className="bg-violet-600 hover:bg-violet-700 text-white">
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────
// Detect if the template has BBA fields
function hasBBAFields(mappings) {
  return (mappings || []).some((m) => m.fieldKey && m.fieldKey.startsWith("bba_"));
}

export default function FillTemplateModal({ template, transactions, contacts = [], agentProfiles, onClose, onExported }) {
  const [step, setStep] = useState(1); // 1 = questionnaire, 2 = review & export
  const [selectedTx, setSelectedTx] = useState("");
  const [selectedContact, setSelectedContact] = useState("");
  const [exporting, setExporting] = useState(false);
  const [answers, setAnswers] = useState({});
  const [editingQuestions, setEditingQuestions] = useState(false);
  const [localMappings, setLocalMappings] = useState(template.field_mappings || []);
  const tx = transactions.find((t) => t.id === selectedTx);
  const contact = contacts.find((c) => c.id === selectedContact);
  const agent = agentProfiles?.[0];

  const [signatures, setSignatures] = useState({}); // { signature_buyer: "data:image/png;base64,...", signature_agent: "..." }
  const [capturingSignature, setCapturingSignature] = useState(null); // "signature_buyer" | "signature_agent" | null
  const [logic, setLogic] = useState({}); // per-question logic/notes keyed by question id
  const [extraQuestions, setExtraQuestions] = useState(template.custom_questions || []); // user-added questions — persisted
  const [removedIds, setRemovedIds] = useState(new Set(template.removed_question_ids || [])); // auto-detected ones removed
  const [questionOverrides, setQuestionOverrides] = useState(template.question_overrides || {}); // label/hint overrides
  const [questionOrder, setQuestionOrder] = useState(template.question_order?.length ? template.question_order : null); // persisted order

  const persistQuestions = (updates = {}) => {
    base44.entities.PDFTemplate.update(template.id, {
      custom_questions: updates.extraQuestions ?? extraQuestions,
      removed_question_ids: [...(updates.removedIds ?? removedIds)],
      question_overrides: updates.questionOverrides ?? questionOverrides,
      question_order: (updates.questionOrder ?? questionOrder) || [],
    });
  };

  const autoDetected = detectQuestions(localMappings);

  // Build merged list (before ordering)
  const mergedQuestions = [
    ...autoDetected
      .filter((q) => !removedIds.has(q.id))
      .map((q) => ({ ...q, ...questionOverrides[q.id] })),
    ...extraQuestions,
  ];

  // Apply custom order if set
  const questions = questionOrder
    ? [
        ...questionOrder
          .map((id) => mergedQuestions.find((q) => q.id === id))
          .filter(Boolean),
        // append any new ones not yet in the order array
        ...mergedQuestions.filter((q) => !questionOrder.includes(q.id)),
      ]
    : mergedQuestions;

  // Collect all checkmark pins from mappings (includes checkmark_TIMESTAMP variants)
  const checkmarkPins = localMappings.filter((m) => m.fieldKey === "checkmark" || m.fieldKey.startsWith("checkmark_"));
  // Collect signature + initials pins
  const signaturePins = localMappings.filter((m) =>
    m.fieldKey === "signature_buyer" || m.fieldKey === "signature_agent" ||
    m.fieldKey === "initials_buyer" || m.fieldKey === "initials_agent"
  );

  const overrides = buildOverrides(answers, questions);
  // Apply checkmark toggle overrides — key is unique per pin using page+x+y
  checkmarkPins.forEach((m) => {
    const ckKey = `ck_toggle_${m.page}_${Math.round(m.x * 10000)}_${Math.round(m.y * 10000)}`;
    const isOn = answers[ckKey] !== false; // default ON
    overrides[`checkmark_${m.page}_${Math.round(m.x * 10000)}_${Math.round(m.y * 10000)}`] = isOn ? "✓" : "";
  });

  // Custom field values from questionnaire
  const customFieldOverrides = {};
  questions.filter((q) => q.isCustomField).forEach((q) => {
    if (answers[q.id]) {
      customFieldOverrides[`${q.fieldKey}_${q.page}_${q.x}`] = answers[q.id];
    }
  });

  const resolvedValues = localMappings.map((m) => {
    let value;
    if (m.fieldKey === "custom_text") {
      value = customFieldOverrides[`${m.fieldKey}_${m.page}_${m.x}`] || "";
    } else if (m.fieldKey === "checkmark" || m.fieldKey.startsWith("checkmark_")) {
      const ckKey = `ck_toggle_${m.page}_${Math.round(m.x * 10000)}_${Math.round(m.y * 10000)}`;
      value = answers[ckKey] !== false ? "✓" : "";
    } else {
      value = resolveFieldValue(m.fieldKey, tx, agent, overrides, contact);
    }
    return { ...m, value };
  });

  const handleAnswer = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddQuestion = (q) => {
    const updated = [...extraQuestions, q];
    setExtraQuestions(updated);
    persistQuestions({ extraQuestions: updated });
  };

  const handleUpdateQuestion = (id, changes) => {
    if (extraQuestions.find((q) => q.id === id)) {
      const updated = extraQuestions.map((q) => q.id === id ? { ...q, ...changes } : q);
      setExtraQuestions(updated);
      persistQuestions({ extraQuestions: updated });
    } else {
      const updated = { ...questionOverrides, [id]: { ...(questionOverrides[id] || {}), ...changes } };
      setQuestionOverrides(updated);
      persistQuestions({ questionOverrides: updated });
    }
  };

  const handleMoveQuestion = (id, direction) => {
    const ids = questions.map((q) => q.id);
    const idx = ids.indexOf(id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= ids.length) return;
    const reordered = [...ids];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    setQuestionOrder(reordered);
    persistQuestions({ questionOrder: reordered });
  };

  const handleDeleteQuestion = (id) => {
    if (extraQuestions.find((q) => q.id === id)) {
      const updated = extraQuestions.filter((q) => q.id !== id);
      setExtraQuestions(updated);
      persistQuestions({ extraQuestions: updated });
    } else {
      const updated = new Set([...removedIds, id]);
      setRemovedIds(updated);
      persistQuestions({ removedIds: updated });
    }
    setAnswers((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const handleExport = async () => {
    setExporting(true);
    toast("Generating filled PDF…");

    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const pdfBytes = await fetch(template.pdf_url).then((r) => r.arrayBuffer());
    const pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
    const numPgs = pdfDoc.numPages;

    const { jsPDF } = await import("jspdf");

    for (let p = 1; p <= numPgs; p++) {
      const page = await pdfDoc.getPage(p);
      const naturalVp = page.getViewport({ scale: 1.0 });
      const PAGE_W = naturalVp.width;
      const PAGE_H = naturalVp.height;

      if (p === 1) {
        var outDoc = new jsPDF({ unit: "pt", format: [PAGE_W, PAGE_H] });
      } else {
        outDoc.addPage([PAGE_W, PAGE_H]);
      }

      const renderScale = 2.0;
      const vp = page.getViewport({ scale: renderScale });
      const offscreen = document.createElement("canvas");
      offscreen.width = vp.width;
      offscreen.height = vp.height;
      await page.render({ canvasContext: offscreen.getContext("2d"), viewport: vp }).promise;
      outDoc.addImage(offscreen.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, PAGE_W, PAGE_H);

      resolvedValues.filter((rv) => rv.page === p && rv.value).forEach((m) => {
        // Skip signature/initials pins — rendered separately below as images
        if (m.fieldKey === "signature_buyer" || m.fieldKey === "signature_agent" ||
            m.fieldKey === "initials_buyer" || m.fieldKey === "initials_agent") return;
        outDoc.setFontSize(12);
        outDoc.setFont("helvetica", "normal");
        outDoc.setTextColor(0, 0, 0);
        outDoc.text(m.value, m.x * PAGE_W, m.y * PAGE_H);
      });

      // Render signatures and initials as images
      localMappings.filter((m) => m.page === p && (
        m.fieldKey === "signature_buyer" || m.fieldKey === "signature_agent" ||
        m.fieldKey === "initials_buyer" || m.fieldKey === "initials_agent"
      )).forEach((m) => {
        const sigDataUrl = signatures[m.fieldKey];
        if (!sigDataUrl) return;
        const isInitials = m.fieldKey.startsWith("initials_");
        const imgW = isInitials ? PAGE_W * 0.09 : PAGE_W * 0.22;
        const imgH = imgW * 0.25;
        outDoc.addImage(sigDataUrl, "PNG", m.x * PAGE_W, m.y * PAGE_H - imgH, imgW, imgH);
      });
    }

    const filename = `${template.name.replace(/\s+/g, "_")}${tx ? `_${tx.property_address.replace(/\s+/g, "_")}` : ""}_filled.pdf`;
    outDoc.save(filename);

    await base44.entities.PDFTemplateExport.create({
      template_id: template.id,
      template_name: template.name,
      transaction_id: tx?.id || null,
      transaction_address: tx?.property_address || null,
    });

    // Save a BuyerBrokerAgreement record if the template has BBA fields and a contact is selected
    if (hasBBAFields(localMappings) && (contact || tx)) {
      const compType = answers["compensation_type"] || "percent";
      const commPct = answers["compensation_percent_value"]
        ? parseFloat(answers["compensation_percent_value"])
        : tx?.commission_percent || null;
      const commAmt = answers["compensation_flat_value"]
        ? parseFloat(answers["compensation_flat_value"].replace(/[^0-9.]/g, ""))
        : tx?.commission_amount || null;

      // Build custom_answers from user-defined question answers
      const customAnswers = {};
      questions.filter((q) => q.isUserDefined).forEach((q) => {
        if (answers[q.id]) customAnswers[q.label] = answers[q.id];
      });

      const today = new Date().toISOString().split("T")[0];
      const sixMonths = new Date();
      sixMonths.setMonth(sixMonths.getMonth() + 6);

      await base44.entities.BuyerBrokerAgreement.create({
        contact_id: contact?.id || null,
        contact_name: contact?.full_name || tx?.buyer_name || "",
        buyer_email: contact?.email || tx?.buyer_email || "",
        buyer_phone: contact?.phone || tx?.buyer_phone || "",
        buyer_initials: (contact?.full_name || tx?.buyer_name || "")
          .split(/\s+/).map((n) => n[0]).join("").toUpperCase(),
        transaction_id: tx?.id || null,
        property_address: tx?.property_address || "",
        city: tx?.city || "",
        county: tx?.county || "",
        zip: tx?.zip || "",
        purchase_price: tx?.purchase_price || null,
        compensation_type: compType,
        commission_percent: compType === "percent" ? commPct : null,
        commission_amount: compType === "flat" ? commAmt : null,
        lender_name: tx?.lender_name || "",
        financing_type: answers["financing_type"] || "conventional",
        property_type: answers["property_type"] || "single_family",
        agreement_start_date: today,
        agreement_end_date: sixMonths.toISOString().split("T")[0],
        closing_date: tx?.closing_date || null,
        agent_name: agent?.agent_name || "",
        agent_license: agent?.license_number || "",
        agent_phone: agent?.phone || "",
        agent_email: agent?.email || "",
        brokerage_name: agent?.brokerage_name || "",
        brokerage_license: agent?.brokerage_license_number || "",
        brokerage_address: agent?.brokerage_address || "",
        brokerage_city: agent?.brokerage_city || "",
        brokerage_state: agent?.brokerage_state || "OK",
        brokerage_zip: agent?.brokerage_zip || "",
        office_phone: agent?.office_phone || "",
        broker_supervisor: agent?.broker_supervisor || "",
        status: "draft",
        notes: template.name,
        custom_answers: Object.keys(customAnswers).length ? customAnswers : null,
      });
      toast.success("BBA record saved for contact!");
    }

    onExported?.();

    toast.success("Filled PDF downloaded!");
    setExporting(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-500" />
            Fill &amp; Export — {template.name}
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            {[
              { n: 1, label: "Questions" },
              { n: 2, label: "Review & Export" },
            ].map(({ n, label }, i) => (
              <React.Fragment key={n}>
                <button
                  onClick={() => n < step && setStep(n)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                    step === n
                      ? "bg-violet-100 text-violet-700"
                      : n < step
                      ? "text-emerald-600 cursor-pointer hover:bg-emerald-50"
                      : "text-slate-300 cursor-default"
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === n ? "bg-violet-500 text-white" : n < step ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                  }`}>{n < step ? "✓" : n}</span>
                  {label}
                </button>
                {i < 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
              </React.Fragment>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Contact selector */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">
              Contact / Buyer
              {hasBBAFields(localMappings) && <span className="text-violet-500 font-semibold ml-1">· BBA record will be saved</span>}
            </Label>
            <Select value={selectedContact} onValueChange={setSelectedContact}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a contact…" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}{c.email ? ` — ${c.email}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 1: Questionnaire */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Toggle between filling and editing */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 flex-1 mr-3">
                  {editingQuestions
                    ? "Add, rename, or remove questions for this export."
                    : "Answer these questions to customize the export."}
                </p>
                <button
                  onClick={() => setEditingQuestions((v) => !v)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-colors shrink-0 ${
                    editingQuestions
                      ? "border-violet-400 bg-violet-50 text-violet-700"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {editingQuestions ? "Done editing" : "Edit questions"}
                </button>
              </div>

              {/* Checkmark toggles */}
              {checkmarkPins.length > 0 && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Checkmark Fields</p>
                  {checkmarkPins.map((m, i) => {
                    const ckKey = `ck_toggle_${m.page}_${Math.round(m.x * 10000)}_${Math.round(m.y * 10000)}`;
                    const isOn = answers[ckKey] !== false;
                    return (
                      <div key={ckKey} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-600">
                          {i === 0 ? "Comp flat fee/ %" : i === 1 ? "Retainer fee?" : i === 2 ? "Other (trans fee)?" : (m.label || "Checkmark")} — {checkmarkPins.length > 1 ? `p${m.page} #${i + 1}` : `page ${m.page}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAnswer(ckKey, !isOn)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isOn ? "bg-emerald-500" : "bg-slate-300"}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isOn ? "translate-x-4" : "translate-x-1"}`} />
                        </button>
                        <span className={`text-sm font-bold w-4 ${isOn ? "text-emerald-600" : "text-slate-300"}`}>{isOn ? "✓" : "—"}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Signature fields */}
              {signaturePins.length > 0 && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-3">
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <PenLine className="w-3.5 h-3.5 text-violet-500" /> Signatures &amp; Initials
                  </p>
                  {signaturePins.map((m) => {
                    const hasSig = !!signatures[m.fieldKey];
                    return (
                      <div key={m.fieldKey} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-600 font-medium">{m.label}</span>
                          {hasSig && (
                            <button
                              onClick={() => setSignatures((prev) => { const n = { ...prev }; delete n[m.fieldKey]; return n; })}
                              className="text-[10px] text-red-400 hover:text-red-600"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        {hasSig ? (
                          <div className="relative">
                            <img src={signatures[m.fieldKey]} alt="signature" className="h-14 border border-emerald-200 rounded-lg bg-white object-contain px-2" />
                            <button
                              onClick={() => setCapturingSignature(m.fieldKey)}
                              className="absolute top-1 right-1 text-[10px] text-slate-400 hover:text-violet-600 bg-white border border-slate-200 rounded px-1.5 py-0.5"
                            >
                              Re-sign
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setCapturingSignature(m.fieldKey)}
                            className="w-full flex items-center justify-center gap-2 h-14 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400 hover:border-violet-400 hover:text-violet-600 transition-colors bg-white"
                          >
                            <PenLine className="w-4 h-4" /> Click to sign
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {/* Inline signature pad */}
                  {capturingSignature && (
                    <div className="bg-white rounded-xl border border-violet-200 p-3">
                      <p className="text-xs font-semibold text-violet-700 mb-2">
                        {signaturePins.find((m) => m.fieldKey === capturingSignature)?.label}
                      </p>
                      <SignaturePad
                        signerName={
                          capturingSignature === "signature_buyer" ? (contact?.full_name || "") :
                          capturingSignature === "initials_buyer" ? (contact?.full_name ? contact.full_name.split(/\s+/).map(n => n[0]).join("").toUpperCase() : "") :
                          ""
                        }
                        onSave={(dataUrl) => {
                          setSignatures((prev) => ({ ...prev, [capturingSignature]: dataUrl }));
                          setCapturingSignature(null);
                        }}
                        onCancel={() => setCapturingSignature(null)}
                      />
                    </div>
                  )}
                </div>
              )}

              {editingQuestions ? (
                <QuestionEditor
                  questions={questions}
                  onAdd={handleAddQuestion}
                  onUpdate={handleUpdateQuestion}
                  onDelete={handleDeleteQuestion}
                  onMoveUp={(id) => handleMoveQuestion(id, -1)}
                  onMoveDown={(id) => handleMoveQuestion(id, 1)}
                  answers={answers}
                  resolvedValues={resolvedValues}
                  template={{ ...template, field_mappings: localMappings }}
                  onMappingsChange={setLocalMappings}
                />
              ) : questions.length > 0 ? (
                <QuestionnaireStep
                  questions={questions}
                  answers={answers}
                  onChange={handleAnswer}
                  logic={logic}
                  onLogicChange={(id, val) => setLogic((prev) => ({ ...prev, [id]: val }))}
                />
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">No questions yet — click "Edit questions" to add some.</p>
              )}
            </div>
          )}

          {/* Step 2: Field preview */}
          {step === 2 && localMappings.length > 0 && (
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{localMappings.length} Fields Preview</p>
              </div>
              <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                {resolvedValues.map((m, i) => (
                  <div key={`${m.fieldKey}_${i}`} className="flex items-center gap-3 px-3 py-2">
                    <span className="text-xs text-slate-500 w-40 shrink-0 truncate">{m.label}</span>
                    <span className={`text-xs flex-1 truncate ${m.value ? "text-slate-800 font-medium" : "text-slate-300 italic"}`}>
                      {m.value || "—"}
                    </span>
                    {m.value
                      ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      : <X className="w-3.5 h-3.5 text-slate-200 shrink-0" />
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 pt-3 border-t border-slate-100 shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <div className="flex gap-2">
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            )}
            {step === 1 && (
              <Button onClick={() => setStep(2)} className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
                Review <ChevronRight className="w-4 h-4" />
              </Button>
            )}
            {step === 2 && (
              <Button onClick={handleExport} disabled={exporting} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                {exporting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                {exporting ? "Generating…" : "Export Filled PDF"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}