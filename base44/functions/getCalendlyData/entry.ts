import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("calendly");

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get current user info
    const meRes = await fetch('https://api.calendly.com/users/me', { headers });
    const meData = await meRes.json();
    const userUri = meData.resource?.uri;
    const userSlug = meData.resource?.slug;

    if (!userUri) {
      return Response.json({ error: 'Could not fetch Calendly user' }, { status: 500 });
    }

    // Get event types
    const etRes = await fetch(`https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}&active=true`, { headers });
    const etData = await etRes.json();
    const eventTypes = etData.collection || [];

    // Get available times for each active event type (next 7 days)
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // 5-minute buffer
    const startTime = now.toISOString();
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    const endTime = end.toISOString();

    const availabilityByType = {};
    for (const et of eventTypes) {
      if (!et.active) continue;
      const avRes = await fetch(
        `https://api.calendly.com/event_type_available_times?event_type=${encodeURIComponent(et.uri)}&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`,
        { headers }
      );
      const avData = await avRes.json();
      availabilityByType[et.uri] = avData.collection || [];
    }

    // Get scheduled events (next 30 days)
    const schedEnd = new Date();
    schedEnd.setDate(schedEnd.getDate() + 30);

    // Fetch in 7-day chunks
    const scheduledEvents = [];
    let chunkStart = new Date();
    chunkStart.setMinutes(chunkStart.getMinutes() + 5);

    for (let i = 0; i < 4; i++) {
      const chunkEnd = new Date(chunkStart);
      chunkEnd.setDate(chunkEnd.getDate() + 7);
      if (chunkStart >= schedEnd) break;

      const seRes = await fetch(
        `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userUri)}&status=active&min_start_time=${encodeURIComponent(chunkStart.toISOString())}&max_start_time=${encodeURIComponent(chunkEnd.toISOString())}&count=50`,
        { headers }
      );
      const seData = await seRes.json();
      if (seData.collection) scheduledEvents.push(...seData.collection);
      chunkStart = chunkEnd;
    }

    return Response.json({
      user: meData.resource,
      eventTypes,
      availabilityByType,
      scheduledEvents,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});