import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, User, Upload, Globe, KeyRound, Plus, X } from "lucide-react";
import { toast } from "sonner";

const Field = ({ label, field, type = "text", placeholder, form, set }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-slate-500">{label}</Label>
    <Input
      type={type}
      value={form[field]}
      onChange={(e) => set(field, e.target.value)}
      placeholder={placeholder}
      className="h-10"
    />
  </div>
);

function AccountSettings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [accountForm, setAccountForm] = useState({ full_name: "" });
  const [savingAccount, setSavingAccount] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setCurrentUser(u);
      setAccountForm({ full_name: u?.full_name || "" });
    }).catch(() => {});
  }, []);

  const handleSaveAccount = async () => {
    setSavingAccount(true);
    await base44.auth.updateMe(accountForm);
    toast.success("Account updated!");
    setSavingAccount(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
          <KeyRound className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Account Settings</h3>
          <p className="text-xs text-slate-400">Your login account details</p>
        </div>
      </div>

      {currentUser && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Display Name</Label>
            <Input
              value={accountForm.full_name}
              onChange={(e) => setAccountForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Your name"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Email (read-only)</Label>
            <Input value={currentUser.email || ""} disabled className="h-10 bg-slate-50 text-slate-400" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Role (read-only)</Label>
            <Input value={currentUser.role || ""} disabled className="h-10 bg-slate-50 text-slate-400 capitalize" />
          </div>
        </div>
      )}

      <Button
        onClick={handleSaveAccount}
        disabled={savingAccount}
        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
      >
        <Save className="w-4 h-4" /> {savingAccount ? "Saving..." : "Save Account"}
      </Button>
    </div>
  );
}

