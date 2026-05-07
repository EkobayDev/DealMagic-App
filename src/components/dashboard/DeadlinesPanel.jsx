import React from "react";
import { format, isPast, differenceInDays, parseISO } from "date-fns";
import { Clock, AlertTriangle, ChevronRight, X } from "lucide-react";
import { Link } from "react-router-dom";

const DEADLINE_FIELDS = [
  { key: "inspection_deadline", label: "Inspection" },
  { key: "appraisal_deadline", label: "Appraisal" },
  { key: "financing_deadline", label: "Financing" },
  { key: "title_deadline", label: "Title" },
  { key: "closing_date", label: "Closing" },
];

export default function DeadlinesPanel({ transactions, onEditTx, onClearDeadline }) {
  const deadlines = [];

  transactions.forEach((t) => {
    if (t.status === "closed" || t.status === "cancelled") return;
    DEADLINE_FIELDS.forEach((f) => {
      if (t[f.key]) {
        const date = parseISO(t[f.key]);
        const daysOut = differenceInDays(date, new Date());
        if (daysOut <= 14) {
          deadlines.push({
            id: `${t.id}-${f.key}`,
            txId: t.id,
            fieldKey: f.key,
            type: f.label,
            date,
            daysOut,
            overdue: isPast(date),
            address: t.property_address,
            tx: t,
          });
        }
      }
    });
  });

  deadlines.sort((a, b) => a.date - b.date);
  const top5 = deadlines.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#FFFF00]" />
          Upcoming Deadlines
        </h3>
        <Link to="/Deadlines" className="text-xs font-medium text-[#cccc00] hover:text-[#FFFF00] flex items-center gap-1">
          View All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-slate-50">
        {top5.length === 0 && (
          <div className="p-6 text-center text-sm text-slate-400">No upcoming deadlines</div>
        )}
        {top5.map((d) => (
          <div key={d.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/50 transition-colors">
            {d.overdue ? (
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            ) : d.daysOut <= 3 ? (
              <div className="w-4 h-4 rounded-full bg-amber-400 flex-shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-emerald-400 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <button onClick={() => onEditTx?.(d.tx)} className="text-left w-full hover:underline">
                <p className="text-sm font-medium text-blue-700 truncate">{d.address}</p>
                <p className="text-xs text-slate-400">{d.type}</p>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className={`text-xs font-semibold ${d.overdue ? "text-red-600" : d.daysOut <= 3 ? "text-amber-600" : "text-slate-600"}`}>
                  {d.overdue ? "Overdue" : d.daysOut === 0 ? "Today" : `${d.daysOut}d`}
                </p>
                <p className="text-[10px] text-slate-400">{format(d.date, "MMM d")}</p>
              </div>
              {onClearDeadline && (
                <button
                  onClick={() => onClearDeadline(d.txId, d.fieldKey)}
                  className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Clear deadline"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}