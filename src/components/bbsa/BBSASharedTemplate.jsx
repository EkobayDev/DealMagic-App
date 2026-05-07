import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BBSASharedTemplate({ onUseTemplate }) {
  const { data: sharedSessions = [], isLoading } = useQuery({
    queryKey: ["bbsa-shared-template-view"],
    queryFn: () => base44.entities.BBSABuilderSession.filter({ isShared: true }, "-updated_date", 1),
  });

  const template = sharedSessions[0] || null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
        <AlertCircle className="w-10 h-10 mb-3 opacity-30" />
        <p className="font-medium text-slate-600">No template published yet</p>
        <p className="text-sm mt-1">An admin needs to publish a BBSA template from the Fields / PDF Mapper tabs.</p>
      </div>
    );
  }



  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        The admin-published BBSA template is shown below. Use it as a starting point — click <strong>Use This Template</strong> to load it into your Fill &amp; Export tab.
      </p>

      {/* Template card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">{template.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Last updated {new Date(template.updated_date).toLocaleDateString()}
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" /> Published
          </span>
        </div>

        {/* PDF name */}
        {template.pdfName && (
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
            <FileText className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="text-sm text-slate-600 truncate">{template.pdfName}</span>
          </div>
        )}

        {/* CTA */}
        <div className="flex justify-end pt-1">
          <Button
            onClick={() => onUseTemplate(template)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <Download className="w-4 h-4" /> Use This Template → Fill &amp; Export
          </Button>
        </div>
      </div>
    </div>
  );
}