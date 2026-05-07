import React from "react";

export default function StatCard({ title, value, subtitle, icon: Icon, color }) {
  const colorMap = {
    yellow: "bg-[#FFFF00]/10 text-[#cccc00]",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
          {subtitle && <p className="text-[0.7rem] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorMap[color] || colorMap.yellow}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}