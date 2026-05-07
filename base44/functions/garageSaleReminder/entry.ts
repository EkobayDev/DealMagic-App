import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow scheduled automation (no user session) via service role
  const listings = await base44.asServiceRole.entities.GarageSaleListing.filter({ status: "active" });

  if (!listings || listings.length === 0) {
    return Response.json({ message: "No active listings to remind about." });
  }

  // Group listings by seller_email
  const byEmail = {};
  for (const listing of listings) {
    if (!listing.seller_email) continue;
    if (!byEmail[listing.seller_email]) {
      byEmail[listing.seller_email] = { name: listing.seller_name || "there", items: [] };
    }
    byEmail[listing.seller_email].items.push(listing);
  }

  let sent = 0;
  for (const [email, { name, items }] of Object.entries(byEmail)) {
    const itemList = items.map((item) => {
      const price = item.price != null ? `$${Number(item.price).toLocaleString()}` : "No price set";
      return `• <strong>${item.title}</strong> — ${price}${item.category ? ` (${item.category})` : ""}`;
    }).join("<br/>");

    const subject = `DealMagic Garage Sale — Your Active Listing${items.length > 1 ? "s" : ""} 🏷️`;

    const body = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
  <div style="background: #1e3a5f; padding: 24px 32px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: #FFFF00; margin: 0; font-size: 22px; letter-spacing: 1px;">DealMagic Garage Sale</h1>
    <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px;">Team Marketplace Update</p>
  </div>
  <div style="background: #ffffff; padding: 28px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-top: 0;">Hi ${name},</p>
    <p>Just a friendly reminder that you have <strong>${items.length} active listing${items.length > 1 ? "s" : ""}</strong> on the DealMagic Garage Sale:</p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 16px 0; line-height: 2;">
      ${itemList}
    </div>
    <p>Now's a great time to:</p>
    <ul style="line-height: 1.9; color: #475569;">
      <li>Update your price or description</li>
      <li>Add new photos to attract interest</li>
      <li>Mark an item as <strong>Sold</strong> if it's gone</li>
      <li>Add a link to your eBay or Facebook Marketplace listing</li>
    </ul>
    <p style="color: #64748b; font-size: 14px;">Log in to DealMagic and visit the <strong>Garage Sale</strong> page to manage your listings.</p>
    <p style="margin-bottom: 0; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
      DealMagic Oklahoma · This is an automated weekly reminder.
    </p>
  </div>
</div>
    `.trim();

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject,
      body,
      from_name: "DealMagic Garage Sale",
    });

    sent++;
  }

  return Response.json({ success: true, emails_sent: sent, sellers: Object.keys(byEmail).length });
});