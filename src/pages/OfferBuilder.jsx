import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, X, CheckCircle2, ChevronRight, Search, ArrowLeft, Send } from "lucide-react";
import PropertyProfile from "@/components/offerbuilder/PropertyProfile";
import BuildOfferModal from "@/components/offerbuilder/BuildOfferModal";

const ALL_FORMS = [
  { id: "compensatory-compensation", name: "Compensatory Compensation Agreement",  code: "OREC Comp Comp",  category: "Purchase & Sale", default: true },
  { id: "uniform-contract",     name: "Uniform Contract of Sale of Real Estate", code: "OREC Form 100", category: "Purchase & Sale", default: true },
  { id: "contract-addendum",    name: "Contract Addendum",                        code: "OREC Form 101", category: "Purchase & Sale", default: false },
  { id: "counter-offer",        name: "Counter Offer",                             code: "OREC Form 102", category: "Purchase & Sale", default: false },
  { id: "notice-to-perform",    name: "Notice to Perform",                         code: "OREC Form 103", category: "Purchase & Sale", default: false },
  { id: "agency-disclosure",    name: "Disclosure of Agency Relationships",        code: "OREC Form 302", category: "Disclosures",    default: true },
  { id: "property-disclosure",  name: "Residential Property Condition Disclosure", code: "OREC Form 300", category: "Disclosures",    default: true },
  { id: "lead-paint",           name: "Lead-Based Paint Disclosure",               code: "Federal Form",  category: "Disclosures",    default: false },
  { id: "wire-fraud-disclosure", name: "Wire Fraud Disclosure and Advisory",        code: "OK Wire Fraud", category: "Disclosures",    default: true },
  { id: "deed-fraud-disclosure", name: "Deed Fraud Disclosure and Advisory",        code: "OK Deed Fraud", category: "Disclosures",    default: true },
  { id: "fha-va-addendum",      name: "FHA/VA Financing Addendum",                 code: "OREC Form 400", category: "Addenda",        default: false },
  { id: "inspection-addendum",  name: "Inspection Addendum",                       code: "OREC Form 401", category: "Addenda",        default: true },
  { id: "home-warranty",        name: "Home Warranty Addendum",                    code: "OREC Form 402", category: "Addenda",        default: false },
  { id: "seller-financing",     name: "Seller Financing Addendum",                 code: "OREC Form 403", category: "Addenda",        default: false },
  { id: "dpa-addendum",         name: "Down Payment Assistance Addendum",          code: "DPA Addendum",  category: "Addenda",        default: false },
  { id: "sec184-addendum",      name: "Section 184 Native American Loan Addendum", code: "Sec 184 Form",  category: "Addenda",        default: false },
  { id: "rd-addendum",          name: "Rural Development (USDA) Addendum",         code: "RD Addendum",   category: "Addenda",        default: false },
  { id: "exclusive-listing",    name: "Exclusive Right-to-Sell Listing Agreement", code: "OREC Form 200", category: "Listings",       default: false },
  { id: "closing-instructions", name: "Closing Instructions",                      code: "OREC Form 500", category: "Closings",       default: false },
  { id: "amendment-closing",    name: "Amendment to Closing Date",                 code: "OREC Form 501", category: "Closings",       default: false },
  { id: "mutual-release",       name: "Mutual Release of Contract",                code: "OREC Form 502", category: "Closings",       default: false },
];

const DEFAULT_FORM_IDS = ALL_FORMS.filter((f) => f.default).map((f) => f.id);

