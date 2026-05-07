import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Globe, Mail, Phone, MapPin, Star, Heart, CreditCard, Link, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Link as RouterLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import VendorModal from "@/components/vendors/VendorModal";
import VendorPaymentModal from "@/components/vendors/VendorPaymentModal";
import OrderServicesDropdown from "@/components/transactions/OrderServicesDropdown.jsx";

const CATEGORIES = [
  { value: "all", label: "All" },
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

const CATEGORY_COLORS = {
  appraisers: "bg-purple-100 text-purple-700",
  inspectors: "bg-blue-100 text-blue-700",
  lawn: "bg-green-100 text-green-700",
  roofers: "bg-orange-100 text-orange-700",
  termite: "bg-red-100 text-red-700",
  title: "bg-teal-100 text-teal-700",
  make_ready_cleaning: "bg-pink-100 text-pink-700",
  painters: "bg-indigo-100 text-indigo-700",
  flooring: "bg-amber-100 text-amber-700",
  handyman: "bg-cyan-100 text-cyan-700",
  hauling_debris: "bg-stone-100 text-stone-700",
};

export default function Vendors() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [payingVendor, setPayingVendor] = useState(null);
  const [filterCat, setFilterCat] = useState("all");
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then((u) => { setCurrentUserEmail(u?.email); setCurrentUser(u); }).catch(() => {});
  }, []);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => base44.entities.Vendor.list("business_name", 500),
  });

  const { data: pendingVendors = [] } = useQuery({
    queryKey: ["pending_vendors"],
    queryFn: () => base44.entities.PendingVendor.filter({ status: "pending" }, "-created_date", 100),
    enabled: currentUser?.role === "admin",
  });

  const saveMutation = useMutation({
    mutationFn: ({ data, id }) =>
      id ? base44.entities.Vendor.update(id, data) : base44.entities.Vendor.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendors"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vendor.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendors"] }),
  });

  const handleSave = async (form) => {
    await saveMutation.mutateAsync({ data: form, id: editingVendor?.id });
    setModalOpen(false);
    setEditingVendor(null);
  };

  const likeMutation = useMutation({
    mutationFn: ({ vendor, email }) => {
      const liked_by = vendor.liked_by || [];
      const already = liked_by.includes(email);
      const updated = already ? liked_by.filter((e) => e !== email) : [...liked_by, email];
      return base44.entities.Vendor.update(vendor.id, { liked_by: updated });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendors"] }),
  });

  const handleLike = (vendor) => {
    if (!currentUserEmail) return;
    likeMutation.mutate({ vendor, email: currentUserEmail });
  };

  const handleEdit = (vendor) => { setEditingVendor(vendor); setModalOpen(true); };
  const handleDelete = (vendor) => {
    if (confirm(`Delete ${vendor.business_name}?`)) deleteMutation.mutate(vendor.id);
  };

  const filtered = filterCat === "all" ? vendors : vendors.filter((v) => v.category === filterCat);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendor List</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your trusted service providers</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Registration link */}
          <button
            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/VendorRegister`); toast.success("Registration link copied!"); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700 text-xs font-medium transition-colors"
            title={`${window.location.origin}/VendorRegister`}
          >
            <Link className="w-3.5 h-3.5" /> Copy Registration Link
          </button>
          {currentUser?.role === "admin" && (
            <RouterLink
              to="/VendorApprovals"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold transition-colors relative"
            >
              <Clock className="w-3.5 h-3.5" /> Pending Approvals
              {pendingVendors.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingVendors.length}
                </span>
              )}
            </RouterLink>
          )}
          <Button
            onClick={() => { setEditingVendor(null); setModalOpen(true); }}
            className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2"
          >
            <Plus className="w-4 h-4" /> Add Vendor
          </Button>
        </div>
      </div>

      {/* Pending vendors banner (admin only) */}
      {currentUser?.role === "admin" && pendingVendors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-sm font-semibold text-amber-800">
              {pendingVendors.length} vendor{pendingVendors.length !== 1 ? "s" : ""} awaiting approval
            </p>
            <RouterLink to="/VendorApprovals" className="text-xs text-amber-700 underline hover:text-amber-900">
              View all →
            </RouterLink>
          </div>
          <div className="space-y-2">
            {pendingVendors.slice(0, 3).map((pv) => (
              <div key={pv.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-amber-100">
                {pv.contact_photo_url ? (
                  <img src={pv.contact_photo_url} alt={pv.contact_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-sm shrink-0">
                    {pv.business_name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{pv.business_name}</p>
                  <p className="text-xs text-slate-400">{pv.contact_name} · {pv.category?.replace(/_/g, " ")}</p>
                </div>
                <RouterLink
                  to="/VendorApprovals"
                  className="text-xs px-2.5 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-semibold shrink-0"
                >
                  Review
                </RouterLink>
              </div>
            ))}
            {pendingVendors.length > 3 && (
              <p className="text-xs text-amber-600 text-center pt-1">+{pendingVendors.length - 3} more pending</p>
            )}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilterCat(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              filterCat === c.value
                ? "bg-[#FFFF00] border-yellow-400 text-slate-900"
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Vendor Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No vendors found. Add your first vendor!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((vendor) => (
            <div key={vendor.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow">
              {/* Top row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  {vendor.logo_url ? (
                    <img src={vendor.logo_url} alt={vendor.business_name} className="h-10 w-10 object-contain rounded-lg border border-slate-100 shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-sm font-bold shrink-0">
                      {vendor.business_name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate text-[17px]">{vendor.business_name}</p>
                    <span className={`text-[13px] font-semibold uppercase px-2 py-0.5 rounded-full ${CATEGORY_COLORS[vendor.category] || "bg-slate-100 text-slate-500"}`}>
                      {vendor.category}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 items-center">
                  <button
                    onClick={() => handleLike(vendor)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors text-[12px] font-medium border ${currentUserEmail && (vendor.liked_by || []).includes(currentUserEmail) ? "bg-pink-50 border-pink-200 text-pink-600" : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-pink-50 hover:border-pink-200 hover:text-pink-500"}`}
                    title="Like this vendor"
                  >
                    <Heart className={`w-3.5 h-3.5 ${currentUserEmail && (vendor.liked_by || []).includes(currentUserEmail) ? "fill-pink-500 text-pink-500" : ""}`} />
                    {(vendor.liked_by || []).length > 0
                      ? <span>{vendor.liked_by.length} {vendor.liked_by.length === 1 ? "like" : "likes"}</span>
                      : <span>Like</span>
                    }
                  </button>
                  <button
                    onClick={() => setPayingVendor(vendor)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-[12px] font-medium"
                    title="Pay or Invoice this vendor"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Pay
                  </button>
                  <OrderServicesDropdown transaction={null} preselectedVendor={vendor} />
                  <button onClick={() => handleEdit(vendor)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(vendor)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-xs text-slate-500">
                {(vendor.contact_name || vendor.contact_photo_url) && (
                  <div className="flex items-center gap-3 py-1">
                    {vendor.contact_photo_url ? (
                      <img src={vendor.contact_photo_url} alt={vendor.contact_name} className="h-[74px] w-[74px] object-cover rounded-full border-2 border-slate-200 shrink-0" />
                    ) : (
                      <div className="h-[74px] w-[74px] rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl font-bold shrink-0">
                        {vendor.contact_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    {vendor.contact_name && <p className="font-semibold text-slate-700 text-[16px]">{vendor.contact_name}</p>}
                  </div>
                )}
                {vendor.cell_phone && (
                  <div className="flex items-center gap-1.5 text-[15px]"><Phone className="w-3 h-3" /> {vendor.cell_phone}</div>
                )}
                {vendor.email && (
                  <div className="flex items-center gap-1.5 text-[15px]"><Mail className="w-3 h-3" />
                    <a href={`mailto:${vendor.email}`} className="hover:text-blue-600 truncate">{vendor.email}</a>
                  </div>
                )}
                {vendor.website && (
                  <div className="flex items-center gap-1.5 text-[15px]"><Globe className="w-3 h-3" />
                    <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 truncate">{vendor.website.replace(/^https?:\/\//, "")}</a>
                  </div>
                )}
                {(vendor.city || vendor.state) && (
                  <div className="flex items-center gap-1.5 text-[15px]"><MapPin className="w-3 h-3" /> {[vendor.city, vendor.state, vendor.zip].filter(Boolean).join(", ")}</div>
                )}
                {vendor.star_rating > 0 && (
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`w-3 h-3 ${s <= vendor.star_rating ? "fill-yellow-400 text-yellow-400" : "text-slate-200"}`} />
                    ))}
                  </div>
                )}
                {vendor.review_notes && <p className="text-slate-500 mt-1 line-clamp-2 italic">"{vendor.review_notes}"</p>}
                {vendor.notes && <p className="text-slate-400 italic mt-1 line-clamp-2">{vendor.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <VendorModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingVendor(null); }}
        vendor={editingVendor}
        onSave={handleSave}
        allVendors={vendors}
      />
      <VendorPaymentModal
        open={!!payingVendor}
        onClose={() => setPayingVendor(null)}
        vendor={payingVendor}
      />
    </div>
  );
}