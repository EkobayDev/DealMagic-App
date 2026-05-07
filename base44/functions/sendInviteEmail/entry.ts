import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { to, fullName, brokerage, role } = await req.json();

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: "DealMagic.AI",
      to,
      subject: "You've been invited to DealMagic",
      body: `Hi ${fullName},\n\nYou have been invited to join DealMagic — the AI-powered real estate platform built for Oklahoma professionals.\n\nBrokerage: ${brokerage || "N/A"}\nRole: ${role === "admin" ? "Admin" : "Agent"}\n\nPlease check your inbox for a separate login link to complete your account setup. Once logged in, you'll have full access to your DealMagic dashboard.\n\nWelcome aboard!\n\nThe DealMagic.AI Team\nhttps://dealmagic.ai`,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});