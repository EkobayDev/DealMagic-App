import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const REMINDER_FIELDS = [
  { key: "closing_date", label: "Closing Date" },
  { key: "inspection_deadline", label: "Inspection Deadline" },
];

function getTomorrowDateString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const tomorrow = getTomorrowDateString();

    // Fetch all non-closed transactions
    const transactions = await base44.asServiceRole.entities.Transaction.list("-updated_date", 500);
    const active = transactions.filter(
      (t) => !["closed", "cancelled", "expired"].includes(t.status)
    );

    let emailsSent = 0;

    for (const tx of active) {
      for (const { key, label } of REMINDER_FIELDS) {
        if (tx[key] !== tomorrow) continue;

        // Build recipient list
        const recipients = [];
        if (tx.buyer_name && tx.buyer_email)
          recipients.push({ name: tx.buyer_name, email: tx.buyer_email, role: "Buyer" });
        if (tx.seller_name && tx.seller_email)
          recipients.push({ name: tx.seller_name, email: tx.seller_email, role: "Seller" });

        const address = [tx.property_address, tx.city, tx.state].filter(Boolean).join(", ");
        const dateFormatted = new Date(tomorrow + "T00:00:00").toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric"
        });

        for (const recipient of recipients) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: recipient.email,
            subject: `Reminder: ${label} Tomorrow — ${tx.property_address}`,
            body: `
Hello ${recipient.name},

This is a reminder that the <strong>${label}</strong> for the following property is scheduled for <strong>tomorrow, ${dateFormatted}</strong>.

<strong>Property:</strong> ${address}
<strong>Your Role:</strong> ${recipient.role}
${tx.title_company ? `<strong>Title Company:</strong> ${tx.title_company}` : ""}
${tx.lender_name ? `<strong>Lender:</strong> ${tx.lender_name}` : ""}

Please make sure all required documents and preparations are in order.

If you have any questions, please contact your agent.

— DealMagic Oklahoma
            `.trim(),
          });
          emailsSent++;
        }
      }
    }

    return Response.json({ success: true, emailsSent, date: tomorrow });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});