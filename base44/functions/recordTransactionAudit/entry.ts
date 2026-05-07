import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Fields to skip (internal/system fields)
const SKIP_FIELDS = new Set([
  "id", "created_date", "updated_date", "created_by",
  "last_verified_at", "last_verification_updated",
  "last_verification_source", "last_verification_changes",
  "portal_token"
]);

const FIELD_LABELS = {
  property_address: "Property Address",
  city: "City",
  state: "State",
  zip: "ZIP",
  county: "County",
  mls_number: "MLS Number",
  status: "Status",
  transaction_type: "Transaction Type",
  property_type: "Property Type",
  buyer_name: "Buyer Name",
  buyer_email: "Buyer Email",
  buyer_phone: "Buyer Phone",
  seller_name: "Seller Name",
  seller_email: "Seller Email",
  seller_phone: "Seller Phone",
  buyer_agent_name: "Buyer Agent Name",
  buyer_agent_brokerage: "Buyer Agent Brokerage",
  seller_agent_name: "Seller Agent Name",
  seller_agent_brokerage: "Seller Agent Brokerage",
  title_company: "Title Company",
  lender_name: "Lender Name",
  purchase_price: "Purchase Price",
  earnest_money: "Earnest Money",
  commission_percent: "Commission %",
  commission_amount: "Commission Amount",
  commission_distributed_date: "Commission Distributed Date",
  listing_price: "Listing Price",
  contract_date: "Contract Date",
  closing_date: "Closing Date",
  inspection_deadline: "Inspection Deadline",
  appraisal_deadline: "Appraisal Deadline",
  financing_deadline: "Financing Deadline",
  title_deadline: "Title Deadline",
  possession_date: "Possession Date",
  notes: "Notes",
  representing: "Representing",
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));

  const { event, data, old_data } = body;

  if (!event || !data) {
    return Response.json({ error: "Missing event or data" }, { status: 400 });
  }

  // Fetch the user who created the record (for create events, or from updated_by)
  let changedBy = data.created_by || "";
  let changedByName = "";

  // Try to look up user display name
  if (changedBy) {
    const users = await base44.asServiceRole.entities.User.filter({ email: changedBy });
    if (users.length > 0) changedByName = users[0].full_name || "";
  }

  const changes = [];

  if (event.type === "create") {
    // Log all non-empty fields as new
    for (const [key, val] of Object.entries(data)) {
      if (SKIP_FIELDS.has(key) || val === null || val === undefined || val === "") continue;
      changes.push({
        field: FIELD_LABELS[key] || key.replace(/_/g, " "),
        old_value: "",
        new_value: String(val),
      });
    }
  } else if (event.type === "update" && old_data) {
    const allKeys = new Set([...Object.keys(data), ...Object.keys(old_data)]);
    for (const key of allKeys) {
      if (SKIP_FIELDS.has(key)) continue;
      const oldVal = old_data[key] ?? "";
      const newVal = data[key] ?? "";
      if (String(oldVal) !== String(newVal)) {
        changes.push({
          field: FIELD_LABELS[key] || key.replace(/_/g, " "),
          old_value: oldVal === null || oldVal === undefined ? "" : String(oldVal),
          new_value: newVal === null || newVal === undefined ? "" : String(newVal),
        });
      }
    }
  }

  // Only log if there are meaningful changes
  if (event.type !== "delete" && changes.length === 0) {
    return Response.json({ skipped: true, reason: "no meaningful changes" });
  }

  await base44.asServiceRole.entities.TransactionAuditLog.create({
    transaction_id: event.entity_id || data.id,
    transaction_address: data.property_address || old_data?.property_address || "",
    changed_by: changedBy,
    changed_by_name: changedByName,
    event_type: event.type,
    changes,
  });

  return Response.json({ success: true, changes_logged: changes.length });
});