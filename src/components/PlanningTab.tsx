/**
 * @license
 * Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FolderKanban,
  ListTodo,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Clock,
  User,
  Tag,
  AlertCircle,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Info,
  X,
  FileText,
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
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid, LabelList } from "recharts";
 
interface PlanningTabProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  showToast: (title: string, message: string, type: "success" | "error" | "info") => void;
  activeSubTab?: "tasks" | "dashboard" | "plans" | "areas" | "categories" | "responsibles";
}
 
const normalizeStatus = (status: string | undefined): "Não iniciada" | "Em andamento" | "Concluída" => {
  if (!status) return "Não iniciada";
  const s = status.toLowerCase().trim();
  if (s === "concluída" || s === "concluído" || s === "completed") return "Concluída";
  if (s === "em andamento" || s === "in_progress" || s === "in progress") return "Em andamento";
  return "Não iniciada";
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
              data["Progresso Médio (%)"] === 100 ? "bg-emerald-500" : data["Progresso Médio (%)"] >= 50 ? "bg-blue-500" : "bg-amber-500"
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

export function PlanningTab({ tasks, setTasks, showToast, activeSubTab = "tasks" }: PlanningTabProps) {
  // Navigation, search & filter state
  const [isDashboardFiltersExpanded, setIsDashboardFiltersExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // New plan and area filters
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [selectedAreaIds, setSelectedAreaIds] = useState<number[]>([]);
  const [selectedResponsibleIds, setSelectedResponsibleIds] = useState<number[]>([]);

  // Period / cronograma filters for dashboard
  const [periodTypeFilter, setPeriodTypeFilter] = useState<"all" | "month" | "quarter" | "semester">("all");
  const [periodValueFilter, setPeriodValueFilter] = useState<string>("all");

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
  const [regPlanId, setRegPlanId] = useState<string>("");
  const [regAreaIds, setRegAreaIds] = useState<number[]>([]);
  const [editingRegId, setEditingRegId] = useState<number | null>(null);

  // UI tree expand/collapse state (keyed by task.id)
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});

  // Expanded state for grouped dashboard table
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedQuarterGroups, setExpandedQuarterGroups] = useState<Record<string, boolean>>({});
  const [expandedPlanQuarterAreaGroups, setExpandedPlanQuarterAreaGroups] = useState<Record<string, boolean>>({});
  
  // Modal/Form State for adding/editing tasks
  const [timelineTaskId, setTimelineTaskId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"tree" | "status" | "category" | "area" | "responsible">("category");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<Partial<Task>>({});
  
  // Quick status sync loader
  const [isSyncing, setIsSyncing] = useState(false);

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
        body: JSON.stringify({ name: regName, description: regDesc })
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
    if (!window.confirm("Aviso: Excluir um plano pode deixar tarefas órfãs ou remover as áreas vinculadas a ele. Deseja continuar?")) return;
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
  };

  // Handle area submit
  const handleAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      showToast("Validação", "Preencha o nome da área.", "error");
      return;
    }
    try {
      const isEdit = editingRegId !== null;
      const url = isEdit ? `/api/areas/${editingRegId}` : "/api/areas";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, abbreviation: regAbbreviation.substring(0, 2).toUpperCase() })
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
    if (!window.confirm("Certeza que deseja excluir esta área?")) return;
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
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || regAreaIds.length === 0) {
      showToast("Aviso", "Nome da categoria e pelo menos uma Área são obrigatórios.", "info");
      return;
    }
    const isEdit = editingRegId !== null;
    const url = isEdit ? `/api/categories/${editingRegId}` : "/api/categories";
    const method = isEdit ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, areaIds: regAreaIds })
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
    if (!window.confirm("Certeza que deseja excluir esta categoria?")) return;
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
  };

  // Handle responsible submit
  const handleResponsibleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      showToast("Validação", "Nome do responsável é obrigatório.", "error");
      return;
    }
    try {
      const isEdit = editingRegId !== null;
      const url = isEdit ? `/api/responsibles/${editingRegId}` : "/api/responsibles";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, email: regEmail, role: regRole, areaIds: regAreaIds })
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
    if (!window.confirm("Certeza que deseja desvincular e excluir este responsável?")) return;
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

    return true;
  };

  // Build recursive mapping from plain arrays
  const taskById = useMemo(() => {
    const map: Record<number, Task> = {};
    tasks.forEach(t => {
      map[t.id] = t;
    });
    return map;
  }, [tasks]);

  // Get children mapping
  const childrenMap = useMemo(() => {
    const map: Record<number, Task[]> = {};
    tasks.forEach(t => {
      if (t.parentId) {
        if (!map[t.parentId]) map[t.parentId] = [];
        map[t.parentId].push(t);
      }
    });
    
    // Sort children by ID
    Object.keys(map).forEach(key => {
      map[Number(key)].sort((a,b) => a.id - b.id);
    });
    return map;
  }, [tasks]);

  // Root level tasks
  const rootTasks = useMemo(() => {
    return tasks.filter(t => !t.parentId).sort((a, b) => a.id - b.id);
  }, [tasks]);

  // Handle expand / collapse toggles
  const toggleExpand = (id: number) => {
    setExpandedTasks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to check if a task has children
  const hasChildren = (id: number): boolean => {
    return !!childrenMap[id] && childrenMap[id].length > 0;
  };

  // Calculate stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => normalizeStatus(t.status) === "Concluída").length;
    const inProgress = tasks.filter(t => normalizeStatus(t.status) === "Em andamento").length;
    const pending = tasks.filter(t => normalizeStatus(t.status) === "Não iniciada").length;
    
    // Progress is weighted average of root tasks
    let progressSum = 0;
    const rootCount = rootTasks.length;
    if (rootCount > 0) {
      rootTasks.forEach(r => {
        progressSum += r.progress;
      });
    }
    const avgRootProgress = rootCount > 0 ? Math.round(progressSum / rootCount) : 0;

    return { total, completed, inProgress, pending, avgRootProgress };
  }, [tasks, rootTasks]);

  // Filtered tasks and chart definitions for Dashboard
  const matchesFiltersDashboard = (t: Task): boolean => {
    // Check status
    if (statusFilter !== "all") {
      if (normalizeStatus(t.status) !== statusFilter) return false;
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
    return tasks.filter(t => matchesFiltersDashboard(t));
  }, [tasks, statusFilter, priorityFilter, categoryFilter, planFilter, selectedAreaIds, selectedResponsibleIds, periodTypeFilter, periodValueFilter]);

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
    return areas.map(area => {
      const areaTasks = filteredTasks.filter(t => t.areaIds?.includes(area.id));
      const total = areaTasks.length;
      const completed = areaTasks.filter(t => normalizeStatus(t.status) === "Concluída").length;
      const avgProg = total > 0 ? Math.round(areaTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / total) : 0;
      return {
        name: area.name,
        fullName: area.name,
        "Progresso Médio (%)": avgProg,
        "Total de Tarefas": total,
        "Concluídas": completed
      };
    }).filter(d => d["Total de Tarefas"] > 0);
  }, [filteredTasks, areas]);

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
      const isExpanded = expandedGroups[node.id] !== undefined ? expandedGroups[node.id] : depth < 1; // defaults to true for first group
      if (isExpanded && node.children && node.children.length > 0) {
        node.children.forEach((child: any) => traverse(child, depth + 1));
      }
    };
    groupedDashboardData.forEach(node => traverse(node, 0));
    return list;
  }, [groupedDashboardData, expandedGroups]);

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
      const isExpanded = expandedQuarterGroups[node.id] !== undefined ? expandedQuarterGroups[node.id] : depth < 1;
      if (isExpanded && node.children && node.children.length > 0) {
        node.children.forEach((child: any) => traverse(child, depth + 1));
      }
    };
    groupedQuarterDashboardData.forEach(node => traverse(node, 0));
    return list;
  }, [groupedQuarterDashboardData, expandedQuarterGroups]);

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
      const isExpanded = expandedPlanQuarterAreaGroups[node.id] !== undefined ? expandedPlanQuarterAreaGroups[node.id] : depth < 1;
      if (isExpanded && node.children && node.children.length > 0) {
        node.children.forEach((child: any) => traverse(child, depth + 1));
      }
    };
    groupedPlanQuarterAreaData.forEach(node => traverse(node, 0));
    return list;
  }, [groupedPlanQuarterAreaData, expandedPlanQuarterAreaGroups]);

  const areaTimelineData = useMemo(() => {
    const areaMap: Record<number, any> = {};
    
    areas.forEach(a => {
      areaMap[a.id] = {
        id: a.id,
        name: a.name,
        quarters: {
          1: { total: 0, pending: 0, inProgress: 0, completed: 0, sumProgress: 0, progress: 0 },
          2: { total: 0, pending: 0, inProgress: 0, completed: 0, sumProgress: 0, progress: 0 },
          3: { total: 0, pending: 0, inProgress: 0, completed: 0, sumProgress: 0, progress: 0 },
          4: { total: 0, pending: 0, inProgress: 0, completed: 0, sumProgress: 0, progress: 0 }
        }
      };
    });
    areaMap[0] = {
      id: 0,
      name: "Outras Áreas / Sem Área",
      quarters: {
        1: { total: 0, pending: 0, inProgress: 0, completed: 0, sumProgress: 0, progress: 0 },
        2: { total: 0, pending: 0, inProgress: 0, completed: 0, sumProgress: 0, progress: 0 },
        3: { total: 0, pending: 0, inProgress: 0, completed: 0, sumProgress: 0, progress: 0 },
        4: { total: 0, pending: 0, inProgress: 0, completed: 0, sumProgress: 0, progress: 0 }
      }
    };

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

    filteredTasks.forEach(t => {
      const aId = t.areaId && areaMap[t.areaId] ? t.areaId : 0;
      for (let q = 1; q <= 4; q++) {
        if (taskInQuarter(t, q)) {
          const stats = areaMap[aId].quarters[q];
          stats.total++;
          const status = normalizeStatus(t.status);
          if (status === "Concluída") stats.completed++;
          else if (status === "Em andamento") stats.inProgress++;
          else stats.pending++;
          
          stats.sumProgress += (t.progress || 0);
          break;
        }
      }
    });

    const result = Object.values(areaMap).filter(a => {
      return a.quarters[1].total > 0 || a.quarters[2].total > 0 || a.quarters[3].total > 0 || a.quarters[4].total > 0;
    });

    result.forEach(a => {
      [1, 2, 3, 4].forEach(q => {
        const stats = a.quarters[q];
        stats.progress = stats.total > 0 ? Math.round(stats.sumProgress / stats.total) : 0;
      });
    });

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredTasks, areas]);

  // Format dates elegantly for Portuguese/Brazilian locale or ISO
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/D";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "N/D";
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
    } catch {
      return "N/D";
    }
  };

  // Submit task create or edit form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask.title?.trim()) {
      showToast("Validação", "O título da tarefa é obrigatório.", "error");
      return;
    }

    try {
      const isEdit = formMode === "edit";
      const url = isEdit ? `/api/tasks/${editingTask.id}` : "/api/tasks";
      const method = isEdit ? "PUT" : "POST";

      const finalProgress = editingTask.progress ?? 0;
      const finalStatus = finalProgress === 100 ? "Concluída" : finalProgress > 0 ? "Em andamento" : "Não iniciada";

      const payload = {
        ...editingTask,
        progress: finalProgress,
        status: finalStatus
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
    if (!window.confirm("Certeza que deseja excluir permanentemente esta tarefa e todas as suas subtarefas (se houver)?")) {
      return;
    }

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
    const result: { task: Task; depth: number }[] = [];
    const collect = (id: number, currentDepth: number) => {
      const t = taskById[id];
      if (t) result.push({ task: t, depth: currentDepth });
      const children = childrenMap[id] || [];
      const sortedChildren = [...children].sort((a, b) => new Date(a.endDate || "2099-01-01").getTime() - new Date(b.endDate || "2099-01-01").getTime());
      sortedChildren.forEach(c => collect(c.id, currentDepth + 1));
    };
    collect(timelineTaskId, 0);
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

            {/* Row 3: Status, Priority and Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            {(planFilter !== "all" || selectedAreaIds.length > 0 || selectedResponsibleIds.length > 0 || statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all" || periodTypeFilter !== "all") && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    setPlanFilter("all");
                    setSelectedAreaIds([]);
                    setSelectedResponsibleIds([]);
                    setStatusFilter("all");
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
                          <Cell key={`cell-${index}`} fill={entry["Progresso Médio (%)"] === 100 ? "#10b981" : (index % 2 === 0 ? "#4f46e5" : "#0ea5e9")} />
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
                        <th className="px-3.5 py-2 font-black uppercase text-[9px] tracking-wider">Qtde Concluídas</th>
                        <th className="px-3.5 py-2 font-black uppercase text-[9px] tracking-wider">Progresso Médio</th>
                        <th className="px-3.5 py-2 font-black uppercase text-[9px] tracking-wider">Status Indicativo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {areaChartData.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-3.5 py-2 font-black text-slate-800 uppercase" title={row.fullName}>{row.name}</td>
                          <td className="px-3.5 py-2 font-bold">{row["Total de Tarefas"]}</td>
                          <td className="px-3.5 py-2 font-bold text-emerald-600">{row["Concluídas"]}</td>
                          <td className="px-3.5 py-2 font-black text-indigo-600">{row["Progresso Médio (%)"]}%</td>
                          <td className="px-3.5 py-2">
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50 flex items-center">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  row["Progresso Médio (%)"] === 100 
                                    ? "bg-emerald-500" 
                                    : row["Progresso Médio (%)"] >= 50 
                                      ? "bg-blue-500"
                                      : "bg-amber-500"
                                )}
                                style={{ width: `${row["Progresso Médio (%)"]}%` }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {areaChartData.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 italic">Nenhum dado por área.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Timeline by Area & Quarter */}
            <div className="lg:col-span-12 bg-white border border-slate-200/90 rounded-[2rem] p-6 shadow-sm text-left mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <dt className="text-xs font-black tracking-widest text-slate-400 uppercase">Acompanhamento Temporal</dt>
                  <h4 className="text-lg font-black text-slate-800 mt-1 font-sans">Evolução por Área e Trimestre</h4>
                  <p className="text-xs font-medium text-slate-500 mt-0.5 leading-snug">
                    Gráfico estilo linha do tempo com percentual de conclusão das tarefas de cada área por trimestre.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[800px] py-2">
                  <div className="grid grid-cols-[220px_1fr_1fr_1fr_1fr] gap-4 mb-3 border-b border-slate-100 pb-3">
                    <div className="font-black text-[10px] uppercase text-slate-400 tracking-widest self-end pb-1 pl-2">Área / Categoria</div>
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

                  <div className="space-y-4">
                    {areaTimelineData.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-sm font-medium italic border border-slate-100 border-dashed rounded-xl">Nenhuma tarefa atribuída aos trimestres.</div>
                    ) : (
                      areaTimelineData.map((area, idx) => (
                        <div key={idx} className="grid grid-cols-[220px_1fr_1fr_1fr_1fr] gap-4 items-center bg-white p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-slate-100 shadow-sm relative">
                          {/* Timeline connector visual line behind blocks */}
                          <div className="absolute top-1/2 left-[250px] right-8 h-0.5 bg-slate-100 -translate-y-1/2 z-0 hidden sm:block pointer-events-none" />
                          
                          <div className="font-bold text-[13px] text-slate-700 truncate pr-4 pl-2 z-10" title={area.name}>
                            {area.name}
                          </div>
                          
                          {[1, 2, 3, 4].map((q: number) => {
                            const stats = area.quarters[q as 1|2|3|4];
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
                                      stats.progress === 100 ? "bg-emerald-500" : stats.progress > 0 ? "bg-indigo-500" : "bg-slate-300"
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
                                <div className="hidden group-hover:flex absolute bottom-[120%] mb-1 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded-xl p-3.5 shadow-2xl z-[60] flex-col gap-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-150">
                                  <p className="text-white text-xs font-black border-b border-slate-700/60 pb-2 mb-1 uppercase text-center tracking-wider flex items-center justify-center gap-2">
                                    Trimestre {q}
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
                      ))
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
                      groupedPlanQuarterAreaDashboardData.forEach(traverse);
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
                      const isExpanded = expandedPlanQuarterAreaGroups[row.id] !== undefined ? expandedPlanQuarterAreaGroups[row.id] : row.depth < 1; // defaults to true for depth < 1
                      
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
                                        : "bg-amber-500"
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
                                    : "text-amber-700"
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
                      const isExpanded = expandedQuarterGroups[row.id] !== undefined ? expandedQuarterGroups[row.id] : row.depth < 1; // defaults to true for depth < 1
                      
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
                                        : "bg-amber-500"
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
                                    : "text-amber-700"
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
                      const isExpanded = expandedGroups[row.id] !== undefined ? expandedGroups[row.id] : row.depth < 1; // defaults to true for depth < 1
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
                                        : "bg-amber-500"
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
                                    : "text-amber-700"
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
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <ListTodo size={18} className="text-adasa-mid" /> Filtro de Atividades
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                Navegação multinível, subtarefas e consolidação automática temporo-produtiva.
              </p>
            </div>

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
          <div className="bg-slate-50/60 rounded-3xl border border-slate-200/60 p-5 space-y-5">
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

            {/* Row 3: Status, Priority and Category Select filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <FolderKanban size={16} /> Hierarquia
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
          {timelineTaskId === null ? (
            <div className="space-y-4">
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
                         <div key={status} className="overflow-hidden rounded-xl border border-slate-200/60 flex flex-col bg-white">
                            <div className="bg-slate-50 border-b border-slate-200/60 px-4 py-3 flex items-center justify-between">
                              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                 {status === "Concluída" ? <CheckCircle2 size={14} className="text-emerald-500" /> : status === "Em andamento" ? <Activity size={14} className="text-blue-500" /> : <Clock size={14} className="text-slate-400" />}
                                 {status}
                              </h3>
                              <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{groupRootTasks.length} grupos estruturais</span>
                            </div>
                            <div>
                              {groupRootTasks.filter(t => childMatchesOrIsPath(t.id)).map(t => renderTaskNode(t, 0, false))}
                            </div>
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
                         <div key={cat.id} className="overflow-hidden rounded-xl border border-slate-200/60 flex flex-col bg-white">
                            <div className="bg-slate-50 border-b border-slate-200/60 px-4 py-3 flex items-center justify-between">
                              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                 <Tag size={14} className="text-slate-400" />
                                 {cat.name}
                              </h3>
                              <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{groupRootTasks.length} grupos estruturais</span>
                            </div>
                            <div>
                              {groupRootTasks.filter(t => childMatchesOrIsPath(t.id)).map(t => renderTaskNode(t, 0, false))}
                            </div>
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
                         <div key={ar.id} className="overflow-hidden rounded-xl border border-slate-200/60 flex flex-col bg-white">
                            <div className="bg-slate-50 border-b border-slate-200/60 px-4 py-3 flex items-center justify-between">
                              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                 <Briefcase size={14} className="text-slate-400" />
                                 {ar.name}
                              </h3>
                              <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{groupRootTasks.length} grupos estruturais</span>
                            </div>
                            <div>
                              {groupRootTasks.filter(t => childMatchesOrIsPath(t.id)).map(t => renderTaskNode(t, 0, false))}
                            </div>
                         </div>
                       )
                     })}
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
                         <div key={resp.id} className="overflow-hidden rounded-xl border border-slate-200/60 flex flex-col bg-white">
                            <div className="bg-slate-50 border-b border-slate-200/60 px-4 py-3 flex items-center justify-between">
                              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                 <Users size={14} className="text-slate-400" />
                                 {resp.name}
                              </h3>
                              <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{groupRootTasks.length} grupos estruturais</span>
                            </div>
                            <div>
                              {groupRootTasks.filter(t => childMatchesOrIsPath(t.id)).map(t => renderTaskNode(t, 0, false))}
                            </div>
                         </div>
                       )
                     })}
                   </div>
                 );
              })()}
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 pt-10">
              <div className="mb-8 border-b border-slate-100 pb-4">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={16} className="text-adasa-mid" /> 
                  Linha do Tempo: {getTaskDisplayName(taskById[timelineTaskId]) || ""}
                </h4>
                <p className="text-[11px] font-semibold text-slate-500 mt-1 mb-4">
                  Exibindo o ciclo de vida da tarefa selecionada e todas as suas subtarefas dependentes.
                </p>
                {(() => {
                  const childrenTasks = timelineTasks.filter(t => t.depth > 0);
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
                {timelineTasks.map(({ task, depth }, idx) => (
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
                      className="bg-slate-50 border border-slate-200/70 p-5 rounded-2xl hover:border-adasa-mid/60 hover:shadow-md transition-all cursor-pointer group-hover:-translate-y-0.5" 
                      onClick={() => handleEditTask(task)}
                      style={{ marginLeft: `${depth > 0 ? Math.min(depth * 1.5, 6) : 0}rem` }}
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-md">ID: {task.id}</span>
                            <span className={`text-[9px] font-bold uppercase py-0.5 px-2 rounded-md border ${getPriorityBadgeClass(task.priority)}`}>{task.priority}</span>
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
    const isExpanded = !!expandedTasks[task.id];
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
          style={{ paddingLeft: `${forceFlat ? 16 : Math.max(16, depth * 24)}px` }}
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

                  {task.priority && (
                    <span className={`text-[9px] font-bold uppercase py-0.5 px-2 rounded-md border ${getPriorityBadgeClass(task.priority)}`}>
                      {task.priority}
                    </span>
                  )}
                  
                  {hasSubs && (
                    <span 
                      className="text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded flex items-center gap-1 hover:bg-indigo-100 transition-colors cursor-pointer"
                      title="Totais de Subtarefas"
                      onClick={() => handleEditTask(task)}
                    >
                      Subtarefas ({taskChildren.length})
                    </span>
                  )}
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
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                title="Editar"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTask(task.id);
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Excluir"
              >
                <Trash2 size={12} />
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
