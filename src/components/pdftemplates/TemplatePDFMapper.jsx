import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, MapPin, Eye, EyeOff, ChevronLeft, ChevronRight, Pencil, ScanEye, ArrowUp, ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight as ArrowRightIcon, Sparkles, Save, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { loadPdfJs } from "@/lib/pdfjs-loader";

const PIN_COLORS = {
  BBA: "#dc2626",
  Contact: "#3b82f6",
  Transaction: "#10b981",
  "Agent Profile": "#8b5cf6",
  Utility: "#ec4899",
  Custom: "#f59e0b",
  "E-Signature": "#7c3aed",
  default: "#64748b",
};

const FIELD_GROUPS_FLAT = [
  // ── Interview (BBI — Buyer Broker Interview answers) ──
  { key: "bba_buyer_name",              label: "Buyer Full Legal Name",      group: "Interview", sourceKey: "tx_buyer_name" },
  { key: "bba_buyer_initials",          label: "Buyer Initials",             group: "Interview", sourceKey: "contact_initials" },
  { key: "bba_buyer_email",             label: "Buyer Email",                group: "Interview", sourceKey: "tx_buyer_email" },
  { key: "bba_buyer_phone",             label: "Buyer Phone",                group: "Interview", sourceKey: "tx_buyer_phone" },
  { key: "bba_property_address",        label: "Property Address",           group: "Interview", sourceKey: "tx_property_address" },
  { key: "bba_city",                    label: "City",                       group: "Interview", sourceKey: "tx_city" },
  { key: "bba_county",                  label: "County",                     group: "Interview", sourceKey: "tx_county" },
  { key: "bba_zip",                     label: "ZIP Code",                   group: "Interview", sourceKey: "tx_zip" },
  { key: "bba_purchase_price",          label: "Purchase Budget / Price",    group: "Interview", sourceKey: "tx_purchase_price" },
  { key: "bba_lender_name",             label: "Lender Name",                group: "Interview", sourceKey: "tx_lender_name" },
  { key: "bba_commission_percent",      label: "Compensation %",             group: "Interview", sourceKey: "tx_commission_percent" },
  { key: "bba_commission_amount",       label: "Flat Fee Amount",            group: "Interview", sourceKey: "tx_commission_amount" },
  { key: "bba_agreement_start",         label: "Agreement Start Date",       group: "Interview", sourceKey: "today_date" },
  { key: "bba_agreement_end",           label: "Agreement End Date",         group: "Interview", sourceKey: "date_plus_6mo" },
  { key: "bba_closing_date",            label: "Closing Date",               group: "Interview", sourceKey: "tx_closing_date" },
  { key: "bba_agent_name",              label: "Agent Name",                 group: "Interview", sourceKey: "agent_name" },
  { key: "bba_agent_license",           label: "Agent License #",            group: "Interview", sourceKey: "agent_license" },
  { key: "bba_agent_phone",             label: "Agent Phone",                group: "Interview", sourceKey: "agent_phone" },
  { key: "bba_agent_email",             label: "Agent Email",                group: "Interview", sourceKey: "agent_email" },
  { key: "bba_brokerage_name",          label: "Brokerage Name",             group: "Interview", sourceKey: "brokerage_name" },
  { key: "bba_brokerage_license",       label: "Brokerage License #",        group: "Interview", sourceKey: "brokerage_license" },
  { key: "bba_brokerage_address",       label: "Brokerage Address",          group: "Interview", sourceKey: "brokerage_address" },
  { key: "bba_brokerage_city",          label: "Brokerage City",             group: "Interview", sourceKey: "brokerage_city" },
  { key: "bba_brokerage_state",         label: "Brokerage State",            group: "Interview", sourceKey: "brokerage_state" },
  { key: "bba_brokerage_zip",           label: "Brokerage ZIP",              group: "Interview", sourceKey: "brokerage_zip" },
  { key: "bba_office_phone",            label: "Office Phone",               group: "Interview", sourceKey: "office_phone" },
  { key: "bba_broker_supervisor",       label: "Broker Supervisor",          group: "Interview", sourceKey: "broker_supervisor" },
  { key: "bba_today_date",              label: "Today's Date",               group: "Interview", sourceKey: "today_date" },
  { key: "bba_termination_date",        label: "Termination Date (90 Days)", group: "Interview", sourceKey: "date_plus_90d" },
  { key: "bba_date_plus_60d",           label: "Date + 60 Days",             group: "Interview", sourceKey: "date_plus_60d" },
  { key: "bba_date_plus_90d",           label: "Date + 90 Days",             group: "Interview", sourceKey: "date_plus_90d" },
  { key: "bba_date_plus_180d",          label: "Date + 180 Days",            group: "Interview", sourceKey: "date_plus_180d" },
  // ── BBA (Buyer Broker Agreement) ── pulled from Contact, Transaction, Agent Profile, Utility
  { key: "bba_buyer_name",              label: "Buyer Name",                group: "BBA", sourceKey: "tx_buyer_name" },
  { key: "bba_buyer_email",             label: "Buyer Email",               group: "BBA", sourceKey: "tx_buyer_email" },
  { key: "bba_buyer_phone",             label: "Buyer Phone",               group: "BBA", sourceKey: "tx_buyer_phone" },
  { key: "bba_agent_name",              label: "Agent Name",                group: "BBA", sourceKey: "agent_name" },
  { key: "bba_agent_license",           label: "Agent License #",           group: "BBA", sourceKey: "agent_license" },
  { key: "bba_agent_phone",             label: "Agent Phone",               group: "BBA", sourceKey: "agent_phone" },
  { key: "bba_agent_email",             label: "Agent Email",               group: "BBA", sourceKey: "agent_email" },
  { key: "bba_brokerage_name",          label: "Brokerage Name",            group: "BBA", sourceKey: "brokerage_name" },
  { key: "bba_brokerage_license",       label: "Brokerage License #",       group: "BBA", sourceKey: "brokerage_license" },
  { key: "bba_brokerage_address",       label: "Brokerage Address",         group: "BBA", sourceKey: "brokerage_address" },
  { key: "bba_brokerage_city",          label: "Brokerage City",            group: "BBA", sourceKey: "brokerage_city" },
  { key: "bba_brokerage_state",         label: "Brokerage State",           group: "BBA", sourceKey: "brokerage_state" },
  { key: "bba_brokerage_zip",           label: "Brokerage ZIP",             group: "BBA", sourceKey: "brokerage_zip" },
  { key: "bba_office_phone",            label: "Office Phone",              group: "BBA", sourceKey: "office_phone" },
  { key: "bba_broker_supervisor",       label: "Broker Supervisor",         group: "BBA", sourceKey: "broker_supervisor" },
  { key: "bba_property_address",        label: "Property Address",          group: "BBA", sourceKey: "tx_property_address" },
  { key: "bba_city",                    label: "City",                      group: "BBA", sourceKey: "tx_city" },
  { key: "bba_county",                  label: "County",                    group: "BBA", sourceKey: "tx_county" },
  { key: "bba_zip",                     label: "ZIP Code",                  group: "BBA", sourceKey: "tx_zip" },
  { key: "bba_purchase_price",          label: "Purchase Price / Budget",   group: "BBA", sourceKey: "tx_purchase_price" },
  { key: "bba_commission_percent",      label: "Compensation %",            group: "BBA", sourceKey: "tx_commission_percent" },
  { key: "bba_commission_amount",       label: "Commission Amount",          group: "BBA", sourceKey: "tx_commission_amount" },
  { key: "bba_lender_name",             label: "Lender",                    group: "BBA", sourceKey: "tx_lender_name" },
  { key: "bba_agreement_start",         label: "Agreement Start Date",      group: "BBA", sourceKey: "today_date" },
  { key: "bba_agreement_end",           label: "Agreement End Date",        group: "BBA", sourceKey: "date_plus_6mo" },
  { key: "bba_closing_date",            label: "Closing Date",              group: "BBA", sourceKey: "tx_closing_date" },
  { key: "bba_buyer_initials",          label: "Buyer Initials",            group: "BBA", sourceKey: "contact_initials" },
  { key: "bba_today_date",              label: "Today's Date",              group: "BBA", sourceKey: "today_date" },
  { key: "bba_date_plus_60d",           label: "Date + 60 Days",             group: "BBA", sourceKey: "date_plus_60d" },
  { key: "bba_date_plus_90d",           label: "Date + 90 Days",             group: "BBA", sourceKey: "date_plus_90d" },
  { key: "bba_date_plus_180d",          label: "Date + 180 Days",            group: "BBA", sourceKey: "date_plus_180d" },
  { key: "bba_termination_date",        label: "Termination Date (90 Days)",  group: "BBA", sourceKey: "date_plus_90d" },
  // Contact
  { key: "contact_full_name", label: "Full Name", group: "Contact" },
  { key: "contact_email", label: "Email", group: "Contact" },
  { key: "contact_phone", label: "Phone", group: "Contact" },
  { key: "contact_role", label: "Role", group: "Contact" },
  { key: "contact_buyer_agent_name", label: "Buyer's Agent Name", group: "Contact" },
  { key: "contact_buyer_agent_brokerage", label: "Buyer's Agent Brokerage", group: "Contact" },
  { key: "contact_broker_address", label: "Broker Address", group: "Contact" },
  { key: "contact_broker_city", label: "Broker City", group: "Contact" },
  { key: "contact_broker_state", label: "Broker State", group: "Contact" },
  { key: "contact_broker_zip", label: "Broker ZIP", group: "Contact" },
  { key: "contact_broker_license", label: "Broker License #", group: "Contact" },
  { key: "contact_broker_supervisor", label: "Broker Supervisor", group: "Contact" },
  { key: "contact_initials", label: "Initials", group: "Contact" },
  // Transaction
  { key: "tx_property_address", label: "Property Address", group: "Transaction" },
  { key: "tx_city", label: "City", group: "Transaction" },
  { key: "tx_state", label: "State", group: "Transaction" },
  { key: "tx_zip", label: "ZIP Code", group: "Transaction" },
  { key: "tx_county", label: "County", group: "Transaction" },
  { key: "tx_mls_number", label: "MLS #", group: "Transaction" },
  { key: "tx_buyer_name", label: "Buyer Name", group: "Transaction" },
  { key: "tx_buyer_email", label: "Buyer Email", group: "Transaction" },
  { key: "tx_buyer_phone", label: "Buyer Phone", group: "Transaction" },
  { key: "tx_seller_name", label: "Seller Name", group: "Transaction" },
  { key: "tx_seller_email", label: "Seller Email", group: "Transaction" },
  { key: "tx_seller_phone", label: "Seller Phone", group: "Transaction" },
  { key: "tx_purchase_price", label: "Purchase Price", group: "Transaction" },
  { key: "tx_earnest_money", label: "Earnest Money", group: "Transaction" },
  { key: "tx_commission_percent", label: "Commission %", group: "Transaction" },
  { key: "tx_closing_date", label: "Closing Date", group: "Transaction" },
  { key: "tx_contract_date", label: "Contract Date", group: "Transaction" },
  { key: "tx_inspection_deadline", label: "Inspection Deadline", group: "Transaction" },
  { key: "tx_title_company", label: "Title Company", group: "Transaction" },
  { key: "tx_lender_name", label: "Lender Name", group: "Transaction" },
  { key: "tx_commission_amount", label: "Commission Amount", group: "Transaction" },
  { key: "tx_transaction_fee", label: "Transaction Fee", group: "Transaction" },
  // E-Signature
  { key: "esig_signature_buyer",          label: "Buyer Signature",              group: "E-Signature" },
  { key: "esig_signature_buyer2",         label: "Co-Buyer Signature",           group: "E-Signature" },
  { key: "esig_signature_seller",         label: "Seller Signature",             group: "E-Signature" },
  { key: "esig_signature_agent",          label: "Agent Signature",              group: "E-Signature" },
  { key: "esig_signature_broker",         label: "Broker/Supervisor Signature",  group: "E-Signature" },
  { key: "esig_initials_buyer",           label: "Buyer Initials",               group: "E-Signature" },
  { key: "esig_initials_buyer2",          label: "Co-Buyer Initials",            group: "E-Signature" },
  { key: "esig_initials_seller",          label: "Seller Initials",              group: "E-Signature" },
  { key: "esig_initials_agent",           label: "Agent Initials",               group: "E-Signature" },
  { key: "esig_date_buyer",               label: "Buyer Signature Date",         group: "E-Signature" },
  { key: "esig_date_buyer2",              label: "Co-Buyer Signature Date",      group: "E-Signature" },
  { key: "esig_date_seller",              label: "Seller Signature Date",        group: "E-Signature" },
  { key: "esig_date_agent",               label: "Agent Signature Date",         group: "E-Signature" },
  // Custom
  { key: "custom_text", label: "Custom Text", group: "Custom" },
  { key: "checkmark", label: "Checkmark (✓)", group: "Custom" },
  { key: "signature_buyer", label: "Buyer Signature (legacy)", group: "Custom" },
  { key: "signature_agent", label: "Agent Signature (legacy)", group: "Custom" },
  { key: "initials_buyer", label: "Buyer Initials (legacy)", group: "Custom" },
  { key: "initials_agent", label: "Agent Initials (legacy)", group: "Custom" },
  // BBA Defaults
  { key: "bba_default_commission_percent",  label: "Default Commission %",        group: "BBA Defaults" },
  { key: "bba_default_compensation_type",   label: "Default Compensation Type",   group: "BBA Defaults" },
  { key: "bba_default_commission_amount",   label: "Default Flat Fee Amount",     group: "BBA Defaults" },
  { key: "bba_default_financing_type",      label: "Default Financing Type",      group: "BBA Defaults" },
  { key: "bba_default_property_type",       label: "Default Property Type",       group: "BBA Defaults" },
  { key: "bba_default_agreement_duration",  label: "Default Agreement Duration",  group: "BBA Defaults" },
  { key: "bba_default_city",                label: "Default City",                group: "BBA Defaults" },
  { key: "bba_default_county",              label: "Default County",              group: "BBA Defaults" },
  { key: "bba_default_state",               label: "Default State",               group: "BBA Defaults" },
  { key: "bba_default_lender_name",         label: "Default Lender",             group: "BBA Defaults" },
  // Utility
  { key: "today_date", label: "Today's Date", group: "Utility" },
  { key: "date_plus_3mo", label: "Date + 3 Months", group: "Utility" },
  { key: "date_plus_6mo", label: "Date + 6 Months", group: "Utility" },
  { key: "date_plus_60d", label: "Date + 60 Days", group: "Utility" },
  { key: "date_plus_90d", label: "Date + 90 Days", group: "Utility" },
  { key: "date_plus_180d", label: "Date + 180 Days", group: "Utility" },
  // Agent Profile
  { key: "agent_name", label: "Agent Name", group: "Agent Profile" },
  { key: "agent_license", label: "Agent License #", group: "Agent Profile" },
  { key: "agent_phone", label: "Agent Phone", group: "Agent Profile" },
  { key: "agent_email", label: "Agent Email", group: "Agent Profile" },
  { key: "brokerage_name", label: "Brokerage Name", group: "Agent Profile" },
  { key: "brokerage_license", label: "Brokerage License #", group: "Agent Profile" },
  { key: "brokerage_address", label: "Brokerage Address", group: "Agent Profile" },
  { key: "brokerage_city", label: "Brokerage City", group: "Agent Profile" },
  { key: "brokerage_state", label: "Brokerage State", group: "Agent Profile" },
  { key: "brokerage_zip", label: "Brokerage ZIP", group: "Agent Profile" },
  { key: "office_phone", label: "Office Phone", group: "Agent Profile" },
  { key: "office_email", label: "Office Email", group: "Agent Profile" },
  { key: "broker_supervisor", label: "Broker Supervisor", group: "Agent Profile" },
];