const LOAN_TYPES = [
  {
    value: "conventional",
    label: "Conventional Loan",
    badge: "Conventional",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    forms: [],
  },
  {
    value: "conventional-dpa",
    label: "Conventional Loan with DPA",
    badge: "Conv + DPA",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    forms: ["dpa-addendum"],
  },
  {
    value: "fha",
    label: "FHA Loan",
    badge: "FHA",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    forms: ["fha-va-addendum"],
  },
  {
    value: "fha-dpa",
    label: "FHA Loan with DPA",
    badge: "FHA + DPA",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    forms: ["fha-va-addendum", "dpa-addendum"],
  },
  {
    value: "va",
    label: "VA Loan",
    badge: "VA",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    forms: ["fha-va-addendum"],
  },
  {
    value: "va-dpa",
    label: "VA Loan with DPA",
    badge: "VA + DPA",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    forms: ["fha-va-addendum", "dpa-addendum"],
  },
  {
    value: "sec184",
    label: "Section 184 Loan (Native American)",
    badge: "Sec 184",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    forms: ["sec184-addendum"],
  },
  {
    value: "rd",
    label: "RD Loan (Rural Development)",
    badge: "RD / USDA",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    forms: ["rd-addendum"],
  },
];

export default function OfferBuilder() {
  const [selectedTx, setSelectedTx] = useState("");
  const [offerForms, setOfferForms] = useState(DEFAULT_FORM_IDS);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [loanType, setLoanType] = useState("");
  const [buildOfferOpen, setBuildOfferOpen] = useState(false);

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-updated_date", 200),
  });

  const selectedForms = offerForms.map((id) => ALL_FORMS.find((f) => f.id === id)).filter(Boolean);

  const availableToAdd = ALL_FORMS.filter(
    (f) => !offerForms.includes(f.id) &&
      (!search || f.name.toLowerCase().includes(search.toLowerCase()) || f.code.toLowerCase().includes(search.toLowerCase()))
  );

  const addForm = (id) => {
    setOfferForms((prev) => [...prev, id]);
  };

  const removeForm = (id) => {
    setOfferForms((prev) => prev.filter((f) => f !== id));
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    setOfferForms((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (idx) => {
    if (idx === offerForms.length - 1) return;
    setOfferForms((prev) => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const resetToDefaults = () => { setOfferForms(DEFAULT_FORM_IDS); setLoanType(""); };

  const handleLoanType = (value) => {
    setLoanType(value);
    const lt = LOAN_TYPES.find((l) => l.value === value);
    if (!lt) return;
    // Remove all loan-specific addenda first, then add the ones for the selected type
    const loanFormIds = LOAN_TYPES.flatMap((l) => l.forms);
    setOfferForms((prev) => {
      const withoutLoanForms = prev.filter((id) => !loanFormIds.includes(id));
      const toAdd = lt.forms.filter((id) => !withoutLoanForms.includes(id));
      return [...withoutLoanForms, ...toAdd];
    });
  };

  const categories = [...new Set(availableToAdd.map((f) => f.category))];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Offer Builder</h1>
          <p className="text-sm text-slate-500 mt-1">Assemble your offer package from OREC forms</p>
        </div>
      </div>

      {/* Property Profile */}
      <PropertyProfile />

      {/* Transaction selector */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <Label className="text-xs font-medium text-slate-500 mb-2 block">Link to Transaction (optional)</Label>
        <Select value={selectedTx} onValueChange={setSelectedTx}>
          <SelectTrigger className="h-10 max-w-sm">
            <SelectValue placeholder="Select a transaction..." />
          </SelectTrigger>
          <SelectContent>
            {transactions.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.property_address}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loan Type */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
        <Label className="text-xs font-medium text-slate-500 block">Loan Type</Label>
        <div className="flex flex-wrap gap-2">
          {LOAN_TYPES.map((lt) => (
            <button
              key={lt.value}
              onClick={() => handleLoanType(loanType === lt.value ? "" : lt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                loanType === lt.value
                  ? lt.color + " ring-2 ring-offset-1 ring-current"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
            >
              {lt.label}
            </button>
          ))}
        </div>
        {loanType && (() => {
          const lt = LOAN_TYPES.find((l) => l.value === loanType);
          return lt?.forms.length > 0 ? (
            <p className="text-[11px] text-slate-400">
              Auto-added: {lt.forms.map((id) => ALL_FORMS.find((f) => f.id === id)?.name).filter(Boolean).join(", ")}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400">No additional addenda required for this loan type.</p>
          );
        })()}
      </div>

      {/* Offer package */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: "#1e3a5f" }}>
          <h2 className="text-sm font-semibold text-blue-100 uppercase tracking-wider flex items-center gap-2">
            Offer Package — {selectedForms.length} Form{selectedForms.length !== 1 ? "s" : ""}
            {loanType && (() => {
              const lt = LOAN_TYPES.find((l) => l.value === loanType);
              return lt ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-yellow-300 font-semibold">{lt.badge}</span> : null;
            })()}
          </h2>
          <div className="flex items-center gap-3">
            {loanType === "conventional" && (
              <button
                onClick={() => setBuildOfferOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFF00] text-slate-900 text-xs font-bold hover:bg-yellow-300 transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" /> Build Offer
              </button>
            )}
            <button onClick={resetToDefaults} className="text-[11px] text-blue-300 hover:text-yellow-300 transition-colors">
              Reset to defaults
            </button>
          </div>
        </div>

        {selectedForms.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">No forms added yet.</div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {selectedForms.map((form, idx) => (
              <li key={form.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <span className="text-xs font-bold text-slate-300 w-5 text-center">{idx + 1}</span>
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 leading-snug">{form.name}</p>
                  <p className="text-[11px] text-slate-400">{form.code} · {form.category}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => moveUp(idx)} disabled={idx === 0}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-20 transition-colors text-xs">↑</button>
                  <button onClick={() => moveDown(idx)} disabled={idx === selectedForms.length - 1}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-20 transition-colors text-xs">↓</button>
                  <Link
                    to={`/FormDetail?formId=${form.id}${selectedTx ? `&txId=${selectedTx}` : ""}`}
                    className="p-1.5 rounded hover:bg-[#FFFF00]/20 text-slate-400 hover:text-slate-700 transition-colors"
                    title="Open form"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <button onClick={() => removeForm(form.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="px-5 py-3 border-t border-slate-50">
          <Button
            onClick={() => setShowPicker((p) => !p)}
            variant="outline"
            className="gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Add Form
          </Button>
        </div>
      </div>

      {/* Form picker */}
      {showPicker && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <Input
              placeholder="Search forms to add..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 h-8 p-0 text-sm"
              autoFocus
            />
          </div>
          {availableToAdd.length === 0 ? (
            <p className="p-6 text-sm text-slate-400 text-center">All forms already added.</p>
          ) : (
            categories.map((cat) => {
              const catForms = availableToAdd.filter((f) => f.category === cat);
              if (!catForms.length) return null;
              return (
                <div key={cat}>
                  <p className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">{cat}</p>
                  {catForms.map((form) => (
                    <button
                      key={form.id}
                      onClick={() => { addForm(form.id); }}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#FFFF00]/10 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{form.name}</p>
                        <p className="text-[11px] text-slate-400">{form.code}</p>
                      </div>
                      <Plus className="w-4 h-4 text-slate-300" />
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}

      <BuildOfferModal
        open={buildOfferOpen}
        onClose={() => setBuildOfferOpen(false)}
        forms={selectedForms}
        loanType={loanType ? LOAN_TYPES.find((l) => l.value === loanType)?.badge : ""}
        transactionAddress={transactions.find((t) => t.id === selectedTx)?.property_address || ""}
      />

      {/* Action footer */}
      {selectedForms.length > 0 && (
        <div className="flex flex-wrap gap-3 pb-4">
          {selectedForms.map((form) => (
            <Link
              key={form.id}
              to={`/FormDetail?formId=${form.id}${selectedTx ? `&txId=${selectedTx}` : ""}`}
              className="inline-flex items-center gap-2 bg-[#FFFF00] text-slate-900 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#e6e600] transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Open {form.code || form.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}