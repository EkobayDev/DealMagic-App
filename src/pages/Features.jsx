import React from "react";
import {
  LayoutDashboard, FileText, FolderOpen, Clock, Calculator, CheckSquare,
  CalendarDays, ClipboardList, Users, DollarSign, Store, TrendingUp,
  Building2, MapPin, PenLine, Shield, Search, Mail, Zap
} from "lucide-react";

const FEATURES = [
  {
    category: "Transactions",
    icon: FileText,
    color: "bg-blue-50 text-blue-600",
    items: [
      "Track every deal from Active → Under Contract → Pending → Closed",
      "Store buyer, seller, agent, lender, and title company info",
      "Record purchase price, commission %, earnest money, and closing date",
      "Log all key deadline dates: inspection, appraisal, financing, title, possession",
      "Automated verification checks that update transaction data from Zillow",
      "View a full transaction detail sheet at a glance",
    ],
  },
  {
    category: "Contacts",
    icon: Users,
    color: "bg-purple-50 text-purple-600",
    items: [
      "Store buyers, sellers, lenders, title reps, agents, and more",
      "Link contacts directly to one or more transactions",
      "Search contacts by name, email, or phone",
      "AI-powered listing search based on buyer notes and criteria",
    ],
  },
  {
    category: "Forms & Documents",
    icon: FolderOpen,
    color: "bg-amber-50 text-amber-600",
    items: [
      "Access a full library of OREC forms (Purchase & Sale, Disclosures, Addenda, Closings)",
      "Fill forms digitally with auto-population from transaction data",
      "Auto-save form progress as you type",
      "Print completed forms directly from the browser",
      "Send forms for eSignature to buyers, sellers, and agents",
      "Signers receive a link and can sign on any device",
    ],
  },
  {
    category: "Offer Builder",
    icon: ClipboardList,
    color: "bg-indigo-50 text-indigo-600",
    items: [
      "Assemble a complete offer package from OREC forms in seconds",
      "Smart loan type selector auto-adds the correct addenda (FHA, VA, RD, Sec 184, DPA, etc.)",
      "Drag to reorder forms in your package",
      "Link the offer package to a transaction",
      "One-click launch any form in the package",
      "Send full offer package for eSignature with one action",
    ],
  },
  {
    category: "Net Sheets",
    icon: Calculator,
    color: "bg-teal-50 text-teal-600",
    items: [
      "Buyer Net Sheet — estimate cash to close including down payment, closing costs, and prepaid items",
      "Seller Net Sheet — estimate proceeds after payoff, commissions, and fees",
      "Save net sheets to a transaction for future reference",
      "Customizable disclaimer text on all net sheets",
    ],
  },
  {
    category: "Deadlines & Calendar",
    icon: Clock,
    color: "bg-red-50 text-red-600",
    items: [
      "See all upcoming deadlines across every active transaction in one view",
      "Color-coded urgency: overdue, due today, due soon, upcoming",
      "Full monthly calendar view of all transaction milestone dates",
      "Filter deadlines by status",
    ],
  },
  {
    category: "Tasks",
    icon: CheckSquare,
    color: "bg-emerald-50 text-emerald-600",
    items: [
      "Kanban-style task board: Todo → In Progress → Review → Done",
      "Assign tasks a priority (Low, Medium, High) and a due date",
      "Link tasks to specific transactions",
      "Drag and drop tasks between columns",
    ],
  },
  {
    category: "Vendors",
    icon: Store,
    color: "bg-orange-50 text-orange-600",
    items: [
      "Maintain a trusted vendor directory across 11 service categories",
      "Store contact info, photos, website, and service area",
      "Star ratings and personal review notes for each vendor",
      "Team-based 'Like' system to surface top-rated vendors",
      "Filter vendors by category",
    ],
  },
  {
    category: "Commission Reports",
    icon: DollarSign,
    color: "bg-yellow-50 text-yellow-600",
    items: [
      "YTD commission dashboard showing gross earnings and brokerage splits",
      "Tiered split calculation based on a $1.5M sales volume threshold",
      "Track closed, under-contract, and active deal values",
      "Projection of potential additional earnings from open pipeline",
      "Printable commission report",
    ],
  },
  {
    category: "HOA / Subdivisions",
    icon: Building2,
    color: "bg-slate-50 text-slate-600",
    items: [
      "Store HOA and subdivision records",
      "Upload and manage CCR (Covenants, Conditions & Restrictions) documents",
      "Quick access to documents per subdivision during a transaction",
    ],
  },
  {
    category: "Market Intelligence",
    icon: MapPin,
    color: "bg-rose-50 text-rose-600",
    items: [
      "New OKC Metro Listings — browse active residential listings from the last 7 days",
      "Listings include price, beds/baths, sqft, days on market, and a direct Zillow link",
      "AI search matches listings to a buyer's specific criteria from their contact notes",
      "Refresh listings anytime for the latest market data",
    ],
  },
  {
    category: "Mortgage Rates",
    icon: TrendingUp,
    color: "bg-cyan-50 text-cyan-600",
    items: [
      "YTD weekly mortgage rate charts for Conventional, FHA, and VA loans",
      "Visual trend lines showing rate movement week-over-week",
      "Current rate displayed with change vs. prior week",
    ],
  },
  {
    category: "eSignatures",
    icon: PenLine,
    color: "bg-violet-50 text-violet-600",
    items: [
      "Create signature requests for any form and any signer",
      "Signers receive a secure link — no login required",
      "Signers can draw their signature on any device",
      "Track signed, pending, and declined requests",
      "Signature requests tied to transactions and forms",
    ],
  },
  {
    category: "Agent Profile",
    icon: Shield,
    color: "bg-gray-50 text-gray-600",
    items: [
      "Store your license number, photo, brokerage info, and contact details",
      "Upload your logo for use across forms and net sheets",
      "Set default commission % and title company",
      "Add a custom disclaimer for net sheets",
    ],
  },
];

export default function Features() {
  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">DealMagic Features</h1>
          <p className="text-slate-500 mt-2 text-sm max-w-xl">
            Everything you need to manage your real estate business — from first contact to closed deal.
          </p>
        </div>
        <img
          src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
          alt="DealMagic"
          className="h-28 w-auto object-contain shrink-0"
          style={{ mixBlendMode: "multiply" }}
        />
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {FEATURES.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.category} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${section.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-800">{section.category}</h2>
              </div>
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#FFFF00] border border-yellow-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Footer tagline */}
      <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "#1e3a5f" }}>
        <Zap className="w-6 h-6 text-[#FFFF00] mx-auto mb-2" />
        <p className="text-white font-semibold text-base">Built for Oklahoma Real Estate Professionals</p>
        <p className="text-slate-400 text-sm mt-1">DealMagic delivers the power of AI to agents managing and growing their personal marketshare.</p>
      </div>
    </div>
  );
}