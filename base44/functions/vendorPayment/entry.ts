import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, vendorId, vendorName, vendorEmail, amount, description, notes, transactionId, transactionAddress, paymentRecordId, paymentIntentId } = body;

  // Send Stripe invoice to vendor
  if (action === 'invoice') {
    if (!vendorEmail) {
      return Response.json({ error: 'Vendor email is required to send an invoice' }, { status: 400 });
    }

    // Find or create customer
    const customers = await stripe.customers.list({ email: vendorEmail, limit: 1 });
    let customer = customers.data[0];
    if (!customer) {
      customer = await stripe.customers.create({ email: vendorEmail, name: vendorName });
    }

    // Create invoice
    await stripe.invoiceItems.create({
      customer: customer.id,
      amount: Math.round(amount * 100),
      currency: 'usd',
      description: description || `Payment to ${vendorName}`,
    });

    const invoice = await stripe.invoices.create({
      customer: customer.id,
      auto_advance: true,
      collection_method: 'send_invoice',
      days_until_due: 14,
      description: description,
    });

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    await stripe.invoices.sendInvoice(finalizedInvoice.id);

    // Save payment record
    const record = await base44.entities.VendorPayment.create({
      vendor_id: vendorId,
      vendor_name: vendorName,
      vendor_email: vendorEmail,
      amount,
      description,
      payment_type: 'invoice',
      status: 'invoiced',
      stripe_invoice_id: finalizedInvoice.id,
      stripe_invoice_url: finalizedInvoice.hosted_invoice_url,
      transaction_id: transactionId || '',
      transaction_address: transactionAddress || '',
      notes: notes || '',
    });

    return Response.json({ success: true, type: 'invoice', invoice_url: finalizedInvoice.hosted_invoice_url, record });
  }

  // Create payment intent for direct pay (returns client_secret to frontend)
  if (action === 'direct') {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      description: description || `Payment to ${vendorName}`,
      metadata: { vendor_id: vendorId, vendor_name: vendorName },
    });

    // Save pending payment record
    const record = await base44.entities.VendorPayment.create({
      vendor_id: vendorId,
      vendor_name: vendorName,
      vendor_email: vendorEmail || '',
      amount,
      description,
      payment_type: 'direct',
      status: 'pending',
      stripe_payment_intent_id: paymentIntent.id,
      transaction_id: transactionId || '',
      transaction_address: transactionAddress || '',
      notes: notes || '',
    });

    return Response.json({ success: true, type: 'direct', client_secret: paymentIntent.client_secret, payment_record_id: record.id });
  }

  // Confirm payment success (called after Stripe Elements completes)
  if (action === 'confirm') {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId || '');
    if (pi.status === 'succeeded') {
      await base44.entities.VendorPayment.update(paymentRecordId, { status: 'paid' });
      return Response.json({ success: true, status: 'paid' });
    }
    return Response.json({ success: false, status: pi.status });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
});