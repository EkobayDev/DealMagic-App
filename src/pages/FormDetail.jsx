import React, { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Printer, Save, CheckCircle, Cloud } from "lucide-react";
import { Link } from "react-router-dom";

import SignatureManager from "@/components/signatures/SignatureManager";
import AIAutofillPanel from "@/components/forms/AIAutofillPanel";
import { Sparkles } from "lucide-react";

const FORM_DEFS = {
  "uniform-contract": {
    name: "Uniform Contract of Sale of Real Estate",
    code: "OREC Form 100",
    fields: [
      { key: "buyer_name", label: "Buyer(s)" },
      { key: "seller_name", label: "Seller(s)" },
      { key: "property_address", label: "Property Address" },
      { key: "city", label: "City" },
      { key: "county", label: "County" },
      { key: "zip", label: "ZIP Code" },
      { key: "purchase_price", label: "Purchase Price", type: "currency" },
      { key: "earnest_money", label: "Earnest Money Deposit", type: "currency" },
      { key: "closing_date", label: "Closing Date", type: "date" },
      { key: "title_company", label: "Title/Closing Company" },
      { key: "lender_name", label: "Lender" },
      { key: "inspection_deadline", label: "Inspection Deadline", type: "date" },
    ],
  },
  "counter-offer": {
    name: "Counter Offer",
    code: "OREC Form 102",
    fields: [
      { key: "buyer_name", label: "Buyer(s)" },
      { key: "seller_name", label: "Seller(s)" },
      { key: "property_address", label: "Property Address" },
      { key: "purchase_price", label: "Counter Offer Price", type: "currency" },
      { key: "closing_date", label: "Proposed Closing Date", type: "date" },
    ],
  },
  "compensatory-compensation": {
    name: "Compensatory Compensation Agreement",
    code: "OREC Compensatory Compensation",
    fields: [
      { key: "buyer_name", label: "Buyer(s)" },
      { key: "buyer_agent_name", label: "Buyer's Agent Name" },
      { key: "buyer_agent_brokerage", label: "Buyer's Agent Brokerage" },
      { key: "property_address", label: "Property Address" },
      { key: "city", label: "City" },
      { key: "county", label: "County" },
      { key: "zip", label: "ZIP Code" },
      { key: "purchase_price", label: "Purchase Price", type: "currency" },
      { key: "buyer_agent_comp_pct", label: "Buyer's Agent Compensation (%)" },
      { key: "buyer_agent_comp_flat", label: "Buyer's Agent Compensation (Flat $)" },
      { key: "seller_name", label: "Seller(s)" },
      { key: "seller_agent_name", label: "Seller's Agent Name" },
      { key: "seller_agent_brokerage", label: "Seller's Agent Brokerage" },
      { key: "contract_date", label: "Agreement Date", type: "date" },
      { key: "closing_date", label: "Closing Date", type: "date" },
    ],
  },
  "deed-fraud-disclosure": {
    name: "Deed Fraud Disclosure and Advisory",
    code: "OK Deed Fraud Disclosure",
    notice: `DEED FRAUD WARNING: Deed fraud (also called title fraud or home title theft) occurs when a criminal forges your signature on a deed to transfer ownership of your property without your knowledge. Homeowners — especially those who own their property free and clear — are prime targets. Protect yourself by monitoring your property records regularly through your county assessor's office and considering a title monitoring service. If you suspect deed fraud, contact local law enforcement and a real estate attorney immediately.`,
    fields: [
      { key: "buyer_name", label: "Buyer(s)" },
      { key: "seller_name", label: "Seller(s)" },
      { key: "property_address", label: "Property Address" },
      { key: "city", label: "City" },
      { key: "county", label: "County" },
      { key: "zip", label: "ZIP Code" },
      { key: "closing_date", label: "Anticipated Closing Date", type: "date" },
      { key: "title_company", label: "Title/Closing Company" },
      { key: "buyer_agent_name", label: "Buyer's Agent Name" },
      { key: "seller_agent_name", label: "Seller's Agent Name" },
    ],
  },
  "buyer-broker-agreement": {
    name: "Buyer Broker Agreement",
    code: "OREC Buyer Broker Agreement",
    fields: [
      { key: "buyer_name", label: "Buyer(s)" },
      { key: "buyer_email", label: "Buyer Email" },
      { key: "buyer_phone", label: "Buyer Phone" },
      { key: "buyer_agent_name", label: "Agent Name" },
      { key: "buyer_agent_brokerage", label: "Brokerage Name" },
      { key: "agreement_start_date", label: "Agreement Start Date", type: "date" },
      { key: "agreement_end_date", label: "Agreement End Date", type: "date" },
      { key: "property_address", label: "Property Address (if known)" },
      { key: "city", label: "City" },
      { key: "county", label: "County" },
      { key: "zip", label: "ZIP Code" },
      { key: "commission_percent", label: "Buyer's Agent Compensation (%)" },
      { key: "earnest_money", label: "Estimated Price Range / Budget", type: "currency" },
      { key: "lender_name", label: "Lender (if known)" },
    ],
  },
  "wire-fraud-disclosure": {
    name: "Wire Fraud Disclosure and Advisory",
    code: "OK Wire Fraud Disclosure",
    notice: `WIRE FRAUD WARNING: Real estate wire fraud is on the rise. Criminals are hacking email accounts and sending fraudulent wiring instructions. Before wiring ANY funds, always call your title company or closing attorney using a phone number obtained independently — NOT from an email. Verify wiring instructions verbally. Your lender and title company will NEVER ask you to change wiring instructions via email.`,
    fields: [
      { key: "buyer_name", label: "Buyer(s)" },
      { key: "seller_name", label: "Seller(s)" },
      { key: "property_address", label: "Property Address" },
      { key: "city", label: "City" },
      { key: "county", label: "County" },
      { key: "zip", label: "ZIP Code" },
      { key: "closing_date", label: "Anticipated Closing Date", type: "date" },
      { key: "title_company", label: "Title/Closing Company" },
      { key: "title_company_phone", label: "Title Company Phone (Verified)" },
      { key: "lender_name", label: "Lender Name" },
      { key: "lender_phone", label: "Lender Phone (Verified)" },
      { key: "buyer_agent_name", label: "Buyer's Agent Name" },
      { key: "buyer_agent_brokerage", label: "Buyer's Agent Brokerage" },
    ],
  },
};

