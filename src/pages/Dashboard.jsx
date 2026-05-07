import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import AdminDashboard from "../components/dashboard/AdminDashboard";
import BrokerDashboard from "../components/dashboard/BrokerDashboard";
import AgentDashboard from "../components/dashboard/AgentDashboard";

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
      </div>
    );
  }

  if (user.role === "admin") return <AdminDashboard />;
  if (user.role === "broker") return <BrokerDashboard />;
  return <AgentDashboard user={user} />;
}