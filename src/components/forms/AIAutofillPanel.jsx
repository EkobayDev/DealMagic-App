import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Upload, Loader2, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AIAutofillPanel({ fields, onAutofill }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploadedFileUrl(file_url);
    setUploadedFileName(file.name);
    setFileUploading(false);
    toast.success(`"${file.name}" uploaded — click Extract to autofill.`);
  };

  const handleExtract = async () => {
    if (!text.trim() && !uploadedFileUrl) {
      toast.error("Paste some text or upload a document first.");
      return;
    }
    setLoading(true);
    const res = await base44.functions.invoke("aiFormAutofill", {
      rawText: text || undefined,
      fileUrl: uploadedFileUrl || undefined,
      fields: fields.map((f) => ({ key: f.key, label: f.label, type: f.type })),
    });
    setLoading(false);
    const extracted = res.data?.extracted;
    if (!extracted || Object.keys(extracted).length === 0) {
      toast.error("No field values could be extracted. Try adding more details.");
      return;
    }
    onAutofill(extracted);
    toast.success(`Filled ${Object.keys(extracted).length} field(s) from AI extraction!`);
    setOpen(false);
    setText("");
    setUploadedFileUrl(null);
    setUploadedFileName(null);
  };

  return (
    <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl overflow-hidden print:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-violet-100/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-violet-600" />
          <span className="text-sm font-semibold text-violet-800">AI Auto-Fill</span>
          <span className="text-xs text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full">Paste text or upload a doc to fill fields instantly</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-violet-500" /> : <ChevronDown className="w-4 h-4 text-violet-500" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-violet-200">
          <p className="text-xs text-violet-600 pt-3">
            Paste any text (MLS listing, contract, email, notes) or upload a PDF/image — AI will extract and fill all matching form fields.
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste MLS listing text, contract details, email, or any text with property info..."
            rows={5}
            className="w-full text-sm rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
          />

          <div className="flex items-center gap-3 flex-wrap">
            {/* File upload */}
            <label className="cursor-pointer">
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.html" className="hidden" onChange={handleFileUpload} />
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-violet-300 bg-white text-sm text-violet-700 hover:bg-violet-50 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {fileUploading ? "Uploading..." : "Upload Doc / Image"}
              </div>
            </label>

            {uploadedFileName && (
              <div className="flex items-center gap-1.5 text-xs text-violet-700 bg-violet-100 px-2.5 py-1.5 rounded-lg">
                <span>{uploadedFileName}</span>
                <button onClick={() => { setUploadedFileUrl(null); setUploadedFileName(null); }}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <Button
              onClick={handleExtract}
              disabled={loading || fileUploading}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-2 ml-auto"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Extracting..." : "Extract & Fill Fields"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}