import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ShoppingBag, Camera, ClipboardCheck, Bug, Building2, FileText, ChevronRight } from "lucide-react";

const SERVICES = [
  { key: "appraisers",  label: "Appraisers",   icon: ShoppingBag,    vendorCategory: "appraisers" },
  { key: "photography", label: "Photography",  icon: Camera,          vendorCategory: "photography" },
  { key: "inspections", label: "Inspections",  icon: ClipboardCheck,  vendorCategory: "inspectors" },
  { key: "pest",        label: "Pest/Termite", icon: Bug,             vendorCategory: "termite" },
  { key: "foundation",  label: "Foundation",   icon: Building2,       vendorCategory: null },
  { key: "title",       label: "Title",         icon: FileText,        vendorCategory: "title" },
  { key: "lawn",        label: "Lawn",          icon: ShoppingBag,    vendorCategory: "lawn" },
  { key: "roofers",     label: "Roofers",       icon: Building2,      vendorCategory: "roofers" },
  { key: "cleaning",    label: "Cleaning",      icon: ShoppingBag,    vendorCategory: "make_ready_cleaning" },
  { key: "painters",    label: "Painters",      icon: ShoppingBag,    vendorCategory: "painters" },
  { key: "flooring",    label: "Flooring",      icon: ShoppingBag,    vendorCategory: "flooring" },
  { key: "handyman",    label: "Handyman",      icon: ShoppingBag,    vendorCategory: "handyman" },
  { key: "hauling",     label: "Hauling",       icon: ShoppingBag,    vendorCategory: "hauling_debris" },
];

const matchCategory = (vendor, category) =>
  category && vendor.category?.toLowerCase() === category.toLowerCase();

const navigateToOrderServices = ({ transactionId, category, vendorId } = {}) => {
  const params = new URLSearchParams();
  if (transactionId) params.set("transaction_id", transactionId);
  if (category) params.set("category", category);
  if (vendorId) params.set("vendor_id", vendorId);
  window.location.href = `/OrderServices?${params.toString()}`;
};

export default function OrderServicesDropdown({ transaction, preselectedVendor }) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const ref = useRef(null);

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => base44.entities.Vendor.list("business_name", 500),
  });

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // When used from a vendor card — navigate directly to the order page pre-selecting that vendor
  if (preselectedVendor) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigateToOrderServices({
            transactionId: transaction?.id,
            vendorId: preselectedVendor.id,
            category: preselectedVendor.category,
          });
        }}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors whitespace-nowrap"
      >
        <ShoppingBag className="w-3 h-3" />
        Order Services
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!open) {
            const rect = e.currentTarget.getBoundingClientRect();
            setOpenUpward(rect.bottom > window.innerHeight - 260);
          }
          setOpen((v) => !v);
        }}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors whitespace-nowrap"
      >
        <ShoppingBag className="w-3 h-3" />
        Order Services
      </button>

      {open && (
        <div className={`absolute right-0 z-[9999] bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 w-52 ${openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"}`}>
          <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Select Service</p>
          {SERVICES.map(({ key, label, icon, vendorCategory }) => {
            const count = vendorCategory ? vendors.filter((v) => matchCategory(v, vendorCategory)).length : null;
            return (
              <button
                key={key}
                onClick={() => {
                  setOpen(false);
                  navigateToOrderServices({
                    transactionId: transaction?.id,
                    category: vendorCategory || key,
                  });
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors text-left"
              >
                {React.createElement(icon, { className: "w-4 h-4 shrink-0" })}
                <span className="flex-1">{label}</span>
                {count !== null && (
                  <span className="text-[10px] font-semibold text-violet-400 bg-violet-50 px-1.5 py-0.5 rounded-full border border-violet-200">
                    {count}
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}