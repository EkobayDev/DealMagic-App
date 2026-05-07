import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { form_doc_id } = await req.json();
  if (!form_doc_id) {
    return Response.json({ error: 'form_doc_id is required' }, { status: 400 });
  }

  // Fetch all signature requests for this document
  const requests = await base44.asServiceRole.entities.SignatureRequest.filter({ form_doc_id });

  if (!requests || requests.length === 0) {
    return Response.json({ error: 'No signature requests found for this document' }, { status: 404 });
  }

  // Verify all signers have signed
  const allSigned = requests.every((r) => r.status === 'signed');
  if (!allSigned) {
    return Response.json({ error: 'Not all parties have signed yet', signed: requests.filter(r => r.status === 'signed').length, total: requests.length }, { status: 400 });
  }

  // Get the original PDF URL (from any request record)
  const fileUrl = requests.find((r) => r.file_url)?.file_url;
  if (!fileUrl) {
    return Response.json({ error: 'No PDF file attached to this document' }, { status: 400 });
  }

  // Load the original PDF
  const pdfBytes = await fetch(fileUrl).then((r) => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // ── Flatten signature overlays onto existing pages ──────────────────────────
  const pages = pdfDoc.getPages();
  for (const req of requests) {
    if (!req.signature_data) continue;

    // signature_data is a base64 PNG data URL
    const base64 = req.signature_data.replace(/^data:image\/png;base64,/, '');
    const pngBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const sigImage = await pdfDoc.embedPng(pngBytes);

    // Place signature on the last page (standard placement)
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Calculate position based on signer role
    const rolePositions = {
      buyer:        { x: 50,          y: 120 },
      seller:       { x: width / 2,   y: 120 },
      buyer_agent:  { x: 50,          y: 60  },
      seller_agent: { x: width / 2,   y: 60  },
      other:        { x: 50,          y: 120 },
    };
    const pos = rolePositions[req.signer_role] || rolePositions.other;
    const sigDims = sigImage.scaleToFit(160, 50);

    lastPage.drawImage(sigImage, {
      x: pos.x,
      y: pos.y,
      width: sigDims.width,
      height: sigDims.height,
    });

    // Draw signer name + date below signature
    const signedDate = req.signed_at
      ? new Date(req.signed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Unknown date';

    lastPage.drawText(`${req.signer_name} — ${signedDate}`, {
      x: pos.x,
      y: pos.y - 12,
      size: 7,
      font: helveticaFont,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  // ── Append Certificate of Completion page ───────────────────────────────────
  const certPage = pdfDoc.addPage([612, 792]); // US Letter
  const { width, height } = certPage.getSize();

  const margin = 50;
  let y = height - margin;

  // Header bar
  certPage.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.118, 0.227, 0.373) });

  certPage.drawText('Certificate of Completion', {
    x: margin,
    y: height - 52,
    size: 22,
    font: helveticaBold,
    color: rgb(1, 1, 0),
  });

  certPage.drawText('Electronic Signature Audit Trail', {
    x: margin,
    y: height - 70,
    size: 11,
    font: helveticaFont,
    color: rgb(0.9, 0.9, 0.9),
  });

  y = height - 110;

  // Document info
  const formName = requests[0].form_name || 'Document';
  const txAddress = requests[0].transaction_address || '';

  certPage.drawText('Document', { x: margin, y, size: 8, font: helveticaBold, color: rgb(0.5, 0.5, 0.5) });
  y -= 14;
  certPage.drawText(formName, { x: margin, y, size: 12, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 16;
  if (txAddress) {
    certPage.drawText(txAddress, { x: margin, y, size: 10, font: helveticaFont, color: rgb(0.3, 0.3, 0.3) });
    y -= 14;
  }

  const completedAt = requests
    .map((r) => r.signed_at ? new Date(r.signed_at) : null)
    .filter(Boolean)
    .sort((a, b) => b - a)[0];

  if (completedAt) {
    certPage.drawText(`Completed: ${completedAt.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}`, {
      x: margin, y, size: 9, font: helveticaFont, color: rgb(0.4, 0.4, 0.4),
    });
    y -= 14;
  }

  // Divider
  y -= 10;
  certPage.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 20;

  // Signers table header
  certPage.drawText('SIGNERS', { x: margin, y, size: 8, font: helveticaBold, color: rgb(0.5, 0.5, 0.5) });
  y -= 16;

  const ROLE_LABELS = {
    buyer: 'Buyer',
    seller: 'Seller',
    buyer_agent: "Buyer's Agent",
    seller_agent: "Seller's Agent",
    other: 'Other',
  };

  for (const req of requests) {
    const signedDate = req.signed_at
      ? new Date(req.signed_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : '—';
    const roleLabel = ROLE_LABELS[req.signer_role] || req.signer_role;

    // Row background
    certPage.drawRectangle({ x: margin - 6, y: y - 4, width: width - margin * 2 + 12, height: 52, color: rgb(0.97, 0.97, 0.99) });

    // Signature image
    if (req.signature_data) {
      const base64 = req.signature_data.replace(/^data:image\/png;base64,/, '');
      const pngBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const sigImage = await pdfDoc.embedPng(pngBytes);
      const sigDims = sigImage.scaleToFit(120, 36);
      certPage.drawImage(sigImage, { x: width - margin - 130, y: y, width: sigDims.width, height: sigDims.height });
    }

    certPage.drawText(req.signer_name || 'Unknown', { x: margin, y: y + 28, size: 11, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
    certPage.drawText(roleLabel, { x: margin, y: y + 14, size: 9, font: helveticaFont, color: rgb(0.45, 0.45, 0.45) });
    if (req.signer_email) {
      certPage.drawText(req.signer_email, { x: margin, y: y + 3, size: 8, font: helveticaFont, color: rgb(0.55, 0.55, 0.55) });
    }
    certPage.drawText(`Signed: ${signedDate}`, { x: margin, y: y - 8, size: 8, font: helveticaFont, color: rgb(0.3, 0.6, 0.3) });

    y -= 68;
    if (y < margin + 80) break; // safety: don't overflow page
  }

  // Legal footer
  y = margin + 40;
  certPage.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 14;
  certPage.drawText(
    'This certificate confirms that all parties listed above have electronically signed the referenced document.',
    { x: margin, y, size: 7.5, font: helveticaFont, color: rgb(0.5, 0.5, 0.5), maxWidth: width - margin * 2 }
  );
  y -= 11;
  certPage.drawText(
    'Electronic signatures are legally binding under the ESIGN Act (15 U.S.C. § 7001) and UETA.',
    { x: margin, y, size: 7.5, font: helveticaFont, color: rgb(0.5, 0.5, 0.5), maxWidth: width - margin * 2 }
  );
  y -= 11;
  certPage.drawText(
    `Generated by DealMagic Oklahoma · ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Chicago' })} CT`,
    { x: margin, y, size: 7, font: helveticaFont, color: rgb(0.65, 0.65, 0.65), maxWidth: width - margin * 2 }
  );

  // ── Save and upload finalized PDF ────────────────────────────────────────────
  const finalBytes = await pdfDoc.save();
  const finalFile = new File([finalBytes], `signed_${form_doc_id}.pdf`, { type: 'application/pdf' });
  const { file_url: finalUrl } = await base44.asServiceRole.integrations.Core.UploadFile({ file: finalFile });

  // Update all requests with the finalized PDF url
  await Promise.all(
    requests.map((r) =>
      base44.asServiceRole.entities.SignatureRequest.update(r.id, { file_url: finalUrl })
    )
  );

  return Response.json({ success: true, file_url: finalUrl, signers: requests.length });
});