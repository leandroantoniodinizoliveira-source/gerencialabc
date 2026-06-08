/**
 * @license
 * Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FolderKanban,
  ListTodo,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Edit3,
  Clock,
  User,
  Tag,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Circle,
  Info,
  X,
  FileText,
  Table,
  CalendarRange,
  LayoutGrid,
  Briefcase,
  GitCommit,
  Activity,
  AlignLeft,
  List,
  Flag,
  Link2,
  Users
} from "lucide-react";
import { Task, Plan, Area, Category, Responsible } from "../types";
import { cn } from "../lib/utils";
import { useAuth } from "../lib/auth";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid, LabelList, LineChart, Line } from "recharts";
 
interface PlanningTabProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  showToast: (title: string, message: string, type: "success" | "error" | "warning" | "info") => void;
  activeSubTab?: "tasks" | "dashboard" | "plans" | "areas" | "categories" | "responsibles";
  setConfirmState?: React.Dispatch<React.SetStateAction<{ title?: string; message: string; type?: "confirm" | "alert"; onConfirm?: () => void } | null>>;
}
 
const normalizeStatus = (status: string | undefined): "Não iniciada" | "Em andamento" | "Concluída" => {
  if (!status) return "Não iniciada";
  const s = status.toLowerCase().trim();
  if (s === "concluída" || s === "concluído" || s === "completed") return "Concluída";
  if (s === "em andamento" || s === "in_progress" || s === "in progress") return "Em andamento";
  return "Não iniciada";
};

const getDeadlineStatus = (endDate: string | null | undefined, status: string | undefined): "Atrasada" | "Crítica" | "No Prazo" => {
  const normStatus = normalizeStatus(status);
  if (normStatus === "Concluída") return "No Prazo";
  if (!endDate) return "No Prazo";
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let dEnd: Date;
    if (endDate.includes("-")) {
      const parts = endDate.split('T')[0].split('-');
      dEnd = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      dEnd = new Date(endDate);
    }
    
    if (isNaN(dEnd.getTime())) return "No Prazo";
    dEnd.setHours(0, 0, 0, 0);
    
    const diffTime = dEnd.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return "Atrasada";
    } else if (diffDays <= 7) {
      return "Crítica";
    } else {
      return "No Prazo";
    }
  } catch (e) {
    return "No Prazo";
  }
};

// Custom Tooltips for Charts
const CustomStatusTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 p-3.5 rounded-2xl shadow-2xl flex flex-col gap-2 min-w-[180px] z-50 animate-in fade-in zoom-in-95 duration-150">
        <p className="text-slate-100 font-black text-xs uppercase tracking-wide border-b border-slate-700/50 pb-2 mb-1 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }}></span>
          {data.name}
        </p>
        <div className="flex justify-between items-center gap-6">
          <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Quantidade</span>
          <span className="text-white font-black text-sm">{data.value}</span>
        </div>
        <div className="flex justify-between items-center gap-6">
          <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Percentual</span>
          <span className="text-slate-300 font-bold text-xs">{(data.percent * 100).toFixed(1).replace('.0', '')}%</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomAreaTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 p-3.5 rounded-2xl shadow-2xl flex flex-col gap-2 min-w-[200px] z-50 animate-in fade-in zoom-in-95 duration-150">
        <p className="text-slate-100 font-black text-xs uppercase tracking-wide border-b border-slate-700/50 pb-2 mb-1">{data.fullName}</p>
        
        <div className="flex justify-between items-center gap-6">
          <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Progresso Médio</span>
          <span className={cn(
            "font-black text-sm",
            data["Progresso Médio (%)"] === 100 ? "text-emerald-400" : data["Progresso Médio (%)"] >= 50 ? "text-blue-400" : "text-amber-400"
          )}>{data["Progresso Médio (%)"]}%</span>
        </div>
        
        <div className="flex justify-between items-center gap-6">
          <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Total de Tarefas</span>
          <span className="text-white font-black text-xs">{data["Total de Tarefas"]}</span>
        </div>
        
        <div className="flex justify-between items-center gap-6">
          <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Concluídas</span>
          <span className="text-emerald-500 font-black text-xs">{data["Concluídas"] || 0}</span>
        </div>
        
        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-700/50">
          <div 
            className={cn(
              "h-full rounded-full",
              data["Progresso Médio (%)"] === 100 ? "bg-emerald-500" : data["Progresso Médio (%)"] >= 50 ? "bg-blue-500" : data["Progresso Médio (%)"] > 0 ? "bg-slate-400" : "bg-slate-300"
            )}
            style={{ width: `${data["Progresso Médio (%)"]}%` }}
          />
        </div>
      </div>
    );
  }
  return null;
};

const CustomPriorityTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const colorMap: Record<string, string> = {
      "ALTA": "#ef4444",
      "MÉDIA": "#3b82f6",
      "BAIXA": "#10b981",
    };
    const percent = data["Total"] > 0 ? ((data["Quantidade"] / data["Total"]) * 100).toFixed(1).replace('.0', '') : "0";
    return (
      <div className="bg-slate-900 border border-slate-700 p-3.5 rounded-2xl shadow-2xl flex flex-col gap-2 min-w-[180px] z-50 animate-in fade-in zoom-in-95 duration-150">
        <p className="text-slate-100 font-black text-xs uppercase tracking-wide border-b border-slate-700/50 pb-2 mb-1 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorMap[data.priority] || "#64748b" }}></span>
          Prioridade {data.priority}
        </p>
        <div className="flex justify-between items-center gap-6">
          <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Quantidade</span>
          <span className="text-white font-black text-sm">{data["Quantidade"]}</span>
        </div>
        <div className="flex justify-between items-center gap-6">
          <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Percentual</span>
          <span className="text-slate-300 font-bold text-xs">{percent}%</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomAreaStatusTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = (data["Não iniciada"] || 0) + (data["Em andamento"] || 0) + (data["Concluídas"] || 0);
    return (
      <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xl flex flex-col gap-2 min-w-[200px] z-50">
        <p className="text-slate-800 font-black text-xs uppercase tracking-wide border-b border-slate-100 pb-2 mb-1">
          {label}
        </p>
        <div className="flex justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#94a3b8]"></span>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Não iniciada</span>
          </div>
          <span className="text-slate-700 font-black text-sm">{data["Não iniciada"] || 0}</span>
        </div>
        <div className="flex justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]"></span>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Em andamento</span>
          </div>
          <span className="text-slate-700 font-black text-sm">{data["Em andamento"] || 0}</span>
        </div>
        <div className="flex justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]"></span>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Concluídas</span>
          </div>
          <span className="text-slate-700 font-black text-sm">{data["Concluídas"] || 0}</span>
        </div>
        <div className="flex justify-between items-center gap-6 border-t border-slate-100 pt-2 mt-1">
          <span className="text-slate-800 text-[10px] font-black uppercase tracking-wider">Total</span>
          <span className="text-slate-900 font-black text-base">{total}</span>
        </div>
      </div>
    );
  }
  return null;
};

export function PlanningTab({ tasks, setTasks, showToast, activeSubTab = "tasks", setConfirmState = () => {} }: PlanningTabProps) {
  const { currentUser } = useAuth();
  // Navigation, search & filter state
  const [isDashboardFiltersExpanded, setIsDashboardFiltersExpanded] = useState(false);
  const [isTasksFiltersExpanded, setIsTasksFiltersExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [situationFilter, setSituationFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // New plan and area filters
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [selectedAreaIds, setSelectedAreaIds] = useState<number[]>([]);
  const [selectedResponsibleIds, setSelectedResponsibleIds] = useState<number[]>([]);

  // Period / cronograma filters for dashboard
  const [periodTypeFilter, setPeriodTypeFilter] = useState<"all" | "month" | "quarter" | "semester">("all");
  const [periodValueFilter, setPeriodValueFilter] = useState<string>("all");

  const isAnyFilterActive = useMemo(() => {
    return (
      statusFilter !== "all" ||
      situationFilter !== "all" ||
      priorityFilter !== "all" ||
      categoryFilter !== "all" ||
      searchTerm.trim() !== "" ||
      (planFilter !== "all" && planFilter !== "") ||
      selectedAreaIds.length > 0 ||
      selectedResponsibleIds.length > 0 ||
      periodTypeFilter !== "all"
    );
  }, [
    statusFilter,
    situationFilter,
    priorityFilter,
    categoryFilter,
    searchTerm,
    planFilter,
    selectedAreaIds,
    selectedResponsibleIds,
    periodTypeFilter
  ]);

  // Registry lists loaded from the server
  const [plans, setPlans] = useState<Plan[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);

  // Form state for registries
  const [regName, setRegName] = useState("");
  const [regAbbreviation, setRegAbbreviation] = useState("");
  const [regDesc, setRegDesc] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regRole, setRegRole] = useState("");
  const [regUpdatedBy, setRegUpdatedBy] = useState("");
  const [regPlanId, setRegPlanId] = useState<string>("");
  const [regAreaIds, setRegAreaIds] = useState<number[]>([]);
  const [editingRegId, setEditingRegId] = useState<number | null>(null);

  // UI tree expand/collapse state (keyed by task.id)
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});

  // Expanded state for grouped dashboard table
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedQuarterGroups, setExpandedQuarterGroups] = useState<Record<string, boolean>>({});
  const [expandedPlanQuarterAreaGroups, setExpandedPlanQuarterAreaGroups] = useState<Record<string, boolean>>({});
  const [collapsedAreas, setCollapsedAreas] = useState<Record<string, boolean>>({});
  const [areaTableSort, setAreaTableSort] = useState<{ field: string, dir: "asc" | "desc" } | null>({ field: "end", dir: "asc" });
  const [collapsedTableCategories, setCollapsedTableCategories] = useState<Record<string, boolean>>({});
  const [quarterChartType, setQuarterChartType] = useState<"small-multiples" | "heatmap">("small-multiples");

  // Modal/Form State for adding/editing tasks
  const [timelineTaskId, setTimelineTaskId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"tree" | "table" | "status" | "category" | "area" | "responsible" | "board">("category");
  const [tableSort, setTableSort] = useState<{ field: string, dir: "asc" | "desc" } | null>({ field: "end", dir: "asc" });
  const [boardGroupBy, setBoardGroupBy] = useState<"status" | "category">("category");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<Partial<Task>>({});
  
  // Quick status sync loader
  const [isSyncing, setIsSyncing] = useState(false);

  const handleAreaTableSort = (field: string) => {
    setAreaTableSort(prev => {
      if (prev?.field === field) {
        return { field, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { field, dir: "asc" };
    });
  };

  const AreaTableSortIcon = ({ field }: { field: string }) => {
    if (areaTableSort?.field !== field) return <ChevronDown size={12} className="opacity-35 inline ml-1" />;
    return areaTableSort.dir === "asc" 
      ? <ChevronUp size={12} className="text-indigo-600 inline ml-1 font-bold" /> 
      : <ChevronDown size={12} className="text-indigo-600 inline ml-1 font-bold" />;
  };

  const sortAreaTaskList = (taskList: Task[]) => {
    if (!areaTableSort) return taskList;
    const sorted = [...taskList];
    sorted.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";
      
      if (areaTableSort.field === "title") {
        valA = getTaskDisplayName(a);
        valB = getTaskDisplayName(b);
      } else if (areaTableSort.field === "start") {
        valA = a.startDate || "9999-99-99";
        valB = b.startDate || "9999-99-99";
      } else if (areaTableSort.field === "end") {
        valA = a.endDate || "9999-99-99";
        valB = b.endDate || "9999-99-99";
      } else if (areaTableSort.field === "quarter") {
        const getQ = (tk: Task) => {
          if (!tk.endDate) return 5;
          const d = new Date(tk.endDate);
          if (isNaN(d.getTime())) return 5;
          return Math.floor(d.getUTCMonth() / 3) + 1;
        };
        valA = getQ(a);
        valB = getQ(b);
      } else if (areaTableSort.field === "month") {
        const getM = (tk: Task) => {
          if (!tk.endDate) return 13;
          const d = new Date(tk.endDate);
          if (isNaN(d.getTime())) return 13;
          return d.getUTCMonth();
        };
        valA = getM(a);
        valB = getM(b);
      } else if (areaTableSort.field === "status") {
        valA = normalizeStatus(a.status);
        valB = normalizeStatus(b.status);
      } else if (areaTableSort.field === "situation") {
        valA = getDeadlineStatus(a.endDate, a.status);
        valB = getDeadlineStatus(b.endDate, b.status);
      } else if (areaTableSort.field === "priority") {
        const getPrioValue = (tk: Task) => {
          if (tk.priority === "Alta") return 1;
          if (tk.priority === "Média") return 2;
          if (tk.priority === "Baixa") return 3;
          return 4;
        };
        valA = getPrioValue(a);
        valB = getPrioValue(b);
      } else if (areaTableSort.field === "progress") {
        valA = a.progress || 0;
        valB = b.progress || 0;
      }

      if (areaTableSort.field === "title" || areaTableSort.field === "status" || areaTableSort.field === "situation") {
        const strA = String(valA || "");
        const strB = String(valB || "");
        return areaTableSort.dir === "asc" 
          ? strA.localeCompare(strB, "pt-BR") 
          : strB.localeCompare(strA, "pt-BR");
      }

      if (valA < valB) return areaTableSort.dir === "asc" ? -1 : 1;
      if (valA > valB) return areaTableSort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  // Refs and state for synchronized scrolling in Kanban board (Quadro)
  const topScrollRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [boardScrollWidth, setBoardScrollWidth] = useState(0);

  useEffect(() => {
    if (viewMode === "board" && contentScrollRef.current) {
      const el = contentScrollRef.current;
      const updateWidth = () => {
        setBoardScrollWidth(el.scrollWidth);
      };
      
      const handle = requestAnimationFrame(updateWidth);
      const observer = new ResizeObserver(updateWidth);
      observer.observe(el);
      
      return () => {
        cancelAnimationFrame(handle);
        observer.disconnect();
      };
    }
  }, [viewMode, boardGroupBy, tasks, categories]);

  const handleTopScroll = () => {
    if (topScrollRef.current && contentScrollRef.current) {
      if (Math.abs(contentScrollRef.current.scrollLeft - topScrollRef.current.scrollLeft) > 1) {
        contentScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
      }
    }
  };

  const handleContentScroll = () => {
    if (topScrollRef.current && contentScrollRef.current) {
      if (Math.abs(topScrollRef.current.scrollLeft - contentScrollRef.current.scrollLeft) > 1) {
        topScrollRef.current.scrollLeft = contentScrollRef.current.scrollLeft;
      }
    }
  };

  // Refs and state for synchronized scrolling in Table view (Tabela)
  const topScrollTableRef = useRef<HTMLDivElement>(null);
  const contentScrollTableRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  useEffect(() => {
    if (viewMode === "table" && contentScrollTableRef.current) {
      const el = contentScrollTableRef.current;
      const updateWidth = () => {
        setTableScrollWidth(el.scrollWidth);
      };
      
      const handle = requestAnimationFrame(updateWidth);
      const observer = new ResizeObserver(updateWidth);
      observer.observe(el);
      
      return () => {
        cancelAnimationFrame(handle);
        observer.disconnect();
      };
    }
  }, [viewMode, tasks, categories]);

  const handleTopTableScroll = () => {
    if (topScrollTableRef.current && contentScrollTableRef.current) {
      if (Math.abs(contentScrollTableRef.current.scrollLeft - topScrollTableRef.current.scrollLeft) > 1) {
        contentScrollTableRef.current.scrollLeft = topScrollTableRef.current.scrollLeft;
      }
    }
  };

  const handleContentTableScroll = () => {
    if (topScrollTableRef.current && contentScrollTableRef.current) {
      if (Math.abs(topScrollTableRef.current.scrollLeft - contentScrollTableRef.current.scrollLeft) > 1) {
        topScrollTableRef.current.scrollLeft = contentScrollTableRef.current.scrollLeft;
      }
    }
  };

  // Reload registries independently of tasks
  const loadRegistriesOnly = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success) {
        if (data.plans) setPlans(data.plans);
        if (data.areas) setAreas(data.areas);
        if (data.categories) setCategories(data.categories);
        if (data.responsibles) setResponsibles(data.responsibles);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle plan submit
  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;
    try {
      const isEdit = editingRegId !== null;
      const url = isEdit ? `/api/plans/${editingRegId}` : "/api/plans";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, description: regDesc, updatedBy: regUpdatedBy })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Sucesso", isEdit ? "Plano atualizado com sucesso." : "Plano cadastrado com sucesso.", "success");
        setRegName("");
        setRegDesc("");
        setEditingRegId(null);
        setIsRegModalOpen(false);
        await loadRegistriesOnly();
        await reloadTasks();
      } else {
        showToast("Erro", data.error || "Erro obtido do servidor ao salvar Plano.", "error");
      }
    } catch (err) {
      showToast("Erro", "Erro ao salvar plano.", "error");
    }
  };

  // Handle plan delete
  const handlePlanDelete = async (id: number) => {
    const tasksForPlan = tasks.filter(t => t.planId === id);
    if (tasksForPlan.length > 0) {
      setConfirmState({
        title: "Bloqueio de Exclusão",
        message: `Não é possível excluir este plano.\n\nExistem ${tasksForPlan.length} tarefa(s) associada(s) a ele. Remova ou reatribua as tarefas antes de excluir o plano.`,
        type: "alert"
      });
      return;
    }

    setConfirmState({
      type: "confirm",
      title: "Confirmar Exclusão do Plano",
      message: "Certeza que deseja excluir este plano?",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/plans/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (data.success) {
            showToast("Sucesso", "Plano excluído", "success");
            if (editingRegId === id) {
              setRegName("");
              setRegDesc("");
              setEditingRegId(null);
              setIsRegModalOpen(false);
            }
            await loadRegistriesOnly();
            await reloadTasks();
          }
        } catch (err) {
          showToast("Erro", "Erro ao excluir plano.", "error");
        }
      }
    });
  };

  // Handle area submit
  const handleAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      showToast("Validação", "Preencha o nome da área.", "warning");
      return;
    }
    try {
      const isEdit = editingRegId !== null;
      const url = isEdit ? `/api/areas/${editingRegId}` : "/api/areas";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, abbreviation: regAbbreviation.substring(0, 2).toUpperCase(), updatedBy: regUpdatedBy })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Sucesso", isEdit ? "Área atualizada." : "Área cadastrada com sucesso.", "success");
        setRegName("");
        setRegAbbreviation("");
        setEditingRegId(null);
        setIsRegModalOpen(false);
        await loadRegistriesOnly();
        await reloadTasks();
      } else {
        showToast("Erro", data.error || "Erro obtido do servidor ao salvar Área.", "error");
      }
    } catch (err) {
      showToast("Erro", "Erro ao salvar área.", "error");
    }
  };

  // Handle area delete
  const handleAreaDelete = async (id: number) => {
    const tasksForArea = tasks.filter(t => t.areaIds?.includes(id));
    if (tasksForArea.length > 0) {
      setConfirmState({
        title: "Bloqueio de Exclusão",
        message: `Não é possível excluir esta área.\n\nExistem ${tasksForArea.length} tarefa(s) associada(s) a ela. Remova ou reatribua as tarefas antes de excluir a área.`,
        type: "alert"
      });
      return;
    }

    setConfirmState({
      type: "confirm",
      title: "Excluir Área",
      message: "Certeza que deseja excluir esta área?",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/areas/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (data.success) {
            showToast("Sucesso", "Área excluída com sucesso.", "success");
            if (editingRegId === id) {
              setRegName("");
              setEditingRegId(null);
              setIsRegModalOpen(false);
            }
            await loadRegistriesOnly();
            await reloadTasks();
          }
        } catch (err) {
          showToast("Erro", "Erro ao excluir área.", "error");
        }
      }
    });
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || regAreaIds.length === 0) {
      showToast("Aviso", "Nome da categoria e pelo menos uma Área são obrigatórios.", "warning");
      return;
    }
    const isEdit = editingRegId !== null;
    const url = isEdit ? `/api/categories/${editingRegId}` : "/api/categories";
    const method = isEdit ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, areaIds: regAreaIds, updatedBy: regUpdatedBy })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Sucesso", isEdit ? "Categoria atualizada." : "Categoria cadastrada com sucesso.", "success");
        setRegName("");
        setRegAreaIds([]);
        setEditingRegId(null);
        setIsRegModalOpen(false);
        await loadRegistriesOnly();
        await reloadTasks();
      } else {
        showToast("Erro", data.error || "Erro obtido do servidor ao salvar Categoria.", "error");
      }
    } catch (err) {
      showToast("Erro", "Erro ao salvar categoria.", "error");
    }
  };

  const handleCategoryDelete = async (id: number) => {
    const tasksForCategory = tasks.filter(t => t.categoryIds?.includes(id));
    if (tasksForCategory.length > 0) {
      setConfirmState({
        title: "Bloqueio de Exclusão",
        message: `Não é possível excluir esta categoria.\n\nExistem ${tasksForCategory.length} tarefa(s) associada(s) a ela. Remova ou reatribua as tarefas antes de excluir a categoria.`,
        type: "alert"
      });
      return;
    }

    setConfirmState({
      type: "confirm",
      title: "Excluir Categoria",
      message: "Certeza que deseja excluir esta categoria?",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (data.success) {
            showToast("Sucesso", "Categoria excluída com sucesso.", "success");
            if (editingRegId === id) {
              setRegName("");
              setRegAreaIds([]);
              setEditingRegId(null);
              setIsRegModalOpen(false);
            }
            await loadRegistriesOnly();
            await reloadTasks();
          }
        } catch (err) {
          showToast("Erro", "Erro ao excluir categoria.", "error");
        }
      }
    });
  };

  // Handle responsible submit
  const handleResponsibleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      showToast("Validação", "Nome do responsável é obrigatório.", "warning");
      return;
    }
    try {
      const isEdit = editingRegId !== null;
      const url = isEdit ? `/api/responsibles/${editingRegId}` : "/api/responsibles";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, email: regEmail, role: regRole, areaIds: regAreaIds, updatedBy: regUpdatedBy })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Sucesso", isEdit ? "Responsável atualizado." : "Responsável criado com sucesso.", "success");
        setRegName("");
        setRegEmail("");
        setRegRole("");
        setRegAreaIds([]);
        setEditingRegId(null);
        setIsRegModalOpen(false);
        await loadRegistriesOnly();
        await reloadTasks();
      } else {
        showToast("Erro", data.error || "Erro obtido do servidor ao salvar Responsável.", "error");
      }
    } catch (err) {
      showToast("Erro", "Erro ao salvar responsável.", "error");
    }
  };

  // Handle responsible delete
  const handleResponsibleDelete = async (id: number) => {
    const tasksForResponsible = tasks.filter(t => t.responsibleIds?.includes(id));
    if (tasksForResponsible.length > 0) {
      setConfirmState({
        title: "Bloqueio de Exclusão",
        message: `Não é possível excluir este responsável.\n\nExistem ${tasksForResponsible.length} tarefa(s) atribuída(s) a ele. Remova ou reatribua as tarefas antes de excluí-lo.`,
        type: "alert"
      });
      return;
    }

    setConfirmState({
      type: "confirm",
      title: "Excluir Responsável",
      message: "Certeza que deseja excluir este responsável?",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/responsibles/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (data.success) {
            showToast("Sucesso", "Responsável excluído com sucesso.", "success");
            if (editingRegId === id) {
              setRegName("");
              setRegEmail("");
              setRegRole("");
              setEditingRegId(null);
              setIsRegModalOpen(false);
            }
            await loadRegistriesOnly();
            await reloadTasks();
          }
        } catch (err) {
          showToast("Erro", "Erro ao excluir responsável.", "error");
        }
      }
    });
  };

  // Sync / reload tasks from server
  const reloadTasks = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success && data.data) {
        setTasks(data.data);
        if (data.plans) setPlans(data.plans);
        if (data.areas) setAreas(data.areas);
        if (data.categories) setCategories(data.categories);
        if (data.responsibles) setResponsibles(data.responsibles);
      }
    } catch (e: any) {
      showToast("Erro", "Falha ao recarregar tarefas do banco de dados.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // Mount effect to fetch starting elements
  React.useEffect(() => {
    reloadTasks();
  }, []);

  // Pre-select most recent plan on mount / if plans are updated
  React.useEffect(() => {
    if (plans && plans.length > 0 && planFilter === "all") {
      const sortedPlans = [...plans].sort((a, b) => {
        const yearA = parseInt(a.name.match(/\d{4}/)?.[0] || "0", 10);
        const yearB = parseInt(b.name.match(/\d{4}/)?.[0] || "0", 10);
        if (yearA !== yearB) return yearB - yearA;
        return b.id - a.id;
      });
      if (sortedPlans.length > 0) {
        setPlanFilter(sortedPlans[0].id.toString());
      }
    }
  }, [plans]);

  // Match keyword in title or description or custom filters
  const matchesFilters = (t: Task): boolean => {
    // Check keyword
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      const titleMatch = t.title?.toLowerCase().includes(query);
      const descMatch = t.description?.toLowerCase().includes(query);
      const categoryNamesMatch = t.categoryIds?.map(id => categories.find(c => c.id === id)?.name || "").some(name => name.toLowerCase().includes(query));
      if (!titleMatch && !descMatch && !categoryNamesMatch) return false;
    }

    // Check status
    if (statusFilter !== "all") {
      if (normalizeStatus(t.status) !== statusFilter) return false;
    }

    // Check situation
    if (situationFilter !== "all") {
      if (getDeadlineStatus(t.endDate, t.status) !== situationFilter) return false;
    }

    // Check priority
    if (priorityFilter !== "all" && t.priority !== priorityFilter) {
      return false;
    }

    // Check category
    if (categoryFilter !== "all") {
      if (!t.categoryIds?.includes(Number(categoryFilter))) return false;
    }

    // Check plan
    if (planFilter !== "all" && planFilter !== "" && Number(t.planId) !== Number(planFilter)) {
      return false;
    }

    // Check area (many-to-many match) with multi-select selectedAreaIds (subsystems model style)
    if (selectedAreaIds.length > 0) {
      if (!t.areaIds?.some((id) => selectedAreaIds.includes(Number(id)))) {
        return false;
      }
    }

    // Check responsible
    if (selectedResponsibleIds.length > 0) {
      if (!t.responsibleIds?.some((id) => selectedResponsibleIds.includes(Number(id)))) {
        return false;
      }
    }

    // Check Period (Month / Quarter / Semester)
    if (periodTypeFilter !== "all" && periodValueFilter !== "all") {
      const valNum = parseInt(periodValueFilter, 10);
      if (!isNaN(valNum)) {
        if (periodTypeFilter === "month") {
          const taskInMonth = (tk: Task, m: number): boolean => {
            if (!tk.endDate) return false;
            const padM = m.toString().padStart(2, "0");
            if (tk.endDate.includes(`-${padM}-`)) return true;
            const d = new Date(tk.endDate);
            if (!isNaN(d.getTime()) && (d.getUTCMonth() + 1 === m)) return true;
            return false;
          };
          if (!taskInMonth(t, valNum)) return false;
        } else if (periodTypeFilter === "quarter") {
          const taskInQuarter = (tk: Task, q: number): boolean => {
            if (!tk.endDate) return false;
            const startMonth = (q - 1) * 3 + 1;
            const padM1 = startMonth.toString().padStart(2, "0");
            const padM2 = (startMonth + 1).toString().padStart(2, "0");
            const padM3 = (startMonth + 2).toString().padStart(2, "0");
            if (tk.endDate.includes(`-${padM1}-`) || tk.endDate.includes(`-${padM2}-`) || tk.endDate.includes(`-${padM3}-`)) return true;
            const d = new Date(tk.endDate);
            if (!isNaN(d.getTime())) {
              const m = d.getUTCMonth() + 1;
              if (m >= startMonth && m <= startMonth + 2) return true;
            }
            return false;
          };
          if (!taskInQuarter(t, valNum)) return false;
        } else if (periodTypeFilter === "semester") {
          const taskInSemester = (tk: Task, s: number): boolean => {
            if (!tk.endDate) return false;
            const startMonth = (s - 1) * 6 + 1;
            const padMs = Array.from({ length: 6 }, (_, idx) => (startMonth + idx).toString().padStart(2, "0"));
            if (padMs.some(padM => tk.endDate!.includes(`-${padM}-`))) return true;
            const d = new Date(tk.endDate);
            if (!isNaN(d.getTime())) {
              const m = d.getUTCMonth() + 1;
              if (m >= startMonth && m <= startMonth + 5) return true;
            }
            return false;
          };
          if (!taskInSemester(t, valNum)) return false;
        }
      }
    }

    return true;
  };

  // Calculate computed tasks to rollup dates and progress for parent tasks
  const { enhancedTasks, taskById, childrenMap } = useMemo(() => {
    const tMap: Record<number, Task> = {};
    const cMap: Record<number, Task[]> = {};
    
    // Clone all tasks
    tasks.forEach(t => {
      tMap[t.id] = { ...t };
    });
    
    // Build children mapping using the clones
    Object.values(tMap).forEach(t => {
      if (t.parentId) {
        if (!cMap[t.parentId]) cMap[t.parentId] = [];
        cMap[t.parentId].push(t);
      }
    });
    
    // Sort children
    Object.keys(cMap).forEach(key => {
      cMap[Number(key)].sort((a,b) => a.id - b.id);
    });

    const computeNode = (nodeId: number) => {
      const node = tMap[nodeId];
      const children = cMap[nodeId] || [];
      if (children.length === 0) return node;

      let minStart: Date | null = null;
      let maxEnd: Date | null = null;
      let totalProgress = 0;

      children.forEach(child => {
        const computedChild = computeNode(child.id);
        totalProgress += computedChild.progress || 0;
        
        if (computedChild.startDate) {
          const sd = new Date(computedChild.startDate);
          if (!isNaN(sd.getTime())) {
            if (!minStart || sd < minStart) minStart = sd;
          }
        }
        if (computedChild.endDate) {
          const ed = new Date(computedChild.endDate);
          if (!isNaN(ed.getTime())) {
            if (!maxEnd || ed > maxEnd) maxEnd = ed;
          }
        }
      });

      node.progress = Math.round(totalProgress / children.length);
      
      if (minStart) {
        node.startDate = minStart.toISOString().split('T')[0];
      }
      if (maxEnd) {
        node.endDate = maxEnd.toISOString().split('T')[0];
      }

      // Roll up status
      if (node.progress === 100) {
        node.status = "Concluída";
      } else if (node.progress > 0) {
        node.status = "Em andamento";
      } else {
        node.status = "Não iniciada";
      }
      
      return node;
    };

    // Calculate all root tasks which cascades down
    tasks.filter(t => !t.parentId).forEach(t => computeNode(t.id));
    
    return {
      enhancedTasks: Object.values(tMap),
      taskById: tMap,
      childrenMap: cMap
    };
  }, [tasks]);

  // Root level tasks
  const rootTasks = useMemo(() => {
    return enhancedTasks.filter(t => !t.parentId).sort((a, b) => a.id - b.id);
  }, [enhancedTasks]);

  // Handle expand / collapse toggles
  const toggleExpand = (id: number) => {
    setExpandedTasks(prev => {
      const current = prev[id] !== undefined ? prev[id] : (isAnyFilterActive ? true : false);
      return { ...prev, [id]: !current };
    });
  };

  // Groups expand/collapse containers state (keyed by `${viewMode}-${groupId}`)
  const [expandedGroupContainers, setExpandedGroupContainers] = useState<Record<string, boolean>>({});

  const toggleGroupContainer = (viewType: string, groupId: string | number) => {
    const key = `${viewType}-${groupId}`;
    setExpandedGroupContainers(prev => {
      const isExpanded = prev[key] !== false; // default is true
      return { ...prev, [key]: !isExpanded };
    });
  };

  const handleGroupContainersExpandCollapse = (expand: boolean) => {
    setExpandedGroupContainers(prev => {
      const updated = { ...prev };
      if (viewMode === "status") {
        const statuses = ["Não iniciada", "Em andamento", "Concluída"];
        statuses.forEach(st => {
          updated[`status-${st}`] = expand;
        });
      } else if (viewMode === "category") {
        categories.forEach(cat => {
          updated[`category-${cat.id}`] = expand;
        });
        updated[`category--1`] = expand;
      } else if (viewMode === "area") {
        areas.forEach(ar => {
          updated[`area-${ar.id}`] = expand;
        });
        updated[`area--1`] = expand;
      } else if (viewMode === "responsible") {
        responsibles.forEach(resp => {
          updated[`responsible-${resp.id}`] = expand;
        });
        updated[`responsible--1`] = expand;
      }
      return updated;
    });
  };

  // Helper to check if a task has children
  const hasChildren = (id: number): boolean => {
    return !!childrenMap[id] && childrenMap[id].length > 0;
  };

  // Calculate stats
  const stats = useMemo(() => {
    const total = enhancedTasks.length;
    const completed = enhancedTasks.filter(t => normalizeStatus(t.status) === "Concluída").length;
    const inProgress = enhancedTasks.filter(t => normalizeStatus(t.status) === "Em andamento").length;
    const pending = enhancedTasks.filter(t => normalizeStatus(t.status) === "Não iniciada").length;
    
    // Progress is weighted average of root tasks
    let progressSum = 0;
    const rootCount = rootTasks.length;
    if (rootCount > 0) {
      rootTasks.forEach(r => {
        progressSum += r.progress || 0;
      });
    }
    const avgRootProgress = rootCount > 0 ? Math.round(progressSum / rootCount) : 0;

    return { total, completed, inProgress, pending, avgRootProgress };
  }, [enhancedTasks, rootTasks]);

  // Filtered tasks and chart definitions for Dashboard
  const matchesFiltersDashboard = (t: Task): boolean => {
    // Check status
    if (statusFilter !== "all") {
      if (normalizeStatus(t.status) !== statusFilter) return false;
    }

    // Check situation
    if (situationFilter !== "all") {
      if (getDeadlineStatus(t.endDate, t.status) !== situationFilter) return false;
    }

    // Check priority
    if (priorityFilter !== "all" && t.priority !== priorityFilter) {
      return false;
    }

    // Check category
    if (categoryFilter !== "all") {
      if (!t.categoryIds?.includes(Number(categoryFilter))) return false;
    }

    // Check plan
    if (planFilter !== "all" && planFilter !== "" && Number(t.planId) !== Number(planFilter)) {
      return false;
    }

    // Check area (many-to-many match) with multi-select selectedAreaIds (subsystems model style)
    if (selectedAreaIds.length > 0) {
      if (!t.areaIds?.some((id) => selectedAreaIds.includes(Number(id)))) {
        return false;
      }
    }

    // Check responsible
    if (selectedResponsibleIds.length > 0) {
      if (!t.responsibleIds?.some((id) => selectedResponsibleIds.includes(Number(id)))) {
        return false;
      }
    }

    // Check Period (Month / Quarter / Semester)
    if (periodTypeFilter !== "all" && periodValueFilter !== "all") {
      const valNum = parseInt(periodValueFilter, 10);
      if (!isNaN(valNum)) {
        if (periodTypeFilter === "month") {
          // Check if task date falls in a given month (1 to 12)
          const taskInMonth = (tk: Task, m: number): boolean => {
            if (!tk.endDate) return false;
            const padM = m.toString().padStart(2, "0");
            if (tk.endDate.includes(`-${padM}-`)) return true;
            
            const d = new Date(tk.endDate);
            if (!isNaN(d.getTime()) && (d.getUTCMonth() + 1 === m)) return true;
            return false;
          };
          if (!taskInMonth(t, valNum)) return false;
        } else if (periodTypeFilter === "quarter") {
          // Check if task date falls in a given quarter (1 to 4)
          const taskInQuarter = (tk: Task, q: number): boolean => {
            if (!tk.endDate) return false;
            const startMonth = (q - 1) * 3 + 1;
            const padM1 = startMonth.toString().padStart(2, "0");
            const padM2 = (startMonth + 1).toString().padStart(2, "0");
            const padM3 = (startMonth + 2).toString().padStart(2, "0");
            if (tk.endDate.includes(`-${padM1}-`) || tk.endDate.includes(`-${padM2}-`) || tk.endDate.includes(`-${padM3}-`)) return true;

            const d = new Date(tk.endDate);
            if (!isNaN(d.getTime())) {
              const m = d.getUTCMonth() + 1;
              if (m >= startMonth && m <= startMonth + 2) return true;
            }
            return false;
          };
          if (!taskInQuarter(t, valNum)) return false;
        } else if (periodTypeFilter === "semester") {
          // Check if task date falls in a given semester (1 to 2)
          const taskInSemester = (tk: Task, s: number): boolean => {
            if (!tk.endDate) return false;
            const startMonth = (s - 1) * 6 + 1;
            const padMs = Array.from({ length: 6 }, (_, idx) => (startMonth + idx).toString().padStart(2, "0"));
            if (padMs.some(padM => tk.endDate!.includes(`-${padM}-`))) return true;

            const d = new Date(tk.endDate);
            if (!isNaN(d.getTime())) {
              const m = d.getUTCMonth() + 1;
              if (m >= startMonth && m <= startMonth + 5) return true;
            }
            return false;
          };
          if (!taskInSemester(t, valNum)) return false;
        }
      }
    }

    return true;
  };

  const filteredTasks = useMemo(() => {
    return enhancedTasks.filter(t => matchesFiltersDashboard(t));
  }, [enhancedTasks, statusFilter, situationFilter, priorityFilter, categoryFilter, planFilter, selectedAreaIds, selectedResponsibleIds, periodTypeFilter, periodValueFilter]);

  const dashboardStats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => normalizeStatus(t.status) === "Concluída").length;
    const inProgress = filteredTasks.filter(t => normalizeStatus(t.status) === "Em andamento").length;
    const pending = filteredTasks.filter(t => normalizeStatus(t.status) === "Não iniciada").length;
    const avgProgress = total > 0 ? Math.round(filteredTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / total) : 0;

    return { total, completed, inProgress, pending, avgProgress };
  }, [filteredTasks]);

  // Chart data 1: Status Distribution
  const statusData = useMemo(() => {
    return [
      { name: "Não Iniciada", value: dashboardStats.pending, color: "#94a3b8" }, // slate-400
      { name: "Em Andamento", value: dashboardStats.inProgress, color: "#3b82f6" }, // blue-500
      { name: "Concluída", value: dashboardStats.completed, color: "#10b981" } // emerald-500
    ].filter(item => item.value > 0);
  }, [dashboardStats]);

  // Chart data 2: Average Progress and Task Count per Area
  const areaChartData = useMemo(() => {
    if (!areas || areas.length === 0) return [];
    
    const targetAreas = selectedAreaIds.length > 0 
      ? areas.filter(a => selectedAreaIds.includes(a.id))
      : areas;

    return targetAreas.map(area => {
      const areaTasks = filteredTasks.filter(t => t.areaIds?.includes(area.id));
      const total = areaTasks.length;
      const completed = areaTasks.filter(t => normalizeStatus(t.status) === "Concluída").length;
      const inProgress = areaTasks.filter(t => normalizeStatus(t.status) === "Em andamento").length;
      const pending = areaTasks.filter(t => normalizeStatus(t.status) === "Não iniciada").length;
      const avgProg = total > 0 ? Math.round(areaTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / total) : 0;
      return {
        name: area.name,
        fullName: area.name,
        "Progresso Médio (%)": avgProg,
        "Total de Tarefas": total,
        "Não iniciada": pending,
        "Em andamento": inProgress,
        "Concluídas": completed
      };
    }).filter(d => d["Total de Tarefas"] > 0);
  }, [filteredTasks, areas, selectedAreaIds]);

  // Chart data 3: Priority breakdown
  const priorityChartData = useMemo(() => {
    const priorities = ["Alta", "Média", "Baixa"];
    return priorities.map(p => {
      const pTasks = filteredTasks.filter(t => {
        const prio = (t.priority || "").toLowerCase().trim();
        if (p === "Alta" && (prio === "alta" || prio === "high" || prio === "urgente")) return true;
        if (p === "Média" && (prio === "média" || prio === "media" || prio === "medium")) return true;
        if (p === "Baixa" && (prio === "baixa" || prio === "low")) return true;
        return false;
      });
      return {
        priority: p.toUpperCase(),
        "Quantidade": pTasks.length,
        "Total": filteredTasks.length
      };
    });
  }, [filteredTasks]);

  const areaQuarterStatusData = useMemo(() => {
    if (!areas || areas.length === 0) return [];
    
    const dataMap: Record<string, any> = {};

    const targetAreas = selectedAreaIds.length > 0 
      ? areas.filter(a => selectedAreaIds.includes(a.id))
      : areas;

    targetAreas.forEach(a => {
      [0, 1, 2, 3].forEach(q => {
        const key = `${a.id}-${q}`;
        dataMap[key] = {
          key,
          areaName: a.name,
          quarter: `${q + 1}º Tri`,
          name: `${a.name} - ${q + 1}º Tri`,
          "Não iniciada": 0,
          "Em andamento": 0,
          "Concluídas": 0
        };
      });
    });

    if (selectedAreaIds.length === 0) {
      [0, 1, 2, 3].forEach(q => {
        const key = `sem_area-${q}`;
        dataMap[key] = {
          key,
          areaName: "Sem Área",
          quarter: `${q + 1}º Tri`,
          name: `Sem Área - ${q + 1}º Tri`,
          "Não iniciada": 0,
          "Em andamento": 0,
          "Concluídas": 0
        };
      });
    }

    filteredTasks.forEach(t => {
      if (!t.endDate) return;
      const d = new Date(t.endDate);
      if (isNaN(d.getTime())) return;
      
      const month = d.getUTCMonth();
      const q = Math.floor(month / 3);
      
      const status = normalizeStatus(t.status);
      let statusKey = "Não iniciada";
      if (status === "Concluída") statusKey = "Concluídas";
      else if (status === "Em andamento") statusKey = "Em andamento";

      if (t.areaIds && t.areaIds.length > 0) {
        t.areaIds.forEach(aid => {
          const key = `${aid}-${q}`;
          if (dataMap[key]) {
            dataMap[key][statusKey]++;
          }
        });
      } else {
        const key = `sem_area-${q}`;
        if (dataMap[key]) {
          dataMap[key][statusKey]++;
        }
      }
    });

    return Object.values(dataMap)
      .filter(d => (d["Não iniciada"] > 0 || d["Em andamento"] > 0 || d["Concluídas"] > 0))
      .sort((a, b) => {
        const cmp = a.areaName.localeCompare(b.areaName, 'pt-BR');
        if (cmp !== 0) return cmp;
        return a.quarter.localeCompare(b.quarter);
      });
  }, [filteredTasks, areas, selectedAreaIds]);

  // Grouped dashboard data for the table grouped by Plan -> Area -> Category
  const groupedDashboardData = useMemo(() => {
    // 1) Initialize Plan map
    const planMap: Record<number, { plan: Plan; tasks: Task[] }> = {};
    plans.forEach(p => {
      planMap[p.id] = { plan: p, tasks: [] };
    });
    const NO_PLAN_ID = 0;
    planMap[NO_PLAN_ID] = { plan: { id: 0, name: "Sem Plano Vinculado", description: "" }, tasks: [] };

    // 2) Allocate filtered tasks to Plans
    filteredTasks.forEach(t => {
      const pId = t.planId || NO_PLAN_ID;
      if (planMap[pId]) {
        planMap[pId].tasks.push(t);
      } else {
        planMap[NO_PLAN_ID].tasks.push(t);
      }
    });

    const parseDateToMs = (dateStr: string | null | undefined) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d.getTime();
    };

    const getMinMaxDates = (taskList: Task[]) => {
      let minMs: number | null = null;
      let maxMs: number | null = null;
      let minStr: string | null = null;
      let maxStr: string | null = null;

      taskList.forEach(t => {
        // Evaluate start dates
        if (t.startDate) {
          const ms = parseDateToMs(t.startDate);
          if (ms !== null) {
            if (minMs === null || ms < minMs) {
              minMs = ms;
              minStr = t.startDate;
            }
            if (maxMs === null || ms > maxMs) {
              maxMs = ms;
              maxStr = t.startDate;
            }
          }
        }
        // Evaluate end dates
        if (t.endDate) {
          const ms = parseDateToMs(t.endDate);
          if (ms !== null) {
            if (minMs === null || ms < minMs) {
              minMs = ms;
              minStr = t.endDate;
            }
            if (maxMs === null || ms > maxMs) {
              maxMs = ms;
              maxStr = t.endDate;
            }
          }
        }
      });

      return {
        startDate: minStr,
        endDate: maxStr
      };
    };

    const getTaskStats = (taskList: Task[]) => {
      const total = taskList.length;
      const pending = taskList.filter(t => normalizeStatus(t.status) === "Não iniciada").length;
      const inProgress = taskList.filter(t => normalizeStatus(t.status) === "Em andamento").length;
      const completed = taskList.filter(t => normalizeStatus(t.status) === "Concluída").length;
      
      const progressSum = taskList.reduce((acc, t) => acc + (t.progress || 0), 0);
      const avgProgress = total > 0 ? Math.round(progressSum / total) : 0;

      const dates = getMinMaxDates(taskList);

      return {
        total,
        pending,
        inProgress,
        completed,
        avgProgress,
        ...dates
      };
    };

    const tree: any[] = [];

    // 3) Iterate over Plan Map
    Object.keys(planMap).forEach(pKey => {
      const pId = Number(pKey);
      const planEntry = planMap[pId];
      if (planEntry.tasks.length === 0) return;

      const planTasks = planEntry.tasks;
      const planStats = getTaskStats(planTasks);

      // Now set up Area Map for this Plan
      const areaMap: Record<number, { area: Area; tasks: Task[] }> = {};
      areas.forEach(a => {
        areaMap[a.id] = { area: a, tasks: [] };
      });
      const NO_AREA_ID = 0;
      areaMap[NO_AREA_ID] = { area: { id: 0, name: "Sem Área de Atuação" }, tasks: [] };

      planTasks.forEach(t => {
        if (t.areaIds && t.areaIds.length > 0) {
          t.areaIds.forEach(aId => {
            if (areaMap[aId]) {
              areaMap[aId].tasks.push(t);
            } else {
              areaMap[NO_AREA_ID].tasks.push(t);
            }
          });
        } else {
          areaMap[NO_AREA_ID].tasks.push(t);
        }
      });

      const areaNodes: any[] = [];
      Object.keys(areaMap).forEach(aKey => {
        const aId = Number(aKey);
        const areaEntry = areaMap[aId];
        if (areaEntry.tasks.length === 0) return;

        const areaTasks = areaEntry.tasks;
        const areaStats = getTaskStats(areaTasks);

        // Group Area Tasks by Category
        const catMap: Record<number, { category: Category; tasks: Task[] }> = {};
        categories.forEach(c => {
          catMap[c.id] = { category: c, tasks: [] };
        });
        const NO_CAT_ID = 0;
        catMap[NO_CAT_ID] = { category: { id: 0, name: "Sem Categoria definível", areaIds: [] }, tasks: [] };

        areaTasks.forEach(t => {
          if (t.categoryIds && t.categoryIds.length > 0) {
            t.categoryIds.forEach(cId => {
              if (catMap[cId]) {
                catMap[cId].tasks.push(t);
              } else {
                catMap[NO_CAT_ID].tasks.push(t);
              }
            });
          } else {
            catMap[NO_CAT_ID].tasks.push(t);
          }
        });

        const catNodes: any[] = [];
        Object.keys(catMap).forEach(cKey => {
          const cId = Number(cKey);
          const catEntry = catMap[cId];
          if (catEntry.tasks.length === 0) return;

          const catTasks = catEntry.tasks;
          const catStats = getTaskStats(catTasks);

          catNodes.push({
            id: `p-${pId}-a-${aId}-c-${cId}`,
            name: catEntry.category.name,
            type: "category",
            ...catStats,
            children: []
          });
        });

        // Sort categories by name
        catNodes.sort((a, b) => a.name.localeCompare(b.name));

        areaNodes.push({
          id: `p-${pId}-a-${aId}`,
          name: areaEntry.area.name,
          type: "area",
          ...areaStats,
          children: catNodes
        });
      });

      // Sort areas by name
      areaNodes.sort((a, b) => a.name.localeCompare(b.name));

      tree.push({
        id: `p-${pId}`,
        name: planEntry.plan.name,
        type: "plan",
        ...planStats,
        children: areaNodes
      });
    });

    // Sort plans by name
    tree.sort((a, b) => a.name.localeCompare(b.name));

    return tree;
  }, [filteredTasks, plans, areas, categories]);

  const visibleGroupedRows = useMemo(() => {
    const list: any[] = [];
    const traverse = (node: any, depth: number) => {
      list.push({ ...node, depth });
      const isExpanded = expandedGroups[node.id] !== undefined ? expandedGroups[node.id] : (isAnyFilterActive ? true : depth < 1); // defaults to true for first group
      if (isExpanded && node.children && node.children.length > 0) {
        node.children.forEach((child: any) => traverse(child, depth + 1));
      }
    };
    groupedDashboardData.forEach(node => traverse(node, 0));
    return list;
  }, [groupedDashboardData, expandedGroups, isAnyFilterActive]);

  const groupedQuarterDashboardData = useMemo(() => {
    const planMap: Record<number, { plan: Plan; tasks: Task[] }> = {};
    plans.forEach(p => { planMap[p.id] = { plan: p, tasks: [] }; });
    const NO_PLAN_ID = 0;
    planMap[NO_PLAN_ID] = { plan: { id: 0, name: "Sem Plano Vinculado", description: "" }, tasks: [] };

    filteredTasks.forEach(t => {
      if (t.planId && planMap[t.planId]) {
        planMap[t.planId].tasks.push(t);
      } else {
        planMap[NO_PLAN_ID].tasks.push(t);
      }
    });

    const getMinMaxDates = (taskList: Task[]) => {
      let minMs: number | null = null, maxMs: number | null = null;
      let minStr: string | null = null, maxStr: string | null = null;
      const parseDateToMs = (d: string) => {
        const p = new Date(d);
        return isNaN(p.getTime()) ? null : p.getTime();
      };
      taskList.forEach(t => {
        if (t.startDate) {
          const ms = parseDateToMs(t.startDate);
          if (ms !== null) {
            if (minMs === null || ms < minMs) { minMs = ms; minStr = t.startDate; }
            if (maxMs === null || ms > maxMs) { maxMs = ms; maxStr = t.startDate; }
          }
        }
        if (t.endDate) {
          const ms = parseDateToMs(t.endDate);
          if (ms !== null) {
            if (minMs === null || ms < minMs) { minMs = ms; minStr = t.endDate; }
            if (maxMs === null || ms > maxMs) { maxMs = ms; maxStr = t.endDate; }
          }
        }
      });
      return { startDate: minStr, endDate: maxStr };
    };

    const getTaskStats = (taskList: Task[]) => {
      const total = taskList.length;
      const pending = taskList.filter(t => normalizeStatus(t.status) === "Não iniciada").length;
      const inProgress = taskList.filter(t => normalizeStatus(t.status) === "Em andamento").length;
      const completed = taskList.filter(t => normalizeStatus(t.status) === "Concluída").length;
      const progressSum = taskList.reduce((acc, t) => acc + (t.progress || 0), 0);
      const avgProgress = total > 0 ? Math.round(progressSum / total) : 0;
      return { total, pending, inProgress, completed, avgProgress, ...getMinMaxDates(taskList) };
    };

    const tree: any[] = [];

    Object.keys(planMap).forEach(pKey => {
      const pId = Number(pKey);
      const planEntry = planMap[pId];
      if (planEntry.tasks.length === 0) return;

      const planStats = getTaskStats(planEntry.tasks);

      const areaMap: Record<number, { area: Area; tasks: Task[] }> = {};
      areas.forEach(a => { areaMap[a.id] = { area: a, tasks: [] }; });
      const NO_AREA_ID = 0;
      areaMap[NO_AREA_ID] = { area: { id: 0, name: "Sem Área de Atuação" }, tasks: [] };

      planEntry.tasks.forEach(t => {
        if (t.areaIds && t.areaIds.length > 0) {
          t.areaIds.forEach(aId => {
            if (areaMap[aId]) areaMap[aId].tasks.push(t);
            else areaMap[NO_AREA_ID].tasks.push(t);
          });
        } else {
          areaMap[NO_AREA_ID].tasks.push(t);
        }
      });

      const areaNodes: any[] = [];
      Object.keys(areaMap).forEach(aKey => {
        const aId = Number(aKey);
        const areaEntry = areaMap[aId];
        if (areaEntry.tasks.length === 0) return;

        const areaStats = getTaskStats(areaEntry.tasks);

        const quarterMap: Record<number, { name: string; tasks: Task[] }> = {
          1: { name: "1º Trimestre (Jan - Mar)", tasks: [] },
          2: { name: "2º Trimestre (Abr - Jun)", tasks: [] },
          3: { name: "3º Trimestre (Jul - Set)", tasks: [] },
          4: { name: "4º Trimestre (Out - Dez)", tasks: [] },
          0: { name: "Sem Período Trimestral", tasks: [] }
        };

        const taskInQuarter = (tk: Task, q: number): boolean => {
          if (!tk.endDate) return false;
          const startMonth = (q - 1) * 3 + 1;
          const padM1 = startMonth.toString().padStart(2, "0");
          const padM2 = (startMonth + 1).toString().padStart(2, "0");
          const padM3 = (startMonth + 2).toString().padStart(2, "0");
          
          if (tk.endDate.includes(`-${padM1}-`) || tk.endDate.includes(`-${padM2}-`) || tk.endDate.includes(`-${padM3}-`)) return true;
          
          const d = new Date(tk.endDate);
          if (!isNaN(d.getTime())) {
            const m = d.getUTCMonth() + 1;
            if (m === startMonth || m === startMonth + 1 || m === startMonth + 2) return true;
          }
          return false;
        };

        areaEntry.tasks.forEach(t => {
          let assigned = false;
          for (let q = 1; q <= 4; q++) {
            if (taskInQuarter(t, q)) {
              quarterMap[q].tasks.push(t);
              assigned = true;
            }
          }
          if (!assigned) {
            quarterMap[0].tasks.push(t);
          }
        });

        const quarterNodes: any[] = [];
        Object.keys(quarterMap).forEach(qKey => {
          const qId = Number(qKey);
          const qEntry = quarterMap[qId];
          if (qEntry.tasks.length === 0) return;

          const qStats = getTaskStats(qEntry.tasks);
          quarterNodes.push({
            id: `p-${pId}-a-${aId}-q-${qId}`,
            name: qEntry.name,
            type: "quarter",
            ...qStats,
            children: []
          });
        });

        quarterNodes.sort((a, b) => a.name.localeCompare(b.name));

        areaNodes.push({
          id: `p-${pId}-a-${aId}`,
          name: areaEntry.area.name,
          type: "area",
          ...areaStats,
          children: quarterNodes
        });
      });

      areaNodes.sort((a, b) => a.name.localeCompare(b.name));

      tree.push({
        id: `p-${pId}`,
        name: planEntry.plan.name,
        type: "plan",
        ...planStats,
        children: areaNodes
      });
    });

    tree.sort((a, b) => a.name.localeCompare(b.name));
    return tree;
  }, [filteredTasks, plans, areas]);

  const visibleQuarterGroupedRows = useMemo(() => {
    const list: any[] = [];
    const traverse = (node: any, depth: number) => {
      list.push({ ...node, depth });
      const isExpanded = expandedQuarterGroups[node.id] !== undefined ? expandedQuarterGroups[node.id] : (isAnyFilterActive ? true : depth < 1);
      if (isExpanded && node.children && node.children.length > 0) {
        node.children.forEach((child: any) => traverse(child, depth + 1));
      }
    };
    groupedQuarterDashboardData.forEach(node => traverse(node, 0));
    return list;
  }, [groupedQuarterDashboardData, expandedQuarterGroups, isAnyFilterActive]);

  const groupedPlanQuarterAreaData = useMemo(() => {
    const planMap: Record<number, { plan: Plan; tasks: Task[] }> = {};
    plans.forEach(p => { planMap[p.id] = { plan: p, tasks: [] }; });
    const NO_PLAN_ID = 0;
    planMap[NO_PLAN_ID] = { plan: { id: 0, name: "Sem Plano Vinculado", description: "" }, tasks: [] };

    filteredTasks.forEach(t => {
      if (t.planId && planMap[t.planId]) {
        planMap[t.planId].tasks.push(t);
      } else {
        planMap[NO_PLAN_ID].tasks.push(t);
      }
    });

    const getMinMaxDates = (taskList: Task[]) => {
      let minMs: number | null = null, maxMs: number | null = null;
      let minStr: string | null = null, maxStr: string | null = null;
      const parseDateToMs = (d: string) => {
        const p = new Date(d);
        return isNaN(p.getTime()) ? null : p.getTime();
      };
      taskList.forEach(t => {
        if (t.startDate) {
          const ms = parseDateToMs(t.startDate);
          if (ms !== null) {
            if (minMs === null || ms < minMs) { minMs = ms; minStr = t.startDate; }
            if (maxMs === null || ms > maxMs) { maxMs = ms; maxStr = t.startDate; }
          }
        }
        if (t.endDate) {
          const ms = parseDateToMs(t.endDate);
          if (ms !== null) {
            if (minMs === null || ms < minMs) { minMs = ms; minStr = t.endDate; }
            if (maxMs === null || ms > maxMs) { maxMs = ms; maxStr = t.endDate; }
          }
        }
      });
      return { startDate: minStr, endDate: maxStr };
    };

    const getTaskStats = (taskList: Task[]) => {
      const total = taskList.length;
      const pending = taskList.filter(t => normalizeStatus(t.status) === "Não iniciada").length;
      const inProgress = taskList.filter(t => normalizeStatus(t.status) === "Em andamento").length;
      const completed = taskList.filter(t => normalizeStatus(t.status) === "Concluída").length;
      const progressSum = taskList.reduce((acc, t) => acc + (t.progress || 0), 0);
      const avgProgress = total > 0 ? Math.round(progressSum / total) : 0;
      return { total, pending, inProgress, completed, avgProgress, ...getMinMaxDates(taskList) };
    };

    const tree: any[] = [];

    Object.keys(planMap).forEach(pKey => {
      const pId = Number(pKey);
      const planEntry = planMap[pId];
      if (planEntry.tasks.length === 0) return;

      const planStats = getTaskStats(planEntry.tasks);

      // Now group by Quarter first
      const quarterMap: Record<number, { name: string; tasks: Task[] }> = {
        1: { name: "1º Trimestre (Jan - Mar)", tasks: [] },
        2: { name: "2º Trimestre (Abr - Jun)", tasks: [] },
        3: { name: "3º Trimestre (Jul - Set)", tasks: [] },
        4: { name: "4º Trimestre (Out - Dez)", tasks: [] },
        0: { name: "Sem Período Trimestral", tasks: [] }
      };

      const taskInQuarter = (tk: Task, q: number): boolean => {
        if (!tk.endDate) return false;
        const startMonth = (q - 1) * 3 + 1;
        const padM1 = startMonth.toString().padStart(2, "0");
        const padM2 = (startMonth + 1).toString().padStart(2, "0");
        const padM3 = (startMonth + 2).toString().padStart(2, "0");
        
        if (tk.endDate.includes(`-${padM1}-`) || tk.endDate.includes(`-${padM2}-`) || tk.endDate.includes(`-${padM3}-`)) return true;
        
        const d = new Date(tk.endDate);
        if (!isNaN(d.getTime())) {
          const m = d.getUTCMonth() + 1;
          if (m === startMonth || m === startMonth + 1 || m === startMonth + 2) return true;
        }
        return false;
      };

      planEntry.tasks.forEach(t => {
        let assigned = false;
        for (let q = 1; q <= 4; q++) {
          if (taskInQuarter(t, q)) {
            quarterMap[q].tasks.push(t);
            assigned = true;
          }
        }
        if (!assigned) {
          quarterMap[0].tasks.push(t);
        }
      });

      const quarterNodes: any[] = [];
      Object.keys(quarterMap).forEach(qKey => {
        const qId = Number(qKey);
        const qEntry = quarterMap[qId];
        if (qEntry.tasks.length === 0) return;

        const qStats = getTaskStats(qEntry.tasks);

        // Under each quarter, group by Area
        const areaMap: Record<number, { area: Area; tasks: Task[] }> = {};
        areas.forEach(a => { areaMap[a.id] = { area: a, tasks: [] }; });
        const NO_AREA_ID = 0;
        areaMap[NO_AREA_ID] = { area: { id: 0, name: "Sem Área de Atuação" }, tasks: [] };

        qEntry.tasks.forEach(t => {
          if (t.areaIds && t.areaIds.length > 0) {
            t.areaIds.forEach(aId => {
              if (areaMap[aId]) areaMap[aId].tasks.push(t);
              else areaMap[NO_AREA_ID].tasks.push(t);
            });
          } else {
            areaMap[NO_AREA_ID].tasks.push(t);
          }
        });

        const areaNodes: any[] = [];
        Object.keys(areaMap).forEach(aKey => {
          const aId = Number(aKey);
          const areaEntry = areaMap[aId];
          if (areaEntry.tasks.length === 0) return;

          const areaStats = getTaskStats(areaEntry.tasks);
          areaNodes.push({
            id: `p-${pId}-q-${qId}-a-${aId}`,
            name: areaEntry.area.name,
            type: "area",
            ...areaStats,
            children: []
          });
        });

        areaNodes.sort((a, b) => a.name.localeCompare(b.name));

        quarterNodes.push({
          id: `p-${pId}-q-${qId}`,
          name: qEntry.name,
          type: "quarter",
          ...qStats,
          children: areaNodes
        });
      });

      quarterNodes.sort((a, b) => a.name.localeCompare(b.name));

      tree.push({
        id: `p-${pId}`,
        name: planEntry.plan.name,
        type: "plan",
        ...planStats,
        children: quarterNodes
      });
    });

    tree.sort((a, b) => a.name.localeCompare(b.name));
    return tree;
  }, [filteredTasks, plans, areas]);

  const visiblePlanQuarterAreaGroupedRows = useMemo(() => {
    const list: any[] = [];
    const traverse = (node: any, depth: number) => {
      list.push({ ...node, depth });
      const isExpanded = expandedPlanQuarterAreaGroups[node.id] !== undefined ? expandedPlanQuarterAreaGroups[node.id] : (isAnyFilterActive ? true : depth < 1);
      if (isExpanded && node.children && node.children.length > 0) {
        node.children.forEach((child: any) => traverse(child, depth + 1));
      }
    };
    groupedPlanQuarterAreaData.forEach(node => traverse(node, 0));
    return list;
  }, [groupedPlanQuarterAreaData, expandedPlanQuarterAreaGroups, isAnyFilterActive]);

  const planAreaTimelineData = useMemo(() => {
    const planMap: Record<number, { plan: Plan; tasks: Task[]; areaMap: Record<number, { area: Pick<Area, "id"|"name">; tasks: Task[] }> }> = {};
    
    plans.forEach(p => {
      planMap[p.id] = { plan: p, tasks: [], areaMap: {} };
    });
    const NO_PLAN_ID = 0;
    planMap[NO_PLAN_ID] = { plan: { id: 0, name: "Sem Plano Vinculado", description: "" }, tasks: [], areaMap: {} };

    // Group tasks
    filteredTasks.forEach(t => {
      const pId = t.planId || NO_PLAN_ID;
      if (!planMap[pId]) return;
      planMap[pId].tasks.push(t);
      
      const hasArea = t.areaIds && t.areaIds.length > 0;
      let areaList = hasArea ? t.areaIds : [0];
      
      if (selectedAreaIds.length > 0) {
        if (hasArea) {
          areaList = t.areaIds.filter(id => selectedAreaIds.includes(id));
        } else {
          areaList = [];
        }
      }
      
      areaList.forEach(aId => {
        if (!planMap[pId].areaMap[aId]) {
           planMap[pId].areaMap[aId] = {
             area: aId ? areas.find(a => a.id === aId) || { id: 0, name: "Sem Área" } : { id: 0, name: "Sem Área" },
             tasks: []
           };
        }
        planMap[pId].areaMap[aId].tasks.push(t);
      });
    });

    const taskInQuarter = (tk: Task, q: number): boolean => {
      if (!tk.endDate) return false;
      const startMonth = (q - 1) * 3 + 1;
      const padM1 = startMonth.toString().padStart(2, "0");
      const padM2 = (startMonth + 1).toString().padStart(2, "0");
      const padM3 = (startMonth + 2).toString().padStart(2, "0");
      if (tk.endDate.includes(`-${padM1}-`) || tk.endDate.includes(`-${padM2}-`) || tk.endDate.includes(`-${padM3}-`)) return true;
      try {
        const d = new Date(tk.endDate);
        const m = d.getUTCMonth() + 1;
        if (m >= startMonth && m <= startMonth + 2) return true;
      } catch (e) {
        return false;
      }
      return false;
    };

    const getQuarterStats = (taskList: Task[]) => {
      const quarters: Record<number, any> = {
        1: { total: 0, pending: 0, inProgress: 0, completed: 0, sumProgress: 0, progress: 0 },
        2: { total: 0, pending: 0, inProgress: 0, completed: 0, sumProgress: 0, progress: 0 },
        3: { total: 0, pending: 0, inProgress: 0, completed: 0, sumProgress: 0, progress: 0 },
        4: { total: 0, pending: 0, inProgress: 0, completed: 0, sumProgress: 0, progress: 0 }
      };

      taskList.forEach(t => {
        for (let q = 1; q <= 4; q++) {
          if (taskInQuarter(t, q)) {
            const stats = quarters[q];
            stats.total++;
            const status = normalizeStatus(t.status);
            if (status === "Concluída") stats.completed++;
            else if (status === "Em andamento") stats.inProgress++;
            else stats.pending++;
            
            stats.sumProgress += (t.progress || 0);
          }
        }
      });

      [1,2,3,4].forEach(q => {
        quarters[q].progress = quarters[q].total > 0 ? Math.round(quarters[q].sumProgress / quarters[q].total) : 0;
      });
      return quarters;
    };

    const getMinMaxDates = (taskList: Task[]) => {
      let min: Date | null = null;
      let max: Date | null = null;
      taskList.forEach(t => {
        if (t.startDate) {
          const d1 = new Date(t.startDate);
          if (!isNaN(d1.getTime())) {
            if (!min || d1 < min) min = d1;
            if (!max || d1 > max) max = d1;
          }
        }
        if (t.endDate) {
          const d2 = new Date(t.endDate);
          if (!isNaN(d2.getTime())) {
            if (!min || d2 < min) min = d2;
            if (!max || d2 > max) max = d2;
          }
        }
      });
      return {
        startDate: min ? min.toISOString().split("T")[0] : null,
        endDate: max ? max.toISOString().split("T")[0] : null
      };
    };

    const tree: any[] = [];
    Object.keys(planMap).forEach(pKey => {
      const pId = Number(pKey);
      const planEntry = planMap[pId];
      if (planEntry.tasks.length === 0) return;

      const planDates = getMinMaxDates(planEntry.tasks);
      const planQuarters = getQuarterStats(planEntry.tasks);

      const areaNodes: any[] = [];
      Object.keys(planEntry.areaMap).forEach(aKey => {
         const aId = Number(aKey);
         const areaEntry = planEntry.areaMap[aId];
         if (areaEntry.tasks.length === 0) return;
         
         const areaDates = getMinMaxDates(areaEntry.tasks);
         const areaQuarters = getQuarterStats(areaEntry.tasks);

         areaNodes.push({
           id: `pt-p${pId}-a${aId}`,
           type: "area",
           name: areaEntry.area.name,
           startDate: areaDates.startDate,
           endDate: areaDates.endDate,
           quarters: areaQuarters,
           children: []
         });
      });

      areaNodes.sort((a,b) => a.name.localeCompare(b.name));

      tree.push({
        id: `pt-p-${pId}`,
        type: "plan",
        name: planEntry.plan.name,
        startDate: planDates.startDate,
        endDate: planDates.endDate,
        quarters: planQuarters,
        children: areaNodes
      });
    });

    tree.sort((a, b) => a.name.localeCompare(b.name));
    return tree;
  }, [filteredTasks, plans, areas, selectedAreaIds]);

  const [expandedTimelineGroups, setExpandedTimelineGroups] = useState<Record<string, boolean>>({});

  const visibleTimelineRows = useMemo(() => {
    const list: any[] = [];
    const traverse = (node: any, depth: number) => {
      list.push({ ...node, depth });
      const isExpanded = expandedTimelineGroups[node.id] !== undefined ? expandedTimelineGroups[node.id] : (isAnyFilterActive ? true : depth < 1);
      if (isExpanded && node.children && node.children.length > 0) {
        node.children.forEach((child: any) => traverse(child, depth + 1));
      }
    };
    planAreaTimelineData.forEach(node => traverse(node, 0));
    return list;
  }, [planAreaTimelineData, expandedTimelineGroups, isAnyFilterActive]);

  // Format dates elegantly for Portuguese/Brazilian locale or ISO
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/D";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "N/D";
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
    } catch {
      return "N/D";
    }
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return null;
    }
  };

  // Submit task create or edit form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Título da tarefa: obrigatório.
    if (!editingTask.title?.trim()) {
      showToast("Validação", "O título da tarefa é obrigatório.", "warning");
      return;
    }

    // 2. Data Início e Data fim: obrigatório.
    if (!editingTask.startDate) {
      showToast("Validação", "A data de início é obrigatória.", "warning");
      return;
    }
    if (!editingTask.endDate) {
      showToast("Validação", "A data de fim é obrigatória.", "warning");
      return;
    }

    // 3. Data Fim não pode ser menor que a Data Início.
    const startD = new Date(editingTask.startDate);
    const endD = new Date(editingTask.endDate);
    if (endD < startD) {
      showToast("Validação", "A data de fim não pode ser menor que a data de início.", "warning");
      return;
    }

    // 4. Prioridade: Obrigatório.
    if (!editingTask.priority) {
      showToast("Validação", "A prioridade é obrigatória.", "warning");
      return;
    }

    // 5. Plano de Atividades (Vincular a um): Obrigatório.
    if (!editingTask.planId) {
      showToast("Validação", "O vínculo com um Plano de Atividades é obrigatório.", "warning");
      return;
    }

    // 6. Áreas de Vinculação: Obrigatório.
    if (!editingTask.areaIds || editingTask.areaIds.length === 0) {
      showToast("Validação", "A seleção de pelo menos uma Área de Vinculação é obrigatória.", "warning");
      return;
    }

    // 7. Categorias: Obrigatório, pelo menos uma
    if (!editingTask.categoryIds || editingTask.categoryIds.length === 0) {
      showToast("Validação", "A seleção de pelo menos uma Categoria é obrigatória.", "warning");
      return;
    }

    // 8. Responsáveis Designados: Obrigatório, pelo menos um.
    if (!editingTask.responsibleIds || editingTask.responsibleIds.length === 0) {
      showToast("Validação", "A designação de pelo menos um Responsável é obrigatória.", "warning");
      return;
    }

    try {
      const isEdit = formMode === "edit";
      const url = isEdit ? `/api/tasks/${editingTask.id}` : "/api/tasks";
      const method = isEdit ? "PUT" : "POST";

      const finalProgress = editingTask.progress ?? 0;
      const finalStatus = finalProgress === 100 ? "Concluída" : finalProgress > 0 ? "Em andamento" : "Não iniciada";
      const author = currentUser?.name || "Administrador";

      const payload = {
        ...editingTask,
        progress: finalProgress,
        status: finalStatus,
        updatedBy: author
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();

      if (resData.success && resData.data) {
        showToast(
          "Sucesso",
          isEdit ? "Tarefa atualizada com sucesso no banco de dados." : "Tarefa criada com sucesso.",
          "success"
        );
        setIsFormOpen(false);
        setEditingTask({});
        
        // Force refresh all tasks to ensure correct state and Rollup updates are loaded
        await reloadTasks();
      } else {
        showToast("Erro", resData.error || "Erro ao processar requisição.", "error");
      }
    } catch (err: any) {
      showToast("Salvamento Falhou", "Ocorreu um erro ao persistir os dados da tarefa.", "error");
    }
  };

  // Open modal for task creation
  const handleAddNewTask = (parentId: number | null = null) => {
    setFormMode("create");
    
    let defaultPlanId = planFilter !== "all" && planFilter !== "" ? Number(planFilter) : null;
    let defaultAreaIds = selectedAreaIds.length > 0 ? selectedAreaIds : [];
    let defaultCategoryIds: number[] = [];
    let defaultResponsibleIds = selectedResponsibleIds.length > 0 ? selectedResponsibleIds : [];

    if (parentId !== null) {
      const parentTask = tasks.find(t => t.id === parentId);
      if (parentTask) {
        defaultPlanId = parentTask.planId || defaultPlanId;
        defaultAreaIds = parentTask.areaIds?.length ? parentTask.areaIds : defaultAreaIds;
        defaultCategoryIds = parentTask.categoryIds || [];
        defaultResponsibleIds = parentTask.responsibleIds || [];
      }
    }

    setEditingTask({
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      status: "pending",
      parentId: parentId,
      progress: 0,
      priority: "Média",
      categoryIds: defaultCategoryIds,
      assignedTo: "",
      notes: "",
      planId: defaultPlanId,
      areaIds: defaultAreaIds,
      responsibleIds: defaultResponsibleIds
    });
    setIsFormOpen(true);
  };

  // Open modal for task editing
  const handleEditTask = (task: Task) => {
    setFormMode("edit");
    // Format dates back to YYYY-MM-DD for form binding
    const fmtDate = (d: string | null) => {
      if (!d) return "";
      try {
        return new Date(d).toISOString().split("T")[0];
      } catch {
        return "";
      }
    };

    setEditingTask({
      ...task,
      startDate: fmtDate(task.startDate),
      endDate: fmtDate(task.endDate),
      planId: task.planId || null,
      areaIds: task.areaIds || [],
      responsibleIds: task.responsibleIds || []
    });
    setIsFormOpen(true);
  };

  // Handle task deletion
  const handleDeleteTask = async (id: number) => {
    const countSubtasks = (taskId: number): number => {
      let subCount = 0;
      const directChildren = tasks.filter(t => t.parentId === taskId);
      subCount += directChildren.length;
      for (const child of directChildren) {
        subCount += countSubtasks(child.id);
      }
      return subCount;
    };
    
    const subtaskCount = countSubtasks(id);
    const subtaskMessage = subtaskCount > 0 
      ? `Esta tarefa possui ${subtaskCount} tarefa(s) filha(s) que também será(ão) excluída(s).\n\nDeseja realmente excluir a tarefa e suas subtarefas?` 
      : "Deseja realmente excluir a tarefa?";

    setConfirmState({
      type: "confirm",
      title: "Excluir Tarefa",
      message: `Atenção: A exclusão é permanente.\n\n${subtaskMessage}`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
          const resData = await res.json();
          if (resData.success) {
            showToast("Sucesso", "Tarefa excluída do banco.", "success");
            await reloadTasks();
          } else {
            showToast("Erro", resData.error || "Ocorreu uma falha ao remover a tarefa.", "error");
          }
        } catch (err: any) {
          showToast("Erro de Rede", "Erro ao conectar ao servidor para excluir tarefa.", "error");
        }
      }
    });
  };

  const handleQuickStatusChange = async (task: Task, newStatus: string) => {
    let finalProgress = Number(task.progress) || 0;
    if (newStatus === "Não iniciada") {
      finalProgress = 0;
    } else if (newStatus === "Concluída") {
      finalProgress = 100;
    } else if (newStatus === "Em andamento") {
      if (finalProgress === 0 || finalProgress === 100) {
        finalProgress = 50; // set intermediate progress
      }
    }

    try {
      const payload = {
        ...task,
        progress: finalProgress,
        status: newStatus
      };

      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();

      if (resData.success) {
        showToast("Progresso Atualizado", `Tarefa "${task.title}" movida para "${newStatus}".`, "success");
        await reloadTasks();
      } else {
        showToast("Erro", resData.error || "Erro ao movimentar tarefa.", "error");
      }
    } catch {
      showToast("Falha de Rede", "Erro ao conectar-se ao servidor.", "error");
    }
  };

  // Recursively check if any children matches search criteria
  const childMatchesOrIsPath = (id: number): boolean => {
    const task = taskById[id];
    if (!task) return false;
    if (matchesFilters(task)) return true;
    
    const children = childrenMap[id] || [];
    return children.some(c => childMatchesOrIsPath(c.id));
  };

  const timelineTasks = useMemo(() => {
    if (timelineTaskId === null) return [];
    
    // Find ancestors up to root
    const ancestors: Task[] = [];
    let currId: number | null | undefined = taskById[timelineTaskId]?.parentId;
    while (currId && taskById[currId]) {
      ancestors.unshift(taskById[currId]);
      currId = taskById[currId].parentId;
    }

    const result: { task: Task; depth: number; isTarget: boolean; isAncestor: boolean }[] = [];
    
    // Add ancestors
    ancestors.forEach((anc, idx) => {
      result.push({ task: anc, depth: idx, isTarget: false, isAncestor: true });
    });

    const targetDepth = ancestors.length;

    // Collect target and its descendants
    const collect = (id: number, currentDepth: number, isTargetNode: boolean = false) => {
      const t = taskById[id];
      if (t) result.push({ task: t, depth: currentDepth, isTarget: isTargetNode, isAncestor: false });
      const children = childrenMap[id] || [];
      const sortedChildren = [...children].sort((a, b) => new Date(a.endDate || "2099-01-01").getTime() - new Date(b.endDate || "2099-01-01").getTime());
      sortedChildren.forEach(c => collect(c.id, currentDepth + 1, false));
    };
    
    collect(timelineTaskId, targetDepth, true);
    
    return result;
  }, [timelineTaskId, taskById, childrenMap]);

  // Get color definitions based on priority
  const getPriorityBadgeClass = (priority: string | undefined) => {
    switch (priority) {
      case "Alta":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Média":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Baixa":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Get status class
  const getStatusBadgeClass = (status: string | undefined) => {
    switch (normalizeStatus(status)) {
      case "Concluída":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "Em andamento":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "Não iniciada":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-100 text-slate-500 border-slate-200";
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    return status || "Não iniciada";
  };

  const getStatusFromProgress = (progress: number) => {
    if (progress === 100) return "Concluída";
    if (progress > 0) return "Em andamento";
    return "Não iniciada";
  };

  const getTaskDisplayName = (t: Task | undefined) => {
    if (!t) return "";
    let prefix = "";
    let hasAbbrev = false;

    if (t.areaIds && t.areaIds.length > 0) {
      const abbrevs = t.areaIds.map(id => areas.find(a => a.id === id)?.abbreviation).filter(Boolean);
      if (abbrevs.length > 0) {
        prefix = `[${abbrevs.join("/")}:${t.id}] `;
        hasAbbrev = true;
      }
    }
    
    if (!hasAbbrev) {
      prefix = `[${t.id}] `;
    }

    // Remove old format if it was saved in the title (like "[FI] ") to avoid duplication, or we just trust clean titles
    return `${prefix}${t.title.replace(/^\[.*?\]\s*/, '')}`;
  };

  if (activeSubTab !== "tasks" && activeSubTab !== "dashboard") {
    const configActiveTab = activeSubTab;
    return (
      <div className="max-w-7xl mx-auto w-full bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-left flex flex-col relative h-[80vh]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {activeSubTab === 'plans' ? 'Cadastro de Planos' : (activeSubTab === 'areas' ? 'Cadastro de Áreas Temáticas' : activeSubTab === 'categories' ? 'Cadastro de Categorias' : 'Cadastro de Responsáveis Técnicos')}
            </h3>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {activeSubTab === 'plans' ? 'Gerencie os planos de origem das atividades planejadas.' : (activeSubTab === 'areas' ? 'Gerencie as áreas temáticas para classificação das tarefas.' : activeSubTab === 'categories' ? 'Gerencie as categorias estratégicas para agrupar atividades.' : 'Gerencie os analistas técnicos e encarregados das atribuições de tarefas no Distrito Federal.')}
            </p>
          </div>
          <button
            onClick={() => setIsRegModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20"
          >
            <Plus size={16} /> NOVO {activeSubTab === 'plans' ? 'PLANO' : (activeSubTab === 'areas' ? 'ÁREA' : activeSubTab === 'categories' ? 'CATEGORIA' : 'RESPONSÁVEL')}
          </button>
        </div>

        {/* Modal Overlay for Forms */}
        {isRegModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
              <button 
                onClick={() => { 
                  setIsRegModalOpen(false); 
                  setEditingRegId(null); 
                  setRegName(""); 
                  setRegAbbreviation("");
                  setRegDesc(""); 
                  setRegAreaIds([]); 
                  setRegEmail(""); 
                  setRegRole(""); 
                }} 
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
              
              <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-tight flex items-center gap-2">
                {editingRegId !== null ? <Edit2 size={18} className="text-adasa-mid" /> : <Plus size={18} className="text-adasa-mid" />}
                {editingRegId !== null ? "Editar Registro" : "Novo Cadastro"}
              </h3>

              {configActiveTab === "plans" && (
                <form onSubmit={handlePlanSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Plano</label>
                    <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Ex: Plano de Atividades..." className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-adasa-mid outline-none transition-all placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest block font-medium">Descrição (Opcional)</label>
                    <textarea rows={4} value={regDesc} onChange={(e) => setRegDesc(e.target.value)} placeholder="Objetivos, metas..." className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-700 focus:border-adasa-mid outline-none transition-all placeholder:text-slate-400"></textarea>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><User size={12}/> Autor da Modificação</label>
                    <input type="text" value={regUpdatedBy} onChange={(e) => setRegUpdatedBy(e.target.value)} placeholder="Ex: Thiago Pires" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-adasa-mid outline-none transition-all placeholder:text-slate-400" />
                  </div>
                  <button type="submit" className="w-full py-3.5 mt-2 font-black text-xs text-white bg-adasa-mid hover:bg-adasa-dark rounded-xl transition shadow-md">{editingRegId !== null ? "Salvar Alterações" : "Cadastrar Plano"}</button>
                </form>
              )}

              {configActiveTab === "areas" && (
                <form onSubmit={handleAreaSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Área/Setor</label>
                    <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Ex: Regulação Econômica" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-adasa-mid outline-none transition-all placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Sigla (Duas Letras)</label>
                    <input type="text" required maxLength={2} value={regAbbreviation} onChange={(e) => setRegAbbreviation(e.target.value.toUpperCase())} placeholder="Ex: RE" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-adasa-mid outline-none transition-all placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><User size={12}/> Autor da Modificação</label>
                    <input type="text" value={regUpdatedBy} onChange={(e) => setRegUpdatedBy(e.target.value)} placeholder="Ex: Thiago Pires" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-adasa-mid outline-none transition-all placeholder:text-slate-400" />
                  </div>
                  <button type="submit" className="w-full py-3.5 mt-2 font-black text-xs text-white bg-adasa-mid hover:bg-adasa-dark rounded-xl transition shadow-md">{editingRegId !== null ? "Salvar Alterações" : "Cadastrar Área"}</button>
                </form>
              )}

              {configActiveTab === "categories" && (
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Categoria</label>
                    <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} required placeholder="Ex: Auditoria" className="w-full bg-slate-50 border-2 border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-adasa-mid/50 focus:border-adasa-mid transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Áreas Temáticas Vinculadas</label>
                    <div className="max-h-48 overflow-y-auto border-2 border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                      {areas.map(a => (
                        <label key={a.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-white rounded transition">
                          <input 
                            type="checkbox" 
                            checked={regAreaIds.includes(a.id)}
                            onChange={(e) => {
                              if (e.target.checked) setRegAreaIds([...regAreaIds, a.id]);
                              else setRegAreaIds(regAreaIds.filter(id => id !== a.id));
                            }}
                            className="w-4 h-4 text-adasa-mid rounded border-slate-300 focus:ring-adasa-mid"
                          />
                          <span className="text-xs font-semibold text-slate-700">{a.name}</span>
                        </label>
                      ))}
                      {areas.length === 0 && <span className="text-xs text-slate-500 italic block">Nenhuma área cadastrada.</span>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><User size={12}/> Autor da Modificação</label>
                    <input type="text" value={regUpdatedBy} onChange={(e) => setRegUpdatedBy(e.target.value)} placeholder="Ex: Thiago Pires" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-adasa-mid outline-none transition-all placeholder:text-slate-400" />
                  </div>
                  <button type="submit" className="w-full py-3.5 mt-2 flex-1 bg-adasa-mid text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-adasa-dark transition-all shadow-md">{editingRegId !== null ? "Atualizar" : "Salvar Categoria"}</button>
                </form>
              )}

              {configActiveTab === "responsibles" && (
                <form onSubmit={handleResponsibleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Responsável / Equipe</label>
                    <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Ex: Dra. Ana Paula" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-adasa-mid outline-none transition-all placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Email (Opcional)</label>
                    <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="Ex: email@adasa.df.gov.br" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-adasa-mid outline-none transition-all placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo/Função (Opcional)</label>
                    <input type="text" value={regRole} onChange={(e) => setRegRole(e.target.value)} placeholder="Ex: REGULADOR" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-adasa-mid outline-none transition-all placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Áreas de Atuação Vinculadas</label>
                    <div className="max-h-48 overflow-y-auto border-2 border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                      {areas.map(a => (
                        <label key={a.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-white rounded transition">
                          <input 
                            type="checkbox" 
                            checked={regAreaIds.includes(a.id)}
                            onChange={(e) => {
                              if (e.target.checked) setRegAreaIds([...regAreaIds, a.id]);
                              else setRegAreaIds(regAreaIds.filter(id => id !== a.id));
                            }}
                            className="w-4 h-4 text-adasa-mid rounded border-slate-300 focus:ring-adasa-mid"
                          />
                          <span className="text-xs font-semibold text-slate-700">{a.name}</span>
                        </label>
                      ))}
                      {areas.length === 0 && <span className="text-xs text-slate-500 italic block">Nenhuma área cadastrada.</span>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><User size={12}/> Autor da Modificação</label>
                    <input type="text" value={regUpdatedBy} onChange={(e) => setRegUpdatedBy(e.target.value)} placeholder="Ex: Thiago Pires" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-adasa-mid outline-none transition-all placeholder:text-slate-400" />
                  </div>
                  <button type="submit" className="w-full py-3.5 mt-2 font-black text-xs text-white bg-adasa-mid hover:bg-adasa-dark rounded-xl transition shadow-md">{editingRegId !== null ? "Salvar Alterações" : "Cadastrar Responsável"}</button>
                </form>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
          {configActiveTab === "plans" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map(p => (
                <div key={p.id} className="p-5 border border-slate-200 rounded-3xl bg-white hover:border-indigo-200 transition-all shadow-sm hover:shadow-md flex flex-col min-h-[160px]">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 bg-adasa-light text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-adasa-light/20">
                      <LayoutGrid size={24} />
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <span className="block text-base font-black text-slate-800 line-clamp-2 leading-tight" title={p.name}>{p.name}</span>
                      {p.description && <span className="block text-xs text-slate-500 mt-1.5 line-clamp-2 font-medium">{p.description}</span>}
                    </div>
                  </div>
                  {p.updatedAt && (
                    <div className="text-[10px] text-slate-400 mt-1 font-semibold flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded w-fit">
                      <Clock size={10} /> Atualizado: {formatDateTime(p.updatedAt)} por {p.updatedBy || 'Sistema'}
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-black text-slate-600 uppercase">
                      <ListTodo size={12} /> {tasks.filter(t => t.planId === p.id).length} Tarefas
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => { setEditingRegId(p.id); setRegName(p.name); setRegDesc(p.description || ""); setIsRegModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                       <button onClick={() => handlePlanDelete(p.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {plans.length === 0 && (
                <div className="col-span-full text-center text-slate-400 font-medium italic text-sm py-10 bg-slate-50 rounded-2xl border">Nenhum Plano cadastrado no Distrito Federal.</div>
              )}
            </div>
          )}

          {configActiveTab === "areas" && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {areas.map(a => (
                <div key={a.id} className="p-5 border border-slate-200 rounded-3xl bg-white hover:border-indigo-200 transition-all shadow-sm hover:shadow-md flex flex-col">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 bg-slate-800 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md">
                      <Tag size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="block text-sm font-black text-slate-800 leading-tight truncate" title={a.name}>{a.name}</span>
                        {a.abbreviation && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-adasa-mid/10 text-adasa-mid uppercase">
                            {a.abbreviation}
                          </span>
                        )}
                      </div>
                      {a.updatedAt && (
                        <div className="text-[9px] text-slate-400 mt-1.5 font-semibold flex items-center gap-1">
                          <Clock size={10} /> Atualizado: {formatDateTime(a.updatedAt)} por {a.updatedBy || 'Sistema'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="bg-slate-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-black text-slate-600 uppercase border border-slate-200">
                      <LayoutGrid size={12} /> {categories.filter(c => c.areaIds?.includes(a.id)).length} Categorias
                    </div>
                    <div className="flex gap-1.5">
                       <button onClick={() => { setEditingRegId(a.id); setRegName(a.name); setRegAbbreviation(a.abbreviation || ""); setIsRegModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                       <button onClick={() => handleAreaDelete(a.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {areas.length === 0 && (
                <div className="col-span-full text-center text-slate-400 font-medium italic text-sm py-10 bg-slate-50 rounded-2xl border">Nenhuma Área temática cadastrada no Distrito Federal.</div>
              )}
            </div>
          )}

          {configActiveTab === "categories" && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {categories.map(c => (
                <div key={c.id} className="p-5 border border-slate-200 rounded-3xl bg-white hover:border-indigo-200 transition-all shadow-sm hover:shadow-md flex flex-col">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <span className="block text-sm font-black text-slate-800 line-clamp-2 leading-tight mb-1">{c.name}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.areaIds?.map(aid => {
                           const areaName = areas.find(a => a.id === aid)?.name;
                           return areaName ? <span key={aid} className="inline-block text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase tracking-wider">{areaName}</span> : null;
                        })}
                        {(!c.areaIds || c.areaIds.length === 0) && <span className="inline-block text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase tracking-wider">Sem área</span>}
                      </div>
                    </div>
                  </div>
                  {c.updatedAt && (
                    <div className="text-[10px] text-slate-400 mb-2 font-semibold flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded w-fit">
                      <Clock size={10} /> Atualizado: {formatDateTime(c.updatedAt)} por {c.updatedBy || 'Sistema'}
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-end pt-3 border-t border-slate-100">
                    <div className="flex gap-1.5">
                       <button onClick={() => { setEditingRegId(c.id); setRegName(c.name); setRegAreaIds(c.areaIds || []); setIsRegModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                       <button onClick={() => handleCategoryDelete(c.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="col-span-full text-center text-slate-400 font-medium italic text-sm py-10 bg-slate-50 rounded-2xl border">Nenhuma categoria cadastrada.</div>
              )}
            </div>
          )}

          {configActiveTab === "responsibles" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {responsibles.map(r => (
                <div key={r.id} className="p-5 border border-slate-200 rounded-3xl bg-white hover:border-indigo-200 transition-all shadow-sm hover:shadow-md flex flex-col">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-lg shadow-indigo-600/20 uppercase tracking-tighter">
                      {r.name.substring(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <span className="block text-base font-black text-slate-800 line-clamp-1 truncate" title={r.name}>{r.name}</span>
                      <div className="flex items-center gap-1.5 mt-1 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                        <Briefcase size={12} /> {r.role || "REGULADOR"}
                      </div>
                    </div>
                  </div>
                  {r.updatedAt && (
                    <div className="text-[10px] text-slate-400 mb-2 font-semibold flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded w-fit">
                      <Clock size={10} /> Atualizado: {formatDateTime(r.updatedAt)} por {r.updatedBy || 'Sistema'}
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-black text-slate-600 uppercase">
                      <FileText size={12} /> {tasks.filter(t => t.responsibleIds?.includes(r.id)).length} Tarefas Atribuídas
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => { setEditingRegId(r.id); setRegName(r.name); setRegEmail(r.email || ""); setRegRole(r.role || ""); setRegAreaIds(r.areaIds || []); setIsRegModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                       <button onClick={() => handleResponsibleDelete(r.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {responsibles.length === 0 && (
                <div className="col-span-full text-center text-slate-400 font-medium italic text-sm py-10 bg-slate-50 rounded-2xl border">Nenhum responsável cadastrado.</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeSubTab === "dashboard") {
    return (
      <div className="space-y-6 max-w-7xl mx-auto w-full pb-16 text-left">
        {/* Info Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-950 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-slate-800">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 space-y-2">
            <span className="text-[10px] bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full font-black uppercase tracking-widest leading-none">
              Mapeamento & Monitoramento Estratégico
            </span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-none">
              Painel de Acompanhamento de Atividades
            </h2>
            <p className="text-xs md:text-sm text-indigo-200 font-medium max-w-3xl leading-relaxed">
              Monitore de forma consolidada todos os cronogramas de atividades do Distrito Federal. Os indicadores e gráficos abaixo são recalculados instantaneamente de acordo com as seleções de filtros aplicadas.
            </p>
          </div>
        </div>

        {/* REPLICATED FILTERS CARD */}
        <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm space-y-4 relative">
          <button 
            onClick={() => setIsDashboardFiltersExpanded(!isDashboardFiltersExpanded)}
            className="w-full text-left flex justify-between items-center group focus:outline-none"
          >
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <Filter size={18} className="text-indigo-600" /> Filtros do Painel
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Filtre as atividades em tempo real para analisar o status de execução correspondente.
              </p>
            </div>
            <div className="bg-slate-50 group-hover:bg-indigo-50 border border-slate-200 group-hover:border-indigo-200 text-slate-400 group-hover:text-indigo-600 p-2 rounded-xl transition-colors">
              {isDashboardFiltersExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </button>

          {isDashboardFiltersExpanded && (
            <div className="bg-slate-50/60 rounded-3xl border border-slate-200/60 p-5 space-y-5 animate-in slide-in-from-top-4 fade-in duration-300 mt-4">
              {/* Row 1: Plan Select */}
            <div className="flex flex-col gap-1.5 max-w-xs">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">📁 Plano</span>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-700 font-bold"
              >
                <option value="all">Todos os Planos</option>
                {[...plans]
                  .sort((a, b) => {
                    const yearA = parseInt(a.name.match(/\d{4}/)?.[0] || "0", 10);
                    const yearB = parseInt(b.name.match(/\d{4}/)?.[0] || "0", 10);
                    if (yearA !== yearB) return yearB - yearA;
                    return b.id - a.id;
                  })
                  .map((p) => (
                    <option key={p.id} value={p.id.toString()}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Row 2: Area checkbox filter */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">🏷️ Filtro por Área de Atuação</span>
              <div className="flex flex-wrap gap-2">
                <label className={cn(
                  "flex items-center gap-2 cursor-pointer px-3.5 py-2 rounded-xl border text-xs font-black tracking-wide transition-all select-none",
                  selectedAreaIds.length === 0 
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                )}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedAreaIds.length === 0}
                    onChange={() => setSelectedAreaIds([])}
                  />
                  <span>TODAS AS ÁREAS</span>
                </label>
                {areas.map((area) => {
                  const isChecked = selectedAreaIds.includes(area.id);
                  return (
                    <label key={area.id} className={cn(
                      "flex items-center gap-2 cursor-pointer px-3.5 py-2 rounded-xl border text-xs font-black tracking-wide transition-all select-none uppercase",
                      isChecked 
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs ring-2 ring-indigo-50" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}>
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 text-indigo-650 rounded border-slate-350 focus:ring-indigo-100 cursor-pointer"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAreaIds((prev) => {
                              const nextAreas = [...prev, area.id];
                              setSelectedResponsibleIds(prevResps => 
                                prevResps.filter(rid => {
                                  const r = responsibles.find(x => x.id === rid);
                                  return r && r.areaIds?.some(aid => nextAreas.includes(Number(aid)));
                                })
                              );
                              return nextAreas;
                            });
                          } else {
                            setSelectedAreaIds((prev) => {
                              const nextAreas = prev.filter((id) => id !== area.id);
                              if (nextAreas.length > 0) {
                                setSelectedResponsibleIds(prevResps => 
                                  prevResps.filter(rid => {
                                    const r = responsibles.find(x => x.id === rid);
                                    return r && r.areaIds?.some(aid => nextAreas.includes(Number(aid)));
                                  })
                                );
                              }
                              return nextAreas;
                            });
                          }
                        }}
                      />
                      <span>{area.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Row 2.5: Responsible selection */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">👥 Filtro por Responsável</span>
              <div className="flex flex-wrap gap-2">
                <label className={cn(
                  "flex items-center gap-2 cursor-pointer px-3.5 py-2 rounded-xl border text-xs font-black tracking-wide transition-all select-none",
                  selectedResponsibleIds.length === 0 
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                )}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedResponsibleIds.length === 0}
                    onChange={() => setSelectedResponsibleIds([])}
                  />
                  <span>TODOS OS RESPONSÁVEIS</span>
                </label>
                {responsibles
                  .filter((resp) => {
                    if (selectedAreaIds.length === 0) return true;
                    return resp.areaIds?.some((id) => selectedAreaIds.includes(Number(id)));
                  })
                  .map((resp) => {
                    const isChecked = selectedResponsibleIds.includes(resp.id);
                    return (
                      <label key={resp.id} className={cn(
                        "flex items-center gap-2 cursor-pointer px-3.5 py-2 rounded-xl border text-xs font-black tracking-wide transition-all select-none uppercase",
                        isChecked 
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs ring-2 ring-indigo-50" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}>
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-350 focus:ring-indigo-100 cursor-pointer"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedResponsibleIds((prev) => [...prev, resp.id]);
                            } else {
                              setSelectedResponsibleIds((prev) => prev.filter((id) => id !== resp.id));
                            }
                          }}
                        />
                        <span>{resp.name}</span>
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Row 3: Status, Situation, Priority and Category */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">🚦 Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-700 font-bold"
                >
                  <option value="all">Todos os Status</option>
                  <option value="Não iniciada">NÃO INICIADA</option>
                  <option value="Em andamento">EM ANDAMENTO</option>
                  <option value="Concluída">CONCLUÍDA</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">📅 Situação</span>
                <select
                  value={situationFilter}
                  onChange={(e) => setSituationFilter(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-700 font-bold"
                >
                  <option value="all">Todas as Situações</option>
                  <option value="No Prazo">NO PRAZO</option>
                  <option value="Crítica">CRÍTICA</option>
                  <option value="Atrasada">ATRASADA</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">⚡ Prioridade</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-700 font-bold"
                >
                  <option value="all">Todas as Prioridades</option>
                  <option value="Alta">ALTA</option>
                  <option value="Média">MÉDIA</option>
                  <option value="Baixa">BAIXA</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">📂 Categoria</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-700 font-bold"
                >
                  <option value="all">Todas as Categorias</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id.toString()}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 4: Period Filter (Month, Quarter, Semester) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">📅 Tipo de Período Cronológico</span>
                <div className="flex gap-2">
                  {[
                    { id: "all", label: "TODOS" },
                    { id: "month", label: "MÊS" },
                    { id: "quarter", label: "TRIMESTRE" },
                    { id: "semester", label: "SEMESTRE" }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setPeriodTypeFilter(t.id as any);
                        setPeriodValueFilter("all");
                      }}
                      className={cn(
                        "flex-1 px-3 py-2 text-xs font-black rounded-xl border transition-all uppercase",
                        periodTypeFilter === t.id
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">🎯 Seleção do Período</span>
                {periodTypeFilter === "all" ? (
                  <div className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-100 text-slate-500 font-bold select-none h-[38px] flex items-center">
                    Selecione um tipo de período ao lado para filtrar
                  </div>
                ) : (
                  <select
                    value={periodValueFilter}
                    onChange={(e) => setPeriodValueFilter(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-700 font-bold uppercase"
                  >
                    <option value="all">Selecione o período...</option>
                    {periodTypeFilter === "month" && (
                      <>
                        <option value="1">Janeiro</option>
                        <option value="2">Fevereiro</option>
                        <option value="3">Março</option>
                        <option value="4">Abril</option>
                        <option value="5">Maio</option>
                        <option value="6">Junho</option>
                        <option value="7">Julho</option>
                        <option value="8">Agosto</option>
                        <option value="9">Setembro</option>
                        <option value="10">Outubro</option>
                        <option value="11">Novembro</option>
                        <option value="12">Dezembro</option>
                      </>
                    )}
                    {periodTypeFilter === "quarter" && (
                      <>
                        <option value="1">1º Trimestre (Jan - Mar)</option>
                        <option value="2">2º Trimestre (Abr - Jun)</option>
                        <option value="3">3º Trimestre (Jul - Set)</option>
                        <option value="4">4º Trimestre (Out - Dez)</option>
                      </>
                    )}
                    {periodTypeFilter === "semester" && (
                      <>
                        <option value="1">1º Semestre (Jan - Jun)</option>
                        <option value="2">2º Semestre (Jul - Dez)</option>
                      </>
                    )}
                  </select>
                )}
              </div>
            </div>

            {/* Clear Filters Button if any is changed */}
            {(planFilter !== "all" || selectedAreaIds.length > 0 || selectedResponsibleIds.length > 0 || statusFilter !== "all" || situationFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all" || periodTypeFilter !== "all") && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    setPlanFilter("all");
                    setSelectedAreaIds([]);
                    setSelectedResponsibleIds([]);
                    setStatusFilter("all");
                    setSituationFilter("all");
                    setPriorityFilter("all");
                    setCategoryFilter("all");
                    setPeriodTypeFilter("all");
                    setPeriodValueFilter("all");
                  }}
                  className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <X size={14} /> Limpar Todos os Filtros
                </button>
              </div>
            )}
          </div>
          )}
        </div>

        {/* METRICS BOXES (DYNAMICALLY COMPUTED FROM FILTERED SET) */}
        <div className="flex flex-col gap-4">
          {/* Global Progress Card (Highlighted on its own line) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between text-left">
            <div className="space-y-1 w-full mr-4">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Percentual de Conclusão</span>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-black text-slate-800">{dashboardStats.avgProgress}%</p>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Média</span>
              </div>
              {/* Visual Bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${dashboardStats.avgProgress}%` }}
                ></div>
              </div>
            </div>
            <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600 flex-shrink-0 animate-pulse">
              <TrendingUp size={22} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Tasks Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between text-left transition-all hover:-translate-y-1 hover:shadow-md hover:scale-[1.02] cursor-default duration-300">
              <div className="space-y-1">
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Total de Tarefas</span>
                <p className="text-3xl font-black text-slate-800">{dashboardStats.total}</p>
                <p className="text-[10px] text-slate-400 font-bold">filtradas no painel</p>
              </div>
              <div className="p-3.5 bg-indigo-50 rounded-2xl text-indigo-600">
                <FolderKanban size={22} />
              </div>
            </div>

            {/* Actions in queue Card - Not Started */}
            <div className="bg-slate-100 rounded-3xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between text-left transition-all hover:-translate-y-1 hover:shadow-md hover:scale-[1.02] cursor-default duration-300">
              <div className="space-y-1">
                <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Não Iniciadas</span>
                <p className="text-3xl font-black text-slate-800">{dashboardStats.pending}</p>
                <p className="text-[10px] text-slate-500 font-bold">tarefas pendentes</p>
              </div>
              <div className="p-3.5 bg-white rounded-2xl text-slate-500 shadow-sm border border-slate-200/40">
                <Clock size={22} />
              </div>
            </div>

            {/* Actions in queue Card - In Progress */}
            <div className="bg-blue-100 rounded-3xl border border-blue-200/80 p-5 shadow-sm flex items-center justify-between text-left transition-all hover:-translate-y-1 hover:shadow-md hover:scale-[1.02] cursor-default duration-300">
              <div className="space-y-1">
                <span className="text-[10px] font-black tracking-widest text-blue-500 uppercase">Em Andamento</span>
                <p className="text-3xl font-black text-blue-900">{dashboardStats.inProgress}</p>
                <p className="text-[10px] text-blue-500 font-bold">tarefas iniciadas</p>
              </div>
              <div className="p-3.5 bg-white rounded-2xl text-blue-600 shadow-sm border border-blue-200/40">
                <Activity size={22} />
              </div>
            </div>

            {/* Completed Card */}
            <div className="bg-emerald-100 rounded-3xl border border-emerald-200/80 p-5 shadow-sm flex items-center justify-between text-left transition-all hover:-translate-y-1 hover:shadow-md hover:scale-[1.02] cursor-default duration-300">
              <div className="space-y-1">
                <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">Concluídas</span>
                <p className="text-3xl font-black text-emerald-900">{dashboardStats.completed}</p>
                <p className="text-[10px] text-emerald-600 font-bold">tarefas finalizadas</p>
              </div>
              <div className="p-3.5 bg-white rounded-2xl text-emerald-600 shadow-sm border border-emerald-200/40">
                <CheckCircle2 size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* CHARTS CONTAINER GRID */}
        {dashboardStats.total === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-[2rem]">
            <AlertCircle className="mx-auto text-slate-300 mb-2" size={36} />
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Nenhuma atividade localizada com a seleção atual de filtros.</p>
            <p className="text-xs text-slate-400 mt-1">Altere as opções de Plano, Área de Atuação, Status ou busca textual para atualizar o Painel.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
            {/* Chart 1: Status distribution -> takes 5 cols */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between text-left">
              <div>
                <dt className="text-xs font-black tracking-widest text-slate-400 uppercase">Visão por Status</dt>
                <h4 className="text-lg font-black text-slate-800 mt-1">Distribuição de Status</h4>
                <p className="text-xs font-medium text-slate-500 mt-0.5 leading-snug">Relação percentual das atividades filtradas.</p>
              </div>
              <div className="h-64 relative mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomStatusTooltip />} cursor={{ fill: 'rgba(2f, 41, 58, 0.04)' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Embedded centered label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4 text-center">
                  <span className="text-3xl font-black text-slate-800 leading-none">{dashboardStats.total}</span>
                  <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase mt-0.5">Total</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
                <div className="text-center">
                  <div className="inline-block w-2.5 h-2.5 bg-slate-400 rounded-full mb-1"></div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Não Inic.</p>
                  <p className="text-sm font-black text-slate-700 leading-none mt-0.5">{dashboardStats.pending}</p>
                </div>
                <div className="text-center">
                  <div className="inline-block w-2.5 h-2.5 bg-blue-500 rounded-full mb-1"></div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Andamento</p>
                  <p className="text-sm font-black text-slate-700 leading-none mt-0.5">{dashboardStats.inProgress}</p>
                </div>
                <div className="text-center">
                  <div className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full mb-1"></div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Concluído</p>
                  <p className="text-sm font-black text-slate-700 leading-none mt-0.5">{dashboardStats.completed}</p>
                </div>
              </div>
            </div>

            {/* Chart 2: Average progress per Area -> takes 7 cols */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between text-left">
              <div>
                <dt className="text-xs font-black tracking-widest text-slate-400 uppercase">Execução por Área</dt>
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-black text-slate-800 mt-1">Progresso Médio por Área (%)</h4>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full border border-slate-200">
                    {areaChartData.length} Áreas Ativas
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 mt-0.5 leading-snug">Percentual médio de entrega computado para cada área de atuação estrutural.</p>
              </div>
              <div className="h-64 mt-4">
                {areaChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                    Sem dados de progresso nas áreas especificadas.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={areaChartData}
                      layout="vertical"
                      margin={{ top: 10, right: 35, left: 10, bottom: 5 }}
                      barCategoryGap="25%"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#475569", fontSize: 13, fontWeight: "bold" }} axisLine={false} tickLine={false} width={100} />
                      <Tooltip content={<CustomAreaTooltip />} cursor={{ fill: 'rgba(2f, 41, 58, 0.04)' }} />
                      <Bar dataKey="Progresso Médio (%)" fill="url(#colorProgress)" radius={[0, 8, 8, 0]} maxBarSize={20} background={{ fill: '#f1f5f9', radius: [0, 8, 8, 0] }}>
                        {areaChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry["Progresso Médio (%)"] === 100 ? "#10b981" : entry["Progresso Médio (%)"] >= 50 ? "#3b82f6" : entry["Progresso Médio (%)"] > 0 ? "#94a3b8" : "#cbd5e1"} />
                        ))}
                        <LabelList dataKey="Progresso Médio (%)" position="right" formatter={(value: number) => `${value}%`} fill="#475569" fontSize={13} fontWeight="900" />
                      </Bar>
                      <defs>
                        <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.4}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 3: Priority breakdown & Area table summary -> takes full 12 cols */}
            <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50 border border-slate-200 rounded-[2rem] p-6 shadow-xs text-left">
              
              {/* Priority BarChart -> takes 4 cols */}
              <div className="md:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <dt className="text-xs font-black tracking-widest text-slate-400 uppercase">Urgência</dt>
                  <h4 className="text-sm font-black text-slate-800 mt-1">Atividades por Prioridade</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Contagem por nível estipulado.</p>
                </div>
                <div className="h-44 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priorityChartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="priority" tick={{ fill: "#64748b", fontSize: 9, fontWeight: "bold" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomPriorityTooltip />} cursor={{ fill: 'rgba(2f, 41, 58, 0.04)' }} />
                      <Bar dataKey="Quantidade" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30}>
                        {priorityChartData.map((entry, index) => {
                          let color = "#3b82f6"; // media
                          if (entry.priority === "ALTA") color = "#f43f5e"; // high
                          if (entry.priority === "BAIXA") color = "#10b981"; // low
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Summary table of Tasks of the Areas -> takes 8 cols */}
              <div className="md:col-span-8 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between justify-items-stretch">
                <div>
                  <dt className="text-xs font-black tracking-widest text-slate-400 uppercase">Consolidação Operacional</dt>
                  <h4 className="text-sm font-black text-slate-800 mt-1">Sumário Técnico de Metas e Conclusão</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Resumo detalhado por área operacional ativa.</p>
                </div>
                <div className="mt-3 overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-600 border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 border-b border-slate-100">
                        <th className="px-3.5 py-2 font-black uppercase text-[9px] tracking-wider">Área</th>
                        <th className="px-3.5 py-2 font-black uppercase text-[9px] tracking-wider">Total Tarefas</th>
                        <th className="px-3.5 py-2 font-black uppercase text-[9px] tracking-wider">Qtde Não Iniciada</th>
                        <th className="px-3.5 py-2 font-black uppercase text-[9px] tracking-wider">Qtde Em Andamento</th>
                        <th className="px-3.5 py-2 font-black uppercase text-[9px] tracking-wider">Qtde Concluídas</th>
                        <th className="px-3.5 py-2 font-black uppercase text-[9px] tracking-wider min-w-[140px]">Progresso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {areaChartData.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-3.5 py-2 font-black text-slate-800 uppercase" title={row.fullName}>{row.name}</td>
                          <td className="px-3.5 py-2 font-bold">{row["Total de Tarefas"]}</td>
                          <td className="px-3.5 py-2 font-bold text-slate-500">{row["Não iniciada"]}</td>
                          <td className="px-3.5 py-2 font-bold text-blue-500">{row["Em andamento"]}</td>
                          <td className="px-3.5 py-2 font-bold text-emerald-600">{row["Concluídas"]}</td>
                          <td className="px-3.5 py-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden w-full max-w-[120px]">
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all duration-300",
                                    row["Progresso Médio (%)"] === 100 
                                      ? "bg-emerald-500"
                                      : row["Progresso Médio (%)"] >= 50
                                        ? "bg-blue-500"
                                        : row["Progresso Médio (%)"] > 0 ? "bg-slate-400" : "bg-slate-300"
                                  )}
                                  style={{ width: `${row["Progresso Médio (%)"]}%` }}
                                />
                              </div>
                              <span className={cn(
                                "text-xs font-black w-10 text-right leading-none",
                                row["Progresso Médio (%)"] === 100 
                                  ? "text-emerald-700 animate-pulse"
                                  : row["Progresso Médio (%)"] >= 50
                                    ? "text-blue-700"
                                    : row["Progresso Médio (%)"] > 0 ? "text-slate-600" : "text-slate-400"
                              )}>
                                {row["Progresso Médio (%)"]}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {areaChartData.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 italic">Nenhum dado por área.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Status Chart by Area and Quarter */}
            <div className="lg:col-span-12 bg-white border border-slate-200/90 rounded-[2rem] p-6 shadow-sm text-left mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <dt className="text-xs font-black tracking-widest text-slate-400 uppercase">Acompanhamento de Status</dt>
                  <h4 className="text-lg font-black text-slate-800 mt-1 font-sans">Status das Tarefas por Área e Trimestre</h4>
                  <p className="text-xs font-medium text-slate-500 mt-0.5 leading-snug">
                    Quantidade de tarefas Não Iniciadas, Em Andamento e Concluídas agrupadas por Área e separadas por trimestre.
                  </p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setQuarterChartType("small-multiples")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                      quarterChartType === "small-multiples" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Por Área (Small Multiples)
                  </button>
                  <button
                    onClick={() => setQuarterChartType("heatmap")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                      quarterChartType === "heatmap" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Mapa de Calor (Esforço)
                  </button>
                </div>
              </div>

              <div className="w-full mt-4 max-h-[500px] overflow-y-auto overflow-x-hidden custom-scrollbar">
                {areaQuarterStatusData.length > 0 ? (
                  quarterChartType === "small-multiples" ? (
                    (() => {
                      const groupedByArea = areaQuarterStatusData.reduce((acc, item) => {
                        if (!acc[item.areaName]) acc[item.areaName] = [];
                        acc[item.areaName].push(item);
                        return acc;
                      }, {} as Record<string, typeof areaQuarterStatusData>);
                      
                      const areasList = Object.keys(groupedByArea);
                      
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-2">
                          {areasList.map(areaName => (
                            <div key={areaName} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col h-[280px]">
                              <h5 className="text-sm font-bold text-slate-700 mb-2 truncate" title={areaName}>{areaName}</h5>
                              <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={groupedByArea[areaName]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} dy={5} />
                                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} width={25} />
                                    <Tooltip content={<CustomAreaStatusTooltip />} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                                    <Bar dataKey="Não iniciada" name="Não Iniciada" stackId="a" fill="#94a3b8" />
                                    <Bar dataKey="Em andamento" name="Em Andamento" stackId="a" fill="#3b82f6" />
                                    <Bar dataKey="Concluídas" name="Concluídas" stackId="a" fill="#10b981" />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  ) : (
                    (() => {
                      // HeatMap implementation
                      const areasList = Array.from(new Set(areaQuarterStatusData.map(d => d.areaName)));
                      const quarters = ["1º Tri", "2º Tri", "3º Tri", "4º Tri"];
                      
                      const computedData = areaQuarterStatusData.map(d => {
                        return {
                          ...d,
                          Total: d["Não iniciada"] + d["Em andamento"] + d["Concluídas"]
                        }
                      });

                      const maxTotal = Math.max(...computedData.map(d => d.Total), 1); // Avoid div by 0

                      const getColor = (val: number, max: number) => {
                        if (val === 0) return "bg-slate-50";
                        const intensity = val / max;
                        if (intensity < 0.2) return "bg-indigo-100";
                        if (intensity < 0.4) return "bg-indigo-300";
                        if (intensity < 0.6) return "bg-indigo-500";
                        if (intensity < 0.8) return "bg-indigo-700";
                        return "bg-indigo-900";
                      };

                      return (
                        <div className="flex flex-col w-full overflow-auto">
                          <table className="w-full text-left min-w-[600px] border-collapse">
                            <thead>
                              <tr>
                                <th className="p-3 text-xs font-black tracking-widest text-slate-400 uppercase border-b border-slate-200">Área</th>
                                {quarters.map(q => (
                                  <th key={q} className="p-3 text-xs font-black tracking-widest text-slate-400 uppercase text-center border-b border-slate-200">{q}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {areasList.map(areaName => (
                                <tr key={areaName} className="border-b border-slate-100/50 hover:bg-slate-50 transition-colors">
                                  <td className="p-3 text-sm font-bold text-slate-700 w-1/3">{areaName}</td>
                                  {quarters.map(q => {
                                    const cellData = computedData.find(d => d.areaName === areaName && d.quarter === q);
                                    const value = cellData ? cellData.Total : 0;
                                    return (
                                      <td key={q} className="p-2 align-middle w-32">
                                        <div 
                                          className={cn(
                                            "w-full h-12 rounded-xl flex items-center justify-center font-black text-sm transition-all duration-300",
                                            getColor(value, maxTotal),
                                            value > 0 && value / maxTotal >= 0.6 ? "text-white shadow-md shadow-indigo-900/20" : "text-indigo-900"
                                          )}
                                          title={`${value} tarefas no ${q} da área ${areaName}`}
                                        >
                                          {value > 0 ? value : <span className="text-slate-300 font-medium">-</span>}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })()
                  )
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 font-bold italic">
                    Nenhum dado disponível.
                  </div>
                )}
              </div>
            </div>

            {/* Timeline by Area & Quarter */}
            <div className="lg:col-span-12 bg-white border border-slate-200/90 rounded-[2rem] p-6 shadow-sm text-left mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <dt className="text-xs font-black tracking-widest text-slate-400 uppercase">Acompanhamento Temporal</dt>
                  <h4 className="text-lg font-black text-slate-800 mt-1 font-sans">Evolução por Área e Trimestre</h4>
                  <p className="text-xs font-medium text-slate-500 mt-0.5 leading-snug">
                    Gráfico estilo linha do tempo com percentual de conclusão das tarefas de cada área por trimestre. Clique no plano para expandir as áreas.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const expanded: Record<string, boolean> = {};
                      const traverse = (node: any) => {
                        expanded[node.id] = true;
                        if (node.children) node.children.forEach(traverse);
                      };
                      planAreaTimelineData.forEach(traverse);
                      setExpandedTimelineGroups(expanded);
                    }}
                    className="px-3 py-1.5 text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100/80 transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    Expandir Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const collapsed: Record<string, boolean> = {};
                      visibleTimelineRows.forEach(r => {
                        if (r.type !== "area") {
                          collapsed[r.id] = false;
                        }
                      });
                      setExpandedTimelineGroups(collapsed);
                    }}
                    className="px-3 py-1.5 text-xs bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-200/80 transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    Recolher Todos
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto pb-6">
                <div className="min-w-[1000px] py-4">
                  <div className="grid grid-cols-[220px_90px_90px_1fr_1fr_1fr_1fr] gap-4 mb-3 border-b border-slate-100 pb-3">
                    <div className="font-black text-[10px] uppercase text-slate-400 tracking-widest self-end pb-1 pl-2">Plano / Área</div>
                    <div className="font-black text-[10px] uppercase text-slate-400 tracking-widest self-end pb-1 text-center">Data Início</div>
                    <div className="font-black text-[10px] uppercase text-slate-400 tracking-widest self-end pb-1 text-center">Data Fim</div>
                    <div className="text-center flex flex-col items-center justify-end">
                      <span className="font-black text-[10px] uppercase text-slate-600 tracking-wider bg-slate-100 px-3 py-1 rounded-full mb-1 border border-slate-200">1º Trimestre</span>
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider">Jan - Mar</span>
                    </div>
                    <div className="text-center flex flex-col items-center justify-end">
                      <span className="font-black text-[10px] uppercase text-slate-600 tracking-wider bg-slate-100 px-3 py-1 rounded-full mb-1 border border-slate-200">2º Trimestre</span>
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider">Abr - Jun</span>
                    </div>
                    <div className="text-center flex flex-col items-center justify-end">
                      <span className="font-black text-[10px] uppercase text-slate-600 tracking-wider bg-slate-100 px-3 py-1 rounded-full mb-1 border border-slate-200">3º Trimestre</span>
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider">Jul - Set</span>
                    </div>
                    <div className="text-center flex flex-col items-center justify-end">
                      <span className="font-black text-[10px] uppercase text-slate-600 tracking-wider bg-slate-100 px-3 py-1 rounded-full mb-1 border border-slate-200">4º Trimestre</span>
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider">Out - Dez</span>
                    </div>
                  </div>

                  <div className="space-y-3 pb-32">
                    {visibleTimelineRows.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-sm font-medium italic border border-slate-100 border-dashed rounded-xl">Nenhuma tarefa atribuída aos trimestres.</div>
                    ) : (
                      visibleTimelineRows.map((row) => {
                        const isExpanded = expandedTimelineGroups[row.id] !== undefined ? expandedTimelineGroups[row.id] : (isAnyFilterActive ? true : row.depth < 1);
                        const isPlan = row.type === "plan";
                        
                        return (
                          <div 
                            key={row.id} 
                            className={cn(
                              "grid grid-cols-[220px_90px_90px_1fr_1fr_1fr_1fr] gap-4 items-center p-3 rounded-2xl transition-colors border shadow-sm relative group/row hover:z-50",
                              isPlan 
                                ? "bg-slate-50 hover:bg-indigo-50/20 text-slate-800 border-l-[3px] border-l-indigo-500 border-t-slate-100 border-r-slate-100 border-b-slate-100 cursor-pointer" 
                                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-100"
                            )}
                            onClick={() => {
                              if (isPlan) {
                                setExpandedTimelineGroups(prev => ({
                                  ...prev,
                                  [row.id]: !isExpanded
                                }));
                              }
                            }}
                          >
                            {/* Timeline connector visual line behind blocks */}
                            <div className="absolute top-1/2 left-[440px] right-8 h-0.5 bg-slate-100 -translate-y-1/2 z-0 hidden sm:block pointer-events-none" />
                            
                            <div className="flex items-center gap-1.5 z-10 pr-2 pl-2" style={{ paddingLeft: `${row.depth * 1.5 + 0.5}rem` }}>
                               {isPlan ? (
                                <span className="text-slate-400 group-hover/row:text-indigo-600 transition-colors p-0.5">
                                  {isExpanded ? <ChevronDown size={14} className="stroke-[2.5]" /> : <ChevronRight size={14} className="stroke-[2.5]" />}
                                </span>
                               ) : (
                                <span className="w-1.5 h-1.5 bg-slate-200 rounded-full ml-1 mr-1" />
                               )}
                               <span className={cn("truncate", isPlan ? "font-black text-sm" : "font-semibold text-[13px]")} title={row.name}>
                                 {row.name}
                               </span>
                            </div>
                            
                            <div className="text-center font-medium text-xs text-slate-500 z-10">
                               {formatDate(row.startDate)}
                            </div>
                            <div className="text-center font-medium text-xs text-slate-500 z-10">
                               {formatDate(row.endDate)}
                            </div>

                            {[1, 2, 3, 4].map((q: number) => {
                              const stats = row.quarters[q as 1|2|3|4];
                              if (stats.total === 0) return (
                                <div key={q} className="flex justify-center items-center z-10 h-8">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                                </div>
                              );
                              
                              return (
                                <div key={q} className="group relative flex items-center justify-center cursor-default z-10">
                                  <div className="w-[85%] h-7 bg-slate-100/80 rounded-xl overflow-hidden relative border border-slate-200/50 shadow-[inset_0px_1px_3px_rgba(0,0,0,0.02)] backdrop-blur-sm">
                                    <div 
                                      className={cn(
                                        "h-full transition-all duration-700 ease-out",
                                        stats.progress === 100 ? "bg-emerald-500" : stats.progress >= 50 ? "bg-blue-500" : stats.progress > 0 ? "bg-slate-400" : "bg-slate-300"
                                      )}
                                      style={{ width: `${stats.progress}%` }}
                                    />
                                    <span className={cn(
                                      "absolute inset-0 flex items-center justify-center text-[11px] font-black pointer-events-none drop-shadow-sm",
                                      stats.progress > 45 ? "text-white" : "text-slate-500"
                                    )}>
                                      {stats.progress}%
                                    </span>
                                  </div>
                                  <div className="hidden group-hover:flex absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded-xl p-3.5 shadow-2xl z-[90] flex-col gap-2 min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-150">
                                    <p className="text-white text-xs font-black border-b border-slate-700/60 pb-2 mb-1 uppercase text-center tracking-wider flex items-center justify-center gap-2">
                                      {row.name} - Trimestre {q}
                                    </p>
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-slate-400 font-medium tracking-wider text-[10px] uppercase">Total de Tarefas</span>
                                      <span className="text-white font-black">{stats.total}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-slate-400 font-medium tracking-wider text-[10px] uppercase">Não Iniciada</span>
                                      <span className="text-slate-300 font-bold">{stats.pending}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-slate-400 font-medium tracking-wider text-[10px] uppercase">Em Andamento</span>
                                      <span className="text-sky-400 font-bold">{stats.inProgress}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-medium">
                                      <span className="text-slate-400 tracking-wider text-[10px] uppercase">Concluídas</span>
                                      <span className="text-emerald-400 font-bold">{stats.completed}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Table Grouped by Plan -> Quarter -> Area */}
            <div className="lg:col-span-12 bg-white border border-slate-200/90 rounded-[2rem] p-6 shadow-sm text-left mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <dt className="text-xs font-black tracking-widest text-slate-400 uppercase">Visão Consolidada</dt>
                  <h4 className="text-lg font-black text-slate-800 mt-1 font-sans">Consolidação por Plano, Trimestre e Área</h4>
                  <p className="text-xs font-medium text-slate-500 mt-0.5 leading-snug">
                    Resumo analítico temporal e operacional. Clique nas linhas de Plano e Trimestre para recolher ou expandir as áreas.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const expanded: Record<string, boolean> = {};
                      const traverse = (node: any) => {
                        expanded[node.id] = true;
                        if (node.children) node.children.forEach(traverse);
                      };
                      groupedPlanQuarterAreaData.forEach(traverse);
                      setExpandedPlanQuarterAreaGroups(expanded);
                    }}
                    className="px-3 py-1.5 text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100/80 transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    Expandir Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const collapsed: Record<string, boolean> = {};
                      visiblePlanQuarterAreaGroupedRows.forEach(r => {
                        if (r.type !== "area") {
                          collapsed[r.id] = false;
                        }
                      });
                      setExpandedPlanQuarterAreaGroups(collapsed);
                    }}
                    className="px-3 py-1.5 text-xs bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-200/80 transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    Recolher Todos
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200/60 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 border-b border-slate-200 font-black uppercase text-[10px] tracking-wider">
                      <th className="px-4 py-3.5 min-w-[280px]">Grupo / Nome</th>
                      <th className="px-4 py-3.5 text-center min-w-[110px]">Data Início</th>
                      <th className="px-4 py-3.5 text-center min-w-[110px]">Data Fim</th>
                      <th className="px-4 py-3.5 text-center">Qtde Tarefa</th>
                      <th className="px-4 py-3.5 text-center text-slate-400">Qtde Não Iniciada</th>
                      <th className="px-4 py-3.5 text-center text-blue-500">Qtde Em Andamento</th>
                      <th className="px-4 py-3.5 text-center text-emerald-600">Qtde Concluídas</th>
                      <th className="px-4 py-3.5 min-w-[140px]">Progresso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visiblePlanQuarterAreaGroupedRows.map((row) => {
                      const isExpanded = expandedPlanQuarterAreaGroups[row.id] !== undefined ? expandedPlanQuarterAreaGroups[row.id] : (isAnyFilterActive ? true : row.depth < 1); // defaults to true for depth < 1
                      
                      const renderDate = (dStr: string | null) => {
                        if (!dStr) return <span className="text-slate-300">-</span>;
                        try {
                          const d = new Date(dStr);
                          if (isNaN(d.getTime())) return <span className="text-slate-300">-</span>;
                          return <span className="font-mono text-slate-700 font-medium">{d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })}</span>;
                        } catch {
                          return <span className="text-slate-300">-</span>;
                        }
                      };

                      return (
                        <tr 
                          key={row.id} 
                          onClick={() => {
                            if (row.type !== "area") {
                              setExpandedPlanQuarterAreaGroups(prev => ({
                                ...prev,
                                [row.id]: !isExpanded
                              }));
                            }
                          }}
                          className={cn(
                            "group transition-all duration-150 border-l-[3px]",
                            row.type === "plan" 
                              ? "bg-slate-100/75 hover:bg-slate-100 text-slate-900 border-l-indigo-600 cursor-pointer font-black"
                              : row.type === "quarter"
                                ? "bg-slate-50/50 hover:bg-amber-50/30 text-slate-800 border-l-amber-500 cursor-pointer font-bold"
                                : "bg-white hover:bg-slate-50 text-slate-700 border-l-transparent font-medium"
                          )}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5" style={{ paddingLeft: `${row.depth * 1.5}rem` }}>
                              {row.type !== "area" ? (
                                <span className="text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors p-0.5">
                                  {isExpanded ? <ChevronDown size={14} className="stroke-[2.5]" /> : <ChevronRight size={14} className="stroke-[2.5]" />}
                                </span>
                              ) : (
                                <span className="w-5" />
                              )}

                              <div className="flex items-center gap-2">
                                {row.type === "plan" && (
                                  <span className="p-1 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <FolderKanban size={14} className="stroke-[2.5]" />
                                  </span>
                                )}
                                {row.type === "quarter" && (
                                  <span className="p-1 bg-amber-50 text-amber-600 rounded-lg">
                                    <Calendar size={12} className="stroke-[2]" />
                                  </span>
                                )}
                                {row.type === "area" && (
                                  <span className="p-1 bg-sky-50 text-sky-600 rounded-lg">
                                    <Layers size={13} className="stroke-[2]" />
                                  </span>
                                )}
                                
                                <span className={cn(
                                  "truncate select-none",
                                  row.type === "plan" ? "text-xs font-black tracking-tight" : row.type === "quarter" ? "text-xs font-bold" : "text-xs text-slate-600"
                                )}>
                                  {row.name}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-center">{renderDate(row.startDate)}</td>
                          <td className="px-4 py-3 text-center">{renderDate(row.endDate)}</td>
                          <td className="px-4 py-3 text-center font-black text-slate-800">{row.total}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-400">{row.pending || <span className="text-slate-200">0</span>}</td>
                          <td className="px-4 py-3 text-center font-bold text-blue-500">{row.inProgress || <span className="text-slate-200">0</span>}</td>
                          <td className="px-4 py-3 text-center font-bold text-emerald-600">{row.completed || <span className="text-slate-200">0</span>}</td>
                          
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden w-full max-w-[120px]">
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all duration-300",
                                    row.avgProgress === 100 
                                      ? "bg-emerald-500"
                                      : row.avgProgress >= 50
                                        ? "bg-blue-500"
                                        : row.avgProgress > 0 ? "bg-slate-400" : "bg-slate-300"
                                  )}
                                  style={{ width: `${row.avgProgress}%` }}
                                />
                              </div>
                              <span className={cn(
                                "text-xs font-black w-10 text-right leading-none",
                                row.avgProgress === 100 
                                  ? "text-emerald-700 animate-pulse"
                                  : row.avgProgress >= 50
                                    ? "text-blue-700"
                                    : row.avgProgress > 0 ? "text-slate-600" : "text-slate-400"
                              )}>
                                {row.avgProgress}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {visiblePlanQuarterAreaGroupedRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400 italic font-bold">
                          Nenhum dado consolidado disponível para os filtros atuais.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Visual Table Grouped by Plan -> Area -> Quarter */}
            <div className="lg:col-span-12 bg-white border border-slate-200/90 rounded-[2rem] p-6 shadow-sm text-left mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <dt className="text-xs font-black tracking-widest text-slate-400 uppercase">Visão Consolidada</dt>
                  <h4 className="text-lg font-black text-slate-800 mt-1 font-sans">Consolidação por Plano, Área e Trimestre</h4>
                  <p className="text-xs font-medium text-slate-500 mt-0.5 leading-snug">
                    Resumo analítico temporal. Clique nas linhas de Plano e Área para recolher ou expandir os trimestres.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const expanded: Record<string, boolean> = {};
                      const traverse = (node: any) => {
                        expanded[node.id] = true;
                        if (node.children) node.children.forEach(traverse);
                      };
                      groupedQuarterDashboardData.forEach(traverse);
                      setExpandedQuarterGroups(expanded);
                    }}
                    className="px-3 py-1.5 text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100/80 transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    Expandir Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const collapsed: Record<string, boolean> = {};
                      visibleQuarterGroupedRows.forEach(r => {
                        if (r.type !== "quarter") {
                          collapsed[r.id] = false;
                        }
                      });
                      setExpandedQuarterGroups(collapsed);
                    }}
                    className="px-3 py-1.5 text-xs bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-200/80 transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    Recolher Todos
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200/60 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 border-b border-slate-200 font-black uppercase text-[10px] tracking-wider">
                      <th className="px-4 py-3.5 min-w-[280px]">Grupo / Nome</th>
                      <th className="px-4 py-3.5 text-center min-w-[110px]">Data Início</th>
                      <th className="px-4 py-3.5 text-center min-w-[110px]">Data Fim</th>
                      <th className="px-4 py-3.5 text-center">Qtde Tarefa</th>
                      <th className="px-4 py-3.5 text-center text-slate-400">Qtde Não Iniciada</th>
                      <th className="px-4 py-3.5 text-center text-blue-500">Qtde Em Andamento</th>
                      <th className="px-4 py-3.5 text-center text-emerald-600">Qtde Concluídas</th>
                      <th className="px-4 py-3.5 min-w-[140px]">Progresso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleQuarterGroupedRows.map((row) => {
                      const isExpanded = expandedQuarterGroups[row.id] !== undefined ? expandedQuarterGroups[row.id] : (isAnyFilterActive ? true : row.depth < 1); // defaults to true for depth < 1
                      
                      const renderDate = (dStr: string | null) => {
                        if (!dStr) return <span className="text-slate-300">-</span>;
                        try {
                          const d = new Date(dStr);
                          if (isNaN(d.getTime())) return <span className="text-slate-300">-</span>;
                          return <span className="font-mono text-slate-700 font-medium">{d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })}</span>;
                        } catch {
                          return <span className="text-slate-300">-</span>;
                        }
                      };

                      return (
                        <tr 
                          key={row.id} 
                          onClick={() => {
                            if (row.type !== "quarter") {
                              setExpandedQuarterGroups(prev => ({
                                ...prev,
                                [row.id]: !isExpanded
                              }));
                            }
                          }}
                          className={cn(
                            "group transition-all duration-150 border-l-[3px]",
                            row.type === "plan" 
                              ? "bg-slate-100/75 hover:bg-slate-100 text-slate-900 border-l-indigo-600 cursor-pointer font-black"
                              : row.type === "area"
                                ? "bg-slate-50/50 hover:bg-indigo-50/20 text-slate-800 border-l-sky-500 cursor-pointer font-bold"
                                : "bg-white hover:bg-slate-50 text-slate-700 border-l-transparent font-medium"
                          )}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5" style={{ paddingLeft: `${row.depth * 1.5}rem` }}>
                              {row.type !== "quarter" ? (
                                <span className="text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors p-0.5">
                                  {isExpanded ? <ChevronDown size={14} className="stroke-[2.5]" /> : <ChevronRight size={14} className="stroke-[2.5]" />}
                                </span>
                              ) : (
                                <span className="w-5" />
                              )}

                              <div className="flex items-center gap-2">
                                {row.type === "plan" && (
                                  <span className="p-1 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <FolderKanban size={14} className="stroke-[2.5]" />
                                  </span>
                                )}
                                {row.type === "area" && (
                                  <span className="p-1 bg-sky-50 text-sky-600 rounded-lg">
                                    <Layers size={13} className="stroke-[2]" />
                                  </span>
                                )}
                                {row.type === "quarter" && (
                                  <span className="p-1 bg-amber-50 text-amber-600 rounded-lg">
                                    <Calendar size={12} className="stroke-[2]" />
                                  </span>
                                )}
                                
                                <span className={cn(
                                  "truncate select-none",
                                  row.type === "plan" ? "text-xs font-black tracking-tight" : row.type === "area" ? "text-xs font-bold" : "text-xs text-slate-600"
                                )}>
                                  {row.name}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-center">{renderDate(row.startDate)}</td>
                          <td className="px-4 py-3 text-center">{renderDate(row.endDate)}</td>
                          <td className="px-4 py-3 text-center font-black text-slate-800">{row.total}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-400">{row.pending || <span className="text-slate-200">0</span>}</td>
                          <td className="px-4 py-3 text-center font-bold text-blue-500">{row.inProgress || <span className="text-slate-200">0</span>}</td>
                          <td className="px-4 py-3 text-center font-bold text-emerald-600">{row.completed || <span className="text-slate-200">0</span>}</td>
                          
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden w-full max-w-[120px]">
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all duration-300",
                                    row.avgProgress === 100 
                                      ? "bg-emerald-500"
                                      : row.avgProgress >= 50
                                        ? "bg-blue-500"
                                        : row.avgProgress > 0 ? "bg-slate-400" : "bg-slate-300"
                                  )}
                                  style={{ width: `${row.avgProgress}%` }}
                                />
                              </div>
                              <span className={cn(
                                "text-xs font-black w-10 text-right leading-none",
                                row.avgProgress === 100 
                                  ? "text-emerald-700 animate-pulse"
                                  : row.avgProgress >= 50
                                    ? "text-blue-700"
                                    : row.avgProgress > 0 ? "text-slate-600" : "text-slate-400"
                              )}>
                                {row.avgProgress}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {visibleQuarterGroupedRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400 italic font-bold">
                          Nenhum dado consolidado disponível para os filtros atuais.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Visual Table Grouped by Plan -> Area -> Category */}
            <div className="lg:col-span-12 bg-white border border-slate-200/90 rounded-[2rem] p-6 shadow-sm text-left mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <dt className="text-xs font-black tracking-widest text-slate-400 uppercase">Visão Consolidada</dt>
                  <h4 className="text-lg font-black text-slate-800 mt-1 font-sans">Consolidação por Plano, Área de Atuação e Categoria</h4>
                  <p className="text-xs font-medium text-slate-500 mt-0.5 leading-snug">
                    Resumo analítico multinível. Clique nas linhas de Plano e Área para recolher ou expandir a árvore de informações.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const expanded: Record<string, boolean> = {};
                      const traverse = (node: any) => {
                        expanded[node.id] = true;
                        if (node.children) node.children.forEach(traverse);
                      };
                      groupedDashboardData.forEach(traverse);
                      setExpandedGroups(expanded);
                    }}
                    className="px-3 py-1.5 text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100/80 transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    Expandir Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Collapse All: set all known/visible plans and areas to false
                      const collapsed: Record<string, boolean> = {};
                      visibleGroupedRows.forEach(r => {
                        if (r.type !== "category") {
                          collapsed[r.id] = false;
                        }
                      });
                      setExpandedGroups(collapsed);
                    }}
                    className="px-3 py-1.5 text-xs bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-200/80 transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    Recolher Todos
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200/60 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 border-b border-slate-200 font-black uppercase text-[10px] tracking-wider">
                      <th className="px-4 py-3.5 min-w-[280px]">Grupo / Nome</th>
                      <th className="px-4 py-3.5 text-center min-w-[110px]">Data Início</th>
                      <th className="px-4 py-3.5 text-center min-w-[110px]">Data Fim</th>
                      <th className="px-4 py-3.5 text-center">Qtde Tarefa</th>
                      <th className="px-4 py-3.5 text-center text-slate-400">Qtde Não Iniciada</th>
                      <th className="px-4 py-3.5 text-center text-blue-500">Qtde Em Andamento</th>
                      <th className="px-4 py-3.5 text-center text-emerald-600">Qtde Concluídas</th>
                      <th className="px-4 py-3.5 min-w-[140px]">Progresso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleGroupedRows.map((row) => {
                      const isExpanded = expandedGroups[row.id] !== undefined ? expandedGroups[row.id] : (isAnyFilterActive ? true : row.depth < 1); // defaults to true for depth < 1
                      const hasChildren = row.children && row.children.length > 0;
                      
                      // Formatting helper for start/end date
                      const renderDate = (dStr: string | null) => {
                        if (!dStr) return <span className="text-slate-300">-</span>;
                        try {
                          const d = new Date(dStr);
                          if (isNaN(d.getTime())) return <span className="text-slate-300">-</span>;
                          return <span className="font-mono text-slate-700 font-medium">{d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })}</span>;
                        } catch {
                          return <span className="text-slate-300">-</span>;
                        }
                      };

                      return (
                        <tr 
                          key={row.id} 
                          onClick={() => {
                            if (row.type !== "category") {
                              setExpandedGroups(prev => ({
                                ...prev,
                                [row.id]: !isExpanded
                              }));
                            }
                          }}
                          className={cn(
                            "group transition-all duration-150 border-l-[3px]",
                            row.type === "plan" 
                              ? "bg-slate-100/75 hover:bg-slate-100 text-slate-900 border-l-indigo-600 cursor-pointer font-black"
                              : row.type === "area"
                                ? "bg-slate-50/50 hover:bg-indigo-50/20 text-slate-800 border-l-sky-500 cursor-pointer font-bold"
                                : "bg-white hover:bg-slate-50 text-slate-700 border-l-transparent font-medium"
                          )}
                        >
                          {/* Group / Name field with custom indentation */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5" style={{ paddingLeft: `${row.depth * 1.5}rem` }}>
                              {row.type !== "category" ? (
                                <span className="text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors p-0.5">
                                  {isExpanded ? <ChevronDown size={14} className="stroke-[2.5]" /> : <ChevronRight size={14} className="stroke-[2.5]" />}
                                </span>
                              ) : (
                                <span className="w-5" /> // spacer to align leaf categories with plan/area chevron
                              )}

                              <div className="flex items-center gap-2">
                                {row.type === "plan" && (
                                  <span className="p-1 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <FolderKanban size={14} className="stroke-[2.5]" />
                                  </span>
                                )}
                                {row.type === "area" && (
                                  <span className="p-1 bg-sky-50 text-sky-600 rounded-lg">
                                    <Layers size={13} className="stroke-[2]" />
                                  </span>
                                )}
                                {row.type === "category" && (
                                  <span className="p-1 bg-slate-100 text-slate-500 rounded-lg">
                                    <Tag size={12} className="stroke-[2]" />
                                  </span>
                                )}
                                
                                <span className={cn(
                                  "truncate select-none",
                                  row.type === "plan" ? "text-xs font-black tracking-tight" : row.type === "area" ? "text-xs font-bold" : "text-xs text-slate-600"
                                )}>
                                  {row.name}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Data Início */}
                          <td className="px-4 py-3 text-center">
                            {renderDate(row.startDate)}
                          </td>

                          {/* Data Fim */}
                          <td className="px-4 py-3 text-center">
                            {renderDate(row.endDate)}
                          </td>

                          {/* Qtde Tarefa */}
                          <td className="px-4 py-3 text-center font-black text-slate-800">
                            {row.total}
                          </td>

                          {/* Qtde Não Iniciada */}
                          <td className="px-4 py-3 text-center font-bold text-slate-400">
                            {row.pending || <span className="text-slate-200">0</span>}
                          </td>

                          {/* Qtde Em Andamento */}
                          <td className="px-4 py-3 text-center font-bold text-blue-500">
                            {row.inProgress || <span className="text-slate-200">0</span>}
                          </td>

                          {/* Qtde Concluídas */}
                          <td className="px-4 py-3 text-center font-bold text-emerald-600">
                            {row.completed || <span className="text-slate-200">0</span>}
                          </td>

                          {/* Progresso com barra de progresso visual */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden w-full max-w-[120px]">
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all duration-300",
                                    row.avgProgress === 100 
                                      ? "bg-emerald-500"
                                      : row.avgProgress >= 50
                                        ? "bg-blue-500"
                                        : row.avgProgress > 0 ? "bg-slate-400" : "bg-slate-300"
                                  )}
                                  style={{ width: `${row.avgProgress}%` }}
                                />
                              </div>
                              <span className={cn(
                                "text-xs font-black w-10 text-right leading-none",
                                row.avgProgress === 100 
                                  ? "text-emerald-700 animate-pulse"
                                  : row.avgProgress >= 50
                                    ? "text-blue-700"
                                    : row.avgProgress > 0 ? "text-slate-600" : "text-slate-400"
                              )}>
                                {row.avgProgress}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {visibleGroupedRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400 italic font-bold">
                          Nenhum dado consolidado disponível para os filtros atuais.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabela de Tarefas Agrupada por Área no Final do Painel */}
            <div className="lg:col-span-12 bg-white border border-slate-200/90 rounded-[2rem] p-6 shadow-sm text-left mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <dt className="text-xs font-black tracking-widest text-slate-400 uppercase">Detalhamento Operacional</dt>
                  <h4 className="text-lg font-black text-slate-800 mt-1 font-sans">Tarefas Agrupadas por Área Temática</h4>
                  <p className="text-xs font-medium text-slate-500 mt-0.5 leading-snug">
                    Relação de atividades com referência na data fim, consolidando trimestre, mês e progresso atual, agrupadas por área/setor.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200/60 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-black uppercase text-[10px] tracking-wider select-none">
                      <th 
                        onClick={() => handleAreaTableSort("title")}
                        className="px-4 py-3.5 min-w-[280px] cursor-pointer hover:bg-slate-100/80 transition-colors"
                      >
                        Título da Tarefa <AreaTableSortIcon field="title" />
                      </th>
                      <th 
                        onClick={() => handleAreaTableSort("start")}
                        className="px-4 py-3.5 text-center min-w-[110px] cursor-pointer hover:bg-slate-100/80 transition-colors"
                      >
                        Início <AreaTableSortIcon field="start" />
                      </th>
                      <th 
                        onClick={() => handleAreaTableSort("end")}
                        className="px-4 py-3.5 text-center min-w-[110px] cursor-pointer hover:bg-slate-100/80 transition-colors"
                      >
                        Prazo <AreaTableSortIcon field="end" />
                      </th>
                      <th 
                        onClick={() => handleAreaTableSort("quarter")}
                        className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                      >
                        Trimestre <AreaTableSortIcon field="quarter" />
                      </th>
                      <th 
                        onClick={() => handleAreaTableSort("month")}
                        className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                      >
                        Mês <AreaTableSortIcon field="month" />
                      </th>
                      <th 
                        onClick={() => handleAreaTableSort("status")}
                        className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                      >
                        Status <AreaTableSortIcon field="status" />
                      </th>
                      <th 
                        onClick={() => handleAreaTableSort("situation")}
                        className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                      >
                        Situação <AreaTableSortIcon field="situation" />
                      </th>
                      <th 
                        onClick={() => handleAreaTableSort("progress")}
                        className="px-4 py-3.5 min-w-[140px] cursor-pointer hover:bg-slate-100/80 transition-colors"
                      >
                        Progresso <AreaTableSortIcon field="progress" />
                      </th>
                      <th className="px-4 py-3.5 text-center min-w-[85px]">
                        Timeline
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const sortTaskList = sortAreaTaskList;

                      const targetAreas = selectedAreaIds.length > 0 
                        ? areas.filter(a => selectedAreaIds.includes(a.id))
                        : areas;

                      const allAreas = [
                        ...targetAreas,
                        ...(selectedAreaIds.length === 0 ? [{ id: 0, name: "Sem Área de Atuação" }] : [])
                      ];

                      const sortedAreas = [...allAreas].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
                      const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
                      
                      const allCategoriesForGroup = [
                        ...sortedCategories,
                        { id: -1, name: "Sem Categoria" }
                      ];

                      const rows: React.ReactNode[] = [];

                      const renderRowHierarchical = (t: Task, depth: number, areaName: string, categoryName: string) => {
                        const subTasksCount = childrenMap[t.id]?.length || 0;
                        const isExpanded = expandedTasks[t.id] !== undefined ? expandedTasks[t.id] : (isAnyFilterActive ? true : false);
                        
                        let q = '-';
                        let mLabel = '-';
                        let formattedEndDate = '-';
                        let formattedStartDate = '-';
                        
                        if (t.startDate) {
                          try {
                            const dStart = new Date(t.startDate);
                            if (!isNaN(dStart.getTime())) {
                              formattedStartDate = dStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
                            }
                          } catch(e) {}
                        }
                        
                        if (t.endDate) {
                          try {
                            const d = new Date(t.endDate);
                            if (!isNaN(d.getTime())) {
                              formattedEndDate = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
                              const monthIdx = d.getUTCMonth();
                              
                              if (monthIdx < 3) q = '1º Trim.';
                              else if (monthIdx < 6) q = '2º Trim.';
                              else if (monthIdx < 9) q = '3º Trim.';
                              else q = '4º Trim.';
                              
                              const monthName = d.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" });
                              mLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                            }
                          } catch(e) {}
                        }

                        const normStatus = normalizeStatus(t.status);
                        const dlStatus = getDeadlineStatus(t.endDate, t.status);

                        rows.push(
                          <tr key={`task-${areaName}-${categoryName}-${t.id}`} className="hover:bg-slate-50 transition-colors bg-white">
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              <div className="flex items-center" style={{ paddingLeft: `${depth * 20}px` }}>
                                {subTasksCount > 0 ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpand(t.id);
                                    }}
                                    className="p-1 mr-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition"
                                    title={isExpanded ? "Recolher subtarefas" : "Expandir subtarefas"}
                                  >
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </button>
                                ) : (
                                  <span className="w-6 shrink-0" />
                                )}
                                <span className={cn(depth > 0 ? "text-slate-500 font-medium font-sans text-xs" : "text-slate-700 font-semibold")}>{t.title}</span>
                                {subTasksCount > 0 && (
                                  <span className="text-slate-400 font-normal ml-1">({subTasksCount})</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-slate-650 font-mono">
                              {formattedStartDate !== '-' ? formattedStartDate : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-650 font-mono">
                              {formattedEndDate}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-800 font-bold text-[11px]">
                              {q !== '-' ? <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">{q}</span> : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-700 font-bold uppercase text-[10px]">
                              {mLabel !== '-' ? mLabel : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {normStatus === "Concluída" ? (
                                <div className="inline-flex items-center justify-center text-emerald-500" title="Status: Concluída">
                                  <CheckCircle2 size={16} />
                                </div>
                              ) : normStatus === "Em andamento" ? (
                                <div className="inline-flex items-center justify-center text-blue-500 animate-pulse" title="Status: Em andamento">
                                  <Clock size={16} />
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-center text-slate-300" title="Status: Não iniciada">
                                  <Circle size={16} />
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {normStatus === "Concluída" ? (
                                <div className="inline-flex items-center justify-center text-emerald-500" title="Situação: No Prazo (Concluída)">
                                  <CheckCircle2 size={16} />
                                </div>
                              ) : dlStatus === "Atrasada" ? (
                                <div className="inline-flex items-center justify-center text-rose-500" title="Situação: Atrasada">
                                  <AlertCircle size={16} />
                                </div>
                              ) : dlStatus === "Crítica" ? (
                                <div className="inline-flex items-center justify-center text-amber-500" title="Situação: Crítica">
                                  <AlertTriangle size={16} />
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-center text-emerald-500" title="Situação: No Prazo">
                                  <CheckCircle2 size={16} />
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden w-full max-w-[120px]">
                                  <div 
                                    className={cn(
                                      "h-full rounded-full transition-all duration-300",
                                      t.progress === 100 ? "bg-emerald-500" : t.progress >= 50 ? "bg-blue-500" : t.progress > 0 ? "bg-amber-400" : "bg-slate-300"
                                    )}
                                    style={{ width: `${t.progress || 0}%` }}
                                  />
                                </div>
                                <span className={cn(
                                  "text-[10px] font-black w-8 text-right leading-none",
                                  t.progress === 100 ? "text-emerald-600 animate-pulse" : t.progress >= 50 ? "text-blue-600" : t.progress > 0 ? "text-amber-600" : "text-slate-400"
                                )}>
                                  {t.progress || 0}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center w-[85px]">
                              <button
                                onClick={() => setTimelineTaskId(t.id)}
                                className="p-1 px-2 bg-white border border-slate-200 text-slate-600 hover:text-adasa-mid hover:border-adasa-200 rounded-lg transition shadow-sm text-xs font-bold inline-flex items-center justify-center"
                                title="Ver Linha do Tempo"
                              >
                                <Activity size={12} className="text-indigo-600" />
                              </button>
                            </td>
                          </tr>
                        );

                        if (isExpanded && subTasksCount > 0) {
                          const children = (childrenMap[t.id] || []).filter(c => filteredTasks.some(x => x.id === c.id));
                          const sortedChildren = sortTaskList(children);
                          sortedChildren.forEach(child => {
                            renderRowHierarchical(child, depth + 1, areaName, categoryName);
                          });
                        }
                      };

                      sortedAreas.forEach(area => {
                        const areaTasks = filteredTasks.filter(t => {
                          const hasArea = t.areaIds && t.areaIds.length > 0;
                          if (area.id === 0) {
                            return !hasArea;
                          } else {
                            return t.areaIds && t.areaIds.includes(area.id);
                          }
                        });

                        if (areaTasks.length > 0) {
                          const isAreaCollapsed = collapsedAreas[area.name] || false;

                          rows.push(
                            <tr 
                              key={`area-${area.name}`} 
                              className="bg-slate-100/75 border-t-2 border-t-slate-200 cursor-pointer hover:bg-slate-200 transition-colors"
                              onClick={() => setCollapsedAreas(prev => ({ ...prev, [area.name]: !prev[area.name] }))}
                            >
                              <td colSpan={9} className="px-4 py-3 font-black text-slate-800 uppercase tracking-wide border-l-4 border-l-indigo-500">
                                <div className="flex items-center gap-2">
                                  {isAreaCollapsed ? <ChevronRight size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                  <span>{area.name}</span>
                                  <span className="text-[10px] text-slate-500 font-bold ml-2 bg-slate-200 px-2 py-0.5 rounded-full">{areaTasks.length} TAREFA(S)</span>
                                </div>
                              </td>
                            </tr>
                          );

                          if (!isAreaCollapsed) {
                            allCategoriesForGroup.forEach(category => {
                              const groupTasks = areaTasks.filter(t => {
                                const hasCat = t.categoryIds && t.categoryIds.length > 0;
                                if (category.id === -1) {
                                  return !hasCat;
                                } else {
                                  return t.categoryIds && t.categoryIds.includes(category.id);
                                }
                              });

                              if (groupTasks.length > 0) {
                                const collKey = `${area.name}-${category.name}`;
                                const isCategoryCollapsed = collapsedTableCategories[collKey] || false;

                                rows.push(
                                  <tr 
                                    key={`cat-header-${area.name}-${category.name}`}
                                    className="bg-slate-50/75 border-t border-t-slate-100 cursor-pointer hover:bg-slate-100/75 transition-colors select-none"
                                    onClick={() => setCollapsedTableCategories(prev => ({
                                      ...prev,
                                      [collKey]: !isCategoryCollapsed
                                    }))}
                                  >
                                    <td colSpan={9} className="px-4 py-2 font-bold text-slate-600 border-l-[3px] border-l-amber-500/80">
                                      <div className="flex items-center gap-2 pl-4">
                                        {isCategoryCollapsed ? <ChevronRight size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Categoria:</span>
                                        <span className="text-xs font-black text-slate-700">{category.name}</span>
                                        <span className="text-[9px] text-slate-500 font-bold ml-1.5 bg-slate-200/60 border border-slate-200/60 px-1.5 py-0.5 rounded-full">{groupTasks.length} TAREFA(S)</span>
                                      </div>
                                    </td>
                                  </tr>
                                );

                                if (!isCategoryCollapsed) {
                                  const groupRoots = groupTasks.filter(t => !t.parentId || !groupTasks.some(x => x.id === t.parentId));
                                  const sortedRoots = sortTaskList(groupRoots);

                                  sortedRoots.forEach(t => {
                                    renderRowHierarchical(t, 0, area.name, category.name);
                                  });
                                }
                              }
                            });
                          }
                        }
                      });

                      if (rows.length === 0) {
                        return (
                          <tr>
                            <td colSpan={9} className="p-12 text-center text-slate-400 italic font-bold">
                              Nenhuma tarefa encontrada com os filtros atuais.
                            </td>
                          </tr>
                        );
                      }

                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Dashboard Timeline Modal Overlay */}
        {timelineTaskId !== null && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex flex-col p-4 sm:p-8 md:p-12 items-center justify-center overflow-hidden">
            <div className="bg-white rounded-[2rem] w-full max-w-5xl h-full max-h-[90vh] shadow-2xl relative flex flex-col">
              <div className="flex z-20 justify-between items-center p-6 border-b border-slate-100 shrink-0">
                 <h3 className="text-xl font-black text-slate-800 tracking-tight">Evolução do Item</h3>
                 <button onClick={() => setTimelineTaskId(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-500 hover:text-slate-800" /></button>
              </div>
              <div className="p-6 sm:p-10 overflow-y-auto custom-scrollbar flex-1 relative">
                <div className="mb-8 border-b border-slate-100 pb-4">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={16} className="text-adasa-mid" /> 
                    Linha do Tempo: {getTaskDisplayName(taskById[timelineTaskId]) || ""}
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1 mb-4">
                    Exibindo a hierarquia da tarefa (predecessores e subtarefas dependentes). As estatísticas referem-se à tarefa selecionada e suas filhas.
                  </p>
                  {(() => {
                    const targetIdx = timelineTasks.findIndex(t => t.isTarget);
                    // Include target and descendants for stats, or just descendants? Let's include target too since the UI says "tarefa selecionada e suas filhas"
                    const childrenTasks = timelineTasks.slice(targetIdx);
                    const total = childrenTasks.length;
                    if (total === 0) return null;
                    
                    const completed = childrenTasks.filter(t => normalizeStatus(t.task.status) === "Concluída").length;
                    const inProgress = childrenTasks.filter(t => normalizeStatus(t.task.status) === "Em andamento").length;
                    const pending = total - completed - inProgress;
                    
                    return (
                      <div className="flex flex-wrap items-center justify-center gap-4 py-2">
                        <div className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                          <span>TOTAIS <span className="border-l border-slate-300 ml-2 pl-2 text-sm font-extrabold">{total}</span></span>
                        </div>
                        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                          <CheckCircle2 size={16} /> CONCLUÍDAS <span className="border-l border-emerald-200 ml-1 pl-2 text-sm font-extrabold">{completed}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                          <Activity size={16} /> EM ANDAMENTO <span className="border-l border-blue-200 ml-1 pl-2 text-sm font-extrabold">{inProgress}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                          <Clock size={16} /> NÃO INICIADAS <span className="border-l border-slate-200 ml-1 pl-2 text-sm font-extrabold">{pending}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="relative border-l-2 border-slate-200/80 ml-4 lg:ml-6 pl-6 lg:pl-10 space-y-12">
                  {timelineTasks.map(({ task, depth, isTarget, isAncestor }, idx) => (
                    <div key={task.id} className="relative group z-10">
                      {depth > 0 && (
                        <div 
                          className="absolute top-4 border-t-2 border-slate-200/80 border-dashed -z-10"
                          style={{ left: '-20px', width: `calc(20px + ${Math.min(depth * 1.5, 6)}rem)` }}
                        />
                      )}
                      
                      <div className={`absolute -left-[37px] lg:-left-[55px] top-1.5 z-10 w-6 h-6 lg:w-7 lg:h-7 rounded-full border-[3px] border-white flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 ${normalizeStatus(task.status) === "Concluída" ? "bg-emerald-500" : normalizeStatus(task.status) === "Em andamento" ? "bg-blue-500" : "bg-slate-400"}`}>
                        {normalizeStatus(task.status) === "Concluída" ? <CheckCircle2 size={12} className="text-white" /> : normalizeStatus(task.status) === "Em andamento" ? <Activity size={12} className="text-white" /> : <Clock size={12} className="text-white" />}
                      </div>
                      
                      <div 
                        className={cn("border p-5 rounded-2xl hover:shadow-md transition-all cursor-pointer group-hover:-translate-y-0.5", isTarget ? "bg-indigo-50/50 border-indigo-300 shadow-md ring-2 ring-indigo-500/20" : isAncestor ? "bg-slate-50/50 border-slate-200 opacity-80 hover:opacity-100" : "bg-white border-slate-200/70 hover:border-adasa-mid/60")} 
                        onClick={() => { setTimelineTaskId(null); handleEditTask(task); }}
                        style={{ marginLeft: `${depth > 0 ? Math.min(depth * 1.5, 6) : 0}rem` }}
                      >
                        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              {isTarget && <span className="text-[10px] font-black tracking-widest uppercase text-white bg-indigo-500 px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm"><Activity size={10} className="text-indigo-100" /> Selecionada</span>}
                              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-md">ID: {task.id}</span>
                              <span className={`text-[9px] font-bold uppercase py-0.5 px-2 rounded-md border ${getPriorityBadgeClass(task.priority)}`}>{task.priority}</span>

                              {(() => {
                                const normStatus = normalizeStatus(task.status);
                                let statusClasses = "bg-slate-100 text-slate-600 border-slate-200";
                                if (normStatus === "Concluída") statusClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                else if (normStatus === "Em andamento") statusClasses = "bg-blue-50 text-blue-700 border-blue-200";

                                return (
                                  <span className={`text-[9px] font-black uppercase py-0.5 px-2 rounded-md border ${statusClasses}`}>
                                    {normStatus}
                                  </span>
                                );
                              })()}

                              {(() => {
                                if (normalizeStatus(task.status) === "Concluída") return null;
                                const dlStatus = getDeadlineStatus(task.endDate, task.status);
                                let dlClasses = "bg-slate-550 text-slate-500 border-slate-200";
                                if (dlStatus === "Atrasada") dlClasses = "bg-rose-500 text-white border-rose-500 font-extrabold shadow-xs";
                                else if (dlStatus === "Crítica") dlClasses = "bg-amber-500 text-white border-amber-500 font-extrabold shadow-xs";
                                else dlClasses = "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold";

                                return (
                                  <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border ${dlClasses}`}>
                                    {dlStatus}
                                  </span>
                                );
                              })()}
                              {task.parentId && (
                                <span className="text-[10px] font-black tracking-widest uppercase text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1"><GitCommit size={10} /> Subatividade</span>
                              )}
                              {task.categoryIds?.map(cid => {
                                const cat = categories.find(c => c.id === cid);
                                return cat ? (
                                  <span key={cid} className="text-[9px] font-bold uppercase text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Tag size={10} /> {cat.name}
                                  </span>
                                ) : null;
                              })}
                            </div>
                            <h4 className="text-base font-black text-slate-800 leading-tight group-hover:text-adasa-mid transition-colors">{getTaskDisplayName(task)}</h4>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex-wrap justify-end">
                            <div className="flex flex-col items-start gap-1">
                              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                <CalendarRange size={12} className="text-adasa-mid" /> Início
                              </div>
                              <div className="text-sm font-black text-slate-800">{formatDate(task.startDate) || "Não definido"}</div>
                            </div>
                            <div className="w-px h-8 bg-slate-100"></div>
                            <div className="flex flex-col items-start gap-1">
                              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                <CalendarRange size={12} className="text-adasa-mid" /> Prazo final
                              </div>
                              <div className="text-sm font-black text-slate-800">{formatDate(task.endDate) || "Não definido"}</div>
                            </div>
                          </div>
                        </div>

                        {task.description && (
                          <p className="text-xs font-semibold text-slate-600 mb-4 leading-relaxed line-clamp-2">{task.description}</p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200/70">
                          <div className="space-y-4">
                            {task.responsibleIds && task.responsibleIds.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Responsáveis</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {task.responsibleIds.map(rid => {
                                    const resp = responsibles.find(r => r.id === rid);
                                    if (!resp) return null;
                                    const initials = resp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                    return (
                                      <div key={rid} className="flex items-center justify-center w-7 h-7 text-[10px] font-bold text-slate-700 bg-slate-100 rounded-full border border-slate-200 shadow-sm" title={resp.name}>
                                        {initials}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {task.dependsOnTaskId && taskById[task.dependsOnTaskId] && (
                              <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Depende de</span>
                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm w-max" title={getTaskDisplayName(taskById[task.dependsOnTaskId])}>
                                  <Link2 size={14} className="text-slate-400" />
                                  <span className="max-w-[200px] truncate">{getTaskDisplayName(taskById[task.dependsOnTaskId])}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block flex justify-between">Progresso <span className="text-adasa-mid">{task.progress}%</span></span>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-200/50">
                              <div className={`h-full ${normalizeStatus(task.status) === "Concluída" ? "bg-emerald-500" : "bg-adasa-mid"} transition-all duration-500`} style={{ width: `${task.progress || 0}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {timelineTasks.length === 0 && (
                    <div className="text-center py-10 text-slate-400 font-semibold italic text-sm">
                      Nenhuma tarefa encontrada na linha do tempo.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const configActiveTab = "plans"; // fallback for compiler

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16">
      {/* Main split work-desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left side: Search filters and Task tree */}
        <div className="lg:col-span-12 bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <button
              onClick={() => setIsTasksFiltersExpanded(!isTasksFiltersExpanded)}
              className="flex-1 text-left flex justify-between items-center group focus:outline-none cursor-pointer"
            >
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <ListTodo size={18} className="text-adasa-mid" /> Filtro de Atividades
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Navegação multinível, subtarefas e consolidação automática temporo-produtiva.
                </p>
              </div>
              <div className="bg-slate-50 group-hover:bg-slate-100 border border-slate-200 group-hover:border-slate-350 text-slate-400 group-hover:text-slate-600 p-2 rounded-xl transition-colors mr-2">
                {isTasksFiltersExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </button>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <button
                onClick={reloadTasks}
                disabled={isSyncing}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all flex items-center justify-center animate-none"
                title="Sincronizar tarefas"
              >
                <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          {isTasksFiltersExpanded && (
            <div className="bg-slate-50/60 rounded-3xl border border-slate-200/60 p-5 space-y-5 animate-in slide-in-from-top-4 fade-in duration-300">
            {/* Row 1: Plan Select (sorted to show most recent first) */}
            <div className="flex flex-col gap-1.5 max-w-xs">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">📁 Plano</span>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-adasa-mid bg-white text-slate-700 font-bold"
              >
                <option value="all">Todos os Planos</option>
                {[...plans]
                  .sort((a, b) => {
                    const yearA = parseInt(a.name.match(/\d{4}/)?.[0] || "0", 10);
                    const yearB = parseInt(b.name.match(/\d{4}/)?.[0] || "0", 10);
                    if (yearA !== yearB) return yearB - yearA;
                    return b.id - a.id;
                  })
                  .map((p) => (
                    <option key={p.id} value={p.id.toString()}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Row 2: Area checkbox filter (styled like subsystems) alone on this row */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">🏷️ Filtro por Área de Atuação</span>
              <div className="flex flex-wrap gap-2">
                <label className={cn(
                  "flex items-center gap-2 cursor-pointer px-3.5 py-2 rounded-xl border text-xs font-black tracking-wide transition-all select-none",
                  selectedAreaIds.length === 0 
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                )}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedAreaIds.length === 0}
                    onChange={() => setSelectedAreaIds([])}
                  />
                  <span>TODAS AS ÁREAS</span>
                </label>
                {areas.map((area) => {
                  const isChecked = selectedAreaIds.includes(area.id);
                  return (
                    <label key={area.id} className={cn(
                      "flex items-center gap-2 cursor-pointer px-3.5 py-2 rounded-xl border text-xs font-black tracking-wide transition-all select-none uppercase",
                      isChecked 
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs ring-2 ring-indigo-50" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}>
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-350 focus:ring-indigo-100 cursor-pointer"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAreaIds((prev) => {
                              const nextAreas = [...prev, area.id];
                              setSelectedResponsibleIds(prevResps => 
                                prevResps.filter(rid => {
                                  const r = responsibles.find(x => x.id === rid);
                                  return r && r.areaIds?.some(aid => nextAreas.includes(Number(aid)));
                                })
                              );
                              return nextAreas;
                            });
                          } else {
                            setSelectedAreaIds((prev) => {
                              const nextAreas = prev.filter((id) => id !== area.id);
                              if (nextAreas.length > 0) {
                                setSelectedResponsibleIds(prevResps => 
                                  prevResps.filter(rid => {
                                    const r = responsibles.find(x => x.id === rid);
                                    return r && r.areaIds?.some(aid => nextAreas.includes(Number(aid)));
                                  })
                                );
                              }
                              return nextAreas;
                            });
                          }
                        }}
                      />
                      <span>{area.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Row 2.5: Responsible checkbox filter (synchronized with areas) */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">👥 Filtro por Responsável</span>
              <div className="flex flex-wrap gap-2">
                <label className={cn(
                  "flex items-center gap-2 cursor-pointer px-3.5 py-2 rounded-xl border text-xs font-black tracking-wide transition-all select-none",
                  selectedResponsibleIds.length === 0 
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                )}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedResponsibleIds.length === 0}
                    onChange={() => setSelectedResponsibleIds([])}
                  />
                  <span>TODOS OS RESPONSÁVEIS</span>
                </label>
                {responsibles
                  .filter((resp) => {
                    // if no areas selected, show all
                    if (selectedAreaIds.length === 0) return true;
                    // if areas selected, show if responsible has ANY of the selected areas
                    return resp.areaIds?.some((id) => selectedAreaIds.includes(Number(id)));
                  })
                  .map((resp) => {
                  const isChecked = selectedResponsibleIds.includes(resp.id);
                  return (
                    <label key={resp.id} className={cn(
                      "flex items-center gap-2 cursor-pointer px-3.5 py-2 rounded-xl border text-xs font-black tracking-wide transition-all select-none uppercase",
                      isChecked 
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs ring-2 ring-indigo-50" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}>
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-350 focus:ring-indigo-100 cursor-pointer"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedResponsibleIds((prev) => [...prev, resp.id]);
                          } else {
                            setSelectedResponsibleIds((prev) => prev.filter((id) => id !== resp.id));
                          }
                        }}
                      />
                      <span>{resp.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Status, Situation, Priority and Category Select filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">🚦 Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-adasa-mid bg-white text-slate-700 font-bold"
                >
                  <option value="all">Todos os Status</option>
                  <option value="Não iniciada">NÃO INICIADA</option>
                  <option value="Em andamento">EM ANDAMENTO</option>
                  <option value="Concluída">CONCLUÍDA</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">📅 Situação</span>
                <select
                  value={situationFilter}
                  onChange={(e) => setSituationFilter(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-adasa-mid bg-white text-slate-700 font-bold"
                >
                  <option value="all">Todas as Situações</option>
                  <option value="No Prazo">NO PRAZO</option>
                  <option value="Crítica">CRÍTICA</option>
                  <option value="Atrasada">ATRASADA</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">⚡ Prioridade</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-adasa-mid bg-white text-slate-700 font-bold"
                >
                  <option value="all">Todas as Prioridades</option>
                  <option value="Alta">ALTA</option>
                  <option value="Média">MÉDIA</option>
                  <option value="Baixa">BAIXA</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">📂 Categoria</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-adasa-mid bg-white text-slate-700 font-bold"
                >
                  <option value="all">Todas as Categorias</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id.toString()}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Search layout */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">🔍 Buscar por tarefa, descrição ou tags</span>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Digite o título, descrição, notas, tipo ou áreas de atuação para filtrar as atividades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-adasa-mid w-full bg-white text-slate-800 placeholder-slate-400/90 font-medium"
                />
              </div>
            </div>
          </div>
        )}
          <div className="mt-6 mb-2 border-l-4 border-adasa-mid pl-2.5 py-0.5">
            <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-widest">
              Visualização
            </h3>
          </div>

          {/* View Toggle & Adicionar Tarefa Actions */}
          <div className="flex flex-col xl:flex-row justify-center items-center bg-slate-50 border border-slate-200 rounded-2xl p-3 w-full gap-4">
            <div className="flex flex-wrap items-center justify-center gap-2 overflow-x-auto pb-1 xl:pb-0 w-full xl:w-auto">
              <button
                onClick={() => { setViewMode("category"); setTimelineTaskId(null); }}
                className={`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm ${viewMode === "category" && timelineTaskId === null ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
              >
                <Tag size={16} /> Categorias
              </button>
              <button
                onClick={() => { setViewMode("board"); setTimelineTaskId(null); }}
                className={`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm ${viewMode === "board" && timelineTaskId === null ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
              >
                <LayoutGrid size={16} /> Quadro
              </button>
              <button
                onClick={() => { setViewMode("status"); setTimelineTaskId(null); }}
                className={`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm ${viewMode === "status" && timelineTaskId === null ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
              >
                <CheckCircle2 size={16} /> Status
              </button>
              <button
                onClick={() => { setViewMode("area"); setTimelineTaskId(null); }}
                className={`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm ${viewMode === "area" && timelineTaskId === null ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
              >
                <Briefcase size={16} /> Áreas
              </button>
              <button
                onClick={() => { setViewMode("responsible"); setTimelineTaskId(null); }}
                className={`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm ${viewMode === "responsible" && timelineTaskId === null ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
              >
                <Users size={16} /> Responsáveis
              </button>
              <button
                onClick={() => { setViewMode("tree"); setTimelineTaskId(null); }}
                className={`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm ${viewMode === "tree" && timelineTaskId === null ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
              >
                <FolderKanban size={16} /> Lista
              </button>
              <button
                onClick={() => { setViewMode("table"); setTimelineTaskId(null); }}
                className={`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm ${viewMode === "table" && timelineTaskId === null ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
              >
                <Table size={16} /> Tabela
              </button>
              {timelineTaskId !== null && (
                <button
                  onClick={() => setTimelineTaskId(null)}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-black uppercase tracking-wider rounded-xl transition-all duration-200 bg-white text-adasa-mid shadow-sm border border-slate-200 hover:text-slate-800 hover:bg-slate-50 whitespace-nowrap xl:ml-4"
                >
                  <List size={16} /> Voltar para Filtros
                </button>
              )}
            </div>
            
            <button
              onClick={() => handleAddNewTask(null)}
              className="flex items-center justify-center gap-2 px-6 py-2.5 whitespace-nowrap bg-adasa-mid text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-xl hover:bg-adasa-dark transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer w-full xl:w-auto ml-auto"
            >
              <Plus size={18} /> Nova Tarefa
            </button>
          </div>

          {/* Main Container */}
          <div className="space-y-4">
              {["status", "category", "area", "responsible"].includes(viewMode) && (
                <div className="flex flex-col sm:flex-row items-center gap-3 justify-between bg-slate-50 border border-slate-200/80 rounded-2xl p-3 px-4 shadow-xs mt-2 select-none">
                  <div className="flex items-center gap-2">
                    <Layers size={15} className="text-indigo-500" />
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Painel de Agrupamento ({viewMode === "status" ? "Status" : viewMode === "category" ? "Categorias" : viewMode === "area" ? "Áreas" : "Responsáveis"})</span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleGroupContainersExpandCollapse(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100/80 rounded-xl transition border border-indigo-200/50 cursor-pointer uppercase tracking-wider shadow-xs"
                    >
                      <ChevronsDown size={14} className="stroke-[2.5]" /> Expandir Todos
                    </button>
                    <button
                      onClick={() => handleGroupContainersExpandCollapse(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-xs font-black text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer uppercase tracking-wider shadow-xs"
                    >
                      <ChevronsUp size={14} className="stroke-[2.5]" /> Recolher Todos
                    </button>
                  </div>
                </div>
              )}
              {viewMode === "tree" && (
                <div className="overflow-hidden rounded-xl border border-slate-200/60 mt-2">
                  {rootTasks.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm">
                      Nenhum grupo de tarefas registrado no plano de trabalho.
                    </div>
                  ) : (
                    rootTasks
                      .filter(r => childMatchesOrIsPath(r.id))
                      .map(r => renderTaskNode(r, 0, false))
                  )}
                </div>
              )}
              {viewMode === "table" && (() => {
                  let flatTasks = [...enhancedTasks].filter(t => matchesFilters(t));
                  
                  if (tableSort) {
                    flatTasks.sort((a, b) => {
                       let valA: any = "";
                       let valB: any = "";
                       
                       if (tableSort.field === "title") {
                          valA = getTaskDisplayName(a);
                          valB = getTaskDisplayName(b);
                       } else if (tableSort.field === "area") {
                          valA = (a.areaIds || []).map(id => areas.find(x => x.id === id)?.name || "").join(", ");
                          valB = (b.areaIds || []).map(id => areas.find(x => x.id === id)?.name || "").join(", ");
                       } else if (tableSort.field === "category") {
                          valA = (a.categoryIds || []).map(id => categories.find(x => x.id === id)?.name || "").join(", ");
                          valB = (b.categoryIds || []).map(id => categories.find(x => x.id === id)?.name || "").join(", ");
                       } else if (tableSort.field === "responsibles") {
                          valA = (a.responsibleIds || []).map(id => responsibles.find(x => x.id === id)?.name || "").join(", ");
                          valB = (b.responsibleIds || []).map(id => responsibles.find(x => x.id === id)?.name || "").join(", ");
                       } else if (tableSort.field === "progress") {
                          valA = a.progress || 0;
                          valB = b.progress || 0;
                       } else if (tableSort.field === "status") {
                          valA = normalizeStatus(a.status);
                          valB = normalizeStatus(b.status);
                       } else if (tableSort.field === "situation") {
                          valA = getDeadlineStatus(a.endDate, a.status);
                          valB = getDeadlineStatus(b.endDate, b.status);
                       } else if (tableSort.field === "priority") {
                          const getPrioValue = (tk: Task) => {
                            if (tk.priority === "Alta") return 1;
                            if (tk.priority === "Média") return 2;
                            if (tk.priority === "Baixa") return 3;
                            return 4;
                          };
                          valA = getPrioValue(a);
                          valB = getPrioValue(b);
                       } else if (tableSort.field === "start") {
                          valA = a.startDate || "9999-99-99";
                          valB = b.startDate || "9999-99-99";
                       } else if (tableSort.field === "end") {
                          valA = a.endDate || "9999-99-99";
                          valB = b.endDate || "9999-99-99";
                       }
                       
                       if (valA < valB) return tableSort.dir === "asc" ? -1 : 1;
                       if (valA > valB) return tableSort.dir === "asc" ? 1 : -1;
                       return 0;
                    });
                  }

                  const handleSort = (field: string) => {
                     setTableSort(prev => {
                        if (prev?.field === field) {
                           return prev.dir === "asc" ? { field, dir: "desc" } : null;
                        }
                        return { field, dir: "asc" };
                     });
                  };

                  const SortIcon = ({ field }: { field: string }) => {
                     if (tableSort?.field !== field) return <ChevronDown size={14} className="opacity-30" />;
                     return tableSort.dir === "asc" ? <ChevronUp size={14} className="text-indigo-600" /> : <ChevronDown size={14} className="text-indigo-600" />;
                  };

                  return (
                    <div className="space-y-3">
                      {/* Top horizontal scrollbar bar, only displayed if we have a scrollable table */}
                      {tableScrollWidth > 0 && (
                        <div 
                          ref={topScrollTableRef}
                          onScroll={handleTopTableScroll}
                          className="hidden lg:block overflow-x-auto w-full scrollbar-thin bg-slate-50 border border-slate-200/60 p-1.5 rounded-xl mb-1"
                        >
                          <div style={{ width: `${tableScrollWidth}px` }} className="h-1 bg-transparent" />
                        </div>
                      )}
                      <div ref={contentScrollTableRef} onScroll={handleContentTableScroll} className="overflow-x-auto rounded-xl border border-slate-200 mt-2 bg-white shadow-sm scrollbar-thin scrollbar-thumb-slate-300">
                       <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
                         <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                              <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort("title")}>
                                <div className="flex items-center gap-1.5">Tarefa <SortIcon field="title" /></div>
                              </th>
                              <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort("area")}>
                                <div className="flex items-center gap-1.5">Área <SortIcon field="area" /></div>
                              </th>
                              <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort("category")}>
                                <div className="flex items-center gap-1.5">Categoria <SortIcon field="category" /></div>
                              </th>
                              <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort("responsibles")}>
                                <div className="flex items-center gap-1.5">Responsáveis <SortIcon field="responsibles" /></div>
                              </th>
                              <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort("start")}>
                                <div className="flex items-center gap-1.5">Início <SortIcon field="start" /></div>
                              </th>
                              <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort("end")}>
                                <div className="flex items-center gap-1.5">Prazo <SortIcon field="end" /></div>
                              </th>
                              <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none text-center" onClick={() => handleSort("priority")}>
                                <div className="flex items-center justify-center gap-1.5">Prioridade <SortIcon field="priority" /></div>
                              </th>
                              <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none text-center" onClick={() => handleSort("status")}>
                                <div className="flex items-center justify-center gap-1.5">Status <SortIcon field="status" /></div>
                              </th>
                              <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none text-center" onClick={() => handleSort("situation")}>
                                <div className="flex items-center justify-center gap-1.5">Situação <SortIcon field="situation" /></div>
                              </th>
                              <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none min-w-[140px]" onClick={() => handleSort("progress")}>
                                <div className="flex items-center gap-1.5">Progresso <SortIcon field="progress" /></div>
                              </th>
                              <th className="px-4 py-3 text-center">Timeline</th>
                            </tr>
                          </thead>
                         <tbody className="divide-y divide-slate-100">
                           {flatTasks.length === 0 ? (
                             <tr>
                               <td colSpan={11} className="text-center py-12 text-slate-400 font-medium">Nenhuma tarefa encontrada.</td>
                             </tr>
                           ) : flatTasks.map(task => {
                               const taskChildrenCount = childrenMap[task.id]?.length || 0;
                               const normStatus = normalizeStatus(task.status);
                               let statusClasses = "bg-slate-100 text-slate-600 border-slate-200";
                               if (normStatus === "Concluída") statusClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
                               else if (normStatus === "Em andamento") statusClasses = "bg-blue-50 text-blue-700 border-blue-200";

                               const dlStatus = getDeadlineStatus(task.endDate, task.status);
                               let dlClasses = "bg-slate-50 text-slate-500 border-slate-200";
                               if (normStatus !== "Concluída") {
                                  if (dlStatus === "Atrasada") dlClasses = "bg-rose-500 text-white border-rose-500 shadow-xs";
                                  else if (dlStatus === "Crítica") dlClasses = "bg-amber-500 text-white border-amber-500 shadow-xs";
                                  else dlClasses = "bg-emerald-50 text-emerald-800 border-emerald-200";
                               }

                               return (
                                 <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                                   <td className="px-4 py-3 border-r border-slate-50">
                                     <span className="font-bold text-slate-800 hover:text-indigo-600 block cursor-pointer transition-colors" onClick={() => handleEditTask(task)}>
                                       {getTaskDisplayName(task)} {taskChildrenCount > 0 && <span className="text-slate-400 font-normal">({taskChildrenCount})</span>}
                                     </span>
                                     {task.parentId && taskById[task.parentId] && (
                                       <span className="text-[9px] text-indigo-500 font-bold uppercase mt-0.5 block truncate max-w-xs" title={`Subtarefa de: ${taskById[task.parentId].title}`}>
                                          Subtarefa de: {taskById[task.parentId].title}
                                       </span>
                                     )}
                                   </td>
                                   <td className="px-4 py-3 border-r border-slate-50">
                                     <div className="flex flex-wrap gap-1">
                                        {task.areaIds?.map(aid => {
                                           const ar = areas.find(a => a.id === aid);
                                           if (!ar) return null;
                                           return <span key={aid} className="text-[9px] font-bold uppercase bg-sky-50 text-sky-700 border border-sky-100 px-1.5 py-0.5 rounded-sm line-clamp-1">{ar.name}</span>;
                                        })}
                                     </div>
                                   </td>
                                   <td className="px-4 py-3 border-r border-slate-50">
                                     <div className="flex flex-wrap gap-1">
                                        {task.categoryIds?.map(cid => {
                                           const cat = categories.find(c => c.id === cid);
                                           if (!cat) return null;
                                           return <span key={cid} className="text-[9px] font-bold uppercase bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-sm line-clamp-1">{cat.name}</span>;
                                        })}
                                     </div>
                                   </td>
                                   <td className="px-4 py-3 border-r border-slate-50">
                                     <div className="flex flex-wrap gap-1">
                                        {task.responsibleIds?.map(rid => {
                                           const r = responsibles.find(x => x.id === rid);
                                           if (!r) return null;
                                           return <span key={rid} className="text-[9px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-sm line-clamp-1">{r.name}</span>;
                                        })}
                                     </div>
                                   </td>
                                    <td className="px-4 py-3 border-r border-slate-50 font-semibold text-slate-600 whitespace-nowrap">
                                      {formatDate(task.startDate)}
                                    </td>
                                    <td className="px-4 py-3 border-r border-slate-50 font-semibold text-slate-600 whitespace-nowrap">
                                      {formatDate(task.endDate)}
                                    </td>
                                    <td className="px-4 py-3 border-r border-slate-50 text-center">
                                      {normStatus === "Concluída" ? (
                                        <div className="inline-flex items-center justify-center text-emerald-500" title="Status: Concluída">
                                          <CheckCircle2 size={16} />
                                        </div>
                                      ) : normStatus === "Em andamento" ? (
                                        <div className="inline-flex items-center justify-center text-blue-500 animate-pulse" title="Status: Em andamento">
                                          <Clock size={16} />
                                        </div>
                                      ) : (
                                        <div className="inline-flex items-center justify-center text-slate-300" title="Status: Não iniciada">
                                          <Circle size={16} />
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 border-r border-slate-50 text-center">
                                      {normStatus === "Concluída" ? (
                                        <div className="inline-flex items-center justify-center text-emerald-500" title="Situação: No Prazo (Concluída)">
                                          <CheckCircle2 size={16} />
                                        </div>
                                      ) : dlStatus === "Atrasada" ? (
                                        <div className="inline-flex items-center justify-center text-rose-500" title="Situação: Atrasada">
                                          <AlertCircle size={16} />
                                        </div>
                                      ) : dlStatus === "Crítica" ? (
                                        <div className="inline-flex items-center justify-center text-amber-500" title="Situação: Crítica">
                                          <AlertTriangle size={16} />
                                        </div>
                                      ) : (
                                        <div className="inline-flex items-center justify-center text-emerald-500" title="Situação: No Prazo">
                                          <CheckCircle2 size={16} />
                                        </div>
                                      )}
                                    </td>
                                   <td className="px-4 py-3">
                                     <div className="space-y-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block flex justify-between">Progresso <span className="text-adasa-mid">{task.progress || 0}%</span></span>
                                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                          <div className={`h-full ${normalizeStatus(task.status) === "Concluída" ? "bg-emerald-500" : "bg-adasa-mid"} transition-all duration-500`} style={{ width: `${task.progress || 0}%` }} />
                                        </div>
                                     </div>
                                   </td>
                                   <td className="px-4 py-3 text-center">
                                     <button
                                       onClick={() => setTimelineTaskId(task.id)}
                                       className="p-1 px-2 bg-white border border-slate-200 text-slate-600 hover:text-adasa-mid hover:border-adasa-200 rounded-lg transition shadow-sm text-xs font-bold inline-flex items-center justify-center"
                                       title="Ver Linha do Tempo"
                                     >
                                       <Activity size={12} className="text-indigo-600" />
                                     </button>
                                   </td>
                                 </tr>
                               );
                           })}
                         </tbody>
                       </table>
                    </div>
                    </div>
                  );
              })()}
              {viewMode === "status" && (() => {
                 const groups = {
                   "Não iniciada": rootTasks.filter(t => normalizeStatus(t.status) === "Não iniciada"),
                   "Em andamento": rootTasks.filter(t => normalizeStatus(t.status) === "Em andamento"),
                   "Concluída": rootTasks.filter(t => normalizeStatus(t.status) === "Concluída")
                 };
                 return (
                   <div className="space-y-4 mt-2">
                     {Object.entries(groups).map(([status, groupRootTasks]) => {
                       if (groupRootTasks.length === 0) return null;
                       
                       return (
                         <div key={status} className="overflow-hidden rounded-xl border border-slate-200/60 flex flex-col bg-white transition-all duration-200 shadow-sm">
                            <div 
                              onClick={() => toggleGroupContainer("status", status)}
                              className="bg-slate-50 hover:bg-slate-100/70 border-b border-slate-200/60 px-4 py-3 flex items-center justify-between cursor-pointer select-none transition-colors"
                            >
                              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                 {expandedGroupContainers[`status-${status}`] !== false ? <ChevronDown size={14} className="text-slate-400 stroke-[2.5]" /> : <ChevronRight size={14} className="text-slate-400 stroke-[2.5]" />}
                                 {status === "Concluída" ? <CheckCircle2 size={14} className="text-emerald-500" /> : status === "Em andamento" ? <Activity size={14} className="text-blue-500" /> : <Clock size={14} className="text-slate-400" />}
                                 {status}
                              </h3>
                              <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{groupRootTasks.length} grupos estruturais</span>
                            </div>
                            {expandedGroupContainers[`status-${status}`] !== false && (
                              <div>
                                {groupRootTasks.filter(t => childMatchesOrIsPath(t.id)).map(t => renderTaskNode(t, 0, false))}
                              </div>
                            )}
                         </div>
                       )
                     })}
                   </div>
                 );
              })()}
              {viewMode === "category" && (() => {
                 const cats = [...categories, { id: -1, name: "Sem categoria", color: "", description: "" }];
                 return (
                   <div className="space-y-4 mt-2">
                     {cats.map(cat => {
                       const groupRootTasks = rootTasks.filter(t => cat.id === -1 ? (!t.categoryIds || t.categoryIds.length === 0) : (t.categoryIds && t.categoryIds.includes(cat.id)));
                       if (groupRootTasks.length === 0) return null;
                       
                       return (
                         <div key={cat.id} className="overflow-hidden rounded-xl border border-slate-200/60 flex flex-col bg-white transition-all duration-200 shadow-sm">
                            <div 
                              onClick={() => toggleGroupContainer("category", cat.id)}
                              className="bg-slate-50 hover:bg-slate-100/70 border-b border-slate-200/60 px-4 py-3 flex items-center justify-between cursor-pointer select-none transition-colors"
                            >
                              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                 {expandedGroupContainers[`category-${cat.id}`] !== false ? <ChevronDown size={14} className="text-slate-400 stroke-[2.5]" /> : <ChevronRight size={14} className="text-slate-400 stroke-[2.5]" />}
                                 <Tag size={14} className="text-slate-400" />
                                 {cat.name}
                              </h3>
                              <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{groupRootTasks.length} grupos estruturais</span>
                            </div>
                            {expandedGroupContainers[`category-${cat.id}`] !== false && (
                              <div>
                                {groupRootTasks.filter(t => childMatchesOrIsPath(t.id)).map(t => renderTaskNode(t, 0, false))}
                              </div>
                            )}
                         </div>
                       )
                     })}
                   </div>
                 );
              })()}
              {viewMode === "area" && (() => {
                 const ars = [...areas, { id: -1, name: "Sem área definida" }];
                 return (
                   <div className="space-y-4 mt-2">
                     {ars.map(ar => {
                       const groupRootTasks = rootTasks.filter(t => ar.id === -1 ? (!t.areaIds || t.areaIds.length === 0) : (t.areaIds && t.areaIds.includes(ar.id)));
                       if (groupRootTasks.length === 0) return null;
                       
                       return (
                         <div key={ar.id} className="overflow-hidden rounded-xl border border-slate-200/60 flex flex-col bg-white transition-all duration-200 shadow-sm">
                            <div 
                              onClick={() => toggleGroupContainer("area", ar.id)}
                              className="bg-slate-50 hover:bg-slate-100/70 border-b border-slate-200/60 px-4 py-3 flex items-center justify-between cursor-pointer select-none transition-colors"
                            >
                              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                 {expandedGroupContainers[`area-${ar.id}`] !== false ? <ChevronDown size={14} className="text-slate-400 stroke-[2.5]" /> : <ChevronRight size={14} className="text-slate-400 stroke-[2.5]" />}
                                 <Briefcase size={14} className="text-slate-400" />
                                 {ar.name}
                              </h3>
                              <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{groupRootTasks.length} grupos estruturais</span>
                            </div>
                            {expandedGroupContainers[`area-${ar.id}`] !== false && (
                              <div>
                                {groupRootTasks.filter(t => childMatchesOrIsPath(t.id)).map(t => renderTaskNode(t, 0, false))}
                              </div>
                            )}
                         </div>
                       )
                     })}
                   </div>
                 );
              })()}
              {viewMode === "board" && (() => {
                  const visibleTasks = enhancedTasks.filter(t => matchesFilters(t));
                  const groups: Record<string, Task[]> = {};

                  if (boardGroupBy === "status") {
                    groups["Não iniciada"] = visibleTasks.filter(t => normalizeStatus(t.status) === "Não iniciada");
                    groups["Em andamento"] = visibleTasks.filter(t => normalizeStatus(t.status) === "Em andamento");
                    groups["Concluída"] = visibleTasks.filter(t => normalizeStatus(t.status) === "Concluída");
                  } else {
                    categories.forEach(cat => {
                      groups[cat.name] = [];
                    });
                    groups["Sem Categoria"] = [];

                    visibleTasks.forEach(task => {
                      if (task.categoryIds && task.categoryIds.length > 0) {
                        let assigned = false;
                        task.categoryIds.forEach(catId => {
                          const cat = categories.find(c => c.id === catId);
                          if (cat) {
                            groups[cat.name].push(task);
                            assigned = true;
                          }
                        });
                        if (!assigned) {
                          groups["Sem Categoria"].push(task);
                        }
                      } else {
                        groups["Sem Categoria"].push(task);
                      }
                    });
                  }

                  const isStatusGroup = boardGroupBy === "status";
                  const wrapperClass = isStatusGroup
                    ? "grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-2 font-sans text-slate-800 w-full"
                    : "flex flex-col lg:flex-row gap-6 overflow-x-auto pb-4 items-start mt-2 font-sans text-slate-800 w-full pr-2 scrollbar-thin";

                  const colClass = isStatusGroup
                    ? "bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 flex flex-col h-[850px] min-w-0"
                    : "bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 flex flex-col h-[850px] w-full lg:w-[360px] lg:shrink-0 min-w-0 lg:min-w-[340px]";

                  return (
                    <div className="flex flex-col w-full font-sans">
                      {/* Subheader and Group controls for Board */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
                        <div className="flex items-center gap-2">
                          <LayoutGrid size={18} className="text-adasa-mid" />
                          <span className="font-extrabold text-xs uppercase tracking-widest text-slate-700">Modo Quadro Kanban</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest">Agrupar por:</span>
                          <div className="flex bg-slate-200/60 p-1 rounded-xl border border-slate-300/40">
                            <button
                              onClick={() => setBoardGroupBy("category")}
                              className={cn(
                                "px-3.5 py-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                                !isStatusGroup
                                  ? "bg-white text-slate-800 shadow-sm font-extrabold"
                                  : "text-slate-600 hover:text-slate-800"
                              )}
                            >
                              Categorias
                            </button>
                            <button
                              onClick={() => setBoardGroupBy("status")}
                              className={cn(
                                "px-3.5 py-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                                isStatusGroup
                                  ? "bg-white text-slate-800 shadow-sm font-extrabold"
                                  : "text-slate-600 hover:text-slate-800"
                              )}
                            >
                              Status
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Top horizontal scrollbar bar, only displayed if we have a scrollable board view */}
                      {!isStatusGroup && boardScrollWidth > 0 && (
                        <div 
                          ref={topScrollRef}
                          onScroll={handleTopScroll}
                          className="hidden lg:block overflow-x-auto w-full scrollbar-thin bg-slate-50 border border-slate-200/60 p-1.5 rounded-xl mb-3"
                        >
                          <div style={{ width: `${boardScrollWidth}px` }} className="h-1 bg-transparent" />
                        </div>
                      )}

                      <div ref={contentScrollRef} onScroll={handleContentScroll} className={wrapperClass}>
                        {Object.entries(groups).map(([colKey, colTasks]) => {
                          let headerBg = "bg-slate-100 border-slate-200 text-slate-700";
                          let statusIcon = <Clock size={16} className="text-slate-400" />;

                          if (isStatusGroup) {
                            if (colKey === "Em andamento") {
                              headerBg = "bg-blue-50 border-blue-200 text-blue-700";
                              statusIcon = <Activity size={16} className="text-blue-500" />;
                            } else if (colKey === "Concluída") {
                              headerBg = "bg-emerald-50 border-emerald-250 text-emerald-700";
                              statusIcon = <CheckCircle2 size={16} className="text-emerald-550" />;
                            }
                          } else {
                            if (colKey === "Sem Categoria") {
                              headerBg = "bg-slate-100 border-slate-200 text-slate-600";
                              statusIcon = <Tag size={16} className="text-slate-400" />;
                            } else {
                              const index = categories.findIndex(c => c.name === colKey);
                              const colors = [
                                { bg: "bg-indigo-50 border-indigo-200 text-indigo-700", textToken: "text-indigo-500" },
                                { bg: "bg-amber-50 border-amber-200 text-amber-700", textToken: "text-amber-500" },
                                { bg: "bg-rose-50 border-rose-200 text-rose-700", textToken: "text-rose-500" },
                                { bg: "bg-violet-50 border-violet-200 text-violet-700", textToken: "text-violet-500" },
                                { bg: "bg-cyan-50 border-cyan-200 text-cyan-700", textToken: "text-cyan-500" },
                                { bg: "bg-teal-50 border-teal-200 text-teal-700", textToken: "text-teal-500" },
                                { bg: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700", textToken: "text-fuchsia-500" },
                              ];
                              const colorPair = colors[index % colors.length] || colors[0];
                              headerBg = colorPair.bg;
                              statusIcon = <Tag size={16} className={colorPair.textToken} />;
                            }
                          }

                          return (
                            <div key={colKey} className={colClass}>
                              {/* Column Header */}
                              <div className={cn("flex items-center justify-between mb-4 p-3 rounded-xl border font-bold text-xs uppercase tracking-wider shadow-sm", headerBg)}>
                                <div className="flex items-center gap-2">
                                  {statusIcon}
                                  <span className="truncate max-w-[150px]" title={colKey}>{colKey}</span>
                                </div>
                                <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-black border text-slate-500 shadow-xs border-slate-200">
                                  {colTasks.length}
                                </span>
                              </div>

                              {/* Card List scrollable */}
                              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                                {colTasks.length === 0 ? (
                                  <div className="text-center p-8 text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/40">
                                    Nenhuma atividade
                                  </div>
                                ) : (
                                  colTasks.map(task => {
                                    const parentTask = task.parentId ? taskById[task.parentId] : null;
                                    return (
                                      <motion.div
                                        key={task.id}
                                        whileHover={{ y: -2, scale: 1.01 }}
                                        className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs hover:shadow-sm transition-all flex flex-col gap-3 group relative cursor-default"
                                      >
                                        {/* Top Priority and Title */}
                                        <div className="flex items-start justify-between gap-1.5">
                                          <div className="space-y-0.5 min-w-0 w-full">
                                            <h4 
                                              onClick={() => handleEditTask(task)}
                                              className="text-xs font-black text-slate-800 hover:text-indigo-600 transition-colors cursor-pointer tracking-tight leading-tight uppercase truncate"
                                              title={`Editar: ${task.title}`}
                                            >
                                              {task.title}
                                            </h4>
                                            
                                            {/* Status / Priority / Situation Badges */}
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                                              {task.priority && (
                                                <span className={cn(
                                                  "text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm border shadow-xs flex items-center gap-1",
                                                  task.priority === "Alta" ? "bg-rose-50 text-rose-700 border-rose-250" :
                                                  task.priority === "Média" ? "bg-amber-50 text-amber-700 border-amber-250" :
                                                  "bg-slate-50 text-slate-600 border-slate-200"
                                                )}>
                                                  <Flag size={9} className={task.priority === "Alta" ? "fill-rose-100" : task.priority === "Média" ? "fill-amber-100" : ""} />
                                                  {task.priority}
                                                </span>
                                              )}
                                              {(() => {
                                                const normStatus = normalizeStatus(task.status);
                                                let statusClasses = "bg-slate-50 text-slate-600 border-slate-200";
                                                let StatusIcon = Circle;
                                                if (normStatus === "Concluída") {
                                                  statusClasses = "bg-emerald-50 text-emerald-700 border-emerald-250";
                                                  StatusIcon = CheckCircle2;
                                                } else if (normStatus === "Em andamento") {
                                                  statusClasses = "bg-blue-50 text-blue-700 border-blue-250";
                                                  StatusIcon = Clock;
                                                }
                                                return (
                                                  <span className={`text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm border shadow-xs flex items-center gap-1 ${statusClasses}`}>
                                                    <StatusIcon size={9} />
                                                    {normStatus}
                                                  </span>
                                                );
                                              })()}
                                              {(() => {
                                                if (normalizeStatus(task.status) === "Concluída") return null;
                                                const dlStatus = getDeadlineStatus(task.endDate, task.status);
                                                let dlClasses = "bg-slate-50 text-slate-500 border-slate-200";
                                                let DlIcon = CheckCircle2;
                                                if (dlStatus === "Atrasada") {
                                                  dlClasses = "bg-rose-500 text-white border-rose-500 shadow-xs";
                                                  DlIcon = AlertCircle;
                                                } else if (dlStatus === "Crítica") {
                                                  dlClasses = "bg-amber-500 text-white border-amber-500 shadow-xs";
                                                  DlIcon = AlertTriangle;
                                                } else {
                                                  dlClasses = "bg-emerald-50 text-emerald-800 border-emerald-200";
                                                  DlIcon = CheckCircle2;
                                                }
                                                
                                                return (
                                                  <span className={`text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm border flex items-center gap-1 ${dlClasses}`}>
                                                    <DlIcon size={9} />
                                                    {dlStatus.toUpperCase()}
                                                  </span>
                                                );
                                              })()}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Description */}
                                        {task.description ? (
                                          <p className="text-[10px] text-slate-500 font-semibold leading-relaxed line-clamp-2">
                                            {task.description}
                                          </p>
                                        ) : (
                                          <p className="text-[10px] text-slate-350 italic font-semibold">
                                            S/ descrição definida
                                          </p>
                                        )}

                                        {/* Subtasks Progress */}
                                        {(() => {
                                          const subTasks = enhancedTasks.filter(t => t.parentId === task.id);
                                          if (subTasks.length === 0) return null;
                                          const concluded = subTasks.filter(t => normalizeStatus(t.status) === "Concluída").length;
                                          return (
                                            <div className="bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg text-[9px] font-bold text-slate-500 flex items-center justify-between">
                                              <span className="uppercase tracking-widest text-[8px]">Subtarefas</span>
                                              <span>{concluded}/{subTasks.length} concluídas</span>
                                            </div>
                                          );
                                        })()}

                                        {/* Progress Bar */}
                                        <div className="space-y-1">
                                          <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-400">
                                            <span>Progresso</span>
                                            <span className="text-slate-650 font-extrabold">{task.progress || 0}%</span>
                                          </div>
                                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                              className={cn(
                                                "h-full rounded-full transition-all duration-300",
                                                normalizeStatus(task.status) === "Concluída" ? "bg-emerald-500" : "bg-adasa-mid"
                                              )} 
                                              style={{ width: `${task.progress || 0}%` }}
                                            />
                                          </div>
                                        </div>

                                        {/* Dates */}
                                        {(task.startDate || task.endDate) && (
                                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                                            <CalendarRange size={12} className="text-slate-350 shrink-0" />
                                            <span className="truncate">
                                              {task.startDate ? new Date(task.startDate).toLocaleDateString("pt-BR") : "S/D"}
                                              {" - "}
                                              {task.endDate ? new Date(task.endDate).toLocaleDateString("pt-BR") : "S/D"}
                                            </span>
                                          </div>
                                        )}

                                        {/* Tags/Users/Categories and Quick Actions */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 mt-0.5">
                                          <div className="flex flex-wrap gap-1 max-w-[65%]">
                                            {task.categoryIds?.slice(0, 2).map(catId => {
                                              const cat = categories.find(c => c.id === catId);
                                              if (!cat) return null;
                                              return (
                                                <span key={catId} className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-[75px]" title={cat.name}>
                                                  {cat.name}
                                                </span>
                                              );
                                            })}
                                            {task.areaIds?.slice(0, 2).map(areaId => {
                                              const area = areas.find(a => a.id === areaId);
                                              if (!area) return null;
                                              return (
                                                <span key={areaId} className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-[75px]" title={area.name}>
                                                  {area.name}
                                                </span>
                                              );
                                            })}
                                          </div>

                                          <div className="flex items-center gap-1">
                                            {/* Move Left */}
                                            {isStatusGroup && normalizeStatus(task.status) !== "Não iniciada" && (
                                              <button
                                                onClick={() => {
                                                  const nextStatus = normalizeStatus(task.status) === "Concluída" ? "Em andamento" : "Não iniciada";
                                                  handleQuickStatusChange(task, nextStatus);
                                                }}
                                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                title="Mover para Esquerda"
                                              >
                                                <ChevronRight size={14} className="rotate-180" />
                                              </button>
                                            )}

                                            {/* Edit */}
                                            <button
                                              onClick={() => handleEditTask(task)}
                                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                              title="Editar"
                                            >
                                              <Edit3 size={12} />
                                            </button>

                                            {/* Delete */}
                                            <button
                                              onClick={() => handleDeleteTask(task.id)}
                                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                              title="Deletar"
                                            >
                                              <Trash2 size={12} />
                                            </button>

                                            {/* Move Right */}
                                            {isStatusGroup && normalizeStatus(task.status) !== "Concluída" && (
                                              <button
                                                onClick={() => {
                                                  const nextStatus = normalizeStatus(task.status) === "Não iniciada" ? "Em andamento" : "Concluída";
                                                  handleQuickStatusChange(task, nextStatus);
                                                }}
                                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                title="Mover para Direita"
                                              >
                                                <ChevronRight size={14} />
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {/* Parent Task Subtask Indicator */}
                                        {parentTask && (
                                          <div className="pt-2 mt-1 border-t border-slate-100 border-dashed">
                                            <span 
                                              className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block truncate"
                                              title={`Subtarefa de: ${parentTask.title}`}
                                            >
                                              Subtarefa de: {parentTask.title}
                                            </span>
                                          </div>
                                        )}
                                      </motion.div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
              })()}
              {viewMode === "responsible" && (() => {
                 const resps = [...responsibles, { id: -1, name: "Sem responsável definido", areaIds: [] }];
                 return (
                   <div className="space-y-4 mt-2">
                     {resps.map(resp => {
                       const groupRootTasks = rootTasks.filter(t => resp.id === -1 ? (!t.responsibleIds || t.responsibleIds.length === 0) : (t.responsibleIds && t.responsibleIds.includes(resp.id)));
                       if (groupRootTasks.length === 0) return null;
                       
                       return (
                         <div key={resp.id} className="overflow-hidden rounded-xl border border-slate-200/60 flex flex-col bg-white transition-all duration-200 shadow-sm">
                            <div 
                              onClick={() => toggleGroupContainer("responsible", resp.id)}
                              className="bg-slate-50 hover:bg-slate-100/70 border-b border-slate-200/60 px-4 py-3 flex items-center justify-between cursor-pointer select-none transition-colors"
                            >
                              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                 {expandedGroupContainers[`responsible-${resp.id}`] !== false ? <ChevronDown size={14} className="text-slate-400 stroke-[2.5]" /> : <ChevronRight size={14} className="text-slate-400 stroke-[2.5]" />}
                                 <Users size={14} className="text-slate-400" />
                                 {resp.name}
                              </h3>
                              <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{groupRootTasks.length} grupos estruturais</span>
                            </div>
                            {expandedGroupContainers[`responsible-${resp.id}`] !== false && (
                              <div>
                                {groupRootTasks.filter(t => childMatchesOrIsPath(t.id)).map(t => renderTaskNode(t, 0, false))}
                              </div>
                            )}
                         </div>
                       )
                     })}
                   </div>
                 );
              })()}
            </div>

            {/* Timeline Modal Overlay */}
            {timelineTaskId !== null && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex flex-col p-4 sm:p-8 md:p-12 items-center justify-center overflow-hidden">
                <div className="bg-white rounded-[2rem] w-full max-w-5xl h-full max-h-[90vh] shadow-2xl relative flex flex-col text-left">
                  <div className="flex z-20 justify-between items-center p-6 border-b border-slate-100 shrink-0">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Evolução do Item</h3>
                    <button onClick={() => setTimelineTaskId(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                      <X size={24} className="text-slate-500 hover:text-slate-800" />
                    </button>
                  </div>
                  <div className="p-6 sm:p-10 overflow-y-auto custom-scrollbar flex-1 relative text-left">
                    <div className="mb-8 border-b border-slate-100 pb-4">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={16} className="text-adasa-mid" /> 
                  Linha do Tempo: {getTaskDisplayName(taskById[timelineTaskId]) || ""}
                </h4>
                <p className="text-[11px] font-semibold text-slate-500 mt-1 mb-4">
                  Exibindo a hierarquia da tarefa (predecessores e subtarefas dependentes). As estatísticas referem-se à tarefa selecionada e suas filhas.
                </p>
                {(() => {
                  const targetIdx = timelineTasks.findIndex(t => t.isTarget);
                  const childrenTasks = timelineTasks.slice(targetIdx);
                  const total = childrenTasks.length;
                  if (total === 0) return null;
                  
                  const completed = childrenTasks.filter(t => normalizeStatus(t.task.status) === "Concluída").length;
                  const inProgress = childrenTasks.filter(t => normalizeStatus(t.task.status) === "Em andamento").length;
                  const pending = total - completed - inProgress;
                  
                  return (
                    <div className="flex flex-wrap items-center justify-center gap-4 py-2">
                      <div className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                        <span>TOTAIS <span className="border-l border-slate-300 ml-2 pl-2 text-sm font-extrabold">{total}</span></span>
                      </div>
                      <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                        <CheckCircle2 size={16} /> CONCLUÍDAS <span className="border-l border-emerald-200 ml-1 pl-2 text-sm font-extrabold">{completed}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                        <Activity size={16} /> EM ANDAMENTO <span className="border-l border-blue-200 ml-1 pl-2 text-sm font-extrabold">{inProgress}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                        <Clock size={16} /> NÃO INICIADAS <span className="border-l border-slate-200 ml-1 pl-2 text-sm font-extrabold">{pending}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="relative border-l-2 border-slate-200/80 ml-4 lg:ml-6 pl-6 lg:pl-10 space-y-12">
                {timelineTasks.map(({ task, depth, isTarget, isAncestor }, idx) => (
                  <div key={task.id} className="relative group z-10">
                    {depth > 0 && (
                      <div 
                        className="absolute top-4 border-t-2 border-slate-200/80 border-dashed -z-10"
                        style={{ left: '-20px', width: `calc(20px + ${Math.min(depth * 1.5, 6)}rem)` }}
                      />
                    )}
                    
                    <div className={`absolute -left-[37px] lg:-left-[55px] top-1.5 z-10 w-6 h-6 lg:w-7 lg:h-7 rounded-full border-[3px] border-white flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 ${normalizeStatus(task.status) === "Concluída" ? "bg-emerald-500" : normalizeStatus(task.status) === "Em andamento" ? "bg-blue-500" : "bg-slate-400"}`}>
                      {normalizeStatus(task.status) === "Concluída" ? <CheckCircle2 size={12} className="text-white" /> : normalizeStatus(task.status) === "Em andamento" ? <Activity size={12} className="text-white" /> : <Clock size={12} className="text-white" />}
                    </div>
                    
                    <div 
                      className={cn("border p-5 rounded-2xl hover:shadow-md transition-all cursor-pointer group-hover:-translate-y-0.5", isTarget ? "bg-indigo-50/50 border-indigo-300 shadow-md ring-2 ring-indigo-500/20" : isAncestor ? "bg-slate-50/50 border-slate-200 opacity-80 hover:opacity-100" : "bg-white border-slate-200/70 hover:border-adasa-mid/60")} 
                      onClick={() => handleEditTask(task)}
                      style={{ marginLeft: `${depth > 0 ? Math.min(depth * 1.5, 6) : 0}rem` }}
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {isTarget && <span className="text-[10px] font-black tracking-widest uppercase text-white bg-indigo-500 px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm"><Activity size={10} className="text-indigo-100" /> Selecionada</span>}
                            <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-md">ID: {task.id}</span>
                            <span className={`text-[9px] font-bold uppercase py-0.5 px-2 rounded-md border ${getPriorityBadgeClass(task.priority)}`}>{task.priority}</span>

                            {(() => {
                              const normStatus = normalizeStatus(task.status);
                              let statusClasses = "bg-slate-100 text-slate-600 border-slate-200";
                              if (normStatus === "Concluída") statusClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
                              else if (normStatus === "Em andamento") statusClasses = "bg-blue-50 text-blue-700 border-blue-200";

                              return (
                                <span className={`text-[9px] font-black uppercase py-0.5 px-2 rounded-md border ${statusClasses}`}>
                                  {normStatus}
                                </span>
                              );
                            })()}

                            {(() => {
                              if (normalizeStatus(task.status) === "Concluída") return null;
                              const dlStatus = getDeadlineStatus(task.endDate, task.status);
                              let dlClasses = "bg-slate-550 text-slate-500 border-slate-200";
                              if (dlStatus === "Atrasada") dlClasses = "bg-rose-500 text-white border-rose-500 font-extrabold shadow-xs";
                              else if (dlStatus === "Crítica") dlClasses = "bg-amber-500 text-white border-amber-500 font-extrabold shadow-xs";
                              else dlClasses = "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold";

                              return (
                                <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border ${dlClasses}`}>
                                  {dlStatus}
                                </span>
                              );
                            })()}
                            {task.parentId && (
                              <span className="text-[10px] font-black tracking-widest uppercase text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1"><GitCommit size={10} /> Subatividade</span>
                            )}
                            {task.categoryIds?.map(cid => {
                              const cat = categories.find(c => c.id === cid);
                              return cat ? (
                                <span key={cid} className="text-[9px] font-bold uppercase text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Tag size={10} /> {cat.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                          <h4 className="text-base font-black text-slate-800 leading-tight group-hover:text-adasa-mid transition-colors">{getTaskDisplayName(task)}</h4>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex-wrap justify-end">
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                              <CalendarRange size={12} className="text-adasa-mid" /> Início
                            </div>
                            <div className="text-sm font-black text-slate-800">{formatDate(task.startDate) || "Não definido"}</div>
                          </div>
                          <div className="w-px h-8 bg-slate-100"></div>
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                              <CalendarRange size={12} className="text-adasa-mid" /> Prazo final
                            </div>
                            <div className="text-sm font-black text-slate-800">{formatDate(task.endDate) || "Não definido"}</div>
                          </div>
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-xs font-semibold text-slate-600 mb-4 leading-relaxed line-clamp-2">{task.description}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200/70">
                        <div className="space-y-4">
  {task.responsibleIds && task.responsibleIds.length > 0 && (
    <div className="space-y-2">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Responsáveis</span>
      <div className="flex flex-wrap gap-1.5">
        {task.responsibleIds.map(rid => {
          const resp = responsibles.find(r => r.id === rid);
          if (!resp) return null;
          const initials = resp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          return (
            <div key={rid} className="flex items-center justify-center w-7 h-7 text-[10px] font-bold text-slate-700 bg-slate-100 rounded-full border border-slate-200 shadow-sm" title={resp.name}>
              {initials}
            </div>
          );
        })}
      </div>
    </div>
  )}
                          
                          {task.dependsOnTaskId && taskById[task.dependsOnTaskId] && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Depende de</span>
                              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm w-max" title={getTaskDisplayName(taskById[task.dependsOnTaskId])}>
                                <Link2 size={14} className="text-slate-400" />
                                <span className="max-w-[200px] truncate">{getTaskDisplayName(taskById[task.dependsOnTaskId])}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block flex justify-between">Progresso <span className="text-adasa-mid">{task.progress}%</span></span>
                           <div className="h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-200/50">
                             <div className={`h-full ${normalizeStatus(task.status) === "Concluída" ? "bg-emerald-500" : "bg-adasa-mid"} transition-all duration-500`} style={{ width: `${task.progress || 0}%` }} />
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {timelineTasks.length === 0 && (
                  <div className="text-center py-10 text-slate-400 font-semibold italic text-sm">
                    Nenhuma tarefa encontrada na linha do tempo.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* MODAL: Creative Task Dialog */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 leading-normal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-xl w-full border border-slate-200 text-left max-h-[85vh] overflow-y-auto custom-scrollbar space-y-4"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                  {formMode === "create" ? "Nova Atividade" : "Editar Atividade"}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Título da Tarefa/Etapa</label>
                  <input
                    type="text"
                    required
                    value={editingTask.title || ""}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Ampliação de Captação SAA Descoberto"
                    className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:border-adasa-mid outline-none transition-all placeholder:text-slate-400 bg-slate-50/10 focus:bg-white"
                  />
                </div>

                {/* Form Author */}
                <div className="space-y-1">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                     <User size={12} className="text-slate-400" /> Autor da Modificação
                   </label>
                   <input
                     type="text"
                     disabled
                     value={editingTask.updatedBy || currentUser?.name || "Administrador"}
                     className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-500 bg-slate-100 cursor-not-allowed outline-none"
                   />
                </div>

                {/* Tarefa Pai */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Layers size={12} className="text-slate-400" /> Tarefa Pai
                  </label>
                  <select
                    value={editingTask.parentId || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newParentId = val ? parseInt(val) : null;
                      setEditingTask(prev => {
                        const newState = { ...prev, parentId: newParentId };
                        if (newParentId) {
                          const pTask = taskById[newParentId];
                          if (pTask) {
                            if (pTask.areaIds && pTask.areaIds.length > 0) {
                              newState.areaIds = [...pTask.areaIds];
                            }
                            if (pTask.categoryIds && pTask.categoryIds.length > 0) {
                              newState.categoryIds = [...pTask.categoryIds];
                            }
                          }
                        }
                        return newState;
                      });
                    }}
                    className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 focus:border-adasa-mid outline-none bg-slate-50/10 focus:bg-white"
                  >
                    <option value="">Nenhuma (Tarefa Raiz)</option>
                    {tasks
                      .filter(t => {
                        if (!editingTask.id) return true;
                        if (t.id === editingTask.id) return false;
                        let curr = t.parentId;
                        while (curr) {
                          if (curr === editingTask.id) return false;
                          curr = tasks.find(x => x.id === curr)?.parentId || null;
                        }
                        return true;
                      })
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {getTaskDisplayName(t)}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Calendar Dates (Lock if rollup is enabled) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      Data de Início {editingTask.id && hasChildren(editingTask.id) && <Info size={11} className="text-dashed text-indigo-500" />}
                    </label>
                    <input
                      type="date"
                      value={editingTask.startDate || ""}
                      onChange={(e) => setEditingTask(prev => ({ ...prev, startDate: e.target.value }))}
                      disabled={editingTask.id !== undefined && hasChildren(editingTask.id)}
                      className={`w-full border-2 border-slate-200 text-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold focus:border-adasa-mid outline-none ${
                        editingTask.id !== undefined && hasChildren(editingTask.id) ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-80" : ""
                      }`}
                    />
                    {editingTask.id !== undefined && hasChildren(editingTask.id) && (
                      <span className="block text-[9px] font-bold text-indigo-500 tracking-tight leading-tight">Mínimo das subtarefas filhas</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      Data de Fim {editingTask.id && hasChildren(editingTask.id) && <Info size={11} className="text-indigo-500" />}
                    </label>
                    <input
                      type="date"
                      value={editingTask.endDate || ""}
                      onChange={(e) => setEditingTask(prev => ({ ...prev, endDate: e.target.value }))}
                      disabled={editingTask.id !== undefined && hasChildren(editingTask.id)}
                      className={`w-full border-2 border-slate-200 text-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold focus:border-adasa-mid outline-none ${
                        editingTask.id !== undefined && hasChildren(editingTask.id) ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-80" : ""
                      }`}
                    />
                    {editingTask.id !== undefined && hasChildren(editingTask.id) && (
                      <span className="block text-[9px] font-bold text-indigo-500 tracking-tight leading-tight">Máximo das subtarefas filhas</span>
                    )}
                  </div>
                </div>

                {/* Progress (Percentage) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Progresso (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editingTask.progress ?? 0}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        setEditingTask(prev => ({ ...prev, progress: val }));
                      }}
                      disabled={editingTask.id !== undefined && hasChildren(editingTask.id)}
                      className={`w-full border-2 border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 focus:border-adasa-mid outline-none ${
                        editingTask.id !== undefined && hasChildren(editingTask.id) ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-85" : ""
                      }`}
                    />
                    {editingTask.id !== undefined && hasChildren(editingTask.id) && (
                      <span className="block text-[9px] font-bold text-indigo-500 tracking-tight leading-tight">Média das subtarefas filhas</span>
                    )}
                  </div>

                  <div className="space-y-1 font-semibold leading-normal">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</label>
                    <select
                      value={getStatusFromProgress(editingTask.progress ?? 0)}
                      onChange={(e) => setEditingTask(prev => ({ ...prev, status: e.target.value }))}
                      disabled={true}
                      className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-600 focus:border-adasa-mid outline-none cursor-not-allowed opacity-85"
                    >
                      <option value="Não iniciada">Não iniciada</option>
                      <option value="Em andamento">Em andamento</option>
                      <option value="Concluída">Concluída</option>
                    </select>
                  </div>
                </div>

                {/* Technical Meta Filters */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Prioridade</label>
                  <select
                    value={editingTask.priority || "Média"}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-600 focus:border-adasa-mid outline-none"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>

                {/* Dependency (Depends On) */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Depende de (Pré-requisito)</label>
                  <select
                    value={editingTask.dependsOnTaskId || ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      
                      setEditingTask(prev => {
                        const next = { ...prev, dependsOnTaskId: val };
                        if (val && taskById[val]) {
                          const parentTask = taskById[val];
                          if (parentTask.endDate) {
                            // Parse as UTC to avoid local timezone shifts
                            const [yyyy, mm, dd] = parentTask.endDate.split("T")[0].split("-").map(Number);
                            const newStart = new Date(Date.UTC(yyyy, mm - 1, dd));
                            
                            // Push the start date to the day AFTER the parent's end date
                            newStart.setUTCDate(newStart.getUTCDate() + 1);
                            
                            const startStr = newStart.toISOString().split("T")[0];
                            
                            // Check if we need to push the end date
                            if (prev.startDate && prev.endDate) {
                              const s = new Date(prev.startDate);
                              const eD = new Date(prev.endDate);
                              const diffTime = Math.abs(eD.getTime() - s.getTime());
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              
                              const newEnd = new Date(newStart);
                              newEnd.setUTCDate(newEnd.getUTCDate() + Math.max(0, diffDays));
                              next.endDate = newEnd.toISOString().split("T")[0];
                            } else if (!prev.endDate) {
                              // If no end date, just set it identically
                              next.endDate = startStr;
                            }
                            
                            next.startDate = startStr;
                          }
                        }
                        return next;
                      });
                    }}
                    className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-600 focus:border-adasa-mid outline-none"
                  >
                    <option value="">Nenhuma (Início Imediato)</option>
                    {tasks.filter(t => t.parentId === editingTask.parentId && t.id !== editingTask.id && (editingTask.planId ? t.planId === editingTask.planId : true)).map(t => (
                      <option key={t.id} value={t.id}>{getTaskDisplayName(t)}</option>
                    ))}
                  </select>
                </div>

                {/* Plan of Activities (Exactly One) */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Plano de Atividades (Vincular a um)</label>
                  <select
                    required
                    value={editingTask.planId || ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : "";
                      setEditingTask(prev => ({ 
                        ...prev, 
                        planId: val || null
                      }));
                    }}
                    className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white focus:border-adasa-mid outline-none"
                  >
                    <option value="">Selecione um Plano...</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Areas of Activities (One or More) */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Áreas de Vinculação
                    {editingTask.parentId && taskById[editingTask.parentId]?.areaIds?.length ? " (Herdado e bloqueado pela Tarefa Pai)" : ""}
                  </label>
                  <div className={`bg-slate-50 border-2 border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5 ${editingTask.parentId && taskById[editingTask.parentId]?.areaIds?.length ? "opacity-60 pointer-events-none" : ""}`}>
                    {[...areas].sort((a,b) => a.name.localeCompare(b.name)).map(a => {
                      const isChecked = editingTask.areaIds?.includes(a.id);
                      return (
                        <label key={a.id} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 hover:text-slate-800">
                          <input
                            type="checkbox"
                            checked={!!isChecked}
                            readOnly={!!(editingTask.parentId && taskById[editingTask.parentId]?.areaIds?.length)}
                            onChange={(e) => {
                              if (editingTask.parentId && taskById[editingTask.parentId]?.areaIds?.length) return;
                              const checked = e.target.checked;
                              setEditingTask(prev => {
                                const current = prev.areaIds || [];
                                const next = checked 
                                  ? [...current, a.id] 
                                  : current.filter(id => id !== a.id);
                                return { ...prev, areaIds: next };
                              });
                            }}
                            className="rounded border-slate-300 text-adasa-mid focus:ring-adasa-mid h-4 w-4 shrink-0"
                          />
                          <span>{a.name}</span>
                        </label>
                      );
                    })}
                    {areas.length === 0 && (
                      <span className="block text-xs text-slate-400 italic">Nenhuma Área cadastrada sob o cadastro auxiliar.</span>
                    )}
                  </div>
                </div>

                {/* Categories of Activities (One or More) */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Categorias (Filtradas pelas Áreas selecionadas)
                    {editingTask.parentId && taskById[editingTask.parentId]?.categoryIds?.length ? " (Herdado e bloqueado pela Tarefa Pai)" : ""}
                  </label>
                  <div className={`bg-slate-50 border-2 border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5 ${editingTask.parentId && taskById[editingTask.parentId]?.categoryIds?.length ? "opacity-60 pointer-events-none" : ""}`}>
                    {categories.filter(c => c.areaIds?.some(aid => editingTask.areaIds?.includes(aid))).length === 0 ? (
                      <span className="block text-xs text-slate-400 italic">Nenhuma categoria encontrada para as áreas selecionadas.</span>
                    ) : (
                      categories.filter(c => c.areaIds?.some(aid => editingTask.areaIds?.includes(aid))).sort((a,b) => a.name.localeCompare(b.name)).map(c => {
                        const isChecked = editingTask.categoryIds?.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 hover:text-slate-800">
                            <input
                              type="checkbox"
                              checked={!!isChecked}
                              readOnly={!!(editingTask.parentId && taskById[editingTask.parentId]?.categoryIds?.length)}
                              onChange={(e) => {
                                if (editingTask.parentId && taskById[editingTask.parentId]?.categoryIds?.length) return;
                                const checked = e.target.checked;
                                setEditingTask(prev => {
                                  const current = prev.categoryIds || [];
                                  const next = checked 
                                    ? [...current, c.id] 
                                    : current.filter(id => id !== c.id);
                                  return { ...prev, categoryIds: next };
                                });
                              }}
                              className="rounded border-slate-300 text-adasa-mid focus:ring-adasa-mid h-4 w-4 shrink-0"
                            />
                            <span>{c.name} <span className="opacity-50 font-normal">({c.areaIds?.map(aid => areas.find(a => a.id === aid)?.name).filter(Boolean).join(", ")})</span></span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Designated Responsibles (One or More) */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Responsáveis Designados (Filtrados por Área)</label>
                  <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5 animate-none">
                    {responsibles.filter(r => !editingTask.areaIds || editingTask.areaIds.length === 0 || r.areaIds?.some(aid => editingTask.areaIds?.includes(aid))).length === 0 ? (
                      <span className="block text-xs text-slate-400 italic font-medium">Nenhum responsável encontrado para as áreas selecionadas.</span>
                    ) : (
                      responsibles.filter(r => !editingTask.areaIds || editingTask.areaIds.length === 0 || r.areaIds?.some(aid => editingTask.areaIds?.includes(aid))).sort((a,b) => a.name.localeCompare(b.name)).map(r => {
                      const isChecked = editingTask.responsibleIds?.includes(r.id);
                      return (
                        <label key={r.id} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 hover:text-slate-800">
                          <input
                            type="checkbox"
                            checked={!!isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setEditingTask(prev => {
                                const current = prev.responsibleIds || [];
                                const next = checked 
                                  ? [...current, r.id] 
                                  : current.filter(id => id !== r.id);
                                return { ...prev, responsibleIds: next };
                              });
                            }}
                            className="rounded border-slate-300 text-adasa-mid focus:ring-adasa-mid h-4 w-4 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-slate-700">{r.name}</span>
                            {r.role && <span className="text-[9px] text-slate-500 font-black ml-1.5 uppercase bg-slate-200 px-1.5 py-0.5 rounded">{r.role}</span>}
                          </div>
                        </label>
                      );
                    }))}
                    {responsibles.length === 0 && (
                      <span className="block text-xs text-slate-400 italic font-medium">Nenhum responsável cadastrado sob o cadastro auxiliar.</span>
                    )}
                  </div>
                </div>

                {/* Description and notes */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider font-semibold">Notas técnicas / Justificativas</label>
                  <textarea
                    rows={3}
                    value={editingTask.notes || ""}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, notes: e.target.value, description: e.target.value }))}
                    placeholder="Justificativa técnica, observações sobre o andamento e fontes dos dados..."
                    className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-700 focus:border-adasa-mid outline-none transition-all placeholder:text-slate-400"
                  ></textarea>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-5 py-2 font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Retroceder
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold text-xs text-white bg-adasa-mid hover:bg-adasa-dark rounded-xl transition-colors shadow-sm"
                  >
                    {formMode === "create" ? "Inserir Atividade" : "Gravar Alterações"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </div>
  );

  // Recursive Tree Node Renderer
  function renderTaskNode(task: Task, depth: number, forceFlat: boolean = false) {
    const isExpanded = isAnyFilterActive ? (expandedTasks[task.id] !== false) : !!expandedTasks[task.id];
    const taskChildren = forceFlat ? [] : (childrenMap[task.id] || []);
    const hasSubs = taskChildren.length > 0;
    const visibleChildren = taskChildren.filter(c => childMatchesOrIsPath(c.id));

    // To respect the rule: Lucide React icons to differentiate root task from subtask
    const TaskIcon = depth === 0 ? FolderKanban : ListTodo;

    return (
      <div 
        key={task.id} 
        id={`task-node-${task.id}`}
        className="w-full border-b border-indigo-100 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)_inset] last:border-none last:shadow-none"
      >
        {/* Node Layout block */}
        <div 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 transition-all gap-3 hover:bg-slate-50/50"
          style={{ paddingLeft: `${forceFlat ? 16 : 16 + depth * 48}px` }}
        >
          {/* Column Left: Collapse Indicator + Icon + Title */}
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            {hasSubs ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(task.id);
                }}
                className="p-1 mt-0.5 hover:bg-slate-200/50 rounded-md text-slate-400 hover:text-slate-700 transition"
                title={isExpanded ? "Recolher subtarefas" : "Expandir subtarefas"}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <div className="w-6 shrink-0" />
            )}

            <div className="flex gap-2 flex-1 min-w-0">
              <div 
                onClick={() => handleEditTask(task)}
                className="p-2 rounded-xl mt-0.5 cursor-pointer flex-shrink-0 bg-slate-100 text-slate-500 hover:bg-white hover:border hover:border-slate-200 hover:text-adasa-mid transition-all shadow-sm"
              >
                <TaskIcon size={14} />
              </div>

              <div className="min-w-0 flex-1">
                {/* Title & Tag */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span 
                    onClick={() => handleEditTask(task)}
                    className="text-xs font-bold uppercase tracking-tight cursor-pointer hover:text-adasa-mid transition-colors text-slate-700"
                  >
                    {getTaskDisplayName(task)}
                  </span>

                  {hasSubs && (
                    <span 
                      className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded flex items-center gap-1 hover:bg-indigo-100 transition-colors cursor-pointer"
                      title="Totais de Subtarefas"
                      onClick={(e) => {
                         e.stopPropagation();
                         toggleExpand(task.id);
                      }}
                    >
                      Subtarefas ({taskChildren.length})
                    </span>
                  )}

                  {task.priority && (
                    <span className={`text-[9px] font-bold uppercase py-0.5 px-2 rounded-md border flex items-center gap-1 ${getPriorityBadgeClass(task.priority)}`}>
                      <Flag size={10} className={task.priority === "Alta" ? "fill-rose-100" : task.priority === "Média" ? "fill-amber-100" : ""} />
                      {task.priority}
                    </span>
                  )}

                  {(() => {
                    const normStatus = normalizeStatus(task.status);
                    let statusClasses = "bg-slate-100 text-slate-600 border-slate-200";
                    let StatusIcon = Circle;
                    if (normStatus === "Concluída") {
                      statusClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      StatusIcon = CheckCircle2;
                    } else if (normStatus === "Em andamento") {
                      statusClasses = "bg-blue-50 text-blue-700 border-blue-200";
                      StatusIcon = Clock;
                    }

                    return (
                      <span className={`text-[9px] font-black uppercase py-0.5 px-2 rounded-md border flex items-center gap-1 ${statusClasses}`}>
                        <StatusIcon size={10} />
                        {normStatus}
                      </span>
                    );
                  })()}

                  {(() => {
                    if (normalizeStatus(task.status) === "Concluída") return null;
                    const dlStatus = getDeadlineStatus(task.endDate, task.status);
                    let dlClasses = "bg-slate-550 text-slate-500 border-slate-200";
                    let DlIcon = CheckCircle2;
                    if (dlStatus === "Atrasada") {
                      dlClasses = "bg-rose-500 text-white border-rose-500 font-extrabold shadow-xs";
                      DlIcon = AlertCircle;
                    } else if (dlStatus === "Crítica") {
                      dlClasses = "bg-amber-500 text-white border-amber-500 font-extrabold shadow-xs";
                      DlIcon = AlertTriangle;
                    } else {
                      dlClasses = "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold";
                      DlIcon = CheckCircle2;
                    }

                    return (
                      <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${dlClasses}`}>
                        <DlIcon size={10} />
                        {dlStatus}
                      </span>
                    );
                  })()}
                </div>

                {/* Subtitle / Notes */}
                {task.description && (
                  <p className="text-[10px] font-semibold text-slate-400 truncate max-w-md sm:max-w-xl leading-normal mt-0.5">
                    {task.description}
                  </p>
                )}

                {/* Dates & Owner */}
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-600 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <Calendar size={14} className="text-slate-400" />
                    <span><span className="text-slate-400 font-medium">Início:</span> {formatDate(task.startDate)}</span>
                    <span className="text-slate-300 mx-1">|</span>
                    <span><span className="text-slate-400 font-medium">Prazo:</span> {formatDate(task.endDate)}</span>
                  </span>
                  {task.responsibleIds && task.responsibleIds.length > 0 && (
                    <div className="flex items-center gap-1">
                      {task.responsibleIds.map(rid => {
                        const resp = responsibles.find(r => r.id === rid);
                        if (!resp) return null;
                        const initials = resp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                        return (
                          <div key={rid} className="flex items-center justify-center w-6 h-6 text-[9px] font-bold text-slate-700 bg-slate-100 rounded-full border border-slate-200 shadow-sm" title={resp.name}>
                            {initials}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {task.dependsOnTaskId && taskById[task.dependsOnTaskId] && (
                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md" title={`Depende de: ${getTaskDisplayName(taskById[task.dependsOnTaskId])}`}>
                      <Link2 size={10} />
                      <span className="truncate max-w-[150px]">Depende de: {getTaskDisplayName(taskById[task.dependsOnTaskId])}</span>
                    </span>
                  )}
                  {task.updatedAt && (
                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md" title={`Última atualização: ${formatDateTime(task.updatedAt)} por ${task.updatedBy || 'Sistema'}`}>
                      <Clock size={10} className="text-slate-400" />
                      <span className="truncate max-w-[150px]">{formatDateTime(task.updatedAt)} • {task.updatedBy || 'Sistema'}</span>
                    </span>
                  )}
                </div>

                {/* Area & Category dynamic tags */}
                {((task.areaIds && task.areaIds.length > 0) || (task.categoryIds && task.categoryIds.length > 0)) && (
                  <div className="flex items-center gap-1.5 text-[9px] font-black flex-wrap mt-1">
                    {task.areaIds && task.areaIds.map(aid => {
                      const area = areas.find(a => a.id === aid);
                      return (
                        <span key={aid} className="text-[9px] font-bold uppercase text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          {area?.name || `Área: ${aid}`}
                        </span>
                      );
                    })}
                    {task.categoryIds && task.categoryIds.map(cid => {
                      const cat = categories.find(c => c.id === cid);
                      return cat ? (
                        <span key={cid} className="text-[9px] font-bold uppercase text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Tag size={10} /> {cat.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column Right: Progress Bar & Actions */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            {/* Progress visually */}
            <div className="flex items-center gap-2.5 min-w-[130px] sm:min-w-[150px]">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-100">
                <div 
                  className={`h-full rounded-full transition-all duration-550 ${
                    normalizeStatus(task.status) === "Concluída" 
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500" 
                      : "bg-gradient-to-r from-adasa-mid to-blue-500"
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="text-[10px] font-black text-slate-600 w-8 text-right">{task.progress}%</span>
            </div>

            {/* Quick Actions overlay */}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddNewTask(task.id);
                }}
                className="p-1.5 px-2.5 bg-white border border-slate-200 text-slate-600 hover:text-adasa-mid hover:border-adasa-200 rounded-lg transition shadow-sm text-xs font-bold flex items-center gap-1.5"
                title="Adicionar subatividade"
              >
                <Plus size={13} /> Subtarefas
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTimelineTaskId(task.id);
                }}
                className="p-1.5 px-2.5 bg-white border border-slate-200 text-slate-600 hover:text-adasa-mid hover:border-adasa-200 rounded-lg transition shadow-sm text-xs font-bold flex items-center gap-1.5"
                title="Ver Linha do Tempo"
              >
                <Activity size={13} /> Timeline
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditTask(task);
                }}
                className="p-2 text-sky-500 bg-sky-50 rounded-xl hover:bg-sky-100 transition-all border border-sky-100"
                title="Editar"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTask(task.id);
                }}
                className="p-2 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all border border-rose-100"
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Children Nested Elements */}
        {hasSubs && isExpanded && (
          <div className="bg-slate-50/30">
            <AnimatePresence initial={false}>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="overflow-hidden border-b border-indigo-100 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)_inset]"
              >
                {visibleChildren.map(child => renderTaskNode(child, depth + 1))}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }
}
