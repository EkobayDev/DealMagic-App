import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// We pass the pre-scraped HTML content from the client (fetched via the platform's fetch_website)
// OR we can use the LLM to parse a provided snapshot of the page content.

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Accept pre-fetched page content from the frontend, or use a static snapshot
  const pageContent = body.page_content || "";

  if (!pageContent) {
    return Response.json({ error: "page_content is required" }, { status: 400 });
  }

  const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are parsing real estate listings from www.openhouseok.com.

Below is the page content. Extract ALL property listings found.

For each listing return:
- address: street address (e.g. "123 Main St")
- city: city name (e.g. "Norman")  
- beds: bedrooms as integer
- baths: bathrooms as number
- sqft: square footage as integer (0 if not found)
- price: price as integer, no $ or commas (e.g. 250000)
- date_listed: date as MM/DD/YYYY string
- tours: number of tour views as integer (0 if not found)
- status: "for_sale"
- url: full showhome.htm URL if present

PAGE CONTENT:
${pageContent.substring(0, 80000)}`,
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
              beds: { type: "number" },
              baths: { type: "number" },
              sqft: { type: "number" },
              price: { type: "number" },
              date_listed: { type: "string" },
              tours: { type: "number" },
              status: { type: "string" },
              url: { type: "string" }
            }
          }
        }
      }
    }
  });

  return Response.json({
    listings: llmRes.listings || [],
    total_count: (llmRes.listings || []).length,
    scraped_at: new Date().toISOString()
  });
});