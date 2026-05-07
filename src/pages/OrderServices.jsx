import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  ShoppingBag, Camera, ClipboardCheck, Bug, Building2, FileText,
  ArrowLeft, Send, MapPin, User, Loader2, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import VendorElevatorCard from "@/components/vendors/VendorElevatorCard";

const SERVICES = [
  { key: "appraisers",   label: "Appraisers",  icon: ShoppingBag,   vendorCategory: "appraisers" },
  { key: "photography",  label: "Photography", icon: Camera,         vendorCategory: "photography" },
  { key: "inspections",  label: "Inspections", icon: ClipboardCheck, vendorCategory: "inspectors" },
  { key: "pest",         label: "Pest/Termite", icon: Bug,           vendorCategory: "termite" },
  { key: "foundation",   label: "Foundation",  icon: Building2,      vendorCategory: null },
  { key: "title",        label: "Title",        icon: FileText,       vendorCategory: "title" },
  { key: "lawn",         label: "Lawn",         icon: ShoppingBag,   vendorCategory: "lawn" },
  { key: "roofers",      label: "Roofers",      icon: Building2,     vendorCategory: "roofers" },
  { key: "cleaning",     label: "Cleaning",     icon: ShoppingBag,   vendorCategory: "make_ready_cleaning" },
  { key: "painters",     label: "Painters",     icon: ShoppingBag,   vendorCategory: "painters" },
  { key: "flooring",     label: "Flooring",     icon: ShoppingBag,   vendorCategory: "flooring" },
  { key: "handyman",     label: "Handyman",     icon: ShoppingBag,   vendorCategory: "handyman" },
  { key: "hauling",      label: "Hauling",      icon: ShoppingBag,   vendorCategory: "hauling_debris" },
];

const matchCategory = (vendor, category) =>
  category && vendor.category?.toLowerCase() === category.toLowerCase();

