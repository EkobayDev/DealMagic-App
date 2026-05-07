import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { Loader2, X, ImagePlus } from "lucide-react";

const CATEGORIES = [
  "furniture","electronics","clothing","tools","appliances","books","toys","sports","vehicles","other"
];

const CATEGORY_LABELS = {
  furniture: "Furniture", electronics: "Electronics", clothing: "Clothing", tools: "Tools",
  appliances: "Appliances", books: "Books", toys: "Toys", sports: "Sports", vehicles: "Vehicles", other: "Other",
};

const empty = () => ({
  title: "", description: "", category: "other", price: "", link: "",
  notes: "", contact_info: "", seller_name: "", photo_urls: [], status: "active",
});

export default function GarageSaleModal({ open, onClose, listing, onSave, currentUser }) {
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (listing) {
      setForm({ ...empty(), ...listing, price: listing.price ?? "" });
    } else {
      setForm({
        ...empty(),
        seller_name: currentUser?.full_name || "",
        seller_email: currentUser?.email || "",
      });
    }
  }, [listing, open, currentUser]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, photo_urls: [...(f.photo_urls || []), file_url] }));
    setUploading(false);
  };

  const removePhoto = (idx) => {
    setForm((f) => ({ ...f, photo_urls: f.photo_urls.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...form, price: form.price !== "" ? Number(form.price) : null });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{listing ? "Edit Listing" : "Post Item for Sale"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-slate-500">Title *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="What are you selling?" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Price ($)</Label>
              <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-500">Description</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the item, condition, etc." rows={3} />
          </div>

          <div>
            <Label className="text-xs text-slate-500">External Link (optional)</Label>
            <Input value={form.link} onChange={(e) => set("link", e.target.value)} placeholder="https://..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Seller Name</Label>
              <Input value={form.seller_name} onChange={(e) => set("seller_name", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Contact Info</Label>
              <Input value={form.contact_info} onChange={(e) => set("contact_info", e.target.value)} placeholder="Phone or preferred method" />
            </div>
          </div>

          {/* Photos */}
          <div>
            <Label className="text-xs text-slate-500 mb-2 block">Photos</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.photo_urls?.map((url, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(idx)}
                    className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-black">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 transition-colors text-slate-400">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                <span className="text-[10px] mt-1">{uploading ? "Uploading…" : "Add Photo"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} disabled={uploading} />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : listing ? "Save Changes" : "Post Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}