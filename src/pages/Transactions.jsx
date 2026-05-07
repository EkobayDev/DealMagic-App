import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Pencil, Trash2, ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { AICompsBadge } from "@/components/dashboard/AICompsModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatDistanceToNow, format } from "date-fns";
import TransactionModal from "../components/transactions/TransactionModal";
import TransactionView from "../components/transactions/TransactionView";
import OrderServicesDropdown from "../components/transactions/OrderServicesDropdown";

const STATUS_BADGE = {
  active: "bg-emerald-50 text-emerald-700",
  under_contract: "bg-blue-50 text-blue-700",
  pending: "bg-amber-50 text-amber-700",
  closed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-50 text-red-700",
  expired: "bg-slate-100 text-slate-500",
  coming_soon: "bg-purple-50 text-purple-700",
};

export default function Transactions() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("admins");
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      setEditing(null);
      setModalOpen(true);
    }
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!currentUser && currentUser.role === "admin",
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", currentUser?.email, currentUser?.role],
    queryFn: () =>
      currentUser?.role === "admin"
        ? base44.entities.Transaction.list("-updated_date", 200)
        : base44.entities.Transaction.filter({ created_by: currentUser.email }, "-updated_date", 200),
    enabled: !!currentUser,
  });

  const adminEmails = allUsers.filter(u => u.role === "admin").map(u => u.email);

  // Auto-fill Zillow URL for active listings that are missing it
  useEffect(() => {
    if (!transactions.length) return;
    const missing = transactions.filter(
      (t) => t.status === "active" && !t.listing_url && t.property_address
    );
    missing.forEach((t) => {
      const addr = [t.property_address, t.city, t.state, t.zip].filter(Boolean).join(" ");
      const slug = addr.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-");
      base44.entities.Transaction.update(t.id, {
        listing_url: `https://www.zillow.com/homes/${slug}_rb/`,
      });
    });
    if (missing.length) queryClient.invalidateQueries({ queryKey: ["transactions"] });
  }, [transactions.length]);

  const saveMutation = useMutation({
    mutationFn: ({ data, id }) =>
      id
        ? base44.entities.Transaction.update(id, data)
        : base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const handleSave = async (data, id) => {
    const result = await saveMutation.mutateAsync({ data, id });
    return result;
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Transaction.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const STATUS_ORDER = { active: 0, under_contract: 1, pending: 2, closed: 3, cancelled: 4, expired: 5 };

  const filtered = transactions.filter((t) => {
    const matchSearch = !search ||
      t.property_address?.toLowerCase().includes(search.toLowerCase()) ||
      t.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.seller_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.mls_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchAgent = currentUser?.role !== "admin" || agentFilter === "all"
      ? true
      : agentFilter === "admins"
      ? adminEmails.includes(t.created_by)
      : t.created_by === agentFilter;
    return matchSearch && matchStatus && matchAgent;
  }).sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col items-start">
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500 mt-1 mb-2">{transactions.length} total transactions</p>
          <Button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2"
          >
            <Plus className="w-4 h-4" /> New Transaction
          </Button>
        </div>
        <img
          src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
          alt="DealMagic"
          className="h-40 w-auto object-contain ml-auto"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search address, name, MLS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="under_contract">Under Contract</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="coming_soon">Coming Soon</SelectItem>
          </SelectContent>
        </Select>
        {currentUser?.role === "admin" && (
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admins">Admins Only</SelectItem>
              <SelectItem value="all">All Agents</SelectItem>
              {allUsers.map(u => (
                <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-visible">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3">Property</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3 hidden md:table-cell">Status</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3 hidden lg:table-cell">Price</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3 hidden lg:table-cell">Closing</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3 hidden lg:table-cell">Type</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3 hidden xl:table-cell">Verified</th>
                <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-12 text-sm text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-sm text-slate-400">No transactions found</td></tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <button onClick={() => { setEditing(t); setModalOpen(true); }} className="text-left group">
                        <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 group-hover:underline transition-colors">{t.property_address}</p>
                        <p className="text-xs text-slate-400">{[t.city, t.zip].filter(Boolean).join(", ")}</p>
                      </button>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-full ${STATUS_BADGE[t.status]}`}>
                        {t.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-sm font-medium text-slate-700">
                      {t.purchase_price ? `$${t.purchase_price.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-sm text-slate-500">
                      {t.closing_date ? new Date(t.closing_date + "T00:00:00").toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-sm text-slate-500 capitalize">
                      {t.transaction_type}
                    </td>
                    <td className="px-5 py-3 hidden xl:table-cell">
                      {t.last_verified_at ? (
                        <div className="flex items-center gap-1.5 relative group cursor-default">
                          {t.last_verification_updated
                            ? <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                            : <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                          }
                          <div>
                            <p className={`text-xs font-medium ${t.last_verification_updated ? "text-emerald-600" : "text-slate-500"}`}>
                              {t.last_verification_updated ? "Updated" : "No changes"}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {formatDistanceToNow(new Date(t.last_verified_at), { addSuffix: true })}
                            </p>
                          </div>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-0 mb-2 z-50 hidden group-hover:block w-80 bg-white text-slate-900 text-xs rounded-xl p-3 shadow-xl pointer-events-none border border-slate-200">
                            <p className="font-bold text-slate-900 mb-2 text-[11px] uppercase tracking-wider">
                              {t.last_verification_updated ? "✅ Data Updated" : "ℹ️ No Changes Detected"}
                            </p>
                            {t.last_verification_updated && t.last_verification_changes && Object.keys(t.last_verification_changes).length > 0 ? (
                              <div className="space-y-2 mb-2">
                                {Object.entries(t.last_verification_changes).map(([field, val]) => (
                                  <div key={field} className="bg-slate-50 rounded-lg px-2.5 py-2 border border-slate-200">
                                    <p className="font-semibold text-slate-800 capitalize mb-1">
                                      {field.replace(/_/g, " ")}
                                    </p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded line-through">
                                        {val.from ?? "—"}
                                      </span>
                                      <span className="text-slate-400">→</span>
                                      <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">
                                        {val.to ?? "—"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-500 mb-2">All fields match existing data — no updates were applied.</p>
                            )}
                            <div className="border-t border-slate-200 pt-2 mt-1 space-y-0.5">
                              {t.last_verification_source && (
                                <p className="text-slate-500">📡 Source: <span className="text-slate-700">{t.last_verification_source}</span></p>
                              )}
                              <p className="text-slate-400">
                                🕐 Checked: {format(new Date(t.last_verified_at), "MMM d, yyyy h:mm a")}
                              </p>
                            </div>
                            <div className="absolute top-full left-4 border-4 border-transparent border-t-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-slate-300 shrink-0" />
                          <span className="text-xs text-slate-300">Not checked</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <AICompsBadge transaction={t} />
                        <OrderServicesDropdown transaction={t} />
                        <button onClick={() => { setViewing(t); setViewOpen(true); }} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditing(t); setModalOpen(true); }} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(t)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
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

      <TransactionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); queryClient.invalidateQueries({ queryKey: ["transactions"] }); }}
        transaction={editing}
        onSave={(data, id) => handleSave(data, id ?? editing?.id)}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
      <TransactionView
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        transaction={viewing}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-slate-800">{deleteTarget?.property_address}</span>? This action cannot be undone.
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
    </div>
  );
}