export default function OrderServices() {
  const urlParams = new URLSearchParams(window.location.search);
  const transactionId = urlParams.get("transaction_id");
  const preselectedCategory = urlParams.get("category");
  const vendorId = urlParams.get("vendor_id");

  const [selectedService, setSelectedService] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const [agentProfile, setAgentProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => base44.entities.Vendor.list("business_name", 500),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-updated_date", 200),
    enabled: !!currentUser,
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
    base44.entities.AgentProfile.list().then((p) => {
      if (p?.length > 0) setAgentProfile(p[0]);
    }).catch(() => {});
  }, []);

  // Pre-select from URL params
  useEffect(() => {
    if (transactions.length > 0 && transactionId) {
      const t = transactions.find((tx) => tx.id === transactionId);
      if (t) setTransaction(t);
    }
  }, [transactions, transactionId]);

  useEffect(() => {
    if (preselectedCategory) {
      const svc = SERVICES.find((s) => s.vendorCategory === preselectedCategory || s.key === preselectedCategory);
      if (svc) setSelectedService(svc);
    }
  }, [preselectedCategory]);

  useEffect(() => {
    if (vendorId && vendors.length > 0) {
      const v = vendors.find((vd) => vd.id === vendorId);
      if (v) {
        setSelectedVendor(v);
        // also set service to match vendor category
        if (!selectedService) {
          const svc = SERVICES.find((s) => s.vendorCategory && matchCategory(v, s.vendorCategory));
          if (svc) setSelectedService(svc);
        }
      }
    }
  }, [vendorId, vendors]);

  const filteredVendors = selectedService?.vendorCategory
    ? vendors.filter((v) => matchCategory(v, selectedService.vendorCategory))
    : vendors;

  const address = transaction
    ? [transaction.property_address, transaction.city, transaction.state, transaction.zip].filter(Boolean).join(", ")
    : "";

  const handleSend = async () => {
    if (!selectedVendor?.email) {
      toast.error("Please select a vendor first");
      return;
    }
    if (!selectedService) {
      toast.error("Please select a service type first");
      return;
    }
    setSending(true);
    const subject = `${selectedService.label} Order Request${transaction ? ` – ${transaction.property_address}` : ""}`;
    const bodyLines = [
      `Hi ${selectedVendor.contact_name || selectedVendor.business_name},`,
      ``,
      `I'd like to place an order for ${selectedService.label} services${transaction ? " at the following property:" : "."}`,
      transaction ? `` : null,
      transaction ? `Property: ${address}` : null,
      transaction?.buyer_name   ? `Buyer: ${transaction.buyer_name}`   : null,
      transaction?.seller_name  ? `Seller: ${transaction.seller_name}` : null,
      transaction?.closing_date ? `Closing Date: ${new Date(transaction.closing_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : null,
      transaction?.mls_number   ? `MLS #: ${transaction.mls_number}`   : null,
      notes ? `\nAdditional Notes:\n${notes}` : null,
      ``,
      `Please confirm your availability and pricing at your earliest convenience.`,
      ``,
      `Thank you!`,
      ``,
      `— ${agentProfile?.agent_name || ""}`,
      agentProfile?.brokerage_name ? agentProfile.brokerage_name : null,
      agentProfile?.phone          ? `Cell: ${agentProfile.phone}` : null,
      agentProfile?.email          ? `Email: ${agentProfile.email}` : null,
    ].filter((l) => l !== null).join("\n");

    await base44.functions.invoke("sendVendorOrderEmail", {
      to: selectedVendor.email,
      subject,
      body: bodyLines,
    });

    setSending(false);
    toast.success(`Order email sent to ${selectedVendor.business_name}!`);
    setSelectedVendor(null);
    setNotes("");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-14 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">Order Services</h1>
            <p className="text-xs text-slate-400">Select a service category and vendor to send an order request</p>
          </div>
          <img
            src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
            alt="DealMagic"
            className="h-12 w-auto object-contain"
            style={{ mixBlendMode: "multiply" }}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Step 1: Link transaction */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Step 1 — Link to Transaction (optional)
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Select
              value={transaction?.id || "none"}
              onValueChange={(val) => {
                if (val === "none") setTransaction(null);
                else setTransaction(transactions.find((t) => t.id === val) || null);
              }}
            >
              <SelectTrigger className="h-10 w-full sm:w-80">
                <SelectValue placeholder="Choose a transaction..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No transaction linked</SelectItem>
                {transactions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.property_address}{t.city ? `, ${t.city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {transaction && (
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {address}</span>
                {transaction.buyer_name && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {transaction.buyer_name}</span>}
                {transaction.closing_date && <span>📅 Closing: {new Date(transaction.closing_date + "T00:00:00").toLocaleDateString()}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Service type */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Step 2 — Select Service Type
          </p>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((svc) => {
              const count = svc.vendorCategory ? vendors.filter((v) => matchCategory(v, svc.vendorCategory)).length : vendors.length;
              const isActive = selectedService?.key === svc.key;
              return (
                <button
                  key={svc.key}
                  onClick={() => { setSelectedService(svc); setSelectedVendor(null); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    isActive
                      ? "bg-violet-600 text-white border-violet-600 shadow-md"
                      : "bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-700"
                  }`}
                >
                  {React.createElement(svc.icon, { className: "w-4 h-4 shrink-0" })}
                  {svc.label}
                  {count > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-violet-50 text-violet-500 border border-violet-200"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Vendor selection */}
        {selectedService && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Step 3 — Choose a Vendor
            </p>
            <p className="text-xs text-slate-400 mb-4">
              Hover over a contact photo to watch their elevator pitch video.
            </p>

            {filteredVendors.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                <ShoppingBag className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No vendors in this category yet.</p>
                <a href="/Vendors" className="text-xs text-violet-600 hover:underline mt-1 inline-block">Add vendors →</a>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredVendors.map((v) => (
                  <VendorElevatorCard
                    key={v.id}
                    vendor={v}
                    selected={selectedVendor?.id === v.id}
                    onSelect={setSelectedVendor}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Notes + Send */}
        {selectedVendor && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Step 4 — Send Order to {selectedVendor.business_name}
            </p>

            <div className="flex gap-4 items-start mb-4">
              {selectedVendor.contact_photo_url ? (
                <img src={selectedVendor.contact_photo_url} alt={selectedVendor.contact_name} className="w-14 h-14 rounded-full object-cover border-2 border-violet-200 shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xl shrink-0">
                  {selectedVendor.business_name?.[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-800">{selectedVendor.business_name}</p>
                {selectedVendor.contact_name && <p className="text-xs text-slate-500">{selectedVendor.contact_name}</p>}
                {selectedVendor.email && <p className="text-xs text-violet-600">{selectedVendor.email}</p>}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-slate-500 mb-1.5">Additional Notes (optional)</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions, access codes, scheduling preferences..."
                rows={3}
                className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Email will be sent to: <span className="text-violet-600 font-medium">{selectedVendor.email}</span>
              </p>
              <button
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-60"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "Sending..." : "Send Order Email"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}