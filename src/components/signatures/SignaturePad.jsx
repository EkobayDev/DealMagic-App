import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export default function SignaturePad({ onSave, onCancel, signerName = "" }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [mode, setMode] = useState("draw"); // "draw" | "type"
  const [typedSig, setTypedSig] = useState(signerName);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#0a1628";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [mode]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    const canvas = canvasRef.current;
    drawing.current = true;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    e.preventDefault();
  };

  const draw = (e) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setIsEmpty(false);
    e.preventDefault();
  };

  const stopDraw = () => { drawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const getTypedDataURL = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "italic 52px Georgia, serif";
    ctx.fillStyle = "#0a1628";
    ctx.textBaseline = "middle";
    ctx.fillText(typedSig, 20, 75);
    return canvas.toDataURL("image/png");
  };

  const handleSave = () => {
    if (mode === "type") {
      if (!typedSig.trim()) return;
      onSave(getTypedDataURL());
    } else {
      if (isEmpty) return;
      onSave(canvasRef.current.toDataURL("image/png"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setMode("draw")} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${mode === "draw" ? "bg-[#0a1628] text-white border-[#0a1628]" : "bg-white text-slate-500 border-slate-200"}`}>Draw</button>
        <button onClick={() => setMode("type")} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${mode === "type" ? "bg-[#0a1628] text-white border-[#0a1628]" : "bg-white text-slate-500 border-slate-200"}`}>Type</button>
      </div>

      {mode === "draw" ? (
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={600} height={150}
            className="w-full border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 cursor-crosshair touch-none"
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
          />
          <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-slate-300 pointer-events-none select-none" style={{ display: isEmpty ? "block" : "none" }}>Sign here</p>
          <button onClick={clearCanvas} className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-slate-200 text-slate-400">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 p-4">
          <input
            type="text"
            value={typedSig}
            onChange={(e) => setTypedSig(e.target.value)}
            placeholder="Type your full name"
            className="w-full bg-transparent text-3xl italic font-serif text-[#0a1628] outline-none placeholder:text-slate-300 placeholder:text-base placeholder:not-italic"
            style={{ fontFamily: "Georgia, serif" }}
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} className="bg-[#0a1628] text-white hover:bg-[#1e3a5f]"
          disabled={mode === "draw" ? isEmpty : !typedSig.trim()}>
          Apply Signature
        </Button>
      </div>
    </div>
  );
}