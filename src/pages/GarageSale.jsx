import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ExternalLink, Tag, ShoppingBag, Eye, EyeOff, CheckCircle2, Pencil, Trash2, Bell, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import GarageSaleModal from "@/components/garagesale/GarageSaleModal";

const CATEGORY_LABELS = {
  furniture: "Furniture",
  electronics: "Electronics",
  clothing: "Clothing",
  tools: "Tools",
  appliances: "Appliances",
  books: "Books",
  toys: "Toys",
  sports: "Sports",
  vehicles: "Vehicles",
  other: "Other",
};

const CATEGORY_COLORS = {
  furniture: "bg-amber-50 text-amber-700",
  electronics: "bg-blue-50 text-blue-700",
  clothing: "bg-pink-50 text-pink-700",
  tools: "bg-orange-50 text-orange-700",
  appliances: "bg-slate-100 text-slate-700",
  books: "bg-emerald-50 text-emerald-700",
  toys: "bg-purple-50 text-purple-700",
  sports: "bg-teal-50 text-teal-700",
  vehicles: "bg-red-50 text-red-700",
  other: "bg-slate-50 text-slate-500",
};

const STATUS_CONFIG = {
  active: { label: "Active", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  sold: { label: "Sold", cls: "bg-red-50 text-red-700 border-red-200" },
  inactive: { label: "Inactive", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

export default function GarageSale() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [sendingNotice, setSendingNotice] = useState(false);
  const [noticeSent, setNoticeSent] = useState(false);

  const handleSendUpdateNotice = async () => {
    setSendingNotice(true);
    setNoticeSent(false);
    await base44.functions.invoke("garageSaleReminder", {});
    setSendingNotice(false);
    setNoticeSent(true);
    setTimeout(() => setNoticeSent(false), 3000);
  };

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["garage_sale_listings"],
    queryFn: () => base44.entities.GarageSaleListing.list("-created_date", 200),
  });

  const saveMutation = useMutation({
    mutationFn: ({ data, id }) =>
      id ? base44.entities.GarageSaleListing.update(id, data) : base44.entities.GarageSaleListing.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["garage_sale_listings"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GarageSaleListing.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["garage_sale_listings"] }),
  });

  const toggleStatus = (listing) => {
    if (listing.status === "active") {
      saveMutation.mutate({ id: listing.id, data: { status: "inactive" } });
    } else if (listing.status === "inactive") {
      saveMutation.mutate({ id: listing.id, data: { status: "active" } });
    }
  };

  const markSold = (listing) => {
    saveMutation.mutate({ id: listing.id, data: { status: "sold", date_sold: new Date().toISOString().split("T")[0] } });
  };

  const canEdit = (listing) =>
    currentUser && (currentUser.role === "admin" || listing.created_by === currentUser.email);

  const filtered = listings.filter((l) => {
    const matchSearch =
      !search ||
      l.title?.toLowerCase().includes(search.toLowerCase()) ||
      l.description?.toLowerCase().includes(search.toLowerCase()) ||
      l.seller_name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || l.category === categoryFilter;
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  const activeCount = listings.filter((l) => l.status === "active").length;
  const soldCount = listings.filter((l) => l.status === "sold").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col items-start">
          <h1 className="text-2xl font-bold text-slate-900">Garage Sale</h1>
          <p className="text-sm text-slate-500 mt-1 mb-3">Buy & sell items within the team</p>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => { setEditing(null); setModalOpen(true); }}
              className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2"
            >
              <Plus className="w-4 h-4" /> Post Item
            </Button>
            {currentUser?.role === "admin" && (
              <button
                onClick={handleSendUpdateNotice}
                disabled={sendingNotice}
                title="Send Update Notices to posters with active Garage Sale items"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${noticeSent ? "bg-emerald-50 text-emerald-600 border border-emerald-400" : "bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600]"}`}
              >
                {sendingNotice ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : noticeSent ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                {noticeSent ? "Notices Sent!" : "Update Notice"}
              </button>
            )}
          </div>
        </div>
        <img
          src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
          alt="DealMagic"
          className="h-32 w-auto object-contain"
          style={{ mixBlendMode: "multiply" }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{activeCount}</p>
          <p className="text-xs font-medium text-emerald-500">Active Listings</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{soldCount}</p>
          <p className="text-xs font-medium text-red-500">Sold</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-700">{listings.length}</p>
          <p className="text-xs font-medium text-slate-400">Total Posted</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center text-slate-400">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-medium">No listings found</p>
          <p className="text-xs mt-1">Be the first to post an item!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              canEdit={canEdit(listing)}
              onEdit={() => { setEditing(listing); setModalOpen(true); }}
              onToggle={() => toggleStatus(listing)}
              onMarkSold={() => markSold(listing)}
              onDelete={() => { if (confirm("Delete this listing?")) deleteMutation.mutate(listing.id); }}
            />
          ))}
        </div>
      )}

      <GarageSaleModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        listing={editing}
        onSave={(data) => saveMutation.mutateAsync({ data, id: editing?.id })}
        currentUser={currentUser}
      />
    </div>
  );
}

function ListingCard({ listing, canEdit, onEdit, onToggle, onMarkSold, onDelete }) {
  const statusCfg = STATUS_CONFIG[listing.status] || STATUS_CONFIG.active;
  const catColor = CATEGORY_COLORS[listing.category] || CATEGORY_COLORS.other;
  const mainPhoto = listing.photo_urls?.[0];

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-shadow ${listing.status === "inactive" ? "opacity-60" : "border-slate-100"}`}>
      {/* Photo */}
      {mainPhoto ? (
        <img src={mainPhoto} alt={listing.title} className="w-full h-44 object-cover" />
      ) : (
        <div className="w-full h-44 bg-slate-50 flex items-center justify-center">
          <ShoppingBag className="w-10 h-10 text-slate-200" />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Title + Status */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900 leading-snug">{listing.title}</p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${statusCfg.cls}`}>
            {statusCfg.label}
          </span>
        </div>

        {/* Price */}
        {listing.price != null && (
          <p className="text-xl font-bold text-slate-900">${Number(listing.price).toLocaleString()}</p>
        )}

        {/* Category */}
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${catColor}`}>
          <Tag className="w-3 h-3" />
          {CATEGORY_LABELS[listing.category] || listing.category}
        </span>

        {/* Description */}
        {listing.description && (
          <p className="text-xs text-slate-500 line-clamp-2">{listing.description}</p>
        )}

        {/* Notes */}
        {listing.notes && (
          <p className="text-xs text-slate-500 italic">{listing.notes}</p>
        )}

        {/* Link */}
        {listing.link && (
          <a href={listing.link} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> View Listing
          </a>
        )}

        {/* Seller + Dates */}
        <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-50">
          {listing.seller_name && <p>Posted by {listing.seller_name}</p>}
          {listing.created_date && (
            <p>Posted {format(parseISO(listing.created_date), "MMM d, yyyy")}</p>
          )}
          {listing.date_sold && (
            <p className="text-red-500 font-medium">Sold {format(parseISO(listing.date_sold), "MMM d, yyyy")}</p>
          )}
          {listing.contact_info && <p>Contact: {listing.contact_info}</p>}
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex items-center gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1 text-xs h-7 px-2">
              <Pencil className="w-3 h-3" /> Edit
            </Button>
            {listing.status !== "sold" && (
              <>
                <Button variant="outline" size="sm" onClick={onToggle} className="gap-1 text-xs h-7 px-2">
                  {listing.status === "active" ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {listing.status === "active" ? "Deactivate" : "Activate"}
                </Button>
                <Button variant="outline" size="sm" onClick={onMarkSold} className="gap-1 text-xs h-7 px-2 text-red-600 border-red-200 hover:bg-red-50">
                  <CheckCircle2 className="w-3 h-3" /> Sold
                </Button>
              </>
            )}
            <button onClick={onDelete} className="ml-auto p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}