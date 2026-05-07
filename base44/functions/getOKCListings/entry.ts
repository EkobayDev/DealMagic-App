import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Find newly active residential real estate listings in the Oklahoma City (OKC) Metro area listed within the last 7 days (from ${oneWeekAgo} to ${today}).

CRITICAL: Only include listings that are CURRENTLY ACTIVE and available for purchase as of today (${today}). Do NOT include listings that are under contract, pending, sold, off-market, or expired. Verify the current MLS/Zillow status of each listing before including it.

Return a JSON object with a "listings" array. Each listing should include:
- address: string (full street address including city, OK and zip)
- list_price: number (listing price in dollars)
- beds: number (bedrooms)
- baths: number (bathrooms)
- sqft: number (square footage)
- days_on_market: number (0-7)
- date_listed: string (YYYY-MM-DD format)
- zillow_url: string (a valid Zillow search URL for the address, format: https://www.zillow.com/homes/[address-slug]_rb/ where address-slug replaces spaces with hyphens and commas are removed)
- city: string (city name within OKC metro, e.g. Oklahoma City, Edmond, Yukon, Mustang, Moore, Midwest City, Del City, Choctaw, Bethany, Warr Acres, etc.)

Include at least 20-30 listings if available. Focus on single-family homes in OKC Metro. Be as accurate and up-to-date as possible using current MLS/Zillow data.`,
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
                            list_price: { type: "number" },
                            beds: { type: "number" },
                            baths: { type: "number" },
                            sqft: { type: "number" },
                            days_on_market: { type: "number" },
                            date_listed: { type: "string" },
                            zillow_url: { type: "string" },
                            city: { type: "string" }
                        }
                    }
                }
            }
        }
    });

    return Response.json({ listings: result.listings || [] });
});