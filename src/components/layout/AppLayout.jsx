import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import UserMenu from "./UserMenu";
import { Menu } from "lucide-react";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Top header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 z-30 flex items-center justify-between px-4">
        <button onClick={() => setSidebarOpen((v) => !v)} className="p-2 -ml-2 text-slate-600 hover:text-slate-900">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex-1" />
        <UserMenu />
      </div>

      {/* Sidebar grip tab */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className={`fixed top-1/2 -translate-y-1/2 z-50 bg-[#1e3a5f] text-white rounded-r-lg px-1 py-4 flex flex-col items-center gap-1 shadow-md hover:bg-[#2a4f7c] transition-all duration-300 ${sidebarOpen ? "left-64" : "left-0"}`}
        title={sidebarOpen ? "Close menu" : "Open menu"}
      >
        <span className="w-0.5 h-4 bg-white/60 rounded-full" />
        <span className="w-0.5 h-4 bg-white/60 rounded-full" />
        <span className="w-0.5 h-4 bg-white/60 rounded-full" />
      </button>

      {/* Main content — no left margin since sidebar overlays */}
      <main className="pt-14 min-h-screen">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}