export { FIELD_GROUPS_FLAT };

// BBA field → source field mapping (for resolveFieldValue in PDFTemplates)
export const BBA_SOURCE_MAP = Object.fromEntries(
  FIELD_GROUPS_FLAT.filter((f) => f.group === "BBA" && f.sourceKey).map((f) => [f.key, f.sourceKey])
);

// Sample preview values shown in Preview mode when no real data is provided
const PREVIEW_SAMPLES = {
today_date: new Date().toLocaleDateString(),
date_plus_3mo: (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toLocaleDateString(); })(),
date_plus_6mo: (() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d.toLocaleDateString(); })(),
date_plus_60d: (() => { const d = new Date(); d.setDate(d.getDate() + 60); return d.toLocaleDateString(); })(),
date_plus_90d: (() => { const d = new Date(); d.setDate(d.getDate() + 90); return d.toLocaleDateString(); })(),
date_plus_180d: (() => { const d = new Date(); d.setDate(d.getDate() + 180); return d.toLocaleDateString(); })(),
  // BBA samples (mirrors source fields)
  bba_buyer_name: "John & Jane Smith",
  bba_buyer_email: "jsmith@email.com",
  bba_buyer_phone: "(405) 555-1234",
  bba_agent_name: "Sarah Williams",
  bba_agent_license: "OK-12345",
  bba_agent_phone: "(405) 555-9000",
  bba_agent_email: "sarah@dealmagic.com",
  bba_brokerage_name: "DealMagic Realty",
  bba_brokerage_license: "OK-BRK-001",
  bba_brokerage_address: "100 N Broadway Ave",
  bba_brokerage_city: "Oklahoma City",
  bba_brokerage_state: "OK",
  bba_brokerage_zip: "73102",
  bba_office_phone: "(405) 555-0100",
  bba_broker_supervisor: "Michael Davis",
  bba_property_address: "123 Maple Street",
  bba_city: "Oklahoma City",
  bba_county: "Oklahoma",
  bba_zip: "73101",
  bba_purchase_price: "$325,000",
  bba_commission_percent: "3%",
  bba_commission_amount: "$9,750",
  bba_lender_name: "First National Bank",
  bba_agreement_start: new Date().toLocaleDateString(),
  bba_agreement_end: (() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d.toLocaleDateString(); })(),
  bba_closing_date: "05/30/2026",
  bba_buyer_initials: "J.S.",
  bba_today_date: new Date().toLocaleDateString(),
  bba_date_plus_60d: (() => { const d = new Date(); d.setDate(d.getDate() + 60); return d.toLocaleDateString(); })(),
  bba_date_plus_90d: (() => { const d = new Date(); d.setDate(d.getDate() + 90); return d.toLocaleDateString(); })(),
  bba_date_plus_180d: (() => { const d = new Date(); d.setDate(d.getDate() + 180); return d.toLocaleDateString(); })(),
  bba_termination_date: (() => { const d = new Date(); d.setDate(d.getDate() + 90); return d.toLocaleDateString(); })(),
  contact_initials: "J.S.",
  tx_property_address: "123 Maple Street",
  tx_city: "Oklahoma City",
  tx_state: "OK",
  tx_zip: "73101",
  tx_county: "Oklahoma",
  tx_mls_number: "MLS-98765",
  tx_buyer_name: "John & Jane Smith",
  tx_buyer_email: "jsmith@email.com",
  tx_buyer_phone: "(405) 555-1234",
  tx_seller_name: "Robert Johnson",
  tx_seller_email: "rjohnson@email.com",
  tx_seller_phone: "(405) 555-5678",
  tx_purchase_price: "$325,000",
  tx_earnest_money: "$5,000",
  tx_commission_percent: "3%",
  tx_commission_amount: "$9,750",
  tx_closing_date: "05/30/2026",
  tx_contract_date: "04/14/2026",
  tx_inspection_deadline: "04/21/2026",
  tx_title_company: "Oklahoma Title Co.",
  tx_lender_name: "First National Bank",
  tx_transaction_fee: "$395",
  agent_name: "Sarah Williams",
  agent_license: "OK-12345",
  agent_phone: "(405) 555-9000",
  agent_email: "sarah@dealmagic.com",
  brokerage_name: "DealMagic Realty",
  brokerage_license: "OK-BRK-001",
  brokerage_address: "100 N Broadway Ave",
  brokerage_city: "Oklahoma City",
  brokerage_state: "OK",
  brokerage_zip: "73102",
  office_phone: "(405) 555-0100",
  office_email: "office@dealmagic.com",
  broker_supervisor: "Michael Davis",
  checkmark: "✓",
  signature_buyer: "[Buyer Sig]",
  signature_agent: "[Agent Sig]",
  initials_buyer: "[B.I.]",
  initials_agent: "[A.I.]",
  // E-Signature previews
  esig_signature_buyer:   "[Buyer Signature]",
  esig_signature_buyer2:  "[Co-Buyer Signature]",
  esig_signature_seller:  "[Seller Signature]",
  esig_signature_agent:   "[Agent Signature]",
  esig_signature_broker:  "[Broker Signature]",
  esig_initials_buyer:    "J.S.",
  esig_initials_buyer2:   "M.S.",
  esig_initials_seller:   "R.J.",
  esig_initials_agent:    "S.W.",
  esig_date_buyer:        new Date().toLocaleDateString(),
  esig_date_buyer2:       new Date().toLocaleDateString(),
  esig_date_seller:       new Date().toLocaleDateString(),
  esig_date_agent:        new Date().toLocaleDateString(),
};

