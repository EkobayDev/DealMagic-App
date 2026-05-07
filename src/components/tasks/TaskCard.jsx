import React from "react";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

export default function TaskCard({ task, onEdit, onDelete, onEditTx }) {
  const isOverdue = task.due_date && new Date(task.due_date + "T00:00:00") < new Date();

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-2 group hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-800 leading-snug">{task.title}</p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onEdit(task)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(task)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority}
        </span>
        {task.transaction_address && (
          <button
            onClick={(e) => { e.stopPropagation(); onEditTx?.(task); }}
            className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full truncate max-w-[120px] hover:underline"
          >
            {task.transaction_address}
          </button>
        )}
        {task.due_date && (
          <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${isOverdue ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-500"}`}>
            <CalendarDays className="w-3 h-3" />
            {format(new Date(task.due_date + "T00:00:00"), "MMM d")}
          </span>
        )}
      </div>
    </div>
  );
}