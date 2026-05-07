import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { vendor } = await req.json();

    // Get all admin users to notify
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = allUsers.filter((u) => u.role === "admin");

    for (const admin of admins) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `New Vendor Application: ${vendor.business_name}`,
        body: `A new vendor has submitted a registration application and is pending your review.

Vendor: ${vendor.business_name}
Category: ${vendor.category?.replace(/_/g, " ")}
Contact: ${vendor.contact_name}
Email: ${vendor.email}
Phone: ${vendor.cell_phone || "—"}
${vendor.city ? `Location: ${vendor.city}, ${vendor.state}` : ""}
${vendor.notes ? `\nDescription:\n${vendor.notes}` : ""}

Review and approve this application in the DealMagic admin panel:
${req.headers.get("origin") || "https://dealmagic.com"}/VendorApprovals

— DealMagic Platform`,
      });
    }

    return Response.json({ success: true, notified: admins.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});