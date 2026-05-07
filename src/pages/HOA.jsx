import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FolderOpen, Folder, Upload, FileText, Trash2, Pencil, X, Check } from "lucide-react";

export default function HOA() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: hoas = [], isLoading } = useQuery({
    queryKey: ["hoas"],
    queryFn: () => base44.entities.HOA.list("name", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HOA.create(data),
    onSuccess: (created) => { qc.invalidateQueries({ queryKey: ["hoas"] }); setSelectedId(created.id); setAddingFolder(false); setNewFolderName(""); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HOA.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hoas"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HOA.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hoas"] }); setSelectedId(null); },
  });

  const selected = hoas.find((h) => h.id === selectedId);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createMutation.mutate({ name: newFolderName.trim(), ccr_files: [] });
  };

  const handleRename = (hoa) => {
    if (!editName.trim()) return;
    updateMutation.mutate({ id: hoa.id, data: { ...hoa, name: editName.trim() } });
    setEditingId(null);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !selected) return;
    setUploading(true);
    const uploaded = await Promise.all(
      files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return { file_name: file.name, file_url, uploaded_at: new Date().toISOString() };
      })
    );
    const updatedFiles = [...(selected.ccr_files || []), ...uploaded];
    await updateMutation.mutateAsync({ id: selected.id, data: { ...selected, ccr_files: updatedFiles } });
    setUploading(false);
    e.target.value = "";
  };

  const handleDeleteFile = (fileUrl) => {
    if (!selected) return;
    const updatedFiles = (selected.ccr_files || []).filter((f) => f.file_url !== fileUrl);
    updateMutation.mutate({ id: selected.id, data: { ...selected, ccr_files: updatedFiles } });
  };

  return (
    <div className="flex gap-0 h-[calc(100vh-120px)] bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-slate-100 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">HOA Folders</h2>
          <button
            onClick={() => setAddingFolder(true)}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
            title="New HOA folder"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {addingFolder && (
          <div className="p-3 border-b border-slate-100 bg-white">
            <Input
              autoFocus
              placeholder="HOA / subdivision name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") setAddingFolder(false); }}
              className="h-8 text-sm mb-2"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateFolder} className="flex-1 h-7 text-xs bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600]">Create</Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingFolder(false)} className="h-7 text-xs">Cancel</Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <p className="text-xs text-slate-400 text-center py-8">Loading...</p>
          ) : hoas.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No HOA folders yet</p>
          ) : (
            hoas.map((hoa) => (
              <div
                key={hoa.id}
                onClick={() => setSelectedId(hoa.id)}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors mb-0.5 ${selectedId === hoa.id ? "bg-[#FFFF00]/20 border border-[#FFFF00]/50" : "hover:bg-slate-100"}`}
              >
                {selectedId === hoa.id
                  ? <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                  : <Folder className="w-4 h-4 text-slate-400 shrink-0" />
                }
                {editingId === hoa.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRename(hoa); if (e.key === "Escape") setEditingId(null); }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-sm bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none"
                  />
                ) : (
                  <span className="flex-1 text-sm text-slate-700 truncate">{hoa.name}</span>
                )}
                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                  {editingId === hoa.id ? (
                    <button onClick={(e) => { e.stopPropagation(); handleRename(hoa); }} className="p-0.5 text-emerald-500"><Check className="w-3 h-3" /></button>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); setEditingId(hoa.id); setEditName(hoa.name); }} className="p-0.5 text-slate-400 hover:text-slate-600"><Pencil className="w-3 h-3" /></button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${hoa.name}"?`)) deleteMutation.mutate(hoa.id); }} className="p-0.5 text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{(hoa.ccr_files || []).length}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <FolderOpen className="w-12 h-12 text-slate-200" />
            <p className="text-sm">Select an HOA folder or create a new one</p>
            <Button onClick={() => setAddingFolder(true)} variant="outline" size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New HOA Folder
            </Button>
          </div>
        ) : (
          <>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selected.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{(selected.ccr_files || []).length} document{(selected.ccr_files || []).length !== 1 ? "s" : ""}</p>
              </div>
              <label className="cursor-pointer">
                <input type="file" accept=".pdf,.doc,.docx,.txt" multiple className="hidden" onChange={handleFileUpload} />
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${uploading ? "bg-slate-100 text-slate-400" : "bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600]"}`}>
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload CCR"}
                </div>
              </label>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {(selected.ccr_files || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
                  <FileText className="w-10 h-10 text-slate-200" />
                  <p className="text-sm">No CCR documents yet — upload one above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(selected.ccr_files || []).map((file) => (
                    <div key={file.file_url} className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white transition-colors group">
                      <FileText className="w-5 h-5 text-red-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{file.file_name}</p>
                        {file.uploaded_at && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(file.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          View
                        </a>
                        <button
                          onClick={() => handleDeleteFile(file.file_url)}
                          className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}