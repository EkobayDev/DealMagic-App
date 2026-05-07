import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Home, FileCheck, DollarSign, Plus, TrendingUp, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { getYear, parseISO } from "date-fns";
import StatCard from "./StatCard";
import DeadlinesPanel from "./DeadlinesPanel";
import RecentTransactions from "./RecentTransactions";
import TransactionModal from "../transactions/TransactionModal";


const THRESHOLD = 1500000;
const BROKERAGE_SPLIT = 0.30;

export default function BrokerDashboard() {
  const qc = useQueryClient();
  const [editingTx, setEditingTx] = useState(null);
  const year = getYear(new Date());

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-updated_date", 500),
  });

  const saveMutation = useMutation({
    mutationFn: ({ data, id }) =>
      id ? base44.entities.Transaction.update(id, data) : base44.entities.Transaction.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const active = transactions.filter((t) => t.status === "active").length;
  const underContract = transactions.filter((t) => t.status === "under_contract" || t.status === "pending").length;
  const closedThisYear = transactions.filter(
    (t) => t.status === "closed" && t.closing_date && getYear(parseISO(t.closing_date)) === year
  );
  const closedVolume = closedThisYear.reduce((s, t) => s + (t.purchase_price || 0), 0);
  const grossCommission = closedThisYear.reduce((s, t) => {
    const commPct = (t.commission_percent || 3) / 100;
    return s + (t.commission_amount || (t.purchase_price || 0) * commPct);
  }, 0);

  let cumSales = 0;
  const brokerageEarnings = closedThisYear.reduce((s, t) => {
    const prevCum = cumSales;
    cumSales += t.purchase_price || 0;
    const commPct = (t.commission_percent || 3) / 100;
    const gross = t.commission_amount || (t.purchase_price || 0) * commPct;
    let brokeragePct;
    if (prevCum >= THRESHOLD) brokeragePct = 0;
    else if (cumSales > THRESHOLD) brokeragePct = BROKERAGE_SPLIT * ((THRESHOLD - prevCum) / (t.purchase_price || 1));
    else brokeragePct = BROKERAGE_SPLIT;
    return s + gross * brokeragePct;
  }, 0);

  // Per-agent commission breakdown
  const agentCommissions = (() => {
    const agentMap = {};
    closedThisYear.forEach((t) => {
      const agent = t.created_by || "Unknown";
      if (!agentMap[agent]) agentMap[agent] = { agent, sales: 0, gross: 0, brokerage: 0, count: 0, transactions: [] };
      agentMap[agent].transactions.push(t);
      agentMap[agent].count++;
      agentMap[agent].sales += t.purchase_price || 0;
    });
    return Object.values(agentMap).map((a) => {
      let cumSales = 0;
      let brokerage = 0;
      let gross = 0;
      a.transactions.sort((x, y) => (x.closing_date > y.closing_date ? 1 : -1)).forEach((t) => {
        const commPct = (t.commission_percent || 3) / 100;
        const g = t.commission_amount || (t.purchase_price || 0) * commPct;
        gross += g;
        const prev = cumSales;
        cumSales += t.purchase_price || 0;
        let bPct;
        if (prev >= THRESHOLD) bPct = 0;
        else if (cumSales > THRESHOLD) bPct = BROKERAGE_SPLIT * ((THRESHOLD - prev) / (t.purchase_price || 1));
        else bPct = BROKERAGE_SPLIT;
        brokerage += g * bPct;
      });
      return { ...a, gross, brokerage, agentNet: gross - brokerage };
    }).sort((a, b) => b.sales - a.sales);
  })();

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
          <h1 className="text-2xl font-bold text-slate-900">Broker Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Brokerage production & commission overview — {year}</p>
        </div>
        <img
          src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
          alt="DealMagic"
          className="h-40 w-auto object-contain ml-auto"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Active Listings" value={active} icon={Home} color="yellow" />
        <StatCard title="Under Contract" value={underContract} icon={FileCheck} color="blue" />
        <StatCard title={`${year} Closed Volume`} value={`$${closedVolume.toLocaleString()}`} icon={DollarSign} color="green" />
        <StatCard title="Closed Transactions" value={closedThisYear.length} icon={TrendingUp} color="purple" />
      </div>

      {/* Commission Breakdown */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">YTD Commission Split</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs text-slate-400 mb-1">Gross Commission</p>
            <p className="text-2xl font-bold text-slate-800">${grossCommission.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs text-slate-400 mb-1">Brokerage Earnings (30%)</p>
            <p className="text-2xl font-bold text-orange-600">${brokerageEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs text-slate-400 mb-1">Agent Net</p>
            <p className="text-2xl font-bold text-emerald-600">${(grossCommission - brokerageEarnings).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              <Link to="/CommissionReport" className="text-blue-500 hover:underline">Full commission report →</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Volume Progress */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>Closed Volume to $1.5M Threshold</span>
          <span>${closedVolume.toLocaleString()} / $1,500,000</span>
        </div>
        <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#FFFF00] border border-yellow-400 transition-all"
            style={{ width: `${Math.min((closedVolume / THRESHOLD) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Per-Agent Commission Breakdown */}
      {agentCommissions.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Commission by Agent — {year}</p>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3">Agent</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Closings</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Closed Volume</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Gross Comm</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Brokerage</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Agent Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {agentCommissions.map((a) => (
                  <tr key={a.agent} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-800">{a.agent}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{a.count}</td>
                    <td className="px-4 py-3 text-right text-slate-700">${a.sales.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-700">${a.gross.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-3 text-right text-orange-600">${a.brokerage.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-semibold">${a.agentNet.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/CommissionReport" className="inline-flex items-center gap-2 bg-[#FFFF00] text-slate-900 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e6e600] transition-colors shadow-sm">
          <TrendingUp className="w-4 h-4" /> Commission Report
        </Link>
        <Link to="/Transactions" className="inline-flex items-center gap-2 bg-white text-slate-700 px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 hover:border-slate-300 transition-colors">
          <FileText className="w-4 h-4" /> All Transactions
        </Link>
      </div>

      {/* Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeadlinesPanel transactions={transactions} onEditTx={setEditingTx} />
        <RecentTransactions transactions={transactions} onEditTx={setEditingTx} />
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