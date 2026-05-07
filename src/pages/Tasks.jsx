import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import TaskCard from "@/components/tasks/TaskCard";
import TaskFormModal from "@/components/tasks/TaskFormModal";
import TransactionModal from "../components/transactions/TransactionModal";

const COLUMNS = [
  { key: "todo", label: "To Do", color: "bg-slate-100 text-slate-600" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { key: "review", label: "Review", color: "bg-yellow-100 text-yellow-700" },
  { key: "done", label: "Done", color: "bg-green-100 text-green-700" },
];

export default function Tasks() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [editingTx, setEditingTx] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", currentUser?.email, currentUser?.role],
    queryFn: () =>
      currentUser?.role === "admin"
        ? base44.entities.Task.list("-created_date", 200)
        : base44.entities.Task.filter({ created_by: currentUser.email }, "-created_date", 200),
    enabled: !!currentUser,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", currentUser?.email, currentUser?.role],
    queryFn: () =>
      currentUser?.role === "admin"
        ? base44.entities.Transaction.list("-updated_date", 100)
        : base44.entities.Transaction.filter({ created_by: currentUser.email }, "-updated_date", 100),
    enabled: !!currentUser,
  });

  const saveTxMutation = useMutation({
    mutationFn: ({ data, id }) =>
      id ? base44.entities.Transaction.update(id, data) : base44.entities.Transaction.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const handleSave = async (form) => {
    if (editingTask) {
      await updateMutation.mutateAsync({ id: editingTask.id, data: form });
    } else {
      await createMutation.mutateAsync(form);
    }
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleEdit = (task) => { setEditingTask(task); setModalOpen(true); };
  const handleEditTx = (task) => {
    const tx = transactions.find((t) => t.id === task.transaction_id);
    if (tx) setEditingTx(tx);
  };
  const handleDelete = (task) => { if (confirm("Delete this task?")) deleteMutation.mutate(task.id); };

  // Drag and drop
  const handleDragStart = (task) => setDraggedTask(task);
  const handleDrop = (colKey) => {
    if (draggedTask && draggedTask.status !== colKey) {
      updateMutation.mutate({ id: draggedTask.id, data: { ...draggedTask, status: colKey } });
    }
    setDraggedTask(null);
  };

  const tasksByCol = (colKey) => tasks.filter((t) => t.status === colKey);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col items-start">
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500 mt-1 mb-2">Drag cards between columns to update status.</p>
          <Button
            onClick={() => { setEditingTask(null); setModalOpen(true); }}
            className="bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] gap-2"
          >
            <Plus className="w-4 h-4" /> New Task
          </Button>
        </div>
        <img
          src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
          alt="DealMagic"
          className="h-40 w-auto object-contain ml-auto"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.key)}
            className="rounded-2xl bg-slate-50 border border-slate-100 p-4 min-h-[200px]"
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${col.color}`}>{col.label}</span>
                <span className="text-xs text-slate-400">{tasksByCol(col.key).length}</span>
              </div>
              <button
                onClick={() => { setEditingTask(null); setModalOpen(true); }}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                title={`Add to ${col.label}`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {tasksByCol(col.key).map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <TaskCard task={task} onEdit={handleEdit} onDelete={handleDelete} onEditTx={handleEditTx} />
                </div>
              ))}
              {tasksByCol(col.key).length === 0 && (
                <div className="text-center py-8 text-xs text-slate-300">Drop tasks here</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <TransactionModal
        open={!!editingTx}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        onSave={(data, id) => saveTxMutation.mutateAsync({ data, id: id || editingTx?.id })}
      />
      <TaskFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTask(null); }}
        onSave={handleSave}
        task={editingTask}
        transactions={transactions}
      />
    </div>
  );
}