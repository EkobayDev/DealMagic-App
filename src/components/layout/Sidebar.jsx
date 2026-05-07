import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, FolderOpen, Clock, Calculator, User, X, CheckSquare, CalendarDays, ClipboardList, Users, DollarSign, BarChart2, Store, TrendingUp, Building2, MapPin, Sparkles, UserCog, Globe, FileClock, ShoppingBag, CalendarCheck, MessageSquare, ChevronDown, Layers, Handshake, Settings2, PenLine } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { label: "Dashboard", path: "/Dashboard", icon: LayoutDashboard },
      { label: "Clients", path: "/Contacts", icon: Users },
      { label: "Transactions", path: "/Transactions", icon: ClipboardList },
      { label: "Documents", path: "/PDFTemplates", icon: Layers, isDynamicDropdown: true },
      {
        label: "Industry",
        icon: LayoutDashboard,
        children: [
          { label: "Calendar", path: "/Calendar" },
          { label: "HOA", path: "/HOA" },
          { label: "Tasks", path: "/Tasks" },
          { label: "Vendors", path: "/Vendors" },
        ],
      },
    ],
  },
  {
    label: "Agent",
    items: [
      { label: "Deadlines", path: "/Deadlines", icon: Clock },

      { label: "Forms", path: "/Forms", icon: FolderOpen },


      { label: "BBSA Builder", path: "/BBSABuilder", icon: Sparkles, adminOnly: true },
      { label: "Buyer Broker Creator", path: "/BuyerBrokerCreator", icon: Handshake },
      { label: "E-Signature", path: "/ESignature", icon: PenLine },

      { label: "Net Sheets", path: "/NetSheets", icon: Calculator },
      { label: "Offer Builder", path: "/OfferBuilder", icon: ClipboardList },
      { label: "Profile", path: "/Profile", icon: User },
    ],
  },
  {
    label: "Build",
    items: [
      { label: "Features", path: "/Features", icon: Sparkles },
      { label: "Garage Sale", path: "/GarageSale", icon: ShoppingBag },
      { label: "Scheduling", path: "/CalendlyScheduling", icon: CalendarCheck },
    ],
  },
  {
    label: "Local",
    items: [
      { label: "New OKC Listings", path: "/OKCListings", icon: MapPin },
      { label: "YTD Mortgage", path: "/MortgageRates", icon: TrendingUp },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Audit Log", path: "/AuditLog", icon: FileClock },
      { label: "OpenHouseOK", path: "/OpenHouseOKReport", icon: Globe },
      { label: "YTD Commission", path: "/CommissionReport", icon: DollarSign },
      { label: "Commission Logic", path: "/BrokerageTable", icon: Settings2 },
    ],
  },
  {
    label: "Tables",
    items: [
      { label: "Brokerage", path: "/BrokerageTable", icon: Building2 },
      { label: "Agents by Brokerage", path: "/AgentsByBrokerage", icon: Users },
    ],
  },
  {
    label: "Admin",
    adminOnly: true,
    items: [
      { label: "Users", path: "/NewUsers", icon: UserCog },
      { label: "Vendor Approvals", path: "/VendorApprovals", icon: Store },
    ],
  },
];

export default function Sidebar({ isOpen, onToggle }) {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [expandedGroups, setExpandedGroups] = useState(["Interviews"]);

  const { data: pdfTemplates = [] } = useQuery({
    queryKey: ["sidebar-pdf-templates"],
    queryFn: () => base44.entities.PDFTemplate.list("-updated_date", 50),
    staleTime: 60000,
  });

  const toggleGroup = (label) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onToggle} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 w-64 text-white flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{backgroundColor: '#1e3a5f'}}
      >
        {/* Logo */}
        <div className="p-4 border-b border-white/10 flex items-center justify-center bg-white">
          <img
            src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
            alt="DealMagic"
            className="h-44 w-auto object-contain"
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {NAV_SECTIONS.filter((section) => !section.adminOnly || isAdmin).map((section, si) => (
            <div key={si}>
              {section.label && (
                <p className="text-[20px] font-semibold uppercase tracking-widest text-[#FFFF00] px-4 mb-1">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.filter((item) => {
                    if (item.adminOnly && !isAdmin) return false;
                    if (item.agentOnly && isAdmin) return false;
                    return true;
                  }).map((item) => {
                  // Dynamic dropdown (e.g. PDF Templates with live data)
                  if (item.isDynamicDropdown) {
                    const isExpanded = expandedGroups.includes(item.label);
                    const isActive = location.pathname === item.path;
                    return (
                      <div key={item.label}>
                        <button
                          onClick={() => toggleGroup(item.label)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 group ${
                            isActive ? "bg-[#FFFF00]/10 text-[#FFFF00]" : "text-white hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <item.icon className={`w-5 h-5 ${isActive ? "text-[#FFFF00]" : "text-slate-500 group-hover:text-slate-300"}`} />
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                        {isExpanded && (
                          <div className="ml-8 mt-1 space-y-1">
                            <Link
                              to={item.path}
                              onClick={onToggle}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                              All Templates
                            </Link>
                            {pdfTemplates.length === 0 && (
                              <p className="px-3 py-1.5 text-xs text-slate-500 italic">No templates yet</p>
                            )}
                            {pdfTemplates.map((t) => (
                              <Link
                                key={t.id}
                                to={`/PDFTemplates`}
                                onClick={onToggle}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all truncate"
                                title={t.name}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 opacity-80 shrink-0" />
                                <span className="truncate">{t.name}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Group with children
                  if (item.children) {
                    const isExpanded = expandedGroups.includes(item.label);
                    const anyChildActive = item.children.some((c) => location.pathname === c.path);
                    return (
                      <div key={item.label}>
                        <button
                          onClick={() => toggleGroup(item.label)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 group ${
                            anyChildActive ? "bg-[#FFFF00]/10 text-[#FFFF00]" : "text-white hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <item.icon className={`w-5 h-5 ${anyChildActive ? "text-[#FFFF00]" : "text-slate-500 group-hover:text-slate-300"}`} />
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                        {isExpanded && (
                          <div className="ml-8 mt-1 space-y-1">
                            {item.children.map((child) => {
                              const isChildActive = location.pathname === child.path;
                              return (
                                <Link
                                  key={child.path}
                                  to={child.path}
                                  onClick={onToggle}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                    isChildActive ? "bg-[#FFFF00]/10 text-[#FFFF00]" : "text-slate-400 hover:text-white hover:bg-white/5"
                                  }`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const isActive = location.pathname === item.path ||
                    (item.path === "/Dashboard" && location.pathname === "/");
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onToggle}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 group ${
                       isActive
                         ? "bg-[#FFFF00]/10 text-[#FFFF00]"
                         : "text-white hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? "text-[#FFFF00]" : "text-slate-500 group-hover:text-slate-300"}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="relative group flex justify-center mb-2">
            <span className="text-[15px] font-semibold px-3 py-1.5 rounded-full bg-[#FFFF00]/10 text-[#FFFF00] cursor-default border border-[#FFFF00]/20">
              What is DealMagic?
            </span>
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-slate-800 text-white text-[16px] rounded-xl p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center leading-relaxed">
              DealMagic delivers the industry specific power of AI to real estate professionals as they manage and grow their personal marketshare.
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
            </div>
          </div>
          <p className="text-[10px] text-slate-600 text-center">© 2026 DealMagic Oklahoma</p>
        </div>

        {/* Close button for mobile */}
        <button
          onClick={onToggle}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </aside>
    </>
  );
}