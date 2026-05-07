import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, ExternalLink, Trash2, Search, ChevronDown } from "lucide-react";
import { format } from "date-fns";

export default function ClientDocuments({ contacts = [] }) {
  const [selectedContactId, setSelectedContactId] = useState("");
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: allDocs = [], isLoading, refetch } = useQuery({
    queryKey: ["client-documents", selectedContactId, currentUser?.email],
    queryFn: () => {
      const userFilter = currentUser?.role !== "admin" ? { generated_by: currentUser.email } : {};
      const filter = selectedContactId ? { ...userFilter, contact_id: selectedContactId } : userFilter;
      return Object.keys(filter).length > 0
        ? base44.entities.ClientDocument.filter(filter, "-created_date", 100)
        : base44.entities.ClientDocument.list("-created_date", 100);
    },
    enabled: !!currentUser,
  });

  const filtered = allDocs.filter((d) =>
    !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.contact_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (doc) => {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    await base44.entities.ClientDocument.delete(doc.id);
    refetch();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">All BBSA PDFs automatically saved here when generated with a selected client.</p>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white"
          />
        </div>
        <div className="relative min-w-[220px]">
          <select
            value={selectedContactId}
            onChange={(e) => setSelectedContactId(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-xl pl-3 pr-8 py-2 appearance-none bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 text-slate-700"
          >
            <option value="">— All clients —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
          <FileText className="w-10 h-10 mb-3 opacity-30" />
          <p className="font-medium">No documents yet</p>
          <p className="text-sm mt-1">Generated PDFs will appear here once you export with a selected client.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
          {filtered.map((doc) => (
            <div key={doc.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors group">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                <p className="text-xs text-slate-400">
                  {doc.contact_name}
                  {doc.created_date && <> · {format(new Date(doc.created_date), "MMM d, yyyy h:mm a")}</>}
                  {doc.generated_by && <> · {doc.generated_by}</>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium px-3 py-1.5 rounded-lg border border-violet-200 hover:bg-violet-50 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open
                </a>
                <button
                  onClick={() => handleDelete(doc)}
                  className="p-1.5 rounded-lg text-slate-900 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}