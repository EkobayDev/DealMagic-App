import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SignaturePad from "@/components/signatures/SignaturePad";

export default function Sign() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const [signed, setSigned] = useState(false);
  const [declined, setDeclined] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["sign-token", token],
    queryFn: () => base44.entities.SignatureRequest.filter({ token }),
    enabled: !!token,
  });

  const request = requests[0] || null;

  const signMutation = useMutation({
    mutationFn: ({ id, signature_data }) =>
      base44.entities.SignatureRequest.update(id, {
        signature_data,
        status: "signed",
        signed_at: new Date().toISOString(),
      }),
    onSuccess: () => setSigned(true),
  });

  const declineMutation = useMutation({
    mutationFn: (id) => base44.entities.SignatureRequest.update(id, { status: "declined" }),
    onSuccess: () => setDeclined(true),
  });

  if (!token) return <ErrorPage message="Invalid signing link." />;
  if (isLoading) return <Loading />;
  if (!request) return <ErrorPage message="Signing request not found or expired." />;

  if (signed || request.status === "signed") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-10 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Document Signed</h2>
          <p className="text-sm text-slate-500">Thank you, <b>{request.signer_name}</b>. Your signature has been recorded.</p>
          {request.signature_data && (
            <img src={request.signature_data} alt="Your signature" className="mx-auto max-w-[200px] border rounded-lg p-2 bg-slate-50" />
          )}
        </div>
      </div>
    );
  }

  if (declined || request.status === "declined") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-10 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Signature Declined</h2>
          <p className="text-sm text-slate-500">You have declined to sign this document.</p>
        </div>
      </div>
    );
  }

  const fields = request.field_snapshot || {};

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#1e3a5f" }}>
              <FileText className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{request.form_name}</h1>
              {request.transaction_address && <p className="text-sm text-slate-500">{request.transaction_address}</p>}
              <p className="text-sm text-slate-700 mt-1">You are signing as <b>{request.signer_name}</b></p>
            </div>
          </div>
        </div>

        {/* Field snapshot */}
        {Object.keys(fields).length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Form Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(fields).map(([k, v]) => v ? (
                <div key={k} className="space-y-0.5">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide">{k.replace(/_/g, " ")}</p>
                  <p className="text-sm text-slate-800">{v}</p>
                </div>
              ) : null)}
            </div>
          </div>
        )}

        {/* Signature pad */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Your Signature</p>
          <SignaturePad
            signerName={request.signer_name}
            onSave={(sigData) => signMutation.mutate({ id: request.id, signature_data: sigData })}
            onCancel={() => declineMutation.mutate(request.id)}
          />
          <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
            By applying your signature you agree that this constitutes a valid electronic signature for the above-referenced document.
          </p>
        </div>
      </div>
    </div>
  );
}

const Loading = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
  </div>
);

const ErrorPage = ({ message }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <div className="bg-white rounded-2xl border border-slate-100 p-10 max-w-sm w-full text-center">
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  </div>
);