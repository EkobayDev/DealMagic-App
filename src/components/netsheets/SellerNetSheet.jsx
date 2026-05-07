import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { jsPDF } from "jspdf";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SaveToTransactionButton from "./SaveToTransactionButton";

const OK_COUNTIES = [
  "Adair","Alfalfa","Atoka","Beaver","Beckham","Blaine","Bryan","Caddo","Canadian","Carter",
  "Cherokee","Choctaw","Cimarron","Cleveland","Coal","Comanche","Cotton","Craig","Creek","Custer",
  "Delaware","Dewey","Ellis","Garfield","Garvin","Grady","Grant","Greer","Harmon","Harper",
  "Haskell","Hughes","Jackson","Jefferson","Johnston","Kay","Kingfisher","Kiowa","Latimer",
  "Le Flore","Lincoln","Logan","Love","Major","Marshall","Mayes","McClain","McCurtain","McIntosh",
  "Murray","Muskogee","Noble","Nowata","Okfuskee","Oklahoma","Okmulgee","Osage","Ottawa","Pawnee",
  "Payne","Pittsburg","Pontotoc","Pottawatomie","Pushmataha","Roger Mills","Rogers","Seminole",
  "Sequoyah","Stephens","Texas","Tillman","Tulsa","Wagoner","Washington","Washita","Woods","Woodward"
];

