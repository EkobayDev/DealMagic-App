import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { notes } = await req.json();

    if (!notes) return Response.json({ listings: [] });

    const today = new Date().toISOString().split('T')[0];

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `A real estate agent has a contact with the following notes/criteria:
"${notes}"

Today is ${today}. Search for real estate listings that match the criteria described in those notes. Focus on OKC Metro area unless a different location is specified. Return up to 15 matching listings.

CRITICAL: Only include listings that are CURRENTLY ACTIVE and available for purchase as of today (${today}). Do NOT include listings that are under contract, pending, sold, off-market, or expired. Verify each listing's current status before including it.

Each listing should include:
- address: string (street address only, e.g. "123 Main St")
- city: string
- state: string (2-letter abbreviation)
- zip: string
- list_price: number
- beds: number
- baths: number
- sqft: number
- date_listed: string (YYYY-MM-DD)
- zillow_url: string (valid Zillow URL for the listing)
- match_reason: string (brief explanation of why this listing matches the notes)
- status: string (must be "Active" — exclude anything else)`,
        add_context_from_internet: true,
        response_json_schema: {
            type: "object",
            properties: {
                listings: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            address: { type: "string" },
                            city: { type: "string" },
                            state: { type: "string" },
                            zip: { type: "string" },
                            list_price: { type: "number" },
                            beds: { type: "number" },
                            baths: { type: "number" },
                            sqft: { type: "number" },
                            date_listed: { type: "string" },
                            zillow_url: { type: "string" },
                            match_reason: { type: "string" }
                        }
                    }
                }
            }
        }
    });

    return Response.json({ listings: result.listings || [] });
});