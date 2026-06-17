import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  Copy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Task, Plan } from "../types";

interface TaskModelItem {
  id?: number;
  modelId?: number;
  name: string;
  durationDays: number;
  weight: number;
}

interface TaskModel {
  id: number;
  name: string;
  createdAt: string;
  createdBy: string;
  items: TaskModelItem[];
}

interface TaskModelManagerProps {
  tasks: Task[];
  plans: Plan[];
  showToast: (title: string, message: string, type: "success" | "error" | "warning" | "info") => void;
  reloadTasks: () => Promise<void>;
}

export const TaskModelManager: React.FC<TaskModelManagerProps> = ({
  tasks,
  plans,
  showToast,
  reloadTasks
}) => {
  const [models, setModels] = useState<TaskModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<TaskModel | null>(null);
  
  // Loading state
  const [loading, setLoading] = useState(false);

  // Form states for Create/Edit Template
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingModelId, setEditingModelId] = useState<number | null>(null);
  const [modelName, setModelName] = useState("");
  const [modelItems, setModelItems] = useState<TaskModelItem[]>([]);

  // Item form inside template form
  const [newItemName, setNewItemName] = useState("");
  const [newItemDuration, setNewItemDuration] = useState<number | "">(5);
  const [newItemWeight, setNewItemWeight] = useState<number | "">(1);

  // Inline edit state for existing item list
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editingItemForm, setEditingItemForm] = useState<{
    name: string;
    durationDays: number | "";
    weight: number | "";
  }>({ name: "", durationDays: 5, weight: 1 });

  // Helper date utility
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "--";
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleDateString("pt-BR") +
        " " +
        d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      );
    } catch {
      return isoString;
    }
  };

  // Fetch templates (models)
  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/task-models?t=${Date.now()}`);
      let text = "";
      try {
        text = await res.text();
      } catch (e: any) {
        throw new Error(`Failed to read response: ${e.message}`);
      }

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${text.substring(0, 100)}`);
      }

      let resData;
      try {
        resData = JSON.parse(text);
      } catch {
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }

      if (resData && resData.success && Array.isArray(resData.data)) {
        setModels(resData.data);
        if (selectedModel) {
          const updatedSelected = resData.data.find((m: any) => m.id === selectedModel.id);
          setSelectedModel(updatedSelected || null);
        }
      } else {
        showToast("Erro", "O servidor não retornou o formato esperado de dados.", "error");
      }
    } catch (err: any) {
      console.error("DEBUG fetchModels error:", err);
      showToast("Erro", `Comunicação falhou: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const openCreateModal = () => {
    setFormMode("create");
    setEditingModelId(null);
    setModelName("");
    setModelItems([
      { name: "Tarefa Inicial Exemplo", durationDays: 5, weight: 1 }
    ]);
    setEditingItemIdx(null);
    setIsFormOpen(true);
  };

  const openEditModal = (model: TaskModel) => {
    setFormMode("edit");
    setEditingModelId(model.id);
    setModelName(model.name);
    setModelItems([...model.items]);
    setEditingItemIdx(null);
    setIsFormOpen(true);
  };

  const addModelItem = () => {
    if (!newItemName.trim()) {
      showToast("Validação", "Digite o nome da tarefa modelo.", "warning");
      return;
    }
    
    const duration = newItemDuration === "" ? NaN : Number(newItemDuration);
    const weight = newItemWeight === "" ? NaN : Number(newItemWeight);

    if (isNaN(duration) || duration <= 0) {
      showToast("Validação", "A duração deve ser superior a 0 dias.", "warning");
      return;
    }
    if (isNaN(weight) || weight <= 0) {
      showToast("Validação", "O peso deve ser superior a 0.", "warning");
      return;
    }

    const newItem: TaskModelItem = {
      name: newItemName.trim(),
      durationDays: duration,
      weight: weight
    };
    setModelItems([...modelItems, newItem]);
    setNewItemName("");
    setNewItemDuration(5);
    setNewItemWeight(1);
  };

  const removeModelItem = (index: number) => {
    const updated = modelItems.filter((_, i) => i !== index);
    setModelItems(updated);
    if (editingItemIdx === index) {
      setEditingItemIdx(null);
    } else if (editingItemIdx !== null && editingItemIdx > index) {
      setEditingItemIdx(editingItemIdx - 1);
    }
  };

  // Inline editing handlers
  const startEditModelItem = (idx: number, item: TaskModelItem) => {
    setEditingItemIdx(idx);
    setEditingItemForm({
      name: item.name,
      durationDays: item.durationDays,
      weight: item.weight
    });
  };

  const cancelEditModelItem = () => {
    setEditingItemIdx(null);
  };

  const saveEditedModelItem = (idx: number) => {
    if (!editingItemForm.name.trim()) {
      showToast("Validação", "O nome da tarefa modelo não pode ser vazio.", "warning");
      return;
    }

    const duration = editingItemForm.durationDays === "" ? NaN : Number(editingItemForm.durationDays);
    const weight = editingItemForm.weight === "" ? NaN : Number(editingItemForm.weight);

    if (isNaN(duration) || duration <= 0) {
      showToast("Validação", "A duração deve ser superior a 0 dias.", "warning");
      return;
    }
    if (isNaN(weight) || weight <= 0) {
      showToast("Validação", "O peso deve ser superior a 0.", "warning");
      return;
    }

    const updated = [...modelItems];
    updated[idx] = {
      ...updated[idx],
      name: editingItemForm.name.trim(),
      durationDays: duration,
      weight: weight
    };
    setModelItems(updated);
    setEditingItemIdx(null);
  };

  const saveModel = async () => {
    if (!modelName.trim()) {
      showToast("Validação", "O nome do modelo de processos é obrigatório.", "warning");
      return;
    }
    if (modelItems.length === 0) {
      showToast("Validação", "Adicione pelo menos uma tarefa modelo a este modelo.", "warning");
      return;
    }

    try {
      const payload = {
        name: modelName.trim(),
        items: modelItems,
        createdBy: "Administrador"
      };

      const url = formMode === "create" ? "/api/task-models" : `/api/task-models/${editingModelId}`;
      const method = formMode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();

      if (resData.success) {
        showToast("Sucesso", formMode === "create" ? "Modelo criado com sucesso!" : "Modelo atualizado com sucesso!", "success");
        setIsFormOpen(false);
        fetchModels();
      } else {
        showToast("Erro", resData.error || "Erro ao salvar modelo.", "error");
      }
    } catch {
      showToast("Erro", "Falha de comunicação ao salvar modelo.", "error");
    }
  };

  const deleteModel = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente este modelo de processo e todas as suas tarefas modelo associadas?")) {
      return;
    }

    try {
      const res = await fetch(`/api/task-models/${id}`, { method: "DELETE" });
      const resData = await res.json();
      if (resData.success) {
        showToast("Sucesso", "Modelo excluído com sucesso.", "success");
        if (selectedModel?.id === id) {
          setSelectedModel(null);
        }
        fetchModels();
      } else {
        showToast("Erro", resData.error || "Erro ao excluir modelo.", "error");
      }
    } catch {
      showToast("Erro", "Falha ao se comunicar com o sistema.", "error");
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-left flex flex-col relative h-[80vh]">
      {/* Header following Cadastro de Categorias layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 flex-shrink-0">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">
            Cadastro de Modelos de Tarefas
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gerencie os modelos de processos e etapas para automatizar a criação estruturada de atividades.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          <Plus size={16} /> NOVO MODELO
        </button>
      </div>

      {/* Main content table similar to Cadastro de Categorias */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto min-h-[300px]">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <span className="animate-spin inline-block mr-2 text-indigo-600">⌛</span> Carregando modelos...
              </div>
            ) : models.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm font-medium">
                Nenhum modelo de tarefa de processo cadastrado para a ADASA.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-widest font-black">
                    <th className="px-5 py-4">Modelo</th>
                    <th className="px-5 py-4 w-32 text-center">Etapas</th>
                    <th className="px-5 py-4 w-32 text-center">Duração Total</th>
                    <th className="px-5 py-4 w-32 text-center">Soma dos Pesos</th>
                    <th className="px-5 py-4 w-52 hidden sm:table-cell">Histórico</th>
                    <th className="px-5 py-4 w-36 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {[...models].sort((a, b) => a.name.localeCompare(b.name)).map(m => {
                    const totalDuration = m.items?.reduce((acc, it) => acc + (it.durationDays || 0), 0) || 0;
                    const totalWeight = m.items?.reduce((acc, it) => acc + (Number(it.weight) || 0), 0) || 0;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-5 py-3 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0 border border-indigo-100 group-hover:bg-indigo-100 group-hover:border-indigo-200 transition-colors">
                              <Copy size={13} />
                            </div>
                            <span className="font-extrabold text-slate-700">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 align-middle text-center">
                          <span className="px-2.5 py-1 text-xs font-black bg-slate-100 text-slate-600 rounded-md">
                            {m.items?.length || 0} etapas
                          </span>
                        </td>
                        <td className="px-5 py-3 align-middle text-center">
                          <span className="px-2.5 py-1 text-xs font-black bg-teal-50 text-teal-700 rounded-md">
                            {totalDuration} dias
                          </span>
                        </td>
                        <td className="px-5 py-3 align-middle text-center">
                          <span className="px-2.5 py-1 text-xs font-black bg-amber-50 text-amber-700 rounded-md">
                            {totalWeight.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-5 py-3 align-middle hidden sm:table-cell">
                          <div className="flex flex-col gap-1 justify-center">
                            <div className="text-[10px] text-slate-500 font-semibold">
                              <span className="flex items-center gap-1 text-emerald-600"><Plus size={10} /> Criado</span>
                              <span className="text-[10px] text-slate-400 font-medium block">
                                {m.createdAt ? formatDateTime(m.createdAt) : "--"} por {m.createdBy || 'Sistema'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 align-middle text-right">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => openEditModal(m)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => deleteModel(m.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Model Edit & Create Dialog (Modal) */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl relative z-10 flex flex-col overflow-hidden max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/20 flex-shrink-0">
                <div>
                  <h4 className="font-black text-slate-800 text-xl tracking-tight">
                    {formMode === "create" ? "Criar Novo Modelo de Processo" : "Editar Modelo de Processo"}
                  </h4>
                  <p className="text-slate-400 text-xs font-semibold mt-0.5">Preencha o nome e organize as etapas do processo.</p>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 md:p-8 overflow-y-auto space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-widest block">Nome do Modelo de Processo</label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="Ex: SEI - Processo de Elaboração de Resolução Reguladora"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-sm font-semibold text-slate-800 transition-all placeholder:text-slate-300"
                  />
                </div>

                {/* Items manager component */}
                <div className="space-y-4">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-widest block">Definir Tarefas Modelo</span>
                  
                  {/* Add form row - MOVED HERE */}
                  <div className="bg-indigo-50/20 border border-indigo-100 rounded-2xl p-4 gap-4 grid grid-cols-1 md:grid-cols-12 items-end">
                    <div className="md:col-span-6 space-y-1.5 text-left">
                      <label className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Nome da Tarefa Modelo</label>
                      <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Ex: Elaboração de NT e minuta preliminar"
                        className="w-full px-3.5 py-2 border border-slate-200 outline-none focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-800 transition-all placeholder:text-slate-300"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addModelItem();
                          }
                        }}
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1.5 text-left">
                      <label className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Duração (dias)</label>
                      <input
                        type="number"
                        min="1"
                        value={newItemDuration}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            setNewItemDuration("");
                          } else {
                            const parsed = parseInt(val, 10);
                            setNewItemDuration(isNaN(parsed) ? "" : parsed);
                          }
                        }}
                        className="w-full px-3.5 py-2 border border-slate-200 outline-none focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-800 transition-all"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1.5 text-left">
                      <label className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Peso</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={newItemWeight}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            setNewItemWeight("");
                          } else {
                            const parsed = parseFloat(val);
                            setNewItemWeight(isNaN(parsed) ? "" : parsed);
                          }
                        }}
                        className="w-full px-3.5 py-2 border border-slate-200 outline-none focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-800 transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addModelItem}
                      className="md:col-span-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0 hover:shadow shadow-sm font-extrabold text-xs"
                      title="Adicionar Etapa"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Inline list of items with EDITING capabilities - MOVED BELOW AND BG COLOR TO LIGHT GRAY */}
                  <div className="border border-slate-200 bg-slate-100/55 rounded-2xl p-4 space-y-2 max-h-[260px] overflow-y-auto">
                    {modelItems.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-4 font-bold">Nenhuma tarefa adicionada ainda. Adicione acima.</p>
                    ) : (
                      modelItems.map((item, idx) => (
                        editingItemIdx === idx ? (
                          <div key={idx} className="flex flex-col md:flex-row items-stretch md:items-center gap-2 p-3 bg-indigo-50/45 border-2 border-indigo-200 rounded-xl">
                            <span className="text-xs font-extrabold text-indigo-600 shrink-0 select-none md:w-6">#{idx + 1}</span>
                            <div className="grow flex flex-col md:flex-row gap-2">
                              <input
                                type="text"
                                value={editingItemForm.name}
                                onChange={(e) => setEditingItemForm({ ...editingItemForm, name: e.target.value })}
                                className="px-2.5 py-1.5 border border-slate-200 outline-none focus:border-indigo-500 rounded-lg text-xs font-semibold text-slate-800 bg-white grow"
                                placeholder="Nome da tarefa modelo"
                              />
                              <div className="flex gap-2 shrink-0">
                                <div className="flex items-center gap-1">
                                  <label className="text-[10px] text-slate-400 font-extrabold uppercase">Dias</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={editingItemForm.durationDays}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "") {
                                        setEditingItemForm({ ...editingItemForm, durationDays: "" });
                                      } else {
                                        const parsed = parseInt(val, 10);
                                        setEditingItemForm({ ...editingItemForm, durationDays: isNaN(parsed) ? "" : parsed });
                                      }
                                    }}
                                    className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-white"
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <label className="text-[10px] text-slate-400 font-extrabold uppercase">Peso</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.1"
                                    value={editingItemForm.weight}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "") {
                                        setEditingItemForm({ ...editingItemForm, weight: "" });
                                      } else {
                                        const parsed = parseFloat(val);
                                        setEditingItemForm({ ...editingItemForm, weight: isNaN(parsed) ? "" : parsed });
                                      }
                                    }}
                                    className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-white"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 justify-end shrink-0 pt-2 md:pt-0">
                              <button
                                type="button"
                                onClick={() => saveEditedModelItem(idx)}
                                className="p-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-all cursor-pointer"
                                title="Salvar alteração"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditModelItem}
                                className="p-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                                title="Cancelar"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-300 rounded-xl">
                            <div className="flex items-center gap-2 pr-1 min-w-0">
                              <span className="text-xs shrink-0 font-extrabold text-slate-500 w-6">#{idx + 1}</span>
                              <span className="text-xs font-bold text-slate-700 truncate block text-left" title={item.name}>{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs text-slate-500 font-semibold px-2 py-0.5 bg-slate-100 rounded-md">
                                {item.durationDays} dias / Peso {item.weight}
                              </span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => startEditModelItem(idx, item)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                  title="Editar etapa"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeModelItem(idx)}
                                  className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Excluir etapa"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveModel}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                >
                  Confirmar e Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
