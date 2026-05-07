import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Check, Mail, Send, User, FileText } from "lucide-react";

const ROLE_BADGE = {
  buyer: "bg-blue-50 text-blue-700",
  seller: "bg-emerald-50 text-emerald-700",
  lender: "bg-purple-50 text-purple-700",
  title: "bg-amber-50 text-amber-700",
  agent: "bg-slate-100 text-slate-700",
  other: "bg-slate-50 text-slate-500",
};

const SIGNER_ROLE_MAP = {
  buyer: "buyer",
  seller: "seller",
  agent: "buyer_agent",
  other: "other",
  lender: "other",
  title: "other",
};

export default function BuildOfferModal({ open, onClose, forms, loanType, transactionAddress }) {
  const qc = useQueryClient();
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("full_name", 200),
  });

  const toggleContact = (id) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!selectedContacts.length) return;
    setSending(true);

    const chosen = contacts.filter((c) => selectedContacts.includes(c.id));

    const requests = [];
    for (const contact of chosen) {
      for (const form of forms) {
        requests.push(
          base44.entities.SignatureRequest.create({
            form_doc_id: form.id,
            form_name: form.name,
            transaction_address: transactionAddress || "",
            signer_name: contact.full_name,
            signer_email: contact.email || "",
            signer_role: SIGNER_ROLE_MAP[contact.role] || "other",
            status: "pending",
            token: Math.random().toString(36).slice(2) + Date.now().toString(36),
          })
        );
      }
    }

    await Promise.all(requests);
    qc.invalidateQueries({ queryKey: ["signature_requests"] });
    setSending(false);
    setSent(true);
  };

  const handleClose = () => {
    setSent(false);
    setSelectedContacts([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-600" />
            Build Offer — Send for eSignature
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
              <Check className="w-7 h-7 text-emerald-500" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">Signature Requests Sent!</p>
              <p className="text-sm text-slate-500 mt-1">
                {selectedContacts.length} signer{selectedContacts.length !== 1 ? "s" : ""} × {forms.length} form{forms.length !== 1 ? "s" : ""} = {selectedContacts.length * forms.length} request{selectedContacts.length * forms.length !== 1 ? "s" : ""} created.
              </p>
            </div>
            <Button onClick={handleClose} className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600]">Done</Button>
          </div>
        ) : (
          <div className="space-y-5 mt-2">
            {/* Forms summary */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Package — {forms.length} Form{forms.length !== 1 ? "s" : ""}
                {loanType && <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 normal-case font-semibold">{loanType}</span>}
              </p>
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 max-h-32 overflow-y-auto">
                {forms.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 text-xs text-slate-600">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium">{f.name}</span>
                    <span className="text-slate-400">· {f.code}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact selector */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Select Signers
              </p>
              {contacts.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No contacts found. Add contacts first.</p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {contacts.map((c) => {
                    const selected = selectedContacts.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleContact(c.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                          selected
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          selected ? "border-blue-500 bg-blue-500" : "border-slate-300"
                        }`}>
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">
                          {c.full_name?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{c.full_name}</p>
                          {c.email && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3" /> {c.email}
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full shrink-0 ${ROLE_BADGE[c.role] || ROLE_BADGE.other}`}>
                          {c.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                {selectedContacts.length} signer{selectedContacts.length !== 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                <Button
                  onClick={handleSend}
                  disabled={!selectedContacts.length || sending}
                  className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2"
                >
                  <Send className="w-4 h-4" />
                  {sending ? "Sending..." : "Send for eSignature"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}