import React from "react";
import MortgageRateChart from "@/components/dashboard/MortgageRateChart";

export default function MortgageRates() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">YTD Mortgage Rates</h1>
        <p className="text-sm text-slate-500 mt-1">30-Year Conventional — Freddie Mac PMMS</p>
      </div>
      <MortgageRateChart />
    </div>
  );
}