import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function UserMenu() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const initials = user.full_name
    ? user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : user.email?.[0]?.toUpperCase() || "U";

  const roleLabel = { admin: "Admin", broker: "Broker", user: "Agent" }[user.role] || user.role;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-[#FFFF00] text-slate-900 flex items-center justify-center text-xs font-bold shrink-0">
          {initials}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm font-semibold text-slate-800 leading-none">{user.full_name || user.email}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{roleLabel}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800 truncate">{user.full_name || user.email}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider bg-[#FFFF00]/20 text-slate-700 px-2 py-0.5 rounded-full">
              {roleLabel}
            </span>
          </div>
          {user.role === "admin" && (
            <Link
              to="/NewUsers"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Authorize New Agent
            </Link>
          )}
          <button
            onClick={() => base44.auth.logout()}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}