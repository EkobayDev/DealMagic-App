import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Calculator, Trash2, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";

export default function TransactionRepository({ transactionId }) {
  const queryClient = useQueryClient();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["tx-docs", transactionId],
    queryFn: () => base44.entities.TransactionDocument.filter({ transaction_id: transactionId }, "-created_date", 50),
    enabled: !!transactionId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TransactionDocument.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tx-docs", transactionId] }),
  });

  if (isLoading) {
    return <div className="text-sm text-slate-400 py-6 text-center">Loading documents...</div>;
  }

  if (docs.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3">
          <FileText className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-sm text-slate-400">No saved documents yet.</p>
        <p className="text-xs text-slate-300 mt-1">Save forms or net sheets to this transaction and they'll appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors group">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${doc.doc_type === "form" ? "bg-blue-50" : "bg-green-50"}`}>
            {doc.doc_type === "form"
              ? <FileText className="w-4 h-4 text-blue-500" />
              : <Calculator className="w-4 h-4 text-green-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
            <p className="text-xs text-slate-400">
              {doc.doc_type === "form" ? "Form" : `Net Sheet — ${doc.net_sheet_type}`}
              {doc.created_date ? ` · Saved ${format(parseISO(doc.created_date), "MMM d, yyyy")}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {doc.doc_type === "form" && doc.form_id && (
              <Link
                to={`/FormDetail?formId=${doc.form_id}&docId=${doc.id}`}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                title="Open form"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            )}
            <button
              onClick={() => { if (confirm("Delete this document?")) deleteMutation.mutate(doc.id); }}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}