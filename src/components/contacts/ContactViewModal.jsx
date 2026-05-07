import React from "react";
import { X, User, Link2 } from "lucide-react";

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm text-slate-700">{value}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export default function ContactViewModal({ open, onClose, contact, txMap = {} }) {
  if (!open || !contact) return null;

  const fullAddress = [contact.address, contact.city, contact.state, contact.zip].filter(Boolean).join(", ");
  const brokerAddress = [contact.broker_address, contact.broker_city, contact.broker_state, contact.broker_zip].filter(Boolean).join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col" style={{ maxHeight: "85vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-800">{contact.full_name}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {/* Primary Contact */}
          <Section title="Contact #1">
            <Row label="Full Name" value={contact.full_name} />
            <Row label="Role" value={contact.role} />
            <Row label="Phone" value={contact.phone} />
            <Row label="Email" value={contact.email} />
            {fullAddress && <div className="col-span-2"><Row label="Address" value={fullAddress} /></div>}
          </Section>

          {/* Contact #2 */}
          {(contact.contact2_name || contact.contact2_phone || contact.contact2_email) && (
            <div className="border-t border-slate-100 pt-4">
              <Section title="Contact #2">
                <Row label="Full Name" value={contact.contact2_name} />
                <Row label="Relation" value={contact.contact2_relation} />
                <Row label="Phone" value={contact.contact2_phone} />
                <Row label="Email" value={contact.contact2_email} />
              </Section>
            </div>
          )}

          {/* Agent of Choice */}
          {(contact.agent_of_choice_name || contact.buyer_agent_name) && (
            <div className="border-t border-slate-100 pt-4">
              <Section title="Agent Info">
                <Row label="Agent of Choice" value={contact.agent_of_choice_name} />
                <Row label="License" value={contact.agent_of_choice_license} />
                <Row label="Buyer Agent Name" value={contact.buyer_agent_name} />
                <Row label="Brokerage" value={contact.buyer_agent_brokerage} />
                {brokerAddress && <div className="col-span-2"><Row label="Broker Address" value={brokerAddress} /></div>}
                <Row label="Broker License #" value={contact.broker_license_number} />
              </Section>
            </div>
          )}

          {/* Broker Supervisor */}
          {(contact.broker_supervisor || contact.broker_supervisor_email) && (
            <div className="border-t border-slate-100 pt-4">
              <Section title="Broker Supervisor">
                <Row label="Name" value={contact.broker_supervisor} />
                <Row label="Email" value={contact.broker_supervisor_email} />
                {contact.broker_supervisor_website && (
                  <div className="col-span-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Website</p>
                    <a href={contact.broker_supervisor_website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">{contact.broker_supervisor_website}</a>
                  </div>
                )}
              </Section>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Notes</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}

          {/* Linked Transactions */}
          {contact.transaction_ids?.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Linked Transactions
              </p>
              <div className="space-y-1">
                {contact.transaction_ids.map((id) => (
                  <p key={id} className="text-sm text-slate-600">{txMap[id] || id}</p>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}