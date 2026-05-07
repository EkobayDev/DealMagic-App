import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const CustomTooltip = ({ active, payload, label, color }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-800 text-white text-xs rounded-xl px-3 py-2.5 shadow-xl">
      <p className="font-semibold text-slate-200 mb-1">Week of {label}</p>
      <p style={{ color }} className="text-base font-bold">{d.rate}%</p>
      <p className="text-slate-400 mt-0.5">{d.source}</p>
    </div>
  );
};

function RateChart({ title, subtitle, rates, loading, lineColor, dotColor }) {
  const latest = rates[rates.length - 1];
  const prev = rates[rates.length - 2];
  const change = latest && prev ? (latest.rate - prev.rate).toFixed(2) : null;
  const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const trendColor = change > 0 ? "text-red-500" : change < 0 ? "text-emerald-500" : "text-slate-400";
  const minRate = rates.length ? Math.min(...rates.map(r => r.rate)) - 0.1 : 6;
  const maxRate = rates.length ? Math.max(...rates.map(r => r.rate)) + 0.1 : 8;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        {latest && (
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{latest.rate}%</p>
            {change !== null && (
              <div className={`flex items-center justify-end gap-1 text-xs font-medium ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                <span>{change > 0 ? "+" : ""}{change} vs prior week</span>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
        </div>
      ) : rates.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-sm text-slate-400">No data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={rates} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minRate, maxRate]}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v.toFixed(2)}%`}
            />
            <Tooltip content={<CustomTooltip color={dotColor} />} />
            <Line
              type="monotone"
              dataKey="rate"
              stroke={lineColor}
              strokeWidth={2.5}
              dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: dotColor, stroke: lineColor, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function MortgageRateChart() {
  const [conventional, setConventional] = useState([]);
  const [fha, setFha] = useState([]);
  const [va, setVa] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke("getMortgageRates", {})
      .then((res) => {
        const process = (arr) =>
          (arr || [])
            .sort((a, b) => a.week.localeCompare(b.week))
            .map((r) => ({ ...r, label: format(parseISO(r.week), "MMM d") }));
        setConventional(process(res.data?.conventional));
        setFha(process(res.data?.fha));
        setVa(process(res.data?.va));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <RateChart
        title="30-Year Conventional Rate"
        subtitle={`YTD ${new Date().getFullYear()} · Freddie Mac PMMS`}
        rates={conventional}
        loading={loading}
        lineColor="#1e3a5f"
        dotColor="#FFFF00"
      />
      <RateChart
        title="30-Year FHA Rate"
        subtitle={`YTD ${new Date().getFullYear()} · MBA / HUD`}
        rates={fha}
        loading={loading}
        lineColor="#7c3aed"
        dotColor="#FFFF00"
      />

      <RateChart
        title="30-Year VA Rate"
        subtitle={`YTD ${new Date().getFullYear()} · MBA / VA`}
        rates={va}
        loading={loading}
        lineColor="#059669"
        dotColor="#FFFF00"
      />
    </div>
  );
}