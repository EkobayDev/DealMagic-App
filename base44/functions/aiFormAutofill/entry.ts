import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rawText, fileUrl, fields } = await req.json();

    const fieldList = fields.map(f => `- ${f.key}: ${f.label}${f.type ? ` (type: ${f.type})` : ''}`).join('\n');

    const prompt = `You are a real estate form assistant. Extract values for the following form fields from the provided text or document content.

Form Fields to fill:
${fieldList}

Source Text / Document:
${rawText || '(See attached file)'}

Instructions:
- Extract ONLY the values explicitly mentioned in the text.
- For currency fields, return numeric value only (e.g. "250000" not "$250,000").
- For date fields, return in MM/DD/YYYY format.
- If a value is not found, omit that key entirely.
- Return ONLY a JSON object with the field keys and their extracted values.
- Do not guess or make up values.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: fileUrl ? [fileUrl] : undefined,
      response_json_schema: {
        type: "object",
        additionalProperties: { type: "string" }
      }
    });

    return Response.json({ extracted: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});