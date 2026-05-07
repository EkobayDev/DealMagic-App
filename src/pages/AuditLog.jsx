import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileClock, PlusCircle, PenLine, Trash2, ChevronDown, ChevronUp } from "lucide-react";

const EVENT_CONFIG = {
  create: { label: "Created", icon: PlusCircle, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  update: { label: "Updated", icon: PenLine, cls: "bg-blue-50 text-blue-700 border-blue-200" },
  delete: { label: "Deleted", icon: Trash2, cls: "bg-red-50 text-red-700 border-red-200" },
};

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["transaction_audit_logs", currentUser?.email, currentUser?.role],
    queryFn: () =>
      currentUser?.role === "admin"
        ? base44.entities.TransactionAuditLog.list("-created_date", 500)
        : base44.entities.TransactionAuditLog.filter({ changed_by: currentUser.email }, "-created_date", 500),
    enabled: !!currentUser,
  });

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = logs.filter((log) => {
    const matchSearch =
      !search ||
      log.transaction_address?.toLowerCase().includes(search.toLowerCase()) ||
      log.changed_by?.toLowerCase().includes(search.toLowerCase()) ||
      log.changed_by_name?.toLowerCase().includes(search.toLowerCase());
    const matchEvent = eventFilter === "all" || log.event_type === eventFilter;
    return matchSearch && matchEvent;
  });

  // Group by date
  const grouped = filtered.reduce((acc, log) => {
    const day = format(parseISO(log.created_date), "MMMM d, yyyy");
    if (!acc[day]) acc[day] = [];
    acc[day].push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transaction Audit Log</h1>
          <p className="text-sm text-slate-500 mt-1">Chronological history of all transaction changes</p>
        </div>
        <img
          src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
          alt="DealMagic"
          className="h-32 w-auto object-contain"
          style={{ mixBlendMode: "multiply" }}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by address or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="create">Created</SelectItem>
            <SelectItem value="update">Updated</SelectItem>
            <SelectItem value="delete">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{logs.filter((l) => l.event_type === "create").length}</p>
          <p className="text-xs font-medium text-emerald-500">Created</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{logs.filter((l) => l.event_type === "update").length}</p>
          <p className="text-xs font-medium text-blue-500">Updated</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{logs.filter((l) => l.event_type === "delete").length}</p>
          <p className="text-xs font-medium text-red-500">Deleted</p>
        </div>
      </div>

      {/* Log Timeline */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center text-slate-400">
          <FileClock className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-medium">No audit log entries yet</p>
          <p className="text-xs mt-1">Changes to transactions will appear here automatically</p>
        </div>
      ) : (
        Object.entries(grouped).map(([day, dayLogs]) => (
          <div key={day}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">{day}</p>
            <div className="space-y-2">
              {dayLogs.map((log) => {
                const cfg = EVENT_CONFIG[log.event_type] || EVENT_CONFIG.update;
                const Icon = cfg.icon;
                const isExpanded = expandedIds.has(log.id);
                const hasChanges = log.changes?.length > 0;

                return (
                  <div key={log.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                    <div
                      className={`flex items-center gap-4 px-5 py-4 ${hasChanges ? "cursor-pointer hover:bg-slate-50/50" : ""} transition-colors`}
                      onClick={() => hasChanges && toggleExpand(log.id)}
                    >
                      {/* Event badge */}
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 shrink-0 ${cfg.cls}`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>

                      {/* Address */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {log.transaction_address || "Unknown Property"}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {log.changed_by_name || log.changed_by || "System"}
                          {log.changed_by && log.changed_by_name && (
                            <span className="ml-1 text-slate-300">· {log.changed_by}</span>
                          )}
                        </p>
                      </div>

                      {/* Time + changes count */}
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <div>
                          <p className="text-xs font-medium text-slate-600">
                            {format(parseISO(log.created_date), "h:mm a")}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatDistanceToNow(parseISO(log.created_date), { addSuffix: true })}
                          </p>
                        </div>
                        {hasChanges && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                              {log.changes.length} field{log.changes.length !== 1 ? "s" : ""}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded changes */}
                    {isExpanded && hasChanges && (
                      <div className="px-5 pb-4 border-t border-slate-50">
                        <div className="mt-3 space-y-2">
                          {log.changes.map((change, i) => (
                            <div key={i} className="bg-slate-50 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                              <p className="text-xs font-semibold text-slate-700 w-44 shrink-0 capitalize">
                                {change.field}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap text-xs">
                                {change.old_value ? (
                                  <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 line-through">
                                    {change.old_value}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 italic">empty</span>
                                )}
                                <span className="text-slate-400 font-bold">→</span>
                                {change.new_value ? (
                                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 font-semibold">
                                    {change.new_value}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 italic">cleared</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}