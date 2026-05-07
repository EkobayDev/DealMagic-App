import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const BLANK = { title: "", description: "", status: "todo", priority: "medium", due_date: "", transaction_address: "" };

export default function TaskFormModal({ open, onClose, onSave, task, transactions }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(task ? { ...BLANK, ...task } : BLANK);
  }, [task, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Title *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Task title" className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Description</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional details..." className="resize-none h-20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Linked Transaction</Label>
              <Select value={form.transaction_address || "__none__"} onValueChange={(v) => {
                if (v === "__none__") { set("transaction_address", ""); return; }
                const tx = transactions.find((t) => t.id === v);
                set("transaction_address", tx?.property_address || "");
              }}>
                <SelectTrigger className="h-10"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {transactions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.property_address}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600]">
              {saving ? "Saving..." : "Save Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}