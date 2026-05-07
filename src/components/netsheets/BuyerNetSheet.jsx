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

const RATE_OPTIONS = [];
for (let r = 2; r <= 10; r += 0.125) {
  const rounded = Math.round(r * 1000) / 1000;
  const whole = Math.floor(rounded);
  const frac = Math.round((rounded - whole) * 8);
  const fracs = ["", "⅛", "¼", "⅜", "½", "⅝", "¾", "⅞"];
  const label = frac === 0 ? `${whole}%` : whole === 0 ? `${fracs[frac]}%` : `${whole} ${fracs[frac]}%`;
  RATE_OPTIONS.push({ value: String(rounded), label });
}

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

const formatWithCommas = (v) => {
  const raw = String(v).replace(/,/g, "");
  if (raw === "" || raw === "-") return raw;
  const [intPart, decPart] = raw.split(".");
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
};

const handleNumericInput = (v) => {
  const cleaned = v.replace(/[^0-9.]/g, "");
  return formatWithCommas(cleaned);
};

export default function BuyerNetSheet() {
  const [vals, setVals] = useState({
    address: "", city: "", state: "OK", zip: "", county: "Cleveland",
    purchasePrice: "", closingDate: "",
    downPaymentPct: "20", interestRate: "6", loanTermYears: "30",
    // Broker's Fee
    buyerAgentCommPct: "3",
    // Items Payable in Connection with Loan
    originationFee: "0", appraisalFee: "550", creditReport: "75",
    floodCert: "25", taxService: "85",
    // Title Charges
    titleInsurance: "1200", closingFee: "500", titleSearch: "200", titleExam: "150",
    // Government Recording & Transfer Charges
    recordingFee: "150", transferTax: "0",
    // Taxes / Prepaids
    homeInsurance: "1,800", propertyTax: "2,400", prepaidInterest: "0",
    insuranceReserve: "2", taxReserve: "2",
    // Other
    hoa: "0", earnestMoney: "5,000",
  });

  const set = (k, v) => setVals((p) => ({ ...p, [k]: v }));

  const { data: profiles = [] } = useQuery({
    queryKey: ["agentProfile"],
    queryFn: () => base44.entities.AgentProfile.list(),
  });
  const profile = profiles[0] || null;

  const calc = useMemo(() => {
    const price = num(vals.purchasePrice);
    const downPct = num(vals.downPaymentPct) / 100;
    const downPayment = price * downPct;
    const loanAmount = price - downPayment;

    const brokerFee = price * (num(vals.buyerAgentCommPct) / 100);

    const loanCosts = num(vals.originationFee) + num(vals.appraisalFee) + num(vals.creditReport) + num(vals.floodCert) + num(vals.taxService);
    const titleCosts = num(vals.titleInsurance) + num(vals.closingFee) + num(vals.titleSearch) + num(vals.titleExam);
    const govCosts = num(vals.recordingFee) + num(vals.transferTax);

    const annualTax = num(vals.propertyTax);
    const annualIns = num(vals.homeInsurance) || price * 0.015;
    const taxReserveMonths = num(vals.taxReserve);
    const insReserveMonths = num(vals.insuranceReserve);
    const taxReserve = (annualTax / 12) * taxReserveMonths;
    const insReserve = (annualIns / 12) * insReserveMonths;
    const prepaidInterest = num(vals.prepaidInterest);
    const prepaidsTotal = taxReserve + insReserve + prepaidInterest;

    const totalClosingCosts = brokerFee + loanCosts + titleCosts + govCosts + prepaidsTotal;
    const earnest = num(vals.earnestMoney);
    const cashToClose = downPayment + totalClosingCosts - earnest;

    const monthlyRate = num(vals.interestRate) / 100 / 12;
    const nPayments = num(vals.loanTermYears) * 12;
    let monthlyPI = 0;
    if (monthlyRate > 0 && nPayments > 0) {
      monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, nPayments)) / (Math.pow(1 + monthlyRate, nPayments) - 1);
    }
    const monthlyTax = annualTax / 12;
    const monthlyInsurance = annualIns / 12;
    const monthlyHOA = num(vals.hoa);
    const piti = monthlyPI + monthlyTax + monthlyInsurance + monthlyHOA;

    return {
      downPayment, loanAmount, brokerFee,
      loanCosts, titleCosts, govCosts, taxReserve, insReserve, prepaidInterest, prepaidsTotal,
      totalClosingCosts, cashToClose,
      monthlyPI, monthlyTax, monthlyInsurance, monthlyHOA, piti,
    };
  }, [vals]);

  const renderField = (label, field, prefix, suffix) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-500">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{prefix}</span>}
        <Input type="text" inputMode="decimal" value={vals[field]}
          onChange={(e) => set(field, handleNumericInput(e.target.value))}
          className={`h-10 ${prefix ? "pl-7" : ""} ${suffix ? "pr-8" : ""}`} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{suffix}</span>}
      </div>
    </div>
  );

  const renderTextField = (label, field, placeholder) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-500">{label}</Label>
      <Input type="text" value={vals[field]} onChange={(e) => set(field, e.target.value)}
        placeholder={placeholder} className="h-10" />
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

    // Logo image (if available)
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
    doc.text("BUYER'S ESTIMATED SETTLEMENT COSTS", textX, 14);
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
      const details = [`Purchase Price: ${fmt$(num(vals.purchasePrice))}`, `Loan Amount: ${fmt$(calc.loanAmount)}`, vals.closingDate ? `Closing: ${new Date(vals.closingDate + "T00:00:00").toLocaleDateString()}` : ""].filter(Boolean).join("   |   ");
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

    drawSection("A. Broker's Fee", [
      { label: `Buyer Agent Commission (${vals.buyerAgentCommPct}%)`, value: calc.brokerFee },
    ]);

    drawSection("B. Items Payable in Connection with Loan", [
      ...(num(vals.originationFee) > 0 ? [{ label: "Loan Origination Fee", value: num(vals.originationFee) }] : []),
      { label: "Appraisal Fee", value: num(vals.appraisalFee) },
      { label: "Credit Report", value: num(vals.creditReport) },
      ...(num(vals.floodCert) > 0 ? [{ label: "Flood Certification", value: num(vals.floodCert) }] : []),
      ...(num(vals.taxService) > 0 ? [{ label: "Tax Service Fee", value: num(vals.taxService) }] : []),
      { label: "Subtotal — Loan Costs", value: calc.loanCosts, bold: true },
    ]);

    drawSection("C. Title Charges", [
      { label: "Title Insurance", value: num(vals.titleInsurance) },
      { label: "Closing / Settlement Fee", value: num(vals.closingFee) },
      ...(num(vals.titleSearch) > 0 ? [{ label: "Title Search", value: num(vals.titleSearch) }] : []),
      ...(num(vals.titleExam) > 0 ? [{ label: "Title Examination", value: num(vals.titleExam) }] : []),
      { label: "Subtotal — Title Charges", value: calc.titleCosts, bold: true },
    ]);

    drawSection("D. Government Recording & Transfer Charges", [
      { label: "Recording Fees", value: num(vals.recordingFee) },
      ...(num(vals.transferTax) > 0 ? [{ label: "Transfer Tax", value: num(vals.transferTax) }] : []),
      { label: "Subtotal — Gov. Charges", value: calc.govCosts, bold: true },
    ]);

    drawSection("E. Taxes, Insurance & Prepaids / Reserves", [
      { label: `Property Tax Reserve (${vals.taxReserve} mo.)`, value: calc.taxReserve },
      { label: `Homeowner's Insurance Reserve (${vals.insuranceReserve} mo.)`, value: calc.insReserve },
      ...(num(vals.prepaidInterest) > 0 ? [{ label: "Prepaid Interest", value: num(vals.prepaidInterest) }] : []),
      { label: "Subtotal — Prepaids/Reserves", value: calc.prepaidsTotal, bold: true },
    ]);

    drawSection("F. Summary — Cash to Close", [
      { label: `Down Payment (${vals.downPaymentPct}%)`, value: calc.downPayment },
      { label: "Total Closing Costs (A–E)", value: calc.totalClosingCosts },
      { label: "Less: Earnest Money Deposit", value: -num(vals.earnestMoney) },
      { label: "ESTIMATED CASH TO CLOSE", value: calc.cashToClose, bold: true, highlight: true },
    ]);

    drawSection("G. Monthly PITI Payment", [
      { label: `Principal & Interest (${vals.interestRate}% / ${vals.loanTermYears} yr)`, value: calc.monthlyPI },
      { label: "Property Tax (monthly)", value: calc.monthlyTax },
      { label: "Homeowner's Insurance (monthly)", value: calc.monthlyInsurance },
      ...(num(vals.hoa) > 0 ? [{ label: "HOA (monthly)", value: calc.monthlyHOA }] : []),
      { label: "ESTIMATED MONTHLY PAYMENT", value: calc.piti, bold: true, highlight: true },
    ]);

    // Disclaimer
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, pageW - 14, y); y += 6;
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    const disclaimer = profile?.net_sheet_disclaimer ||
      "This is an estimate only. Actual costs may vary. Consult your lender and title company for exact figures. Not a Loan Commitment.";
    const lines = doc.splitTextToSize(disclaimer, pageW - 28);
    doc.text(lines, 14, y);

    doc.save(`Buyer-Net-Sheet${vals.address ? `-${vals.address.replace(/\s+/g, "-")}` : ""}.pdf`);
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
        {renderTextField("Street Address", "address", "123 Main St")}
        <div className="grid grid-cols-3 gap-3">
          {renderTextField("City", "city", "Oklahoma City")}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">State</Label>
            <Input type="text" value={vals.state} onChange={(e) => set("state", e.target.value)} className="h-10" />
          </div>
          {renderTextField("Zip", "zip", "73101")}
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

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider pt-2">Purchase Details</h3>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">Closing Date</Label>
          <Input type="date" value={vals.closingDate} onChange={(e) => set("closingDate", e.target.value)} className="h-10" />
        </div>
        {renderField("Purchase Price", "purchasePrice", "$")}
        <div className="grid grid-cols-2 gap-4">
          {renderField("Down Payment", "downPaymentPct", null, "%")}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Interest Rate</Label>
            <Select value={vals.interestRate} onValueChange={(v) => set("interestRate", v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {RATE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {renderField("Loan Term (Years)", "loanTermYears")}
        {renderField("Earnest Money", "earnestMoney", "$")}

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider pt-2">A. Broker's Fee</h3>
        {renderField("Buyer Agent Commission", "buyerAgentCommPct", null, "%")}

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider pt-2">B. Loan Costs</h3>
        {renderField("Origination Fee", "originationFee", "$")}
        {renderField("Appraisal Fee", "appraisalFee", "$")}
        {renderField("Credit Report", "creditReport", "$")}
        {renderField("Flood Certification", "floodCert", "$")}
        {renderField("Tax Service Fee", "taxService", "$")}

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider pt-2">C. Title Charges</h3>
        {renderField("Title Insurance", "titleInsurance", "$")}
        {renderField("Closing / Settlement Fee", "closingFee", "$")}
        {renderField("Title Search", "titleSearch", "$")}
        {renderField("Title Examination", "titleExam", "$")}

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider pt-2">D. Government Charges</h3>
        {renderField("Recording Fees", "recordingFee", "$")}
        {renderField("Transfer Tax", "transferTax", "$")}

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider pt-2">E. Taxes & Prepaids</h3>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">Annual Home Insurance</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
            <Input type="text" inputMode="decimal" value={vals.homeInsurance}
              onChange={(e) => set("homeInsurance", handleNumericInput(e.target.value))}
              placeholder={num(vals.purchasePrice) ? fmt$(num(vals.purchasePrice) * 0.015).replace("$","") : "auto"}
              className="h-10 pl-7" />
          </div>
          {!vals.homeInsurance && num(vals.purchasePrice) > 0 && (
            <p className="text-[11px] text-slate-400">Auto: {fmt$(num(vals.purchasePrice) * 0.015)} (1.5% of purchase price)</p>
          )}
        </div>
        {renderField("Annual Property Tax", "propertyTax", "$")}
        {renderField("Insurance Reserve (months)", "insuranceReserve")}
        {renderField("Tax Reserve (months)", "taxReserve")}
        {renderField("Prepaid Interest", "prepaidInterest", "$")}
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider pt-2">Monthly Escrow</h3>
        {renderField("Monthly HOA", "hoa", "$")}
      </div>

      {/* ── Results ───────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SaveToTransactionButton netSheetType="buyer" vals={vals} />
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
              <span>Purchase Price: <b>{fmt$(num(vals.purchasePrice))}</b></span>
              <span>Loan: <b>{fmt$(calc.loanAmount)}</b></span>
              {vals.closingDate && <span>Closing: <b>{new Date(vals.closingDate + "T00:00:00").toLocaleDateString()}</b></span>}
            </div>
          </div>
        )}

        <SectionCard title="Broker's Fee" letter="A">
          <Row label={`Buyer Agent Commission (${vals.buyerAgentCommPct}%)`} value={calc.brokerFee} />
        </SectionCard>

        <SectionCard title="Items Payable in Connection with Loan" letter="B">
          {num(vals.originationFee) > 0 && <Row label="Origination Fee" value={num(vals.originationFee)} sub />}
          <Row label="Appraisal Fee" value={num(vals.appraisalFee)} sub />
          <Row label="Credit Report" value={num(vals.creditReport)} sub />
          {num(vals.floodCert) > 0 && <Row label="Flood Certification" value={num(vals.floodCert)} sub />}
          {num(vals.taxService) > 0 && <Row label="Tax Service Fee" value={num(vals.taxService)} sub />}
          <Row label="Subtotal" value={calc.loanCosts} bold />
        </SectionCard>

        <SectionCard title="Title Charges" letter="C">
          <Row label="Title Insurance" value={num(vals.titleInsurance)} sub />
          <Row label="Closing / Settlement Fee" value={num(vals.closingFee)} sub />
          {num(vals.titleSearch) > 0 && <Row label="Title Search" value={num(vals.titleSearch)} sub />}
          {num(vals.titleExam) > 0 && <Row label="Title Examination" value={num(vals.titleExam)} sub />}
          <Row label="Subtotal" value={calc.titleCosts} bold />
        </SectionCard>

        <SectionCard title="Government Recording & Transfer Charges" letter="D">
          <Row label="Recording Fees" value={num(vals.recordingFee)} sub />
          {num(vals.transferTax) > 0 && <Row label="Transfer Tax" value={num(vals.transferTax)} sub />}
          <Row label="Subtotal" value={calc.govCosts} bold />
        </SectionCard>

        <SectionCard title="Taxes, Insurance & Prepaids / Reserves" letter="E">
          <Row label={`Property Tax Reserve (${vals.taxReserve} mo.)`} value={calc.taxReserve} sub />
          <Row label={`Homeowner's Insurance Reserve (${vals.insuranceReserve} mo.)`} value={calc.insReserve} sub />
          {num(vals.prepaidInterest) > 0 && <Row label="Prepaid Interest" value={num(vals.prepaidInterest)} sub />}
          <Row label="Subtotal" value={calc.prepaidsTotal} bold />
        </SectionCard>

        <SectionCard title="Summary — Cash to Close" letter="F">
          <Row label={`Down Payment (${vals.downPaymentPct}%)`} value={calc.downPayment} />
          <Row label="Total Closing Costs (A–E)" value={calc.totalClosingCosts} />
          <Row label="Less: Earnest Money Deposit" value={num(vals.earnestMoney)} isNeg />
          <Row label="ESTIMATED CASH TO CLOSE" value={calc.cashToClose} bold highlight />
        </SectionCard>

        <SectionCard title="Monthly PITI Payment" letter="G">
          <Row label={`Principal & Interest (${vals.interestRate}% / ${vals.loanTermYears} yr)`} value={calc.monthlyPI} sub />
          <Row label="Property Tax (monthly)" value={calc.monthlyTax} sub />
          <Row label="Homeowner's Insurance (monthly)" value={calc.monthlyInsurance} sub />
          {num(vals.hoa) > 0 && <Row label="HOA (monthly)" value={calc.monthlyHOA} sub />}
          <Row label="ESTIMATED MONTHLY PAYMENT" value={calc.piti} bold highlight />
        </SectionCard>

        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {profile?.net_sheet_disclaimer || "Estimates only. Actual costs may vary. Consult your lender and title company for exact figures. Not a Loan Commitment."}
          </p>
        </div>
      </div>
    </div>
  );
}