export default function TemplatePDFMapper({ pdfUrl, mappings, onMappingsChange, previewValues, availableFields = null, templateId, onSave, onExportPDF }) {
  const canvasRefs = useRef({});
  const previewCanvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [scale] = useState(1.19);
  const [pageDims, setPageDims] = useState({});
  const [assigningField, setAssigningField] = useState(null);
  const [selectedPin, setSelectedPin] = useState(null); // fieldKey being fine-adjusted
  const [showOverlay, setShowOverlay] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState("Interview");
  const [mode, setMode] = useState("map"); // "map" | "preview"
  const [aiPlacing, setAiPlacing] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  // Click-to-place: pending coordinate waiting for field selection
  const [pendingPin, setPendingPin] = useState(null); // { page, x, y, screenX, screenY }
  const [fieldSearch, setFieldSearch] = useState("");
  const renderingRef = useRef({});
  const autoSaveTimer = useRef(null);
  const pendingPinRef = useRef(null);

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
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    renderingRef.current[pageNum] = false;
  }, [pdfDoc, scale]);

  useEffect(() => {
    if (!pdfDoc) return;
    renderingRef.current = {};
    for (let i = 1; i <= numPages; i++) renderPage(i);
  }, [pdfDoc, numPages, renderPage]);

  // Re-render current page when navigating (canvas ref may not have existed before)
  useEffect(() => {
    if (!pdfDoc) return;
    renderingRef.current[currentPage] = false;
    renderPage(currentPage);
  }, [currentPage]);

  const handleCanvasClick = (e, pageNum) => {
    if (mode !== "map") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPendingPin({ page: pageNum, x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)), screenX: e.clientX, screenY: e.clientY });
    setSelectedPin(null);
  };

  const removeMapping = (pinId, e) => {
    e.stopPropagation();
    if (selectedPin === pinId) setSelectedPin(null);
    onMappingsChange(mappings.filter((m) => (m.pinId || m.fieldKey) !== pinId));
  };

  // Nudge a pin by a small pixel amount (converted to % of page dims)
  const nudgePin = (pinId, dx, dy) => {
    const mapping = mappings.find((m) => (m.pinId || m.fieldKey) === pinId);
    if (!mapping) return;
    const dims = pageDims[mapping.page] || {};
    const w = dims.width || 1;
    const h = dims.height || 1;
    const STEP = 0.0015; // ~1px at typical scale
    const newX = Math.max(0, Math.min(1, mapping.x + dx * STEP));
    const newY = Math.max(0, Math.min(1, mapping.y + dy * STEP));
    onMappingsChange(mappings.map((m) => (m.pinId || m.fieldKey) === pinId ? { ...m, x: newX, y: newY } : m));
  };

  const setPinCoord = (pinId, axis, value) => {
    const pct = parseFloat(value) / 100;
    if (isNaN(pct)) return;
    const clamped = Math.max(0, Math.min(1, pct));
    onMappingsChange(mappings.map((m) => (m.pinId || m.fieldKey) === pinId ? { ...m, [axis]: clamped } : m));
  };

  // Render preview: PDF page + overlaid filled values
  const renderPreview = useCallback(async () => {
    if (!pdfDoc || !previewCanvasRef.current) return;
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale });
    const canvas = previewCanvasRef.current;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Overlay field values
    const pinsOnThisPage = mappings.filter((m) => m.page === currentPage);
    pinsOnThisPage.forEach((m) => {
      const value = (previewValues && previewValues[m.fieldKey]) || PREVIEW_SAMPLES[m.fieldKey] || m.label;
      const x = m.x * viewport.width;
      const y = m.y * viewport.height;
      const color = PIN_COLORS[FIELD_GROUPS_FLAT.find((f) => f.key === m.fieldKey)?.group] || PIN_COLORS.default;
      ctx.font = `${Math.round(12 * scale)}px Helvetica, Arial, sans-serif`;
      ctx.fillStyle = color + "22";
      const metrics = ctx.measureText(value);
      const textH = Math.round(9 * scale);
      ctx.fillRect(x - 2, y - textH, metrics.width + 4, textH + 2);
      ctx.fillStyle = "#000000";
      ctx.fillText(value, x, y);
    });
  }, [pdfDoc, currentPage, scale, mappings, previewValues]);

  useEffect(() => {
    if (mode === "preview") renderPreview();
  }, [mode, renderPreview]);

  // Keyboard nudge for selected pin (selectedPin is a pinId)
  useEffect(() => {
    if (!selectedPin) return;
    const onKey = (e) => {
      if (!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) return;
      e.preventDefault();
      const step = e.shiftKey ? 5 : 1;
      if (e.key === "ArrowUp")    nudgePin(selectedPin, 0, -step);
      if (e.key === "ArrowDown")  nudgePin(selectedPin, 0,  step);
      if (e.key === "ArrowLeft")  nudgePin(selectedPin, -step, 0);
      if (e.key === "ArrowRight") nudgePin(selectedPin,  step, 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedPin, mappings, pageDims]);

  // Dismiss pending pin dropdown on outside click or Escape
  useEffect(() => {
    if (!pendingPin) return;
    const onMouseDown = (e) => {
      if (pendingPinRef.current && !pendingPinRef.current.contains(e.target)) {
        setPendingPin(null);
      }
    };
    const onKey = (e) => { if (e.key === "Escape") setPendingPin(null); };
    const onContextMenu = () => setPendingPin(null);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [pendingPin]);

  // Auto-save mappings to database when templateId is provided
  useEffect(() => {
    if (!templateId) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        await base44.entities.PDFTemplate.update(templateId, { field_mappings: mappings });
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 1500);
    return () => clearTimeout(autoSaveTimer.current);
  }, [mappings, templateId]);

  const handleAiAutoPlace = async () => {
    if (!pdfDoc) return;
    setAiPlacing(true);
    const newMappings = [...mappings];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      setAiStatus(`Analyzing page ${pageNum} of ${numPages}…`);

      // Render page to a canvas at high res for the AI
      const page = await pdfDoc.getPage(pageNum);
      const vp = page.getViewport({ scale: 2.0 });
      const offscreen = document.createElement("canvas");
      offscreen.width = vp.width;
      offscreen.height = vp.height;
      await page.render({ canvasContext: offscreen.getContext("2d"), viewport: vp }).promise;
      const imageDataUrl = offscreen.toDataURL("image/jpeg", 0.85);

      // Upload image to get a URL the LLM can access
      const blob = await (await fetch(imageDataUrl)).blob();
      const file = new File([blob], `page_${pageNum}.jpg`, { type: "image/jpeg" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Build field list for the AI
      const fieldList = FIELD_GROUPS_FLAT.map((f) => `${f.key}: "${f.label}"`).join("\n");

      const prompt = `You are analyzing page ${pageNum} of a real estate PDF form.

Your job is to find the FILL-IN areas (blank lines, boxes, or fields) where specific data values should be typed/placed.

Here is the list of data fields you need to locate:
${fieldList}

For each field that has a corresponding blank/fill-in area on this page:
- Return the fieldKey and the x,y position as a percentage (0.0 to 1.0) of the page width/height
- The position should be at the START of the blank line or input area where the text should begin
- Only include fields that actually appear on this page
- If a field is not present on this page, omit it

Return ONLY a JSON array like:
[{"fieldKey":"tx_buyer_name","x":0.42,"y":0.18},{"fieldKey":"tx_property_address","x":0.15,"y":0.25}]`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            placements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  fieldKey: { type: "string" },
                  x: { type: "number" },
                  y: { type: "number" },
                }
              }
            }
          }
        }
      });

      const placements = result?.placements || [];
      placements.forEach(({ fieldKey, x, y }) => {
        const fieldDef = FIELD_GROUPS_FLAT.find((f) => f.key === fieldKey);
        if (!fieldDef) return;
        // Only add if not already manually mapped
        const alreadyMapped = newMappings.find((m) => m.fieldKey === fieldKey);
        if (alreadyMapped) {
          // Update existing
          const idx = newMappings.findIndex((m) => m.fieldKey === fieldKey);
          newMappings[idx] = { ...newMappings[idx], page: pageNum, x, y };
        } else {
          newMappings.push({ fieldKey, label: fieldDef.label, page: pageNum, x, y });
        }
      });
    }

    onMappingsChange(newMappings);
    setAiPlacing(false);
    setAiStatus("");
  };

  // Use provided fields or default to all FIELD_GROUPS_FLAT
  const fieldsInGroup = availableFields || FIELD_GROUPS_FLAT;
  const pinsOnPage = mappings.filter((m) => m.page === currentPage);
  const dims = pageDims[currentPage] || {};

  return (
    <div className="flex gap-4 min-h-0">
      {/* Left: PDF canvas */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 px-3 py-2 flex-wrap">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
            <button
              onClick={() => setMode("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${mode === "map" ? "bg-violet-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <Pencil className="w-3.5 h-3.5" /> Map
            </button>
            <button
              onClick={() => { setMode("preview"); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${mode === "preview" ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <ScanEye className="w-3.5 h-3.5" /> Preview
            </button>
          </div>

          {mode === "map" && (
            <>
              <button onClick={() => setShowOverlay((v) => !v)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2 py-1">
                {showOverlay ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Show</>} pins
              </button>
              {onSave && (
                <button onClick={onSave} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-700 border border-slate-200 rounded-lg px-2 py-1 hover:bg-violet-50 transition-colors">
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              )}
              {onExportPDF && (
                <button onClick={onExportPDF} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-700 border border-slate-200 rounded-lg px-2 py-1 hover:bg-emerald-50 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Export PDF
                </button>
              )}
            </>
          )}



          {numPages > 1 && (
            <div className="flex items-center gap-1 ml-auto">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-500 w-16 text-center">Page {currentPage}/{numPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))} disabled={currentPage === numPages} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}


          {mode === "preview" && (
            <span className="text-xs text-slate-400 ml-auto">
              {previewValues ? "Showing real values" : "Showing sample values"}
            </span>
          )}
        </div>

        <div
          className="bg-slate-100 rounded-xl border border-slate-200 overflow-auto flex-1"
          style={{ maxHeight: 620, cursor: mode === "map" ? "crosshair" : "default" }}
        >
          {!pdfDoc && (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin mr-2" /> Loading PDF…
            </div>
          )}

          {/* Map mode */}
          <div className="relative inline-block" style={{ display: mode === "map" ? "inline-block" : "none" }}>
              <canvas 
                ref={(el) => { canvasRefs.current[currentPage] = el; }} 
                className="block cursor-crosshair"
                onClick={(e) => handleCanvasClick(e, currentPage)}
              />



              {showOverlay && pinsOnPage.map((m) => {
                const pinId = m.pinId || m.fieldKey;
                const color = PIN_COLORS[FIELD_GROUPS_FLAT.find(f => f.key === m.fieldKey)?.group] || PIN_COLORS.default;
                const isSelected = selectedPin === pinId;
                return (
                  <div
                    key={pinId}
                    className="absolute group"
                    style={{ left: m.x * (dims.width || 0), top: m.y * (dims.height || 0), transform: "translate(-50%, -50%)", pointerEvents: "auto" }}
                  >
                    <span
                      onClick={(e) => { e.stopPropagation(); setSelectedPin(isSelected ? null : pinId); setAssigningField(null); }}
                      className={`text-[9px] px-1 py-0.5 rounded whitespace-nowrap font-medium cursor-pointer ${isSelected ? "ring-2 ring-offset-1 ring-violet-500" : ""}`}
                      style={{ backgroundColor: color + "33", outline: `1px solid ${color}88`, color }}
                    >
                      {m.label}
                    </span>
                    <button
                      onClick={(e) => removeMapping(pinId, e)}
                      className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      style={{ backgroundColor: color, color: "#fff" }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

          {/* Preview mode */}
          <div className="relative inline-block" style={{ display: mode === "preview" ? "inline-block" : "none" }}>
            <canvas ref={previewCanvasRef} className="block" />
            {mappings.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                <p className="text-sm text-slate-400 font-medium">No fields mapped yet — switch to Map mode to add pins.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending pin dropdown */}
      {pendingPin && (
        <div
          ref={pendingPinRef}
          className="fixed bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto w-56"
          style={{ left: pendingPin.screenX + 10, top: pendingPin.screenY + 10 }}
        >
          <div className="p-2 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">Select a field to pin</p>
            {(() => {
              // Group fields by their group property, preserving order of first appearance
              const groups = [];
              const groupMap = {};
              fieldsInGroup.forEach((f) => {
                const g = f.group || "Other";
                if (!groupMap[g]) { groupMap[g] = []; groups.push(g); }
                groupMap[g].push(f);
              });
              return groups.map((group) => (
                <div key={group}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 px-2 pt-2 pb-0.5">{group}</p>
                  {groupMap[group].map((f) => {
                    const existing = mappings.find((m) => m.fieldKey === f.key);
                    return (
                      <button
                        key={f.key}
                        onClick={() => {
                          const newPin = {
                            pinId: `pin_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                            fieldKey: f.key,
                            label: f.label,
                            page: pendingPin.page,
                            x: pendingPin.x,
                            y: pendingPin.y,
                          };
                          onMappingsChange([...mappings, newPin]);
                          setPendingPin(null);
                        }}
                        className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-violet-50 text-slate-700 transition-colors truncate flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{f.label}</span>
                        {existing && <span className="text-[10px] text-blue-400 font-medium shrink-0">+duplicate</span>}
                      </button>
                    );
                  })}
                </div>
              ));
            })()}
            <button
              onClick={() => setPendingPin(null)}
              className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors mt-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Right: field picker */}
      <div className="w-44 shrink-0 flex flex-col" style={{ height: 620 }}>
        {/* Mapped fields list - only shown when there are mappings */}
        {mappings.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shrink-0">
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{mappings.length} Mapped — click pin to adjust</p>
            </div>
            <div className="p-1.5 space-y-1 max-h-32 overflow-y-auto">
              {mappings.map((m) => {
                    const pinId = m.pinId || m.fieldKey;
                    return (
                    <div
                      key={pinId}
                      onClick={() => setSelectedPin(selectedPin === pinId ? null : pinId)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs cursor-pointer transition-colors ${selectedPin === pinId ? "bg-violet-50 text-violet-700 ring-1 ring-violet-300" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                    >
                      <span className="flex-1 truncate">{m.label}</span>
                      <span className="text-slate-300 text-[10px] shrink-0">p{m.page}</span>
                      <button onClick={(e) => removeMapping(pinId, e)} className="p-1 rounded bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 shrink-0 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    );
                  })}
            </div>
          </div>
        )}

        {/* Fine adjustment panel */}
        {selectedPin && (() => {
          const m = mappings.find((mp) => (mp.pinId || mp.fieldKey) === selectedPin);
          if (!m) return null;
          return (
            <div className="bg-white rounded-xl border border-violet-200 overflow-hidden shrink-0">
              <div className="px-3 py-2 border-b border-violet-100 bg-violet-50">
                <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600">Fine Adjust: {m.label}</p>
              </div>
              <div className="p-2 space-y-2">
                {/* Arrow nudge */}
                <div className="grid grid-cols-3 gap-1 w-fit mx-auto">
                  <div />
                  <button onMouseDown={() => nudgePin(selectedPin, 0, -1)} onMouseUp={() => {}} className="p-1.5 rounded bg-slate-100 hover:bg-violet-100 active:bg-violet-200 flex items-center justify-center">
                    <ArrowUp className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <div />
                  <button onMouseDown={() => nudgePin(selectedPin, -1, 0)} className="p-1.5 rounded bg-slate-100 hover:bg-violet-100 active:bg-violet-200 flex items-center justify-center">
                    <ArrowLeftIcon className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <div className="p-1.5 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-violet-400" />
                  </div>
                  <button onMouseDown={() => nudgePin(selectedPin, 1, 0)} className="p-1.5 rounded bg-slate-100 hover:bg-violet-100 active:bg-violet-200 flex items-center justify-center">
                    <ArrowRightIcon className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <div />
                  <button onMouseDown={() => nudgePin(selectedPin, 0, 1)} className="p-1.5 rounded bg-slate-100 hover:bg-violet-100 active:bg-violet-200 flex items-center justify-center">
                    <ArrowDown className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <div />
                </div>
                {/* X/Y coordinate inputs */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <p className="text-[10px] text-slate-400 mb-0.5 text-center">X %</p>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={(m.x * 100).toFixed(2)}
                      onChange={(e) => setPinCoord(selectedPin, "x", e.target.value)}
                      className="w-full text-xs text-center border border-slate-200 rounded-lg px-1 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 mb-0.5 text-center">Y %</p>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={(m.y * 100).toFixed(2)}
                      onChange={(e) => setPinCoord(selectedPin, "y", e.target.value)}
                      className="w-full text-xs text-center border border-slate-200 rounded-lg px-1 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 text-center">Arrow keys nudge by ~1px · type exact % coordinates</p>
              </div>
            </div>
          );
        })()}
      </div>

    </div>
  );
}