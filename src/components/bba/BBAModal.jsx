import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Handshake, Plus, Trash2, UserCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const BLANK = {
  contact_name: "",
  buyer_email: "",
  buyer_phone: "",
  buyer_initials: "",
  property_address: "",
  city: "",
  county: "",
  zip: "",
  purchase_price: "",
  compensation_type: "percent",
  commission_percent: "",
  commission_amount: "",
  lender_name: "",
  financing_type: "conventional",
  property_type: "single_family",
  agreement_start_date: "",
  agreement_end_date: "",
  closing_date: "",
  agent_name: "",
  agent_license: "",
  agent_phone: "",
  agent_email: "",
  brokerage_name: "",
  brokerage_license: "",
  brokerage_address: "",
  brokerage_city: "",
  brokerage_state: "OK",
  brokerage_zip: "",
  office_phone: "",
  broker_supervisor: "",
  status: "draft",
  notes: "",
  custom_answers: {},
};

function Field({ label, children, required }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-500">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="col-span-full pt-2">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">{title}</p>
    </div>
  );
}

export default function BBAModal({ open, onClose, bba, onSaved }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [customKeys, setCustomKeys] = useState([]); // [{id, label}]
  const [selectedContactId, setSelectedContactId] = useState("");

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-for-bba"],
    queryFn: () => base44.entities.Contact.list("full_name", 500),
    enabled: open,
  });

  const { data: agentProfiles = [] } = useQuery({
    queryKey: ["agent-profiles-bba"],
    queryFn: () => base44.entities.AgentProfile.list("agent_name", 100),
    enabled: open,
  });

  const handleImportContact = (contactId) => {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;
    setSelectedContactId(contactId);
    const initials = contact.full_name
      ? contact.full_name.split(/\s+/).map((n) => n[0]).join("").toUpperCase()
      : "";

    // Try to find a matching agent profile by broker license number
    const matchedAgent = contact.broker_license_number
      ? agentProfiles.find(
          (a) =>
            a.brokerage_license_number &&
            a.brokerage_license_number.trim().toLowerCase() ===
              contact.broker_license_number.trim().toLowerCase()
        )
      : null;

    setForm((f) => ({
      ...f,
      contact_id: contact.id,
      contact_name: contact.full_name || f.contact_name,
      buyer_email: contact.email || f.buyer_email,
      buyer_phone: contact.phone || f.buyer_phone,
      buyer_initials: initials || f.buyer_initials,
      // If a matching agent profile was found, prefer its data
      agent_name: matchedAgent?.agent_name || contact.buyer_agent_name || f.agent_name,
      agent_license: matchedAgent?.license_number || f.agent_license,
      agent_phone: matchedAgent?.phone || f.agent_phone,
      agent_email: matchedAgent?.email || f.agent_email,
      brokerage_name: matchedAgent?.brokerage_name || contact.buyer_agent_brokerage || f.brokerage_name,
      brokerage_license: matchedAgent?.brokerage_license_number || contact.broker_license_number || f.brokerage_license,
      brokerage_address: matchedAgent?.brokerage_address || contact.broker_address || f.brokerage_address,
      brokerage_city: matchedAgent?.brokerage_city || contact.broker_city || f.brokerage_city,
      brokerage_state: matchedAgent?.brokerage_state || contact.broker_state || f.brokerage_state,
      brokerage_zip: matchedAgent?.brokerage_zip || contact.broker_zip || f.brokerage_zip,
      office_phone: matchedAgent?.office_phone || f.office_phone,
      broker_supervisor: matchedAgent?.broker_supervisor || contact.broker_supervisor || f.broker_supervisor,
    }));

    if (matchedAgent) {
      toast.success(`Imported contact + matched agent profile: ${matchedAgent.agent_name}`);
    } else {
      toast.success(`Imported from contact: ${contact.full_name}`);
    }
  };

  useEffect(() => {
    if (bba) {
      setForm({ ...BLANK, ...bba, custom_answers: bba.custom_answers || {} });
      // Build custom key list from existing custom_answers
      const keys = Object.keys(bba.custom_answers || {}).map((label) => ({
        id: `ck_${label}`,
        label,
      }));
      setCustomKeys(keys);
    } else {
      // Seed today + 6 months for new records
      const today = new Date().toISOString().split("T")[0];
      const sixmo = new Date();
      sixmo.setMonth(sixmo.getMonth() + 6);
      setForm({
        ...BLANK,
        agreement_start_date: today,
        agreement_end_date: sixmo.toISOString().split("T")[0],
      });
      setCustomKeys([]);
      setSelectedContactId("");
    }
  }, [bba, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setCustomAnswer = (label, value) => {
    setForm((f) => ({
      ...f,
      custom_answers: { ...f.custom_answers, [label]: value },
    }));
  };

  const addCustomField = () => {
    const id = `ck_${Date.now()}`;
    const label = `Custom Field ${customKeys.length + 1}`;
    setCustomKeys((prev) => [...prev, { id, label }]);
    setForm((f) => ({
      ...f,
      custom_answers: { ...f.custom_answers, [label]: "" },
    }));
  };

  const renameCustomField = (oldLabel, newLabel) => {
    if (!newLabel.trim() || newLabel === oldLabel) return;
    setCustomKeys((prev) =>
      prev.map((k) => (k.label === oldLabel ? { ...k, label: newLabel } : k))
    );
    setForm((f) => {
      const answers = { ...f.custom_answers };
      const val = answers[oldLabel] || "";
      delete answers[oldLabel];
      answers[newLabel] = val;
      return { ...f, custom_answers: answers };
    });
  };

  const removeCustomField = (label) => {
    setCustomKeys((prev) => prev.filter((k) => k.label !== label));
    setForm((f) => {
      const answers = { ...f.custom_answers };
      delete answers[label];
      return { ...f, custom_answers: answers };
    });
  };

  const handleSave = async () => {
    if (!form.contact_name.trim()) {
      toast.error("Buyer name is required.");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      purchase_price: form.purchase_price !== "" ? Number(form.purchase_price) : null,
      commission_percent: form.commission_percent !== "" ? Number(form.commission_percent) : null,
      commission_amount: form.commission_amount !== "" ? Number(form.commission_amount) : null,
    };
    if (bba?.id) {
      await base44.entities.BuyerBrokerAgreement.update(bba.id, payload);
      toast.success("BBA record updated.");
    } else {
      await base44.entities.BuyerBrokerAgreement.create(payload);
      toast.success("BBA record created.");
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="w-5 h-5 text-violet-500" />
            {bba?.id ? "Edit BBA Record" : "New Buyer Broker Agreement"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* ── Import from Contact ── */}
            <div className="col-span-full">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-50 border border-violet-100">
                <UserCheck className="w-4 h-4 text-violet-500 shrink-0" />
                <p className="text-xs font-medium text-violet-700 shrink-0">Import from Contact:</p>
                <Select value={selectedContactId} onValueChange={handleImportContact}>
                  <SelectTrigger className="h-8 flex-1 bg-white text-xs">
                    <SelectValue placeholder="Choose a contact to pre-fill…" />
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
            </div>

            {/* ── Buyer Info ── */}
            <SectionHeader title="Buyer Information" />
            <Field label="Buyer Full Name" required>
              <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="Buyer Initials">
              <Input value={form.buyer_initials} onChange={(e) => set("buyer_initials", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="Buyer Email">
              <Input type="email" value={form.buyer_email} onChange={(e) => set("buyer_email", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="Buyer Phone">
              <Input value={form.buyer_phone} onChange={(e) => set("buyer_phone", e.target.value)} placeholder="*****" className="h-9" />
            </Field>

            {/* ── Property ── */}
            <SectionHeader title="Property / Area" />
            <Field label="Property Address">
              <Input value={form.property_address} onChange={(e) => set("property_address", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="County">
              <Input value={form.county} onChange={(e) => set("county", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="ZIP">
              <Input value={form.zip} onChange={(e) => set("zip", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="Property Type">
              <Select value={form.property_type} onValueChange={(v) => set("property_type", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_family">Single Family</SelectItem>
                  <SelectItem value="condo">Condo / Townhouse</SelectItem>
                  <SelectItem value="multi_family">Multi-Family</SelectItem>
                  <SelectItem value="land">Land / Lot</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Purchase Price / Budget">
              <Input type="number" value={form.purchase_price} onChange={(e) => set("purchase_price", e.target.value)} placeholder="*****" className="h-9" />
            </Field>

            {/* ── Compensation ── */}
            <SectionHeader title="Compensation" />
            <Field label="Compensation Type">
              <Select value={form.compensation_type} onValueChange={(v) => set("compensation_type", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage</SelectItem>
                  <SelectItem value="flat">Flat Fee</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {form.compensation_type === "percent" && (
              <Field label="Commission %">
                <Input type="number" step="0.1" value={form.commission_percent} onChange={(e) => set("commission_percent", e.target.value)} placeholder="*****" className="h-9" />
              </Field>
            )}
            {form.compensation_type === "flat" && (
              <Field label="Flat Fee Amount ($)">
                <Input type="number" value={form.commission_amount} onChange={(e) => set("commission_amount", e.target.value)} placeholder="*****" className="h-9" />
              </Field>
            )}

            {/* ── Financing ── */}
            <SectionHeader title="Financing" />
            <Field label="Financing Type">
              <Select value={form.financing_type} onValueChange={(v) => set("financing_type", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conventional">Conventional</SelectItem>
                  <SelectItem value="fha">FHA</SelectItem>
                  <SelectItem value="va">VA</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Lender Name">
              <Input value={form.lender_name} onChange={(e) => set("lender_name", e.target.value)} placeholder="*****" className="h-9" />
            </Field>

            {/* ── Dates ── */}
            <SectionHeader title="Agreement Dates" />
            <Field label="Agreement Start Date">
              <Input type="date" value={form.agreement_start_date} onChange={(e) => set("agreement_start_date", e.target.value)} className="h-9" />
            </Field>
            <Field label="Agreement End Date">
              <Input type="date" value={form.agreement_end_date} onChange={(e) => set("agreement_end_date", e.target.value)} className="h-9" />
            </Field>
            <Field label="Expected Closing Date">
              <Input type="date" value={form.closing_date} onChange={(e) => set("closing_date", e.target.value)} className="h-9" />
            </Field>

            {/* ── Agent / Brokerage ── */}
            <SectionHeader title="Agent & Brokerage" />
            <Field label="Agent Name">
              <Input value={form.agent_name} onChange={(e) => set("agent_name", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="Agent License #">
              <Input value={form.agent_license} onChange={(e) => set("agent_license", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="Agent Phone">
              <Input value={form.agent_phone} onChange={(e) => set("agent_phone", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="Agent Email">
              <Input type="email" value={form.agent_email} onChange={(e) => set("agent_email", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="Brokerage Name">
              <Input value={form.brokerage_name} onChange={(e) => set("brokerage_name", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="Brokerage License #">
              <Input value={form.brokerage_license} onChange={(e) => set("brokerage_license", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="Brokerage Address">
              <Input value={form.brokerage_address} onChange={(e) => set("brokerage_address", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="Brokerage City">
              <Input value={form.brokerage_city} onChange={(e) => set("brokerage_city", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="Brokerage State">
              <Input value={form.brokerage_state} onChange={(e) => set("brokerage_state", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="Brokerage ZIP">
              <Input value={form.brokerage_zip} onChange={(e) => set("brokerage_zip", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="Office Phone">
              <Input value={form.office_phone} onChange={(e) => set("office_phone", e.target.value)} placeholder="*****" className="h-9" />
            </Field>
            <Field label="Broker Supervisor">
              <Input value={form.broker_supervisor} onChange={(e) => set("broker_supervisor", e.target.value)} placeholder="*****" className="h-9" />
            </Field>

            {/* ── Status & Notes ── */}
            <SectionHeader title="Status & Notes" />
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="col-span-full">
              <Field label="Notes">
                <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="*****" className="h-20" />
              </Field>
            </div>

            {/* ── Custom Fields ── */}
            <div className="col-span-full pt-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1 flex-1">Custom Fields</p>
              <button
                onClick={addCustomField}
                className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 px-2 py-1 rounded-lg border border-dashed border-violet-300 hover:border-violet-400 transition-colors ml-3 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add Custom Field
              </button>
            </div>
            {customKeys.map(({ id, label }) => (
              <div key={id} className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <input
                    value={label}
                    onChange={(e) => renameCustomField(label, e.target.value)}
                    onBlur={(e) => renameCustomField(label, e.target.value.trim() || label)}
                    className="flex-1 text-xs font-medium text-slate-500 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-violet-300 rounded px-1"
                    placeholder="Field label"
                  />
                  <button onClick={() => removeCustomField(label)} className="p-0.5 text-slate-300 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Input
                  value={form.custom_answers[label] || ""}
                  onChange={(e) => setCustomAnswer(label, e.target.value)}
                  placeholder="*****"
                  className="h-9"
                />
              </div>
            ))}

          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.contact_name.trim()}
            className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2"
          >
            {saving ? <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : null}
            {saving ? "Saving…" : bba?.id ? "Update Record" : "Create Record"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}