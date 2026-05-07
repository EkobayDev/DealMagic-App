import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { vendor, approved, reason } = await req.json();

    if (!vendor?.email) {
      return Response.json({ success: false, message: "No vendor email" });
    }

    if (approved) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: vendor.email,
        subject: `Welcome to DealMagic! Your vendor application has been approved 🎉`,
        body: `Hi ${vendor.contact_name || vendor.business_name},

Great news! Your vendor registration for ${vendor.business_name} has been approved and your profile is now live in the DealMagic vendor network.

Real estate agents in our network can now discover your business and send you service order requests directly.

If you need to update your profile information, please reach out to us.

Welcome to the team!

— The DealMagic Team`,
      });
    } else {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: vendor.email,
        subject: `DealMagic Vendor Application Update`,
        body: `Hi ${vendor.contact_name || vendor.business_name},

Thank you for your interest in joining the DealMagic vendor network.

After reviewing your application for ${vendor.business_name}, we are unable to approve it at this time.
${reason ? `\nReason: ${reason}\n` : ""}
If you believe this was an error or would like more information, please contact us directly.

Thank you for your understanding.

— The DealMagic Team`,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});