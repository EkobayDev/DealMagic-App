import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const currentYear = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Get the weekly mortgage rate data for the year ${currentYear} (year-to-date through ${today}) for three loan types:
1. 30-year Conventional fixed rate (from Freddie Mac PMMS)
2. 30-year FHA fixed rate (from MBA or HUD)
3. 30-year VA fixed rate (from MBA or VA)

Return a JSON object with three arrays: "conventional", "fha", and "va".
Each array item should have:
- week: string (week ending date, format "YYYY-MM-DD")
- rate: number (rate as a percentage, e.g. 6.87)
- source: string (data source name)

Include every weekly data point available for ${currentYear} up to the most recent. Be as accurate and up-to-date as possible.`,
        add_context_from_internet: true,
        response_json_schema: {
            type: "object",
            properties: {
                conventional: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            week: { type: "string" },
                            rate: { type: "number" },
                            source: { type: "string" }
                        }
                    }
                },
                fha: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            week: { type: "string" },
                            rate: { type: "number" },
                            source: { type: "string" }
                        }
                    }
                },
                va: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            week: { type: "string" },
                            rate: { type: "number" },
                            source: { type: "string" }
                        }
                    }
                }
            }
        }
    });

    return Response.json({
        conventional: result.conventional || [],
        fha: result.fha || [],
        va: result.va || []
    });
});