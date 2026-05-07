import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, MapPin, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Colors per field group
const PIN_COLORS = {
  Contact: "#3b82f6",
  Transaction: "#10b981",
  "Agent Profile": "#8b5cf6",
  Custom: "#f59e0b",
  default: "#64748b",
};

const FONT_SIZE_PT = 9;

export default function PDFFieldMapper({
  pdfUrl,
  pdfName,
  canvasFields,
  fieldLabels,
  fieldValues,
  fieldPins,         // { [instanceId]: { page, x, y } }  — x/y as % of page dimensions
  onPinsChange,
  allFieldsMap,
}) {
  const containerRef = useRef(null);
  const canvasRefs = useRef({});
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [pageDims, setPageDims] = useState({}); // { [pageNum]: {width, height} }
  const [assigningField, setAssigningField] = useState(null); // instanceId being placed
  const [showOverlay, setShowOverlay] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const renderingRef = useRef({});

  // Load PDF.js
  useEffect(() => {
    if (!pdfUrl) return;
    let cancelled = false;

    const load = async () => {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      const doc = await pdfjsLib.getDocument(pdfUrl).promise;
      if (cancelled) return;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
    };
    load();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  // Render a single page
  const renderPage = useCallback(async (pageNum) => {
    if (!pdfDoc) return;
    if (renderingRef.current[pageNum]) return;
    renderingRef.current[pageNum] = true;

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = canvasRefs.current[pageNum];
    if (!canvas) { renderingRef.current[pageNum] = false; return; }

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    setPageDims((p) => ({ ...p, [pageNum]: { width: viewport.width, height: viewport.height } }));

    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    renderingRef.current[pageNum] = false;
  }, [pdfDoc, scale]);

  useEffect(() => {
    if (!pdfDoc) return;
    renderingRef.current = {};
    for (let i = 1; i <= numPages; i++) renderPage(i);
  }, [pdfDoc, numPages, renderPage]);

  const handleCanvasClick = (e, pageNum) => {
    if (!assigningField) return;
    const canvas = canvasRefs.current[pageNum];
    const rect = canvas.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;
    const dims = pageDims[pageNum];
    if (!dims) return;

    const xPct = xPx / dims.width;
    const yPct = yPx / dims.height;

    onPinsChange({
      ...fieldPins,
      [assigningField]: { page: pageNum, x: xPct, y: yPct },
    });
    setAssigningField(null);
  };

  const removePin = (instanceId, e) => {
    e.stopPropagation();
    const next = { ...fieldPins };
    delete next[instanceId];
    onPinsChange(next);
  };

  const pinsForPage = (pageNum) =>
    Object.entries(fieldPins).filter(([, pin]) => pin.page === pageNum);

  const getFieldColor = (instanceId) => {
    const field = canvasFields.find((f) => f.instanceId === instanceId);
    if (!field) return PIN_COLORS.default;
    return PIN_COLORS[allFieldsMap[field.key]?.group] || PIN_COLORS.default;
  };

  const unmappedFields = canvasFields.filter((f) => !fieldPins[f.instanceId]);
  const mappedCount = Object.keys(fieldPins).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap bg-white rounded-xl border border-slate-100 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <MapPin className="w-4 h-4 text-violet-500" />
          PDF Field Mapper
          <span className="text-xs text-slate-400 font-normal">— select a field, then click its location on the PDF</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">{mappedCount} / {canvasFields.length} mapped</span>
          <button
            onClick={() => setShowOverlay((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
          >
            {showOverlay ? <><EyeOff className="w-3.5 h-3.5" /> Hide pins</> : <><Eye className="w-3.5 h-3.5" /> Show pins</>}
          </button>
          {numPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-500 w-14 text-center">Page {currentPage}/{numPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))} disabled={currentPage === numPages} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PDF canvas + field palette side by side */}
      <div className="flex gap-3">
        {/* PDF canvas with pins */}
        <div
          ref={containerRef}
          className="flex-1 bg-slate-100 rounded-xl border border-slate-200 overflow-auto min-w-0"
          style={{ maxHeight: 680 }}
        >
        {!pdfDoc && (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin mr-2" />
            Loading PDF…
          </div>
        )}
        {Array.from({ length: numPages }, (_, i) => i + 1)
          .filter((p) => p === currentPage)
          .map((pageNum) => {
            const dims = pageDims[pageNum] || {};
            const pins = pinsForPage(pageNum);
            return (
              <div
                key={pageNum}
                className="relative inline-block"
                style={{ cursor: assigningField ? "crosshair" : "default" }}
                onClick={(e) => handleCanvasClick(e, pageNum)}
              >
                <canvas
                  ref={(el) => { canvasRefs.current[pageNum] = el; }}
                  className="block"
                />
                {/* Overlay pins */}
                {showOverlay && pins.map(([instanceId, pin]) => {
                  const label = fieldLabels[instanceId] || instanceId;
                  const value = fieldValues[instanceId] || "";
                  const color = getFieldColor(instanceId);
                  const left = pin.x * (dims.width || 0);
                  const top = pin.y * (dims.height || 0);
                  return (
                    <div
                      key={instanceId}
                      className="absolute flex items-start gap-0.5 pointer-events-auto"
                      style={{ left, top, transform: "translate(-50%, -50%)" }}
                    >
                      {/* Value text rendered at position */}
                      <div
                        className="relative group"
                        style={{ fontSize: `${FONT_SIZE_PT * scale}px`, color: "#000", whiteSpace: "nowrap" }}
                      >
                        <span
                          className="px-0.5 rounded"
                          style={{ backgroundColor: color + "33", outline: `1px solid ${color}88` }}
                        >
                          {value || <span style={{ color: color, opacity: 0.5 }}>{label}</span>}
                        </span>
                        {/* Remove pin button */}
                        <button
                          onClick={(e) => removePin(instanceId, e)}
                          className="absolute -top-3 -right-3 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ backgroundColor: color, color: "#fff" }}
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Right: field palette */}
        {canvasFields.length > 0 && (
          <div className="w-52 shrink-0 bg-white rounded-xl border border-slate-100 flex flex-col overflow-hidden" style={{ maxHeight: 680 }}>
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {assigningField
                  ? `📍 Placing: "${fieldLabels[assigningField] || assigningField}"`
                  : "Click field → click PDF"}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {canvasFields.map((f) => {
                const label = fieldLabels[f.instanceId] || f.label;
                const isMapped = !!fieldPins[f.instanceId];
                const isActive = assigningField === f.instanceId;
                const color = getFieldColor(f.instanceId);
                return (
                  <button
                    key={f.instanceId}
                    onClick={() => setAssigningField(isActive ? null : f.instanceId)}
                    className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isActive
                        ? "ring-2 ring-violet-400 border-violet-300 bg-violet-50"
                        : isMapped
                        ? "border-slate-100 bg-slate-50 opacity-60 hover:opacity-90"
                        : "border-transparent hover:bg-slate-50"
                    }`}
                    style={{ color }}
                  >
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="flex-1 truncate">{label}</span>
                    {isMapped && <span className="text-[10px]">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}