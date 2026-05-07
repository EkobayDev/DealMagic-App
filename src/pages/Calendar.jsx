import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import TransactionModal from "../components/transactions/TransactionModal";

const EVENT_TYPES = [
  { key: "closing_date",        label: "Closing",    color: "bg-green-500",  text: "text-green-700",  bg: "bg-green-50" },
  { key: "contract_date",       label: "Contract",   color: "bg-blue-500",   text: "text-blue-700",   bg: "bg-blue-50" },
  { key: "inspection_deadline", label: "Inspection", color: "bg-yellow-400", text: "text-yellow-700", bg: "bg-yellow-50" },
  { key: "appraisal_deadline",  label: "Appraisal",  color: "bg-purple-500", text: "text-purple-700", bg: "bg-purple-50" },
  { key: "financing_deadline",  label: "Financing",  color: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50" },
  { key: "possession_date",     label: "Possession", color: "bg-teal-500",   text: "text-teal-700",   bg: "bg-teal-50" },
];

function buildEvents(transactions) {
  const events = [];
  transactions.forEach((tx) => {
    EVENT_TYPES.forEach(({ key, label, color, text, bg }) => {
      if (tx[key]) {
        events.push({
          date: tx[key],
          label,
          color,
          text,
          bg,
          address: tx.property_address,
          status: tx.status,
          txId: tx.id,
        });
      }
    });
  });
  return events;
}

export default function Calendar() {
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState(null);
  const [editingTx, setEditingTx] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const qc = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!currentUser && currentUser.role === "admin",
  });

  const adminEmails = allUsers.filter(u => u.role === "admin").map(u => u.email);

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

  const openTx = (txId, e) => {
    e?.stopPropagation();
    const tx = transactions.find((t) => t.id === txId);
    if (tx) setEditingTx(tx);
  };

  const events = useMemo(() => buildEvents(transactions), [transactions]);

  const eventsOnDay = (day) =>
    events.filter((e) => isSameDay(new Date(e.date + "T00:00:00"), day));

  // Build calendar grid (6 weeks)
  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const days = [];
  let d = gridStart;
  while (d <= gridEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const selectedEvents = selected ? eventsOnDay(selected) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transaction Calendar</h1>
          <p className="text-sm text-slate-500 mt-1">Closings, deadlines & key dates</p>
        </div>
        <img
          src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
          alt="DealMagic"
          className="h-40 w-auto object-contain"
          style={{ mixBlendMode: 'multiply' }}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrent(subMonths(current, 1))}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-semibold text-slate-800 w-36 text-center">
            {format(current, "MMMM yyyy")}
          </span>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrent(new Date())}
            className="ml-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:border-slate-300 text-slate-600 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {EVENT_TYPES.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const dayEvents = eventsOnDay(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, current);
              const isSelected = selected && isSameDay(day, selected);

              return (
                <div
                  key={i}
                  onClick={() => setSelected(isSelected ? null : day)}
                  className={`min-h-[90px] p-2 border-b border-r border-slate-50 cursor-pointer transition-colors
                    ${!isCurrentMonth ? "bg-slate-50/50" : "hover:bg-slate-50"}
                    ${isSelected ? "ring-2 ring-inset ring-[#FFFF00]" : ""}
                  `}
                >
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1
                    ${isToday ? "bg-[#0a1628] text-[#FFFF00]" : isCurrentMonth ? "text-slate-700" : "text-slate-300"}
                  `}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev, idx) => (
                      <div
                        key={idx}
                        onClick={(e) => openTx(ev.txId, e)}
                        className={`flex flex-col rounded px-1 py-0.5 cursor-pointer hover:opacity-80 ${ev.bg}`}
                      >
                        <div className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.color}`} />
                          <span className={`text-[13px] font-medium truncate ${ev.text}`}>{ev.label}</span>
                        </div>
                        {(() => {
                          const parts = (ev.address || "").split(" ");
                          const num = parts[0];
                          const street = parts.slice(1).join(" ");
                          return (
                            <>
                              <span className="text-[12px] text-slate-500 truncate pl-2.5">{num}</span>
                              <span className="text-[12px] text-slate-500 truncate pl-2.5">{street}</span>
                            </>
                          );
                        })()}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[13px] text-slate-400 pl-1">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day detail panel */}
      {selected && selectedEvents.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            {format(selected, "EEEE, MMMM d, yyyy")}
          </h3>
          <div className="space-y-3">
            {selectedEvents.map((ev, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${ev.bg}`}>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ev.color}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${ev.text}`}>{ev.label}</p>
                  <button
                    onClick={() => openTx(ev.txId)}
                    className="text-xs text-blue-600 hover:underline truncate text-left"
                  >
                    {ev.address}
                  </button>
                </div>
                <span className="ml-auto text-[10px] font-medium text-slate-400 uppercase shrink-0">
                  {ev.status?.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <TransactionModal
        open={!!editingTx}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        onSave={(data, id) => saveMutation.mutateAsync({ data, id: id || editingTx?.id })}
        initialStep={3}
      />
    </div>
  );
}