import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Upload, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CATEGORIES = [
  { value: "appraisers", label: "Appraisers" },
  { value: "inspectors", label: "Inspectors" },
  { value: "lawn", label: "Lawn" },
  { value: "roofers", label: "Roofers" },
  { value: "termite", label: "Termite" },
  { value: "title", label: "Title" },
  { value: "make_ready_cleaning", label: "Make Ready Cleaning" },
  { value: "painters", label: "Painters" },
  { value: "flooring", label: "Flooring" },
  { value: "handyman", label: "Handyman" },
  { value: "hauling_debris", label: "Hauling/Debris" },
];

const BLANK = {
  category: "", business_name: "", logo_url: "", address: "", city: "",
  state: "OK", zip: "", website: "", email: "", contact_name: "", cell_phone: "", notes: "",
  star_rating: 0, review_notes: "", contact_photo_url: "", elevator_pitch_url: "",
};

const Field = ({ label, field, type = "text", placeholder, form, set }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-slate-500">{label}</Label>
    <Input type={type} value={form[field] || ""} onChange={(e) => set(field, e.target.value)} placeholder={placeholder} className="h-10" />
  </div>
);

const PRESET_VALUES = CATEGORIES.map((c) => c.value);

export default function VendorModal({ open, onClose, vendor, onSave, allVendors = [] }) {
  // Merge in any custom categories from saved vendors
  const extraCategories = [...new Set(
    allVendors.map((v) => v.category).filter((c) => c && !PRESET_VALUES.includes(c))
  )].map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));

  const allCategories = [...CATEGORIES, ...extraCategories];
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [contactPhotoUploading, setContactPhotoUploading] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    const v = vendor ? { ...BLANK, ...vendor } : BLANK;
    setForm(v);
    if (vendor?.category && !PRESET_VALUES.includes(vendor.category)) {
      setCustomCategory(vendor.category);
      setShowCustomInput(true);
    } else {
      setCustomCategory("");
      setShowCustomInput(false);
    }
  }, [vendor, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("logo_url", file_url);
    setLogoUploading(false);
  };

  const handleContactPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setContactPhotoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("contact_photo_url", file_url);
    setContactPhotoUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vendor ? "Edit Vendor" : "New Vendor"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Category of Service</Label>
            <Select
              value={showCustomInput ? "__custom__" : form.category}
              onValueChange={(v) => {
                if (v === "__custom__") {
                  setShowCustomInput(true);
                  setCustomCategory("");
                  set("category", "");
                } else {
                  setShowCustomInput(false);
                  setCustomCategory("");
                  set("category", v);
                }
              }}
            >
              <SelectTrigger className="h-10"><SelectValue placeholder="Select category..." /></SelectTrigger>
              <SelectContent>
                {allCategories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                <SelectItem value="__custom__">+ Add custom category...</SelectItem>
              </SelectContent>
            </Select>
            {showCustomInput && (
              <Input
                autoFocus
                placeholder="Enter custom category name..."
                value={customCategory}
                onChange={(e) => {
                  setCustomCategory(e.target.value);
                  set("category", e.target.value);
                }}
                className="h-10 mt-1"
              />
            )}
          </div>

          <Field label="Business Name" field="business_name" placeholder="ABC Roofing Co." form={form} set={set} />

          {/* Logo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Logo</Label>
            <div className="flex items-center gap-3">
              {form.logo_url && (
                <img src={form.logo_url} alt="Logo" className="h-12 w-auto max-w-[120px] object-contain rounded border border-slate-200 p-1" />
              )}
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:border-slate-300 transition-colors">
                  <Upload className="w-3.5 h-3.5" /> {logoUploading ? "Uploading..." : "Upload Logo"}
                </div>
              </label>
              {form.logo_url && (
                <button onClick={() => set("logo_url", "")} className="text-xs text-red-400 hover:text-red-600">Remove</button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Field label="Street Address" field="address" placeholder="100 N Main St" form={form} set={set} /></div>
            <Field label="City" field="city" placeholder="Oklahoma City" form={form} set={set} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="State" field="state" placeholder="OK" form={form} set={set} />
              <Field label="ZIP" field="zip" placeholder="73101" form={form} set={set} />
            </div>
            <Field label="Website" field="website" type="url" placeholder="https://example.com" form={form} set={set} />
            <Field label="Email" field="email" type="email" placeholder="info@vendor.com" form={form} set={set} />
            <Field label="Main Contact Name" field="contact_name" placeholder="John Smith" form={form} set={set} />
            <Field label="Cell Phone" field="cell_phone" type="tel" placeholder="(405) 555-1234" form={form} set={set} />
          </div>

          {/* Contact Photo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Contact Photo</Label>
            <div className="flex items-center gap-3">
              {form.contact_photo_url ? (
                <img src={form.contact_photo_url} alt="Contact" className="h-14 w-14 object-cover rounded-full border border-slate-200 shrink-0" />
              ) : (
                <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-lg font-bold shrink-0">
                  {form.contact_name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleContactPhotoUpload} />
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:border-slate-300 transition-colors">
                  <Upload className="w-3.5 h-3.5" /> {contactPhotoUploading ? "Uploading..." : "Upload Photo"}
                </div>
              </label>
              {form.contact_photo_url && (
                <button onClick={() => set("contact_photo_url", "")} className="text-xs text-red-400 hover:text-red-600">Remove</button>
              )}
            </div>
          </div>

          {/* Elevator Pitch Video */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Elevator Pitch Video URL</Label>
            <Input
              type="url"
              value={form.elevator_pitch_url || ""}
              onChange={(e) => set("elevator_pitch_url", e.target.value)}
              placeholder="https://... (mp4 or video URL — auto-plays on hover)"
              className="h-10"
            />
            <p className="text-[10px] text-slate-400">A short video that auto-plays when hovering over the vendor's contact photo on the Order Services page.</p>
          </div>

          {/* Star Rating */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Quality Rating</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => set("star_rating", form.star_rating === star ? 0 : star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-6 h-6 transition-colors ${star <= (form.star_rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`}
                  />
                </button>
              ))}
              {form.star_rating > 0 && (
                <span className="ml-2 text-xs text-slate-400">{form.star_rating} / 5</span>
              )}
            </div>
          </div>

          {/* Review Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Review Notes</Label>
            <Textarea value={form.review_notes || ""} onChange={(e) => set("review_notes", e.target.value)} placeholder="Track quality of work, reliability, communication..." className="h-24" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">General Notes</Label>
            <Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Notes about this vendor..." className="h-20" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Vendor"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}