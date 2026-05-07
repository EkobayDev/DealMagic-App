import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Home, FileCheck, DollarSign, Plus, FileText, Calculator, Users, TrendingUp, Phone, Mail, MapPin, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { getYear, parseISO } from "date-fns";
import StatCard from "./StatCard";
import DeadlinesPanel from "./DeadlinesPanel";
import RecentTransactions from "./RecentTransactions";
import TransactionModal from "../transactions/TransactionModal";


export default function AdminDashboard() {
  const qc = useQueryClient();
  const [editingTx, setEditingTx] = useState(null);
  const year = getYear(new Date());

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-updated_date", 500),
  });

  const { data: agentProfiles = [] } = useQuery({
    queryKey: ["agent-profile-admin"],
    queryFn: () => base44.entities.AgentProfile.list("-created_date", 1),
  });
  const agent = agentProfiles[0];

  const { data: brokerages = [] } = useQuery({
    queryKey: ["brokerages-admin-dashboard"],
    queryFn: () => base44.entities.Brokerage.list("brokerage_name", 200),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users-admin"],
    queryFn: () => base44.entities.User.list(),
  });
  const userNameByEmail = allUsers.reduce((acc, u) => {
    if (u.email) acc[u.email] = u.full_name || u.email;
    return acc;
  }, {});

  const saveMutation = useMutation({
    mutationFn: ({ data, id }) =>
      id ? base44.entities.Transaction.update(id, data) : base44.entities.Transaction.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });

  // Resolve brokerage commission logic from the agent's linked brokerage
  const brokerage = brokerages.find(
    (b) => b.license_id === agent?.brokerage_license_number ||
           (b.brokerage_name || "").toLowerCase() === (agent?.brokerage_name || "").toLowerCase()
  ) || null;
  const commissionLogic = brokerage?.commission_logic || {};
  const logicType = commissionLogic.type || "none";
  const BROKERAGE_SPLIT_PCT = (commissionLogic.brokerage_split_pct ?? 30) / 100;
  const BROKERAGE_CAP = commissionLogic.brokerage_cap || 0;
  const hasLogic = logicType === "cap" || logicType === "flat_split";

  // Helper: compute brokerage amount for a single transaction given cumulative brokerage already earned
  const calcBrokerageAmt = (grossComm, cumulativeBrokerageEarned) => {
    if (!hasLogic) return 0;
    if (logicType === "flat_split") return grossComm * BROKERAGE_SPLIT_PCT;
    // cap
    const remaining = Math.max(0, BROKERAGE_CAP - cumulativeBrokerageEarned);
    return Math.min(grossComm * BROKERAGE_SPLIT_PCT, remaining);
  };

  const active = transactions.filter((t) => t.status === "active").length;
  const underContract = transactions.filter((t) => t.status === "under_contract" || t.status === "pending").length;
  const closedThisYear = transactions
    .filter((t) => t.status === "closed" && t.closing_date && getYear(parseISO(t.closing_date)) === year)
    .sort((a, b) => (a.closing_date > b.closing_date ? 1 : -1));

  const closedVolume = closedThisYear.reduce((s, t) => s + (t.purchase_price || 0) * (t.representing === "both" ? 2 : 1), 0);

  // Aggregate totals using dynamic commission logic
  const { grossCommission, brokerageEarnings } = (() => {
    let cumBrokerage = 0;
    let gross = 0;
    closedThisYear.forEach((t) => {
      const commPct = (t.commission_percent || 3) / 100;
      const g = t.commission_amount || (t.purchase_price || 0) * commPct;
      gross += g;
      const b = calcBrokerageAmt(g, cumBrokerage);
      cumBrokerage += b;
    });
    return { grossCommission: gross, brokerageEarnings: cumBrokerage };
  })();

  const uniqueAgents = [...new Set(transactions.map((t) => t.created_by).filter(Boolean))].length;

  // Per-agent commission breakdown — each agent's transactions sorted by close date, cap applied cumulatively per agent
  const agentCommissions = (() => {
    const agentMap = {};
    closedThisYear.forEach((t) => {
      const key = t.created_by || "Unknown";
      if (!agentMap[key]) agentMap[key] = { agent: key, sales: 0, gross: 0, brokerage: 0, count: 0, transactions: [] };
      agentMap[key].transactions.push(t);
      agentMap[key].count++;
      agentMap[key].sales += (t.purchase_price || 0) * (t.representing === "both" ? 2 : 1);
    });
    return Object.values(agentMap).map((a) => {
      let cumBrokerage = 0;
      let gross = 0;
      a.transactions.sort((x, y) => (x.closing_date > y.closing_date ? 1 : -1)).forEach((t) => {
        const commPct = (t.commission_percent || 3) / 100;
        const g = t.commission_amount || (t.purchase_price || 0) * commPct;
        gross += g;
        const b = calcBrokerageAmt(g, cumBrokerage);
        cumBrokerage += b;
      });
      return { ...a, gross, brokerage: cumBrokerage, agentNet: gross - cumBrokerage };
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
    <div className="space-y-8 text-[0.4375em]">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-wrap items-center gap-6">
        {/* Title + Logo stacked */}
        <div className="shrink-0 flex flex-col items-start gap-1">
          <h1 className="text-lg font-bold text-slate-900">Admin Dashboard</h1>
          <img
            src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
            alt="DealMagic"
            className="h-40 w-auto object-contain"
            style={{ mixBlendMode: 'multiply' }}
          />
          <p className="text-sm text-slate-500">Transaction Management: {year}</p>
        </div>

        {agent && (
          <>
            <div className="w-px h-16 bg-slate-100 hidden sm:block" />
            {/* Agent Photo */}
            {agent.photo_url && (
              <img src={agent.photo_url} alt={agent.agent_name} className="w-32 h-32 rounded-full object-cover border-2 border-slate-200 shrink-0" />
            )}
            {/* Agent Info */}
            <div className="min-w-0">
              <p className="text-2xl font-bold text-slate-800">{agent.agent_name}</p>
              {agent.license_number && <p className="text-base text-slate-400 mt-0.5">License # {agent.license_number}</p>}
              <div className="flex flex-col gap-y-1 mt-1">
                {agent.phone && (
                  <span className="flex items-center gap-1.5 text-base text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" /> {agent.phone.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}
                  </span>
                )}
                {agent.email && (
                  <span className="flex items-center gap-1.5 text-base text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" /> {agent.email}
                  </span>
                )}
              </div>
            </div>
            <div className="w-px h-16 bg-slate-100 hidden sm:block" />
            {/* Brokerage Info */}
            <div className="flex flex-col gap-1 shrink-0 ml-10">
              {agent.logo_url && (
                <img src={agent.logo_url} alt={agent.brokerage_name} className="h-24 w-auto object-contain object-left block" style={{ mixBlendMode: 'multiply', marginLeft: 0, marginRight: 'auto' }} />
              )}
              <div>
                {agent.brokerage_name && <p className="text-sm font-semibold text-slate-700">{agent.brokerage_name}</p>}
                {agent.brokerage_license_number && <p className="text-xs text-slate-400">Lic # {agent.brokerage_license_number}</p>}
                {(agent.brokerage_address || agent.brokerage_city) && (
                  <span className="flex items-start gap-1.5 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                    <span>
                      {agent.brokerage_address && <>{agent.brokerage_address}<br /></>}
                      {[agent.brokerage_city, agent.brokerage_state, agent.brokerage_zip].filter(Boolean).join(", ")}
                    </span>
                  </span>
                )}
                {agent.office_phone && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <Phone className="w-3 h-3 text-slate-400" /> {agent.office_phone}
                  </span>
                )}
              </div>
            </div>
          </>
        )}

      </div>

      {/* Brokerage Stats */}
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard title="Active Listings" value={active} icon={Home} color="yellow" />
          <StatCard title="Under Contract" value={underContract} icon={FileCheck} color="blue" />
          <StatCard title={`${year} Total Closed`} value={closedThisYear.length} icon={CheckCircle2} color="green" />
          <StatCard title={`${year} Closed Volume`} value={`$${closedVolume.toLocaleString()}`} icon={DollarSign} color="green" />
          <StatCard title="Active Agents" value={uniqueAgents} icon={Users} color="purple" />
        </div>
      </div>

      {/* Commission Summary */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">YTD Commission ({year})</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs text-slate-400 mb-1">Gross Commission</p>
            <p className="text-2xl font-bold text-slate-800">${grossCommission.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <p className="text-[11px] text-slate-400 mt-1">{closedThisYear.length} closed transactions</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs text-slate-400 mb-1">
              Brokerage Earnings
              {hasLogic && <span className="ml-1 text-orange-500">({logicType === "cap" ? `${(BROKERAGE_SPLIT_PCT * 100).toFixed(0)}% cap @ $${BROKERAGE_CAP.toLocaleString()}` : `${(BROKERAGE_SPLIT_PCT * 100).toFixed(0)}% split`})</span>}
            </p>
            <p className="text-2xl font-bold text-orange-600">${brokerageEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <p className="text-[11px] text-slate-400 mt-1">{hasLogic ? (logicType === "cap" ? `of $${BROKERAGE_CAP.toLocaleString()} YTD cap` : "fixed split every transaction") : "No logic configured"}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs text-slate-400 mb-1">Agent Net</p>
            <p className="text-2xl font-bold text-emerald-600">${(grossCommission - brokerageEarnings).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              <Link to="/CommissionReport" className="text-blue-500 hover:underline">View full report →</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Brokerage cap progress bar — only shown when logic type is "cap" */}
      {logicType === "cap" && BROKERAGE_CAP > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>Brokerage YTD Earnings toward ${BROKERAGE_CAP.toLocaleString()} cap ({brokerage?.brokerage_name || agent?.brokerage_name || "Brokerage"})</span>
            <span>${brokerageEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })} / ${BROKERAGE_CAP.toLocaleString()}</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#FFFF00] border border-yellow-400 transition-all"
              style={{ width: `${Math.min((brokerageEarnings / BROKERAGE_CAP) * 100, 100)}%` }}
            />
          </div>
          {brokerageEarnings >= BROKERAGE_CAP && (
            <p className="text-xs text-emerald-600 font-semibold mt-2">🎉 Brokerage cap reached — 100% commission to agent on remaining closings.</p>
          )}
        </div>
      )}

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
                    <td className="px-5 py-3 font-medium text-slate-800">{userNameByEmail[a.agent] || a.agent}</td>
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
        <Link to="/Transactions?new=1" className="inline-flex items-center gap-2 bg-[#FFFF00] text-slate-900 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e6e600] transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New Transaction
        </Link>
        <Link to="/CommissionReport" className="inline-flex items-center gap-2 bg-white text-slate-700 px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 hover:border-slate-300 transition-colors">
          <TrendingUp className="w-4 h-4" /> Commission Report
        </Link>
        <Link to="/Forms" className="inline-flex items-center gap-2 bg-white text-slate-700 px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 hover:border-slate-300 transition-colors">
          <FileText className="w-4 h-4" /> OREC Forms
        </Link>
      </div>

      {/* Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeadlinesPanel transactions={transactions} onEditTx={setEditingTx} onClearDeadline={(txId, fieldKey) => saveMutation.mutate({ id: txId, data: { [fieldKey]: null } })} />
        <RecentTransactions transactions={transactions} onEditTx={setEditingTx} />
      </div>

      <TransactionModal
        open={!!editingTx}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        onSave={(data, id) => saveMutation.mutateAsync({ data, id: id || editingTx?.id })}
        onDelete={(id) => { base44.entities.Transaction.delete(id); qc.invalidateQueries({ queryKey: ["transactions"] }); setEditingTx(null); }}
      />
    </div>
  );
}