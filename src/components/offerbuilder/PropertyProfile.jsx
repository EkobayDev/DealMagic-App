import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Save, CheckCircle2, Trash2 } from "lucide-react";

const PROFILE_KEY = "dealmagic_property_profile";

const FIELDS = [
  { section: "Property", items: [
    { key: "property_address", label: "Property Address" },
    { key: "city", label: "City" },
    { key: "county", label: "County" },
    { key: "zip", label: "ZIP Code" },
  ]},
  { section: "Buyer", items: [
    { key: "buyer_name", label: "Buyer(s)" },
    { key: "buyer_email", label: "Buyer Email" },
    { key: "buyer_phone", label: "Buyer Phone" },
  ]},
  { section: "Seller", items: [
    { key: "seller_name", label: "Seller(s)" },
    { key: "seller_email", label: "Seller Email" },
  ]},
  { section: "Agents & Deal", items: [
    { key: "buyer_agent_name", label: "Buyer's Agent" },
    { key: "buyer_agent_brokerage", label: "Buyer's Brokerage" },
    { key: "seller_agent_name", label: "Seller's Agent" },
    { key: "seller_agent_brokerage", label: "Seller's Brokerage" },
    { key: "purchase_price", label: "Purchase Price" },
    { key: "earnest_money", label: "Earnest Money" },
    { key: "closing_date", label: "Closing Date", type: "date" },
    { key: "title_company", label: "Title Company" },
    { key: "lender_name", label: "Lender" },
  ]},
];

export default function PropertyProfile() {
  const [expanded, setExpanded] = useState(false);
  const [profile, setProfile] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (stored) setProfile(JSON.parse(stored));
  }, []);

  const set = (k, v) => setProfile((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClear = () => {
    localStorage.removeItem(PROFILE_KEY);
    setProfile({});
  };

  const filledCount = Object.values(profile).filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full px-5 py-3 flex items-center justify-between"
        style={{ backgroundColor: "#1e3a5f" }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-blue-100 uppercase tracking-wider">
            Property Profile
          </h2>
          {filledCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFFF00]/20 text-yellow-300 font-semibold">
              {filledCount} field{filledCount !== 1 ? "s" : ""} saved
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-blue-300" />
          : <ChevronDown className="w-4 h-4 text-blue-300" />}
      </button>

      {expanded && (
        <div className="p-5 space-y-5">
          <p className="text-xs text-slate-500">
            Fill in common details once — they'll auto-populate every form you open from this builder.
          </p>
          {FIELDS.map(({ section, items }) => (
            <div key={section}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{section}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">{f.label}</Label>
                    <Input
                      type={f.type || "text"}
                      value={profile[f.key] || ""}
                      onChange={(e) => set(f.key, e.target.value)}
                      placeholder={f.label}
                      className="h-9"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2">
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-slate-400 hover:text-red-400 gap-1.5 text-xs">
              <Trash2 className="w-3.5 h-3.5" /> Clear Profile
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-1.5">
              {saved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved!</> : <><Save className="w-3.5 h-3.5" /> Save Profile</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}