import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, Phone, Mail, Building2, Users, ChevronDown, ChevronRight, Home, FileCheck, CheckCircle2, DollarSign, TrendingUp, Clock } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

const fmt = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function StatPill({ label, value, color = "slate" }) {
  const colors = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    purple: "bg-purple-50 text-purple-700",
    orange: "bg-orange-50 text-orange-700",
  };
  return (
    <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl ${colors[color]}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

export default function AgentsByBrokerage() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({});

  const urlParams = new URLSearchParams(window.location.search);
  const focusLicense = urlParams.get("license");

  const { data: brokerages = [], isLoading: loadingB } = useQuery({
    queryKey: ["brokerages"],
    queryFn: () => base44.entities.Brokerage.list("brokerage_name", 200),
  });

  const { data: allAgents = [], isLoading: loadingA } = useQuery({
    queryKey: ["agent-profiles-all"],
    queryFn: () => base44.entities.AgentProfile.list("agent_name", 500),
  });

  const { data: allTransactions = [], isLoading: loadingT } = useQuery({
    queryKey: ["transactions-all"],
    queryFn: () => base44.entities.Transaction.list("-updated_date", 1000),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  // Map user email -> last login (updated_date is closest proxy)
  const userLastAccess = allUsers.reduce((acc, u) => {
    acc[u.email] = u.updated_date || u.created_date;
    return acc;
  }, {});

  // Compute per-agent transaction stats keyed by email (created_by)
  const agentStats = allTransactions.reduce((acc, t) => {
    const email = t.created_by;
    if (!email) return acc;
    if (!acc[email]) acc[email] = { active: 0, underContract: 0, closed: 0, closedVolume: 0, pipeline: 0 };
    const s = acc[email];
    if (t.status === "active" || t.status === "coming_soon") {
      s.active += 1;
      s.pipeline += t.purchase_price || t.listing_price || 0;
    } else if (t.status === "under_contract" || t.status === "pending") {
      s.underContract += 1;
      s.pipeline += t.purchase_price || 0;
    } else if (t.status === "closed") {
      s.closed += 1;
      s.closedVolume += t.purchase_price || 0;
    }
    return acc;
  }, {});

  // Group agents by brokerage license number
  const agentsByLicense = allAgents.reduce((acc, a) => {
    const key = a.brokerage_license_number || "__none__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  // Build rows: brokerages with at least one agent
  const rows = brokerages
    .map((b) => ({ brokerage: b, agents: agentsByLicense[b.license_id] || [] }))
    .filter((r) => r.agents.length > 0);

  // Filter by search
  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.brokerage.brokerage_name?.toLowerCase().includes(q) ||
      r.brokerage.license_id?.toLowerCase().includes(q) ||
      r.agents.some(
        (a) =>
          a.agent_name?.toLowerCase().includes(q) ||
          a.license_number?.toLowerCase().includes(q) ||
          a.email?.toLowerCase().includes(q)
      )
    );
  });

  const toggle = (licenseId) =>
    setExpanded((prev) => ({ ...prev, [licenseId]: !prev[licenseId] }));

  const isOpen = (licenseId) =>
    licenseId === focusLicense ? !(expanded[licenseId] === false) : !!expanded[licenseId];

  const totalAgents = allAgents.length;

  if (loadingB || loadingA || loadingT) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Agents by Brokerage</h1>
        <p className="text-sm text-slate-500 mt-1">
          {totalAgents} agent{totalAgents !== 1 ? "s" : ""} across {rows.length} brokerage{rows.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search brokerage or agent..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Brokerage Groups */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-12">No results found.</p>
        )}
        {filtered.map(({ brokerage: b, agents }) => {
          const open = isOpen(b.license_id);

          // Roll up brokerage-level stats across all agents
          const brokerageStats = agents.reduce(
            (acc, a) => {
              const s = agentStats[a.email] || {};
              acc.active += s.active || 0;
              acc.underContract += s.underContract || 0;
              acc.closed += s.closed || 0;
              acc.closedVolume += s.closedVolume || 0;
              acc.pipeline += s.pipeline || 0;
              return acc;
            },
            { active: 0, underContract: 0, closed: 0, closedVolume: 0, pipeline: 0 }
          );

          return (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              {/* Brokerage header row */}
              <button
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                onClick={() => toggle(b.license_id)}
              >
                {b.logo_url ? (
                  <img
                    src={b.logo_url}
                    alt={b.brokerage_name}
                    className="h-10 w-10 object-contain rounded border border-slate-100 shrink-0"
                    style={{ mixBlendMode: "multiply" }}
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{b.brokerage_name}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{b.license_id}</p>
                </div>

                {/* Brokerage-level stats pills */}
                <div className="hidden md:flex items-center gap-2 flex-wrap shrink-0">
                  <StatPill label="Agents" value={agents.length} color="blue" />
                  <StatPill label="Active" value={brokerageStats.active} color="slate" />
                  <StatPill label="Contract" value={brokerageStats.underContract} color="amber" />
                  <StatPill label="Closed" value={brokerageStats.closed} color="green" />
                  <StatPill label="Closed Vol" value={fmt(brokerageStats.closedVolume)} color="purple" />
                  <StatPill label="Pipeline" value={fmt(brokerageStats.pipeline)} color="orange" />
                </div>

                {open ? (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </button>

              {/* Agent list */}
              {open && (
                <div className="border-t border-slate-100">
                  {/* Column headers */}
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1.5fr_1.5fr_2fr] gap-2 px-5 py-2 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hidden md:grid">
                    <span>Agent</span>
                    <span className="text-center">Active</span>
                    <span className="text-center">Contract</span>
                    <span className="text-center">Closed</span>
                    <span className="text-center">Closed Vol</span>
                    <span className="text-center">Pipeline</span>
                    <span className="text-center">Last Access</span>
                    <span>Contact</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {agents.map((a) => {
                      const s = agentStats[a.email] || {};
                      const lastAccess = userLastAccess[a.email];
                      return (
                        <div key={a.id} className="flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1.5fr_1.5fr_2fr] gap-2 items-center px-5 py-3 hover:bg-slate-50/60 transition-colors">
                          {/* Agent identity */}
                          <div className="flex items-center gap-3 w-full md:w-auto">
                            {a.photo_url ? (
                              <img src={a.photo_url} alt={a.agent_name} className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0" />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                                {a.agent_name?.[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{a.agent_name}</p>
                              {a.license_number && (
                                <p className="text-xs text-slate-400 font-mono">#{a.license_number}</p>
                              )}
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex md:justify-center items-center gap-1">
                            <Home className="w-3 h-3 text-slate-300 md:hidden" />
                            <span className="text-sm font-semibold text-slate-700">{s.active || 0}</span>
                          </div>
                          <div className="flex md:justify-center items-center gap-1">
                            <FileCheck className="w-3 h-3 text-amber-300 md:hidden" />
                            <span className="text-sm font-semibold text-amber-600">{s.underContract || 0}</span>
                          </div>
                          <div className="flex md:justify-center items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-300 md:hidden" />
                            <span className="text-sm font-semibold text-emerald-600">{s.closed || 0}</span>
                          </div>
                          <div className="md:text-center">
                            <span className="text-sm font-semibold text-purple-700">{fmt(s.closedVolume)}</span>
                          </div>
                          <div className="md:text-center">
                            <span className="text-sm font-semibold text-orange-600">{fmt(s.pipeline)}</span>
                          </div>

                          {/* Last access */}
                          <div className="md:text-center">
                            {lastAccess ? (
                              <span className="text-xs text-slate-400 flex items-center gap-1 md:justify-center">
                                <Clock className="w-3 h-3 shrink-0" />
                                {formatDistanceToNow(parseISO(lastAccess), { addSuffix: true })}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </div>

                          {/* Contact */}
                          <div className="flex items-center gap-3">
                            {a.phone && (
                              <a href={`tel:${a.phone}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
                                <Phone className="w-3.5 h-3.5" /> {a.phone}
                              </a>
                            )}
                            {a.email && (
                              <a href={`mailto:${a.email}`} className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}