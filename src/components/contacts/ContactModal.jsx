import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";


const BLANK = {
  full_name: "", phone: "", email: "", role: "buyer",
  address: "", city: "", state: "OK", zip: "",
  notes: "", transaction_ids: [],
  contact2_name: "", contact2_relation: "", contact2_phone: "", contact2_email: "",
  contact2_address: "", contact2_city: "", contact2_state: "OK", contact2_zip: "",
  agent_of_choice_license: "", agent_of_choice_name: "",
  buyer_agent_name: "", buyer_agent_brokerage: "",
  broker_address: "", broker_city: "", broker_state: "OK", broker_zip: "",
  broker_license_number: "", broker_supervisor: "", broker_supervisor_email: "", broker_supervisor_website: "",
  custom_fields: {},
};

const EMPTY_PLACEHOLDER = "*****";

// Format phone as (xxx) xxx-xxxx
function formatPhone(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isValidEmail(email) {
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">{label && <Label className="text-xs font-medium text-slate-500">{label}</Label>}{children}</div>
  );
}

export default function ContactModal({ open, onClose, contact, onSave, transactions = [] }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [email2Error, setEmail2Error] = useState("");
  const savedIdRef = useRef(contact?.id || null);

  const { data: agentProfiles = [] } = useQuery({
    queryKey: ["agent-profiles-all"],
    queryFn: () => base44.entities.AgentProfile.list("agent_name", 100),
    enabled: open,
  });

  const { data: brokerages = [] } = useQuery({
    queryKey: ["brokerages-all"],
    queryFn: () => base44.entities.Brokerage.list("brokerage_name", 200),
    enabled: open,
  });

  // Auto-populate agent/broker fields for new contacts from logged-in user's AgentProfile
  useEffect(() => {
    savedIdRef.current = contact?.id || null;
    if (contact) {
      setForm({ ...BLANK, ...contact, transaction_ids: contact.transaction_ids || [] });
    } else if (agentProfiles.length > 0) {
      // Find the agent profile matching the logged-in user
      base44.auth.me().then((user) => {
        const myProfile =
          agentProfiles.find((a) => a.email?.toLowerCase() === user?.email?.toLowerCase()) ||
          agentProfiles.find((a) => a.license_number === user?.license_number) ||
          agentProfiles[0];

        if (myProfile) {
          // Try to find matching brokerage record for extra details
          const brokerage = brokerages.find(
            (b) => b.license_id === myProfile.brokerage_license_number
          );

          setForm({
            ...BLANK,
            buyer_agent_name: myProfile.agent_name || "",
            buyer_agent_brokerage: myProfile.brokerage_name || "",
            broker_address: brokerage?.address || myProfile.brokerage_address || "",
            broker_city: brokerage?.city || myProfile.brokerage_city || "",
            broker_state: brokerage?.state || myProfile.brokerage_state || "OK",
            broker_zip: brokerage?.zip || myProfile.brokerage_zip || "",
            broker_license_number: myProfile.brokerage_license_number || "",
            broker_supervisor: myProfile.broker_supervisor || brokerage?.broker_name || "",
            broker_supervisor_email: myProfile.broker_supervisor_email || brokerage?.broker_email || "",
            broker_supervisor_website: myProfile.broker_supervisor_website || "",
            agent_of_choice_license: myProfile.license_number || "",
            agent_of_choice_name: myProfile.agent_name || "",
          });
        } else {
          setForm(BLANK);
        }
      }).catch(() => setForm(BLANK));
    } else {
      setForm(BLANK);
    }
    setEmailError("");
    setEmail2Error("");
  }, [contact, open, agentProfiles, brokerages]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));



  const toggleTx = (id) => {
    setForm((f) => ({
      ...f,
      transaction_ids: f.transaction_ids.includes(id)
        ? f.transaction_ids.filter((t) => t !== id)
        : [...f.transaction_ids, id],
    }));
  };

  const handleAgentSelect = (licenseId) => {
    const agent = agentProfiles.find((a) => a.license_number === licenseId);
    set("agent_of_choice_license", licenseId);
    set("agent_of_choice_name", agent?.agent_name || "");
  };

  const handleSave = async () => {
    if (!form.full_name) return;
    if (!isValidEmail(form.email)) { setEmailError("Please enter a valid email address."); return; }
    if (!isValidEmail(form.contact2_email)) { setEmail2Error("Please enter a valid email address."); return; }
    setSaving(true);
    await onSave({ ...form, id: savedIdRef.current });
    setSaving(false);
    onClose();
  };

  const isNew = !contact;
  const ph = isNew ? EMPTY_PLACEHOLDER : undefined;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit Client" : "New Client"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">

          {/* ── Primary Contact ── */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact #1</p>
            <Field label="Full Name *">
              <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder={ph || "Jane Smith"} className="h-10" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => set("phone", formatPhone(e.target.value))}
                  placeholder={ph || "(405) 555-1234"}
                  className="h-10"
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => { set("email", e.target.value); setEmailError(""); }}
                  onBlur={() => setEmailError(isValidEmail(form.email) ? "" : "Invalid email format")}
                  placeholder={ph || "jane@email.com"}
                  className={`h-10 ${emailError ? "border-red-400 focus-visible:ring-red-300" : ""}`}
                />
                {emailError && <p className="text-xs text-red-500 mt-0.5">{emailError}</p>}
              </Field>
            </div>
            <Field label="Address">
              <Input value={form.address || ""} onChange={(e) => set("address", e.target.value)} placeholder={ph || "123 Main St"} className="h-10" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="City">
                <Input value={form.city || ""} onChange={(e) => set("city", e.target.value)} placeholder={ph || "Oklahoma City"} className="h-10" />
              </Field>
              <Field label="State">
                <Input value={form.state || "OK"} onChange={(e) => set("state", e.target.value)} placeholder={ph || "OK"} className="h-10" />
              </Field>
              <Field label="ZIP">
                <Input value={form.zip || ""} onChange={(e) => set("zip", e.target.value)} placeholder={ph || "73101"} className="h-10" />
              </Field>
            </div>
            <Field label="Role">
              <Select value={form.role} onValueChange={(v) => set("role", v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="lender">Lender</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* ── Contact #2 ── */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact #2 (Co-Buyer / Spouse / Other)</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name">
                <Input value={form.contact2_name} onChange={(e) => set("contact2_name", e.target.value)} placeholder={ph || "John Smith"} className="h-10" />
              </Field>
              <Field label="Relation">
                <Input value={form.contact2_relation} onChange={(e) => set("contact2_relation", e.target.value)} placeholder={ph || "Spouse, Co-Buyer…"} className="h-10" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone">
                <Input
                  value={form.contact2_phone}
                  onChange={(e) => set("contact2_phone", formatPhone(e.target.value))}
                  placeholder={ph || "(405) 555-5678"}
                  className="h-10"
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.contact2_email}
                  onChange={(e) => { set("contact2_email", e.target.value); setEmail2Error(""); }}
                  onBlur={() => setEmail2Error(isValidEmail(form.contact2_email) ? "" : "Invalid email format")}
                  placeholder={ph || "john@email.com"}
                  className={`h-10 ${email2Error ? "border-red-400 focus-visible:ring-red-300" : ""}`}
                />
                {email2Error && <p className="text-xs text-red-500 mt-0.5">{email2Error}</p>}
              </Field>
            </div>
            <Field label="Address">
              <Input value={form.contact2_address} onChange={(e) => set("contact2_address", e.target.value)} placeholder={ph || "123 Main St"} className="h-10" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="City">
                <Input value={form.contact2_city} onChange={(e) => set("contact2_city", e.target.value)} placeholder={ph || "Oklahoma City"} className="h-10" />
              </Field>
              <Field label="State">
                <Input value={form.contact2_state} onChange={(e) => set("contact2_state", e.target.value)} placeholder={ph || "OK"} className="h-10" />
              </Field>
              <Field label="ZIP">
                <Input value={form.contact2_zip} onChange={(e) => set("contact2_zip", e.target.value)} placeholder={ph || "73101"} className="h-10" />
              </Field>
            </div>
          </div>

          {/* ── Agent of Choice ── */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Agent of Choice</p>
            <Field label="Select Agent (by License ID)">
              <Select value={form.agent_of_choice_license} onValueChange={handleAgentSelect}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Choose an agent…" />
                </SelectTrigger>
                <SelectContent>
                  {agentProfiles.map((a) => (
                    <SelectItem key={a.id} value={a.license_number || a.id}>
                      {a.agent_name}{a.license_number ? ` — ${a.license_number}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {form.agent_of_choice_name && (
              <p className="text-xs text-violet-600 font-medium">Associated: {form.agent_of_choice_name} (License: {form.agent_of_choice_license})</p>
            )}
          </div>

          {/* ── Buyer Agent Info ── */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Buyer Agent Info</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Buyer Agent Name">
                <Input value={form.buyer_agent_name} onChange={(e) => set("buyer_agent_name", e.target.value)} placeholder={ph || "Agent full name"} className="h-10" />
              </Field>
              <Field label="Buyer Agent Brokerage">
                <Input value={form.buyer_agent_brokerage} onChange={(e) => set("buyer_agent_brokerage", e.target.value)} placeholder={ph || "Brokerage name"} className="h-10" />
              </Field>
            </div>
            <Field label="Broker Address">
              <Input value={form.broker_address} onChange={(e) => set("broker_address", e.target.value)} placeholder={ph || "123 Main St"} className="h-10" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="City">
                <Input value={form.broker_city} onChange={(e) => set("broker_city", e.target.value)} placeholder={ph || "Oklahoma City"} className="h-10" />
              </Field>
              <Field label="State">
                <Input value={form.broker_state} onChange={(e) => set("broker_state", e.target.value)} placeholder={ph || "OK"} className="h-10" />
              </Field>
              <Field label="ZIP">
                <Input value={form.broker_zip} onChange={(e) => set("broker_zip", e.target.value)} placeholder={ph || "73101"} className="h-10" />
              </Field>
            </div>
            <Field label="Broker License #">
              <Input value={form.broker_license_number} onChange={(e) => set("broker_license_number", e.target.value)} placeholder={ph || "License number"} className="h-10" />
            </Field>
          </div>

          {/* ── Broker Supervisor ── */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Broker Supervisor</p>
            <Field label="Supervisor Name">
              <Input value={form.broker_supervisor} onChange={(e) => set("broker_supervisor", e.target.value)} placeholder={ph || "Full name"} className="h-10" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Supervisor Email">
                <Input type="email" value={form.broker_supervisor_email} onChange={(e) => set("broker_supervisor_email", e.target.value)} placeholder={ph || "supervisor@brokerage.com"} className="h-10" />
              </Field>
              <Field label="Supervisor Website">
                <Input type="url" value={form.broker_supervisor_website} onChange={(e) => set("broker_supervisor_website", e.target.value)} placeholder={ph || "https://..."} className="h-10" />
              </Field>
            </div>
          </div>

          {/* ── Custom Fields ── */}
          <div className="border-t border-slate-100 pt-4 space-y-3 relative">
            <button
              type="button"
              onClick={() => {
                const key = `field_${Date.now()}`;
                set("custom_fields", { ...(form.custom_fields || {}), [key]: { label: "", value: "" } });
              }}
              className="absolute top-4 right-0 flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Add Field
            </button>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Custom Fields</p>
            {Object.keys(form.custom_fields || {}).length === 0 && (
              <p className="text-xs text-slate-400 italic">No custom fields yet — click "Add Field" to create one.</p>
            )}
            <div className="space-y-2">
              {Object.entries(form.custom_fields || {}).map(([key, field]) => (
                <div key={key} className="flex items-center gap-2">
                  <Input
                    value={field.label}
                    onChange={(e) => set("custom_fields", { ...form.custom_fields, [key]: { ...field, label: e.target.value } })}
                    placeholder="Field name"
                    className="h-9 w-36 shrink-0 text-sm"
                  />
                  <Input
                    value={field.value}
                    onChange={(e) => set("custom_fields", { ...form.custom_fields, [key]: { ...field, value: e.target.value } })}
                    placeholder="Value"
                    className="h-9 flex-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...form.custom_fields };
                      delete updated[key];
                      set("custom_fields", updated);
                    }}
                    className="p-1.5 text-slate-300 hover:text-red-400 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Notes ── */}
          <div className="border-t border-slate-100 pt-4">
            <Field label="Notes">
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Additional notes..." className="h-20" />
            </Field>
          </div>

          {/* ── Linked Transactions ── */}
          {transactions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Linked Transactions</Label>
              <div className="max-h-40 overflow-y-auto space-y-2 rounded-xl border border-slate-100 p-3">
                {transactions.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 hover:text-slate-900">
                    <Checkbox checked={form.transaction_ids.includes(t.id)} onCheckedChange={() => toggleTx(t.id)} />
                    <span>{t.property_address}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!form.full_name || saving}
              className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600]"
            >
              {saving ? "Saving..." : "Save Client"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}