const num = (v) => parseFloat(String(v).replace(/,/g, "")) || 0;
const fmt$ = (v) => `$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const calcOKDocStamp = (price) => Math.ceil(price / 500) * 0.75;

export default function SellerNetSheet() {
  const [vals, setVals] = useState({
    address: "", city: "", state: "OK", zip: "", county: "Cleveland",
    salePrice: "", closingDate: "",
    mortgageBalance: "",
    // Broker's Fee
    listingCommPct: "3", buyerAgentCommPct: "3",
    // Title Charges
    titleInsurance: "1200", closingFee: "500", titleSearch: "0", titleExam: "0",
    // Government Recording & Transfer Charges
    recordingFee: "50", okDocStampCustom: "",
    // Taxes / Prorations
    prorations: "0",
    // Other
    repairs: "0", homeWarranty: "500", otherCosts: "0",
  });

  const set = (k, v) => setVals((p) => ({ ...p, [k]: v }));

  const { data: profiles = [] } = useQuery({
    queryKey: ["agentProfile"],
    queryFn: () => base44.entities.AgentProfile.list(),
  });
  const profile = profiles[0] || null;

  const calc = useMemo(() => {
    const price = num(vals.salePrice);
    const mortgage = num(vals.mortgageBalance);

    const listingComm = price * (num(vals.listingCommPct) / 100);
    const buyerComm = price * (num(vals.buyerAgentCommPct) / 100);
    const totalComm = listingComm + buyerComm;

    const titleIns = num(vals.titleInsurance);
    const closingFee = num(vals.closingFee);
    const titleSearch = num(vals.titleSearch);
    const titleExam = num(vals.titleExam);
    const titleCosts = titleIns + closingFee + titleSearch + titleExam;

    const docStamp = vals.okDocStampCustom ? num(vals.okDocStampCustom) : calcOKDocStamp(price);
    const recordingFee = num(vals.recordingFee);
    const govCosts = docStamp + recordingFee;

    const prorations = num(vals.prorations);
    const repairs = num(vals.repairs);
    const warranty = num(vals.homeWarranty);
    const other = num(vals.otherCosts);

    const totalDeductions = totalComm + titleCosts + govCosts + prorations + repairs + warranty + other;
    const netProceeds = price - mortgage - totalDeductions;

    return {
      listingComm, buyerComm, totalComm,
      titleIns, closingFee, titleSearch, titleExam, titleCosts,
      docStamp, recordingFee, govCosts,
      prorations, repairs, warranty, other,
      totalDeductions, netProceeds,
    };
  }, [vals]);

  const renderField = (label, field, prefix, suffix) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-500">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{prefix}</span>}
        <Input type="number" value={vals[field]} onChange={(e) => set(field, e.target.value)}
          className={`h-10 ${prefix ? "pl-7" : ""} ${suffix ? "pr-8" : ""}`} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{suffix}</span>}
      </div>
    </div>
  );

  const exportPDF = async () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = 0;

    // ── Header bar ──────────────────────────────────────────────
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageW, 38, "F");

    if (profile?.logo_url) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((res) => { img.onload = res; img.onerror = res; img.src = profile.logo_url; });
        doc.addImage(img, "PNG", 10, 4, 30, 30);
      } catch {}
    }

    const textX = profile?.logo_url ? 46 : 14;
    doc.setTextColor(255, 255, 0);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text("SELLER'S ESTIMATED NET PROCEEDS", textX, 14);
    doc.setFontSize(8.5);
    doc.setTextColor(180, 180, 180);
    if (profile?.agent_name) doc.text(profile.agent_name, textX, 22);
    if (profile?.brokerage_name) doc.text(profile.brokerage_name, textX, 29);
    if (profile?.phone) doc.text(profile.phone, pageW - 14, 22, { align: "right" });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageW - 14, 29, { align: "right" });
    y = 46;

    // ── Property block ──────────────────────────────────────────
    if (vals.address) {
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(vals.address, 14, y); y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const addrLine = [vals.city, vals.state, vals.zip].filter(Boolean).join(", ") + (vals.county ? ` · ${vals.county} County` : "");
      doc.text(addrLine, 14, y); y += 5;
      const details = [`Sale Price: ${fmt$(num(vals.salePrice))}`, vals.closingDate ? `Closing: ${new Date(vals.closingDate + "T00:00:00").toLocaleDateString()}` : ""].filter(Boolean).join("   |   ");
      doc.text(details, 14, y); y += 8;
    }

    const drawSection = (title, rows) => {
      if (y > pageH - 30) { doc.addPage(); y = 20; }
      doc.setFillColor(30, 58, 95);
      doc.rect(12, y - 4, pageW - 24, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 0);
      doc.text(title.toUpperCase(), 14, y + 0.5);
      y += 9;
      rows.forEach(({ label, value, bold: b, highlight: h, sub: s }) => {
        if (y > pageH - 20) { doc.addPage(); y = 20; }
        if (h) { doc.setFillColor(255, 255, 180); doc.rect(12, y - 4, pageW - 24, 7, "F"); }
        doc.setFont("helvetica", b ? "bold" : "normal");
        doc.setFontSize(9);
        doc.setTextColor(b ? 15 : 60, b ? 15 : 60, b ? 15 : 60);
        doc.text(label, s ? 20 : 14, y);
        doc.text(fmt$(value), pageW - 14, y, { align: "right" });
        y += 7;
      });
      y += 5;
    };

    drawSection("Sale Price & Mortgage", [
      { label: "Sale Price", value: num(vals.salePrice), bold: true },
      { label: "Mortgage Payoff", value: num(vals.mortgageBalance) },
    ]);

    drawSection("A. Broker's Fee", [
      { label: `Listing Commission (${vals.listingCommPct}%)`, value: calc.listingComm, sub: true },
      { label: `Buyer Agent Commission (${vals.buyerAgentCommPct}%)`, value: calc.buyerComm, sub: true },
      { label: "Subtotal — Broker's Fee", value: calc.totalComm, bold: true },
    ]);

    drawSection("B. Title Charges", [
      { label: "Title Insurance", value: calc.titleIns, sub: true },
      { label: "Closing / Settlement Fee", value: calc.closingFee, sub: true },
      ...(num(vals.titleSearch) > 0 ? [{ label: "Title Search", value: calc.titleSearch, sub: true }] : []),
      ...(num(vals.titleExam) > 0 ? [{ label: "Title Examination", value: calc.titleExam, sub: true }] : []),
      { label: "Subtotal — Title Charges", value: calc.titleCosts, bold: true },
    ]);

    drawSection("C. Government Recording & Transfer Charges", [
      { label: `OK Documentary Stamp Tax ($0.75/$500)`, value: calc.docStamp, sub: true },
      { label: "Recording Fees", value: calc.recordingFee, sub: true },
      { label: "Subtotal — Gov. Charges", value: calc.govCosts, bold: true },
    ]);

    drawSection("D. Taxes & Prorations", [
      { label: "Tax / Other Prorations", value: calc.prorations, bold: true },
    ]);

    drawSection("E. Additional Costs", [
      ...(calc.repairs > 0 ? [{ label: "Repairs / Credits", value: calc.repairs }] : []),
      ...(calc.warranty > 0 ? [{ label: "Home Warranty", value: calc.warranty }] : []),
      ...(calc.other > 0 ? [{ label: "Other Costs", value: calc.other }] : []),
    ]);

    drawSection("F. Seller's Estimated Net Proceeds", [
      { label: "Sale Price", value: num(vals.salePrice) },
      { label: "Less: Mortgage Payoff", value: -num(vals.mortgageBalance) },
      { label: "Less: Total Deductions (A–E)", value: -calc.totalDeductions },
      { label: "ESTIMATED NET PROCEEDS", value: calc.netProceeds, bold: true, highlight: true },
    ]);

    // Disclaimer
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, pageW - 14, y); y += 6;
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    const disclaimer = profile?.net_sheet_disclaimer ||
      "Estimates only. Actual costs may vary. Oklahoma documentary stamp tax is $0.75 per $500 (or fraction thereof) of consideration. Not intended as legal or financial advice.";
    const lines = doc.splitTextToSize(disclaimer, pageW - 28);
    doc.text(lines, 14, y);

    doc.save(`Seller-Net-Sheet${vals.address ? `-${vals.address.replace(/\s+/g, "-")}` : ""}.pdf`);
  };

  const Row = ({ label, value, bold, highlight, sub, isNeg }) => (
    <div className={`flex justify-between py-1.5 ${bold ? "font-semibold text-slate-900" : "text-slate-600"} ${highlight ? "bg-[#FFFF00]/20 -mx-4 px-4 rounded-lg" : ""} ${sub ? "pl-4" : ""}`}>
      <span className={`text-sm ${sub ? "text-slate-400 text-xs" : ""}`}>{label}</span>
      <span className={`text-sm font-medium ${isNeg ? "text-red-600" : ""}`}>
        {isNeg ? "-" : ""}{fmt$(value)}
      </span>
    </div>
  );

  const SectionCard = ({ title, letter, children }) => (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="bg-navy-800 px-5 py-2.5 flex items-center gap-3" style={{backgroundColor: '#1e3a5f'}}>
        <span className="text-white font-bold text-sm">{letter}.</span>
        <h3 className="text-xs font-semibold text-blue-100 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-5 divide-y divide-slate-50">{children}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Inputs ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Property Address</h3>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">Street Address</Label>
          <Input type="text" value={vals.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Main St" className="h-10" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">City</Label>
            <Input type="text" value={vals.city} onChange={(e) => set("city", e.target.value)} placeholder="Oklahoma City" className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">State</Label>
            <Input type="text" value={vals.state} onChange={(e) => set("state", e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Zip</Label>
            <Input type="text" value={vals.zip} onChange={(e) => set("zip", e.target.value)} placeholder="73101" className="h-10" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">County</Label>
          <Select value={vals.county} onValueChange={(v) => set("county", v)}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-60">
              {OK_COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider pt-2">Sale Details</h3>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">Closing Date</Label>
          <Input type="date" value={vals.closingDate} onChange={(e) => set("closingDate", e.target.value)} className="h-10" />
        </div>
        {renderField("Sale Price", "salePrice", "$")}
        {renderField("Mortgage Payoff Balance", "mortgageBalance", "$")}

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider pt-2">A. Broker's Fee</h3>
        <div className="grid grid-cols-2 gap-4">
          {renderField("Listing Agent %", "listingCommPct", null, "%")}
          {renderField("Buyer's Agent %", "buyerAgentCommPct", null, "%")}
        </div>

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider pt-2">B. Title Charges</h3>
        {renderField("Title Insurance", "titleInsurance", "$")}
        {renderField("Closing / Escrow Fee", "closingFee", "$")}
        {renderField("Title Search", "titleSearch", "$")}
        {renderField("Title Examination", "titleExam", "$")}

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider pt-2">C. Government Charges</h3>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">OK Documentary Stamp Tax (auto-calculated)</Label>
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
            {fmt$(calc.docStamp)} <span className="text-xs text-slate-400">($0.75 per $500)</span>
          </div>
        </div>
        {renderField("Override Doc Stamp (optional)", "okDocStampCustom", "$")}
        {renderField("Recording Fees", "recordingFee", "$")}

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider pt-2">D. Taxes & Prorations</h3>
        {renderField("Tax / Other Prorations", "prorations", "$")}

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider pt-2">E. Additional Costs</h3>
        {renderField("Repairs / Credits", "repairs", "$")}
        {renderField("Home Warranty", "homeWarranty", "$")}
        {renderField("Other Costs", "otherCosts", "$")}
      </div>

      {/* ── Results ───────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SaveToTransactionButton netSheetType="seller" vals={vals} />
          <Button onClick={exportPDF} variant="outline" className="gap-2 text-sm">
            <Download className="w-4 h-4" /> Export PDF
          </Button>
        </div>

        {/* Agent card */}
        {profile && (
          <div className="rounded-2xl p-4 flex items-center gap-4" style={{backgroundColor: '#1e3a5f'}}>
            {profile.logo_url && <img src={profile.logo_url} alt="Logo" className="h-12 object-contain" />}
            <div>
              <p className="text-sm font-semibold text-white">{profile.agent_name}</p>
              {profile.brokerage_name && <p className="text-xs text-slate-400">{profile.brokerage_name}</p>}
              {profile.phone && <p className="text-xs text-slate-400">{profile.phone}</p>}
            </div>
          </div>
        )}

        {vals.address && (
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-800">{vals.address}</p>
            <p className="text-sm text-slate-500">{[vals.city, vals.state, vals.zip].filter(Boolean).join(", ")}{vals.county ? ` · ${vals.county} County` : ""}</p>
            <div className="flex flex-wrap gap-4 mt-1 text-xs text-slate-500">
              <span>Sale Price: <b>{fmt$(num(vals.salePrice))}</b></span>
              {vals.closingDate && <span>Closing: <b>{new Date(vals.closingDate + "T00:00:00").toLocaleDateString()}</b></span>}
            </div>
          </div>
        )}

        <SectionCard title="Sale Price & Mortgage" letter="—">
          <Row label="Sale Price" value={num(vals.salePrice)} bold />
          <Row label="Mortgage Payoff" value={num(vals.mortgageBalance)} isNeg />
        </SectionCard>

        <SectionCard title="Broker's Fee" letter="A">
          <Row label={`Listing Commission (${vals.listingCommPct}%)`} value={calc.listingComm} sub />
          <Row label={`Buyer Agent Commission (${vals.buyerAgentCommPct}%)`} value={calc.buyerComm} sub />
          <Row label="Subtotal" value={calc.totalComm} bold />
        </SectionCard>

        <SectionCard title="Title Charges" letter="B">
          <Row label="Title Insurance" value={calc.titleIns} sub />
          <Row label="Closing / Settlement Fee" value={calc.closingFee} sub />
          {num(vals.titleSearch) > 0 && <Row label="Title Search" value={calc.titleSearch} sub />}
          {num(vals.titleExam) > 0 && <Row label="Title Examination" value={calc.titleExam} sub />}
          <Row label="Subtotal" value={calc.titleCosts} bold />
        </SectionCard>

        <SectionCard title="Government Recording & Transfer Charges" letter="C">
          <Row label="OK Documentary Stamp Tax ($0.75/$500)" value={calc.docStamp} sub />
          <Row label="Recording Fees" value={calc.recordingFee} sub />
          <Row label="Subtotal" value={calc.govCosts} bold />
        </SectionCard>

        <SectionCard title="Taxes & Prorations" letter="D">
          <Row label="Tax / Other Prorations" value={calc.prorations} bold />
        </SectionCard>

        {(calc.repairs > 0 || calc.warranty > 0 || calc.other > 0) && (
          <SectionCard title="Additional Costs" letter="E">
            {calc.repairs > 0 && <Row label="Repairs / Credits" value={calc.repairs} sub />}
            {calc.warranty > 0 && <Row label="Home Warranty" value={calc.warranty} sub />}
            {calc.other > 0 && <Row label="Other Costs" value={calc.other} sub />}
          </SectionCard>
        )}

        <SectionCard title="Seller's Estimated Net Proceeds" letter="F">
          <Row label="Sale Price" value={num(vals.salePrice)} />
          <Row label="Less: Mortgage Payoff" value={num(vals.mortgageBalance)} isNeg />
          <Row label="Less: Total Deductions (A–E)" value={calc.totalDeductions} isNeg />
          <Row label="ESTIMATED NET PROCEEDS" value={calc.netProceeds} bold highlight />
        </SectionCard>

        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {profile?.net_sheet_disclaimer || "Estimates only. Actual costs may vary. Oklahoma documentary stamp tax is $0.75 per $500 (or fraction thereof) of consideration."}
          </p>
        </div>
      </div>
    </div>
  );
}