const DEFAULT_FIELDS = [
  { key: "buyer_name", label: "Buyer(s)" },
  { key: "seller_name", label: "Seller(s)" },
  { key: "property_address", label: "Property Address" },
  { key: "city", label: "City" },
  { key: "county", label: "County" },
  { key: "purchase_price", label: "Purchase Price", type: "currency" },
  { key: "closing_date", label: "Closing Date", type: "date" },
];

const AUTO_SAVE_DELAY = 3000; // 3 seconds after last change
const PROFILE_KEY = "dealmagic_property_profile";

export default function FormDetail() {
  const params = new URLSearchParams(window.location.search);
  const formId = params.get("formId") || "uniform-contract";
  const formDef = FORM_DEFS[formId] || { name: formId.replace(/-/g, " "), code: "", fields: DEFAULT_FIELDS };

  const [selectedContact, setSelectedContact] = useState("");

  // Seed field values from interview autofill or saved Property Profile
  const getInitialValues = () => {
    const fromInterview = params.get("from") === "interview";
    if (fromInterview) {
      const stored = localStorage.getItem("dealmagic_interview_autofill");
      if (stored) {
        localStorage.removeItem("dealmagic_interview_autofill");
        return JSON.parse(stored);
      }
    }
    const stored = localStorage.getItem(PROFILE_KEY);
    if (!stored) return {};
    const profile = JSON.parse(stored);
    const vals = {};
    formDef.fields.forEach((f) => {
      if (profile[f.key]) vals[f.key] = profile[f.key];
    });
    return vals;
  };

  const [fieldValues, setFieldValues] = useState(getInitialValues);
  const [saved, setSaved] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null); // null | "saving" | "saved"
  const [existingDocId, setExistingDocId] = useState(null);
  const autoSaveTimerRef = useRef(null);
  const isFirstRender = useRef(true);
  const printRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("full_name", 500),
  });

  const { data: agentProfiles = [] } = useQuery({
    queryKey: ["agent-profile"],
    queryFn: () => base44.entities.AgentProfile.list("-created_date", 1),
    enabled: formId === "buyer-broker-agreement",
  });

  // Auto-seed buyer broker agreement fields from agent profile
  useEffect(() => {
    if (formId !== "buyer-broker-agreement") return;
    if (agentProfiles.length === 0) return;
    // Only seed if not coming from interview (which already has values)
    const fromInterview = new URLSearchParams(window.location.search).get("from") === "interview";
    if (fromInterview) return;
    const p = agentProfiles[0];
    setFieldValues((prev) => ({
      buyer_agent_name: p.agent_name || "",
      buyer_agent_brokerage: p.brokerage_name || "",
      commission_percent: p.default_commission_percent ? String(p.default_commission_percent) : "",
      ...prev, // don't overwrite anything already set (e.g. from localStorage)
    }));
  }, [agentProfiles, formId]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (existingDocId) {
        return base44.entities.TransactionDocument.update(existingDocId, { data: data.data });
      }
      return base44.entities.TransactionDocument.create(data);
    },
    onSuccess: (result) => {
      if (!existingDocId && result?.id) setExistingDocId(result.id);
      queryClient.invalidateQueries({ queryKey: ["tx-docs", selectedContact] });
    },
  });

  const manualSaveMutation = useMutation({
    mutationFn: (data) => {
      if (existingDocId) {
        return base44.entities.TransactionDocument.update(existingDocId, { data: data.data });
      }
      return base44.entities.TransactionDocument.create(data);
    },
    onSuccess: (result) => {
      if (!existingDocId && result?.id) setExistingDocId(result.id);
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["tx-docs", selectedContact] });
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const buildDocPayload = useCallback(() => {
    const contact = contacts.find((c) => c.id === selectedContact);
    return {
      transaction_id: selectedContact || "none",
      transaction_address: contact ? `Contact: ${contact.full_name}` : "",
      doc_type: "form",
      name: formDef.name,
      form_id: formId,
      data: fieldValues,
    };
  }, [selectedContact, fieldValues, contacts, formDef.name, formId]);

  // Auto-save: debounce on fieldValues changes
  useEffect(() => {
    if (!selectedContact) return;
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (Object.keys(fieldValues).length === 0) return;

    setAutoSaveStatus("saving");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      await saveMutation.mutateAsync(buildDocPayload());
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus(null), 3000);
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(autoSaveTimerRef.current);
  }, [fieldValues]);

  const handleSave = () => {
    manualSaveMutation.mutate(buildDocPayload());
  };

  const autoFillFromContact = (contactId) => {
    setSelectedContact(contactId);
    isFirstRender.current = true;
    setExistingDocId(null);
    if (!contactId || contactId === "none") { setFieldValues({}); return; }
    const c = contacts.find((ct) => ct.id === contactId);
    if (!c) return;
    // Map contact fields to form fields
    const contactMap = {
      buyer_name: c.full_name,
      buyer_phone: c.phone,
      buyer_email: c.email,
      buyer_agent_name: c.buyer_agent_name,
      buyer_agent_brokerage: c.buyer_agent_brokerage,
      seller_name: c.role === "seller" ? c.full_name : undefined,
    };
    const vals = {};
    formDef.fields.forEach((f) => {
      const val = contactMap[f.key];
      if (val) vals[f.key] = String(val);
    });
    setFieldValues((prev) => ({ ...prev, ...vals }));
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/Forms" className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{formDef.name}</h1>
          <p className="text-sm text-slate-500">{formDef.code}</p>
        </div>
      </div>

      {/* Auto-fill selector */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Auto-fill from Contact</Label>
            <Select value={selectedContact} onValueChange={autoFillFromContact}>
              <SelectTrigger>
                <SelectValue placeholder="Select a contact..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}{c.email ? ` — ${c.email}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            {/* Auto-save indicator */}
            {autoSaveStatus && (
              <span className={`flex items-center gap-1.5 text-xs ${autoSaveStatus === "saved" ? "text-green-600" : "text-slate-400"}`}>
                <Cloud className="w-3.5 h-3.5" />
                {autoSaveStatus === "saving" ? "Auto-saving..." : "Auto-saved"}
              </span>
            )}
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" /> Print
            </Button>
            {selectedContact && selectedContact !== "none" && (
              <Button
                onClick={handleSave}
                disabled={manualSaveMutation.isPending || saved}
                className="gap-2 bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600]"
              >
                {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save</>}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Interview shortcut for buyer broker agreement */}
      {formId === "buyer-broker-agreement" && params.get("from") !== "interview" && (
        <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-2xl px-5 py-3.5 print:hidden">
          <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
          <p className="text-sm text-violet-800 flex-1">Use the guided interview to fill this form step-by-step.</p>
          <a href="/BuyerBrokerInterview" className="px-4 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors">Start Interview</a>
        </div>
      )}

      {/* AI Autofill */}
      <AIAutofillPanel
        fields={formDef.fields}
        onAutofill={(extracted) => setFieldValues((prev) => ({ ...prev, ...extracted }))}
      />

      {/* Signature Manager */}
      <SignatureManager
        formDocId={existingDocId}
        formName={formDef.name}
        transactionAddress={contacts.find((c) => c.id === selectedContact)?.full_name || ""}
        fieldValues={fieldValues}
      />

      {/* Form Fields */}
      <div ref={printRef} className="bg-white rounded-2xl border border-slate-100 p-6 print:border-0 print:shadow-none">
        <div className="text-center mb-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{formDef.name}</h2>
          <p className="text-sm text-slate-500">{formDef.code} — State of Oklahoma</p>
        </div>
        {formDef.notice && (
          <div className="mb-5 p-4 rounded-xl border border-amber-200 bg-amber-50">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">⚠️ Important Notice</p>
            <p className="text-sm text-amber-900 leading-relaxed">{formDef.notice}</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {formDef.fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">{f.label}</Label>
              <Input
                value={fieldValues[f.key] || ""}
                onChange={(e) => setFieldValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.label}
                className="h-10"
              />
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs text-slate-400 mb-8">Buyer Signature</p>
            <div className="border-b border-slate-300" />
            <p className="text-xs text-slate-400 mt-1">Date: _______________</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-8">Seller Signature</p>
            <div className="border-b border-slate-300" />
            <p className="text-xs text-slate-400 mt-1">Date: _______________</p>
          </div>
        </div>
      </div>
    </div>
  );
}