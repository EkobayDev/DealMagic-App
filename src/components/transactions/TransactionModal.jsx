import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Save, Cloud, CheckCircle, Store, Phone, Mail, Globe, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import MergeDocumentsTab from "./MergeDocumentsTab";

const STEPS = ["Property", "Parties", "Financials", "Dates & Agent", "Vendors", "Merge"];

const CATEGORY_COLORS = {
  appraisers: "bg-purple-100 text-purple-700",
  inspectors: "bg-blue-100 text-blue-700",
  lawn: "bg-green-100 text-green-700",
  roofers: "bg-orange-100 text-orange-700",
  termite: "bg-red-100 text-red-700",
  title: "bg-teal-100 text-teal-700",
};

const Field = ({ label, field, type = "text", placeholder, form, set }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-slate-500">{label}</Label>
    <Input
      type={type}
      value={form[field] || ""}
      onChange={(e) => set(field, e.target.value)}
      placeholder={placeholder}
      className="h-10"
    />
  </div>
);

const SelectField = ({ label, field, options, form, set }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-slate-500">{label}</Label>
    <Select value={form[field]} onValueChange={(v) => set(field, v)}>
      <SelectTrigger className="h-10">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const BLANK = {
  property_address: "", city: "", state: "OK", zip: "", county: "", mls_number: "", listing_url: "",
  status: "active", transaction_type: "purchase", property_type: "single_family",
  buyer_name: "", buyer_email: "", buyer_phone: "",
  seller_name: "", seller_email: "", seller_phone: "",
  buyer_agent_name: "", buyer_agent_brokerage: "",
  seller_agent_name: "", seller_agent_brokerage: "",
  title_company: "", lender_name: "",
  purchase_price: "", earnest_money: "", commission_percent: "", listing_price: "",
  contract_date: "", closing_date: "", inspection_deadline: "",
  appraisal_deadline: "", financing_deadline: "", title_deadline: "", possession_date: "",
  representing: "buyer", notes: "",
};

const AUTO_SAVE_DELAY = 2000;

export default function TransactionModal({ open, onClose, transaction, onSave, onDelete, initialStep }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false); // null | "saving" | "saved"
  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => base44.entities.Vendor.list("business_name", 500),
  });

  const autoSaveTimer = useRef(null);
  const isInitialLoad = useRef(true);
  const savedIdRef = useRef(null);

  useEffect(() => {
    if (transaction) {
      setForm({ ...BLANK, ...transaction, purchase_price: transaction.purchase_price || "", earnest_money: transaction.earnest_money || "", commission_percent: transaction.commission_percent || "", listing_price: transaction.listing_price || "" });
      savedIdRef.current = transaction.id || null;
    } else {
      setForm(BLANK);
      savedIdRef.current = null;
    }
    setStep(initialStep ?? 0);
    isInitialLoad.current = true;
    setAutoSaveStatus(null);
  }, [transaction, open]);

  const buildData = (f) => ({
    ...f,
    purchase_price: f.purchase_price ? Number(f.purchase_price) : undefined,
    earnest_money: f.earnest_money ? Number(f.earnest_money) : undefined,
    commission_percent: f.commission_percent ? Number(f.commission_percent) : undefined,
    listing_price: f.listing_price ? Number(f.listing_price) : undefined,
  });

  const set = (key, val) => setForm((f) => {
    const updated = { ...f, [key]: val };
    // Auto-generate Zillow URL when address fields change and URL is empty
    if (["property_address", "city", "state", "zip"].includes(key)) {
      const addr = [updated.property_address, updated.city, updated.state, updated.zip].filter(Boolean).join(" ");
      if (addr) {
        const slug = addr.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-");
        updated.listing_url = `https://www.zillow.com/homes/${slug}_rb/`;
      }
    }
    return updated;
  });

  // Auto-save on form changes (debounced)
  useEffect(() => {
    if (isInitialLoad.current) { isInitialLoad.current = false; return; }
    if (!form.property_address) return; // require at least an address

    setAutoSaveStatus("saving");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(async () => {
      const data = buildData(form);
      const result = await onSave(data, savedIdRef.current);
      if (result?.id) savedIdRef.current = result.id;
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus(null), 3000);
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(autoSaveTimer.current);
  }, [form]);

  const flushAndSave = async () => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    if (form.property_address) {
      const data = buildData(form);
      const result = await onSave(data, savedIdRef.current);
      if (result?.id) savedIdRef.current = result.id;
    }
  };

  const isEditingExisting = !!transaction;

  const handleSave = async () => {
    setSaving(true);
    const data = buildData(form);
    const result = await onSave(data, savedIdRef.current);
    if (result?.id) savedIdRef.current = result.id;
    setSaving(false);
    if (!isEditingExisting) {
      toast("Would you like to schedule pictures?", {
        duration: 8000,
        action: {
          label: "Schedule",
          onClick: () => window.location.href = "/CalendlyScheduling",
        },
      });
    }
  };

  const f = (label, field, type, placeholder) => <Field key={field} label={label} field={field} type={type} placeholder={placeholder} form={form} set={set} />;
  const sf = (label, field, options) => <SelectField key={field} label={label} field={field} options={options} form={form} set={set} />;

  const handleClose = async () => {
    await flushAndSave();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl overflow-y-auto relative" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", maxHeight: "80vh" }}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{transaction || savedIdRef.current ? "Edit Transaction" : "New Transaction"}</DialogTitle>
            {autoSaveStatus && (
              <span className={`flex items-center gap-1.5 text-xs ${autoSaveStatus === "saved" ? "text-green-600" : "text-slate-400"}`}>
                {autoSaveStatus === "saved" ? <CheckCircle className="w-3.5 h-3.5" /> : <Cloud className="w-3.5 h-3.5 animate-pulse" />}
                {autoSaveStatus === "saving" ? "Auto-saving..." : "Auto-saved"}
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex gap-1 mb-4">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={`flex-1 text-center py-2 text-xs font-medium rounded-lg transition-colors ${
                i === step ? "bg-[#FFFF00] text-slate-900" : i < step ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Step 0: Property */}
        {step === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              {f("Property Address", "property_address", "text", "123 Main St")}
            </div>
            {f("City", "city", "text", "Oklahoma City")}
            {f("State", "state", "text", "OK")}
            {f("ZIP", "zip", "text", "73101")}
            {f("County", "county", "text", "Oklahoma")}
            {f("MLS #", "mls_number", "text", "MLS123456")}
            {sf("Status", "status", [
              { value: "active", label: "Active" },
              { value: "coming_soon", label: "Coming Soon" },
              { value: "under_contract", label: "Under Contract" },
              { value: "pending", label: "Pending" },
              { value: "closed", label: "Closed" },
              { value: "cancelled", label: "Cancelled" },
              { value: "expired", label: "Expired" },
            ])}
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Zillow Listing URL</Label>
              <div className="flex gap-2">
                <Input
                  value={form.listing_url || ""}
                  onChange={(e) => set("listing_url", e.target.value)}
                  placeholder="https://www.zillow.com/homes/..."
                  className="h-10"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 h-10 px-3 text-xs"
                  onClick={() => {
                    const addr = [form.property_address, form.city, form.state, form.zip].filter(Boolean).join(" ");
                    const slug = addr.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-");
                    set("listing_url", `https://www.zillow.com/homes/${slug}_rb/`);
                  }}
                >
                  Auto-fill
                </Button>
                {form.listing_url && (
                  <a href={form.listing_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center px-3 h-10 rounded-md border border-slate-200 text-xs text-blue-600 hover:bg-slate-50 shrink-0">
                    View
                  </a>
                )}
              </div>
            </div>
            {sf("Property Type", "property_type", [
              { value: "single_family", label: "Single Family" },
              { value: "condo", label: "Condo" },
              { value: "townhouse", label: "Townhouse" },
              { value: "multi_family", label: "Multi Family" },
              { value: "land", label: "Land" },
              { value: "commercial", label: "Commercial" },
            ])}
            {sf("Transaction Type", "transaction_type", [
              { value: "purchase", label: "Purchase" },
              { value: "listing", label: "Listing" },
              { value: "dual", label: "Dual" },
            ])}
          </div>
        )}

        {/* Step 1: Parties */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Buyer</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {f("Name", "buyer_name")}
                {f("Email", "buyer_email", "email")}
                {f("Phone", "buyer_phone", "tel")}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Seller</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {f("Name", "seller_name")}
                {f("Email", "seller_email", "email")}
                {f("Phone", "seller_phone", "tel")}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Other Agents</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {f("Buyer's Agent", "buyer_agent_name")}
                {f("Buyer's Brokerage", "buyer_agent_brokerage")}
                {f("Seller's Agent", "seller_agent_name")}
                {f("Seller's Brokerage", "seller_agent_brokerage")}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Financials */}
        {step === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {f("Purchase Price", "purchase_price", "number", "250000")}
            {f("Listing Price", "listing_price", "number", "255000")}
            {f("Earnest Money", "earnest_money", "number", "5000")}
            {f("Commission %", "commission_percent", "number", "3")}
            {f("Date Distributed", "commission_distributed_date", "date")}
            {f("Title Company", "title_company")}
            {f("Lender", "lender_name")}
          </div>
        )}

        {/* Step 3: Dates & Agent */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {f("Contract Date", "contract_date", "date")}
              {f("Closing Date", "closing_date", "date")}
              {f("Inspection Deadline", "inspection_deadline", "date")}
              {f("Appraisal Deadline", "appraisal_deadline", "date")}
              {f("Financing Deadline", "financing_deadline", "date")}
              {f("Title Deadline", "title_deadline", "date")}
              {f("Possession Date", "possession_date", "date")}
              {sf("Representing", "representing", [
                { value: "buyer", label: "Buyer" },
                { value: "seller", label: "Seller" },
                { value: "both", label: "Both" },
              ])}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Notes</Label>
              <Textarea
                value={form.notes || ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Additional notes..."
                className="h-24"
              />
            </div>
          </div>
        )}

        {/* Step 4: Vendors */}
        {step === 4 && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">Your vendor directory — click to call or email directly.</p>
            {vendors.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No vendors yet. Add them in the Vendors section.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {vendors.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white transition-colors">
                    {v.logo_url ? (
                      <img src={v.logo_url} alt={v.business_name} className="h-9 w-9 object-contain rounded-lg border border-slate-200 shrink-0" />
                    ) : (
                      <div className="h-9 w-9 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-bold shrink-0">
                        {v.business_name?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800 truncate">{v.business_name}</p>
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${CATEGORY_COLORS[v.category] || "bg-slate-100 text-slate-500"}`}>
                          {v.category}
                        </span>
                      </div>
                      {v.contact_name && <p className="text-xs text-slate-500">{v.contact_name}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {v.cell_phone && (
                        <a href={`tel:${v.cell_phone}`} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors" title={v.cell_phone}>
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {v.email && (
                        <a href={`mailto:${v.email}`} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors" title={v.email}>
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {v.website && (
                        <a href={v.website} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors" title={v.website}>
                          <Globe className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Merge Documents */}
        {step === 5 && (
          <MergeDocumentsTab transaction={{ ...form, id: savedIdRef.current }} />
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            {savedIdRef.current && onDelete && (
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                className="gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            )}
          </div>
          {step < 5 && step !== 3 ? (
            <Button onClick={() => setStep(step + 1)} className="gap-1 bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600]">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : step === 3 ? (
            <Button onClick={handleSave} disabled={saving} className="gap-1 bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600]">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Transaction"}
            </Button>
          ) : null}
        </div>

        {/* Branded delete confirmation overlay */}
        {confirmDelete && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg">
            <div className="bg-white border border-red-100 rounded-2xl shadow-xl p-6 mx-6 text-center space-y-4 max-w-sm w-full">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">Delete Transaction?</p>
                <p className="text-sm text-slate-500 mt-1">
                  <span className="font-medium text-slate-700">{form.property_address || "This transaction"}</span> will be permanently removed. This cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => { onDelete(savedIdRef.current); setConfirmDelete(false); onClose(); }}
                >
                  Yes, Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}