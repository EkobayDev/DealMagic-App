import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Settings2, Plus, X } from "lucide-react";
import { toast } from "sonner";

const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-slate-500">{label}</Label>
    {children}
  </div>
);

export default function AgentBBADefaults() {
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    agent_profile_id: "",
    agent_name: "",
    commission_percent: "",
    compensation_type: "percent",
    commission_amount: "",
    financing_type: "conventional",
    property_type: "single_family",
    agreement_duration_months: "6",
    county: "",
    city: "",
    state: "OK",
    lender_name: "",
    notes: "",
    custom_fields: {},
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: agentProfiles = [] } = useQuery({
    queryKey: ["agent-profiles-bbadefaults"],
    queryFn: () => base44.entities.AgentProfile.list("agent_name", 100),
    enabled: !!currentUser,
  });

  // Find the agent profile for the current user
  const myProfile = agentProfiles.find(
    (a) => a.email?.toLowerCase() === currentUser?.email?.toLowerCase()
  ) || agentProfiles[0] || null;

  // Load existing defaults record
  const { data: defaultsRecords = [] } = useQuery({
    queryKey: ["agent-bba-defaults", myProfile?.id],
    queryFn: () =>
      base44.entities.AgentBBADefaults.filter({ agent_profile_id: myProfile.id }, "-updated_date", 1),
    enabled: !!myProfile,
  });

  useEffect(() => {
    if (myProfile) {
      setProfileId(myProfile.id);
      setForm((f) => ({ ...f, agent_profile_id: myProfile.id, agent_name: myProfile.agent_name || "" }));
    }
  }, [myProfile]);

  useEffect(() => {
    if (defaultsRecords.length > 0) {
      const r = defaultsRecords[0];
      setRecordId(r.id);
      setForm({
        agent_profile_id: r.agent_profile_id || myProfile?.id || "",
        agent_name: r.agent_name || myProfile?.agent_name || "",
        commission_percent: r.commission_percent ?? "",
        compensation_type: r.compensation_type || "percent",
        commission_amount: r.commission_amount ?? "",
        financing_type: r.financing_type || "conventional",
        property_type: r.property_type || "single_family",
        agreement_duration_months: r.agreement_duration_months ?? "6",
        county: r.county || "",
        city: r.city || "",
        state: r.state || "OK",
        lender_name: r.lender_name || "",
        notes: r.notes || "",
        custom_fields: r.custom_fields || {},
      });
    }
  }, [defaultsRecords]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: (data) =>
      recordId
        ? base44.entities.AgentBBADefaults.update(recordId, data)
        : base44.entities.AgentBBADefaults.create(data),
    onSuccess: (result) => {
      if (!recordId && result?.id) setRecordId(result.id);
      qc.invalidateQueries({ queryKey: ["agent-bba-defaults"] });
      toast.success("BBA defaults saved!");
      setSaving(false);
    },
  });

  const handleSave = () => {
    if (!form.agent_profile_id) { toast.error("No agent profile found."); return; }
    setSaving(true);
    saveMutation.mutate({
      ...form,
      commission_percent: form.commission_percent !== "" ? Number(form.commission_percent) : undefined,
      commission_amount: form.commission_amount !== "" ? Number(form.commission_amount) : undefined,
      agreement_duration_months: form.agreement_duration_months !== "" ? Number(form.agreement_duration_months) : undefined,
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
          <Settings2 className="w-6 h-6 text-violet-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">BBA Defaults</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Set your default values for new Buyer Broker Agreements. These auto-populate in the PDF mapper source dropdown.
          </p>
        </div>
      </div>

      {myProfile && (
        <div className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5 font-medium">
          Defaults for: {myProfile.agent_name} — License {myProfile.license_number}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">

        {/* Compensation */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Compensation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Compensation Type">
              <Select value={form.compensation_type} onValueChange={(v) => set("compensation_type", v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage</SelectItem>
                  <SelectItem value="flat">Flat Fee</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {form.compensation_type !== "flat" ? (
              <Field label="Default Commission %">
                <Input
                  type="number"
                  value={form.commission_percent}
                  onChange={(e) => set("commission_percent", e.target.value)}
                  placeholder="3"
                  className="h-10"
                />
              </Field>
            ) : (
              <Field label="Default Flat Fee ($)">
                <Input
                  type="number"
                  value={form.commission_amount}
                  onChange={(e) => set("commission_amount", e.target.value)}
                  placeholder="5000"
                  className="h-10"
                />
              </Field>
            )}
          </div>
        </div>

        {/* Agreement */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Agreement</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Default Duration (months)">
              <Input
                type="number"
                value={form.agreement_duration_months}
                onChange={(e) => set("agreement_duration_months", e.target.value)}
                placeholder="6"
                className="h-10"
              />
            </Field>
            <Field label="Default Financing Type">
              <Select value={form.financing_type} onValueChange={(v) => set("financing_type", v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conventional">Conventional</SelectItem>
                  <SelectItem value="fha">FHA</SelectItem>
                  <SelectItem value="va">VA</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Default Property Type">
              <Select value={form.property_type} onValueChange={(v) => set("property_type", v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_family">Single Family</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="multi_family">Multi-Family</SelectItem>
                  <SelectItem value="land">Land</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        {/* Location */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Default Location</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="City">
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Oklahoma City" className="h-10" />
            </Field>
            <Field label="County">
              <Input value={form.county} onChange={(e) => set("county", e.target.value)} placeholder="Oklahoma" className="h-10" />
            </Field>
            <Field label="State">
              <Input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="OK" className="h-10" />
            </Field>
            <Field label="Preferred Lender">
              <Input value={form.lender_name} onChange={(e) => set("lender_name", e.target.value)} placeholder="First National Bank" className="h-10" />
            </Field>
          </div>
        </div>

        {/* Custom Fields */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const key = `field_${Date.now()}`;
              set("custom_fields", { ...(form.custom_fields || {}), [key]: { label: "", value: "" } });
            }}
            className="absolute top-0 right-0 flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add Field
          </button>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Custom Fields</h3>
          </div>
          {Object.keys(form.custom_fields || {}).length === 0 ? (
            <p className="text-xs text-slate-400 italic">No custom fields — click "Add Field" to create one.</p>
          ) : (
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
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Default Notes</h3>
          <Textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Any notes to pre-fill on new BBAs..."
            className="h-24"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !myProfile}
          className="w-full bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save BBA Defaults"}
        </Button>
      </div>
    </div>
  );
}