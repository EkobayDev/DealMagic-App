import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Home, FileCheck, DollarSign, Plus, FileText, Calculator, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { getYear, parseISO } from "date-fns";
import StatCard from "./StatCard";
import DeadlinesPanel from "./DeadlinesPanel";
import RecentTransactions from "./RecentTransactions";
import TransactionModal from "../transactions/TransactionModal";

const fmt = (n) => n != null ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—";

export default function AgentDashboard({ user }) {
  const qc = useQueryClient();
  const [editingTx, setEditingTx] = useState(null);
  const year = getYear(new Date());

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-updated_date", 100),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["agent-profiles-dashboard"],
    queryFn: () => base44.entities.AgentProfile.list(),
  });

  const { data: brokerages = [] } = useQuery({
    queryKey: ["brokerages-dashboard"],
    queryFn: () => base44.entities.Brokerage.list("brokerage_name", 200),
  });

  const saveMutation = useMutation({
    mutationFn: ({ data, id }) =>
      id ? base44.entities.Transaction.update(id, data) : base44.entities.Transaction.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });

  // Filter to the current agent's own transactions
  const myTransactions = transactions.filter((t) => t.created_by === user?.email);

  const active = myTransactions.filter((t) => t.status === "active").length;
  const underContract = myTransactions.filter((t) => t.status === "under_contract" || t.status === "pending").length;

  // Commission logic (mirrors CommissionReport)
  const profile = profiles[0] || {};
  const brokerage = brokerages.find(
    (b) => b.license_id === profile.brokerage_license_number ||
           (b.brokerage_name || "").toLowerCase() === (profile.brokerage_name || "").toLowerCase()
  ) || null;
  const commissionLogic = brokerage?.commission_logic || {};
  const logicType = commissionLogic.type || "none";
  const BROKERAGE_SPLIT = (commissionLogic.brokerage_split_pct ?? 30) / 100;
  const BROKERAGE_CAP = commissionLogic.brokerage_cap || 0;
  const hasLogic = logicType === "cap" || logicType === "flat_split";

  const ytdStats = useMemo(() => {
    const closedYTD = myTransactions
      .filter((t) => t.status === "closed" && t.closing_date && getYear(parseISO(t.closing_date)) === year)
      .sort((a, b) => (a.closing_date > b.closing_date ? 1 : -1));

    let cumulativeBrokerageEarned = 0;
    let totalGross = 0;
    let totalAgent = 0;

    closedYTD.forEach((t) => {
      const commPct = (t.commission_percent || profile.default_commission_percent || 3) / 100;
      const grossComm = t.commission_amount || (t.purchase_price || 0) * commPct;
      totalGross += grossComm;

      let brokerageAmt;
      if (!hasLogic || logicType === "flat_split") {
        brokerageAmt = hasLogic ? grossComm * BROKERAGE_SPLIT : 0;
      } else {
        // cap
        const remaining = Math.max(0, BROKERAGE_CAP - cumulativeBrokerageEarned);
        brokerageAmt = Math.min(grossComm * BROKERAGE_SPLIT, remaining);
      }
      cumulativeBrokerageEarned += brokerageAmt;
      totalAgent += grossComm - brokerageAmt;
    });

    return { gross: totalGross, agent: totalAgent, brokerageEarned: cumulativeBrokerageEarned, count: closedYTD.length };
  }, [myTransactions, year, profile, hasLogic, logicType, BROKERAGE_SPLIT, BROKERAGE_CAP]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}. Here's your deal overview.
          </p>
        </div>
        <img
          src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
          alt="DealMagic"
          className="h-40 w-auto object-contain ml-auto"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>

      {/* My Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard title="My Active Listings" value={active} icon={Home} color="yellow" />
        <StatCard title="Under Contract" value={underContract} icon={FileCheck} color="blue" />
        <StatCard title={`YTD Gross Comm (${year})`} value={fmt(ytdStats.gross)} icon={DollarSign} color="green" />
        <StatCard title={`YTD Agent Net (${year})`} value={fmt(ytdStats.agent)} icon={TrendingUp} color="green" />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/Transactions?new=1"
          className="inline-flex items-center gap-2 bg-[#FFFF00] text-slate-900 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e6e600] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Transaction
        </Link>
        <Link
          to="/Forms"
          className="inline-flex items-center gap-2 bg-white text-slate-700 px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 hover:border-slate-300 transition-colors"
        >
          <FileText className="w-4 h-4" /> OREC Forms
        </Link>
        <Link
          to="/NetSheets"
          className="inline-flex items-center gap-2 bg-white text-slate-700 px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 hover:border-slate-300 transition-colors"
        >
          <Calculator className="w-4 h-4" /> Net Sheet
        </Link>
      </div>

      {/* Panels — scoped to my transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeadlinesPanel transactions={myTransactions} onEditTx={setEditingTx} onClearDeadline={(txId, fieldKey) => saveMutation.mutate({ id: txId, data: { [fieldKey]: null } })} />
        <RecentTransactions transactions={myTransactions} onEditTx={setEditingTx} />
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