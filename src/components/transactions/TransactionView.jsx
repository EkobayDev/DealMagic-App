import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import TransactionRepository from "./TransactionRepository";
import SharePortalButton from "./SharePortalButton";
import MergeDocumentsTab from "./MergeDocumentsTab";

const STATUS_BADGE = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  under_contract: "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-slate-100 text-slate-500 border-slate-200",
};

const Section = ({ title, children }) => (
  <div>
    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{title}</h4>
    <div className="grid grid-cols-2 gap-x-6 gap-y-2">{children}</div>
  </div>
);

const Item = ({ label, value }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
};

const DateItem = ({ label, value }) => {
  if (!value) return null;
  return <Item label={label} value={format(parseISO(value), "MMM d, yyyy")} />;
};

export default function TransactionView({ open, onClose, transaction }) {
  const [tab, setTab] = useState("details");
  if (!transaction) return null;
  const t = transaction;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {t.property_address}
            <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-full border ${STATUS_BADGE[t.status]}`}>
              {t.status?.replace("_", " ")}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Share Portal */}
        <div className="mb-2">
          <SharePortalButton transaction={transaction} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-100 -mt-2 mb-2">
          {["details", "documents", "merge"].map((tabName) => (
            <button
              key={tabName}
              onClick={() => setTab(tabName)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === tabName ? "border-[#FFFF00] text-slate-900" : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              {tabName}
            </button>
          ))}
        </div>

        {tab === "documents" && <TransactionRepository transactionId={t.id} />}
        {tab === "merge" && <MergeDocumentsTab transaction={t} />}
        {tab === "details" && (
        <div className="space-y-6">
          <Section title="Property">
            <Item label="Address" value={t.property_address} />
            <Item label="City / ZIP" value={[t.city, t.zip].filter(Boolean).join(", ")} />
            <Item label="County" value={t.county} />
            <Item label="MLS #" value={t.mls_number} />
            <Item label="Type" value={t.property_type?.replace("_", " ")} />
            <Item label="Transaction" value={t.transaction_type} />
          </Section>

          <Section title="Parties">
            <Item label="Agent" value={t.created_by} />
            <Item label="Buyer" value={t.buyer_name} />
            <Item label="Buyer Phone" value={t.buyer_phone} />
            <Item label="Seller" value={t.seller_name} />
            <Item label="Seller Phone" value={t.seller_phone} />
            <Item label="Buyer's Agent" value={t.buyer_agent_name} />
            <Item label="Seller's Agent" value={t.seller_agent_name} />
          </Section>

          <Section title="Financials">
            <Item label="Purchase Price" value={t.purchase_price ? `$${t.purchase_price.toLocaleString()}` : null} />
            <Item label="Listing Price" value={t.listing_price ? `$${t.listing_price.toLocaleString()}` : null} />
            <Item label="Earnest Money" value={t.earnest_money ? `$${t.earnest_money.toLocaleString()}` : null} />
            <Item label="Commission" value={t.commission_percent ? `${t.commission_percent}%` : null} />
            <Item label="Title Company" value={t.title_company} />
            <Item label="Lender" value={t.lender_name} />
          </Section>

          <Section title="Key Dates">
            <DateItem label="Contract Date" value={t.contract_date} />
            <DateItem label="Closing Date" value={t.closing_date} />
            <DateItem label="Inspection" value={t.inspection_deadline} />
            <DateItem label="Appraisal" value={t.appraisal_deadline} />
            <DateItem label="Financing" value={t.financing_deadline} />
            <DateItem label="Title" value={t.title_deadline} />
            <DateItem label="Possession" value={t.possession_date} />
          </Section>

          {t.last_verified_at && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Verification Log</h4>
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.last_verification_updated ? "bg-emerald-500" : "bg-slate-300"}`} />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {t.last_verification_updated ? "Data updated" : "No changes found"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(t.last_verified_at), { addSuffix: true })}
                    {" · "}
                    {format(new Date(t.last_verified_at), "MMM d, yyyy h:mm a")}
                    {t.last_verification_source ? ` · ${t.last_verification_source}` : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          {t.notes && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Notes</h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{t.notes}</p>
            </div>
          )}
        </div>
        )}
        </DialogContent>
    </Dialog>
  );
}