import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, Pencil, Trash2, Mail, Phone, Link2, Eye } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ContactModal from "@/components/contacts/ContactModal";
import ContactViewModal from "@/components/contacts/ContactViewModal";
import ListingSearchModal from "@/components/contacts/ListingSearchModal";

const ROLE_BADGE = {
  buyer: "bg-blue-50 text-blue-700",
  seller: "bg-emerald-50 text-emerald-700",
  lender: "bg-purple-50 text-purple-700",
  title: "bg-amber-50 text-amber-700",
  agent: "bg-slate-100 text-slate-700",
  other: "bg-slate-50 text-slate-500",
};

export default function Contacts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchContact, setSearchContact] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", currentUser?.email, currentUser?.role],
    queryFn: () =>
      currentUser?.role === "admin"
        ? base44.entities.Contact.list("-created_date", 200)
        : base44.entities.Contact.filter({ created_by: currentUser.email }, "-created_date", 200),
    enabled: !!currentUser,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", currentUser?.email, currentUser?.role],
    queryFn: () =>
      currentUser?.role === "admin"
        ? base44.entities.Transaction.list("-updated_date", 200)
        : base44.entities.Transaction.filter({ created_by: currentUser.email }, "-updated_date", 200),
    enabled: !!currentUser,
  });

  const saveMutation = useMutation({
    mutationFn: ({ data, id }) =>
      id ? base44.entities.Contact.update(id, data) : base44.entities.Contact.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });

  const handleSave = (data) => saveMutation.mutateAsync({ data, id: editing?.id });

  const filtered = contacts.filter(
    (c) =>
      !search ||
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  const txMap = Object.fromEntries(transactions.map((t) => [t.id, t.property_address]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col items-start">
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-1 mb-2">{contacts.length} total clients</p>
          <Button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2"
          >
            <Plus className="w-4 h-4" /> New Client
          </Button>
        </div>
        <img
          src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
          alt="DealMagic"
          className="h-40 w-auto object-contain ml-auto"
          style={{ mixBlendMode: "multiply" }}
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-sm text-slate-400">
          No clients found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{c.full_name}</p>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full mt-1 inline-block ${ROLE_BADGE[c.role] || ROLE_BADGE.other}`}>
                    {c.role}
                  </span>
                </div>
                <div className="flex gap-1">
                  {c.notes && (
                    <button onClick={() => setSearchContact(c)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="Search listings by notes">
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => setViewing(c)} className="p-1.5 text-slate-400 hover:text-violet-600 rounded-lg hover:bg-violet-50 transition-colors" title="View contact details">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setEditing(c); setModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors" title="Edit contact">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" title="Delete contact">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-500">
                {c.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{c.phone}</p>}
                {c.email && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{c.email}</p>}
              </div>
              {c.notes && <p className="mt-3 text-xs text-slate-400 italic line-clamp-2">{c.notes}</p>}
              {c.transaction_ids?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-50">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Linked Transactions
                  </p>
                  <div className="space-y-1">
                    {c.transaction_ids.map((id) => (
                      <p key={id} className="text-xs text-slate-600 truncate">{txMap[id] || id}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ContactModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        contact={editing}
        onSave={handleSave}
        transactions={transactions}
      />
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-slate-800">{deleteTarget?.full_name}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="relative">
            <img
              src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
              alt="DealMagic"
              className="absolute left-0 bottom-0 h-12 w-auto object-contain"
              style={{ mixBlendMode: "multiply" }}
            />
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ContactViewModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        contact={viewing}
        txMap={txMap}
      />

      <ListingSearchModal
        open={!!searchContact}
        onClose={() => setSearchContact(null)}
        contact={searchContact}
      />
    </div>
  );
}