import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, isPast, differenceInDays, parseISO, isToday } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, AlertTriangle, Clock, CheckCircle2, X } from "lucide-react";
import TransactionModal from "../components/transactions/TransactionModal";

const DEADLINE_FIELDS = [
  { key: "inspection_deadline", label: "Inspection" },
  { key: "appraisal_deadline", label: "Appraisal" },
  { key: "financing_deadline", label: "Financing" },
  { key: "title_deadline", label: "Title" },
  { key: "closing_date", label: "Closing" },
  { key: "possession_date", label: "Possession" },
];

export default function Deadlines() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingTx, setEditingTx] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", currentUser?.email, currentUser?.role],
    queryFn: () =>
      currentUser?.role === "admin"
        ? base44.entities.Transaction.list("-updated_date", 200)
        : base44.entities.Transaction.filter({ created_by: currentUser.email }, "-updated_date", 200),
    enabled: !!currentUser,
  });

  const saveMutation = useMutation({
    mutationFn: ({ data, id }) =>
      id ? base44.entities.Transaction.update(id, data) : base44.entities.Transaction.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const deadlines = [];
  transactions.forEach((t) => {
    if (t.status === "cancelled" || t.status === "expired") return;
    DEADLINE_FIELDS.forEach((f) => {
      if (t[f.key]) {
        const date = parseISO(t[f.key]);
        const daysOut = differenceInDays(date, new Date());
        const overdue = isPast(date) && !isToday(date);
        const urgent = daysOut >= 0 && daysOut <= 3;
        const completed = t.status === "closed" && f.key === "closing_date";

        deadlines.push({
          id: `${t.id}-${f.key}`,
          txId: t.id,
          fieldKey: f.key,
          tx: t,
          type: f.label,
          date,
          daysOut,
          overdue,
          urgent,
          completed,
          address: t.property_address,
          status: t.status,
        });
      }
    });
  });

  deadlines.sort((a, b) => a.date - b.date);

  const filtered = deadlines.filter((d) => {
    const matchSearch = !search || d.address.toLowerCase().includes(search.toLowerCase()) || d.type.toLowerCase().includes(search.toLowerCase());
    if (filter === "overdue") return matchSearch && d.overdue && !d.completed;
    if (filter === "urgent") return matchSearch && d.urgent && !d.completed;
    if (filter === "upcoming") return matchSearch && !d.overdue && !d.completed;
    return matchSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Deadline Tracker</h1>
          <p className="text-sm text-slate-500 mt-1">Keep every deal on schedule</p>
        </div>
        <img
          src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
          alt="DealMagic"
          className="h-40 w-auto object-contain ml-auto"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{deadlines.filter((d) => d.overdue && !d.completed).length}</p>
          <p className="text-xs font-medium text-red-500">Overdue</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{deadlines.filter((d) => d.urgent && !d.completed).length}</p>
          <p className="text-xs font-medium text-amber-500">Urgent (≤3 days)</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{deadlines.filter((d) => !d.overdue && !d.urgent && !d.completed).length}</p>
          <p className="text-xs font-medium text-emerald-500">On Track</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search deadlines..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Deadlines</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Deadline List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-sm text-slate-400">
            No deadlines match your filters
          </div>
        )}
        {filtered.map((d) => (
          <div
            key={d.id}
            className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-colors ${
              d.completed
                ? "border-slate-100 opacity-60"
                : d.overdue
                ? "border-red-200 bg-red-50/30"
                : d.urgent
                ? "border-amber-200 bg-amber-50/30"
                : "border-slate-100"
            }`}
          >
            {d.completed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            ) : d.overdue ? (
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            ) : d.urgent ? (
              <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
            ) : (
              <Clock className="w-5 h-5 text-slate-300 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <button onClick={() => setEditingTx(d.tx)} className="text-left w-full hover:underline">
                <p className="text-sm font-medium text-blue-700 truncate">{d.address}</p>
                <p className="text-xs text-slate-400">{d.type} Deadline</p>
              </button>
            </div>
            <div className="text-right flex-shrink-0 flex items-center gap-3">
              <div>
                <p className={`text-sm font-semibold ${
                  d.completed ? "text-emerald-600" : d.overdue ? "text-red-600" : d.urgent ? "text-amber-600" : "text-slate-700"
                }`}>
                  {d.completed ? "Done" : d.overdue ? `${Math.abs(d.daysOut)}d overdue` : d.daysOut === 0 ? "Today" : `${d.daysOut} days`}
                </p>
                <p className="text-xs text-slate-400">{format(d.date, "MMM d, yyyy")}</p>
              </div>
              <button
                onClick={() => saveMutation.mutate({ id: d.txId, data: { [d.fieldKey]: null } })}
                className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Clear this deadline"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <TransactionModal
        open={!!editingTx}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        onSave={(data, id) => saveMutation.mutateAsync({ data, id: id || editingTx?.id })}
      />
    </div>
  );
}