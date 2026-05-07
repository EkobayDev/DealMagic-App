import React from "react";
import { TrendingUp, Download, Star, BarChart2 } from "lucide-react";

export default function TemplateAnalytics({ templates, exports }) {
  if (!exports.length && !templates.length) return null;

  // Count exports per template
  const countMap = {};
  exports.forEach((e) => {
    countMap[e.template_id] = (countMap[e.template_id] || 0) + 1;
  });

  const mostPopular = templates
    .map((t) => ({ name: t.name, count: countMap[t.id] || 0 }))
    .sort((a, b) => b.count - a.count)[0];

  const totalExports = exports.length;
  const uniqueTemplatesUsed = Object.keys(countMap).length;

  // Last 30 days exports
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentExports = exports.filter((e) => new Date(e.created_date) >= thirtyDaysAgo).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-5">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-violet-500" />
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Template Usage Analytics</h2>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Exports" value={totalExports} icon={Download} color="violet" />
        <StatCard label="Last 30 Days" value={recentExports} icon={TrendingUp} color="emerald" />
        <StatCard label="Templates Used" value={uniqueTemplatesUsed} icon={BarChart2} color="blue" />
        <StatCard
          label="Most Popular"
          value={mostPopular?.count ? mostPopular.name : "—"}
          sub={mostPopular?.count ? `${mostPopular.count} export${mostPopular.count !== 1 ? "s" : ""}` : "No exports yet"}
          icon={Star}
          color="amber"
          truncate
        />
      </div>


    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, truncate }) {
  const colors = {
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <p className={`font-bold text-slate-800 ${truncate ? "text-sm truncate" : "text-xl"}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
      <p className="text-[11px] text-slate-400">{label}</p>
    </div>
  );
}