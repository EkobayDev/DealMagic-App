import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PenLine, Send, CheckCircle2, Clock, X, Plus, ExternalLink } from "lucide-react";
import SignaturePad from "./SignaturePad";

const ROLES = [
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "buyer_agent", label: "Buyer's Agent" },
  { value: "seller_agent", label: "Seller's Agent" },
  { value: "other", label: "Other" },
];

const statusIcon = (status) => {
  if (status === "signed") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === "declined") return <X className="w-4 h-4 text-red-400" />;
  return <Clock className="w-4 h-4 text-amber-400" />;
};

export default function SignatureManager({ formDocId, formName, transactionAddress, fieldValues }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSignPad, setShowSignPad] = useState(false);
  const [inAppSigner, setInAppSigner] = useState({ name: "", role: "buyer" });
  const [newRequest, setNewRequest] = useState({ name: "", email: "", role: "buyer" });

  const { data: requests = [] } = useQuery({
    queryKey: ["sig-requests", formDocId],
    queryFn: () => base44.entities.SignatureRequest.filter({ form_doc_id: formDocId }),
    enabled: !!formDocId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SignatureRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sig-requests", formDocId] });
      setShowAddDialog(false);
      setNewRequest({ name: "", email: "", role: "buyer" });
    },
  });

  const signMutation = useMutation({
    mutationFn: ({ id, signature_data }) =>
      base44.entities.SignatureRequest.update(id, {
        signature_data,
        status: "signed",
        signed_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sig-requests", formDocId] });
      setShowSignPad(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SignatureRequest.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sig-requests", formDocId] }),
  });

  const generateToken = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

  const handleSendRequest = () => {
    if (!newRequest.name || !newRequest.email) return;
    createMutation.mutate({
      form_doc_id: formDocId,
      form_name: formName,
      transaction_address: transactionAddress,
      signer_name: newRequest.name,
      signer_email: newRequest.email,
      signer_role: newRequest.role,
      status: "pending",
      token: generateToken(),
      field_snapshot: fieldValues,
    });
  };

  const handleInAppSign = () => {
    if (!inAppSigner.name) return;
    setShowSignPad(true);
  };

  const handleSignApplied = (sigDataURL) => {
    // For in-app signing, create + immediately sign a request record
    createMutation.mutate({
      form_doc_id: formDocId,
      form_name: formName,
      transaction_address: transactionAddress,
      signer_name: inAppSigner.name,
      signer_role: inAppSigner.role,
      status: "signed",
      token: generateToken(),
      signature_data: sigDataURL,
      signed_at: new Date().toISOString(),
      field_snapshot: fieldValues,
    });
    setShowSignPad(false);
    setInAppSigner({ name: "", role: "buyer" });
  };

  const signUrl = (token) => `${window.location.origin}/Sign?token=${token}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: "#1e3a5f" }}>
        <h3 className="text-sm font-semibold text-blue-100 uppercase tracking-wider flex items-center gap-2">
          <PenLine className="w-4 h-4" /> Signatures
        </h3>
        <Button size="sm" variant="ghost" className="text-yellow-300 hover:text-yellow-200 hover:bg-white/10 gap-1.5 text-xs"
          onClick={() => setShowAddDialog(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Signer
        </Button>
      </div>

      {/* In-App Signing */}
      <div className="p-5 border-b border-slate-50">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Sign Now (In-App)</p>
        {showSignPad ? (
          <SignaturePad
            signerName={inAppSigner.name}
            onSave={handleSignApplied}
            onCancel={() => setShowSignPad(false)}
          />
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Signer full name"
              value={inAppSigner.name}
              onChange={(e) => setInAppSigner((p) => ({ ...p, name: e.target.value }))}
              className="h-9 flex-1"
            />
            <Select value={inAppSigner.role} onValueChange={(v) => setInAppSigner((p) => ({ ...p, role: v }))}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-1.5"
              onClick={handleInAppSign} disabled={!inAppSigner.name || !formDocId}>
              <PenLine className="w-3.5 h-3.5" /> Sign
            </Button>
          </div>
        )}
        {!formDocId && <p className="text-[11px] text-amber-500 mt-2">Save the form first to enable signatures.</p>}
      </div>

      {/* Signature Requests List */}
      {requests.length > 0 && (
        <div className="p-5 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Signature Requests</p>
          {requests.map((req) => (
            <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              {statusIcon(req.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{req.signer_name}</p>
                <p className="text-xs text-slate-400">
                  {ROLES.find((r) => r.value === req.signer_role)?.label}
                  {req.signer_email ? ` · ${req.signer_email}` : ""}
                  {req.status === "signed" && req.signed_at ? ` · Signed ${new Date(req.signed_at).toLocaleDateString()}` : ""}
                </p>
              </div>
              {req.status === "signed" && req.signature_data && (
                <img src={req.signature_data} alt="sig" className="h-8 max-w-[100px] object-contain border border-slate-200 rounded bg-white p-0.5" />
              )}
              {req.status === "pending" && req.token && (
                <a href={signUrl(req.token)} target="_blank" rel="noreferrer"
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors" title="Open signing link">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button onClick={() => deleteMutation.mutate(req.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Send Request Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Signature Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Signer Name</Label>
              <Input value={newRequest.name} onChange={(e) => setNewRequest((p) => ({ ...p, name: e.target.value }))} placeholder="Jane Smith" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Signer Email</Label>
              <Input type="email" value={newRequest.email} onChange={(e) => setNewRequest((p) => ({ ...p, email: e.target.value }))} placeholder="jane@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Role</Label>
              <Select value={newRequest.role} onValueChange={(v) => setNewRequest((p) => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSendRequest}
                disabled={!newRequest.name || !newRequest.email || createMutation.isPending || !formDocId}
                className="bg-[#0a1628] text-white hover:bg-[#1e3a5f] gap-1.5">
                <Send className="w-3.5 h-3.5" /> Generate Link
              </Button>
            </div>
            {!formDocId && <p className="text-[11px] text-amber-500">Save the form first to send signature requests.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}