import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { History, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function BBSAVersionHistory({ onRestore }) {
  const [expandedId, setExpandedId] = useState(null);
  const [restoring, setRestoring] = useState(null);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["bbsa-versions"],
    queryFn: () => base44.entities.BBSATemplateVersion.list("-version_number", 50),
  });

  const handleRestore = async (version) => {
    if (!confirm(`Restore version ${version.version_number}${version.label ? ` — "${version.label}"` : ""}? This will become the new published template.`)) return;
    setRestoring(version.id);
    try {
      await onRestore({
        fields: version.fields || [],
        sourceOptions: version.sourceOptions || [],
        mappings: version.mappings || [],
        pdfUrl: version.pdfUrl || null,
        pdfName: version.pdfName || null,
        label: `Restored from v${version.version_number}`,
      });
      toast.success(`Restored to version ${version.version_number}`);
    } catch (err) {
      toast.error("Restore failed: " + err.message);
    } finally {
      setRestoring(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
        <History className="w-10 h-10 mb-3 opacity-30" />
        <p className="font-medium">No versions yet</p>
        <p className="text-sm mt-1">Each time you publish, a snapshot is saved here for rollback.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500 mb-4">
        Every publish creates a snapshot. Click <strong>Restore</strong> to roll back agents to that version.
      </p>
      {versions.map((v) => {
        const isExpanded = expandedId === v.id;
        const date = new Date(v.created_date).toLocaleString();
        return (
          <div key={v.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : v.id)}
            >
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-violet-600">v{v.version_number}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {v.label || `Version ${v.version_number}`}
                </p>
                <p className="text-xs text-slate-400">{date} · by {v.published_by || "admin"}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400">{(v.fields || []).length} fields · {(v.mappings || []).length} pins</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); handleRestore(v); }}
                  disabled={restoring === v.id}
                  className="gap-1.5 text-violet-700 border-violet-200 hover:bg-violet-50"
                >
                  {restoring === v.id
                    ? <div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                    : <RotateCcw className="w-3.5 h-3.5" />}
                  Restore
                </Button>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-50 bg-slate-50 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Fields in this version</p>
                <div className="flex flex-wrap gap-1.5">
                  {(v.fields || []).map((f) => (
                    <span key={f.id} className="text-xs px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                      {f.label || "Untitled"}
                    </span>
                  ))}
                  {(v.fields || []).length === 0 && <span className="text-xs text-slate-300 italic">No fields</span>}
                </div>
                {v.pdfName && (
                  <p className="text-xs text-slate-500 mt-1">📄 PDF: {v.pdfName}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}