import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Download, Layers, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import FillTemplateModal from "@/components/pdftemplates/FillTemplateModal";

export default function MergeDocumentsTab({ transaction }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const { data: pdfTemplates = [], isLoading } = useQuery({
    queryKey: ["pdf-templates-merge"],
    queryFn: () => base44.entities.PDFTemplate.list("-updated_date", 100),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-merge"],
    queryFn: () => base44.entities.Contact.list("full_name", 500),
  });

  const { data: agentProfiles = [] } = useQuery({
    queryKey: ["agent-profiles-merge"],
    queryFn: () => base44.entities.AgentProfile.list("agent_name", 10),
  });

  // Convert transaction to the shape FillTemplateModal expects
  const txForFill = {
    id: transaction.id,
    property_address: transaction.property_address,
    city: transaction.city,
    state: transaction.state,
    zip: transaction.zip,
    county: transaction.county,
    mls_number: transaction.mls_number,
    buyer_name: transaction.buyer_name,
    buyer_email: transaction.buyer_email,
    buyer_phone: transaction.buyer_phone,
    seller_name: transaction.seller_name,
    seller_email: transaction.seller_email,
    seller_phone: transaction.seller_phone,
    purchase_price: transaction.purchase_price,
    earnest_money: transaction.earnest_money,
    commission_percent: transaction.commission_percent,
    commission_amount: transaction.commission_amount,
    lender_name: transaction.lender_name,
    title_company: transaction.title_company,
    closing_date: transaction.closing_date,
    contract_date: transaction.contract_date,
    inspection_deadline: transaction.inspection_deadline,
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-4 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (pdfTemplates.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <Layers className="w-10 h-10 mx-auto text-slate-200" />
        <p className="text-sm font-medium text-slate-500">No PDF templates found</p>
        <p className="text-xs text-slate-400">Create templates in the PDF Templates section first, then return here to merge them with transaction data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <p className="text-xs text-slate-500">
        Select a PDF template below to automatically merge this transaction's data — buyer, seller, agent, dates, and financials — into the document for download.
      </p>

      <div className="space-y-2">
        {pdfTemplates.map((t) => {
          const mappedCount = (t.field_mappings || []).length;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t)}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{t.name}</p>
                <p className="text-xs text-slate-400">
                  {mappedCount > 0 ? `${mappedCount} fields mapped` : "No fields mapped yet"}
                  {t.notes ? ` · ${t.notes}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> Fill &amp; Export
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-400 transition-colors" />
              </div>
            </button>
          );
        })}
      </div>

      {selectedTemplate && (
        <FillTemplateModal
          template={selectedTemplate}
          transactions={[txForFill]}
          contacts={contacts}
          agentProfiles={agentProfiles}
          onClose={() => setSelectedTemplate(null)}
          onExported={() => {}}
        />
      )}
    </div>
  );
}