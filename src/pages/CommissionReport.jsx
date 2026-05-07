import React, { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, getYear } from "date-fns";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import TransactionModal from "../components/transactions/TransactionModal";

// Commission logic is driven by the Brokerage entity's commission_logic field.

const fmt = (n) => n != null ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const fmtPct = (p) => `${(p * 100).toFixed(2)}%`;

const STATUS_BADGE = {
  active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  under_contract: "bg-blue-50 text-blue-700 border border-blue-200",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
};

export default function CommissionReport() {
  const year = getYear(new Date());
  const printRef = useRef(null);
  const [editingTx, setEditingTx] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const saveMutation = useMutation({
    mutationFn: ({ data, id }) =>
      id ? base44.entities.Transaction.update(id, data) : base44.entities.Transaction.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", currentUser?.email, currentUser?.role],
    queryFn: () =>
      base44.entities.Transaction.filter({ created_by: currentUser.email }, "-closing_date", 500),
    enabled: !!currentUser,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["agent-profiles"],
    queryFn: () => base44.entities.AgentProfile.list(),
  });

  const profile = profiles[0] || {};

  // Fetch the matching brokerage to get commission_logic
  const { data: brokerages = [] } = useQuery({
    queryKey: ["brokerages-commission"],
    queryFn: () => base44.entities.Brokerage.list("brokerage_name", 200),
  });

  const brokerage = brokerages.find(
    (b) => b.license_id === profile.brokerage_license_number ||
           (b.brokerage_name || "").toLowerCase() === (profile.brokerage_name || "").toLowerCase()
  ) || null;

  const commissionLogic = brokerage?.commission_logic || {};
  const logicType = commissionLogic.type || "none";
  const BROKERAGE_SPLIT = (commissionLogic.brokerage_split_pct ?? 30) / 100;
  const BROKERAGE_CAP = commissionLogic.brokerage_cap || 0;
  const hasLogic = logicType === "cap" || logicType === "flat_split";

  // --- Split closed transactions for current year ---
  const closedThisYear = useMemo(() =>
    transactions
      .filter((t) => t.status === "closed" && t.closing_date && getYear(parseISO(t.closing_date)) === year)
      .sort((a, b) => (a.closing_date > b.closing_date ? 1 : -1)),
    [transactions, year]
  );

  const commissionRows = useMemo(() => {
    if (!hasLogic) return [];

    let cumulativeSales = 0;
    let cumulativeBrokerageEarned = 0;

    return closedThisYear.map((t) => {
      const salePrice = t.purchase_price || 0;
      const sides = t.representing === "both" ? 2 : 1;
      const effectiveVolume = salePrice * sides;
      const commPct = (t.commission_percent || profile.default_commission_percent || 3) / 100;
      const grossComm = t.commission_amount || salePrice * commPct;

      cumulativeSales += effectiveVolume;

      let brokerageAmt, agentAmt;

      if (logicType === "flat_split") {
        brokerageAmt = grossComm * BROKERAGE_SPLIT;
        agentAmt = grossComm - brokerageAmt;
      } else {
        // cap logic
        const prevBrokerageEarned = cumulativeBrokerageEarned;
        if (prevBrokerageEarned >= BROKERAGE_CAP) {
          brokerageAmt = 0;
          agentAmt = grossComm;
        } else {
          const brokerageRemaining = BROKERAGE_CAP - prevBrokerageEarned;
          const brokerageWouldEarn = grossComm * BROKERAGE_SPLIT;
          if (brokerageWouldEarn <= brokerageRemaining) {
            brokerageAmt = brokerageWouldEarn;
          } else {
            brokerageAmt = brokerageRemaining;
          }
          agentAmt = grossComm - brokerageAmt;
        }
      }

      cumulativeBrokerageEarned += brokerageAmt;

      const brokeragePct = grossComm > 0 ? brokerageAmt / grossComm : 0;
      const agentPct = 1 - brokeragePct;

      return { ...t, grossComm, commPct, brokeragePct, agentPct, brokerageAmt, agentAmt, cumulativeSales, cumulativeBrokerageEarned, sides, effectiveVolume };
    });
  }, [closedThisYear, profile, hasLogic, logicType, BROKERAGE_SPLIT, BROKERAGE_CAP]);

  const totals = useMemo(() => ({
    sales: commissionRows.reduce((s, r) => s + r.effectiveVolume, 0),
    gross: commissionRows.reduce((s, r) => s + r.grossComm, 0),
    brokerage: commissionRows.reduce((s, r) => s + r.brokerageAmt, 0),
    agent: commissionRows.reduce((s, r) => s + r.agentAmt, 0),
  }), [commissionRows]);

  const brokerageCapReached = logicType === "cap" && totals.brokerage >= BROKERAGE_CAP;

  // Active / pending
  const activePending = useMemo(() =>
    transactions.filter((t) => t.status === "active" || t.status === "pending"),
    [transactions]
  );

  // Under contract
  const underContract = useMemo(() =>
    transactions.filter((t) => t.status === "under_contract"),
    [transactions]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commission Report</h1>
          <p className="text-sm text-slate-500 mt-1">Calendar Year {year}</p>
        </div>
        <Button onClick={() => window.print()} className="gap-2 bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] print:hidden">
          <Printer className="w-4 h-4" /> Print / Export
        </Button>
      </div>

      {/* Printable content */}
      <div ref={printRef} className="space-y-6" style={{ zoom: 1.2 }}>

        {/* Agent / Brokerage Header Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-start gap-6">
            {profile.logo_url && (
              <img src={profile.logo_url} alt="Brokerage Logo" className="h-20 w-auto object-contain rounded-xl" />
            )}
            {profile.photo_url && (
              <img src={profile.photo_url} alt="Agent" className="h-20 w-20 object-cover rounded-full border border-slate-200 shrink-0" />
            )}
            <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-1">
              <div>
                <p className="text-xs text-slate-400">Agent</p>
                <p className="text-sm font-semibold text-slate-800">{profile.agent_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Agent License #</p>
                <p className="text-sm font-medium text-slate-700">{profile.license_number || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Brokerage</p>
                <p className="text-sm font-semibold text-slate-800">{profile.brokerage_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Brokerage Address</p>
                <p className="text-sm text-slate-600">
                  {[profile.brokerage_address, profile.brokerage_city, profile.brokerage_state, profile.brokerage_zip].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Cell Phone</p>
                <p className="text-sm text-slate-600">{profile.phone ? profile.phone.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Office Phone</p>
                <p className="text-sm text-slate-600">{profile.office_phone || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <p className="text-sm text-slate-600">{profile.email || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {!hasLogic && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800">
            <p className="font-semibold">Commission logic not configured for this brokerage.</p>
            <p className="mt-1 text-amber-600">An admin can configure commission logic in the Brokerage Table for <strong>{profile.brokerage_name || "your brokerage"}</strong>.</p>
          </div>
        )}

        {hasLogic && (
          <>
            {/* Commission Split Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "YTD Gross Commission", value: fmt(totals.gross), sub: "all closed transactions" },
                { label: "Brokerage YTD Earned", value: fmt(totals.brokerage), sub: logicType === "cap" ? `of ${fmt(BROKERAGE_CAP)} cap` : `${(BROKERAGE_SPLIT * 100).toFixed(0)}% split`, color: "text-orange-600" },
                logicType === "cap"
                  ? { label: "Brokerage Remaining Cap", value: fmt(Math.max(0, BROKERAGE_CAP - totals.brokerage)), sub: brokerageCapReached ? "Cap reached!" : "Until agent earns 100%", color: brokerageCapReached ? "text-emerald-600" : "text-slate-800" }
                  : { label: "Agent Split", value: `${(100 - BROKERAGE_SPLIT * 100).toFixed(0)}%`, sub: "fixed agent share", color: "text-emerald-600" },
                { label: "Agent Net", value: fmt(totals.agent), sub: brokerageCapReached ? "100% — cap reached" : `After ${(BROKERAGE_SPLIT * 100).toFixed(0)}% brokerage split`, color: "text-emerald-600" },
              ].map((c) => (
                <div key={c.label} className="bg-white rounded-2xl border border-slate-100 p-4">
                  <p className="text-xs text-slate-400 mb-1">{c.label}</p>
                  <p className={`text-xl font-bold ${c.color || "text-slate-800"}`}>{c.value}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{c.sub}</p>
                </div>
              ))}
            </div>

            {/* Progress bar — only for cap type */}
            {logicType === "cap" && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Brokerage YTD Earnings toward {fmt(BROKERAGE_CAP)} cap ({profile.brokerage_name || "Brokerage"})</span>
                  <span>{fmt(totals.brokerage)} / {fmt(BROKERAGE_CAP)}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#FFFF00] border border-yellow-400 transition-all"
                    style={{ width: `${Math.min(BROKERAGE_CAP > 0 ? (totals.brokerage / BROKERAGE_CAP) * 100 : 0, 100)}%` }}
                  />
                </div>
                {brokerageCapReached && (
                  <p className="text-xs text-emerald-600 font-semibold mt-2">🎉 Brokerage cap reached — 100% commission to agent on remaining closings.</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Closed Transactions Table */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Closed Transactions — {year}</h2>
            {hasLogic && logicType === "cap" && (
              <p className="text-xs text-slate-400 mt-0.5">{profile.brokerage_name}: Brokerage earns {(BROKERAGE_SPLIT * 100).toFixed(0)}% until it has received {fmt(BROKERAGE_CAP)} YTD, then 100% to agent</p>
            )}
            {hasLogic && logicType === "flat_split" && (
              <p className="text-xs text-slate-400 mt-0.5">{profile.brokerage_name}: Fixed {(BROKERAGE_SPLIT * 100).toFixed(0)}% brokerage / {(100 - BROKERAGE_SPLIT * 100).toFixed(0)}% agent split on every transaction</p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3">Property Address</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Closed Date</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Sale Price</th>
                  <th className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-3">Sides</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Comm %</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Gross Comm</th>
                  <th className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Split</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Brokerage $</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Agent $</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Date Distributed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {commissionRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-sm text-slate-400">No closed transactions for {year}</td>
                  </tr>
                ) : (
                  commissionRows.map((r) => {
                    const brokerageCapHit = logicType === "cap" && (r.cumulativeBrokerageEarned - r.brokerageAmt) >= BROKERAGE_CAP;
                    return (
                      <tr key={r.id} className={`hover:bg-slate-50/50 transition-colors ${brokerageCapHit ? "bg-emerald-50/30" : ""}`}>
                        <td className="px-5 py-3">
                          <button onClick={() => setEditingTx(r)} className="text-left hover:underline">
                            <p className="font-medium text-blue-700">{r.property_address}</p>
                            <p className="text-xs text-slate-400">{[r.city, r.zip].filter(Boolean).join(", ")}</p>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                          {r.closing_date ? format(parseISO(r.closing_date), "MM/dd/yyyy") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">{fmt(r.purchase_price)}</td>
                        <td className="px-2 py-3 text-center w-16">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${r.sides === 2 ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
                            {r.sides === 2 ? "Both" : r.representing === "buyer" ? "Buy" : r.representing === "seller" ? "Sell" : "1"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">{fmtPct(r.commPct)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{fmt(r.grossComm)}</td>
                        <td className="px-4 py-3 text-center text-xs text-slate-500">
                          <span className="text-orange-600 font-medium">{fmtPct(r.brokeragePct)}</span>
                          <span className="text-slate-300 mx-1">/</span>
                          <span className="text-emerald-600 font-medium">{fmtPct(r.agentPct)}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-orange-700 font-medium">{fmt(r.brokerageAmt)}</td>
                        <td className="px-4 py-3 text-right text-emerald-700 font-bold">{fmt(r.agentAmt)}</td>
                        <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                          {r.commission_distributed_date ? format(parseISO(r.commission_distributed_date), "MM/dd/yyyy") : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {commissionRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                    <td className="px-5 py-3 text-slate-700">Totals ({commissionRows.length} transactions)</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right text-slate-800">{fmt(totals.sales)}</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(totals.gross)}</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right text-orange-700">{fmt(totals.brokerage)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{fmt(totals.agent)}</td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Under Contract */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-800">Under Contract ({underContract.length})</h2>
          </div>
          {underContract.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No transactions currently under contract</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3">Property</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Sale Price</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Closing Date</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Est. Gross Comm</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Est. Agent Comm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {underContract.map((t) => {
                  const commPct = (t.commission_percent || profile.default_commission_percent || 3) / 100;
                  const gross = t.commission_amount || (t.purchase_price || 0) * commPct;
                  const brokerageRemaining = logicType === "cap" ? Math.max(0, BROKERAGE_CAP - totals.brokerage) : Infinity;
                  const brokerageWouldEarn = gross * BROKERAGE_SPLIT;
                  const estBrokerageAmt = logicType === "cap" ? Math.min(brokerageWouldEarn, brokerageRemaining) : brokerageWouldEarn;
                  const agentPctEst = gross > 0 ? (gross - estBrokerageAmt) / gross : 1;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        <button onClick={() => setEditingTx(t)} className="text-left hover:underline">
                          <p className="font-medium text-blue-700">{t.property_address}</p>
                          <p className="text-xs text-slate-400">{[t.city, t.zip].filter(Boolean).join(", ")}</p>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmt(t.purchase_price)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {t.closing_date ? format(parseISO(t.closing_date), "MM/dd/yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmt(gross)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">{fmt(gross * agentPctEst)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Active / Pending Listings */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-800">Active & Pending Listings ({activePending.length})</h2>
          </div>
          {activePending.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No active or pending listings</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-5 py-3">Property</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Status</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">List Price</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Est. Gross Comm</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">Est. Agent Comm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activePending.map((t) => {
                  const price = t.listing_price || t.purchase_price || 0;
                  const commPct = (t.commission_percent || profile.default_commission_percent || 3) / 100;
                  const gross = t.commission_amount || price * commPct;
                  const brokerageRemaining = logicType === "cap" ? Math.max(0, BROKERAGE_CAP - totals.brokerage) : Infinity;
                  const brokerageWouldEarn = gross * BROKERAGE_SPLIT;
                  const estBrokerageAmt = logicType === "cap" ? Math.min(brokerageWouldEarn, brokerageRemaining) : brokerageWouldEarn;
                  const agentPct = gross > 0 ? (gross - estBrokerageAmt) / gross : 1;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        <button onClick={() => setEditingTx(t)} className="text-left hover:underline">
                          <p className="font-medium text-blue-700">{t.property_address}</p>
                          <p className="text-xs text-slate-400">{[t.city, t.zip].filter(Boolean).join(", ")}</p>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-full ${STATUS_BADGE[t.status]}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmt(price)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmt(gross)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">{fmt(gross * agentPct)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      <TransactionModal
        open={!!editingTx}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        onSave={(data, id) => saveMutation.mutateAsync({ data, id: id || editingTx?.id })}
      />

        {/* Print footer */}
        <div className="text-center text-xs text-slate-400 pt-2 print:block">
          <p>Generated {format(new Date(), "MMMM d, yyyy")} · DealMagic Oklahoma · {profile.agent_name || ""} · {profile.brokerage_name || ""}</p>
        </div>
      </div>
    </div>
  );
}