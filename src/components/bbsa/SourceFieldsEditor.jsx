import React, { useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Editable row for a single source option
function OptionRow({ option, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [labelDraft, setLabelDraft] = useState(option.label);
  const [valueDraft, setValueDraft] = useState(option.value);

  const commit = () => {
    if (!labelDraft.trim()) return;
    onUpdate(option.value, { label: labelDraft.trim(), value: valueDraft.trim() || option.value });
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-100 group text-sm">
      {editing ? (
        <>
          <input
            autoFocus
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
            placeholder="Display label"
            className="flex-1 border border-violet-300 rounded-lg px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
          <input
            value={valueDraft}
            onChange={(e) => setValueDraft(e.target.value)}
            placeholder="Key (e.g. buyer_name)"
            className="w-44 border border-slate-200 rounded-lg px-2 py-0.5 text-xs text-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
          <button onClick={commit} className="text-emerald-500 hover:text-emerald-700 shrink-0"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setEditing(false)} className="text-slate-300 hover:text-slate-500 shrink-0"><X className="w-3.5 h-3.5" /></button>
        </>
      ) : (
        <>
          <span className="flex-1 font-medium text-slate-700 truncate">{option.label}</span>
          <span className="text-xs text-slate-400 font-mono w-44 truncate shrink-0">{option.value}</span>
          <button onClick={() => { setLabelDraft(option.label); setValueDraft(option.value); setEditing(true); }} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-violet-500 shrink-0 transition-opacity">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(option.value)} className="opacity-0 group-hover:opacity-100 text-slate-200 hover:text-red-400 shrink-0 transition-opacity">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

export default function SourceFieldsEditor({ sourceOptions, onChangeSourceOptions }) {
  const [newGroup, setNewGroup] = useState("");
  const [newLabel, setNewLabel] = useState({});
  const [newValue, setNewValue] = useState({});

  const addOption = (group) => {
    const label = (newLabel[group] || "").trim();
    const value = (newValue[group] || "").trim().replace(/\s+/g, "_").toLowerCase();
    if (!label || !value) return;
    onChangeSourceOptions(sourceOptions.map((g) =>
      g.group === group
        ? { ...g, options: [...g.options, { label, value }] }
        : g
    ));
    setNewLabel((p) => ({ ...p, [group]: "" }));
    setNewValue((p) => ({ ...p, [group]: "" }));
  };

  const updateOption = (group, oldValue, changes) => {
    onChangeSourceOptions(sourceOptions.map((g) =>
      g.group === group
        ? { ...g, options: g.options.map((o) => o.value === oldValue ? { ...o, ...changes } : o) }
        : g
    ));
  };

  const deleteOption = (group, value) => {
    onChangeSourceOptions(sourceOptions.map((g) =>
      g.group === group
        ? { ...g, options: g.options.filter((o) => o.value !== value) }
        : g
    ));
  };

  const addGroup = () => {
    const name = newGroup.trim();
    if (!name || sourceOptions.find((g) => g.group === name)) return;
    onChangeSourceOptions([...sourceOptions, { group: name, options: [] }]);
    setNewGroup("");
  };

  const deleteGroup = (group) => {
    onChangeSourceOptions(sourceOptions.filter((g) => g.group !== group));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Add, edit, or remove the source field options available in the auto-populate dropdown.</p>
      </div>

      {sourceOptions.map((g) => (
        <div key={g.group} className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-2">
          {/* Group header */}
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{g.group}</p>
            <button onClick={() => deleteGroup(g.group)} className="text-[10px] text-slate-300 hover:text-red-400 transition-colors flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Remove group
            </button>
          </div>

          {/* Options */}
          <div className="space-y-1">
            {g.options.length === 0 && (
              <p className="text-xs text-slate-300 italic px-3 py-1">No options — add one below.</p>
            )}
            {g.options.map((o) => (
              <OptionRow
                key={o.value}
                option={o}
                onUpdate={(oldVal, changes) => updateOption(g.group, oldVal, changes)}
                onDelete={(val) => deleteOption(g.group, val)}
              />
            ))}
          </div>

          {/* Add option row */}
          <div className="flex items-center gap-2 pt-1">
            <input
              value={newLabel[g.group] || ""}
              onChange={(e) => setNewLabel((p) => ({ ...p, [g.group]: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addOption(g.group)}
              placeholder="Label (e.g. Buyer Name)"
              className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white placeholder:text-slate-300"
            />
            <input
              value={newValue[g.group] || ""}
              onChange={(e) => setNewValue((p) => ({ ...p, [g.group]: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addOption(g.group)}
              placeholder="Key (e.g. buyer_name)"
              className="w-44 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white placeholder:text-slate-300"
            />
            <button
              onClick={() => addOption(g.group)}
              disabled={!(newLabel[g.group]?.trim()) || !(newValue[g.group]?.trim())}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 font-medium shrink-0"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
        </div>
      ))}

      {/* Add new group */}
      <div className="flex items-center gap-2">
        <input
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addGroup()}
          placeholder="New group name (e.g. Custom)…"
          className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white"
        />
        <Button onClick={addGroup} disabled={!newGroup.trim()} variant="outline" className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Group
        </Button>
      </div>
    </div>
  );
}