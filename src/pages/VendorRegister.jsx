import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = [
  { value: "appraisers", label: "Appraisers" },
  { value: "inspectors", label: "Inspectors" },
  { value: "lawn", label: "Lawn Care" },
  { value: "roofers", label: "Roofers" },
  { value: "termite", label: "Termite / Pest" },
  { value: "title", label: "Title Company" },
  { value: "make_ready_cleaning", label: "Make Ready Cleaning" },
  { value: "painters", label: "Painters" },
  { value: "flooring", label: "Flooring" },
  { value: "handyman", label: "Handyman" },
  { value: "hauling_debris", label: "Hauling / Debris Removal" },
];

const BLANK = {
  business_name: "", category: "", contact_name: "", email: "",
  cell_phone: "", website: "", address: "", city: "", state: "OK", zip: "",
  logo_url: "", contact_photo_url: "", elevator_pitch_url: "", notes: "",
};

export default function VendorRegister() {
  const [form, setForm] = useState(BLANK);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [logoUploading, setLogoUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.business_name.trim()) e.business_name = "Required";
    if (!form.category) e.category = "Required";
    if (!form.contact_name.trim()) e.contact_name = "Required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("logo_url", file_url);
    setLogoUploading(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("contact_photo_url", file_url);
    setPhotoUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    await base44.entities.PendingVendor.create({ ...form, status: "pending" });
    // Notify admins
    await base44.functions.invoke("notifyVendorSubmission", { vendor: form });
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center space-y-4">
          <img
            src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
            alt="DealMagic"
            className="h-20 mx-auto object-contain"
            style={{ mixBlendMode: "multiply" }}
          />
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-bold text-slate-900">Application Submitted!</h2>
          <p className="text-slate-500 text-sm">
            Thank you, <strong>{form.contact_name}</strong>! Your vendor profile for <strong>{form.business_name}</strong> has been submitted for review.
            You'll receive an email once it's been approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
            alt="DealMagic"
            className="h-24 mx-auto object-contain mb-4"
            style={{ mixBlendMode: "multiply" }}
          />
          <h1 className="text-3xl font-bold text-slate-900">Vendor Registration</h1>
          <p className="text-slate-500 mt-2 text-sm">Join the DealMagic vendor network. Fill out your profile below and we'll review your application.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg p-8 space-y-6">
          {/* Business Info */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Business Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs text-slate-500">Business Name *</Label>
                <Input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="ABC Roofing Co." className={errors.business_name ? "border-red-400" : ""} />
                {errors.business_name && <p className="text-xs text-red-500">{errors.business_name}</p>}
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs text-slate-500">Service Category *</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger className={errors.category ? "border-red-400" : ""}><SelectValue placeholder="Select your category..." /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs text-slate-500">Description of Services</Label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Briefly describe your services, experience, service area, etc."
                  rows={3}
                  className="w-full text-sm rounded-xl border border-input px-3 py-2 text-slate-700 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Website</Label>
                <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://yoursite.com" type="url" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Address</Label>
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Main St" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-500">City</Label>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Oklahoma City" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">State</Label>
                  <Input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="OK" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">ZIP</Label>
                  <Input value={form.zip} onChange={(e) => set("zip", e.target.value)} placeholder="73101" />
                </div>
              </div>
            </div>
          </section>

          {/* Contact Info */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Your Name *</Label>
                <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} placeholder="Jane Smith" className={errors.contact_name ? "border-red-400" : ""} />
                {errors.contact_name && <p className="text-xs text-red-500">{errors.contact_name}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Email *</Label>
                <Input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@business.com" type="email" className={errors.email ? "border-red-400" : ""} />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Cell Phone</Label>
                <Input value={form.cell_phone} onChange={(e) => set("cell_phone", e.target.value)} placeholder="(405) 555-1234" type="tel" />
              </div>
            </div>
          </section>

          {/* Media */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Photos & Media</h3>
            <div className="space-y-4">
              {/* Logo */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Business Logo</Label>
                <div className="flex items-center gap-3">
                  {form.logo_url && <img src={form.logo_url} alt="Logo" className="h-12 w-auto max-w-[120px] object-contain rounded border border-slate-200 p-1" />}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:border-slate-300 transition-colors">
                      <Upload className="w-3.5 h-3.5" /> {logoUploading ? "Uploading..." : "Upload Logo"}
                    </div>
                  </label>
                </div>
              </div>

              {/* Contact Photo */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Your Photo</Label>
                <div className="flex items-center gap-3">
                  {form.contact_photo_url ? (
                    <img src={form.contact_photo_url} alt="Contact" className="h-14 w-14 object-cover rounded-full border border-slate-200" />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-xl font-bold">?</div>
                  )}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:border-slate-300 transition-colors">
                      <Upload className="w-3.5 h-3.5" /> {photoUploading ? "Uploading..." : "Upload Photo"}
                    </div>
                  </label>
                </div>
              </div>

              {/* Elevator Pitch */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Elevator Pitch Video URL</Label>
                <Input
                  value={form.elevator_pitch_url}
                  onChange={(e) => set("elevator_pitch_url", e.target.value)}
                  placeholder="https://... (direct mp4 link — auto-plays on hover in vendor listings)"
                  type="url"
                />
                <p className="text-[11px] text-slate-400">A short 15–60 second video introducing yourself. Must be a direct video file URL (mp4).</p>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#1e3a5f] text-white font-bold py-3 rounded-xl hover:bg-[#2a4f7c] transition-colors flex items-center justify-center gap-2 text-sm"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          By submitting, you agree to be contacted by our team. Your information will only be used within our vendor network.
        </p>
      </div>
    </div>
  );
}