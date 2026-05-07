import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Building2, Phone, Mail, Search, Upload, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const BLANK = {
  license_id: "", brokerage_name: "", logo_url: "", address: "", city: "",
  state: "OK", zip: "", main_phone: "", website_url: "",
  broker_name: "", broker_id: "", broker_phone: "", broker_email: "", notes: "",
  commission_logic: { type: "none", brokerage_split_pct: 30, brokerage_cap: 0 },
  custom_fields: {},
};

const Field = ({ label, field, form, set, type = "text", placeholder }) => (
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

function BrokerageModal({ open, onClose, brokerage, onSave, scrollToAgents }) {
  const [form, setForm] = useState(brokerage ? { ...BLANK, ...brokerage } : BLANK);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const agentsRef = React.useRef(null);

  const { data: agentProfiles = [] } = useQuery({
    queryKey: ["agent-profiles-all"],
    queryFn: () => base44.entities.AgentProfile.list("agent_name", 500),
    enabled: open,
  });

  const relatedAgents = agentProfiles.filter((a) =>
    brokerage?.license_id && a.brokerage_license_number === brokerage.license_id
  );

  React.useEffect(() => {
    const base = brokerage ? { ...BLANK, ...brokerage } : BLANK;
    // Ensure commission_logic has defaults
    base.commission_logic = {
      type: "none",
      brokerage_split_pct: 30,
      brokerage_cap: 0,
      ...((brokerage?.commission_logic) || {}),
    };
    setForm(base);
  }, [brokerage, open]);

  React.useEffect(() => {
    if (open && scrollToAgents && agentsRef.current) {
      setTimeout(() => agentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    }
  }, [open, scrollToAgents]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("logo_url", file_url);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.license_id || !form.brokerage_name) {
      toast.error("License ID and Brokerage Name are required.");
      return;
    }
    setSaving(true);
    await onSave(form, brokerage?.id);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl overflow-y-auto" style={{ maxHeight: "85vh" }}>
        <DialogHeader>
          <DialogTitle>{brokerage ? "Edit Brokerage" : "New Brokerage"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-2">
          {/* Brokerage Info */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Brokerage Info</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="License ID *" field="license_id" form={form} set={set} placeholder="OK-BRK-12345" />
              <Field label="Brokerage Name *" field="brokerage_name" form={form} set={set} placeholder="ABC Realty" />
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Logo</Label>
                <div className="flex items-center gap-3">
                  {form.logo_url && (
                    <img src={form.logo_url} alt="Logo" className="h-10 w-10 object-contain rounded border border-slate-200" style={{ mixBlendMode: "multiply" }} />
                  )}
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
                    <Upload className="w-4 h-4" />
                    {uploading ? "Uploading..." : form.logo_url ? "Change Logo" : "Upload Logo"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                  </label>
                  {form.logo_url && (
                    <button type="button" onClick={() => set("logo_url", "")} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                  )}
                </div>
              </div>
              <Field label="Website URL" field="website_url" form={form} set={set} placeholder="https://..." />
              <Field label="Main Phone" field="main_phone" form={form} set={set} placeholder="(405) 555-0100" />
            </div>
          </div>

          {/* Address */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Address</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Street Address" field="address" form={form} set={set} placeholder="123 Main St" />
              </div>
              <Field label="City" field="city" form={form} set={set} placeholder="Oklahoma City" />
              <Field label="State" field="state" form={form} set={set} placeholder="OK" />
              <Field label="ZIP" field="zip" form={form} set={set} placeholder="73101" />
            </div>
          </div>

          {/* Designated Broker */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Designated Broker</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Broker Name" field="broker_name" form={form} set={set} placeholder="Jane Smith" />
              <Field label="Broker License ID" field="broker_id" form={form} set={set} placeholder="OK-AGT-99999" />
              <Field label="Broker Phone" field="broker_phone" form={form} set={set} placeholder="(405) 555-0200" />
              <Field label="Broker Email" field="broker_email" form={form} set={set} type="email" placeholder="broker@example.com" />
            </div>
          </div>

          {/* Agents */}
          {brokerage && (
            <div ref={agentsRef}>
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                Agents at this Brokerage
                <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-1">{relatedAgents.length}</span>
              </h4>
              {relatedAgents.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No agent profiles linked to license ID <span className="font-mono">{brokerage.license_id}</span>.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {relatedAgents.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2">
                      {a.photo_url ? (
                        <img src={a.photo_url} alt={a.agent_name} className="h-8 w-8 rounded-full object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                          {a.agent_name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{a.agent_name}</p>
                        <p className="text-xs text-slate-400 font-mono">{a.license_number}</p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        {a.phone && <a href={`tel:${a.phone}`} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"><Phone className="w-3 h-3" />{a.phone}</a>}
                        {a.email && <a href={`mailto:${a.email}`} className="text-xs text-blue-500 hover:underline flex items-center gap-1"><Mail className="w-3 h-3" />{a.email}</a>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-slate-700">Custom Fields</h4>
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

          {/* Commission Logic */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Commission Logic</h4>
            <div className="space-y-3 bg-slate-50 rounded-xl border border-slate-100 p-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Type</Label>
                <select
                  value={form.commission_logic?.type || "none"}
                  onChange={(e) => set("commission_logic", { ...form.commission_logic, type: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                >
                  <option value="none">None — not configured</option>
                  <option value="cap">Cap — brokerage takes % until YTD cap, then 100% to agent</option>
                  <option value="flat_split">Flat Split — fixed % split every transaction</option>
                </select>
              </div>

              {(form.commission_logic?.type === "cap" || form.commission_logic?.type === "flat_split") && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Brokerage Split %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.commission_logic?.brokerage_split_pct ?? 30}
                      onChange={(e) => set("commission_logic", { ...form.commission_logic, brokerage_split_pct: parseFloat(e.target.value) || 0 })}
                      className="h-10"
                      placeholder="30"
                    />
                  </div>
                  {form.commission_logic?.type === "cap" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-500">Brokerage YTD Cap ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="100"
                        value={form.commission_logic?.brokerage_cap ?? 0}
                        onChange={(e) => set("commission_logic", { ...form.commission_logic, brokerage_cap: parseFloat(e.target.value) || 0 })}
                        className="h-10"
                        placeholder="13900"
                      />
                    </div>
                  )}
                </div>
              )}

              {form.commission_logic?.type === "cap" && (
                <p className="text-[11px] text-slate-400">
                  Brokerage earns <strong>{form.commission_logic?.brokerage_split_pct ?? 30}%</strong> of each commission until it has collected <strong>${(form.commission_logic?.brokerage_cap || 0).toLocaleString()}</strong> YTD, then the agent keeps 100%.
                </p>
              )}
              {form.commission_logic?.type === "flat_split" && (
                <p className="text-[11px] text-slate-400">
                  Brokerage always receives <strong>{form.commission_logic?.brokerage_split_pct ?? 30}%</strong> of every commission; agent keeps <strong>{100 - (form.commission_logic?.brokerage_split_pct ?? 30)}%</strong>.
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Notes</Label>
            <Textarea
              value={form.notes || ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Additional notes..."
              className="h-20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600]">
              {saving ? "Saving..." : "Save Brokerage"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BrokerageTable() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [focusAgents, setFocusAgents] = useState(false);

  const { data: brokerages = [], isLoading } = useQuery({
    queryKey: ["brokerages"],
    queryFn: () => base44.entities.Brokerage.list("brokerage_name", 200),
  });

  const { data: allAgents = [] } = useQuery({
    queryKey: ["agent-profiles-all"],
    queryFn: () => base44.entities.AgentProfile.list("agent_name", 500),
  });

  const agentCountByLicense = allAgents.reduce((acc, a) => {
    if (a.brokerage_license_number) {
      acc[a.brokerage_license_number] = (acc[a.brokerage_license_number] || 0) + 1;
    }
    return acc;
  }, {});

  const saveMutation = useMutation({
    mutationFn: ({ data, id }) =>
      id ? base44.entities.Brokerage.update(id, data) : base44.entities.Brokerage.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brokerages"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Brokerage.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brokerages"] }),
  });

  const filtered = brokerages.filter((b) =>
    !search ||
    b.brokerage_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.license_id?.toLowerCase().includes(search.toLowerCase()) ||
    b.broker_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Brokerage Table</h1>
          <p className="text-sm text-slate-500 mt-1">{brokerages.length} brokerage{brokerages.length !== 1 ? "s" : ""} on file</p>
        </div>
        <Button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2"
        >
          <Plus className="w-4 h-4" /> New Brokerage
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search brokerages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3">Brokerage</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3 hidden md:table-cell">License ID</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3 hidden lg:table-cell">Address</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3 hidden md:table-cell">Phone</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3 hidden xl:table-cell">Designated Broker</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3 hidden md:table-cell">Agents</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3 hidden lg:table-cell">Commission Logic</th>
                <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12 text-sm text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-sm text-slate-400">No brokerages found</td></tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {b.logo_url ? (
                          <img src={b.logo_url} alt={b.brokerage_name} className="h-8 w-8 object-contain rounded border border-slate-100 shrink-0" style={{ mixBlendMode: "multiply" }} />
                        ) : (
                          <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <button onClick={() => { setEditing(b); setFocusAgents(false); setModalOpen(true); }} className="font-semibold text-slate-800 hover:text-blue-600 hover:underline text-left">
                            {b.brokerage_name}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{b.license_id}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">
                      {[b.address, b.city, b.state, b.zip].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {b.main_phone ? (
                        <a href={`tel:${b.main_phone}`} className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900">
                          <Phone className="w-3 h-3" /> {b.main_phone}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {b.broker_name ? (
                        <div>
                          <p className="text-sm font-medium text-slate-700">{b.broker_name}</p>
                          <p className="text-xs text-slate-400 font-mono">{b.broker_id}</p>
                          {b.broker_email && (
                            <a href={`mailto:${b.broker_email}`} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {b.broker_email}
                            </a>
                          )}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {agentCountByLicense[b.license_id] ? (
                        <Link
                          to={`/AgentsByBrokerage?license=${encodeURIComponent(b.license_id)}`}
                          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                        >
                          <Users className="w-3.5 h-3.5" />
                          {agentCountByLicense[b.license_id]}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {(() => {
                        const cl = b.commission_logic;
                        if (!cl || cl.type === "none" || !cl.type) return <span className="text-xs text-slate-300">—</span>;
                        if (cl.type === "cap") return (
                          <div>
                            <span className="text-xs font-semibold text-orange-600">{cl.brokerage_split_pct ?? 30}% → Cap</span>
                            <p className="text-[11px] text-slate-400">${(cl.brokerage_cap || 0).toLocaleString()} YTD cap</p>
                          </div>
                        );
                        if (cl.type === "flat_split") return (
                          <span className="text-xs font-semibold text-blue-600">{cl.brokerage_split_pct ?? 30}% / {100 - (cl.brokerage_split_pct ?? 30)}% split</span>
                        );
                        return <span className="text-xs text-slate-300">—</span>;
                      })()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditing(b); setModalOpen(true); }} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteMutation.mutate(b.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BrokerageModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); setFocusAgents(false); }}
        brokerage={editing}
        onSave={(data, id) => saveMutation.mutateAsync({ data, id })}
        scrollToAgents={focusAgents}
      />
    </div>
  );
}