import React from "react";
import { format, parseISO } from "date-fns";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AICompsBadge } from "@/components/dashboard/AICompsModal";

const STATUS_BADGE = {
  active: "bg-emerald-50 text-emerald-700",
  under_contract: "bg-blue-50 text-blue-700",
  pending: "bg-amber-50 text-amber-700",
  closed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-50 text-red-700",
  expired: "bg-slate-100 text-slate-500",
};

export default function RecentTransactions({ transactions, onEditTx }) {
  const recent = [...transactions].sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date)).slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Recent Transactions</h3>
        <Link to="/Transactions" className="text-xs font-medium text-[#cccc00] hover:text-[#FFFF00] flex items-center gap-1">
          View All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-slate-50">
        {recent.length === 0 && (
          <div className="p-6 text-center text-sm text-slate-400">No transactions yet</div>
        )}
        {recent.map((t) => (
          <div key={t.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
            <div className="flex-1 min-w-0">
              <button onClick={() => onEditTx?.(t)} className="text-left w-full hover:underline">
                <p className="text-sm font-medium text-blue-700 truncate">{t.property_address}</p>
                <p className="text-xs text-slate-400">{t.city}{t.city && t.zip ? ", " : ""}{t.zip}</p>
              </button>
            </div>
            <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-full ${STATUS_BADGE[t.status] || STATUS_BADGE.active}`}>
              {t.status?.replace("_", " ")}
            </span>
            <AICompsBadge transaction={t} />
            {t.purchase_price && (
              <p className="text-sm font-semibold text-slate-700 hidden sm:block">
                ${t.purchase_price.toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}