export default function Profile() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    agent_name: "",
    license_number: "",
    phone: "",
    email: "",
    photo_url: "",
    logo_url: "",
    brokerage_name: "",
    brokerage_license_number: "",
    brokerage_address: "",
    brokerage_city: "",
    brokerage_state: "OK",
    brokerage_zip: "",
    office_phone: "",
    office_email: "",
    website: "",
    default_commission_percent: "",
    default_title_company: "",
    net_sheet_disclaimer: "",
    broker_supervisor: "",
    broker_supervisor_email: "",
    broker_supervisor_website: "",
    custom_fields: {},
  });
  const [logoUploading, setLogoUploading] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["agent-profile"],
    queryFn: () => base44.entities.AgentProfile.list("-created_date", 1),
  });

  useEffect(() => {
    if (profiles.length > 0) {
      const p = profiles[0];
      setProfileId(p.id);
      setForm({
        agent_name: p.agent_name || "",
        license_number: p.license_number || "",
        phone: p.phone || "",
        email: p.email || "",
        photo_url: p.photo_url || "",
        logo_url: p.logo_url || "",
        brokerage_name: p.brokerage_name || "",
        brokerage_license_number: p.brokerage_license_number || "",
        brokerage_address: p.brokerage_address || "",
        brokerage_city: p.brokerage_city || "",
        brokerage_state: p.brokerage_state || "OK",
        brokerage_zip: p.brokerage_zip || "",
        office_phone: p.office_phone || "",
        office_email: p.office_email || "",
        website: p.website || "",
        default_commission_percent: p.default_commission_percent || "",
        default_title_company: p.default_title_company || "",
        net_sheet_disclaimer: p.net_sheet_disclaimer || "",
        broker_supervisor: p.broker_supervisor || "",
        broker_supervisor_email: p.broker_supervisor_email || "",
        broker_supervisor_website: p.broker_supervisor_website || "",
        custom_fields: p.custom_fields || {},
      });
    }
  }, [profiles]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const cleanData = {
        ...data,
        default_commission_percent: data.default_commission_percent ? Number(data.default_commission_percent) : undefined,
      };
      if (profileId) {
        return base44.entities.AgentProfile.update(profileId, cleanData);
      }
      return base44.entities.AgentProfile.create(cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-profile"] });
      setSaving(false);
    },
  });

  const handleSave = () => {
    setSaving(true);
    saveMutation.mutate(form);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("logo_url", file_url);
    setLogoUploading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <AccountSettings />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agent Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Your info auto-fills into forms and net sheets</p>
        </div>
        <img
          src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
          alt="DealMagic"
          className="h-40 w-auto object-contain ml-auto"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
        {/* Agent Info */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFFF00]/10 flex items-center justify-center">
              <User className="w-6 h-6 text-[#cccc00]" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Agent Information</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" field="agent_name" placeholder="Jane Doe" form={form} set={set} />
            <Field label="License #" field="license_number" placeholder="OK-12345" form={form} set={set} />
            <Field label="Phone" field="phone" type="tel" placeholder="(405) 555-1234" form={form} set={set} />
            <Field label="Email" field="email" type="email" placeholder="jane@brokerage.com" form={form} set={set} />
          </div>
        </div>

        {/* Agent Photo */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Agent Photo</h3>
          <div className="flex items-center gap-4">
            {form.photo_url ? (
              <img src={form.photo_url} alt="Agent" className="h-20 w-20 object-cover rounded-full border border-slate-200" />
            ) : (
              <div className="h-20 w-20 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">No photo</div>
            )}
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                set("photo_url", file_url);
              }} />
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:border-slate-300 transition-colors">
                <Upload className="w-4 h-4" /> Upload Photo
              </div>
            </label>
            {form.photo_url && (
              <button onClick={() => set("photo_url", "")} className="text-xs text-red-400 hover:text-red-600">Remove</button>
            )}
          </div>
        </div>

        {/* Logo Upload */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Brokerage Logo</h3>
          <div className="flex items-center gap-4">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="h-16 w-auto max-w-[160px] object-contain rounded-lg border border-slate-200 p-1" />
            ) : (
              <div className="h-16 w-32 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">No logo</div>
            )}
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:border-slate-300 transition-colors">
                <Upload className="w-4 h-4" /> {logoUploading ? "Uploading..." : "Upload Logo"}
              </div>
            </label>
            {form.logo_url && (
              <button onClick={() => set("logo_url", "")} className="text-xs text-red-400 hover:text-red-600">Remove</button>
            )}
          </div>
        </div>

        {/* Brokerage */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Brokerage</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Brokerage Name" field="brokerage_name" placeholder="OK Realty Group" form={form} set={set} />
            </div>
            <div className="sm:col-span-2">
              <Field label="Brokerage License #" field="brokerage_license_number" placeholder="OK-BRK-12345" form={form} set={set} />
            </div>
            <div className="sm:col-span-2">
              <Field label="Street Address" field="brokerage_address" placeholder="100 N Broadway Ave" form={form} set={set} />
            </div>
            <Field label="City" field="brokerage_city" placeholder="Oklahoma City" form={form} set={set} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="State" field="brokerage_state" placeholder="OK" form={form} set={set} />
              <Field label="ZIP" field="brokerage_zip" placeholder="73102" form={form} set={set} />
            </div>
            <Field label="Office Phone" field="office_phone" type="tel" placeholder="(405) 555-0100" form={form} set={set} />
            <Field label="Office Email" field="office_email" type="email" placeholder="office@brokerage.com" form={form} set={set} />
            <div className="sm:col-span-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="url"
                    value={form.website}
                    onChange={(e) => set("website", e.target.value)}
                    placeholder="https://www.brokerage.com"
                    className="h-10 pl-9"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Broker Supervisor */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Broker Supervisor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Supervisor Name" field="broker_supervisor" placeholder="Full name" form={form} set={set} />
            </div>
            <Field label="Supervisor Email" field="broker_supervisor_email" type="email" placeholder="supervisor@brokerage.com" form={form} set={set} />
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Supervisor Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="url"
                  value={form.broker_supervisor_website}
                  onChange={(e) => set("broker_supervisor_website", e.target.value)}
                  placeholder="https://..."
                  className="h-10 pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Defaults */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Defaults</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Default Commission %" field="default_commission_percent" type="number" placeholder="3" form={form} set={set} />
            <Field label="Default Title Company" field="default_title_company" placeholder="Oklahoma Title Co." form={form} set={set} />
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

        {/* Disclaimer */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Net Sheet Disclaimer</h3>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Custom Disclaimer Text</Label>
            <Textarea
              value={form.net_sheet_disclaimer}
              onChange={(e) => set("net_sheet_disclaimer", e.target.value)}
              placeholder="Estimates only. Actual closing costs may vary..."
              className="h-24"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}