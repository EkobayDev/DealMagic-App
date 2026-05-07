import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
        return Response.json({ error: 'Token required' }, { status: 400 });
    }

    // Find transaction by portal token (service role - public endpoint)
    const transactions = await base44.asServiceRole.entities.Transaction.filter({ portal_token: token });

    if (!transactions || transactions.length === 0) {
        return Response.json({ error: 'Invalid or expired portal link' }, { status: 404 });
    }

    const tx = transactions[0];

    // Get signature requests for this transaction
    const allSigRequests = await base44.asServiceRole.entities.SignatureRequest.filter({
        transaction_address: tx.property_address
    });

    // Define deadline fields
    const deadlineFields = [
        { key: 'inspection_deadline', label: 'Inspection Deadline' },
        { key: 'appraisal_deadline', label: 'Appraisal Deadline' },
        { key: 'financing_deadline', label: 'Financing Deadline' },
        { key: 'title_deadline', label: 'Title Deadline' },
        { key: 'closing_date', label: 'Closing Date' },
        { key: 'possession_date', label: 'Possession Date' },
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadlines = deadlineFields
        .filter(d => tx[d.key])
        .map(d => {
            const date = new Date(tx[d.key] + 'T00:00:00');
            const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
            return {
                label: d.label,
                date: tx[d.key],
                diffDays,
                status: diffDays < 0 ? 'overdue' : diffDays === 0 ? 'today' : diffDays <= 3 ? 'urgent' : 'upcoming'
            };
        })
        .sort((a, b) => a.diffDays - b.diffDays);

    return Response.json({
        transaction: {
            property_address: tx.property_address,
            city: tx.city,
            state: tx.state,
            zip: tx.zip,
            status: tx.status,
            transaction_type: tx.transaction_type,
            purchase_price: tx.purchase_price,
            closing_date: tx.closing_date,
            representing: tx.representing,
            buyer_name: tx.buyer_name,
            seller_name: tx.seller_name,
        },
        deadlines,
        signature_requests: allSigRequests,
    });
});