import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { loadPdfJs } from "@/lib/pdfjs-loader";
import { Button } from "@/components/ui/button";
import { FIELD_GROUPS_FLAT } from "./TemplatePDFMapper";
import { toast } from "sonner";

const PIN_COLORS = {
  BBA: "#dc2626",
  Contact: "#3b82f6",
  Transaction: "#10b981",
  "Agent Profile": "#8b5cf6",
  Utility: "#ec4899",
  Custom: "#f59e0b",
  default: "#64748b",
};

/**
 * PDFFormFiller — click pins to enter values inline, save to BBA record.
 *
 * Props:
 *   pdfUrl       — PDF file URL
 *   mappings     — field_mappings array from PDFTemplate
 *   fieldValues  — current saved values (BBA.field_values)
 *   onSave       — async (updatedValues) => void
 *   onClose      — () => void
 */
export default function PDFFormFiller({ pdfUrl, mappings, fieldValues = {}, onSave, onClose }) {
  const canvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale] = useState(1.19);
  const [pageDims, setPageDims] = useState({});
  const [values, setValues] = useState({ ...fieldValues });
  const [activePin, setActivePin] = useState(null); // fieldKey being edited
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  // Load PDF
  useEffect(() => {
    if (!pdfUrl) return;
    let cancelled = false;
    const load = async () => {
      const pdfjsLib = await loadPdfJs();
      const doc = await pdfjsLib.getDocument(pdfUrl).promise;
      if (cancelled) return;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
    };
    load();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  // Render page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    setPageDims({ width: viewport.width, height: viewport.height });
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => { renderPage(); }, [renderPage]);

  // Focus input when a pin is activated
  useEffect(() => {
    if (activePin && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [activePin]);

  const pinsOnPage = mappings.filter((m) => m.page === currentPage);

  const handlePinClick = (m, e) => {
    e.stopPropagation();
    setActivePin(m.fieldKey);
    setInputValue(values[m.fieldKey] || "");
  };

  const commitValue = () => {
    if (!activePin) return;
    setValues((prev) => ({ ...prev, [activePin]: inputValue }));
    setActivePin(null);
    setInputValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") commitValue();
    if (e.key === "Escape") { setActivePin(null); setInputValue(""); }
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(values);
    setSaving(false);
    toast.success("Field values saved!");
  };

  const dims = pageDims;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-100 px-4 py-2.5 shrink-0">
        <p className="text-sm font-semibold text-slate-700">
          Fill Form — click any field pin to enter a value
        </p>
        <div className="flex items-center gap-2">
          {numPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-500 w-16 text-center">Page {currentPage}/{numPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))} disabled={currentPage === numPages} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
            {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Save Values"}
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto bg-slate-100 rounded-xl border border-slate-200" onClick={() => { if (activePin) commitValue(); }}>
        {!pdfDoc && (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin mr-2" /> Loading PDF…
          </div>
        )}

        <div className="relative inline-block">
          <canvas ref={canvasRef} className="block" />

          {/* Pins */}
          {pinsOnPage.map((m) => {
            const group = FIELD_GROUPS_FLAT.find((f) => f.key === m.fieldKey)?.group;
            const color = PIN_COLORS[group] || PIN_COLORS.default;
            const isActive = activePin === m.fieldKey;
            const hasValue = !!values[m.fieldKey];
            const left = m.x * (dims.width || 0);
            const top = m.y * (dims.height || 0);

            return (
              <div
                key={m.fieldKey}
                className="absolute"
                style={{ left, top, transform: "translate(0, -50%)", zIndex: isActive ? 100 : 10 }}
              >
                {isActive ? (
                  /* Inline input */
                  <div className="flex items-center gap-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={commitValue}
                      placeholder={m.label}
                      className="text-xs border-2 border-violet-400 rounded-lg px-2 py-1 bg-white shadow-md focus:outline-none min-w-[140px] max-w-[220px]"
                      style={{ fontSize: "11px" }}
                    />
                    <button
                      onMouseDown={(e) => { e.preventDefault(); commitValue(); }}
                      className="w-5 h-5 rounded-full bg-violet-500 text-white flex items-center justify-center text-[10px] font-bold hover:bg-violet-700 shrink-0"
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  /* Pin label */
                  <button
                    onClick={(e) => handlePinClick(m, e)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium whitespace-nowrap transition-all hover:ring-2 hover:ring-offset-1 cursor-pointer"
                    style={{
                      backgroundColor: hasValue ? color + "33" : "#fff8",
                      outline: `1.5px solid ${color}88`,
                      color: hasValue ? color : "#64748b",
                    }}
                    title={hasValue ? values[m.fieldKey] : `Click to fill: ${m.label}`}
                  >
                    {hasValue ? (
                      <span className="max-w-[120px] truncate font-semibold" style={{ color }}>
                        {values[m.fieldKey]}
                      </span>
                    ) : (
                      <span className="text-slate-400">{m.label}</span>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary of filled fields */}
      <div className="bg-white rounded-xl border border-slate-100 px-4 py-2.5 shrink-0">
        <p className="text-xs font-semibold text-slate-500 mb-1.5">
          {Object.keys(values).filter((k) => values[k]).length} / {mappings.length} fields filled
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
          {mappings.map((m) => (
            <span
              key={m.fieldKey}
              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                values[m.fieldKey]
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              {m.label}{values[m.fieldKey] ? `: ${values[m.fieldKey]}` : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}