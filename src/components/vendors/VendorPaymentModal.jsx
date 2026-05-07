import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, FileText, CheckCircle2, Loader2 } from "lucide-react";

// NOTE: Replace with your Stripe publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder");

function DirectPayForm({ vendor, amount, description, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const res = await base44.functions.invoke("vendorPayment", {
      action: "direct",
      vendorId: vendor.id,
      vendorName: vendor.business_name,
      vendorEmail: vendor.email || "",
      amount,
      description,
    });

    const { client_secret, payment_record_id } = res.data;

    const result = await stripe.confirmCardPayment(client_secret, {
      payment_method: { card: elements.getElement(CardElement) },
    });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    // Update record to paid
    await base44.functions.invoke("vendorPayment", {
      action: "confirm",
      paymentRecordId: payment_record_id,
      paymentIntentId: result.paymentIntent.id,
    });

    setLoading(false);
    onSuccess("paid");
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <p className="text-xs text-slate-500 mb-2">Card Details</p>
        <CardElement options={{ style: { base: { fontSize: "14px", color: "#1e293b" } } }} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button onClick={handlePay} disabled={loading || !stripe} className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          Pay ${amount?.toFixed(2)}
        </Button>
      </div>
    </div>
  );
}

export default function VendorPaymentModal({ open, onClose, vendor }) {
  const [step, setStep] = useState("form"); // form | direct-pay | done
  const [payType, setPayType] = useState("direct");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const reset = () => {
    setStep("form");
    setPayType("direct");
    setAmount("");
    setDescription("");
    setNotes("");
    setResult(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmitInvoice = async () => {
    setLoading(true);
    const res = await base44.functions.invoke("vendorPayment", {
      action: "invoice",
      vendorId: vendor.id,
      vendorName: vendor.business_name,
      vendorEmail: vendor.email,
      amount: parseFloat(amount),
      description,
      notes,
    });
    setLoading(false);
    setResult(res.data);
    setStep("done");
  };

  const handleProceedDirect = () => {
    setStep("direct-pay");
  };

  if (!vendor) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "done" ? "Payment Sent" : `Pay ${vendor.business_name}`}
          </DialogTitle>
        </DialogHeader>

        {step === "done" && (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            {result?.type === "invoice" ? (
              <>
                <p className="font-semibold text-slate-800">Invoice Sent!</p>
                <p className="text-sm text-slate-500">A Stripe invoice for <strong>${parseFloat(amount).toFixed(2)}</strong> was emailed to {vendor.email}.</p>
                {result?.invoice_url && (
                  <a href={result.invoice_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                    View Invoice →
                  </a>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-800">Payment Complete!</p>
                <p className="text-sm text-slate-500"><strong>${parseFloat(amount).toFixed(2)}</strong> was charged successfully.</p>
              </>
            )}
            <Button onClick={handleClose} className="w-full mt-2">Done</Button>
          </div>
        )}

        {step === "form" && (
          <div className="space-y-4">
            {/* Payment type */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPayType("direct")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${payType === "direct" ? "border-[#FFFF00] bg-yellow-50" : "border-slate-200 hover:border-slate-300"}`}
              >
                <CreditCard className="w-5 h-5 text-slate-700" />
                <span className="text-sm font-semibold text-slate-800">Pay Now</span>
                <span className="text-[11px] text-slate-400 text-center">Charge a card directly</span>
              </button>
              <button
                onClick={() => setPayType("invoice")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${payType === "invoice" ? "border-[#FFFF00] bg-yellow-50" : "border-slate-200 hover:border-slate-300"}`}
              >
                <FileText className="w-5 h-5 text-slate-700" />
                <span className="text-sm font-semibold text-slate-800">Send Invoice</span>
                <span className="text-[11px] text-slate-400 text-center">Email Stripe invoice to vendor</span>
              </button>
            </div>

            {payType === "invoice" && !vendor.email && (
              <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                ⚠️ This vendor has no email on file. Add one before sending an invoice.
              </p>
            )}

            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Amount ($)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Description</Label>
              <Input
                placeholder="e.g. Inspection fee for 123 Main St"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Notes (optional)</Label>
              <Textarea
                placeholder="Internal notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-20 resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              {payType === "direct" ? (
                <Button
                  onClick={handleProceedDirect}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2"
                >
                  <CreditCard className="w-4 h-4" /> Enter Card
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitInvoice}
                  disabled={!amount || parseFloat(amount) <= 0 || !vendor.email || loading}
                  className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Send Invoice
                </Button>
              )}
            </div>
          </div>
        )}

        {step === "direct-pay" && (
          <Elements stripe={stripePromise}>
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600">
                Paying <strong>{vendor.business_name}</strong> — <strong>${parseFloat(amount || 0).toFixed(2)}</strong>
                {description && <span className="block text-xs text-slate-400 mt-0.5">{description}</span>}
              </div>
              <DirectPayForm
                vendor={vendor}
                amount={parseFloat(amount)}
                description={description}
                onSuccess={(status) => { setResult({ type: "direct", status }); setStep("done"); }}
                onCancel={() => setStep("form")}
              />
            </div>
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}