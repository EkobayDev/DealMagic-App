import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    // Allow scheduled automations (no user) or admin users
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (isAuthenticated) {
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
    }

    const transactions = await base44.asServiceRole.entities.Transaction.filter({});
    const active = transactions.filter(t => !['closed', 'cancelled', 'expired'].includes(t.status));

    if (active.length === 0) {
        return Response.json({ message: 'No active transactions to check', updated: 0 });
    }

    const updates = [];

    for (const tx of active) {
        if (!tx.property_address) continue;

        const address = [tx.property_address, tx.city, tx.state || 'OK', tx.zip].filter(Boolean).join(', ');

        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Look up the current MLS listing status and listing price for this Oklahoma property: "${address}". 
            
            Return only a JSON object with these fields:
            - status: one of "active", "under_contract", "pending", "closed", "cancelled", "expired", or null if unknown
            - listing_price: number (the current listing price in dollars) or null if unknown
            - found: boolean (true if you found reliable data for this property)
            - source: string (where you found the data, e.g. "Zillow", "Realtor.com", "OKCMAR MLS")
            
            Only return data you are confident about from real current listings. If you cannot find the property, set found to false and status/listing_price to null.`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    status: { type: ["string", "null"] },
                    listing_price: { type: ["number", "null"] },
                    found: { type: "boolean" },
                    source: { type: ["string", "null"] }
                }
            }
        });

        if (!result?.found) continue;

        const changes = {};
        const changeLog = {};

        // Only allow status to move forward in the lifecycle, never backward.
        // Zillow/Realtor.com often show "Active" for properties that are actually
        // under contract or pending in the MLS — ignore any downgrade.
        const STATUS_RANK = {
            active: 0,
            coming_soon: 0,
            under_contract: 1,
            pending: 2,
            closed: 3,
            cancelled: 3,
            expired: 3
        };
        const currentRank = STATUS_RANK[tx.status] ?? 0;
        const newRank = STATUS_RANK[result.status] ?? 0;
        if (result.status && result.status !== tx.status && newRank > currentRank) {
            changeLog.status = { from: tx.status, to: result.status };
            changes.status = result.status;
        }

        if (result.listing_price && result.listing_price !== tx.listing_price) {
            changeLog.listing_price = { from: tx.listing_price, to: result.listing_price };
            changes.listing_price = result.listing_price;
        }

        const wasUpdated = Object.keys(changes).length > 0;

        if (wasUpdated) {
            changes.last_verified_at = new Date().toISOString();
            changes.last_verification_updated = true;
            changes.last_verification_source = result.source || null;
            changes.last_verification_changes = changeLog;
            await base44.asServiceRole.entities.Transaction.update(tx.id, changes);
            updates.push({
                address: tx.property_address,
                changes,
                source: result.source
            });
        } else {
            // Still record that we checked, just no changes found
            await base44.asServiceRole.entities.Transaction.update(tx.id, {
                last_verified_at: new Date().toISOString(),
                last_verification_updated: false,
                last_verification_source: result.source || null
            });
        }
    }

    return Response.json({
        message: `Checked ${active.length} transactions, updated ${updates.length}`,
        updated: updates.length,
        details: updates
    });
});