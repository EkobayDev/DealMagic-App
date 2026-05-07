import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, FileText, ChevronRight, Hammer, Sparkles, Handshake } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const FORM_CATEGORIES = [
  {
    name: "Purchase & Sale",
    forms: [
      { id: "compensatory-compensation", name: "Compensatory Compensation Agreement", code: "OREC Compensatory Compensation" },
      { id: "uniform-contract", name: "Uniform Contract of Sale of Real Estate", code: "OREC Form 100" },
      { id: "contract-addendum", name: "Contract Addendum", code: "OREC Form 101" },
      { id: "counter-offer", name: "Counter Offer", code: "OREC Form 102" },
      { id: "notice-to-perform", name: "Notice to Perform", code: "OREC Form 103" },
    ],
  },
  {
    name: "Listings",
    forms: [
      { id: "exclusive-listing", name: "Exclusive Right-to-Sell Listing Agreement", code: "OREC Form 200" },
      { id: "exclusive-agency", name: "Exclusive Agency Listing Agreement", code: "OREC Form 201" },
      { id: "listing-amendment", name: "Listing Agreement Amendment", code: "OREC Form 202" },
      { id: "buyer-broker-agreement", name: "Buyer Broker Agreement", code: "OREC Buyer Broker Agreement" },
    ],
  },
  {
    name: "Disclosures",
    forms: [
      { id: "property-disclosure", name: "Residential Property Condition Disclosure", code: "OREC Form 300" },
      { id: "lead-paint", name: "Lead-Based Paint Disclosure", code: "Federal Form" },
      { id: "agency-disclosure", name: "Disclosure of Agency Relationships", code: "OREC Form 302" },
      { id: "wire-fraud-disclosure", name: "Wire Fraud Disclosure and Advisory", code: "OK Wire Fraud Disclosure" },
      { id: "deed-fraud-disclosure", name: "Deed Fraud Disclosure and Advisory", code: "OK Deed Fraud Disclosure" },
    ],
  },
  {
    name: "Addenda",
    forms: [
      { id: "fha-va-addendum", name: "FHA/VA Financing Addendum", code: "OREC Form 400" },
      { id: "inspection-addendum", name: "Inspection Addendum", code: "OREC Form 401" },
      { id: "home-warranty", name: "Home Warranty Addendum", code: "OREC Form 402" },
      { id: "seller-financing", name: "Seller Financing Addendum", code: "OREC Form 403" },
    ],
  },
  {
    name: "Closings",
    forms: [
      { id: "closing-instructions", name: "Closing Instructions", code: "OREC Form 500" },
      { id: "amendment-closing", name: "Amendment to Closing Date", code: "OREC Form 501" },
      { id: "mutual-release", name: "Mutual Release of Contract", code: "OREC Form 502" },
    ],
  },
];

export default function Forms() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filteredCategories = FORM_CATEGORIES.map((cat) => ({
    ...cat,
    forms: cat.forms.filter(
      (f) =>
        (category === "all" || cat.name === category) &&
        (!search || f.name.toLowerCase().includes(search.toLowerCase()) || f.code.toLowerCase().includes(search.toLowerCase()))
    ),
  })).filter((cat) => cat.forms.length > 0);

  const categories = ["all", ...FORM_CATEGORIES.map((c) => c.name)];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">OREC Forms</h1>
          <p className="text-sm text-slate-500 mt-1">Oklahoma Real Estate Commission forms library</p>
        </div>
        <img
          src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
          alt="DealMagic"
          className="h-40 w-auto object-contain ml-auto"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search forms..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                category === c ? "bg-[#FFFF00] text-slate-900" : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      </div>

      {/* BBSA / Buyer Broker CTA */}
      {isAdmin ? (
        <Link
          to="/BBSABuilder"
          className="flex items-center gap-4 bg-violet-50 border border-violet-200 rounded-2xl px-5 py-4 hover:bg-violet-100 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 group-hover:bg-violet-200 transition-colors">
            <Sparkles className="w-5 h-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-violet-800">Build a BBSA from Scratch</p>
            <p className="text-xs text-violet-500 mt-0.5">Create a fully custom Buyer Broker Services Agreement — no templates required</p>
          </div>
          <ChevronRight className="w-5 h-5 text-violet-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      ) : (
        <Link
          to="/BuyerBrokerCreator"
          className="flex items-center gap-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 hover:bg-emerald-100 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
            <Handshake className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">Buyer Broker Creator</p>
            <p className="text-xs text-emerald-500 mt-0.5">Load the published template, fill in your client's details, and export the PDF</p>
          </div>
          <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Form Cards by Category */}
      {filteredCategories.map((cat) => (
        <div key={cat.name}>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">{cat.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {cat.forms.map((form) => (
              <div key={form.id} className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md hover:border-[#FFFF00]/30 transition-all group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-[#FFFF00]/10 transition-colors">
                    <FileText className="w-5 h-5 text-slate-400 group-hover:text-[#cccc00]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 leading-snug">{form.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{form.code}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Link
                    to={`/FormDetail?formId=${form.id}`}
                    className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    Open Form
                  </Link>
                  <Link
                    to={`/FormBuilder?formId=${form.id}`}
                    className="flex items-center justify-center gap-1 flex-1 text-xs font-medium py-1.5 rounded-lg border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
                  >
                    <Hammer className="w-3 h-3" /> Build
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}