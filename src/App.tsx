/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Trash2,
  TrendingUp,
  BarChart3,
  Calculator,
  ChevronRight,
  ChevronDown,
  Database,
  Info,
  RotateCcw,
  LayoutGrid,
  Edit3,
  Upload,
  Download,
  ArrowLeft,
  Files,
  Check,
  AlertTriangle,
  X,
  Droplets,
  CalendarCheck,
  Save,
  FileText,
  Menu,
  RefreshCw,
  ListTodo,
  Home,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  Map as MapIcon,
  Layers,
  Tags,
  Users,
  FilePlus,
  BarChart2,
  GitCompare,
  LogOut,
  Copy,
  FileSpreadsheet
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Cell,
  LabelList,
} from "recharts";
import {
  SYSTEMS,
  REGIONS,
  INITIAL_DEMAND,
  INITIAL_SUPPLY_SOURCES,
} from "./constants";
import {
  Demand,
  DemandEntry,
  System,
  Region,
  SupplySource,
  OperationalAdjustment,
  AdjustmentType,
  Task,
} from "./types";

import { calculateDemand, formatNumber, formatInteger, cn } from "./lib/utils";
import { RequirePermission, useAuth } from "./lib/auth";
import { LoginPage } from "./components/LoginPage";
import { MapTab } from "./components/MapTab";
import { PlanningTab } from "./components/PlanningTab";
import { UserManagementTab } from "./components/UserManagementTab";
import { HomeTab } from "./components/HomeTab";
import { ResolutionsTab } from "./components/ResolutionsTab";
import { ResolutionsDashboard } from "./components/ResolutionsDashboard";
import { ManagerialHub } from "./components/ManagerialHub";

const formatSaldoValue = (val: number, type: 'percent' | 'hab' | 'ls', showSuffix = true) => {
  if (val == null || Number.isNaN(val)) return <span style={{ color: '#94a3b8' }}>-</span>;
  const prefix = val >= 0 ? '+' : '-';
  let numStr = '';
  if (type === 'percent') numStr = Math.abs(val).toFixed(1) + (showSuffix ? '%' : '');
  else if (type === 'hab') numStr = formatInteger(Math.abs(val)) + (showSuffix ? ' hab.' : '');
  else numStr = formatNumber(Math.abs(val)) + (showSuffix ? ' L/s' : '');
  
  let color = '#22c55e';
  if (type === 'percent') {
    const iadValue = val + 100;
    if (iadValue < 120) {
      color = '#ef4444'; // Red
    } else if (iadValue >= 120 && iadValue <= 130) {
      color = '#d97706'; // Amber for high-contrast on light background
    } else {
      color = '#16a34a'; // Green
    }
  } else {
    color = val >= 0 ? '#008A3F' : '#ef4444';
  }
  return <span style={{ color }}>{`${prefix}${numStr}`}</span>;
};


function OperationalAdjustmentForm({ system, activeSystems, setOperationalAdjustments, selectedWaterBalanceId }: { system: System, activeSystems: System[], setOperationalAdjustments: any, selectedWaterBalanceId: string | null }) {
  const [type, setType] = React.useState<AdjustmentType>("Aumento da vazão");
  const [description, setDescription] = React.useState("");
  const [startYear, setStartYear] = React.useState("2024");
  const [endYear, setEndYear] = React.useState("2053");
  const [flowValue, setFlowValue] = React.useState("");
  const [targetSystemId, setTargetSystemId] = React.useState("");

  React.useEffect(() => {
    if (type === "Transferência") {
      if (targetSystemId) {
        const targetSystem = activeSystems.find(s => Number(s.id) === Number(targetSystemId));
        setDescription(`Transferência para ${targetSystem?.name || ''}`);
      } else {
        setDescription("Transferência para selecione um sistema no combobox");
      }
    }
  }, [type, targetSystemId, activeSystems]);

  const handleSave = () => {
    if (type !== "Transferência" && !description) {
      alert("Por favor, preencha a descrição.");
      return;
    }
    if (type === "Transferência" && !targetSystemId) {
      alert("Por favor, selecione o subsistema de destino.");
      return;
    }

    let parsedFlow = parseFloat(
      flowValue.replace(/\./g, "").replace(",", ".")
    );

    if (isNaN(parsedFlow)) {
      alert("Por favor, insira um valor numérico válido para a vazão.");
      return;
    }
    
    // Assegura valores positivos ou negativos baseados no tipo
    parsedFlow = Math.abs(parsedFlow);
    if (type === "Redução da vazão" || type === "Transferência") {
      parsedFlow = -parsedFlow;
    }

    setOperationalAdjustments((prev: OperationalAdjustment[]) => {
      const maxId = prev.length > 0 
        ? Math.max(...prev.map((a: any) => Number(a.id) || 0)) 
        : 0;
      const sourceId = maxId + 1;
      const targetId = maxId + 2;
      const newAdjs: OperationalAdjustment[] = [];
      
      newAdjs.push({
        id: sourceId,
        systemId: Number(system.id),
        type: type,
        description: description,
        startYear: parseInt(startYear) || 2024,
        endYear: parseInt(endYear) || 2053,
        flowValue: parsedFlow,
        waterBalanceId: Number(selectedWaterBalanceId),
        ...(type === "Transferência" ? { linkedAdjustmentId: targetId } : {})
      });
      
      if (type === "Transferência") {
        const targetSystem = activeSystems.find(s => Number(s.id) === Number(targetSystemId));
        newAdjs.push({
          id: targetId,
          systemId: Number(targetSystemId),
          type: "Transferência",
          description: `Recebido do ${system.name}`,
          startYear: parseInt(startYear) || 2024,
          endYear: parseInt(endYear) || 2053,
          flowValue: Math.abs(parsedFlow),
          waterBalanceId: Number(selectedWaterBalanceId),
          linkedAdjustmentId: sourceId
        });
      }
      return [...prev, ...newAdjs];
    });

    if (type !== "Transferência") setDescription("");
    setFlowValue("");
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Ocorrência
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AdjustmentType)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
          >
            <option value="Aumento da vazão">Aumento da vazão</option>
            <option value="Redução da vazão">Redução da vazão</option>
            <option value="Transferência">Transferência</option>
          </select>
        </div>
        
        {type === "Transferência" ? (
            <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Subsistema de Destino
            </label>
            <select
                value={targetSystemId}
                onChange={(e) => setTargetSystemId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            >
                <option value="">Selecione o subsistema de destino</option>
                {activeSystems.filter(s => s.id !== system.id).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
            </div>
        ) : null}

        <div className={type === "Transferência" ? "md:col-span-2" : ""}>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Descrição
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={type === "Transferência"}
            type="text"
            maxLength={200}
            placeholder="Ex: Ampliação do sistema"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Ano Inicial
            </label>
            <input
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
              type="number"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Ano Final
            </label>
            <input
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
              type="number"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Vazão de Ajuste (L/s)
          </label>
          <input
            value={flowValue}
            onChange={(e) => setFlowValue(e.target.value)}
            type="text"
            placeholder="Ex: 50,5"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>
      </div>
      <button
        onClick={handleSave}
        className="w-full py-2 bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-slate-700 transition"
      >
        Salvar Ajuste Operacional
      </button>
    </div>
  );
}

const isSameWb = (itemWbId: number | string | null | undefined, filterWbId: number | string | null | undefined): boolean => {
  if (itemWbId === filterWbId && itemWbId !== undefined && itemWbId !== null) return true;
  const itemNormalized = itemWbId === "wb-2026" ? 2026 : (itemWbId ? Number(itemWbId) : null);
  const filterNormalized = filterWbId === "wb-2026" ? 2026 : (filterWbId ? Number(filterWbId) : null);
  
  if (itemNormalized === filterNormalized && itemNormalized !== null) return true;
  if (itemNormalized === null && filterNormalized === 2026) return true;
  return false;
};

export default function App() {
  const { currentUser, roles, checkPermission, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Public access support to share dashboards without prompting for login
  const [isPublicMode, setIsPublicMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const hasPublicQuery = params.has("public") || params.has("share");
    const hasPublicHash = window.location.hash.startsWith("#public-") || window.location.hash.startsWith("#share-");
    return hasPublicQuery || hasPublicHash;
  });

  const [publicTabName, setPublicTabName] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    let name = params.get("public") || params.get("share");
    if (!name) {
      if (window.location.hash.startsWith("#public-")) {
        name = window.location.hash.replace("#public-", "");
      } else if (window.location.hash.startsWith("#share-")) {
        name = window.location.hash.replace("#share-", "");
      }
    }
    return name;
  });

  useEffect(() => {
    const handleUrlCheck = () => {
      const params = new URLSearchParams(window.location.search);
      const hasPublicQuery = params.has("public") || params.has("share");
      const hasPublicHash = window.location.hash.startsWith("#public-") || window.location.hash.startsWith("#share-");
      
      let name = params.get("public") || params.get("share");
      if (!name) {
        if (window.location.hash.startsWith("#public-")) {
          name = window.location.hash.replace("#public-", "");
        } else if (window.location.hash.startsWith("#share-")) {
          name = window.location.hash.replace("#share-", "");
        }
      }
      
      setIsPublicMode(Boolean(hasPublicQuery || hasPublicHash));
      setPublicTabName(name || null);
    };

    window.addEventListener("hashchange", handleUrlCheck);
    window.addEventListener("popstate", handleUrlCheck);
    return () => {
      window.removeEventListener("hashchange", handleUrlCheck);
      window.removeEventListener("popstate", handleUrlCheck);
    };
  }, []);

  const [systems, setSystems] = useState<System[]>(() => {
    const saved = localStorage.getItem("adasa-systems");
    return saved ? JSON.parse(saved) : SYSTEMS;
  });
  const [regions, setRegions] = useState<Region[]>(() => {
    const saved = localStorage.getItem("adasa-regions");
    return saved ? JSON.parse(saved) : REGIONS;
  });

  useEffect(() => {
    localStorage.setItem("adasa-systems", JSON.stringify(systems));
  }, [systems]);

  useEffect(() => {
    localStorage.setItem("adasa-regions", JSON.stringify(regions));
  }, [regions]);

  const [demands, setDemands] = useState<Demand[]>(() => {
    const saved = localStorage.getItem("adasa-demands");
    return saved ? JSON.parse(saved) : [INITIAL_DEMAND];
  });
  const [activeTab, setActiveTab] = useState<"home" | "gerencial" | "edit" | "compare" | "manage" | "analyze" | "templates" | "planning" | "users" | "reg_cadastro" | "reg_painel">(
    "home",
  );
  const [activePlanningSubTab, setActivePlanningSubTab] = useState<"tasks" | "dashboard" | "plans" | "areas" | "categories" | "responsibles" | "import" | "models">("dashboard");
  const [isMyTasksSelected, setIsMyTasksSelected] = useState(false);
  const [myTasksFilterTrigger, setMyTasksFilterTrigger] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [responsibles, setResponsibles] = useState<any[]>([]);
  
  // Task management states
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskFormMode, setTaskFormMode] = useState<"create" | "edit">("create");
  const [editingTaskData, setEditingTaskData] = useState<any>({});
  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("");
  const [manageSubTabState, setManageSubTabState] = useState<"tasks" | "responsibles">("tasks");
  const [responsibleFormOpen, setResponsibleFormOpen] = useState(false);
  const [editingResponsibleData, setEditingResponsibleData] = useState<any>({});

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [manageSubTab, setManageSubTab] = useState<
    "list" | "balance" | "systems" | "demand" | "supply"
  >("list");
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [templateFiles, setTemplateFiles] = useState<{ id: number | string, name: string, description: string, url: string }[]>([]);
  const [demandSubTab, setDemandSubTab] = useState<"edit" | "view">("edit");
  const [supplySubTab, setSupplySubTab] = useState<"edit" | "view">("edit");
  
  const [confirmState, setConfirmState] = useState<{ title?: string; message: string; type?: "confirm" | "alert"; onConfirm?: () => void } | null>(null);
  
  const [waterBalances, setWaterBalances] = useState<import("./types").WaterBalance[]>(() => {
    const saved = localStorage.getItem("adasa-water-balances");
    if (saved) {
      return JSON.parse(saved);
    }
    // Fallback migration from single to multiple
    const legacySaved = localStorage.getItem("adasa-water-balance");
    if (legacySaved) {
      return [JSON.parse(legacySaved)];
    }
    return [{
      id: 2026,
      description: "Balanço Hídrico 2026",
      responsible: "",
      deliveryDate: "",
      receivedBy: "",
      receiptDate: "",
      status: "Pendente"
    }];
  });

  const [selectedWaterBalanceId, setSelectedWaterBalanceId] = useState<number | string | null>(() => {
    if (waterBalances && waterBalances.length > 0) {
      const sorted = [...waterBalances].sort((a, b) => {
        const numA = a.id === "wb-2026" ? 2026 : (Number(a.id) || 0);
        const numB = b.id === "wb-2026" ? 2026 : (Number(b.id) || 0);
        return numB - numA;
      });
      return sorted[0].id;
    }
    return null;
  });

  useEffect(() => {
    localStorage.setItem("adasa-water-balances", JSON.stringify(waterBalances));
  }, [waterBalances]);

  const [supplySources, setSupplySources] = useState<SupplySource[]>(() => {
    const saved = localStorage.getItem("adasa-supply-sources");
    return saved ? JSON.parse(saved) : INITIAL_SUPPLY_SOURCES;
  });
  const [operationalAdjustments, setOperationalAdjustments] = useState<
    OperationalAdjustment[]
  >(() => {
    const saved = localStorage.getItem("adasa-operational-adjustments");
    if (saved) {
      let parsed = JSON.parse(saved);
      parsed = parsed.map((adj: any) => {
        if (adj.description && adj.description.includes("'")) {
          return { ...adj, description: adj.description.replace(/'/g, "") };
        }
        return adj;
      });
      return parsed;
    }
    return [];
  });

  const getDeduplicatedActiveList = <T extends { id: number | string, waterBalanceId?: number | string | null }>(list: T[], wbId: number | string | null): T[] => {
    if (wbId === null) return [];
    const filtered = list.filter(item => {
      const iWb = item.waterBalanceId ? Number(item.waterBalanceId) : null;
      const tWb = wbId ? Number(wbId) : null;
      return iWb === tWb || (iWb === null && tWb === 2026);
    });
    const unique = new Map<number | string, T>();
    filtered.forEach(item => {
      const iWb = item.waterBalanceId ? Number(item.waterBalanceId) : null;
      const tWb = wbId ? Number(wbId) : null;
      if (iWb === tWb || !unique.has(item.id)) {
         unique.set(item.id, item);
      }
    });
    return Array.from(unique.values());
  };

  const activeSystems = useMemo(() => getDeduplicatedActiveList(systems, selectedWaterBalanceId), [systems, selectedWaterBalanceId]);
  const activeRegions = useMemo(() => getDeduplicatedActiveList(regions, selectedWaterBalanceId), [regions, selectedWaterBalanceId]);
  const activeDemands = useMemo(() => getDeduplicatedActiveList(demands, selectedWaterBalanceId), [demands, selectedWaterBalanceId]);
  const activeSupplySources = useMemo(() => getDeduplicatedActiveList(supplySources, selectedWaterBalanceId), [supplySources, selectedWaterBalanceId]);
  const activeOperationalAdjustments = useMemo(() => getDeduplicatedActiveList(operationalAdjustments, selectedWaterBalanceId), [operationalAdjustments, selectedWaterBalanceId]);

  useEffect(() => {
    localStorage.setItem("adasa-demands", JSON.stringify(demands));
  }, [demands]);

  useEffect(() => {
    localStorage.setItem("adasa-supply-sources", JSON.stringify(supplySources));
  }, [supplySources]);

  useEffect(() => {
    localStorage.setItem(
      "adasa-operational-adjustments",
      JSON.stringify(operationalAdjustments),
    );
  }, [operationalAdjustments]);
  const [selectedDemandId, setSelectedDemandId] = useState<number | string>(
    INITIAL_DEMAND.id,
  );
  const [compareDemandIds, setCompareDemandIds] = useState<(number | string)[]>([]);
  const [tableLayout, setTableLayout] = useState<"system" | "year">("year");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [editingRegionModeId, setEditingRegionModeId] = useState<string | null>(null);
  const [editingRegionNameStr, setEditingRegionNameStr] = useState("");
  const [editingRegionCodeStr, setEditingRegionCodeStr] = useState("");
  const [editingSystemId, setEditingSystemId] = useState<string | null>(null);
  const [editingSystemName, setEditingSystemName] = useState("");
  const [editingSystemCode, setEditingSystemCode] = useState("");
  const [editingSupplySource, setEditingSupplySource] = useState<SupplySource | null>(null);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");
  const [yearRange, setYearRange] = useState({ start: 2017, end: 2053 });
  const [hiddenYears, setHiddenYears] = useState<number[]>([]);

  // Derived data
  const toggleExpand = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: prev[key] === false ? true : false }));
  };

  const handleExpandAll = () => {
    setExpandedGroups({});
  };

  const handleCollapseAll = () => {
    const newExpanded: Record<string, boolean> = {};
    if (tableLayout === "system") {
      activeSystems.forEach((s) => {
        newExpanded[`sys-${s.id}`] = false;
        activeRegions
          .filter((r) => r.systemId === s.id)
          .forEach((r) => {
            newExpanded[`sys-${s.id}-reg-${r.id}`] = false;
          });
      });
    } else {
      const years = Array.from<number>(new Set<number>(results.map((r) => r.year)));
      years.forEach((year) => {
        activeSystems.forEach((sys) => {
          newExpanded[`year-${year}-sys-${sys.id}`] = false;
        });
      });
    }
    setExpandedGroups(newExpanded);
  };

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [lastSavedStateStr, setLastSavedStateStr] = useState<string | null>(null);
  const [savedBalanceIds, setSavedBalanceIds] = useState<string[]>([]);
  const [riskReferences, setRiskReferences] = useState<any[]>([]);

  const fetchCloudData = async (isManualSync = false) => {
    try {
      const res = await fetch("/api/load-data");
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.success && data.data) {
          if (data.data.waterBalances) { setWaterBalances(data.data.waterBalances); setSavedBalanceIds(data.data.waterBalances.map((w: any) => w.id)); }
          if (data.data.systems) setSystems(data.data.systems);
          if (data.data.regions) setRegions(data.data.regions);
          if (data.data.demands) setDemands(data.data.demands);
          if (data.data.supplySources) setSupplySources(data.data.supplySources);
          if (data.data.operationalAdjustments) setOperationalAdjustments(data.data.operationalAdjustments);
          if (data.data.templateFiles) setTemplateFiles(data.data.templateFiles);
          if (data.data.riskReferences) setRiskReferences(data.data.riskReferences);
          if (data.data.tasks) setTasks(data.data.tasks);
          if (data.data.plans) setPlans(data.data.plans);
          if (data.data.areas) setAreas(data.data.areas);
          if (data.data.responsibles) setResponsibles(data.data.responsibles);
          
          if (isManualSync) {
            setHasPendingChanges(false);
            const payload = { 
              waterBalances: data.data.waterBalances || waterBalances, 
              systems: data.data.systems || systems, 
              regions: data.data.regions || regions, 
              demands: data.data.demands || demands, 
              supplySources: data.data.supplySources || supplySources, 
              operationalAdjustments: data.data.operationalAdjustments || operationalAdjustments
            };
            setLastSavedStateStr(JSON.stringify(payload));
          }
        }
      } else {
        console.error("Recebido formato não-JSON em /api/load-data. A sessão pode ter expirado ou o Vite interceptou. Tente recarregar a página.");
      }
    } catch (e) {
      console.error("Erro ao carregar dados inicias do banco", e);
    } finally {
      setIsDataLoaded(true);
    }
  };

  const handleTaskSubmitInApp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = taskFormMode === 'edit';
      const url = isEdit ? `/api/tasks/${editingTaskData.id}` : "/api/tasks";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingTaskData,
          progress: editingTaskData.progress ? parseInt(editingTaskData.progress) : 0,
          planId: editingTaskData.planId ? parseInt(editingTaskData.planId) : null,
          areaIds: Array.isArray(editingTaskData.areaIds) ? editingTaskData.areaIds.map((id: any) => parseInt(id)) : [],
          responsibleIds: Array.isArray(editingTaskData.responsibleIds) ? editingTaskData.responsibleIds.map((id: any) => parseInt(id)) : []
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Éxito", isEdit ? "Tarefa atualizada com sucesso." : "Tarefa cadastrada com sucesso.", "success");
        setTaskFormOpen(false);
        fetchCloudData();
      } else {
        showToast("Erro", data.error || "Erro ao salvar tarefa.", "error");
      }
    } catch (err: any) {
      showToast("Erro", "Erro ao conectar ao servidor.", "error");
    }
  };

  const handleTaskDeleteInApp = async (id: number) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("Éxito", "Tarefa excluída com sucesso.", "success");
        fetchCloudData();
      } else {
        showToast("Erro", data.error || "Erro ao deletar tarefa.", "error");
      }
    } catch (err) {
      showToast("Erro", "Erro ao conectar ao servidor.", "error");
    }
  };

  const handleResponsibleSubmitInApp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = editingResponsibleData.id;
      const isEdit = !!id;
      const url = isEdit ? `/api/responsibles/${id}` : "/api/responsibles";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingResponsibleData)
      });
      const data = await res.json();
      if (data.success) {
        if (!isEdit && data.generatedPassword) {
          setConfirmState({
            title: "Usuário Criado para o Responsável",
            message: `O responsável foi cadastrado e integrado com sucesso!\n\nFoi criado um usuário vinculado:\n• Usuário/E-mail: ${editingResponsibleData.email}\n• Senha Padrão de Acesso: ${data.generatedPassword}\n\nPor favor, anote a senha acima para que o responsável consiga realizar o login no sistema.`,
            type: "alert"
          });
          showToast("Sucesso", `Responsável criado! Senha gerada: ${data.generatedPassword}`, "success");
        } else {
          showToast("Sucesso", isEdit ? "Responsável atualizado com sucesso." : "Responsável cadastrado com sucesso.", "success");
        }
        setResponsibleFormOpen(false);
        fetchCloudData();
      } else {
        showToast("Erro", data.error || "Erro ao salvar responsável.", "error");
      }
    } catch (err) {
      showToast("Erro", "Erro ao conectar ao servidor.", "error");
    }
  };

  const handleResponsibleDeleteInApp = async (id: number) => {
    try {
      const res = await fetch(`/api/responsibles/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("Éxito", "Responsável excluído com sucesso.", "success");
        fetchCloudData();
      } else {
        showToast("Erro", data.error || "Erro ao deletar responsável.", "error");
      }
    } catch (err) {
      showToast("Erro", "Erro ao conectar ao servidor.", "error");
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchCloudData();
    }
  }, [currentUser]);

  useEffect(() => {
    if (isDataLoaded && lastSavedStateStr === null) {
      const payload = { waterBalances, systems, regions, demands, supplySources, operationalAdjustments };
      setLastSavedStateStr(JSON.stringify(payload));
    }
  }, [isDataLoaded, lastSavedStateStr, waterBalances, systems, regions, demands, supplySources, operationalAdjustments]);

  useEffect(() => {
    if (isDataLoaded && lastSavedStateStr !== null) {
      const payload = { waterBalances, systems, regions, demands, supplySources, operationalAdjustments };
      const currentStr = JSON.stringify(payload);
      setHasPendingChanges(currentStr !== lastSavedStateStr);
    }
  }, [waterBalances, systems, regions, demands, supplySources, operationalAdjustments, lastSavedStateStr, isDataLoaded]);

  const payloadRef = useRef({ waterBalances, systems, regions, demands, supplySources, operationalAdjustments });
  useEffect(() => {
    payloadRef.current = { waterBalances, systems, regions, demands, supplySources, operationalAdjustments };
  }, [waterBalances, systems, regions, demands, supplySources, operationalAdjustments]);

  
  const handleSaveModule = async (moduleName: string, moduleData: any, isSilent = false) => {
    setIsSaving(true);
    try {
      const payload = { module: moduleName, data: moduleData };
      const bodyStr = JSON.stringify(payload);
      
      const res = await fetch("/api/save-module", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyStr
      });
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const resData = await res.json();
        if (resData.success) {
          if (moduleName === "water-balances") {
            setSavedBalanceIds(prev => Array.from(new Set([...prev, ...moduleData.waterBalances.map((w: any) => w.id)])));
          }
          setHasPendingChanges(false);
          if (!isSilent) {
            showToast("Sucesso", "Dados salvos com sucesso!", "success");
          }
        } else {
          throw new Error(resData.error);
        }
      } else {
        throw new Error("Resposta não-JSON recebida da API.");
      }
    } catch (e: any) {
      if (!isSilent) {
        showToast("Erro", e.message || "Erro ao salvar", "error");
      } else {
        console.error("Auto-save falhou: ", e);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToCloud = async (isSilent = false, overridePayload?: any) => {
    setIsSaving(true);
    try {
      // Deduplicate on save for broken state
      let maxRegionId = regions.length > 0 ? Math.max(...regions.map((x: any) => Number(x.id) || 0)) : 0;
      let maxDemandId = demands.length > 0 ? Math.max(...demands.map((x: any) => Number(x.id) || 0)) : 0;
      let maxSupplyId = supplySources.length > 0 ? Math.max(...supplySources.map((x: any) => Number(x.id) || 0)) : 0;

      const cleanRegions = [];
      const seenRegIds = new Set();
      for (const r of regions) {
        if (!seenRegIds.has(r.id)) {
          seenRegIds.add(r.id);
          cleanRegions.push(r);
        } else {
          cleanRegions.push({ ...r, id: ++maxRegionId });
        }
      }

      const cleanDemands = [];
      const seenScenIds = new Set();
      for (const s of demands) {
        if (!seenScenIds.has(s.id)) {
          seenScenIds.add(s.id);
          cleanDemands.push(s);
        } else {
          cleanDemands.push({ ...s, id: ++maxDemandId });
        }
      }

      const cleanSupply = [];
      const seenSupIds = new Set();
      for (const s of supplySources) {
        if (!seenSupIds.has(s.id)) {
          seenSupIds.add(s.id);
          cleanSupply.push(s);
        } else {
          cleanSupply.push({ ...s, id: ++maxSupplyId });
        }
      }
      
      const payload = overridePayload || payloadRef.current;

      const bodyStr = JSON.stringify(payload);
      if (bodyStr.length > 25 * 1024 * 1024) { // 25 MB max limit to prevent 413 on Cloud Run
        throw new Error("O tamanho dos dados (anexos/modelos) excede o limite de 25MB por balanço. Por favor remova alguns arquivos e tente novamente.");
      }

      const res = await fetch("/api/save-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyStr
      });
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const resData = await res.json();
        if (resData.success) {
          setLastSavedStateStr(JSON.stringify(payload));
          setHasPendingChanges(false);
          setSavedBalanceIds(payload.waterBalances.map((w: any) => w.id));
          if (!isSilent) {
            showToast("Sucesso", "Balanço salvo com sucesso no banco!", "success");
          }
        } else if (resData.error === "DATABASE_URL_MISSING") {
          setHasPendingChanges(false); // mock save
          if (!isSilent) {
            showToast("Aviso", "Banco de dados não configurado (DATABASE_URL ausente). Pode continuar usando localmente.", "warning");
          }
        } else {
          throw new Error(resData.error);
        }
      } else {
        const rawText = await res.text();
        console.error("Resposta não-JSON:", rawText);
        throw new Error("Erro de comunicação com o servidor. Resposta não-JSON recebida.");
      }
    } catch (e: any) {
      if (!isSilent) {
        showToast("Erro", e.message || "Erro ao salvar no banco", "error");
      } else {
        showToast("Aviso", "Falha no salvamento automático. As alterações podem não ter sido salvas.", "warning");
        console.error("Auto-save falhou: ", e);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTemplates = async () => {
    setIsSaving(true);
    try {
      const bodyStr = JSON.stringify({ templateFiles });
      if (bodyStr.length > 25 * 1024 * 1024) {
        throw new Error("O tamanho dos arquivos excede o limite de 25MB. Por favor, remova alguns modelos ou use arquivos menores.");
      }
      
      const res = await fetch("/api/save-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyStr
      });
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const resData = await res.json();
        if (resData.success) {
          showToast("Sucesso", "Arquivos modelo salvos com sucesso no banco!", "success");
        } else {
          throw new Error(resData.error);
        }
      } else {
        const rawText = await res.text();
        console.error("Resposta não-JSON:", rawText);
        throw new Error("Erro de comunicação com o servidor. Resposta não-JSON recebida.");
      }
    } catch (e: any) {
      console.error("Erro ao salvar arquivos modelo", e);
      showToast("Erro", e.message || "Ocorreu um erro ao salvar os arquivos.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTabChange = (newTab: typeof activeTab) => {
    setActiveTab(newTab);
    setIsMobileMenuOpen(false);
  };

  const handleAddSystem = () => {
    const name = window.prompt("Nome do novo subsistema:");
    if (!name || !selectedWaterBalanceId) return;
    const maxId = systems.length > 0 ? Math.max(...systems.map((s: any) => Number(s.id) || 0)) : 0;
    const newId = maxId + 1;
    const newSeq = systems.length + 1;
    const code = `S${newSeq.toString().padStart(2, "0")}`;
    setSystems([...systems, { id: newId, code, name, waterBalanceId: Number(selectedWaterBalanceId) }]);
    setExpandedGroups((prev) => ({ ...prev, [`sys-${newId}`]: true }));
    };

  const handleAddRegion = (systemIdStr: string) => {
    const systemId = Number(systemIdStr);
    const codeVal = window.prompt("Código da R.A. (opcional):") || "";
    const name = window.prompt("Nome da nova região administrativa:");
    if (!name || !selectedWaterBalanceId) return;
    const maxId = regions.length > 0 ? Math.max(...regions.map((r: any) => Number(r.id) || 0)) : 0;
    const newId = maxId + 1;
    setRegions([...regions, { id: newId, code: codeVal, name, systemId, waterBalanceId: Number(selectedWaterBalanceId) }]);

    // Add empty entries to all demands for this new region for the existing years
    const years = Array.from(
      new Set(activeDemands.flatMap((s) => s.entries.map((e) => e.year))),
    );
    const defaultYears = years.length > 0 ? years : [2017, 2018, 2019];

    setDemands((prev) =>
      prev.map((s) => {
        const newEntries = defaultYears.map((year) => ({
          regionId: newId,
          year,
          population: 0,
          coverage: 0.99,
          perCapitaConsumption: 0,
          losses: 0.3,
        }));
        return { ...s, entries: [...s.entries, ...newEntries] };
      }),
    );
    };

  const handleDeleteSystem = (systemId: string) => {
    setConfirmState({
      message: "Certeza que deseja excluir este subsistema e todas as regiões nele?",
      onConfirm: () => {
        setSystems((prev) => prev.filter((s) => s.id !== systemId));
        setRegions((prev) => prev.filter((r) => r.systemId !== systemId));
        setDemands((prev) =>
          prev.map((s) => ({
            ...s,
            entries: s.entries.filter((e) => {
              const reg = activeRegions.find((r) => r.id === e.regionId);
              return reg?.systemId !== systemId;
            }),
          })),
        );
      }
    });
    setTimeout(() => handleSaveToCloud(true), 150);
    setTimeout(() => handleSaveToCloud(true), 150);
    setTimeout(() => handleSaveToCloud(true), 150);
  };

  const handleSaveRegionMode = (regionId: string) => {
    if (!editingRegionNameStr.trim()) return;
    setRegions(prev => prev.map(r => r.id === regionId ? { ...r, name: editingRegionNameStr.trim(), code: editingRegionCodeStr.trim() } : r));
    setEditingRegionModeId(null);
    setEditingRegionNameStr("");
    setEditingRegionCodeStr("");
  };

  const handleSaveSystem = (systemId: string) => {
    if (!editingSystemName.trim()) return;
    setSystems(prev => prev.map(s => s.id === systemId ? { ...s, name: editingSystemName.trim(), code: editingSystemCode.trim() } : s));
    setEditingSystemId(null);
    setEditingSystemName("");
    setEditingSystemCode("");
  };


  const handleAddSupplySource = (systemIdStr: string) => {
    const systemId = Number(systemIdStr);
    const validIds = supplySources.map((s: any) => Number(s.id)).filter(id => !isNaN(id));
    const maxId = validIds.length > 0 ? Math.max(...validIds) : 0;
    const newId = maxId + 1;
    const newSource: SupplySource = {
      code: '',
      id: newId,
      name: 'Nova Captação',
      type: 'Superficial',
      grantedFlow: 0,
      operationalFlow: 0,
      unavailableFlow: 0,
      unavailabilityReason: '',
      systemId,
      waterBalanceId: Number(selectedWaterBalanceId) || 2026
    };
    setSupplySources(prev => [...prev, newSource]);
    setEditingSupplySource(newSource);
    };

  const handleDeleteSupplySource = (source: SupplySource) => {
    setConfirmState({
      message: "Certeza que deseja excluir esta captação?",
      onConfirm: () => setSupplySources(prev => prev.filter(s => !(s.id === source.id && s.waterBalanceId === source.waterBalanceId)))
    });
    setTimeout(() => handleSaveToCloud(true), 150);
    setTimeout(() => handleSaveToCloud(true), 150);
  };

  const handleDeleteRegion = (region: Region) => {
    setConfirmState({
      message: "Certeza que deseja excluir esta região?",
      onConfirm: () => {
        setRegions((prev) => prev.filter((r) => !(r.id === region.id && r.waterBalanceId === region.waterBalanceId)));
        setDemands((prev) =>
          prev.map((s) => ({
            ...s,
            entries: s.entries.filter((e) => e.regionId !== region.id),
          })),
        );
      }
    });
    setTimeout(() => handleSaveToCloud(true), 150);
  };

  const handleUpdateRegionDetails = (
    regionId: string,
    updates: Partial<Region>,
  ) => {
    setRegions((prev) =>
      prev.map((r) => (r.id === regionId && r.waterBalanceId === updates.waterBalanceId ? { ...r, ...updates } : r)),
    );
  };

  const handleGenerateYearsForRegion = (regionId: string) => {
    const { start, end } = yearRange;
    if (start > end) return;

    setDemands((prevDemands) =>
      prevDemands.map((s) => {
        const newEntries = [...s.entries];
        for (let y = start; y <= end; y++) {
          if (
            !newEntries.find((e) => e.regionId === regionId && e.year === y)
          ) {
            newEntries.push({
              regionId,
              year: y,
              population: 0,
              coverage: 0.99,
              perCapitaConsumption: 160,
              losses: 0.3,
            });
          }
        }
        return { ...s, entries: newEntries.sort((a, b) => a.year - b.year) };
      }),
    );
    };

  const handleUpdateBaseEntry = (
    regionId: string,
    year: number,
    field: keyof DemandEntry,
    value: number,
  ) => {
    setDemands((prev) =>
      prev.map((s) => ({
        ...s,
        entries: s.entries.map((e) =>
          e.regionId === regionId && e.year === year
            ? { ...e, [field]: value }
            : e,
        ),
      })),
    );
    setTimeout(() => handleSaveToCloud(true), 150);
  };

  const handleToggleHiddenYear = (year: number) => {
    setHiddenYears((prev) =>
      prev.includes(year)
        ? prev.filter((y) => y !== year)
        : [...prev, year].sort(),
    );
  };

  const currentDemand = useMemo(
    () => activeDemands.find((s) => s.id === selectedDemandId) || activeDemands[0],
    [activeDemands, selectedDemandId],
  );

  const results = useMemo(() => {
    if (!currentDemand) return [];
    const mods = currentDemand.modifiers;
    return currentDemand.entries
      .filter((entry) => !hiddenYears.includes(entry.year))
      .map((entry) => {
        const region = activeRegions.find((r) => r.id === entry.regionId);
        const systemId = region ? region.systemId : "";
        const population =
          entry.population * (1 + mods.population / 100);
        const coverage =
          mods.coverage !== null
            ? mods.coverage / 100
            : entry.coverage;
        const perCapitaConsumption =
          entry.perCapitaConsumption *
          (1 + mods.perCapitaConsumption / 100);
        const losses =
          mods.losses !== null ? mods.losses / 100 : entry.losses;
        return {
          ...entry,
          systemId, // important for grouping
          regionName: region ? region.name : "Desconhecida",
          population,
          coverage,
          perCapitaConsumption,
          losses,
          projectedDemand: calculateDemand(
            population,
            coverage,
            perCapitaConsumption,
            losses,
          ),
        };
      });
  }, [currentDemand, activeRegions, hiddenYears]);

  const systemSupplyByYear = useMemo(() => {
    const table: Record<string, Record<number, number>> = {};
    const years = (
      Array.from<number>(new Set<number>(results.map((r) => r.year))) as number[]
    ).sort((a: number, b: number) => a - b);

    activeSystems.forEach((sys) => {
      const initialSupply = supplySources
        .filter((s) => s.systemId === sys.id)
        .reduce((acc, curr) => acc + curr.operationalFlow, 0);

      const sysAdjustments = activeOperationalAdjustments.filter(
        (a) => a.systemId === sys.id,
      );

      table[sys.id] = {};
      years.forEach((year) => {
        let currentSupply = initialSupply;
        sysAdjustments.forEach((adj) => {
          if (year >= adj.startYear && year <= adj.endYear) {
            if (adj.type === "Aumento da vazão" || adj.type === "Transferência")
              currentSupply += adj.flowValue;
            else if (adj.type === "Redução da vazão")
              currentSupply -= adj.flowValue;
          }
        });
        table[sys.id][year] = currentSupply;
      });
    });
    return table;
  }, [systems, supplySources, operationalAdjustments, results]);


    const [analyzeBalanceId, setAnalyzeBalanceId] = useState<string>("");
  useEffect(() => {
    if (selectedWaterBalanceId && !analyzeBalanceId) {
      setAnalyzeBalanceId(selectedWaterBalanceId);
    }
  }, [selectedWaterBalanceId]);

  const [analyzeSubTab, setAnalyzeSubTab] = useState<"balance" | "demand" | "supply" | "adjustments" | "map">("balance");
  const [hiddenSeriesAnalyze, setHiddenSeriesAnalyze] = useState<Record<string, boolean>>({});
  const [hiddenSeriesCompare, setHiddenSeriesCompare] = useState<Record<string, boolean>>({});
  const [analyzeSystemIds, setAnalyzeSystemIds] = useState<string[]>([]);
  const [analyzeAdjustmentTypes, setAnalyzeAdjustmentTypes] = useState<AdjustmentType[]>([]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [analyzeBalanceYear, setAnalyzeBalanceYear] = useState<number | null>(null);
  
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAnimating && analyzeBalanceId) {
      const balanceSystems = systems.filter(s => isSameWb(s.waterBalanceId, analyzeBalanceId));
      if (balanceSystems.length > 0) {
        let currentIndex = balanceSystems.findIndex(s => analyzeSystemIds.includes(s.id));
        if (currentIndex === -1) currentIndex = 0;
        
        // immediately set if no single one selected
        if (analyzeSystemIds.length !== 1 || !balanceSystems.find(s => s.id === analyzeSystemIds[0])) {
            setAnalyzeSystemIds([balanceSystems[0].id]);
            currentIndex = 0;
        }

        interval = setInterval(() => {
          currentIndex = (currentIndex + 1) % balanceSystems.length;
          setAnalyzeSystemIds([balanceSystems[currentIndex].id]);
        }, 10000);
      }
    }
    return () => clearInterval(interval);
  }, [isAnimating, analyzeBalanceId, systems, analyzeSystemIds]);
  
  const handleLegendClickAnalyze = (e: any) => {
    const { dataKey } = e;
    if (!dataKey) return;
    setHiddenSeriesAnalyze(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };

  const handleLegendClickCompare = (e: any) => {
    const { dataKey } = e;
    if (!dataKey) return;
    setHiddenSeriesCompare(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };

  const analyzeComparisonData = useMemo(() => {
    const dataByYear: Record<number, any> = {};
    const selectedWbs = waterBalances.filter(wb => wb.id === analyzeBalanceId);

    let globalYears = new Set<number>();

    selectedWbs.forEach(wb => {
      const bId = wb.id;
      const wbDemands = demands.filter(s => isSameWb(s.waterBalanceId, bId));
      const baseDemand = wbDemands[0];

      if (!baseDemand) return;

      const years = Array.from<number>(new Set<number>(baseDemand.entries.map(e => e.year))).sort((a: number, b: number) => a - b);
      years.forEach(y => globalYears.add(y));
      
      const mods = baseDemand.modifiers;
      baseDemand.entries.forEach(entry => {
        if (!dataByYear[entry.year]) dataByYear[entry.year] = { year: entry.year };
        const pop = entry.population * (1 + mods.population / 100);
        const cov = mods.coverage !== null ? mods.coverage / 100 : entry.coverage;
        const cons = entry.perCapitaConsumption * (1 + mods.perCapitaConsumption / 100);
        const loss = mods.losses !== null ? mods.losses / 100 : entry.losses;
        const dem = calculateDemand(pop, cov, cons, loss);
        dataByYear[entry.year][`Demanda - ${wb.description}`] = (dataByYear[entry.year][`Demanda - ${wb.description}`] || 0) + dem;
      });
    });

    const sortedYears = Array.from(globalYears).sort((a: number, b: number) => a - b);
    const finalData = sortedYears.map(year => dataByYear[year] || { year });
    
    // Add increment loop
    selectedWbs.forEach(wb => {
      const demKey = `Demanda - ${wb.description}`;
      const incKey = `Incremento - ${wb.description}`;
      let lastVal: null | number = null;
      for(let i = 0; i < finalData.length; i++) {
        const current = finalData[i][demKey];
        if (current !== undefined) {
          if (lastVal !== null) {
            finalData[i][incKey] = current - lastVal;
          } else {
            finalData[i][incKey] = 0;
          }
          lastVal = current;
        }
      }
    });

    return finalData;
  }, [analyzeBalanceId, waterBalances, demands]);

  const analyzeBalanceAnalysisData = useMemo(() => {
    const dataByYear: Record<number, any> = {};
    const selectedWbs = waterBalances.filter(wb => wb.id === analyzeBalanceId);

    let globalYears = new Set<number>();

    selectedWbs.forEach(wb => {
      const bId = wb.id;
      
      const wbDemands = demands.filter(s => isSameWb(s.waterBalanceId, bId));
      const baseDemand = wbDemands[0];

      if (!baseDemand) return;

      const years = Array.from<number>(new Set<number>(baseDemand.entries.map(e => e.year))).sort((a: number, b: number) => a - b);
      years.forEach(y => globalYears.add(y));

      const wbSystems = systems.filter(s => isSameWb(s.waterBalanceId, bId) && (analyzeSystemIds.length === 0 || analyzeSystemIds.includes(s.id)));
      const filteredSystemIds = wbSystems.map(s => s.id);
      
      const wbSources = supplySources.filter(s => isSameWb(s.waterBalanceId, bId) && filteredSystemIds.includes(s.systemId));
      const wbAdjs = operationalAdjustments.filter(a => isSameWb(a.waterBalanceId, bId) && filteredSystemIds.includes(a.systemId));
      const relevantRegions = regions.filter(r => isSameWb(r.waterBalanceId, bId) && filteredSystemIds.includes(r.systemId)).map(r => r.id);

      years.forEach(year => {
        if (!dataByYear[year]) dataByYear[year] = { year };
        
        let totalDem = 0;
        let totalPopAtendida = 0;
        let totalLosses = 0;
        let totalCons = 0;
        let count = 0;
        const mods = baseDemand.modifiers;
        baseDemand.entries.filter(e => e.year === year && relevantRegions.includes(e.regionId)).forEach(entry => {
          const pop = entry.population * (1 + mods.population / 100);
          const cov = mods.coverage !== null ? mods.coverage / 100 : entry.coverage;
          const cons = entry.perCapitaConsumption * (1 + mods.perCapitaConsumption / 100);
          const loss = mods.losses !== null ? mods.losses / 100 : entry.losses;
          totalDem += calculateDemand(pop, cov, cons, loss);
          totalPopAtendida += pop * cov;
          totalLosses += loss * 100;
          totalCons += cons;
          count++;
        });

        const avgLosses = count > 0 ? totalLosses / count : 0;
        const avgCons = count > 0 ? totalCons / count : 0;

        let totalSupply = 0;
        wbSystems.forEach(sys => {
            const initialSupply = wbSources.filter(s => s.systemId === sys.id).reduce((acc, curr) => acc + curr.operationalFlow, 0);
            let currentSupply = initialSupply;
            const sysAdjs = wbAdjs.filter(a => a.systemId === sys.id);
            sysAdjs.forEach(adj => {
                if (year >= adj.startYear && year <= adj.endYear) {
                    if (adj.type === "Aumento da vazão" || adj.type === "Transferência") currentSupply += adj.flowValue;
                    else if (adj.type === "Redução da vazão") currentSupply -= adj.flowValue;
                }
            });
            totalSupply += Math.max(0, currentSupply);
        });

        const saldoLps = totalSupply - totalDem;
        const saldoHabitantes = totalDem > 0 ? saldoLps * (totalPopAtendida / totalDem) : 0;

        dataByYear[year][`Demanda - ${wb.description}`] = totalDem;
        dataByYear[year][`Demanda (habitantes) - ${wb.description}`] = totalPopAtendida;
        dataByYear[year][`Oferta - ${wb.description}`] = totalSupply;
        dataByYear[year][`Saldo - ${wb.description}`] = saldoLps;
        dataByYear[year][`Saldo (habitantes) - ${wb.description}`] = saldoHabitantes;
        dataByYear[year][`IAD - ${wb.description}`] = totalDem > 0 ? ((totalSupply / totalDem) - 1) * 100 : 0;
      });
    });

    return Array.from(globalYears).sort((a: number, b: number) => a - b).map(year => dataByYear[year] || { year });
  }, [analyzeBalanceId, waterBalances, demands, systems, supplySources, operationalAdjustments, analyzeSystemIds, regions]);

  const analyzeBalanceAvailableYears = useMemo(() => {
    if (!analyzeBalanceId) return [];
    const bId = analyzeBalanceId;
    const wbDemands = demands.filter(s => isSameWb(s.waterBalanceId, bId));
    const baseDemand = wbDemands[0];
    if (!baseDemand) return [];
    return Array.from<number>(new Set<number>(baseDemand.entries.map(e => e.year))).sort((a, b) => a - b);
  }, [analyzeBalanceId, demands]);

  useEffect(() => {
    if (analyzeBalanceAvailableYears.length > 0 && (!analyzeBalanceYear || !analyzeBalanceAvailableYears.includes(analyzeBalanceYear))) {
      const currentYear = new Date().getFullYear();
      if (analyzeBalanceAvailableYears.includes(currentYear)) {
        setAnalyzeBalanceYear(currentYear);
      } else {
        setAnalyzeBalanceYear(analyzeBalanceAvailableYears[analyzeBalanceAvailableYears.length - 1]);
      }
    }
  }, [analyzeBalanceAvailableYears, analyzeBalanceYear]);

  const analyzeBalanceSystemSaldoDataAllYears = useMemo(() => {
    if (!analyzeBalanceId) return {};

    const bId = analyzeBalanceId;
    const wbDemands = demands.filter(s => isSameWb(s.waterBalanceId, bId));
    const baseDemand = wbDemands[0];
    if (!baseDemand) return {};

    const wbSystems = systems.filter(s => isSameWb(s.waterBalanceId, bId) && (analyzeSystemIds.length === 0 || analyzeSystemIds.includes(s.id)));

    const result: Record<number, any[]> = {};

    analyzeBalanceAvailableYears.forEach(year => {
      const yearResults = wbSystems.map(sys => {
        let totalDem = 0;
        let totalDemHab = 0;
        let totalLosses = 0;
        let totalCons = 0;
        let count = 0;
        const relevantRegions = regions.filter(r => isSameWb(r.waterBalanceId, bId) && r.systemId === sys.id).map(r => r.id);
        
        const mods = baseDemand.modifiers;
        baseDemand.entries.filter(e => e.year === year && relevantRegions.includes(e.regionId)).forEach(entry => {
          const pop = entry.population * (1 + mods.population / 100);
          const cov = mods.coverage !== null ? mods.coverage / 100 : entry.coverage;
          const cons = entry.perCapitaConsumption * (1 + mods.perCapitaConsumption / 100);
          const loss = mods.losses !== null ? mods.losses / 100 : entry.losses;
          totalDem += calculateDemand(pop, cov, cons, loss);
          totalDemHab += pop * cov;
          totalLosses += loss;
          totalCons += cons;
          count++;
        });

        const avgLosses = count > 0 ? totalLosses / count : 0;
        const avgCons = count > 0 ? totalCons / count : 0;

        let totalSupply = 0;
        const sysSources = supplySources.filter(s => isSameWb(s.waterBalanceId, bId) && s.systemId === sys.id);
        const sysAdjs = operationalAdjustments.filter(a => isSameWb(a.waterBalanceId, bId) && a.systemId === sys.id);

        const initialSupply = sysSources.reduce((acc, curr) => acc + curr.operationalFlow, 0);
        let currentSupply = initialSupply;
        const activeAdjs: any[] = [];
        sysAdjs.forEach(adj => {
            if (year >= adj.startYear && year <= adj.endYear) {
                if (adj.type === "Aumento da vazão" || adj.type === "Transferência") currentSupply += adj.flowValue;
                else if (adj.type === "Redução da vazão") currentSupply -= adj.flowValue;
                
                let destName = undefined;
                let destId = undefined;
                if (adj.type === "Transferência" && adj.flowValue < 0 && adj.linkedAdjustmentId) {
                  const linkedAdj = operationalAdjustments.find(a => a.id === adj.linkedAdjustmentId);
                  if (linkedAdj) {
                    const destSys = systems.find(s => s.id === linkedAdj.systemId);
                    if (destSys) {
                      destName = destSys.name;
                      destId = destSys.id;
                    }
                  }
                }
                
                activeAdjs.push({ ...adj, destSystemName: destName, destSystemId: destId });
            }
        });
        totalSupply += Math.max(0, currentSupply);

        const saldo = totalSupply - totalDem;
        const saldoHabitantes = totalDem > 0 ? saldo * (totalDemHab / totalDem) : 0;
        const iad = totalDem > 0 ? ((totalSupply / totalDem) - 1) * 100 : 0;

        return {
          systemName: sys.name,
          systemId: sys.id,
          oferta: totalSupply,
          demanda: totalDem,
          demandaHabitantes: totalDemHab,
          saldo: saldo,
          saldoHabitantes: saldoHabitantes,
          iad: iad,
          adjustments: activeAdjs
        };
      });

      result[year] = yearResults.sort((a, b) => b.saldo - a.saldo);
    });
    
    return result;
  }, [analyzeBalanceId, analyzeBalanceAvailableYears, demands, systems, regions, supplySources, operationalAdjustments, analyzeSystemIds]);

  const analyzeBalanceSystemSaldoData = useMemo(() => {
    if (!analyzeBalanceYear) return [];
    return analyzeBalanceSystemSaldoDataAllYears[analyzeBalanceYear] || [];
  }, [analyzeBalanceYear, analyzeBalanceSystemSaldoDataAllYears]);

  /**
   * Calculates the evolution of water supply over time.
   * Time Complexity: O(Y * S + Adj) instead of O(Y * S * Adj) because of pre-computation
   * Space Complexity: O(Y * S) to store the supply map
   */
  const analyzeSupplyData = useMemo(() => {
    const activeWb = waterBalances.find(wb => wb.id === analyzeBalanceId);
    if (!activeWb) return { evolution: [], overview: null, systemIncrement: [], systemDistributionStart: [], systemDistributionEnd: [] };

    const bId = activeWb.id;
    const wbDemands = demands.filter(s => isSameWb(s.waterBalanceId, bId));
    const baseDemand = wbDemands[0];
    if (!baseDemand) return { evolution: [], overview: null, systemIncrement: [], systemDistributionStart: [], systemDistributionEnd: [] };
    const years = Array.from<number>(new Set<number>(baseDemand.entries.map(e => e.year))).sort((a: number, b: number) => a - b);
    if (years.length < 2) return { evolution: [], overview: null, systemIncrement: [], systemDistributionStart: [], systemDistributionEnd: [] };
    
    // We get systems based on analyzeSystemIds
    const wbSystems = systems.filter(s => isSameWb(s.waterBalanceId, bId) && (analyzeSystemIds.length === 0 || analyzeSystemIds.includes(s.id)));
    const filteredSystemIds = wbSystems.map(s => s.id);

    const wbSources = supplySources.filter(s => isSameWb(s.waterBalanceId, bId) && filteredSystemIds.includes(s.systemId));
    const wbAdjs = operationalAdjustments.filter(a => isSameWb(a.waterBalanceId, bId) && filteredSystemIds.includes(a.systemId));

    const evolution: Array<any> = [];
    const systemSupplyMap: Record<number, Record<string, number>> = {};
    const totalGrantedFlow = wbSources.reduce((acc, curr) => acc + curr.grantedFlow, 0);
    
    const startYear = years[0];
    const endYear = years[years.length - 1];

    let startSupplyTotal = 0;
    
    // Pre-calculate initial supply and adjustments per system to improve O(Y*S*A) -> O(S + Y*S*A(reduced))
    const sysDataMap = new Map<string, { initialSupply: number, adjs: typeof wbAdjs }>();
    wbSystems.forEach(sys => {
      const initialSupply = wbSources.filter(s => s.systemId === sys.id).reduce((acc, curr) => acc + curr.operationalFlow, 0);
      const sysAdjs = wbAdjs.filter(a => a.systemId === sys.id);
      sysDataMap.set(sys.id, { initialSupply, adjs: sysAdjs });
    });
    
    years.forEach(year => {
      let totalSupply = 0;
      if (!systemSupplyMap[year]) systemSupplyMap[year] = {};
      
      wbSystems.forEach(sys => {
        const sysData = sysDataMap.get(sys.id);
        if (!sysData) return;
        
        let currentSupply = sysData.initialSupply;
        sysData.adjs.forEach(adj => {
          if (year >= adj.startYear && year <= adj.endYear) {
            if (adj.type === "Aumento da vazão" || adj.type === "Transferência") currentSupply += adj.flowValue;
            else if (adj.type === "Redução da vazão") currentSupply -= adj.flowValue;
          }
        });
        const finalSysSupply = Math.max(0, currentSupply);
        totalSupply += finalSysSupply;
        systemSupplyMap[year][sys.id] = finalSysSupply;
      });

      if (year === startYear) {
        startSupplyTotal = totalSupply;
      }
      
      evolution.push({
        year,
        "Q Outorgada": totalGrantedFlow,
        "Oferta": totalSupply,
        "Incremento de Oferta": totalSupply - startSupplyTotal
      });
    });

    const endSupplyTotal = evolution[evolution.length - 1]["Oferta"];
    const increment = endSupplyTotal - startSupplyTotal;
    const incrementPercentage = startSupplyTotal > 0 ? (increment / startSupplyTotal) * 100 : 0;

    const overview = {
      startYear,
      endYear,
      startSupply: startSupplyTotal,
      endSupply: endSupplyTotal,
      increment,
      incrementPercentage
    };

    const systemIncrement = wbSystems.map(sys => {
      const sSupply = systemSupplyMap[startYear]?.[sys.id] || 0;
      const eSupply = systemSupplyMap[endYear]?.[sys.id] || 0;
      return {
        systemName: sys.name,
        increment: eSupply - sSupply
      };
    }).sort((a: any, b: any) => b.increment - a.increment);

    const systemDistributionStart = wbSystems.map(sys => {
      const sup = systemSupplyMap[startYear]?.[sys.id] || 0;
      return {
        systemName: sys.name,
        supply: sup,
        percentage: startSupplyTotal > 0 ? (sup / startSupplyTotal) * 100 : 0
      };
    }).sort((a: any, b: any) => b.supply - a.supply);

    const systemDistributionEnd = wbSystems.map(sys => {
      const sup = systemSupplyMap[endYear]?.[sys.id] || 0;
      return {
        systemName: sys.name,
        supply: sup,
        percentage: endSupplyTotal > 0 ? (sup / endSupplyTotal) * 100 : 0
      };
    }).sort((a: any, b: any) => b.supply - a.supply);

    return { evolution, overview, systemIncrement, systemDistributionStart, systemDistributionEnd };
  }, [analyzeBalanceId, analyzeSystemIds, waterBalances, demands, systems, supplySources, operationalAdjustments]);

  const [analyzedBalanceIds, setAnalyzedBalanceIds] = useState<string[]>([]);
  useEffect(() => {
    if (selectedWaterBalanceId && !analyzedBalanceIds.includes(selectedWaterBalanceId)) {
      setAnalyzedBalanceIds((prev) => Array.from<number>(new Set<number>([...prev, selectedWaterBalanceId])));
    }
  }, [selectedWaterBalanceId]);

  const comparisonData = useMemo(() => {
    const dataByYear: Record<number, any> = {};
    const selectedWbs = waterBalances.filter(wb => analyzedBalanceIds.includes(wb.id));

    let globalYears = new Set<number>();

    selectedWbs.forEach(wb => {
      const bId = wb.id;
      const wbDemands = demands.filter(s => isSameWb(s.waterBalanceId, bId));
      const baseDemand = wbDemands[0];

      if (!baseDemand) return;

      const years = Array.from<number>(new Set<number>(baseDemand.entries.map(e => e.year))).sort((a: number, b: number) => a - b);
      years.forEach(y => globalYears.add(y));
      
      const mods = baseDemand.modifiers;
      baseDemand.entries.forEach(entry => {
        if (!dataByYear[entry.year]) dataByYear[entry.year] = { year: entry.year };
        const pop = entry.population * (1 + mods.population / 100);
        const cov = mods.coverage !== null ? mods.coverage / 100 : entry.coverage;
        const cons = entry.perCapitaConsumption * (1 + mods.perCapitaConsumption / 100);
        const loss = mods.losses !== null ? mods.losses / 100 : entry.losses;
        const dem = calculateDemand(pop, cov, cons, loss);
        dataByYear[entry.year][`Demanda - ${wb.description}`] = (dataByYear[entry.year][`Demanda - ${wb.description}`] || 0) + dem;
      });
    });

    return Array.from(globalYears).sort((a: number, b: number) => a - b).map(year => dataByYear[year] || { year });
  }, [analyzedBalanceIds, waterBalances, demands]);

  const analyzeDemandResults = useMemo(() => {
    if (!analyzeBalanceId) return [];
    const bId = analyzeBalanceId;
    const wbDemands = demands.filter(s => isSameWb(s.waterBalanceId, bId));
    const baseDemand = wbDemands[0];
    if (!baseDemand) return [];
    
    let wbRegions = regions.filter(r => isSameWb(r.waterBalanceId, bId));
    if (analyzeSystemIds.length > 0) {
      wbRegions = wbRegions.filter(r => analyzeSystemIds.includes(r.systemId));
    }
    
    const mods = baseDemand.modifiers;
    return baseDemand.entries
      .filter((entry) => !hiddenYears.includes(entry.year))
      .map((entry) => {
        const region = wbRegions.find((r) => r.id === entry.regionId);
        if (!region) return null;

        const systemId = region.systemId;
        const population = entry.population * (1 + mods.population / 100);
        const coverage = mods.coverage !== null ? mods.coverage / 100 : entry.coverage;
        const perCapitaConsumption = entry.perCapitaConsumption * (1 + mods.perCapitaConsumption / 100);
        const losses = mods.losses !== null ? mods.losses / 100 : entry.losses;
        return {
          ...entry,
          systemId,
          regionName: region.name,
          population,
          coverage,
          perCapitaConsumption,
          losses,
          projectedDemand: calculateDemand(population, coverage, perCapitaConsumption, losses),
        };
      }).filter(x => x !== null) as any[];
  }, [analyzeBalanceId, analyzeSystemIds, demands, regions, hiddenYears]);

  const analyzeActiveSystems = useMemo(() => {
    const bId = analyzeBalanceId;
    let wbSystems = systems.filter(s => isSameWb(s.waterBalanceId, bId));
    if (analyzeSystemIds.length > 0) {
      wbSystems = wbSystems.filter(s => analyzeSystemIds.includes(s.id));
    }
    return wbSystems;
  }, [systems, analyzeBalanceId, analyzeSystemIds]);

  const analyzeActiveRegions = useMemo(() => {
    const bId = analyzeBalanceId;
    let wbRegions = regions.filter(r => isSameWb(r.waterBalanceId, bId));
    if (analyzeSystemIds.length > 0) {
      wbRegions = wbRegions.filter(r => analyzeSystemIds.includes(r.systemId));
    }
    return wbRegions;
  }, [regions, analyzeBalanceId, analyzeSystemIds]);

  const overviewMetrics = useMemo(() => {
    const years = (
      Array.from<number>(new Set<number>(analyzeDemandResults.map((r) => r.year))) as number[]
    ).sort((a: number, b: number) => a - b);
    if (years.length < 2) return null;

    const startYear = years[0];
    const endYear = years[years.length - 1];

    let startPop = 0;
    let endPop = 0;
    let startDemand = 0;
    let endDemand = 0;
    
    let startConsSum = 0;
    let endConsSum = 0;
    let startLossSum = 0;
    let endLossSum = 0;
    
    let startCount = 0;
    let endCount = 0;

    analyzeDemandResults.forEach((r) => {
      if (r.year === startYear) {
        startPop += r.population;
        startDemand += r.projectedDemand;
        startConsSum += r.perCapitaConsumption;
        startLossSum += r.losses;
        startCount++;
      }
      if (r.year === endYear) {
        endPop += r.population;
        endDemand += r.projectedDemand;
        endConsSum += r.perCapitaConsumption;
        endLossSum += r.losses;
        endCount++;
      }
    });

    const startAvgCons = startCount > 0 ? startConsSum / startCount : 0;
    const endAvgCons = endCount > 0 ? endConsSum / endCount : 0;
    
    const startAvgLoss = startCount > 0 ? startLossSum / startCount : 0;
    const endAvgLoss = endCount > 0 ? endLossSum / endCount : 0;

    return {
      startYear,
      endYear,
      startPop,
      endPop,
      startDemand,
      endDemand,
      popIncrement: endPop - startPop,
      popIncrementPercent: startPop > 0 ? ((endPop - startPop) / startPop) * 100 : 0,
      demIncrement: endDemand - startDemand,
      demIncrementPercent: startDemand > 0 ? ((endDemand - startDemand) / startDemand) * 100 : 0,
      startAvgCons,
      endAvgCons,
      consIncrement: endAvgCons - startAvgCons,
      consIncrementPercent: startAvgCons > 0 ? ((endAvgCons - startAvgCons) / startAvgCons) * 100 : 0,
      startAvgLoss: startAvgLoss * 100,
      endAvgLoss: endAvgLoss * 100,
      lossIncrementPP: (endAvgLoss - startAvgLoss) * 100,
    };
  }, [analyzeDemandResults]);

  const populationIncrementData = useMemo(() => {
    const years = (
      Array.from<number>(new Set<number>(analyzeDemandResults.map((r) => r.year))) as number[]
    ).sort((a: number, b: number) => a - b);

    if (years.length < 2) return [];

    const startYear = years[0];
    const endYear = years[years.length - 1];

    const increments = analyzeActiveRegions.map((region) => {
      const startEntry = analyzeDemandResults.find((e) => e.regionId === region.id && e.year === startYear);
      const endEntry = analyzeDemandResults.find((e) => e.regionId === region.id && e.year === endYear);

      const startPop = startEntry ? startEntry.population : 0;
      const endPop = endEntry ? endEntry.population : 0;

      const increment = endPop - startPop;
      const incrementPercent = startPop > 0 ? (increment / startPop) * 100 : 0;

      return {
        regionName: region.name.replace(/^RA \d+ - /, ""),
        fullName: region.name,
        startYear,
        endYear,
        startPop,
        endPop,
        increment,
        incrementPercent,
      };
    });

    return increments.sort((a, b) => b.increment - a.increment);
  }, [analyzeDemandResults, analyzeActiveRegions]);

  const systemPopulationIncrementData = useMemo(() => {
    const years = (
      Array.from<number>(new Set<number>(analyzeDemandResults.map((e) => e.year))) as number[]
    ).sort((a: number, b: number) => a - b);

    if (years.length < 2) return [];

    const startYear = years[0];
    const endYear = years[years.length - 1];

    const increments = analyzeActiveSystems.map((system) => {
      const systemRegions = analyzeActiveRegions.filter((r) => r.systemId === system.id);

      let startPop = 0;
      let endPop = 0;

      systemRegions.forEach((region) => {
        const startEntry = analyzeDemandResults.find((e) => e.regionId === region.id && e.year === startYear);
        const endEntry = analyzeDemandResults.find((e) => e.regionId === region.id && e.year === endYear);

        startPop += startEntry ? startEntry.population : 0;
        endPop += endEntry ? endEntry.population : 0;
      });

      const increment = endPop - startPop;
      const incrementPercent = startPop > 0 ? (increment / startPop) * 100 : 0;

      return {
        systemName: system.name,
        fullName: system.name,
        startYear,
        endYear,
        startPop,
        endPop,
        increment,
        incrementPercent,
      };
    });

    return increments.sort((a, b) => b.increment - a.increment);
  }, [analyzeDemandResults, analyzeActiveSystems, analyzeActiveRegions]);

  const demandIncrementData = useMemo(() => {
    const years = (
      Array.from<number>(new Set<number>(analyzeDemandResults.map((r) => r.year))) as number[]
    ).sort((a: number, b: number) => a - b);

    if (years.length < 2) return [];

    const startYear = years[0];
    const endYear = years[years.length - 1];

    const increments = analyzeActiveRegions.map((region) => {
      const startEntry = analyzeDemandResults.find((r) => r.regionId === region.id && r.year === startYear);
      const endEntry = analyzeDemandResults.find((r) => r.regionId === region.id && r.year === endYear);

      const startDemand = startEntry ? startEntry.projectedDemand : 0;
      const endDemand = endEntry ? endEntry.projectedDemand : 0;

      const increment = endDemand - startDemand;
      const incrementPercent = startDemand > 0 ? (increment / startDemand) * 100 : 0;

      return {
        regionName: region.name.replace(/^RA \d+ - /, ""),
        fullName: region.name,
        startYear,
        endYear,
        startDemand,
        endDemand,
        increment,
        incrementPercent,
      };
    });

    return increments.sort((a, b) => b.increment - a.increment);
  }, [analyzeDemandResults, analyzeActiveRegions]);

  const balanceAnalysisData = useMemo(() => {
    const dataByYear: Record<number, any> = {};
    const selectedWbs = waterBalances.filter(wb => analyzedBalanceIds.includes(wb.id));

    let globalYears = new Set<number>();

    selectedWbs.forEach(wb => {
      const bId = wb.id;
      const wbDemands = demands.filter(s => isSameWb(s.waterBalanceId, bId));
      const baseDemand = wbDemands[0];
      const wbSystems = systems.filter(s => isSameWb(s.waterBalanceId, bId));
      const filteredSystemIds = wbSystems.map(s => s.id);
      
      const wbSources = supplySources.filter(s => isSameWb(s.waterBalanceId, bId) && filteredSystemIds.includes(s.systemId));
      const wbAdjs = operationalAdjustments.filter(a => isSameWb(a.waterBalanceId, bId) && filteredSystemIds.includes(a.systemId));
      const relevantRegions = regions.filter(r => isSameWb(r.waterBalanceId, bId) && filteredSystemIds.includes(r.systemId)).map(r => r.id);

      if (!baseDemand) return;

      const years = Array.from<number>(new Set<number>(baseDemand.entries.map(e => e.year))).sort((a: number, b: number) => a - b);
      years.forEach(y => globalYears.add(y));
      
      years.forEach(year => {
        if (!dataByYear[year]) dataByYear[year] = { year };
        
        let totalDem = 0;
        let totalPopAtendida = 0;
        let totalLosses = 0;
        let totalCons = 0;
        let count = 0;
        
        const mods = baseDemand.modifiers;
        baseDemand.entries.filter(e => e.year === year && relevantRegions.includes(e.regionId)).forEach(entry => {
          const pop = entry.population * (1 + mods.population / 100);
          const cov = mods.coverage !== null ? mods.coverage / 100 : entry.coverage;
          const cons = entry.perCapitaConsumption * (1 + mods.perCapitaConsumption / 100);
          const loss = mods.losses !== null ? mods.losses / 100 : entry.losses;
          totalDem += calculateDemand(pop, cov, cons, loss);
          totalPopAtendida += pop * cov;
          totalLosses += loss * 100;
          totalCons += cons;
          count++;
        });

        const avgLosses = count > 0 ? totalLosses / count : 0;
        const avgCons = count > 0 ? totalCons / count : 0;

        let totalSupply = 0;
        wbSystems.forEach(sys => {
            const initialSupply = wbSources.filter(s => s.systemId === sys.id).reduce((acc, curr) => acc + curr.operationalFlow, 0);
            let currentSupply = initialSupply;
            const sysAdjs = wbAdjs.filter(a => a.systemId === sys.id);
            sysAdjs.forEach(adj => {
                if (year >= adj.startYear && year <= adj.endYear) {
                    if (adj.type === "Aumento da vazão" || adj.type === "Transferência") currentSupply += adj.flowValue;
                    else if (adj.type === "Redução da vazão") currentSupply -= adj.flowValue;
                }
            });
            totalSupply += Math.max(0, currentSupply);
        });

        const saldoLps = totalSupply - totalDem;
        const saldoHabitantes = totalDem > 0 ? saldoLps * (totalPopAtendida / totalDem) : 0;

        dataByYear[year][`Demanda - ${wb.description}`] = totalDem;
        dataByYear[year][`Demanda (habitantes) - ${wb.description}`] = totalPopAtendida;
        dataByYear[year][`Oferta - ${wb.description}`] = totalSupply;
        dataByYear[year][`Saldo - ${wb.description}`] = saldoLps;
        dataByYear[year][`Saldo (habitantes) - ${wb.description}`] = saldoHabitantes;
        dataByYear[year][`IAD - ${wb.description}`] = totalDem > 0 ? ((totalSupply / totalDem) - 1) * 100 : 0;
      });
    });

    return Array.from(globalYears).sort((a: number, b: number) => a - b).map(year => dataByYear[year] || { year });
  }, [analyzedBalanceIds, waterBalances, demands, systems, supplySources, operationalAdjustments, regions]);

  const systemDemandIncrementData = useMemo(() => {
    const years = (
      Array.from<number>(new Set<number>(analyzeDemandResults.map((r) => r.year))) as number[]
    ).sort((a: number, b: number) => a - b);

    if (years.length < 2) return [];

    const startYear = years[0];
    const endYear = years[years.length - 1];

    const increments = analyzeActiveSystems.map((system) => {
      let startDemand = 0;
      let endDemand = 0;

      const systemResultsStart = analyzeDemandResults.filter(
        (r) => r.systemId === system.id && r.year === startYear,
      );
      const systemResultsEnd = analyzeDemandResults.filter(
        (r) => r.systemId === system.id && r.year === endYear,
      );

      systemResultsStart.forEach((r) => (startDemand += r.projectedDemand));
      systemResultsEnd.forEach((r) => (endDemand += r.projectedDemand));

      const increment = endDemand - startDemand;
      const incrementPercent = startDemand > 0 ? (increment / startDemand) * 100 : 0;

      return {
        systemName: system.name,
        fullName: system.name,
        startYear,
        endYear,
        startDemand,
        endDemand,
        increment,
        incrementPercent,
      };
    });

    return increments.sort((a, b) => b.increment - a.increment);
  }, [analyzeDemandResults, analyzeActiveSystems]);

  const lossesByYearData = useMemo(() => {
    const years = (
      Array.from<number>(new Set<number>(analyzeDemandResults.map((r) => r.year))) as number[]
    ).sort((a: number, b: number) => a - b);

    if (years.length === 0) return [];

    return years.map((year) => {
      const yearResults = analyzeDemandResults.filter((r) => r.year === year);
      const totalLosses = yearResults.reduce((acc, r) => acc + r.losses, 0);
      const avgLosses = yearResults.length > 0 ? (totalLosses / yearResults.length) * 100 : 0;
      
      return {
        year,
        perdasMedia: avgLosses
      };
    });
  }, [analyzeDemandResults]);

  const systemLossesData = useMemo(() => {
    const years = (
      Array.from<number>(new Set<number>(analyzeDemandResults.map((r) => r.year))) as number[]
    ).sort((a: number, b: number) => a - b);

    if (years.length < 2) return [];

    const startYear = years[0];
    const endYear = years[years.length - 1];

    return analyzeActiveSystems.map((system) => {
      const startResults = analyzeDemandResults.filter(r => r.year === startYear && r.systemId === system.id);
      const endResults = analyzeDemandResults.filter(r => r.year === endYear && r.systemId === system.id);
      
      const startAvgLoss = startResults.length > 0 ? (startResults.reduce((acc, r) => acc + r.losses, 0) / startResults.length) * 100 : 0;
      const endAvgLoss = endResults.length > 0 ? (endResults.reduce((acc, r) => acc + r.losses, 0) / endResults.length) * 100 : 0;
      
      return {
        systemName: system.name,
        startLoss: startAvgLoss,
        endLoss: endAvgLoss
      }
    });
  }, [analyzeDemandResults, analyzeActiveSystems]);


  // Handlers
  const handleAddDemand = () => {
    const maxId = demands.length > 0 ? Math.max(...demands.map((d: any) => Number(d.id) || 0)) : 0;
    const newId = maxId + 1;
    const baseDemand = currentDemand || {
      id: newId,
      name: "Demanda 1",
      modifiers: { population: 0, coverage: null, perCapitaConsumption: 0, losses: null },
      entries: activeRegions.map(r => ({
        regionId: r.id,
        year: new Date().getFullYear(),
        population: 0,
        coverage: 0,
        perCapitaConsumption: 0,
        losses: 0,
        projectedDemand: 0
      }))
    };
    
    const newDemand: Demand = {
      ...baseDemand,
      id: newId,
      name: `Demanda ${activeDemands.length + 1}`,
      waterBalanceId: Number(selectedWaterBalanceId)
    };
    setDemands([...demands, newDemand]);
    setSelectedDemandId(newId);
  };

  const handleUpdateEntry = (
    regionId: string,
    year: number,
    field: keyof DemandEntry,
    value: number,
  ) => {
    if (!currentDemand) return;
    const targetId = currentDemand.id;
    const updatedDemands = demands.map((s) => {
      if (s.id === targetId) {
        const newEntries = s.entries.map((e) =>
          e.regionId === regionId && e.year === year
            ? { ...e, [field]: value }
            : e,
        );
        return { ...s, entries: newEntries };
      }
      return s;
    });
    setDemands(updatedDemands);
  };

  const handleUpdateModifier = (
    field: keyof Demand["modifiers"],
    value: number | null,
  ) => {
    if (!currentDemand) return;
    const targetId = currentDemand.id;
    const updatedDemands = demands.map((s) => {
      if (s.id === targetId) {
        return {
          ...s,
          modifiers: { ...s.modifiers, [field]: value },
        };
      }
      return s;
    });
    setDemands(updatedDemands);
  };

  const toggleCompare = (id: string) => {
    if (compareDemandIds.includes(id)) {
      setCompareDemandIds(compareDemandIds.filter((cid) => cid !== id));
    } else {
      setCompareDemandIds([...compareDemandIds, id]);
    }
  };

  const handleDownloadDemanda = () => {
    const baseDemand = activeDemands[0];
    const header = "Cod_RA;Descricao_RA;Ano;Populacao;Consumo Per Capita;Cobertura;Perdas\n";
    let csvContent = header;

    if (!baseDemand || !baseDemand.entries || baseDemand.entries.length === 0) {
      // Fallback to template if no data
      csvContent += "RA_01;RA 01 - Brasília;2017;221848;254;99;32,00%\n";
    } else {
      // Sort entries by RA then year
      const sortedEntries = [...baseDemand.entries].sort((a, b) => {
        if (a.regionId === b.regionId) return a.year - b.year;
        return a.regionId.localeCompare(b.regionId);
      });

      sortedEntries.forEach((entry) => {
        const region = activeRegions.find((r) => r.id === entry.regionId);
        const regionName = region ? region.name : "";
        const coverageFormatted = (entry.coverage * 100).toFixed(2).replace(".", ",") + "%";
        const lossesFormatted = (entry.losses * 100).toFixed(2).replace(".", ",") + "%";
        const populationFormatted = entry.population.toFixed(0);
        const consumptionFormatted = entry.perCapitaConsumption.toFixed(0);

        csvContent += `${region ? (region.code || region.id) : entry.regionId};${regionName};${entry.year};${populationFormatted};${consumptionFormatted};${coverageFormatted};${lossesFormatted}\n`;
      });
    }

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "demanda_base.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const [toastMessage, setToastMessage] = useState<{title: string, message: string, type: "success" | "error" | "warning" | "info"} | null>(null);

  const showToast = (title: string, message: string, type: "success" | "error" | "warning" | "info") => {
    setToastMessage({ title, message, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleDownloadSystems = () => {
    const header = "Cod_RA;Descricao_RA;Subsistema;Codigo_Subsistema\n";
    let csvContent = header;

    if (!activeRegions || activeRegions.length === 0) {
      csvContent += "RA_01;RA 01 - Brasília;Torto-Santa Maria-Bananal;S01\n";
    } else {
      const sortedRegions = [...activeRegions].sort((a, b) => a.id.localeCompare(b.id));

      sortedRegions.forEach((region) => {
        const system = activeSystems.find((s) => s.id === region.systemId);
        const systemName = system ? system.name : "-";
        const systemCode = system ? system.code || "" : "";
        
        csvContent += `${region.code || region.id};${region.name};${systemName};${systemCode}\n`;
      });
    }

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "subsistemas_base.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleImportSystemsCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedWaterBalanceId) {
      if (!selectedWaterBalanceId) showToast("Aviso", "Nenhum balanço hídrico selecionado.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        showToast("Aviso", "O arquivo está vazio ou não pôde ser lido.", "warning");
        return;
      }

      const lines = text.split("\n");
      const newSystems: typeof systems = [...systems];
      const newRegions: typeof regions = [...regions];

      let importedCount = 0;

      const validSysIds = newSystems.map(s => Number(s.id)).filter(id => !isNaN(id));
      let maxSysId = validSysIds.length > 0 ? Math.max(...validSysIds) : 0;
      
      const validRegIds = newRegions.map(r => Number(r.id)).filter(id => !isNaN(id));
      let maxRegId = validRegIds.length > 0 ? Math.max(...validRegIds) : 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith(";;")) continue;
        const columns = line.split(";");
        
        if (columns[0] === "Cod_RA" || columns[1] === "Descricao_RA") continue;
        if (columns.length < 3) continue;

        const regionId = columns[0].trim();
        const regionName = columns[1].trim();
        const systemName = columns[2].trim();
        const systemCode = columns.length >= 4 ? columns[3].trim() : "";
        const systemNameClean = systemName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

        // Find or create system
        let systemId = 0;
        let existingSystem = newSystems.find(s => 
          s.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === systemNameClean && 
          (Number(s.waterBalanceId) === Number(selectedWaterBalanceId) || (!s.waterBalanceId && Number(selectedWaterBalanceId) === 2026))
        );
        
        if (existingSystem) {
          systemId = Number(existingSystem.id);
          if (systemCode && !existingSystem.code) {
             existingSystem.code = systemCode;
          }
        } else {
          systemId = ++maxSysId;
          newSystems.push({
            id: systemId,
            name: systemName,
            code: systemCode,
            waterBalanceId: Number(selectedWaterBalanceId)
          });
        }

        // Find or create region
        let existingRegionIndex = newRegions.findIndex(r => 
          (r.code === regionId || String(r.id) === String(regionId)) && 
          (Number(r.waterBalanceId) === Number(selectedWaterBalanceId) || (!r.waterBalanceId && Number(selectedWaterBalanceId) === 2026))
        );
        if (existingRegionIndex >= 0) {
          newRegions[existingRegionIndex] = {
            ...newRegions[existingRegionIndex],
            name: regionName,
            systemId: systemId
          };
        } else {
          const newRegId = ++maxRegId;
          newRegions.push({
            id: newRegId,
            code: regionId,
            name: regionName,
            systemId: systemId,
            waterBalanceId: Number(selectedWaterBalanceId)
          });
        }

        importedCount++;
      }

      if (importedCount > 0) {
        setSystems(newSystems);
        setRegions(newRegions);
        showToast("Sucesso", `Associação de Subsistemas importada com sucesso! ${importedCount} registros processados.`, "success");
      } else {
        showToast("Atenção", "Nenhum dado válido foi encontrado. Verifique o formato do arquivo e se o separador é ponto-e-vírgula (;).", "warning");
      }
    };

    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleDownloadOferta = () => {
    const header = "Sistema;Código;Descrição;Local;Tipo;Vazão outorgada (L/s);Vazão operante (L/s);Vazão indisponível (L/s);Motivo da indisponibilidade\n";
    let csvContent = header;

    if (!supplySources || supplySources.length === 0) {
      csvContent += "Descoberto;CAP-DESC-01;Captação Descoberto Principal;-;Superficial;4500;4500;0;-\n";
    } else {
      const activeSupply = supplySources.filter(s => isSameWb(s.waterBalanceId, selectedWaterBalanceId));
      
      const sortedSources = [...activeSupply].sort((a, b) => {
        if (a.systemId === b.systemId) return a.name.localeCompare(b.name);
        return a.systemId.localeCompare(b.systemId);
      });

      sortedSources.forEach((source) => {
        const system = activeSystems.find((s) => s.id === source.systemId);
        const systemName = system ? system.name : "";
        
        csvContent += `${systemName};${source.code || source.id};${source.name};-;${source.type};${source.grantedFlow};${source.operationalFlow};${source.unavailableFlow};${source.unavailabilityReason || ""}\n`;
      });
    }

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "oferta_base.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleImportSupplyCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedWaterBalanceId) {
      if (!selectedWaterBalanceId) showToast("Aviso", "Nenhum balanço hídrico selecionado.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        showToast("Aviso", "O arquivo está vazio ou não pôde ser lido.", "warning");
        return;
      }

      const lines = text.split("\n");
      const newSupplySources: typeof supplySources = supplySources.filter(s => !isSameWb(s.waterBalanceId, selectedWaterBalanceId));

      let importedCount = 0;

      const maxId = supplySources.reduce((max, s) => {
        const nid = Number(s.id);
        return !isNaN(nid) && nid > max ? nid : max;
      }, 0);
      let nextId = Math.max(maxId, 32) + 1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith(";;;")) continue;
        const columns = line.split(";");
        
        if (columns[0] === "Sistema" || columns[1] === "Código" || columns[1] === "Cdigo") continue;
        if (columns.length < 8) continue;

        const systemName = columns[0].trim();
        const systemNameClean = systemName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        
        // FIND ON activeSystems INSTEAD OF global systems
        const system = activeSystems.find(s => s.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === systemNameClean) ||
                       activeSystems.find(s => s.id === systemName);

        if (!system) continue;

        const codeValue = columns[1].trim();
        const name = columns[2].trim();
        const type = columns[4].trim();
        const grantedFlow = parseFloat(columns[5].trim().replace(",", ".")) || 0;
        const operationalFlow = parseFloat(columns[6].trim().replace(",", ".")) || 0;
        const unavailableFlow = parseFloat(columns[7].trim().replace(",", ".")) || 0;
        const unavailabilityReason = columns[8] ? columns[8].trim() : "";

        const existingIndex = newSupplySources.findIndex(s => (s.code === codeValue || String(s.id) === codeValue) && isSameWb(s.waterBalanceId, selectedWaterBalanceId));

        importedCount++;

        if (existingIndex >= 0) {
           newSupplySources[existingIndex] = {
             ...newSupplySources[existingIndex],
             code: codeValue,
             systemId: system.id,
             name, type, grantedFlow, operationalFlow, unavailableFlow, unavailabilityReason
           };
        } else {
           newSupplySources.push({
             id: nextId++,
             code: codeValue,
             systemId: system.id,
             name,
             type,
             grantedFlow,
             operationalFlow,
             unavailableFlow,
             unavailabilityReason,
             waterBalanceId: Number(selectedWaterBalanceId)
           });
        }
      }

      if (importedCount > 0) {
        setSupplySources(newSupplySources);
        showToast("Sucesso", `Planilha de Oferta importada com sucesso! ${importedCount} fontes de oferta foram importadas.`, "success");
      } else {
        showToast("Atenção", "Nenhum dado de oferta válido foi encontrado. Verifique o formato do arquivo e se o separador é ponto-e-vírgula (;), e se as colunas estão corretas.", "warning");
      }
    };

    reader.readAsText(file, "UTF-8"); // Encoding may be off, but replace() helps
    e.target.value = "";
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedWaterBalanceId) {
      if (!selectedWaterBalanceId) showToast("Aviso", "Nenhum balanço hídrico selecionado.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        showToast("Aviso", "O arquivo está vazio.", "warning");
        return;
      }

      const lines = text.split("\n");
      if (lines.length < 2) {
        showToast("Aviso", "O arquivo não contém dados suficientes. É necessário ter um cabeçalho e pelo menos uma linha de dados.", "warning");
        return;
      }

      const maxId = demands.length > 0 ? Math.max(...demands.map((d: any) => Number(d.id) || 0)) : 0;
      const baseDemand = activeDemands[0] ? { ...activeDemands[0] } : {
        id: maxId + 1,
        name: 'Demanda Base',
        description: 'Projeção inicial com dados carregados via planilha',
        waterBalanceId: Number(selectedWaterBalanceId),
        modifiers: {
          population: 0,
          coverage: null,
          perCapitaConsumption: 0,
          losses: null,
        },
        entries: [],
      };

      const newEntriesMap = new Map<string, typeof baseDemand.entries[0]>();
      let importedCount = 0;

      // Pre-compute region mappings to make lookup O(1)
      const regionById = new Map<string, any>();
      const regionByNameClean = new Map<string, any>();
      activeRegions.forEach((r) => {
        regionById.set(r.id, r);
        regionByNameClean.set(r.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(), r);
      });

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const columns = line.split(";");
        if (columns.length < 7) continue;

        const rawRegionId = columns[0].trim();
        const rawRegionName = columns[1].trim();
        const year = parseInt(columns[2].trim(), 10);
        const population = parseFloat(columns[3].trim().replace(",", ".")) || 0;
        const perCapitaConsumption = parseFloat(columns[4].trim().replace(",", ".")) || 0;

        let coverageStr = columns[5]?.trim().replace("%", "").replace(",", ".") || "0";
        const coverage = (parseFloat(coverageStr) || 0) / 100;

        let lossesStr = columns[6]?.trim().replace("%", "").replace(",", ".") || "0";
        const losses = (parseFloat(lossesStr) || 0) / 100;
        
        // Match activeRegions by pre-computed lookup
        const rawRegionNameClean = rawRegionName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        let matchRegion = regionById.get(rawRegionId) || regionByNameClean.get(rawRegionNameClean);
        
        if (!matchRegion) {
          matchRegion = activeRegions.find(r => r.id.includes(rawRegionId));
        }

        if (!matchRegion) continue;

        if (!isNaN(year)) {
          importedCount++;
          const entryKey = `${matchRegion.id}-${year}`;
          newEntriesMap.set(entryKey, {
            regionId: matchRegion.id,
            year,
            population,
            coverage,
            perCapitaConsumption,
            losses,
          });
        }
      }

      if (importedCount > 0) {
        const updatedDemands = [...demands];
        const globalIndex = updatedDemands.findIndex(s => s.id === baseDemand.id);
        
        baseDemand.entries = Array.from(newEntriesMap.values());

        if (globalIndex >= 0) {
          updatedDemands[globalIndex] = baseDemand;
        } else {
          updatedDemands.unshift(baseDemand);
        }
        
        setDemands(updatedDemands);
        showToast("Sucesso", `Planilha de Demanda importada com sucesso! ${importedCount} registros foram importados ou atualizados.`, "success");
      } else {
        showToast("Atenção", "Nenhum dado de demanda válido foi importado. Verifique se o separador usado é ponto e vírgula (;) e as posições das colunas.", "warning");
      }
    };

    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const renderDemandTable = () => {
    if (!currentDemand) {
      return (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col p-6 items-center justify-center text-slate-500">
          Nenhuma demanda cadastrada para este balanço hídrico.
        </div>
      );
    }
    return (
    <div className="flex flex-col gap-6 w-full">
      <div className="bg-slate-50 rounded-[1.5rem] p-6 border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h4 className="font-black text-sm text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Calculator size={16} className="text-adasa-mid" />
            Modificadores da Demanda
          </h4>
          <RequirePermission moduleId="demands" action="edit">
            <button
              onClick={() => handleSaveModule("demands", { demands })}
              className={cn(
                "flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-xl shadow-sm transition-colors",
                hasPendingChanges ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse" : "bg-adasa-mid text-white hover:bg-adasa-dark"
              )}
              title={hasPendingChanges ? "Existem alterações não salvas" : ""}
            >
              <Save size={14} />
              Salvar Demanda
            </button>
          </RequirePermission>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: "População", field: "population" as const, type: "relative", min: -50, max: 50, suffix: "%" },
              { label: "Atendimento", field: "coverage" as const, type: "absolute", min: 0, max: 100, suffix: "%" },
              { label: "Consumo", field: "perCapitaConsumption" as const, type: "relative", min: -50, max: 50, suffix: "%" },
              { label: "Perdas", field: "losses" as const, type: "absolute", min: 0, max: 50, suffix: "%" }
            ].map((ctrl) => {
              const modValue = currentDemand.modifiers[ctrl.field];
              const isDefault = modValue === (ctrl.type === "absolute" ? null : 0);
              const displayValue = modValue !== null ? modValue : "—";
              return (
                <div key={ctrl.field} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      {ctrl.label}
                      {!isDefault && (
                        <button
                          onClick={() => handleUpdateModifier(ctrl.field, ctrl.type === "absolute" ? null : 0)}
                          className="text-slate-400 hover:text-adasa-mid transition-colors ml-1"
                          title="Resetar valor"
                        >
                          <RotateCcw size={10} />
                        </button>
                      )}
                    </label>
                    <span className={cn(
                      "text-[10px] font-black px-1.5 py-0.5 rounded",
                      isDefault ? "bg-slate-200 text-slate-400" :
                      ctrl.type === "relative" && (modValue as number) > 0 ? "bg-adasa-green/10 text-adasa-green" : "bg-adasa-light/10 text-adasa-light"
                    )}>
                      {ctrl.type === "relative" && !isDefault && (modValue as number) > 0 ? "+" : ""}
                      {displayValue}
                      {!isDefault ? ctrl.suffix : ""}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    step="1"
                    value={modValue !== null ? modValue : ctrl.field === "coverage" ? 99 : ctrl.field === "losses" ? 30 : 0}
                    onChange={(e) => handleUpdateModifier(ctrl.field, parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-adasa-mid"
                  />
                  <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                    <span>{ctrl.min}{ctrl.suffix}</span>
                    <span>{ctrl.max}{ctrl.suffix}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6 px-2">
          <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
            <Database size={18} className="text-adasa-mid" />
            Detalhes da Demanda
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTableLayout("system")}
              className={cn(
                "px-3 py-1 rounded-lg shadow-sm text-[10px] font-black uppercase transition-all",
                tableLayout === "system"
                  ? "bg-white text-adasa-mid"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              Por Subsistema
            </button>
            <button
              onClick={() => setTableLayout("year")}
              className={cn(
                "px-3 py-1 rounded-lg shadow-sm text-[10px] font-black uppercase transition-all",
                tableLayout === "year"
                  ? "bg-white text-adasa-mid"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              Por Ano
            </button>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={handleExpandAll}
              className="px-3 py-1 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:text-adasa-mid transition-all"
              title="Expandir todos os grupos"
            >
              <ChevronDown size={14} className="inline mr-1" />
              Expandir
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-3 py-1 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:text-adasa-mid transition-all"
              title="Recolher todos os grupos"
            >
              <ChevronRight size={14} className="inline mr-1" />
              Recolher
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-separate border-spacing-0 min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 sticky top-0 z-10">
                {tableLayout === "system"
                  ? "Subsistema / Período"
                  : "Subsistema"}
              </th>
              <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right bg-slate-50/50 sticky top-0 z-10">
                População (hab.)
              </th>
              <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right bg-slate-50/50 sticky top-0 z-10">
                Cobertura (%)
              </th>
              <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right bg-slate-50/50 sticky top-0 z-10">
                Consumo (L/hab.dia)
              </th>
              <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right bg-slate-50/50 sticky top-0 z-10">
                Perdas (%)
              </th>
              <th className="px-5 py-2 text-[9px] font-black text-adasa-mid uppercase tracking-widest text-right bg-slate-50/50 sticky top-0 z-10">
                Demanda (L/s)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {tableLayout === "system"
              ? // Grouped by System -> Regions
                activeSystems.map((system) => {
                  const systemResults = results
                    .filter((r) => r.systemId === system.id)
                    .sort((a, b) => a.year - b.year);
                  if (systemResults.length === 0) return null;
                  const isExpanded =
                    expandedGroups[`sys-${system.id}`] !== false;

                  return (
                    <React.Fragment key={system.id}>
                      <tr
                        className="bg-slate-50/50 cursor-pointer hover:bg-slate-100/50 transition-colors"
                        onClick={() => toggleExpand(`sys-${system.id}`)}
                      >
                        <td
                          colSpan={6}
                          className="px-3 py-2 text-[10px] font-black text-adasa-mid border-y border-slate-100 uppercase tracking-widest flex items-center gap-2"
                        >
                          {isExpanded ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                          Subsistema: {system.name}
                        </td>
                      </tr>
                      {isExpanded &&
                        Array.from(
                          new Set(systemResults.map((r) => r.regionId)),
                        )
                          .sort((aId, bId) => {
                            const nameA =
                              systemResults.find((r) => r.regionId === aId)
                                ?.regionName || "";
                            const nameB =
                              systemResults.find((r) => r.regionId === bId)
                                ?.regionName || "";
                            return nameA.localeCompare(nameB, undefined, {
                              numeric: true,
                              sensitivity: "base",
                            });
                          })
                          .map((regionId) => {
                            const regionResults = systemResults
                              .filter((r) => r.regionId === regionId)
                              .sort((a, b) => a.year - b.year);
                            const regionName = regionResults[0].regionName;
                            const isRegionExpanded =
                              expandedGroups[`sys-${system.id}-reg-${regionId}`] !== false;

                            return (
                              <React.Fragment key={`${system.id}-${regionId}`}>
                                <tr
                                  className="bg-slate-50/50 cursor-pointer hover:bg-slate-100 transition-colors"
                                  onClick={() =>
                                    toggleExpand(
                                      `sys-${system.id}-reg-${regionId}`,
                                    )
                                  }
                                >
                                  <td
                                    colSpan={6}
                                    className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 pl-6"
                                  >
                                    {isRegionExpanded ? (
                                      <ChevronDown size={14} />
                                    ) : (
                                      <ChevronRight size={14} />
                                    )}
                                    RA: {regionName}
                                  </td>
                                </tr>
                                {isRegionExpanded &&
                                  regionResults.map((entry) => (
                                    <tr
                                      key={`${entry.regionId}-${entry.year}`}
                                      className="hover:bg-adasa-light/10 transition-colors group"
                                    >
                                      <td className="px-3 py-2">
                                        <p className="font-bold text-slate-400 tracking-tight text-[10px] uppercase pl-12 border-l-2 border-slate-200">
                                          Ano: {entry.year}
                                        </p>
                                      </td>
                                      <td className="px-3 py-1.5">
                                        <div className="flex flex-col items-end">
                                          <input
                                            type="text"
                                            className="w-full text-right bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-600 p-0"
                                            value={formatInteger(
                                              entry.population,
                                            )}
                                            onChange={(e) => {
                                              const num =
                                                parseInt(
                                                  e.target.value.replace(
                                                    /\D/g,
                                                    "",
                                                  ),
                                                ) || 0;
                                              const mod =
                                                1 +
                                                currentDemand.modifiers
                                                  .population /
                                                  100;
                                              handleUpdateEntry(
                                                entry.regionId,
                                                entry.year,
                                                "population",
                                                num / mod,
                                              );
                                            }}
                                          />
                                        </div>
                                      </td>
                                      <td className="px-3 py-1.5">
                                        <input
                                          type="number"
                                          className="w-full text-right bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-600 p-0"
                                          value={(entry.coverage * 100).toFixed(
                                            1,
                                          )}
                                          onChange={(e) => {
                                            const num =
                                              parseFloat(e.target.value) || 0;
                                            handleUpdateEntry(
                                              entry.regionId,
                                              entry.year,
                                              "coverage",
                                              num / 100,
                                            );
                                          }}
                                        />
                                      </td>
                                      <td className="px-3 py-1.5">
                                        <input
                                          type="number"
                                          className="w-full text-right bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-600 p-0"
                                          value={entry.perCapitaConsumption.toFixed(
                                            1,
                                          )}
                                          onChange={(e) => {
                                            const num =
                                              parseFloat(e.target.value) || 0;
                                            const mod =
                                              1 +
                                              currentDemand.modifiers
                                                .perCapitaConsumption /
                                                100;
                                            handleUpdateEntry(
                                              entry.regionId,
                                              entry.year,
                                              "perCapitaConsumption",
                                              num / mod,
                                            );
                                          }}
                                        />
                                      </td>
                                      <td className="px-3 py-1.5">
                                        <input
                                          type="number"
                                          className="w-full text-right bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-600 p-0"
                                          value={(entry.losses * 100).toFixed(
                                            1,
                                          )}
                                          onChange={(e) => {
                                            const num =
                                              parseFloat(e.target.value) || 0;
                                            handleUpdateEntry(
                                              entry.regionId,
                                              entry.year,
                                              "losses",
                                              num / 100,
                                            );
                                          }}
                                        />
                                      </td>
                                      <td className="px-5 py-1.5 text-right">
                                        <span className="font-black text-xs text-adasa-dark tracking-tighter">
                                          {formatNumber(entry.projectedDemand)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                              </React.Fragment>
                            );
                          })}
                    </React.Fragment>
                  );
                })
              : // Grouped by Year
                Array.from<number>(new Set<number>(results.map((r) => r.year)))
                  .sort()
                  .map((year) => {
                    const yearResults = results.filter((r) => r.year === year);
                    const totalPopulation = yearResults.reduce(
                      (sum, r) => sum + r.population,
                      0,
                    );
                    const totalDemand = yearResults.reduce(
                      (sum, r) => sum + r.projectedDemand,
                      0,
                    );

                    return (
                      <React.Fragment key={year}>
                        <tr className="bg-slate-50/50">
                          <td
                            colSpan={6}
                            className="px-3 py-2 text-[11px] font-black text-adasa-mid border-y border-slate-100 uppercase tracking-widest bg-adasa-light/5"
                          >
                            Ano Base: {year}
                          </td>
                        </tr>

                        {activeSystems.map((system) => {
                          const sysResults = yearResults
                            .filter((r) => r.systemId === system.id)
                            .sort((a, b) =>
                              a.regionName.localeCompare(
                                b.regionName,
                                undefined,
                                {
                                  numeric: true,
                                  sensitivity: "base",
                                },
                              ),
                            );
                          if (sysResults.length === 0) return null;

                          const sysPop = sysResults.reduce(
                            (sum, r) => sum + r.population,
                            0,
                          );
                          const sysDemand = sysResults.reduce(
                            (sum, r) => sum + r.projectedDemand,
                            0,
                          );
                          const isExpanded =
                            expandedGroups[`year-${year}-sys-${system.id}`] !== false;

                          return (
                            <React.Fragment key={`${year}-${system.id}`}>
                              <tr
                                className="bg-slate-50/50 cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() =>
                                  toggleExpand(`year-${year}-sys-${system.id}`)
                                }
                              >
                                <td className="px-3 py-2">
                                  <p className="font-bold text-slate-700 tracking-tight text-[10px] uppercase flex items-center gap-2 pl-2">
                                    {isExpanded ? (
                                      <ChevronDown
                                        size={12}
                                        className="text-adasa-mid"
                                      />
                                    ) : (
                                      <ChevronRight
                                        size={12}
                                        className="text-adasa-mid"
                                      />
                                    )}
                                    {system.name}
                                  </p>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <span className="text-[11px] font-bold text-slate-500">
                                    {formatInteger(sysPop)}
                                  </span>
                                </td>
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2"></td>
                                <td className="px-5 py-2 text-right">
                                  <span className="font-black text-xs text-adasa-dark tracking-tighter">
                                    {formatNumber(sysDemand)}
                                  </span>
                                </td>
                              </tr>

                              {isExpanded &&
                                sysResults.map((entry) => {
                                  return (
                                    <tr
                                      key={`${entry.regionId}-${entry.year}`}
                                      className="hover:bg-adasa-light/5 transition-colors group"
                                    >
                                      <td className="px-3 py-1.5">
                                        <p className="font-bold text-slate-500 tracking-tight text-[10px] uppercase pl-8 border-l border-adasa-mid/30">
                                          {entry.regionName}
                                        </p>
                                      </td>
                                      <td className="px-3 py-1.5">
                                        <div className="flex flex-col items-end">
                                          <input
                                            type="text"
                                            className="w-full text-right bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-600 p-0"
                                            value={formatInteger(
                                              entry.population,
                                            )}
                                            onChange={(e) => {
                                              const num =
                                                parseInt(
                                                  e.target.value.replace(
                                                    /\D/g,
                                                    "",
                                                  ),
                                                ) || 0;
                                              const mod =
                                                1 +
                                                currentDemand.modifiers
                                                  .population /
                                                  100;
                                              handleUpdateEntry(
                                                entry.regionId,
                                                entry.year,
                                                "population",
                                                num / mod,
                                              );
                                            }}
                                          />
                                        </div>
                                      </td>
                                      <td className="px-3 py-1.5">
                                        <input
                                          type="number"
                                          className="w-full text-right bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-600 p-0"
                                          value={(entry.coverage * 100).toFixed(
                                            1,
                                          )}
                                          onChange={(e) => {
                                            const num =
                                              parseFloat(e.target.value) || 0;
                                            handleUpdateEntry(
                                              entry.regionId,
                                              entry.year,
                                              "coverage",
                                              num / 100,
                                            );
                                          }}
                                        />
                                      </td>
                                      <td className="px-3 py-1.5">
                                        <input
                                          type="number"
                                          className="w-full text-right bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-600 p-0"
                                          value={entry.perCapitaConsumption.toFixed(
                                            1,
                                          )}
                                          onChange={(e) => {
                                            const num =
                                              parseFloat(e.target.value) || 0;
                                            const mod =
                                              1 +
                                              currentDemand.modifiers
                                                .perCapitaConsumption /
                                                100;
                                            handleUpdateEntry(
                                              entry.regionId,
                                              entry.year,
                                              "perCapitaConsumption",
                                              num / mod,
                                            );
                                          }}
                                        />
                                      </td>
                                      <td className="px-3 py-1.5">
                                        <input
                                          type="number"
                                          className="w-full text-right bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-600 p-0"
                                          value={(entry.losses * 100).toFixed(
                                            1,
                                          )}
                                          onChange={(e) => {
                                            const num =
                                              parseFloat(e.target.value) || 0;
                                            handleUpdateEntry(
                                              entry.regionId,
                                              entry.year,
                                              "losses",
                                              num / 100,
                                            );
                                          }}
                                        />
                                      </td>
                                      <td className="px-5 py-1.5 text-right">
                                        <span className="font-bold text-xs text-slate-500 tracking-tighter">
                                          {formatNumber(entry.projectedDemand)}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </React.Fragment>
                          );
                        })}

                        <tr className="bg-slate-100/50 border-t border-slate-200">
                          <td className="px-3 py-3 text-right font-black text-[10px] text-adasa-dark uppercase pr-4">
                            Total {year}
                          </td>
                          <td className="px-3 py-3 text-right font-black text-[11px] text-adasa-dark">
                            {formatInteger(totalPopulation)}
                          </td>
                          <td className="px-3 py-3"></td>
                          <td className="px-3 py-3"></td>
                          <td className="px-3 py-3"></td>
                          <td className="px-5 py-3 text-right font-black text-sm text-adasa-dark">
                            {formatNumber(totalDemand)}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
  };


const renderSupplyTable = () => {
    // Array of unique years (sorted)
    const years = (Array.from<number>(new Set<number>(results.map((r) => r.year))) as number[]).sort((a: number, b: number) => a - b);

    return (
      <div className="col-span-4 lg:col-span-3 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6 px-2">
          <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
            <Database size={18} className="text-adasa-mid" />
            Consulta de Ofertas
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={handleExpandAll}
                className="px-3 py-1 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:text-adasa-mid transition-all"
                title="Expandir todos os grupos"
              >
                <ChevronDown size={14} className="inline mr-1" />
                Expandir
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-3 py-1 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:text-adasa-mid transition-all"
                title="Recolher todos os grupos"
              >
                <ChevronRight size={14} className="inline mr-1" />
                Recolher
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-0 min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 sticky top-0 z-10">
                  Subsistema / Ano
                </th>
                <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right bg-slate-50/50 sticky top-0 z-10 w-32">
                  Q Operante (L/s)
                </th>
                <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right bg-slate-50/50 sticky top-0 z-10 w-32">
                  Q Ajuste (L/s)
                </th>
                <th className="px-5 py-2 text-[9px] font-black text-adasa-mid uppercase tracking-widest text-right bg-slate-50/50 sticky top-0 z-10 w-32">
                  Oferta (L/s)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeSystems.map((system) => {
                const initialSupply = supplySources
                  .filter((s) => s.systemId === system.id)
                  .reduce((acc, curr) => acc + curr.operationalFlow, 0);

                const sysAdjustments = activeOperationalAdjustments.filter(
                  (a) => a.systemId === system.id
                );

                const isExpanded = expandedGroups[`sys-${system.id}`] !== false;

                return (
                  <React.Fragment key={system.id}>
                    <tr
                      className="bg-slate-50/50 cursor-pointer hover:bg-slate-100/50 transition-colors"
                      onClick={() => toggleExpand(`sys-${system.id}`)}
                    >
                      <td
                        colSpan={4}
                        className="px-3 py-2 text-[10px] font-black text-adasa-mid border-y border-slate-100 uppercase tracking-widest flex items-center gap-2"
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                        Subsistema: {system.name}
                      </td>
                    </tr>
                    {isExpanded &&
                      years.map((year) => {
                        let qOperante = initialSupply;
                        let qAjuste = 0;
                        sysAdjustments.forEach((adj) => {
                          if (year >= adj.startYear && year <= adj.endYear) {
                            if (
                              adj.type === "Aumento da vazão" ||
                              adj.type === "Transferência"
                            ) {
                              qAjuste += adj.flowValue;
                            } else if (adj.type === "Redução da vazão") {
                              qAjuste -= adj.flowValue;
                            }
                          }
                        });

                        const qDisponivel = qOperante + qAjuste;

                        return (
                          <tr
                            key={`${system.id}-${year}`}
                            className="hover:bg-adasa-light/10 transition-colors group"
                          >
                            <td className="px-3 py-2">
                              <p className="font-bold text-slate-400 tracking-tight text-[10px] uppercase pl-12 border-l-2 border-slate-200">
                                Ano: {year}
                              </p>
                            </td>
                            <td className="px-3 py-1.5 text-right font-bold text-slate-500 text-[11px]">
                              {formatNumber(qOperante, 2)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-bold text-slate-500 text-[11px]">
                              {formatNumber(qAjuste, 2)}
                            </td>
                            <td className="px-5 py-1.5 text-right font-black text-xs text-adasa-dark tracking-tighter">
                              {formatNumber(qDisponivel, 2)}
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const activeBalance = waterBalances.find(b => isSameWb(b.id, selectedWaterBalanceId)) || null;
  const updateActiveBalance = (updates: Partial<import('./types').WaterBalance>) => {
    setWaterBalances(prev => prev.map(b => isSameWb(b.id, selectedWaterBalanceId) ? { ...b, ...updates } : b));
  };

  // Redirect anonymous users to Login page unless they are using a shared public route
  if (!currentUser && !isPublicMode) {
    return <LoginPage />;
  }

  // Render a clean, standalone, responsive Portal view when public access is active
  if (isPublicMode) {
    let publicTabTitle = "Portal de Transparência Regulatória";
    if (publicTabName === "reg_painel" || publicTabName === "resolutions" || publicTabName === "resolucoes") {
      publicTabTitle = "Estoque Regulatório • ADASA";
    } else if (publicTabName === "planning" || publicTabName === "planejamento") {
      publicTabTitle = "Painel de Atividades • ADASA";
    } else {
      publicTabTitle = "Painéis Gerenciais • ADASA";
    }

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-adasa-light selection:text-adasa-dark flex flex-col">
        {toastMessage && (
          <div className={`fixed bottom-4 right-4 z-[9999] px-6 py-4 rounded-xl shadow-xl border flex items-center gap-3 transition-all ${
            toastMessage.type === "success" ? "bg-green-50/95 border-green-200 text-green-800" : 
            toastMessage.type === "error" ? "bg-red-50/95 border-red-200 text-red-800" :
            toastMessage.type === "warning" ? "bg-amber-50/95 border-amber-200 text-amber-800" :
            "bg-blue-50/95 border-blue-200 text-blue-800"
          }`}>
            <div className={`p-2 rounded-lg ${
              toastMessage.type === "success" ? "bg-green-500" : 
              toastMessage.type === "error" ? "bg-red-500" :
              toastMessage.type === "warning" ? "bg-amber-500" :
              "bg-blue-500"
            }`}>
              {toastMessage.type === "success" ? <Check size={16} className="text-white" /> : 
               toastMessage.type === "error" ? <AlertTriangle size={16} className="text-white" /> :
               toastMessage.type === "warning" ? <AlertTriangle size={16} className="text-white" /> :
               <Info size={16} className="text-white" />}
            </div>
            <div>
              <p className="font-black text-xs uppercase tracking-widest">{toastMessage.title}</p>
              <p className="text-sm font-medium opacity-90">{toastMessage.message}</p>
            </div>
            <button onClick={() => setToastMessage(null)} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Branded Portal Header */}
        <header className="bg-adasa-dark text-white border-b border-slate-800 py-4 px-6 md:px-8 shadow-md flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <TrendingUp size={24} className="text-adasa-light" />
            <div className="flex flex-col">
              <span className="font-black text-sm tracking-widest uppercase leading-none text-white">ADASA</span>
              <span className="text-[10px] text-adasa-light/95 font-bold uppercase tracking-wider mt-0.5">Agência Reguladora de Águas</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-700/60 mx-1 md:block hidden" />
            <span className="text-xs text-slate-300 font-semibold md:block hidden">{publicTabTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[10px] bg-white/10 text-white font-extrabold uppercase px-2.5 py-1 rounded border border-white/15 shadow-sm">
              Acesso Público • Sem Login
            </div>
          </div>
        </header>

        {/* Portal Body */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={publicTabName || "gerencial"}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full"
            >
              {publicTabName === "planning" || publicTabName === "planejamento" ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <button 
                       onClick={() => {
                         window.location.hash = "#public-gerencial";
                         setPublicTabName("gerencial");
                       }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-sm transition-all"
                    >
                      ← Voltar para Painéis Gerenciais
                    </button>
                  </div>
                  <PlanningTab 
                    tasks={tasks}
                    setTasks={setTasks}
                    showToast={showToast}
                    activeSubTab="dashboard"
                  />
                </div>
              ) : publicTabName === "reg_painel" || publicTabName === "resolutions" || publicTabName === "resolucoes" ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <button 
                       onClick={() => {
                         window.location.hash = "#public-gerencial";
                         setPublicTabName("gerencial");
                       }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-sm transition-all"
                    >
                      ← Voltar para Painéis Gerenciais
                    </button>
                  </div>
                  <ResolutionsDashboard showToast={showToast} />
                </div>
              ) : (
                <ManagerialHub 
                  onOpenPlanning={() => {
                    window.location.hash = "#public-planning";
                    setPublicTabName("planning");
                  }}
                  onOpenResolutions={() => {
                    window.location.hash = "#public-resolutions";
                    setPublicTabName("reg_painel");
                  }}
                  isPublic={true}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Branded Portal Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 px-6 text-center text-slate-400 font-semibold text-[10px] tracking-widest uppercase mt-12">
          <p>© {new Date().getFullYear()} ADASA - Agência Reguladora de Águas, Energia e Saneamento Básico do Distrito Federal</p>
          <p className="text-[9px] lowercase tracking-wide mt-1 opacity-70">portal de transparência e monitoramento regulatório da superintendência de abastecimento de água e esgoto</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-adasa-light selection:text-adasa-dark">
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 z-[9999] px-6 py-4 rounded-xl shadow-xl border flex items-center gap-3 transition-all ${
          toastMessage.type === "success" ? "bg-green-50/95 border-green-200 text-green-800" : 
          toastMessage.type === "error" ? "bg-red-50/95 border-red-200 text-red-800" :
          toastMessage.type === "warning" ? "bg-amber-50/95 border-amber-200 text-amber-800" :
          "bg-blue-50/95 border-blue-200 text-blue-800"
        }`}>
          <div className={`p-2 rounded-lg ${
            toastMessage.type === "success" ? "bg-green-500" : 
            toastMessage.type === "error" ? "bg-red-500" :
            toastMessage.type === "warning" ? "bg-amber-500" :
            "bg-blue-500"
          }`}>
            {toastMessage.type === "success" ? <Check size={16} className="text-white" /> : 
             toastMessage.type === "error" ? <AlertTriangle size={16} className="text-white" /> :
             toastMessage.type === "warning" ? <AlertTriangle size={16} className="text-white" /> :
             <Info size={16} className="text-white" />}
          </div>
          <div>
            <p className="font-black text-xs uppercase tracking-widest">{toastMessage.title}</p>
            <p className="text-sm font-medium opacity-90">{toastMessage.message}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Mobile Header Menu */}
      <div className="md:hidden flex items-center justify-between p-4 bg-adasa-dark text-white sticky top-0 z-40 shadow-md">
         <div className="flex items-center gap-2">
            <TrendingUp size={22} className="text-adasa-light" />
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight">Gerencial SAE</span>
            </div>
         </div>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
         </button>
      </div>

      {/* Mobile Overlay Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-adasa-dark/95 z-30 pt-20 px-6 flex flex-col backdrop-blur-sm"
          >
            <nav className="space-y-4 flex-1 overflow-y-auto pb-6">
              <div>
                <div className="space-y-1 mb-2">
                  <button
                    onClick={() => handleTabChange("home")}
                    className={cn("w-full px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "home" ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                  >
                    <Home size={20} className={activeTab === "home" ? "text-adasa-mid" : "text-white/60"} />
                    Início
                  </button>
                  <button
                    onClick={() => handleTabChange("gerencial")}
                    className={cn("w-full px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "gerencial" ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                  >
                    <BarChart2 size={20} className={activeTab === "gerencial" ? "text-adasa-mid" : "text-white/60"} />
                    Painéis Gerenciais
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1.5 px-2 mt-2">
                  <ListTodo size={14} /> Plano de Atividades
                </h4>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setIsMyTasksSelected(true);
                      setMyTasksFilterTrigger(prev => prev + 1);
                      setActivePlanningSubTab("tasks");
                      handleTabChange("planning");
                    }}
                    className={cn("w-full text-left justify-start px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "planning" && activePlanningSubTab === "tasks" && isMyTasksSelected ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                  >
                    <CalendarCheck size={20} className={activeTab === "planning" && activePlanningSubTab === "tasks" && isMyTasksSelected ? "text-adasa-mid" : "text-white/60"} />
                    Minhas Tarefas
                  </button>
                  <button
                    onClick={() => {
                      setIsMyTasksSelected(false);
                      setActivePlanningSubTab("tasks");
                      handleTabChange("planning");
                    }}
                    className={cn("w-full text-left justify-start px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "planning" && activePlanningSubTab === "tasks" && !isMyTasksSelected ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                  >
                    <ListTodo size={20} className={activeTab === "planning" && activePlanningSubTab === "tasks" && !isMyTasksSelected ? "text-adasa-mid" : "text-white/60"} />
                    Cadastrar Atividades
                  </button>
                  <button
                    onClick={() => {
                      setIsMyTasksSelected(false);
                      setActivePlanningSubTab("dashboard");
                      handleTabChange("planning");
                    }}
                    className={cn("w-full text-left justify-start px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "planning" && activePlanningSubTab === "dashboard" ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                  >
                    <LayoutDashboard size={20} className={activeTab === "planning" && activePlanningSubTab === "dashboard" ? "text-adasa-mid" : "text-white/60"} />
                    Painel de Atividades
                  </button>
                  <button
                    onClick={() => {
                      setIsMyTasksSelected(false);
                      setActivePlanningSubTab("plans");
                      handleTabChange("planning");
                    }}
                    className={cn("w-full text-left justify-start px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "planning" && activePlanningSubTab === "plans" ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                  >
                    <MapIcon size={20} className={activeTab === "planning" && activePlanningSubTab === "plans" ? "text-adasa-mid" : "text-white/60"} />
                    Cadastrar Planos
                  </button>
                  <button
                    onClick={() => {
                      setIsMyTasksSelected(false);
                      setActivePlanningSubTab("areas");
                      handleTabChange("planning");
                    }}
                    className={cn("w-full text-left justify-start px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "planning" && activePlanningSubTab === "areas" ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                  >
                    <Layers size={20} className={activeTab === "planning" && activePlanningSubTab === "areas" ? "text-adasa-mid" : "text-white/60"} />
                    Cadastrar Áreas Temáticas
                  </button>
                  <button
                    onClick={() => {
                      setIsMyTasksSelected(false);
                      setActivePlanningSubTab("categories");
                      handleTabChange("planning");
                    }}
                    className={cn("w-full text-left justify-start px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "planning" && activePlanningSubTab === "categories" ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                  >
                    <Tags size={20} className={activeTab === "planning" && activePlanningSubTab === "categories" ? "text-adasa-mid" : "text-white/60"} />
                    Cadastrar Categorias
                  </button>
                  <button
                    onClick={() => {
                      setIsMyTasksSelected(false);
                      setActivePlanningSubTab("responsibles");
                      handleTabChange("planning");
                    }}
                    className={cn("w-full text-left justify-start px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "planning" && activePlanningSubTab === "responsibles" ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                  >
                    <Users size={20} className={activeTab === "planning" && activePlanningSubTab === "responsibles" ? "text-adasa-mid" : "text-white/60"} />
                    Cadastrar Responsáveis
                  </button>
                  <button
                    onClick={() => {
                      setIsMyTasksSelected(false);
                      setActivePlanningSubTab("import");
                      handleTabChange("planning");
                    }}
                    className={cn("w-full text-left justify-start px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "planning" && activePlanningSubTab === "import" ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                  >
                    <Upload size={20} className={activeTab === "planning" && activePlanningSubTab === "import" ? "text-adasa-mid" : "text-white/60"} />
                    Importar Tarefas
                  </button>
                  <button
                    onClick={() => {
                      setIsMyTasksSelected(false);
                      setActivePlanningSubTab("models");
                      handleTabChange("planning");
                    }}
                    className={cn("w-full text-left justify-start px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "planning" && activePlanningSubTab === "models" ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                  >
                    <Copy size={20} className={activeTab === "planning" && activePlanningSubTab === "models" ? "text-adasa-mid" : "text-white/60"} />
                    Cadastrar Modelo de Tarefas
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1.5 px-2 mt-2">
                  <FileSpreadsheet size={14} /> Regulação
                </h4>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setIsMyTasksSelected(false);
                      setIsMobileMenuOpen(false);
                      handleTabChange("reg_cadastro");
                    }}
                    className={cn("w-full text-left justify-start px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "reg_cadastro" ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                  >
                    <FileText size={20} className={activeTab === "reg_cadastro" ? "text-adasa-mid" : "text-white/60"} />
                    Cadastrar Resoluções
                  </button>
                  <button
                    onClick={() => {
                      setIsMyTasksSelected(false);
                      setIsMobileMenuOpen(false);
                      handleTabChange("reg_painel");
                    }}
                    className={cn("w-full text-left justify-start px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "reg_painel" ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                  >
                    <BarChart2 size={20} className={activeTab === "reg_painel" ? "text-adasa-mid" : "text-white/60"} />
                    Painel de Resoluções
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1.5 px-2 mt-2">
                  <Shield size={14} /> Fiscalização
                </h4>
                <div className="pl-4 border-l border-white/10 ml-3.5 space-y-2 mt-2 mb-4">
                  <h5 className="text-[11px] font-bold text-white/60 uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
                    <Droplets size={12} /> Balanço Hídrico
                  </h5>
                  <div className="space-y-1">
                    <button
                      onClick={() => handleTabChange("manage")}
                      className={cn("w-full text-left justify-start px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "manage" ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                    >
                      <FilePlus size={20} className={activeTab === "manage" ? "text-adasa-mid" : "text-white/60"} />
                      Cadastrar Balanço
                    </button>
                    <button
                      onClick={() => handleTabChange("analyze")}
                      className={cn("w-full text-left justify-start px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "analyze" ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                    >
                      <BarChart2 size={20} className={activeTab === "analyze" ? "text-adasa-mid" : "text-white/60"} />
                      Painel do Balanço Hídrico
                    </button>
                    <button
                      onClick={() => handleTabChange("compare")}
                      className={cn("w-full text-left justify-start px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "compare" ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                    >
                      <GitCompare size={20} className={activeTab === "compare" ? "text-adasa-mid" : "text-white/60"} />
                      Comparar Balanço
                    </button>
                    <button
                      onClick={() => handleTabChange("templates")}
                      className={cn("w-full text-left justify-start px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "templates" ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                    >
                      <FileText size={20} className={activeTab === "templates" ? "text-adasa-mid" : "text-white/60"} />
                      Arquivos de Modelo
                    </button>
                  </div>
                </div>
              </div>

              <RequirePermission moduleId="users" action="view">
                <div>
                  <h4 className="text-xs font-black text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1.5 px-2 mt-2">
                    <Shield size={14} /> Gestão de Usuários
                  </h4>
                  <div className="space-y-1">
                    <button
                      onClick={() => handleTabChange("users")}
                      className={cn("w-full px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-semibold", activeTab === "users" ? "bg-white text-adasa-dark shadow-lg" : "text-white/80 border border-transparent")}
                    >
                      <Users size={20} className={activeTab === "users" ? "text-adasa-mid" : "text-white/60"} />
                      Usuários e Permissões
                    </button>
                  </div>
                </div>
              </RequirePermission>

              <div className="border-t border-white/10 pt-4 mt-4 shrink-0">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full px-5 py-3 rounded-2xl flex items-center gap-4 transition-all text-sm font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                >
                  <LogOut size={20} className="text-rose-400" />
                  Sair do sistema
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          "hidden md:flex bg-adasa-dark flex-col p-6 transition-all border-r border-adasa-dark/20 h-screen sticky top-0 z-20",
          isSidebarCollapsed ? "w-20 p-4 items-center" : "w-64"
        )}
      >
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-10 bg-adasa-dark text-white rounded-full p-1 shadow-md border border-white/10 hover:bg-adasa-mid transition-colors z-50"
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>

        <div className={cn("flex items-center gap-3 mb-10 overflow-hidden", isSidebarCollapsed ? "justify-center" : "")}>
          <div className="w-10 h-10 bg-adasa-mid rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-white shadow-lg shadow-adasa-mid/20">
            <TrendingUp size={22} />
          </div>
          {!isSidebarCollapsed && (
            <div className="hidden md:block">
              <div className="flex flex-col">
                <span className="text-xl font-black text-white tracking-tight block leading-tight">
                  Gerencial SAE
                </span>
              </div>
            </div>
          )}
        </div>

        <nav className="space-y-4 flex-1 w-full text-white overflow-y-auto pb-4 custom-scrollbar pr-2">
          <div>
            <div className="space-y-1 mb-2">
              <button
                title={isSidebarCollapsed ? "Início" : undefined}
                onClick={() => handleTabChange("home")}
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                  activeTab === "home"
                    ? "bg-white/10 text-white shadow-sm border border-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                )}
              >
                <Home
                  size={16}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    activeTab === "home" ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                  )}
                />
                {!isSidebarCollapsed && <span className="hidden md:inline">Início</span>}
              </button>

              <button
                title={isSidebarCollapsed ? "Painéis Gerenciais" : undefined}
                onClick={() => handleTabChange("gerencial")}
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                  activeTab === "gerencial"
                    ? "bg-white/10 text-white shadow-sm border border-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                )}
              >
                <BarChart2
                  size={16}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    activeTab === "gerencial" ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                  )}
                />
                {!isSidebarCollapsed && <span className="hidden md:inline">Painéis Gerenciais</span>}
              </button>
            </div>
          </div>

          <div>
            {!isSidebarCollapsed && (
              <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5 px-2 mt-2">
                <ListTodo size={12} /> Plano de Atividades
              </h4>
            )}
            <div className="space-y-1">
              <button
                title={isSidebarCollapsed ? "Minhas Tarefas" : undefined}
                onClick={() => {
                  setIsMyTasksSelected(true);
                  setMyTasksFilterTrigger(prev => prev + 1);
                  setActivePlanningSubTab("tasks");
                  handleTabChange("planning");
                }}
                className={cn(
                  "w-full text-left justify-start px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                  activeTab === "planning" && activePlanningSubTab === "tasks" && isMyTasksSelected
                    ? "bg-white/10 text-white shadow-sm border border-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                )}
              >
                <CalendarCheck
                  size={16}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    activeTab === "planning" && activePlanningSubTab === "tasks" && isMyTasksSelected ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                  )}
                />
                {!isSidebarCollapsed && <span className="hidden md:inline">Minhas Tarefas</span>}
              </button>
              <button
                title={isSidebarCollapsed ? "Cadastrar Atividades" : undefined}
                onClick={() => {
                  setIsMyTasksSelected(false);
                  setActivePlanningSubTab("tasks");
                  handleTabChange("planning");
                }}
                className={cn(
                  "w-full text-left justify-start px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                  activeTab === "planning" && activePlanningSubTab === "tasks" && !isMyTasksSelected
                    ? "bg-white/10 text-white shadow-sm border border-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                )}
              >
                <ListTodo
                  size={16}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    activeTab === "planning" && activePlanningSubTab === "tasks" && !isMyTasksSelected ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                  )}
                />
                {!isSidebarCollapsed && <span className="hidden md:inline">Cadastrar Atividades</span>}
              </button>
              <button
                title={isSidebarCollapsed ? "Painel de Atividades" : undefined}
                onClick={() => {
                  setIsMyTasksSelected(false);
                  setActivePlanningSubTab("dashboard");
                  handleTabChange("planning");
                }}
                className={cn(
                  "w-full text-left justify-start px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                  activeTab === "planning" && activePlanningSubTab === "dashboard"
                    ? "bg-white/10 text-white shadow-sm border border-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                )}
              >
                <LayoutDashboard
                  size={16}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    activeTab === "planning" && activePlanningSubTab === "dashboard" ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                  )}
                />
                {!isSidebarCollapsed && <span className="hidden md:inline">Painel de Atividades</span>}
              </button>
              <button
                title={isSidebarCollapsed ? "Cadastrar Planos" : undefined}
                onClick={() => {
                  setIsMyTasksSelected(false);
                  setActivePlanningSubTab("plans");
                  handleTabChange("planning");
                }}
                className={cn(
                  "w-full text-left justify-start px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                  activeTab === "planning" && activePlanningSubTab === "plans"
                    ? "bg-white/10 text-white shadow-sm border border-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                )}
              >
                <MapIcon
                  size={16}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    activeTab === "planning" && activePlanningSubTab === "plans" ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                  )}
                />
                {!isSidebarCollapsed && <span className="hidden md:inline">Cadastrar Planos</span>}
              </button>
              <button
                title={isSidebarCollapsed ? "Cadastrar Áreas Temáticas" : undefined}
                onClick={() => {
                  setIsMyTasksSelected(false);
                  setActivePlanningSubTab("areas");
                  handleTabChange("planning");
                }}
                className={cn(
                  "w-full text-left justify-start px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                  activeTab === "planning" && activePlanningSubTab === "areas"
                    ? "bg-white/10 text-white shadow-sm border border-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                )}
              >
                <Layers
                  size={16}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    activeTab === "planning" && activePlanningSubTab === "areas" ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                  )}
                />
                {!isSidebarCollapsed && <span className="hidden md:inline">Cadastrar Áreas Temáticas</span>}
              </button>
              <button
                title={isSidebarCollapsed ? "Cadastrar Categorias" : undefined}
                onClick={() => {
                  setIsMyTasksSelected(false);
                  setActivePlanningSubTab("categories");
                  handleTabChange("planning");
                }}
                className={cn(
                  "w-full text-left justify-start px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                  activeTab === "planning" && activePlanningSubTab === "categories"
                    ? "bg-white/10 text-white shadow-sm border border-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                )}
              >
                <Tags
                  size={16}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    activeTab === "planning" && activePlanningSubTab === "categories" ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                  )}
                />
                {!isSidebarCollapsed && <span className="hidden md:inline">Cadastrar Categorias</span>}
              </button>
              <button
                title={isSidebarCollapsed ? "Cadastrar Responsáveis" : undefined}
                onClick={() => {
                  setIsMyTasksSelected(false);
                  setActivePlanningSubTab("responsibles");
                  handleTabChange("planning");
                }}
                className={cn(
                  "w-full text-left justify-start px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                  activeTab === "planning" && activePlanningSubTab === "responsibles"
                    ? "bg-white/10 text-white shadow-sm border border-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                )}
              >
                <Users
                  size={16}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    activeTab === "planning" && activePlanningSubTab === "responsibles" ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                  )}
                />
                {!isSidebarCollapsed && <span className="hidden md:inline">Cadastrar Responsáveis</span>}
              </button>
              <button
                title={isSidebarCollapsed ? "Importar Tarefas" : undefined}
                onClick={() => {
                  setIsMyTasksSelected(false);
                  setActivePlanningSubTab("import");
                  handleTabChange("planning");
                }}
                className={cn(
                  "w-full text-left justify-start px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                  activeTab === "planning" && activePlanningSubTab === "import"
                    ? "bg-white/10 text-white shadow-sm border border-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                )}
              >
                <Upload
                  size={16}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    activeTab === "planning" && activePlanningSubTab === "import" ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                  )}
                />
                {!isSidebarCollapsed && <span className="hidden md:inline">Importar Tarefas</span>}
              </button>
              <button
                title={isSidebarCollapsed ? "Cadastrar Modelo de Tarefas" : undefined}
                onClick={() => {
                  setIsMyTasksSelected(false);
                  setActivePlanningSubTab("models");
                  handleTabChange("planning");
                }}
                className={cn(
                  "w-full text-left justify-start px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                  activeTab === "planning" && activePlanningSubTab === "models"
                    ? "bg-white/10 text-white shadow-sm border border-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                )}
              >
                <Copy
                  size={16}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    activeTab === "planning" && activePlanningSubTab === "models" ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                  )}
                />
                {!isSidebarCollapsed && <span className="hidden md:inline">Cadastrar Modelo de Tarefas</span>}
              </button>
            </div>
          </div>

          <div>
            {!isSidebarCollapsed && (
              <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 flex items-center gap-1.5 px-2">
                <FileSpreadsheet size={12} /> Regulação
              </h4>
            )}
            <div className="space-y-1">
              <button
                title={isSidebarCollapsed ? "Cadastrar Resoluções" : undefined}
                onClick={() => {
                  setIsMyTasksSelected(false);
                  handleTabChange("reg_cadastro");
                }}
                className={cn(
                  "w-full text-left justify-start px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                  activeTab === "reg_cadastro"
                    ? "bg-white/10 text-white shadow-sm border border-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                )}
              >
                <FileText
                  size={16}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    activeTab === "reg_cadastro" ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                  )}
                />
                {!isSidebarCollapsed && <span className="hidden md:inline">Cadastrar Resoluções</span>}
              </button>
              <button
                title={isSidebarCollapsed ? "Painel de Resoluções" : undefined}
                onClick={() => {
                  setIsMyTasksSelected(false);
                  handleTabChange("reg_painel");
                }}
                className={cn(
                  "w-full text-left justify-start px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                  activeTab === "reg_painel"
                    ? "bg-white/10 text-white shadow-sm border border-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                )}
              >
                <BarChart2
                  size={16}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    activeTab === "reg_painel" ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                  )}
                />
                {!isSidebarCollapsed && <span className="hidden md:inline">Painel de Resoluções</span>}
              </button>
            </div>
          </div>

          <div>
            {!isSidebarCollapsed && (
              <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 flex items-center gap-1.5 px-2">
                <Shield size={12} /> Fiscalização
              </h4>
            )}
            <div className={cn(isSidebarCollapsed ? "" : "pl-3 border-l border-white/10 ml-3", "space-y-2 mt-2 mb-3")}>
              {!isSidebarCollapsed && (
                <h5 className="text-[9px] font-bold text-white/55 uppercase tracking-wider mb-1 flex items-center gap-1.5 px-1">
                  <Droplets size={10} /> Balanço Hídrico
                </h5>
              )}
              <div className="space-y-1">
                <button
                  title={isSidebarCollapsed ? "Cadastrar Balanço" : undefined}
                  onClick={() => handleTabChange("manage")}
                  className={cn(
                    "w-full text-left justify-start px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                    activeTab === "manage"
                      ? "bg-white/10 text-white shadow-sm border border-white/10"
                      : "text-white/60 hover:text-white hover:bg-white/5",
                  )}
                >
                  <FilePlus
                    size={16}
                    className={cn(
                      "flex-shrink-0 transition-colors",
                      activeTab === "manage" ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                    )}
                  />
                  {!isSidebarCollapsed && <span className="hidden md:inline">Cadastrar Balanço</span>}
                </button>
                <button
                  title={isSidebarCollapsed ? "Painel do Balanço Hídrico" : undefined}
                  onClick={() => handleTabChange("analyze")}
                  className={cn(
                    "w-full text-left justify-start px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                    activeTab === "analyze"
                      ? "bg-white/10 text-white shadow-sm border border-white/10"
                      : "text-white/60 hover:text-white hover:bg-white/5",
                  )}
                >
                  <BarChart2
                    size={16}
                    className={cn(
                      "flex-shrink-0 transition-colors",
                      activeTab === "analyze" ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                    )}
                  />
                  {!isSidebarCollapsed && <span className="hidden md:inline">Painel do Balanço Hídrico</span>}
                </button>
                <button
                  title={isSidebarCollapsed ? "Comparar Balanços" : undefined}
                  onClick={() => handleTabChange("compare")}
                  className={cn(
                    "w-full text-left justify-start px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                    activeTab === "compare"
                      ? "bg-white/10 text-white shadow-sm border border-white/10"
                      : "text-white/60 hover:text-white hover:bg-white/5",
                  )}
                >
                  <GitCompare
                    size={16}
                    className={cn(
                      "flex-shrink-0 transition-colors",
                      activeTab === "compare" ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                    )}
                  />
                  {!isSidebarCollapsed && <span className="hidden md:inline">Comparar Balanços</span>}
                </button>
                <button
                  title={isSidebarCollapsed ? "Arquivos de Modelo" : undefined}
                  onClick={() => handleTabChange("templates")}
                  className={cn(
                    "w-full text-left justify-start px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                    activeTab === "templates"
                      ? "bg-white/10 text-white shadow-sm border border-white/10"
                      : "text-white/60 hover:text-white hover:bg-white/5",
                  )}
                >
                  <FileText
                    size={16}
                    className={cn(
                      "flex-shrink-0 transition-colors",
                      activeTab === "templates" ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                    )}
                  />
                  {!isSidebarCollapsed && <span className="hidden md:inline">Arquivos de Modelo</span>}
                </button>
              </div>
            </div>
          </div>

          <RequirePermission moduleId="users" action="view">
            <div>
              {!isSidebarCollapsed && (
                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 flex items-center gap-1.5 px-2">
                  <Shield size={12} /> Gestão de Usuários
                </h4>
              )}
              <div className="space-y-1 mt-2">
                <button
                  title={isSidebarCollapsed ? "Gestão de Usuários" : undefined}
                  onClick={() => handleTabChange("users")}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-xs font-semibold",
                    activeTab === "users"
                      ? "bg-white/10 text-white shadow-sm border border-white/10"
                      : "text-white/60 hover:text-white hover:bg-white/5",
                  )}
                >
                  <Users
                    size={16}
                    className={cn(
                      "flex-shrink-0 transition-colors",
                      activeTab === "users" ? "text-adasa-light" : "text-white/40 group-hover:text-white/60",
                    )}
                  />
                  {!isSidebarCollapsed && <span className="hidden md:inline">Usuários e Permissões</span>}
                </button>
              </div>
            </div>
          </RequirePermission>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-4 md:p-8 gap-6 overflow-y-auto w-full max-w-full">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-2">
              {activeTab === "home"
                ? "Página Inicial"
                : activeTab === "gerencial"
                ? "Painéis Gerenciais"
                : activeTab === "compare"
                ? "Comparar Balanços"
                : activeTab === "analyze"
                  ? "Painel de Análise do Balanço Hídrico"
                  : activeTab === "templates"
                    ? "Arquivos Modelo"
                    : activeTab === "users"
                      ? "Gestão de Usuários"
                    : activeTab === "planning"
                      ? (activePlanningSubTab === "dashboard" ? "Painel de Atividades" :
                         activePlanningSubTab === "tasks" ? "Cadastrar Atividades" : 
                         activePlanningSubTab === "plans" ? "Cadastrar Planos" : 
                         activePlanningSubTab === "areas" ? "Cadastrar Áreas Temáticas" : 
                         activePlanningSubTab === "categories" ? "Cadastrar Categorias" :
                         activePlanningSubTab === "responsibles" ? "Cadastrar Responsáveis" :
                         activePlanningSubTab === "models" ? "Cadastrar Modelo de Tarefas" : "Importar Tarefas")
                       : activeTab === "reg_cadastro" ? "Cadastrar Resoluções" : activeTab === "reg_painel" ? "Painel Estratégico de Resoluções" : "Cadastrar Balanço"}
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              {activeTab === "home"
                ? "Selecione um módulo abaixo para iniciar o trabalho ou visualizar relatórios."
                : activeTab === "gerencial"
                  ? "Centralizadores de monitoramento estratégico, estoque regulatório e resultados da superintendência ADASA."
                  : activeTab === "compare"
                    ? "Compare e analise a evolução da demanda e balanço."
                    : activeTab === "analyze"
                      ? "Visualize de forma isolada as projeções de oferta e demanda ao longo do tempo."
                      : activeTab === "templates"
                        ? "Gerencie e baixe os arquivos modelo para importação no sistema."
                        : activeTab === "users"
                          ? "Gerencie as contas de usuários, papéis e níveis de acesso (RBAC)."
                        : activeTab === "planning"
                          ? "Gerencie o cronograma consolidado, planos, áreas e status de execução."
                          : activeTab === "reg_cadastro" ? "Gestão do acervo de normas, atos legais e resoluções aplicados à regulação do saneamento básico e recursos hídricos." : activeTab === "reg_painel" ? "Estoque Regulatório da Superintendência de Abastecimento de Água e Esgoto" : "Gerencie os balanços hídricos e cadastre novas informações."}
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative z-50 hidden md:block">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-adasa-mid hover:bg-slate-50 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-adasa-mid/20"
              >
                <div className="text-right">
                  <p className="text-xs font-black text-adasa-dark leading-none">
                    {currentUser?.name || "Usuário não logado"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                    {currentUser?.agency ? `${roles.find(r => r.id === currentUser.roleId)?.name || 'N/A'} - ${currentUser.agency}` : roles.find(r => r.id === currentUser?.roleId)?.name || 'N/A'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-adasa-light/10 rounded-xl flex items-center justify-center text-adasa-dark font-black text-sm shadow-inner shrink-0 leading-none">
                  {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?'}
                </div>
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-200", userMenuOpen && "transform rotate-180")} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50"
                    >
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Logado como</p>
                        <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{currentUser?.email}</p>
                      </div>
                      <div className="p-1">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors text-left"
                        >
                          <LogOut size={14} className="text-rose-500" />
                          Sair do sistema
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === "home" ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <HomeTab 
                setActiveTab={setActiveTab as any} 
                setActivePlanningSubTab={setActivePlanningSubTab as any}
                tasks={tasks} 
                areas={areas} 
              />
            </motion.div>
          ) : activeTab === "analyze" ? (
            <motion.div
              key="analyze"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col gap-6"
            >
              {/* Box seguindo o modelo solicitado */}
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden border border-slate-700/30">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/5 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl"></div>
                
                <div className="relative z-10 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/15 text-[10px] font-bold uppercase tracking-widest text-[#93c5fd]">
                    MAPEAMENTO & MONITORAMENTO ESTRATÉGICO
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white">
                    Painel de Análise do Balanço Hídrico
                  </h1>
                </div>
              </div>

             <div className="flex bg-slate-100 p-1 w-full md:w-fit rounded-xl border border-slate-200 overflow-x-auto no-scrollbar snap-x">
                <button
                  onClick={() => setAnalyzeSubTab("balance")}
                  className={cn(
                    "px-6 py-2 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap snap-start",
                    analyzeSubTab === "balance"
                      ? "bg-white text-adasa-mid shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Balanço
                </button>
                <button
                  onClick={() => setAnalyzeSubTab("supply")}
                  className={cn(
                    "px-6 py-2 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap snap-start",
                    analyzeSubTab === "supply"
                      ? "bg-white text-adasa-mid shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Oferta
                </button>
                <button
                  onClick={() => setAnalyzeSubTab("demand")}
                  className={cn(
                    "px-6 py-2 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap snap-start",
                    analyzeSubTab === "demand"
                      ? "bg-white text-adasa-mid shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Demanda
                </button>
                <button
                  onClick={() => setAnalyzeSubTab("adjustments")}
                  className={cn(
                    "px-6 py-2 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap snap-start",
                    analyzeSubTab === "adjustments"
                      ? "bg-white text-adasa-mid shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Ajustes Operacionais
                </button>
                <button
                  onClick={() => setAnalyzeSubTab("map")}
                  className={cn(
                    "px-6 py-2 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap snap-start",
                    analyzeSubTab === "map"
                      ? "bg-white text-adasa-mid shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Mapa Balanço Hídrico
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3">
                    <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 uppercase tracking-tight">
                      <Database size={16} className="text-adasa-mid" />
                      Selecione o Balanço
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {waterBalances.map((wb) => (
                        <label key={wb.id} className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                          <input
                            type="radio"
                            className="w-4 h-4 text-adasa-mid rounded-full border-slate-300 focus:ring-adasa-mid"
                            checked={analyzeBalanceId === wb.id}
                            onChange={() => {
                              setSelectedWaterBalanceId(wb.id);
                              setAnalyzeBalanceId(wb.id);
                              setAnalyzeSystemIds([]); // reset systems when balance changes
                            }}
                          />
                          <span className="text-[11px] font-bold text-slate-700 uppercase">{wb.description}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 uppercase tracking-tight">
                      <LayoutGrid size={16} className="text-adasa-mid" />
                      Filtro por Subsistemas
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-adasa-mid rounded border-slate-300 focus:ring-adasa-mid"
                          checked={analyzeSystemIds.length === 0}
                          onChange={() => setAnalyzeSystemIds([])}
                        />
                        <span className="text-[11px] font-bold text-slate-700 uppercase">Todos</span>
                      </label>
                      {systems.filter(s => isSameWb(s.waterBalanceId, analyzeBalanceId)).map((sys) => (
                        <label key={sys.id} className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-adasa-mid rounded border-slate-300 focus:ring-adasa-mid"
                            checked={analyzeSystemIds.includes(sys.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAnalyzeSystemIds(prev => [...prev.filter(id => id !== "all"), sys.id]);
                              } else {
                                setAnalyzeSystemIds(prev => prev.filter(id => id !== sys.id));
                              }
                            }}
                          />
                          <span className="text-[11px] font-bold text-slate-700 uppercase">{sys.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {analyzeSubTab === "adjustments" && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 uppercase tracking-tight mb-3">
                          <LayoutGrid size={16} className="text-adasa-mid" />
                          Filtro por Tipo de Ajuste
                        </h4>
                        <div className="flex flex-wrap gap-2">
                           <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                             <input
                               type="checkbox"
                               className="w-4 h-4 text-adasa-mid rounded border-slate-300 focus:ring-adasa-mid"
                               checked={analyzeAdjustmentTypes.length === 0}
                               onChange={() => setAnalyzeAdjustmentTypes([])}
                             />
                             <span className="text-[11px] font-bold text-slate-700 uppercase">Todos</span>
                           </label>
                           {(['Aumento da vazão', 'Redução da vazão', 'Transferência'] as AdjustmentType[]).map((type) => (
                             <label key={type} className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                               <input
                                 type="checkbox"
                                 className="w-4 h-4 text-adasa-mid rounded border-slate-300 focus:ring-adasa-mid"
                                 checked={analyzeAdjustmentTypes.includes(type)}
                                 onChange={(e) => {
                                   if (e.target.checked) {
                                     setAnalyzeAdjustmentTypes(prev => [...prev.filter(t => t !== "all"), type]);
                                   } else {
                                     setAnalyzeAdjustmentTypes(prev => prev.filter(t => t !== type));
                                   }
                                 }}
                               />
                               <span className="text-[11px] font-bold text-slate-700 uppercase">{type}</span>
                             </label>
                           ))}
                        </div>
                      </div>
                      
                      {/* Year Filter moved here */}
                      <div>
                        <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 uppercase tracking-tight mb-3">
                          <TrendingUp size={16} className="text-adasa-mid" />
                          Filtro por Ano
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 pb-2">
                           {analyzeBalanceAvailableYears.map(year => (
                             <button
                               key={year}
                               onClick={() => setAnalyzeBalanceYear(year)}
                               className={cn(
                                 "px-3 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                                 analyzeBalanceYear === year
                                   ? "bg-adasa-mid text-white shadow-md scale-105" 
                                   : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                               )}
                             >
                               {year}
                             </button>
                           ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>


              {analyzeSubTab === "demand" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 mt-4">
                    <div className="bg-[#1a3b83] rounded-[1.5rem] p-8 text-white shadow-sm flex flex-col justify-between">
                       <p className="text-[10px] font-black uppercase tracking-widest text-[#bbd0ff] mb-2">Composição da demanda</p>
                       <h4 className="font-extrabold text-sm uppercase mb-6">Visão Geral da Demanda</h4>
                       
                       <div className="flex justify-between items-center py-3 border-b border-white/20">
                         <span className="text-sm font-semibold">Demanda Ano {overviewMetrics?.startYear} (L/s)</span>
                         <span className="text-xl font-black">{formatNumber(overviewMetrics?.startDemand || 0)}</span>
                       </div>
                       <div className="flex justify-between items-center py-3 border-b border-white/20">
                         <span className="text-sm font-semibold">Demanda Ano {overviewMetrics?.endYear} (L/s)</span>
                         <span className="text-xl font-black">{formatNumber(overviewMetrics?.endDemand || 0)}</span>
                       </div>
                       <div className="flex justify-between items-center py-3 border-b border-white/20 text-[#60a5fa] font-black">
                         <span className="text-sm">Incremento de Demanda (L/s)</span>
                         <span className="text-xl">{formatNumber(overviewMetrics?.demIncrement || 0)}</span>
                       </div>
                       <div className="flex justify-between items-center py-3 text-[#60a5fa] font-black">
                         <span className="text-sm">Incremento de Demanda (%)</span>
                         <span className="text-xl">
                           {overviewMetrics?.demIncrementPercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
                         </span>
                       </div>
                    </div>
                    
                    <div className="bg-white rounded-[1.5rem] p-8 text-slate-800 border border-slate-200 shadow-sm flex flex-col justify-between">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Relatório de Insights</p>
                       <h4 className="font-extrabold text-sm uppercase mb-6">Visão Geral da População</h4>
                       
                       <div className="flex justify-between items-center py-3 border-b border-slate-100">
                         <span className="text-sm font-semibold text-slate-500">População Ano {overviewMetrics?.startYear} (hab.)</span>
                         <span className="text-xl font-black">{formatNumber(overviewMetrics?.startPop || 0)}</span>
                       </div>
                       <div className="flex justify-between items-center py-3 border-b border-slate-100">
                         <span className="text-sm font-semibold text-slate-500">População Ano {overviewMetrics?.endYear} (hab.)</span>
                         <span className="text-xl font-black">{formatNumber(overviewMetrics?.endPop || 0)}</span>
                       </div>
                       <div className="flex justify-between items-center py-3 border-b border-slate-100 text-[#0ea5e9] font-black">
                         <span className="text-sm">Incremento de População (hab.)</span>
                         <span className="text-xl">{formatNumber(overviewMetrics?.popIncrement || 0)}</span>
                       </div>
                       <div className="flex justify-between items-center py-3 text-[#0ea5e9] font-black">
                         <span className="text-sm">Incremento de População (%)</span>
                         <span className="text-xl">
                           {overviewMetrics?.popIncrementPercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
                         </span>
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-[#1a3b83] rounded-[1.5rem] p-8 text-white shadow-sm flex flex-col justify-between">
                       <p className="text-[10px] font-black uppercase tracking-widest text-[#bbd0ff] mb-2">Relatório de Insights</p>
                       <h4 className="font-extrabold text-sm uppercase mb-6">Visão Geral do Consumo</h4>
                       
                       <div className="flex justify-between items-center py-3 border-b border-white/20">
                         <span className="text-sm font-semibold">Consumo Ano {overviewMetrics?.startYear} (L/hab.dia)</span>
                         <span className="text-xl font-black">{formatNumber(overviewMetrics?.startAvgCons || 0)}</span>
                       </div>
                       <div className="flex justify-between items-center py-3 border-b border-white/20">
                         <span className="text-sm font-semibold">Consumo Ano {overviewMetrics?.endYear} (L/hab.dia)</span>
                         <span className="text-xl font-black">{formatNumber(overviewMetrics?.endAvgCons || 0)}</span>
                       </div>
                       <div className="flex justify-between items-center py-3 border-b border-white/20 text-[#60a5fa] font-black">
                         <span className="text-sm">Incremento de Consumo (L/hab.dia)</span>
                         <span className="text-xl">{formatNumber(overviewMetrics?.consIncrement || 0)}</span>
                       </div>
                       <div className="flex justify-between items-center py-3 text-[#60a5fa] font-black">
                         <span className="text-sm">Incremento de Consumo (%)</span>
                         <span className="text-xl">
                           {overviewMetrics?.consIncrementPercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
                         </span>
                       </div>
                    </div>
                    
                    <div className="bg-white rounded-[1.5rem] p-8 text-slate-800 border border-slate-200 shadow-sm flex flex-col justify-between">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Relatório de Insights</p>
                       <h4 className="font-extrabold text-sm uppercase mb-6">Visão Geral das Perdas</h4>
                       
                       <div className="flex justify-between items-center py-3 border-b border-slate-100">
                         <span className="text-sm font-semibold text-slate-500">Perdas Ano {overviewMetrics?.startYear} (%)</span>
                         <span className="text-xl font-black">{formatNumber(overviewMetrics?.startAvgLoss || 0)}%</span>
                       </div>
                       <div className="flex justify-between items-center py-3 border-b border-slate-100">
                         <span className="text-sm font-semibold text-slate-500">Perdas Ano {overviewMetrics?.endYear} (%)</span>
                         <span className="text-xl font-black">{formatNumber(overviewMetrics?.endAvgLoss || 0)}%</span>
                       </div>
                       <div className="flex justify-between items-center py-3 text-[#0ea5e9] font-black">
                         <span className="text-sm">Incremento de Perdas (pp)</span>
                         <span className="text-xl">{formatNumber(overviewMetrics?.lossIncrementPP || 0)} pp</span>
                       </div>
                       <div className="flex justify-between items-center py-3 opacity-0">
                         <span className="text-sm">spacer</span>
                         <span className="text-xl">spacer</span>
                       </div>
                    </div>
                  </div>

                  {analyzeComparisonData.length > 0 && selectedWaterBalanceId && (() => {
                    const activeWb = waterBalances.find(w => isSameWb(w.id, selectedWaterBalanceId));
                    if (!activeWb) return null;
                    return (
                      <div className="bg-white rounded-[1.5rem] border border-slate-200 p-8 shadow-sm flex flex-col mb-8 h-[500px]">
                        <h3 className="font-black text-slate-800 text-lg mb-6 flex items-center gap-2 tracking-tight uppercase">
                          <TrendingUp size={20} className="text-[#0284c7]" />
                          Evolução da Demanda vs. Incremento
                        </h3>
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={analyzeComparisonData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} dy={10} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} tickFormatter={(value) => `${formatNumber(value, 0)}`} width={140} />
                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} tickFormatter={(value) => `${formatNumber(value)}`} width={80} />
                            <Tooltip
                                cursor={{ fill: "#f1f5f9" }}
                                contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", color: "#334155", boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)", padding: "16px", fontWeight: "bold" }}
                                itemStyle={{ fontSize: "13px", padding: "4px 0" }}
                                labelStyle={{ color: "#94a3b8", fontWeight: 800, marginBottom: "8px" }}
                                formatter={(value) => [`${formatNumber(value as number)} L/s`, ""]}
                              />
                            <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px", fontWeight: 700, color: "#64748b" }} />
                            
                            <Bar yAxisId="right" dataKey={`Incremento - ${activeWb.description}`} fill="#0091DA" name={`Incremento`} radius={[4,4,0,0]} barSize={32} />
                            <Line yAxisId="left" type="monotone" dataKey={`Demanda - ${activeWb.description}`} stroke="#16a34a" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} name={`Demanda Total`} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                     <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm flex flex-col h-[400px]">
                       <h3 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-2 tracking-tight">
                         <TrendingUp size={16} className="text-[#0284c7]" />
                         Incremento de População por Subsistema ({overviewMetrics?.endYear} - {overviewMetrics?.startYear}) (hab.)
                       </h3>
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={systemPopulationIncrementData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                           <XAxis dataKey="systemName" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700, angle: -45, textAnchor: "end" }} height={80} interval={0} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 800 }} tickFormatter={(val) => val >= 1000 ? (val/1000).toLocaleString('pt-BR') + ' mil' : val} width={60} />
                           <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontWeight: "bold" }} formatter={(value) => [`${formatNumber(value as number)} hab.`, "Incremento"]} />
                           <Bar dataKey="increment" fill="#008A3F" radius={[6,6,0,0]} barSize={48} />
                         </BarChart>
                       </ResponsiveContainer>
                     </div>
                     
                     <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm flex flex-col h-[400px]">
                       <h3 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-2 tracking-tight">
                         <TrendingUp size={16} className="text-[#0284c7]" />
                         Incremento de População por Região Administrativa ({overviewMetrics?.endYear} - {overviewMetrics?.startYear}) (hab.)
                       </h3>
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={populationIncrementData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                           <XAxis dataKey="regionName" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 8, fontWeight: 700, angle: -45, textAnchor: "end" }} height={110} interval={0} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 800 }} tickFormatter={(val) => val >= 1000 ? (val/1000).toLocaleString('pt-BR') + ' mil' : val} width={50} />
                           <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontWeight: "bold" }} formatter={(value) => [`${formatNumber(value as number)} hab.`, "Incremento"]} />
                           <Bar dataKey="increment" fill="#0091DA" radius={[4,4,0,0]} maxBarSize={32} />
                         </BarChart>
                       </ResponsiveContainer>
                     </div>
                  </div>



                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                     <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm flex flex-col h-[400px]">
                       <h3 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-2 tracking-tight">
                         <TrendingUp size={16} className="text-[#0284c7]" />
                         Incremento de Demanda por Subsistema ({overviewMetrics?.endYear} - {overviewMetrics?.startYear}) (L/s)
                       </h3>
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={systemDemandIncrementData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                           <XAxis dataKey="systemName" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700, angle: -45, textAnchor: "end" }} height={80} interval={0} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 800 }} tickFormatter={(val) => formatNumber(val)} width={50} />
                           <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontWeight: "bold" }} formatter={(value) => [`${formatNumber(value as number)} L/s`, "Incremento"]} />
                           <Bar dataKey="increment" fill="#008A3F" radius={[6,6,0,0]} barSize={48} />
                         </BarChart>
                       </ResponsiveContainer>
                     </div>
                     
                     <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm flex flex-col h-[400px]">
                       <h3 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-2 tracking-tight">
                         <TrendingUp size={16} className="text-[#0284c7]" />
                         Incremento de Demanda por Região Administrativa ({overviewMetrics?.endYear} - {overviewMetrics?.startYear}) (L/s)
                       </h3>
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={demandIncrementData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                           <XAxis dataKey="regionName" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 8, fontWeight: 700, angle: -45, textAnchor: "end" }} height={110} interval={0} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 800 }} tickFormatter={(val) => formatNumber(val)} width={50} />
                           <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontWeight: "bold" }} formatter={(value) => [`${formatNumber(value as number)} L/s`, "Incremento"]} />
                           <Bar dataKey="increment" fill="#0091DA" radius={[4,4,0,0]} maxBarSize={32} />
                         </BarChart>
                       </ResponsiveContainer>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                     <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm flex flex-col h-[400px]">
                       <h3 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-2 tracking-tight">
                         <BarChart3 size={16} className="text-[#0284c7]" />
                         Perdas Média (%) por ano
                       </h3>
                       <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={lossesByYearData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                           <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => val.toFixed(1) + '%'} width={45} />
                           <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontWeight: "bold" }} formatter={(value) => [`${(value as number).toFixed(2)}%`, "Perdas Média"]} />
                           <Line type="monotone" dataKey="perdasMedia" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} />
                         </LineChart>
                       </ResponsiveContainer>
                     </div>
                     <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm flex flex-col h-[400px]">
                       <h3 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-2 tracking-tight">
                         <BarChart3 size={16} className="text-[#0284c7]" />
                         Perdas Média: Ano Inicial vs Final por Subsistema
                       </h3>
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={systemLossesData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                           <XAxis dataKey="systemName" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700, angle: -45, textAnchor: "end" }} height={80} interval={0} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => val.toFixed(1) + '%'} width={45} />
                           <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontWeight: "bold" }} formatter={(value, name) => [`${(value as number).toFixed(2)}%`, name]} />
                           <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px", fontWeight: 700, color: "#64748b" }} />
                           <Bar dataKey="startLoss" fill="#0091DA" radius={[4,4,0,0]} name="Ano Inicial" />
                           <Bar dataKey="endLoss" fill="#008A3F" radius={[4,4,0,0]} name="Ano Final" />
                         </BarChart>
                       </ResponsiveContainer>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
                    <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm">
                      <h3 className="font-black text-slate-800 text-sm mb-4">Quadro Resumo: Demanda por Sistema (Ano Inicial: {overviewMetrics?.startYear})</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold rounded-t-xl">
                            <tr>
                              <th className="px-4 py-3 first:rounded-tl-xl">Sistema</th>
                              <th className="px-4 py-3 text-right">Demanda Total (L/s)</th>
                              <th className="px-4 py-3 text-right last:rounded-tr-xl">% da Demanda Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {[...systemDemandIncrementData]
                              .sort((a, b) => b.startDemand - a.startDemand)
                              .map((sys: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-700">{sys.systemName}</td>
                                <td className="px-4 py-3 text-right font-mono text-slate-600">{formatNumber(sys.startDemand)}</td>
                                <td className="px-4 py-3 text-right font-mono text-slate-600 font-bold">
                                  {overviewMetrics?.startDemand ? ((sys.startDemand / overviewMetrics.startDemand) * 100).toFixed(2) : '0.00'}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 border-t border-slate-200">
                            <tr>
                              <td className="px-4 py-3 font-black text-slate-800 rounded-bl-xl">TOTAL</td>
                              <td className="px-4 py-3 text-right font-mono text-slate-800 font-black">{formatNumber(overviewMetrics?.startDemand || 0)}</td>
                              <td className="px-4 py-3 text-right font-mono text-slate-800 font-black rounded-br-xl">100.00%</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm">
                      <h3 className="font-black text-slate-800 text-sm mb-4">Quadro Resumo: Demanda por Sistema (Ano Final: {overviewMetrics?.endYear})</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold rounded-t-xl">
                            <tr>
                              <th className="px-4 py-3 first:rounded-tl-xl">Sistema</th>
                              <th className="px-4 py-3 text-right">Demanda Total (L/s)</th>
                              <th className="px-4 py-3 text-right last:rounded-tr-xl">% da Demanda Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {[...systemDemandIncrementData]
                              .sort((a, b) => b.endDemand - a.endDemand)
                              .map((sys: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-700">{sys.systemName}</td>
                                <td className="px-4 py-3 text-right font-mono text-slate-600">{formatNumber(sys.endDemand)}</td>
                                <td className="px-4 py-3 text-right font-mono text-slate-600 font-bold">
                                  {overviewMetrics?.endDemand ? ((sys.endDemand / overviewMetrics.endDemand) * 100).toFixed(2) : '0.00'}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 border-t border-slate-200">
                            <tr>
                              <td className="px-4 py-3 font-black text-slate-800 rounded-bl-xl">TOTAL</td>
                              <td className="px-4 py-3 text-right font-mono text-slate-800 font-black">{formatNumber(overviewMetrics?.endDemand || 0)}</td>
                              <td className="px-4 py-3 text-right font-mono text-slate-800 font-black rounded-br-xl">100.00%</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {analyzeSubTab === "supply" && (
  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
        <div className="p-3 bg-adasa-50 rounded-xl">
          <Database size={24} className="text-adasa-mid" />
        </div>
        <div>
          <h3 className="font-black text-slate-800 text-lg uppercase tracking-tighter">
            Visão Geral da Oferta
          </h3>
          <p className="text-sm font-medium text-slate-500">
            Análise detalhada da oferta de água por subsistema e sua evolução.
          </p>
        </div>
      </div>

      {analyzeSupplyData.overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Oferta Ano Inicial: {analyzeSupplyData.overview.startYear} (L/s)</p>
                <div className="text-2xl font-black text-slate-800">{formatNumber(analyzeSupplyData.overview.startSupply)}</div>
            </div>
            <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Oferta Ano Final: {analyzeSupplyData.overview.endYear} (L/s)</p>
                <div className="text-2xl font-black text-slate-800">{formatNumber(analyzeSupplyData.overview.endSupply)}</div>
            </div>
            <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Incremento de Oferta (L/s)</p>
                <div className="text-2xl font-black text-adasa-green">{formatNumber(analyzeSupplyData.overview.increment)}</div>
            </div>
            <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Incremento de Oferta (%)</p>
                <div className="text-2xl font-black text-adasa-mid">{analyzeSupplyData.overview.incrementPercentage.toFixed(2)}%</div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm flex flex-col h-[400px]">
          <h3 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-2 tracking-tight">
            <BarChart3 size={16} className="text-[#0284c7]" />
            Evolução da Oferta vs. Incremento
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analyzeSupplyData.evolution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => formatNumber(val)} width={50} domain={[5000, 20000]} />
              <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontWeight: "bold" }} formatter={(value, name) => [`${formatNumber(value as number)} L/s`, name]} />
              <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px", fontWeight: 700, color: "#64748b" }} />
              <Bar yAxisId="left" dataKey="Incremento de Oferta" fill="#008A3F" radius={[4,4,0,0]} stackId="a" />
              <Line yAxisId="left" type="monotone" dataKey="Q Outorgada" stroke="#1A3E8A" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} />
              <Line yAxisId="left" type="monotone" dataKey="Oferta" stroke="#0091DA" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm flex flex-col h-[400px]">
          <h3 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-2 tracking-tight">
            <BarChart3 size={16} className="text-adasa-green" />
            Incremento de Oferta por Subsistema ({analyzeSupplyData.overview?.endYear} - {analyzeSupplyData.overview?.startYear}) (L/s)
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analyzeSupplyData.systemIncrement}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
              <XAxis dataKey="systemName" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700, angle: -45, textAnchor: "end" }} height={80} interval={0} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => formatNumber(val)} width={50} />
              <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontWeight: "bold" }} formatter={(value) => [`${formatNumber(value as number)} L/s`, "Incremento"]} />
              <Bar dataKey="increment" fill="#008A3F" radius={[4,4,0,0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm">
          <h3 className="font-black text-slate-800 text-sm mb-4">Quadro Resumo: Oferta por Sistema (Ano Inicial: {analyzeSupplyData.overview?.startYear})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold rounded-t-xl">
                <tr>
                  <th className="px-4 py-3 first:rounded-tl-xl">Sistema</th>
                  <th className="px-4 py-3 text-right">Oferta Total (L/s)</th>
                  <th className="px-4 py-3 text-right last:rounded-tr-xl">% da Oferta Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analyzeSupplyData.systemDistributionStart.map((sys: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-700">{sys.systemName}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{formatNumber(sys.supply)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600 font-bold">{sys.percentage.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td className="px-4 py-3 font-black text-slate-800 rounded-bl-xl">TOTAL</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-800 font-black">{formatNumber(analyzeSupplyData.overview?.startSupply || 0)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-800 font-black rounded-br-xl">100.00%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
        <div className="bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm">
          <h3 className="font-black text-slate-800 text-sm mb-4">Quadro Resumo: Oferta por Sistema (Ano Final: {analyzeSupplyData.overview?.endYear})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold rounded-t-xl">
                <tr>
                  <th className="px-4 py-3 first:rounded-tl-xl">Sistema</th>
                  <th className="px-4 py-3 text-right">Oferta Total (L/s)</th>
                  <th className="px-4 py-3 text-right last:rounded-tr-xl">% da Oferta Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analyzeSupplyData.systemDistributionEnd.map((sys: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-700">{sys.systemName}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{formatNumber(sys.supply)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600 font-bold">{sys.percentage.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td className="px-4 py-3 font-black text-slate-800 rounded-bl-xl">TOTAL</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-800 font-black">{formatNumber(analyzeSupplyData.overview?.endSupply || 0)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-800 font-black rounded-br-xl">100.00%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
)}


              {analyzeSubTab === "adjustments" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-adasa-50 rounded-xl">
                          <TrendingUp size={24} className="text-adasa-mid" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-800 text-lg uppercase tracking-tighter flex items-center gap-4">
                            Diagrama de Ajustes Operacionais
                          </h3>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center w-full mt-8 mb-12">
                      <p className="font-black text-slate-800 text-lg uppercase tracking-tighter">
                        Balanço Hídrico no ano {analyzeBalanceYear}
                      </p>
                    </div>
                
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-16 pt-4">
                      {[...analyzeBalanceSystemSaldoData].sort((a, b) => {
                        const order = [
                          'Descoberto-Corumbá',
                          'Torto-Santa Maria-Bananal',
                          'Sobradinho-Planaltina',
                          'Paranoá Norte',
                          'Paranoá Sul',
                          'Brazlândia'
                        ];
                        const idxA = order.indexOf(a.systemName);
                        const idxB = order.indexOf(b.systemName);
                        return (idxA !== -1 ? idxA : order.length) - (idxB !== -1 ? idxB : order.length);
                      }).map(sysData => {
                        const systemId = sysData.systemId;
                        const sysAdjustments = operationalAdjustments.filter(adj => {
                          const wbMatch = isSameWb(adj.waterBalanceId, analyzeBalanceId);
                          return wbMatch && adj.systemId === systemId;
                        }).sort((a,b) => a.startYear - b.startYear);
                        
                        const chartData = [
                          { name: 'Oferta', valor: sysData.oferta, fill: '#0091DA' },
                          { name: 'Demanda', valor: sysData.demanda, fill: '#1A3E8A' },
                          { name: 'Saldo', valor: sysData.saldo, fill: sysData.saldo < 0 ? '#ef4444' : '#008A3F' }
                        ];

                        return (
                          <div key={systemId} className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                            <div className="flex justify-center w-full mb-6 pb-4 border-b border-slate-200/60">
                              <h4 className="font-black tracking-tight text-slate-800 text-lg capitalize text-center">
                                {sysData.systemName}
                              </h4>
                            </div>
                            <div className="flex flex-col md:flex-row w-full gap-8 items-stretch justify-center">
                              {/* Left: Bar Chart */}
                              <div className="flex-1 w-full max-w-[280px] border border-slate-200 rounded-xl flex flex-col p-2 relative bg-white shadow-sm">
                                <div className="h-48 w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#334155' }} />
                                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => formatNumber(v, 0)} />
                                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 600 }} formatter={(v: number) => [`${formatNumber(v as number, 1)} L/s`, 'Valor']} />
                                      <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        {chartData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                              
                              {/* Right: Adjustments Table/List */}
                              <div className="flex-1 w-full max-w-[280px] flex flex-col items-center">
                                <h4 className="font-medium text-slate-600 text-[13px] capitalize tracking-widest mb-3 leading-none">Ajustes Operacionais</h4>
                                <div className="w-full border-[3px] border-slate-200 rounded-[2rem] p-4 flex flex-col overflow-hidden relative min-h-[180px] flex-1 bg-white">
                                  <div className="overflow-y-auto flex-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-200 pr-1">
                                    {sysAdjustments.length > 0 ? sysAdjustments.map(adj => {
                                        const isActive = analyzeBalanceYear && analyzeBalanceYear >= adj.startYear && analyzeBalanceYear <= adj.endYear;
                                        return (
                                          <div key={adj.id} className={cn("text-[11px] p-2 rounded-lg border", isActive ? "bg-adasa-green/10 border-adasa-green text-adasa-dark shadow-sm" : "bg-slate-50 border-slate-100 text-slate-500")}>
                                            <div className="flex justify-between items-center mb-1">
                                              <span className="font-black uppercase">{adj.startYear}-{adj.endYear}</span>
                                              <span className={cn("font-bold", Number(adj.flowValue) < 0 ? "text-rose-500" : (Number(adj.flowValue) > 0 ? "text-adasa-green" : ""))}>{formatNumber(adj.flowValue, 1)} L/s</span>
                                            </div>
                                            <div className="font-medium leading-tight">
                                              {adj.description || adj.type}
                                            </div>
                                          </div>
                                        );
                                    }) : (
                                      <div className="text-slate-400 text-xs text-center mt-6 italic">Sem ajustes</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-16 pt-8 border-t border-slate-100">
                      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
                        <div className="p-3 bg-adasa-50 rounded-xl">
                          <TrendingUp size={24} className="text-adasa-mid" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-800 text-lg uppercase tracking-tighter flex items-center gap-4">
                            Linha do Tempo de Ajustes Operacionais
                          </h3>
                        </div>
                      </div>
                      <div className="flex flex-col relative before:absolute before:inset-0 before:ml-6 md:before:ml-[50%] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent pt-6">
                        {(() => {
                          const filteredAdjustments = operationalAdjustments.filter(adj => {
                            const wbMatch = isSameWb(adj.waterBalanceId, analyzeBalanceId);
                            const sysMatch = analyzeSystemIds.length === 0 || analyzeSystemIds.includes(adj.systemId);
                            const typeMatch = analyzeAdjustmentTypes.length === 0 || analyzeAdjustmentTypes.includes(adj.type);
                            const yearMatch = analyzeBalanceYear ? (analyzeBalanceYear >= adj.startYear && analyzeBalanceYear <= adj.endYear) : true;
                            return wbMatch && sysMatch && typeMatch && yearMatch;
                          });
                          
                          const years = Array.from(new Set(filteredAdjustments.map(a => a.startYear))).sort((a,b) => Number(a) - Number(b));
                          
                          if (years.length === 0) {
                            return (
                              <div className="text-center py-10 px-4">
                                <p className="text-slate-500 font-medium">Nenhum ajuste operacional encontrado para os filtros selecionados.</p>
                              </div>
                            );
                          }
                          
                          const typeColors: Record<AdjustmentType, string> = {
                            'Aumento da vazão': 'text-adasa-green border-adasa-green',
                            'Redução da vazão': 'text-red-500 border-red-500',
                            'Transferência': 'text-[#0ea5e9] border-[#0ea5e9]'
                          };
  
                          return years.map((year, index) => {
                            const yearAdjustments = filteredAdjustments.filter(a => a.startYear === year);
                            
                            return (
                              <div key={year} className="relative flex items-center justify-between md:justify-center group mb-8 last:mb-0">
                                
                                <div className="flex items-center justify-center w-12 h-12 rounded-full border-[3px] border-white bg-slate-100 group-odd:border-adasa-mid group-even:border-[#0ea5e9] text-adasa-dark shadow-md shrink-0 z-10 overflow-hidden md:absolute md:left-1/2 md:-translate-x-1/2">
                                  <span className="text-[11px] font-black text-slate-500">{year}</span>
                                </div>
                                
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-xl bg-white border border-slate-100 text-left md:group-odd:mr-auto md:group-even:ml-auto">
                                  <div className="mb-4 text-left">
                                    <h4 className="font-black text-slate-800 text-xl tracking-tight" style={{ color: '#1A3E8A' }}>
                                        {year}
                                    </h4>
                                    <div className="w-full border-b-[1px] border-dashed border-slate-200 mt-2 mb-4"></div>
                                  </div>
                                  
                                  <div className="flex flex-col gap-4">
                                    {yearAdjustments.map(adj => {
                                        const system = systems.find(s => s.id === adj.systemId);
                                        const colorClass = typeColors[adj.type] || 'text-slate-500 border-slate-500';
                                        
                                        return (
                                          <div key={adj.id} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col gap-2 relative overflow-hidden">
                                            <div className="flex justify-between items-start gap-4 mb-3">
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border-[1px] ${colorClass} bg-transparent`}>
                                                  {adj.type}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="font-bold text-slate-600 text-xs tracking-wide uppercase">
                                                    {system?.name}
                                                    {adj.description && <span className="block mt-1 font-medium text-[11px] normal-case text-slate-500">{adj.description}</span>}
                                                </span>
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    Vazão
                                                </span>
                                                <span className={cn("font-black text-sm", Number(adj.flowValue) < 0 ? "text-rose-500" : (Number(adj.flowValue) > 0 ? "text-adasa-green" : "text-slate-800"))}>
                                                  {formatNumber(adj.flowValue, 2)} L/s
                                                </span>
                                            </div>
                                          </div>
                                        );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {analyzeSubTab === "map" && (
                <MapTab 
                  waterBalanceId={analyzeBalanceId}
                  systemSaldoData={analyzeBalanceSystemSaldoData}
                  systemSaldoDataAllYears={analyzeBalanceSystemSaldoDataAllYears}
                  availableYears={analyzeBalanceAvailableYears}
                  currentYear={analyzeBalanceYear}
                  onYearChange={setAnalyzeBalanceYear}
                  balanceName={waterBalances.find((w) => w.id === analyzeBalanceId)?.description}
                />
              )}
{analyzeSubTab === "balance" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
                  <div className="p-3 bg-adasa-50 rounded-xl">
                    <TrendingUp size={24} className="text-adasa-mid" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tighter flex items-center gap-4">
                      Evolução: Oferta vs Demanda Total
                      <button 
                        onClick={() => setIsAnimating(!isAnimating)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs tracking-wider uppercase transition-all duration-300 transform",
                          isAnimating ? "bg-adasa-green text-white shadow-lg shadow-adasa-green/30 scale-105" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300"
                        )}
                        title="Alternar filtro por subsistemas a cada 10s"
                      >
                        <RotateCcw size={14} className={cn(isAnimating && "animate-spin [animation-duration:10s]")} />
                        {isAnimating ? "Animação Ativa" : "Animação"}
                      </button>
                    </h3>
                    <p className="text-sm font-medium text-slate-500">
                      Análise entre oferta e demanda projetadas ao longo do tempo.
                    </p>
                  </div>
                </div>

                

                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analyzeBalanceAnalysisData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="year"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 700 }}
                        dy={10}
                      />
                      <YAxis
                        yAxisId="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 700 }}
                        tickFormatter={(value) => `${formatNumber(value, 0)} L/s`}
                        width={130}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 700 }}
                        tickFormatter={(value) => `${value.toFixed(1)}%`}
                        width={50}
                        domain={[0, 100]}
                      />
                      <YAxis yAxisId="hidden" hide={true} />
                      <Tooltip
                        wrapperStyle={{ zIndex: 100 }}
                        content={(props) => {
                          const { active, payload, label } = props;
                          if (!active || !payload || !payload.length) return null;

                          const sortedPayload = [...payload].sort((a, b) => {
                            const getOrder = (name: string) => {
                              const parts = name.split(' - ');
                              const demandDesc = parts.length > 1 ? parts.slice(1).join(' - ') : '';
                              const demandIdx = waterBalances.findIndex(w => w.description === demandDesc);
                              const baseIdx = demandIdx >= 0 ? demandIdx * 10 : 900;
                              if (name.startsWith('Oferta')) return baseIdx + 1;
                              if (name.startsWith('Demanda') && !name.includes('habitantes')) return baseIdx + 2;
                              if (name.startsWith('Demanda (habitantes)')) return baseIdx + 3;
                              if (name.startsWith('Saldo') && !name.includes('habitantes') && !name.includes('%')) return baseIdx + 4;
                              if (name.startsWith('Saldo (habitantes)')) return baseIdx + 5;
                              if (name.startsWith('Saldo (%)') || name.startsWith('IAD')) return baseIdx + 6;
                              return baseIdx + 7;
                            };
                            return getOrder(a.name) - getOrder(b.name);
                          });

                          const groups: Record<string, any[]> = {};
                          sortedPayload.forEach(item => {
                            const name = item.name as string;
                            const parts = name.split(' - ');
                            const demandDesc = parts.length > 1 ? parts.slice(1).join(' - ') : 'Outro';
                            
                            if (!groups[demandDesc]) {
                              groups[demandDesc] = [];
                            }
                            
                            let formattedValue: any = `${formatNumber(item.value)} L/s`;
                            let formattedName = name;
                            if (name.includes('Demanda (habitantes)')) {
                               formattedValue = `${formatInteger(item.value)} hab.`;
                            } else if (name.includes('Saldo (%)') || name.startsWith('IAD')) {
                               formattedValue = formatSaldoValue(item.value, 'percent', true);
                            } else if (name.includes('Saldo (habitantes)')) {
                               formattedValue = formatSaldoValue(item.value, 'hab', true);
                            } else if (name.includes('Saldo')) {
                               formattedValue = formatSaldoValue(item.value, 'ls', true);
                               formattedName = name.replace('Saldo', 'Saldo (L/s)');
                            }
                            
                            formattedName = formattedName.split(' - ')[0];

                            groups[demandDesc].push({
                              ...item,
                              formattedName,
                              formattedValue
                            });
                          });

                          return (
                            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", color: "#334155", boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)", padding: "16px", zIndex: 100, position: 'relative' }}>
                              <p style={{ color: "#94a3b8", fontWeight: 800, marginBottom: "12px", fontSize: "14px" }}>{label}</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {Object.entries(groups).map(([demand, items], i) => (
                                  <div key={i}>
                                    <h4 style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", marginBottom: "8px", borderBottom: '1px solid #f1f5f9', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                                      {demand}
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      {items.map((item, j) => (
                                        <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: "13px", fontWeight: 600, gap: '24px' }}>
                                          <span style={{ color: item.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            
                                            {item.formattedName}
                                          </span>
                                          <span>{item.formattedValue}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Legend
                        wrapperStyle={{
                          paddingTop: "20px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                        onClick={handleLegendClickAnalyze}
                      />
                      {waterBalances
                        .filter((wb) => wb.id === analyzeBalanceId)
                        .map((wb, i) => {
                          const colors = ["#0091DA", "#1A3E8A", "#008A3F", "#45C4F6", "#f59e0b", "#94a3b8", "#ef4444"];
                          return [
                            <Bar
                              key={`iad-${wb.id}`}
                              yAxisId="right"
                              dataKey={`IAD - ${wb.description}`}
                              fill="#64748b"
                              radius={[4,4,0,0]}
                              name={`Saldo (%) - ${wb.description}`}
                              hide={hiddenSeriesAnalyze[`IAD - ${wb.description}`]}
                            >
                              {analyzeBalanceAnalysisData.map((entry, index) => {
                                const val = entry[`IAD - ${wb.description}`];
                                let color = "#10b981"; // green (Risco Baixo > 130)
                                const iadValue = (val || 0) + 100;
                                if (iadValue < 120) {
                                  color = "#ef4444"; // red (Risco Alto < 120)
                                } else if (iadValue >= 120 && iadValue <= 130) {
                                  color = "#eab308"; // yellow/amber (Risco Médio 120-130)
                                }
                                return <Cell key={`cell-${index}`} fill={color} />;
                              })}
                            </Bar>,
                            <Line
                              key={`dem-${wb.id}`}
                              yAxisId="left"
                              type="monotone"
                              dataKey={`Demanda - ${wb.description}`}
                              stroke="#1A3E8A"
                              strokeWidth={3}
                              dot={{ r: 4, strokeWidth: 2 }}
                              activeDot={{ r: 6 }}
                              name={`Demanda - ${wb.description}`}
                              hide={hiddenSeriesAnalyze[`Demanda - ${wb.description}`]}
                            />,
                            <Line
                              key={`sup-${wb.id}`}
                              yAxisId="left"
                              type="monotone"
                              dataKey={`Oferta - ${wb.description}`}
                              stroke="#0091DA"
                              strokeWidth={3}
                              strokeDasharray="5 5"
                              dot={{ r: 4, strokeWidth: 2 }}
                              activeDot={{ r: 6 }}
                              name={`Oferta - ${wb.description}`}
                              hide={hiddenSeriesAnalyze[`Oferta - ${wb.description}`]}
                            />,
                            <Line
                              key={`saldo-${wb.id}`}
                              yAxisId="left"
                              type="monotone"
                              dataKey={`Saldo - ${wb.description}`}
                              stroke="#64748b"
                              strokeWidth={0}
                              opacity={0}
                              dot={false}
                              activeDot={false}
                              legendType="none"
                              name={`Saldo - ${wb.description}`}
                              hide={hiddenSeriesAnalyze[`Demanda - ${wb.description}`] && hiddenSeriesAnalyze[`Oferta - ${wb.description}`]}
                            />,
                            <Line
                              key={`saldohab-${wb.id}`}
                              yAxisId="hidden"
                              type="monotone"
                              dataKey={`Saldo (habitantes) - ${wb.description}`}
                              stroke="#64748b"
                              strokeWidth={0}
                              opacity={0}
                              dot={false}
                              activeDot={false}
                              legendType="none"
                              name={`Saldo (habitantes) - ${wb.description}`}
                              hide={hiddenSeriesAnalyze[`Demanda - ${wb.description}`] && hiddenSeriesAnalyze[`Oferta - ${wb.description}`]}
                            />,
                            <Line
                              key={`pop-${wb.id}`}
                              yAxisId="hidden"
                              type="monotone"
                              dataKey={`Demanda (habitantes) - ${wb.description}`}
                              stroke="#64748b"
                              strokeWidth={0}
                              opacity={0}
                              dot={false}
                              activeDot={false}
                              legendType="none"
                              name={`Demanda (habitantes) - ${wb.description}`}
                              hide={hiddenSeriesAnalyze[`Demanda - ${wb.description}`]}
                            />
                          ];
                        })}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>


                <div className="mt-8 bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm">
                  <h3 className="font-black text-slate-800 text-sm mb-4">Quadro Resumo: Evolução: Oferta vs Demanda Total e Saldo (%)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold rounded-t-xl">
                        <tr>
                          <th className="px-4 py-3 first:rounded-tl-xl w-24">Ano</th>
                          <th className="px-4 py-3 text-right">Oferta (L/s)</th>
                          <th className="px-4 py-3 text-right">Demanda (L/s)</th>
                          <th className="px-4 py-3 text-right">Demanda (hab.)</th>
                          <th className="px-4 py-3 text-right">Saldo (L/s)</th>
                          <th className="px-4 py-3 text-right">Saldo (hab.)</th>
                          <th className="px-4 py-3 text-right">Saldo (%)</th>
                          <th className="px-4 py-3 text-center w-48">Classificação de Risco</th>
                          <th className="px-4 py-3 w-1/5 last:rounded-tr-xl animate-none">Proporção</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analyzeBalanceAnalysisData.map((dataRow: any, idx: number) => {
                          const wb = waterBalances.find(w => w.id === analyzeBalanceId);
                          if (!wb) return null;
                          const oferta = dataRow[`Oferta - ${wb.description}`] || 0;
                          const demanda = dataRow[`Demanda - ${wb.description}`] || 0;
                          const demandaHab = dataRow[`Demanda (habitantes) - ${wb.description}`] || 0;
                          const saldo = oferta - demanda;
                          const saldoHab = dataRow[`Saldo (habitantes) - ${wb.description}`] || 0;
                          const iad = dataRow[`IAD - ${wb.description}`] || 0;
                          
                          // Determine a max scale, let's say up to 100% for full bar
                          const absoluteIad = Math.abs(iad);
                          const barWidth = Math.min(100, absoluteIad);

                          // Iad indicator is Saldo (%) + 100
                          const iadValue = iad + 100;
                          
                          let riskText = "Risco Baixo (Adequado)";
                          let riskDotColor = "bg-green-500 shadow-green-500/40";
                          let riskBadgeColor = "bg-green-50 text-green-700 border-green-200";

                          if (iadValue < 120) {
                            riskText = "Risco Alto (Crítico)";
                            riskDotColor = "bg-red-500 shadow-red-500/40";
                            riskBadgeColor = "bg-red-50 text-red-700 border-red-200";
                          } else if (iadValue >= 120 && iadValue <= 130) {
                            riskText = "Risco Médio (Alerta)";
                            riskDotColor = "bg-yellow-500 shadow-yellow-500/40";
                            riskBadgeColor = "bg-yellow-50 text-yellow-700 border-yellow-200";
                          }

                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-700">{dataRow.year}</td>
                              <td className="px-4 py-3 text-right font-mono text-slate-600">{formatNumber(oferta)}</td>
                              <td className="px-4 py-3 text-right font-mono text-slate-600">{formatNumber(demanda)}</td>
                              <td className="px-4 py-3 text-right font-mono text-slate-600">{formatInteger(demandaHab)}</td>
                              <td className="px-4 py-3 text-right font-mono font-bold">
                                {formatSaldoValue(saldo, 'ls', false)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold">
                                {formatSaldoValue(saldoHab, 'hab', false)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold">
                                {formatSaldoValue(iad, 'percent', false)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm transition-all",
                                  riskBadgeColor
                                )}>
                                  <span className={cn("w-2 h-2 rounded-full inline-block shadow", riskDotColor)} />
                                  {riskText}
                                </span>
                              </td>
                              <td className="px-4 py-3 w-1/5">
                                <div className="w-full bg-slate-100 rounded-full h-2 flex items-center">
                                  <div 
                                    className="h-2 rounded-full"
                                    style={{ 
                                      width: `${barWidth}%`, 
                                      backgroundColor: iadValue < 120 ? '#ef4444' : (iadValue <= 130 ? '#eab308' : '#10b981') 
                                    }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Referencial de Risco / Justificativas do banco */}
                  <div className="mt-8 border-t border-slate-100 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Metodologia e Diretrizes de Segurança</span>
                        <h4 className="text-sm font-black text-slate-800">Referencial Populacional e Hidráulico (Tabela: risk_references)</h4>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Sincronizado via PostgreSQL
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {riskReferences.length > 0 ? (
                        riskReferences.map((refItem) => {
                          let cardBorder = "border-green-200 bg-green-50/10";
                          let dotColor = "bg-green-500 shadow-green-500/50";
                          let labelColor = "text-green-800 bg-green-50/80 border-green-200/50";
                          
                          if (refItem.riskClassification.includes("Alto") || refItem.riskClassification.includes("Crítico")) {
                            cardBorder = "border-red-200 bg-red-50/10";
                            dotColor = "bg-red-500 shadow-red-500/50";
                            labelColor = "text-red-800 bg-red-50/80 border-red-200/50";
                          } else if (refItem.riskClassification.includes("Médio") || refItem.riskClassification.includes("Alerta")) {
                            cardBorder = "border-yellow-200 bg-yellow-50/10";
                            dotColor = "bg-yellow-500 shadow-yellow-500/50";
                            labelColor = "text-yellow-800 bg-yellow-50/80 border-yellow-200/50";
                          }

                          return (
                            <div key={refItem.id} className={cn("border rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-md hover:scale-[1.01] hover:bg-white duration-200", cardBorder)}>
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <span className={cn("w-2.5 h-2.5 rounded-full inline-block shadow animate-none", dotColor)} />
                                  <span className={cn("text-xs font-black uppercase tracking-wide px-2 py-0.5 border rounded-lg", labelColor)}>{refItem.riskClassification}</span>
                                  <span className="text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg font-mono font-black text-slate-700 block ml-auto">{refItem.iad}</span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed font-normal mt-2">
                                  {refItem.justification.replace(/\*\*/g, '')}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <>
                          <div className="border border-red-200 bg-red-50/10 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                              <span className="text-xs font-black uppercase text-red-800 bg-red-50 border rounded-lg px-2 py-0.5">Risco Alto (Crítico)</span>
                              <span className="text-xs bg-slate-100 border px-2 py-0.5 rounded-lg font-mono font-black block ml-auto">&lt; 120%</span>
                            </div>
                            <p className="text-[11px] text-slate-500">Carregando referencial analítico clássico...</p>
                          </div>
                          <div className="border border-yellow-200 bg-yellow-50/10 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                              <span className="text-xs font-black uppercase text-yellow-800 bg-yellow-50 border rounded-lg px-2 py-0.5">Risco Médio (Alerta)</span>
                              <span className="text-xs bg-slate-100 border px-2 py-0.5 rounded-lg font-mono font-black block ml-auto">120% a 130%</span>
                            </div>
                            <p className="text-[11px] text-slate-500">Carregando referencial analítico clássico...</p>
                          </div>
                          <div className="border border-green-200 bg-green-50/10 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                              <span className="text-xs font-black uppercase text-green-800 bg-green-50 border rounded-lg px-2 py-0.5">Risco Baixo (Adequado)</span>
                              <span className="text-xs bg-slate-100 border px-2 py-0.5 rounded-lg font-mono font-black block ml-auto">&gt; 130%</span>
                            </div>
                            <p className="text-[11px] text-slate-500">Carregando referencial analítico clássico...</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm">
                  <div className="flex flex-col gap-6 mb-6 border-b border-slate-100 pb-6">
                    <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 tracking-tight">
                      <BarChart3 size={16} className="text-[#0284c7]" />
                      Saldo por Subsistema (L/s)
                    </h3>
                    
                    {analyzeBalanceAvailableYears.length > 0 && analyzeBalanceYear !== null && (
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap gap-2">
                          {analyzeBalanceAvailableYears.map(year => (
                            <button
                              key={year}
                              onClick={() => setAnalyzeBalanceYear(year)}
                              className={cn(
                                "px-3 py-1 text-xs font-bold rounded-lg transition-all border",
                                analyzeBalanceYear === year 
                                  ? "bg-adasa-mid text-white border-adasa-mid" 
                                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                              )}
                            >
                              {year}
                            </button>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-4 px-2">
                          <span className="text-xs font-bold text-slate-500">{analyzeBalanceAvailableYears[0]}</span>
                          <input
                            type="range"
                            min={analyzeBalanceAvailableYears[0]}
                            max={analyzeBalanceAvailableYears[analyzeBalanceAvailableYears.length - 1]}
                            value={analyzeBalanceYear}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              const nearest = analyzeBalanceAvailableYears.reduce((prev, curr) => 
                                Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev
                              );
                              setAnalyzeBalanceYear(nearest);
                            }}
                            className="flex-1 accent-adasa-mid"
                          />
                          <span className="text-xs font-bold text-slate-500">{analyzeBalanceAvailableYears[analyzeBalanceAvailableYears.length - 1]}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={analyzeBalanceSystemSaldoData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                        <XAxis dataKey="systemName" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700, angle: -45, textAnchor: "end" }} height={80} interval={0} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => formatNumber(val)} width={50} />
                        <YAxis yAxisId="hidden" hide={true} />
                        <Tooltip 
                          cursor={{ fill: "#f1f5f9" }} 
                          contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", padding: "16px" }}
                          itemStyle={{ fontSize: "13px", fontWeight: 600, padding: "4px 0" }}
                          labelStyle={{ color: "#1A3E8A", fontWeight: 800, marginBottom: "8px" }}
                          itemSorter={(item) => {
                            const name = item.name as string;
                            if (name === 'Oferta') return 1;
                            if (name === 'Demanda') return 2;
                            if (name === 'Demanda (habitantes)') return 3;
                            if (name === 'Saldo (L/s)') return 4;
                            if (name === 'Saldo (habitantes)') return 5;
                            if (name === 'Saldo (%)') return 6;
                            return 7;
                          }}
                          formatter={(value: number, name: string) => {
                            if (name === 'Demanda (habitantes)') return [`${formatInteger(value)} hab.`, 'Demanda (habitantes)'];
                            if (name === 'Saldo (%)') return [formatSaldoValue(value, 'percent'), name];
                            if (name === 'Saldo (habitantes)') return [formatSaldoValue(value, 'hab'), name];
                            if (name === 'Saldo (L/s)') return [formatSaldoValue(value, 'ls'), name];
                            return [`${formatNumber(value)} L/s`, name];
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px", fontWeight: 700, color: "#64748b" }} />
                        
                        <Line
                          yAxisId="hidden"
                          type="monotone"
                          dataKey="oferta"
                          stroke="#64748b"
                          strokeWidth={0}
                          opacity={0}
                          dot={false}
                          activeDot={false}
                          legendType="none"
                          name="Oferta"
                        />
                        <Line
                          yAxisId="hidden"
                          type="monotone"
                          dataKey="demanda"
                          stroke="#64748b"
                          strokeWidth={0}
                          opacity={0}
                          dot={false}
                          activeDot={false}
                          legendType="none"
                          name="Demanda"
                        />
                        <Line
                          yAxisId="hidden"
                          type="monotone"
                          dataKey="demandaHabitantes"
                          stroke="#64748b"
                          strokeWidth={0}
                          opacity={0}
                          dot={false}
                          activeDot={false}
                          legendType="none"
                          name="Demanda (habitantes)"
                        />
                        <Line
                          yAxisId="hidden"
                          type="monotone"
                          dataKey="saldoHabitantes"
                          stroke="#64748b"
                          strokeWidth={0}
                          opacity={0}
                          dot={false}
                          activeDot={false}
                          legendType="none"
                          name="Saldo (habitantes)"
                        />
                        <Line
                          yAxisId="hidden"
                          type="monotone"
                          dataKey="iad"
                          stroke="#64748b"
                          strokeWidth={0}
                          opacity={0}
                          dot={false}
                          activeDot={false}
                          legendType="none"
                          name="Saldo (%)"
                        />
                        <Bar yAxisId={0} dataKey="saldo" name="Saldo (L/s)" fill="#64748b">
                          <LabelList 
                            dataKey="saldo" 
                            content={(props: any) => {
                              const { x, y, width, height, value } = props;
                              if (x == null || y == null) return null;
                              const isNegative = value < 0;
                              // In recharts, for a positive vertical bar, 'y' is the top of the bar.
                              // For a negative bar, 'y' is the 0-axis and 'height' extends downwards.
                              const yPos = isNegative ? y + height + 12 : y - 4;
                              return (
                                <text x={x + width / 2} y={yPos} fill="#475569" fontSize={11} fontWeight={800} textAnchor="middle">
                                  {formatNumber(value)}
                                </text>
                              );
                            }} 
                          />
                          {
                            analyzeBalanceSystemSaldoData.map((entry, index) => {
                              const iadVal = entry.iad || 0;
                              const iadValue = iadVal + 100;
                              let color = "#10b981"; // green (Risco Baixo)
                              if (iadValue < 120) {
                                  color = "#ef4444"; // red (Risco Alto)
                              } else if (iadValue >= 120 && iadValue <= 130) {
                                  color = "#eab308"; // yellow/amber (Risco Médio)
                              }
                              return <Cell key={`cell-${index}`} fill={color} />;
                            })
                          }
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
                </div>
              )}
            </motion.div>
          ) : activeTab === "compare" ? (
            <motion.div
              key="compare"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col gap-6"
            >
              <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
                  <div className="p-3 bg-adasa-50 rounded-xl">
                    <TrendingUp size={24} className="text-adasa-mid" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tighter">
                      Analise Comparada de Balanços Hídricos
                    </h3>
                    <p className="text-sm font-medium text-slate-500">
                      Comparativo agregado entre oferta e demanda projetadas ao
                      longo do tempo.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mb-8">
                  <h4 className="font-bold text-slate-700 text-sm">Selecione os Balanços para Análise:</h4>
                  <div className="flex flex-wrap gap-3">
                    {waterBalances.map((wb, idx) => (
                      <label key={wb.id} className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-adasa-mid rounded border-slate-300 focus:ring-adasa-mid"
                          checked={analyzedBalanceIds.includes(wb.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAnalyzedBalanceIds(prev => [...prev, wb.id]);
                            } else {
                              setAnalyzedBalanceIds(prev => prev.filter(id => id !== wb.id));
                            }
                          }}
                        />
                        <span className="text-sm font-semibold text-slate-700">{wb.description}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={balanceAnalysisData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="year"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                        dy={10}
                      />
                      <YAxis
                        yAxisId="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                        tickFormatter={(value) => `${formatNumber(value, 0)} L/s`}
                        width={140}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 700 }}
                        tickFormatter={(value) => `${value.toFixed(1)}%`}
                        width={50}
                        domain={[0, 100]}
                      />
                      <YAxis yAxisId="hidden" hide={true} />
                      <Tooltip
                        wrapperStyle={{ zIndex: 100 }}
                        content={(props) => {
                          const { active, payload, label } = props;
                          if (!active || !payload || !payload.length) return null;

                          const sortedPayload = [...payload].sort((a, b) => {
                            const getOrder = (name: string) => {
                              const parts = name.split(' - ');
                              const demandDesc = parts.length > 1 ? parts.slice(1).join(' - ') : '';
                              const demandIdx = waterBalances.findIndex(w => w.description === demandDesc);
                              const baseIdx = demandIdx >= 0 ? demandIdx * 10 : 900;
                              if (name.startsWith('Oferta')) return baseIdx + 1;
                              if (name.startsWith('Demanda') && !name.includes('habitantes')) return baseIdx + 2;
                              if (name.startsWith('Demanda (habitantes)')) return baseIdx + 3;
                              if (name.startsWith('Saldo') && !name.includes('habitantes') && !name.includes('%')) return baseIdx + 4;
                              if (name.startsWith('Saldo (habitantes)')) return baseIdx + 5;
                              if (name.startsWith('Saldo (%)') || name.startsWith('IAD')) return baseIdx + 6;
                              return baseIdx + 7;
                            };
                            return getOrder(a.name) - getOrder(b.name);
                          });

                          const groups: Record<string, any[]> = {};
                          sortedPayload.forEach(item => {
                            const name = item.name as string;
                            const parts = name.split(' - ');
                            const demandDesc = parts.length > 1 ? parts.slice(1).join(' - ') : 'Outro';
                            
                            if (!groups[demandDesc]) {
                              groups[demandDesc] = [];
                            }
                            
                            let formattedValue: any = `${formatNumber(item.value)} L/s`;
                            let formattedName = name;
                            if (name.includes('Demanda (habitantes)')) {
                               formattedValue = `${formatInteger(item.value)} hab.`;
                            } else if (name.includes('Saldo (%)') || name.startsWith('IAD')) {
                               formattedValue = formatSaldoValue(item.value, 'percent', true);
                            } else if (name.includes('Saldo (habitantes)')) {
                               formattedValue = formatSaldoValue(item.value, 'hab', true);
                            } else if (name.includes('Saldo')) {
                               formattedValue = formatSaldoValue(item.value, 'ls', true);
                               formattedName = name.replace('Saldo', 'Saldo (L/s)');
                            }
                            
                            formattedName = formattedName.split(' - ')[0];

                            groups[demandDesc].push({
                              ...item,
                              formattedName,
                              formattedValue
                            });
                          });

                          return (
                            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", color: "#334155", boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)", padding: "16px", zIndex: 100, position: 'relative' }}>
                              <p style={{ color: "#94a3b8", fontWeight: 800, marginBottom: "12px", fontSize: "14px" }}>{label}</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {Object.entries(groups).map(([demand, items], i) => (
                                  <div key={i}>
                                    <h4 style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", marginBottom: "8px", borderBottom: '1px solid #f1f5f9', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                                      {demand}
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      {items.map((item, j) => (
                                        <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: "13px", fontWeight: 600, gap: '24px' }}>
                                          <span style={{ color: item.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            
                                            {item.formattedName}
                                          </span>
                                          <span>{item.formattedValue}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Legend
                        wrapperStyle={{
                          paddingTop: "20px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                        onClick={handleLegendClickCompare}
                      />
                      {waterBalances
                        .filter((wb) => analyzedBalanceIds.includes(wb.id))
                        .map((wb, i) => {
                          const colors = ["#0091DA", "#1A3E8A", "#008A3F", "#45C4F6", "#f59e0b", "#94a3b8", "#ef4444"];
                          const baseColor = colors[i % colors.length];
                          return [
                            <Line
                              key={`dem-${wb.id}`}
                              yAxisId="left"
                              type="monotone"
                              dataKey={`Demanda - ${wb.description}`}
                              stroke={baseColor}
                              strokeWidth={3}
                              dot={{ r: 4, strokeWidth: 2 }}
                              activeDot={{ r: 6 }}
                              name={`Demanda - ${wb.description}`}
                              hide={hiddenSeriesCompare[`Demanda - ${wb.description}`]}
                            />,
                            <Line
                              key={`demhab-${wb.id}`}
                              yAxisId="hidden"
                              type="monotone"
                              dataKey={`Demanda (habitantes) - ${wb.description}`}
                              stroke={baseColor}
                              strokeWidth={0}
                              opacity={0}
                              dot={false}
                              activeDot={false}
                              legendType="none"
                              name={`Demanda (habitantes) - ${wb.description}`}
                              hide={hiddenSeriesCompare[`Demanda - ${wb.description}`]}
                            />,
                            <Line
                              key={`sup-${wb.id}`}
                              yAxisId="left"
                              type="monotone"
                              dataKey={`Oferta - ${wb.description}`}
                              stroke={baseColor}
                              strokeWidth={3}
                              strokeDasharray="5 5"
                              dot={{ r: 4, strokeWidth: 2 }}
                              activeDot={{ r: 6 }}
                              name={`Oferta - ${wb.description}`}
                              hide={hiddenSeriesCompare[`Oferta - ${wb.description}`]}
                            />,
                            <Bar
                              key={`iad-${wb.id}`}
                              yAxisId="right"
                              dataKey={`IAD - ${wb.description}`}
                              fill={baseColor}
                              radius={[4,4,0,0]}
                              name={`Saldo (%) - ${wb.description}`}
                              hide={hiddenSeriesCompare[`IAD - ${wb.description}`]}
                            >
                              {balanceAnalysisData.map((entry, index) => {
                                const val = entry[`IAD - ${wb.description}`];
                                let color = "#10b981"; // green (Risco Baixo)
                                const iadValue = (val || 0) + 100;
                                if (iadValue < 120) {
                                  color = "#ef4444"; // red (Risco Alto)
                                } else if (iadValue >= 120 && iadValue <= 130) {
                                  color = "#eab308"; // yellow / amber (Risco Médio)
                                }
                                return <Cell key={`cell-${index}`} fill={color} />;
                              })}
                            </Bar>,
                            <Line
                              key={`saldo-${wb.id}`}
                              yAxisId="hidden"
                              type="monotone"
                              dataKey={`Saldo - ${wb.description}`}
                              stroke={baseColor}
                              strokeWidth={0}
                              opacity={0}
                              dot={false}
                              activeDot={false}
                              legendType="none"
                              name={`Saldo - ${wb.description}`}
                              hide={hiddenSeriesCompare[`Demanda - ${wb.description}`] && hiddenSeriesCompare[`Oferta - ${wb.description}`]}
                            />,
                            <Line
                              key={`saldohab-${wb.id}`}
                              yAxisId="hidden"
                              type="monotone"
                              dataKey={`Saldo (habitantes) - ${wb.description}`}
                              stroke={baseColor}
                              strokeWidth={0}
                              opacity={0}
                              dot={false}
                              activeDot={false}
                              legendType="none"
                              name={`Saldo (habitantes) - ${wb.description}`}
                              hide={hiddenSeriesCompare[`Demanda - ${wb.description}`] && hiddenSeriesCompare[`Oferta - ${wb.description}`]}
                            />
                          ];
                        })}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                
                {balanceAnalysisData.length > 0 && (
                  <div className="mt-8 bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm">
                    <h3 className="font-black text-slate-800 text-sm mb-4">Quadro Resumo: Analítica Comparada</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold rounded-t-xl">
                          <tr>
                            <th className="px-4 py-3 sticky left-0 bg-slate-50 z-10 border-r border-slate-200" rowSpan={2}>Ano</th>
                            {waterBalances
                              .filter((wb) => analyzedBalanceIds.includes(wb.id))
                              .map((wb) => (
                                <th key={wb.id} colSpan={3} className="px-4 py-3 text-center border-l border-slate-200 bg-slate-100">{wb.description}</th>
                              ))}
                          </tr>
                          <tr>
                            {waterBalances
                              .filter((wb) => analyzedBalanceIds.includes(wb.id))
                              .map((wb) => (
                                <React.Fragment key={wb.id}>
                                  <th className="px-4 py-2 text-right border-slate-200 border-l border-t">Saldo (L/s)</th>
                                  <th className="px-4 py-2 text-right border-slate-200 border-t">Saldo (hab.)</th>
                                  <th className="px-4 py-2 text-right border-slate-200 border-t">Saldo (%)</th>
                                </React.Fragment>
                              ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm font-medium">
                          {balanceAnalysisData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 sticky left-0 bg-white font-black text-slate-700 border-r border-slate-200">{row.year}</td>
                              {waterBalances
                                .filter((wb) => analyzedBalanceIds.includes(wb.id))
                                .map((wb) => (
                                  <React.Fragment key={wb.id}>
                                    <td className="px-4 py-3 text-right text-slate-600 font-bold border-l border-slate-200">
                                      {row[`Saldo - ${wb.description}`] !== undefined ? formatSaldoValue(row[`Saldo - ${wb.description}`], 'ls', false) : "-"}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600 font-bold">
                                      {row[`Saldo (habitantes) - ${wb.description}`] !== undefined ? formatSaldoValue(row[`Saldo (habitantes) - ${wb.description}`], 'hab', false) : "-"}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600 font-bold">
                                      {row[`IAD - ${wb.description}`] !== undefined ? formatSaldoValue(row[`IAD - ${wb.description}`], 'percent', false) : "-"}
                                    </td>
                                  </React.Fragment>
                                ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : activeTab === "manage" ? (
            <motion.div
              key="manage"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col gap-6 max-w-4xl"
            >
              <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                {manageSubTab === "list" && !editingRegionId && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Balanços Hídricos</h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">Gerencie os balanços hídricos cadastrados.</p>
                      </div>
                      <button
                        onClick={() => {
                          const maxWbId = waterBalances.length > 0 ? Math.max(...waterBalances.map(w => Number(w.id) || 0)) : 0;
                          const newId = maxWbId + 1;
                          setWaterBalances([...waterBalances, {
                            id: newId,
                            description: `Novo Balanço Hídrico`,
                            responsible: "",
                            deliveryDate: "",
                            receivedBy: "",
                            receiptDate: "",
                            status: "Pendente"
                          }]);
                          setSelectedWaterBalanceId(newId);
                          setManageSubTab("balance");
                        }}
                        className="px-6 py-3 bg-adasa-mid text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg hover:shadow-xl hover:bg-adasa-dark transition-all flex items-center gap-2"
                      >
                        <Plus size={16} /> Novo Balanço
                      </button>
                    </div>

                    <div className="space-y-4">
                      {waterBalances.map(wb => (
                        <div key={wb.id} className="border border-slate-200 rounded-2xl p-6 bg-white hover:border-slate-300 transition-all shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-black text-slate-800">{wb.description || "Sem Descrição"}</h3>
                              <p className="text-sm font-medium text-slate-500 mt-1">
                                Responsável: {wb.responsible || "Não informado"} • Status: {wb.status}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  // Find the maximum ID in waterBalances safely, filtering out NaN
                                  const validWbIds = waterBalances.map(w => Number(w.id)).filter(id => !isNaN(id));
                                  const maxWbId = validWbIds.length > 0 ? Math.max(...validWbIds) : 0;
                                  const newWbId = maxWbId + 1;

                                  const inWb = (id: any) => Number(id) === Number(wb.id) || (!id && Number(wb.id) === 2026);
                                  
                                  const sysMap = new Map();
                                  const regMap = new Map();
                                  const supMap = new Map();
                                  
                                  // Safely find the maximum IDs of all related state arrays, filtering out non-numeric values
                                  const validSysIds = systems.map(s => Number(s.id)).filter(id => !isNaN(id));
                                  let maxSysId = validSysIds.length > 0 ? Math.max(...validSysIds) : 0;

                                  const validRegIds = regions.map(r => Number(r.id)).filter(id => !isNaN(id));
                                  let maxRegId = validRegIds.length > 0 ? Math.max(...validRegIds) : 0;

                                  const validCentIds = demands.map(s => Number(s.id)).filter(id => !isNaN(id));
                                  let maxCentId = validCentIds.length > 0 ? Math.max(...validCentIds) : 0;

                                  const validSupIds = supplySources.map(s => Number(s.id)).filter(id => !isNaN(id));
                                  let maxSupId = validSupIds.length > 0 ? Math.max(...validSupIds) : 0;

                                  const validAdjIds = operationalAdjustments.map(s => Number(s.id)).filter(id => !isNaN(id));
                                  let maxAdjId = validAdjIds.length > 0 ? Math.max(...validAdjIds) : 0;

                                  const newSystems = systems.filter(s => inWb(s.waterBalanceId)).map(s => {
                                    const newId = ++maxSysId;
                                    sysMap.set(s.id, newId);
                                    return { ...s, id: newId, waterBalanceId: newWbId };
                                  });
                                  
                                  const newRegions = regions.filter(r => inWb(r.waterBalanceId)).map(r => {
                                    const newId = ++maxRegId;
                                    regMap.set(r.id, newId);
                                    return { ...r, id: newId, systemId: sysMap.get(r.systemId) || r.systemId, waterBalanceId: newWbId };
                                  });
                                  
                                  const newDemands = demands.filter(s => inWb(s.waterBalanceId)).map(s => {
                                    const newId = ++maxCentId;
                                    return { 
                                      ...s, 
                                      id: newId, 
                                      waterBalanceId: newWbId,
                                      entries: s.entries.map(e => ({
                                        ...e,
                                        regionId: regMap.get(e.regionId) || e.regionId
                                      }))
                                    };
                                  });
                                  
                                  const newSupply = supplySources.filter(s => inWb(s.waterBalanceId)).map(s => {
                                    const newId = ++maxSupId;
                                    supMap.set(s.id, newId);
                                    return {
                                      ...s,
                                      id: newId,
                                      systemId: sysMap.get(s.systemId) || s.systemId,
                                      waterBalanceId: newWbId
                                    };
                                  });
                                  
                                  const adjMap = new Map();
                                  let newAdj = operationalAdjustments.filter(a => inWb(a.waterBalanceId)).map(a => {
                                    const newId = ++maxAdjId;
                                    adjMap.set(a.id, newId);
                                    return {
                                      ...a,
                                      id: newId,
                                      systemId: sysMap.get(a.systemId) || a.systemId,
                                      waterBalanceId: newWbId
                                    };
                                  });
                                  newAdj = newAdj.map(a => {
                                    if (a.linkedAdjustmentId) {
                                      return { ...a, linkedAdjustmentId: adjMap.get(a.linkedAdjustmentId) || a.linkedAdjustmentId };
                                    }
                                    return a;
                                  });

                                  const updatedWaterBalances = [...waterBalances, { ...wb, id: newWbId, description: `${wb.description} (Cópia)` }];
                                  const updatedSystems = [...systems, ...newSystems];
                                  const updatedRegions = [...regions, ...newRegions];
                                  const updatedDemands = [...demands, ...newDemands];
                                  const updatedSupplySources = [...supplySources, ...newSupply];
                                  const updatedOperationalAdjustments = [...operationalAdjustments, ...newAdj];

                                  setWaterBalances(updatedWaterBalances);
                                  setSystems(updatedSystems);
                                  setRegions(updatedRegions);
                                  setDemands(updatedDemands);
                                  setSupplySources(updatedSupplySources);
                                  setOperationalAdjustments(updatedOperationalAdjustments);

                                  // Select the newly duplicated balance, mark it as registered, and switch sub-tab so form is fully active
                                  setSelectedWaterBalanceId(newWbId);
                                  setSavedBalanceIds(prev => Array.from(new Set([...prev, newWbId])));
                                  setManageSubTab("balance");

                                  // Immediately trigger global save call with newly created state payload to synchronize DB instantly
                                  const fullPayload = {
                                    waterBalances: updatedWaterBalances,
                                    systems: updatedSystems,
                                    regions: updatedRegions,
                                    demands: updatedDemands,
                                    supplySources: updatedSupplySources,
                                    operationalAdjustments: updatedOperationalAdjustments
                                  };
                                  
                                  setTimeout(() => {
                                    handleSaveToCloud(true, fullPayload).then(() => {
                                      showToast("Sucesso", `Balanço "${wb.description}" duplicado e salvo com sucesso! Redirecionado para edição.`, "success");
                                    }).catch(err => {
                                      showToast("Erro", "Erro ao salvar duplicação: " + err.message, "error");
                                    });
                                  }, 100);
                                }}
                                className="p-3 text-slate-500 bg-slate-50 rounded-xl hover:bg-slate-100 hover:text-slate-700 transition-all border border-slate-200"
                                title="Duplicar"
                              >
                                <Files size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedWaterBalanceId(wb.id);
                                  setManageSubTab("balance");
                                }}
                                className="p-3 text-adasa-mid bg-adasa-light/10 rounded-xl hover:bg-adasa-light/20 transition-all border border-adasa-light/20"
                                title="Editar"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmState({
                                    message: "Tem certeza que deseja excluir este balanço e todos os registros vinculados a ele?",
                                    onConfirm: () => {
                                      const isLinkedToDeletedWb = (itemWbId: any) => {
                                        const numId = itemWbId ? Number(itemWbId) : 2026;
                                        return numId === Number(wb.id);
                                      };
                                      
                                      const updatedWaterBalances = waterBalances.filter(w => w.id !== wb.id);
                                      const updatedSystems = systems.filter(s => !isLinkedToDeletedWb(s.waterBalanceId));
                                      const updatedRegions = regions.filter(r => !isLinkedToDeletedWb(r.waterBalanceId));
                                      const updatedDemands = demands.filter(d => !isLinkedToDeletedWb(d.waterBalanceId));
                                      const updatedSupplySources = supplySources.filter(s => !isLinkedToDeletedWb(s.waterBalanceId));
                                      const updatedOperationalAdjustments = operationalAdjustments.filter(a => !isLinkedToDeletedWb(a.waterBalanceId));

                                      setWaterBalances(updatedWaterBalances);
                                      setSystems(updatedSystems);
                                      setRegions(updatedRegions);
                                      setDemands(updatedDemands);
                                      setSupplySources(updatedSupplySources);
                                      setOperationalAdjustments(updatedOperationalAdjustments);

                                      if (Number(selectedWaterBalanceId) === Number(wb.id)) {
                                        setSelectedWaterBalanceId(null);
                                      }

                                      const fullPayload = {
                                        waterBalances: updatedWaterBalances,
                                        systems: updatedSystems,
                                        regions: updatedRegions,
                                        demands: updatedDemands,
                                        supplySources: updatedSupplySources,
                                        operationalAdjustments: updatedOperationalAdjustments
                                      };

                                      setTimeout(() => {
                                        handleSaveToCloud(true, fullPayload).then(() => {
                                          showToast("Sucesso", "Balanço hídrico e todos os registros vinculados excluídos com sucesso!", "success");
                                        }).catch(err => {
                                          showToast("Erro", "Erro ao sincronizar exclusão: " + err.message, "error");
                                        });
                                      }, 100);
                                    }
                                  });
                                }}
                                className="p-3 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all border border-rose-200"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {waterBalances.length === 0 && (
                        <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                          <p>Nenhum balanço hídrico cadastrado. Clique em Novo Balanço para começar.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!editingRegionId && manageSubTab !== "list" && (
                  <div className="flex flex-col gap-4 mb-8 border-b border-slate-100 pb-4">
                    <button
                      onClick={() => setManageSubTab("list")}
                      className="flex items-center gap-2 text-sm font-black text-slate-500 hover:text-adasa-mid transition-all self-start"
                    >
                      <ArrowLeft size={16} /> Voltar para a Lista de Balanços
                    </button>
                    <div className="flex flex-wrap gap-4">
                      <button
                        onClick={() => setManageSubTab("balance")}
                        className={cn(
                          "text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all",
                          manageSubTab === "balance"
                            ? "bg-adasa-mid text-white"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100",
                        )}
                      >
                        Balanço Hídrico
                      </button>
                      {selectedWaterBalanceId && savedBalanceIds.includes(selectedWaterBalanceId) && (
                        <>
<button
                        onClick={() => setManageSubTab("systems")}
                        className={cn(
                          "text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all",
                          manageSubTab === "systems"
                            ? "bg-adasa-mid text-white"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100",
                        )}
                      >
                        Subsistemas
                      </button>
                      <button
                        onClick={() => setManageSubTab("demand")}
                        className={cn(
                          "text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all",
                          manageSubTab === "demand"
                            ? "bg-adasa-mid text-white"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100",
                        )}
                      >
                        Demanda
                      </button>
                      <button
                        onClick={() => setManageSubTab("supply")}
                        className={cn(
                          "text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all",
                          manageSubTab === "supply"
                            ? "bg-adasa-mid text-white"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100",
                        )}
                      >
                        Oferta
                      </button>
                        </>
                      )}
                      
                    </div>
                  </div>
                )}

                {manageSubTab === "balance" && !editingRegionId && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Detalhes do Balanço Hídrico</h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">Preencha as informações gerais referentes a este balanço.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">Descrição</label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-adasa-mid transition-all"
                          placeholder="Ex: Balanço Hídrico 2024"
                          value={activeBalance?.description || ""}
                          onChange={(e) => updateActiveBalance({ description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">Responsável</label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-adasa-mid transition-all"
                          placeholder="Nome do responsável"
                          value={activeBalance?.responsible || ""}
                          onChange={(e) => updateActiveBalance({ responsible: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">Recebido Por</label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-adasa-mid transition-all"
                          placeholder="Nome de quem recebeu"
                          value={activeBalance?.receivedBy || ""}
                          onChange={(e) => updateActiveBalance({ receivedBy: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">Data da Entrega</label>
                        <input
                          type="date"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-adasa-mid transition-all"
                          value={activeBalance?.deliveryDate || ""}
                          onChange={(e) => updateActiveBalance({ deliveryDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">Data do Recebimento</label>
                        <input
                          type="date"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-adasa-mid transition-all"
                          value={activeBalance?.receiptDate || ""}
                          onChange={(e) => updateActiveBalance({ receiptDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">Situação</label>
                        <select
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-adasa-mid transition-all appearance-none"
                          value={activeBalance?.status || "Pendente"}
                          onChange={(e) => updateActiveBalance({ status: e.target.value as "Validado" | "Pendente" })}
                        >
                          <option value="Pendente">Pendente</option>
                          <option value="Validado">Validado</option>
                        </select>
                      </div>
                      <div className="col-span-1 md:col-span-2 flex justify-end mt-4">
                        <RequirePermission moduleId="water_balances" action="edit">
                          <button
                            onClick={() => handleSaveModule("water-balances", { waterBalances })}
                            className={cn(
                              "px-8 py-3 font-black uppercase tracking-widest text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2",
                              hasPendingChanges
                                ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                                : "bg-adasa-mid hover:bg-adasa-dark text-white"
                            )}
                            title={hasPendingChanges ? "Existem alterações não salvas" : ""}
                          >
                            <Save size={16} /> Salvar Balanço
                          </button>
                        </RequirePermission>
                      </div>
                    </div>
                  </div>
                )}

                {manageSubTab === "systems" && !editingRegionId && (
                  <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col p-6 overflow-hidden">
                    <div className="flex items-center justify-between mb-6 px-2">
                      <div className="flex items-center gap-2">
                        <Database size={18} className="text-adasa-mid" />
                        <h3 className="font-black text-slate-800 uppercase tracking-tighter">
                          Subsistemas
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={handleDownloadSystems}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors shadow-sm"
                        >
                          <Download size={14} />
                          Baixar Subsistemas
                        </button>
                        <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-adasa-mid text-white text-xs font-bold rounded-xl hover:bg-adasa-dark transition-colors shadow-sm">
                          <Upload size={14} />
                          Importar Subsistemas
                          <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleImportSystemsCSV}
                          />
                        </label>
                        <button
                          onClick={() => handleSaveModule("systems", { systems, regions })}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-xl shadow-sm transition-colors",
                            hasPendingChanges ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse" : "bg-adasa-mid text-white hover:bg-adasa-dark"
                          )}
                          title={hasPendingChanges ? "Existem alterações não salvas" : ""}
                        >
                          <Save size={14} /> Salvar
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto flex-1 custom-scrollbar">
                      <table className="w-full text-left border-separate border-spacing-0 min-w-[700px]">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 sticky top-0 z-10 w-24">
                              Código Subsistema
                            </th>
                            <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 sticky top-0 z-10 w-full">
                              Subsistema
                            </th>
                            <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right bg-slate-50/50 sticky top-0 z-10">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {activeSystems.map((system) => (
                            <tr key={system.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-3 py-4">
                                {editingSystemId === system.id ? (
                                  <input
                                    type="text"
                                    value={editingSystemCode}
                                    onChange={(e) => setEditingSystemCode(e.target.value)}
                                    className="w-full border-b-2 border-adasa-mid px-2 py-1 focus:outline-none focus:bg-adasa-50 text-xs font-black uppercase text-slate-700 bg-transparent"
                                  />
                                ) : (
                                  <span className="font-mono text-xs text-slate-500 font-medium">
                                    {system.code || "-"}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-4">
                                {editingSystemId === system.id ? (
                                  <input
                                    type="text"
                                    value={editingSystemName}
                                    onChange={(e) => setEditingSystemName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveSystem(system.id);
                                    }}
                                    autoFocus
                                    className="w-full border-b-2 border-adasa-mid px-2 py-1 focus:outline-none focus:bg-adasa-50 text-xs font-black uppercase text-slate-700 bg-transparent"
                                  />
                                ) : (
                                  <h4 className="font-black text-slate-700 uppercase tracking-wide text-xs">
                                    {system.name}
                                  </h4>
                                )}
                              </td>
                              <td className="px-3 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {editingSystemId === system.id ? (
                                    <>
                                      <button
                                        onClick={() => handleSaveSystem(system.id)}
                                        className="text-white hover:bg-emerald-600 transition-colors bg-emerald-500 p-2 rounded-lg shadow-sm"
                                        title="Salvar"
                                      >
                                        <Save size={14} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingSystemId(null);
                                          setEditingSystemName("");
                                          setEditingSystemCode("");
                                        }}
                                        className="text-slate-400 hover:text-slate-600 transition-colors bg-white p-2 rounded-lg shadow-sm border border-slate-200"
                                        title="Cancelar"
                                      >
                                        <X size={14} />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingSystemId(system.id);
                                          setEditingSystemName(system.name);
                                          setEditingSystemCode(system.code || "");
                                        }}
                                        className="text-slate-400 hover:text-adasa-mid transition-colors bg-white p-2 rounded-lg shadow-sm border border-slate-200"
                                        title="Editar Subsistema"
                                      >
                                        <Edit3 size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSystem(system.id)}
                                        className="text-slate-400 hover:text-rose-500 transition-colors bg-white p-2 rounded-lg shadow-sm border border-slate-200"
                                        title="Excluir Subsistema"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-4">
                        <button
                          onClick={handleAddSystem}
                          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black uppercase tracking-widest text-xs hover:border-adasa-mid hover:text-adasa-mid transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={16} /> Cadastrar Novo Subsistema
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {manageSubTab === "supply" && !editingRegionId && (
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-4">
                      <button
                        onClick={() => setSupplySubTab("edit")}
                        className={cn(
                          "text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border",
                          supplySubTab === "edit"
                            ? "bg-slate-800 text-white border-slate-800"
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50",
                        )}
                      >
                        Cadastrar Oferta
                      </button>
                      <button
                        onClick={() => setSupplySubTab("view")}
                        className={cn(
                          "text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border",
                          supplySubTab === "view"
                            ? "bg-slate-800 text-white border-slate-800"
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50",
                        )}
                      >
                        Calcular Oferta
                      </button>
                    </div>
                    {supplySubTab === "edit" && (
                      <div className="relative flex items-center gap-2 ml-auto">
                        <button
                          onClick={handleDownloadOferta}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors shadow-sm"
                        >
                          <Download size={14} />
                          Baixar Oferta
                        </button>
                        <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-adasa-mid text-white text-xs font-bold rounded-xl hover:bg-adasa-dark transition-colors shadow-sm">
                          <Upload size={14} />
                          Importar Oferta
                          <input
                            type="file"
                            accept=".csv"
                            onChange={handleImportSupplyCSV}
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => handleSaveModule("supply-sources", { supplySources, operationalAdjustments })}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-xl shadow-sm transition-colors",
                            hasPendingChanges ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse" : "bg-adasa-mid text-white hover:bg-adasa-dark"
                          )}
                          title={hasPendingChanges ? "Existem alterações não salvas" : ""}
                        >
                          <Save size={14} /> Salvar
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {manageSubTab === "supply" && supplySubTab === "edit" && !editingRegionId && (
                  <div className="space-y-8">
                    <p className="text-sm font-medium text-slate-500">
                      A Oferta Inicial dos sistemas se dará por meio das vazões
                      outorgadas e vazões operantes para o Ano Início. A partir
                      do Ano Início devem ser cadastrados Ajustes Operacionais
                      para cada subsistema.
                    </p>

                    <div className="space-y-6">
                      <h3 className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                        <Database size={16} className="text-adasa-mid" />
                        Captações por Subsistema
                      </h3>
                      {activeSystems.map((system) => (
                        <div
                          key={`supply-sys-${system.id}`}
                          className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50"
                        >
                          <h4 className="font-black text-slate-700 uppercase tracking-wide text-sm mb-4">
                            {system.name}
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                <tr>
                                  <th className="px-3 py-2">Código</th>
                                  <th className="px-3 py-2">Captação</th>
                                  <th className="px-3 py-2">
                                    Q Outorgada (L/s)
                                  </th>
                                  <th className="px-3 py-2">
                                    Q Operante (L/s)
                                  </th>
                                  <th className="px-3 py-2">
                                    Q Indisponível (L/s)
                                  </th>
                                  <th className="px-3 py-2">
                                    Motivo Indisponibilidade
                                  </th>
                                  <th className="px-3 py-2 text-right">
                                    Ações
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {activeSupplySources
                                  .filter((s) => s.systemId === system.id)
                                  .map((source) => (
                                    <tr
                                      key={source.id}
                                      className="hover:bg-slate-50"
                                    >
                                      {editingSupplySource?.id === source.id ? (
                                        <>
                                          <td className="px-3 py-2 text-[11px] font-bold text-slate-700">
                                            <input 
                                              type="text" 
                                              value={editingSupplySource.code || ''}
                                              onChange={(e) => setEditingSupplySource({...editingSupplySource, code: e.target.value})}
                                              className="w-full px-2 py-1 border border-slate-200 rounded text-[11px] font-mono"
                                            />
                                          </td>
                                          <td className="px-3 py-2 text-[11px] text-slate-600">
                                            <input 
                                              type="text" 
                                              value={editingSupplySource.name}
                                              onChange={(e) => setEditingSupplySource({...editingSupplySource, name: e.target.value})}
                                              className="w-full px-2 py-1 border border-slate-200 rounded text-[11px]"
                                            />
                                          </td>
                                          <td className="px-3 py-2 text-[11px] font-bold text-adasa-mid">
                                            <input 
                                              type="number" 
                                              value={editingSupplySource.grantedFlow}
                                              onChange={(e) => setEditingSupplySource({...editingSupplySource, grantedFlow: parseFloat(e.target.value) || 0})}
                                              className="w-full px-2 py-1 border border-slate-200 rounded text-[11px]"
                                            />
                                          </td>
                                          <td className="px-3 py-2 text-[11px] font-bold text-adasa-green">
                                            <input 
                                              type="number" 
                                              value={editingSupplySource.operationalFlow}
                                              onChange={(e) => setEditingSupplySource({...editingSupplySource, operationalFlow: parseFloat(e.target.value) || 0})}
                                              className="w-full px-2 py-1 border border-slate-200 rounded text-[11px]"
                                            />
                                          </td>
                                          <td className="px-3 py-2 text-[11px] font-bold text-rose-500">
                                            <input 
                                              type="number" 
                                              value={editingSupplySource.unavailableFlow}
                                              onChange={(e) => setEditingSupplySource({...editingSupplySource, unavailableFlow: parseFloat(e.target.value) || 0})}
                                              className="w-full px-2 py-1 border border-slate-200 rounded text-[11px]"
                                            />
                                          </td>
                                          <td className="px-3 py-2 text-[11px] text-slate-500">
                                            <input 
                                              type="text" 
                                              value={editingSupplySource.unavailabilityReason || ''}
                                              onChange={(e) => setEditingSupplySource({...editingSupplySource, unavailabilityReason: e.target.value})}
                                              className="w-full px-2 py-1 border border-slate-200 rounded text-[11px]"
                                            />
                                          </td>
                                          <td className="px-3 py-2 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                              <button
                                                onClick={() => {
                                                  setSupplySources(prev => prev.map(s => s.id === source.id && s.waterBalanceId === source.waterBalanceId ? (editingSupplySource as SupplySource) : s));
                                                  setEditingSupplySource(null);
                                                }}
                                                className="text-adasa-green hover:text-green-700 transition-colors bg-white p-1.5 rounded border border-slate-200"
                                                title="Salvar"
                                              >
                                                <Check size={14} />
                                              </button>
                                              <button
                                                onClick={() => setEditingSupplySource(null)}
                                                className="text-slate-400 hover:text-slate-600 transition-colors bg-white p-1.5 rounded border border-slate-200"
                                                title="Cancelar"
                                              >
                                                <X size={14} />
                                              </button>
                                            </div>
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="px-3 py-2 text-[11px] font-bold text-slate-700 font-mono">
                                            {source.code || source.id}
                                          </td>
                                          <td className="px-3 py-2 text-[11px] text-slate-600">
                                            {source.name}
                                          </td>
                                          <td className="px-3 py-2 text-[11px] font-bold text-adasa-mid">
                                            {formatNumber(source.grantedFlow)}
                                          </td>
                                          <td className="px-3 py-2 text-[11px] font-bold text-adasa-green">
                                            {formatNumber(source.operationalFlow)}
                                          </td>
                                          <td className="px-3 py-2 text-[11px] font-bold text-rose-500">
                                            {formatNumber(source.unavailableFlow)}
                                          </td>
                                          <td className="px-3 py-2 text-[11px] text-slate-500">
                                            {source.unavailabilityReason || "-"}
                                          </td>
                                          <td className="px-3 py-2 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                              <button
                                                onClick={() => setEditingSupplySource({...source})}
                                                className="text-slate-500 hover:text-adasa-mid transition-colors bg-white p-1.5 rounded border border-slate-200"
                                                title="Editar captação"
                                              >
                                                <Edit3 size={14} />
                                              </button>
                                              <button
                                                onClick={() => handleDeleteSupplySource(source)}
                                                className="text-rose-500 hover:text-rose-600 transition-colors bg-white p-1.5 rounded disabled:opacity-50 border border-slate-200"
                                                title="Excluir captação"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
                                          </td>
                                        </>
                                      )}
                                    </tr>
                                  ))}
                                {activeSupplySources.filter(
                                  (s) => s.systemId === system.id,
                                ).length === 0 && (
                                  <tr>
                                    <td
                                      colSpan={7}
                                      className="px-3 py-4 text-center text-xs text-slate-400"
                                    >
                                      Nenhuma captação cadastrada.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                          <div className="mt-4 flex justify-end">
                            <button
                               onClick={() => handleAddSupplySource(system.id)}
                               className="text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 flex items-center gap-2"
                             >
                                <Plus size={16} /> Nova Captação
                             </button>
                          </div>

                          <div className="mt-6 border-t border-slate-200 pt-4">
                            <h5 className="font-bold text-xs uppercase text-slate-600 mb-3 flex items-center gap-2">
                              <TrendingUp
                                size={14}
                                className="text-adasa-dark"
                              />
                              Ajustes Operacionais
                            </h5>
                            <div className="space-y-2 mb-3">
                              {operationalAdjustments
                                .filter((adj) => adj.systemId === system.id)
                                .map((adj) => (
                                  <div
                                    key={adj.id}
                                    className="flex flex-col md:flex-row md:items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm gap-2"
                                  >
                                    <div className="flex-1">
                                      <div className="text-[12px] font-medium text-slate-700">
                                        <div className="flex flex-wrap items-center gap-1">
                                          <span
                                            className={cn(
                                              "font-black uppercase text-[10px] px-2 py-0.5 rounded",
                                              adj.type === "Aumento da vazão"
                                                ? "bg-adasa-green/10 text-adasa-green"
                                                : adj.type ===
                                                    "Redução da vazão"
                                                  ? "bg-rose-500/10 text-rose-500"
                                                  : "bg-amber-500/10 text-amber-600",
                                            )}
                                          >
                                            {adj.type}
                                          </span>
                                          <span className="text-slate-500 uppercase text-[10px] ml-1">
                                            Ano: {adj.startYear} a {adj.endYear}{" "}
                                            &bull; Vazão:{" "}
                                          </span>
                                          <span className={cn(
                                            "font-bold text-[11px] uppercase",
                                            Number(adj.flowValue) < 0 ? "text-rose-500" : (Number(adj.flowValue) > 0 ? "text-adasa-green" : "text-slate-500")
                                          )}>
                                            {formatNumber(adj.flowValue, 2)} L/s
                                          </span>
                                        </div>
                                        {adj.description && (
                                          <div className="mt-1.5 text-slate-600 font-medium break-words whitespace-normal leading-relaxed">
                                            <span className="font-bold text-slate-400 mr-1 text-[10px]">
                                              DESCRIÇÃO:
                                            </span>
                                            {adj.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() =>
                                        setOperationalAdjustments((prev) =>
                                          prev.filter((a) => a.id !== adj.id && a.id !== adj.linkedAdjustmentId),
                                        )
                                      }
                                      className="text-rose-400 hover:text-rose-600 p-2 transition-colors self-end md:self-center"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}
                              {activeOperationalAdjustments.filter(
                                (adj) => adj.systemId === system.id,
                              ).length === 0 && (
                                <p className="text-xs text-slate-400 italic">
                                  Sem ajustes operacionais.
                                </p>
                              )}
                            </div>
                            <OperationalAdjustmentForm system={system} activeSystems={activeSystems} setOperationalAdjustments={setOperationalAdjustments} selectedWaterBalanceId={selectedWaterBalanceId} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {manageSubTab === "demand" && !editingRegionId && (
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-4">
                      <button
                        onClick={() => setDemandSubTab("edit")}
                        className={cn(
                          "text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border",
                          demandSubTab === "edit"
                            ? "bg-slate-800 text-white border-slate-800"
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50",
                        )}
                      >
                        Cadastrar Demanda
                      </button>
                      <button
                        onClick={() => setDemandSubTab("view")}
                        className={cn(
                          "text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border",
                          demandSubTab === "view"
                            ? "bg-slate-800 text-white border-slate-800"
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50",
                        )}
                      >
                        Calcular Demanda
                      </button>
                    </div>
                  </div>
                )}

                {manageSubTab === "demand" && demandSubTab === "edit" &&
                  (editingRegionId ? (
                    (() => {
                      const region = activeRegions.find(
                        (r) => r.id === editingRegionId,
                      );
                      if (!region) {
                        setEditingRegionId(null);
                        return null;
                      }
                      const baseEntries =
                        (activeDemands[0]?.entries || [])
                          .filter((e) => e.regionId === editingRegionId)
                          .sort((a, b) => a.year - b.year);
                      return (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                              <Edit3 size={18} className="text-adasa-mid" />
                              Editar Região Administrativa
                            </h3>
                            <button
                              onClick={() => setEditingRegionId(null)}
                              className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                            >
                              Voltar
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                                Nome da Região
                              </label>
                              <input
                                type="text"
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-adasa-light focus:border-adasa-mid transition-all"
                                value={region.name}
                                onChange={(e) =>
                                  handleUpdateRegionDetails(region.id, {
                                    name: e.target.value,
                                    waterBalanceId: region.waterBalanceId,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                                Descrição
                              </label>
                              <textarea
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-adasa-light focus:border-adasa-mid transition-all min-h-[80px]"
                                value={region.description || ""}
                                placeholder="Adicione uma descrição..."
                                onChange={(e) =>
                                  handleUpdateRegionDetails(region.id, {
                                    description: e.target.value,
                                    waterBalanceId: region.waterBalanceId,
                                  })
                                }
                              />
                            </div>

                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide mb-3">
                                Vincular Anos de Simulação
                              </h4>
                              <div className="flex items-end gap-4">
                                <div className="flex-1">
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                                    Ano Início
                                  </label>
                                  <input
                                    type="number"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                    value={yearRange.start}
                                    onChange={(e) =>
                                      setYearRange((prev) => ({
                                        ...prev,
                                        start: parseInt(e.target.value) || 2017,
                                      }))
                                    }
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                                    Ano Fim
                                  </label>
                                  <input
                                    type="number"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                    value={yearRange.end}
                                    onChange={(e) =>
                                      setYearRange((prev) => ({
                                        ...prev,
                                        end: parseInt(e.target.value) || 2053,
                                      }))
                                    }
                                  />
                                </div>
                                <button
                                  onClick={() =>
                                    handleGenerateYearsForRegion(region.id)
                                  }
                                  className="px-4 py-2 bg-adasa-mid text-white font-bold rounded-lg hover:bg-adasa-dark transition-colors text-sm"
                                >
                                  Adicionar Anos
                                </button>
                              </div>
                            </div>

                            {baseEntries.length > 0 && (
                              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left border-collapse">
                                  <thead className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                    <tr>
                                      <th className="px-3 py-2">Ano</th>
                                      <th className="px-3 py-2 text-right">
                                        População
                                      </th>
                                      <th className="px-3 py-2 text-right">
                                        Atendimento (%)
                                      </th>
                                      <th className="px-3 py-2 text-right">
                                        Consumo (L/hab.d)
                                      </th>
                                      <th className="px-3 py-2 text-right">
                                        Perdas (%)
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white">
                                    {baseEntries.map((entry) => (
                                      <tr
                                        key={entry.year}
                                        className="hover:bg-slate-50"
                                      >
                                        <td className="px-3 py-2 text-[11px] font-bold text-slate-700">
                                          {entry.year}
                                        </td>
                                        <td className="px-3 py-2">
                                          <input
                                            type="number"
                                            className="w-full text-right bg-transparent border border-slate-200 rounded px-2 py-1 text-[11px]"
                                            value={entry.population}
                                            onChange={(e) =>
                                              handleUpdateBaseEntry(
                                                region.id,
                                                entry.year,
                                                "population",
                                                parseFloat(e.target.value) || 0,
                                              )
                                            }
                                          />
                                        </td>
                                        <td className="px-3 py-2">
                                          <input
                                            type="number"
                                            className="w-full text-right bg-transparent border border-slate-200 rounded px-2 py-1 text-[11px]"
                                            value={(
                                              entry.coverage * 100
                                            ).toFixed(1)}
                                            onChange={(e) =>
                                              handleUpdateBaseEntry(
                                                region.id,
                                                entry.year,
                                                "coverage",
                                                (parseFloat(e.target.value) ||
                                                  0) / 100,
                                              )
                                            }
                                          />
                                        </td>
                                        <td className="px-3 py-2">
                                          <input
                                            type="number"
                                            className="w-full text-right bg-transparent border border-slate-200 rounded px-2 py-1 text-[11px]"
                                            value={entry.perCapitaConsumption}
                                            onChange={(e) =>
                                              handleUpdateBaseEntry(
                                                region.id,
                                                entry.year,
                                                "perCapitaConsumption",
                                                parseFloat(e.target.value) || 0,
                                              )
                                            }
                                          />
                                        </td>
                                        <td className="px-3 py-2">
                                          <input
                                            type="number"
                                            className="w-full text-right bg-transparent border border-slate-200 rounded px-2 py-1 text-[11px]"
                                            value={(entry.losses * 100).toFixed(
                                              1,
                                            )}
                                            onChange={(e) =>
                                              handleUpdateBaseEntry(
                                                region.id,
                                                entry.year,
                                                "losses",
                                                (parseFloat(e.target.value) ||
                                                  0) / 100,
                                              )
                                            }
                                          />
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                          <Database size={18} className="text-adasa-mid" />
                          Gerenciamento de Subsistemas
                        </h3>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleDownloadDemanda}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors shadow-sm"
                          >
                            <Download size={14} />
                            Baixar Demanda
                          </button>
                          <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-adasa-mid text-white text-xs font-bold rounded-xl hover:bg-adasa-dark transition-colors shadow-sm">
                            <Upload size={14} />
                            Importar Demanda
                            <input
                              type="file"
                              accept=".csv"
                              className="hidden"
                              onChange={handleImportCSV}
                            />
                          </label>
                        <button
                          onClick={() => handleSaveModule("demands", { demands })}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-xl shadow-sm transition-colors",
                            hasPendingChanges ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse" : "bg-adasa-mid text-white hover:bg-adasa-dark"
                          )}
                          title={hasPendingChanges ? "Existem alterações não salvas" : ""}
                        >
                          <Save size={14} /> Salvar
                        </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {activeSystems.map((system) => (
                          <div
                            key={system.id}
                            className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-black text-slate-700 uppercase tracking-wide text-sm">
                                {system.name}
                              </h4>
                            </div>

                            <div className="pl-4 border-l-2 border-slate-200 space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                Regiões Administrativas Vinculadas
                              </p>
                              {activeRegions
                                .filter((r) => r.systemId === system.id)
                                .map((region) => (
                                  <div
                                    key={region.id}
                                    className="flex flex-col gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 group/item"
                                  >
                                    {editingRegionModeId === region.id ? (
                                      <div className="flex items-center gap-2 w-full">
                                        <input type="text" value={editingRegionCodeStr} onChange={e => setEditingRegionCodeStr(e.target.value)} className="w-1/4 border border-slate-200 px-2 py-1 rounded text-xs font-mono" placeholder="Código" />
                                        <input type="text" value={editingRegionNameStr} onChange={e => setEditingRegionNameStr(e.target.value)} className="w-full border border-slate-200 px-2 py-1 rounded text-xs" placeholder="Nome da R.A." />
                                        <button onClick={() => handleSaveRegionMode(region.id)} className="text-green-500 hover:text-green-600 p-1"><Check size={14} /></button>
                                        <button onClick={() => setEditingRegionModeId(null)} className="text-slate-400 hover:text-slate-600 p-1"><X size={14} /></button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between w-full">
                                        <span className="text-xs font-bold text-slate-600">
                                          <span className="font-mono text-[9px] text-slate-400 mr-2">{region.code}</span>
                                          {region.name}
                                        </span>
                                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover/item:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => {
                                              setEditingRegionModeId(region.id);
                                              setEditingRegionNameStr(region.name);
                                              setEditingRegionCodeStr(region.code || "");
                                            }}
                                            className="text-slate-400 hover:text-adasa-mid transition-colors p-1"
                                            title="Renomear/Código"
                                          >
                                            <Edit3 size={14} />
                                          </button>
                                          <button
                                            onClick={() =>
                                              setEditingRegionId(region.id)
                                            }
                                            className="text-slate-400 hover:text-adasa-mid transition-colors p-1"
                                            title="Editar Dados Demanda"
                                          >
                                            <Database size={14} />
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleDeleteRegion(region)
                                            }
                                            className="text-rose-400 hover:text-rose-500 transition-colors p-1"
                                            title="Excluir"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              <button
                                onClick={() => handleAddRegion(system.id)}
                                className="text-xs font-bold text-adasa-mid hover:text-adasa-dark transition-colors flex items-center gap-1 mt-2"
                              >
                                <Plus size={14} /> Adicionar Região
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ))}
                
                {manageSubTab === "demand" && demandSubTab === "view" && renderDemandTable()}
                {manageSubTab === "supply" && supplySubTab === "view" && renderSupplyTable()}
              </div>
            </motion.div>
          ) : activeTab === "templates" ? (
            <motion.div
              key="templates"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-6xl mx-auto w-full"
            >
              <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-slate-800 text-lg uppercase tracking-tighter">
                    Arquivos Modelo Cadastrados
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveTemplates}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-colors shadow-sm"
                      title="Salvar apenas os arquivos modelo diretamente no banco"
                    >
                      <Save size={14} /> Salvar Modelos
                    </button>
                    <button
                      onClick={() => setIsAddingTemplate(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-adasa-mid text-white text-xs font-bold rounded-xl hover:bg-adasa-dark transition-colors shadow-sm"
                    >
                      <Plus size={14} /> Cadastrar Novo Modelo
                    </button>
                  </div>
                </div>
                
                {isAddingTemplate && (
                  <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-end gap-4 overflow-x-auto">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Nome do Modelo
                      </label>
                      <input
                        type="text"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-adasa-mid focus:ring-4 focus:ring-adasa-mid/20 outline-none transition-all"
                        placeholder="Ex: Planilha Demanda.csv"
                      />
                    </div>
                    <div className="flex-[2] min-w-[300px]">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Descrição
                      </label>
                      <input
                        type="text"
                        value={newTemplateDesc}
                        onChange={(e) => setNewTemplateDesc(e.target.value)}
                        className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-adasa-mid focus:ring-4 focus:ring-adasa-mid/20 outline-none transition-all"
                        placeholder="Ex: Utilize este modelo para importar demanda."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (!newTemplateName.trim()) return;
                            const validTplIds = templateFiles.map(t => Number(t.id)).filter(id => !isNaN(id));
                            const maxTplId = validTplIds.length > 0 ? Math.max(...validTplIds) : 0;
                            const newId = maxTplId + 1;
                            setTemplateFiles(prev => [...prev, { id: newId, name: newTemplateName.trim(), description: newTemplateDesc.trim(), url: "" }]);
                            setNewTemplateName("");
                            setNewTemplateDesc("");
                            setIsAddingTemplate(false);
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (!newTemplateName.trim()) return;
                          const validTplIds = templateFiles.map(t => Number(t.id)).filter(id => !isNaN(id));
                          const maxTplId = validTplIds.length > 0 ? Math.max(...validTplIds) : 0;
                          const newId = maxTplId + 1;
                          setTemplateFiles(prev => [...prev, { id: newId, name: newTemplateName.trim(), description: newTemplateDesc.trim(), url: "" }]);
                          setNewTemplateName("");
                          setNewTemplateDesc("");
                          setIsAddingTemplate(false);
                        }}
                        className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-sm whitespace-nowrap"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => {
                          setNewTemplateName("");
                          setNewTemplateDesc("");
                          setIsAddingTemplate(false);
                        }}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm whitespace-nowrap"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto flex-1 custom-scrollbar">
                  <table className="w-full text-left border-separate border-spacing-0 min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 sticky top-0 z-10 w-48">
                          Nome
                        </th>
                        <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 sticky top-0 z-10 w-full">
                          Descrição
                        </th>
                        <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right bg-slate-50/50 sticky top-0 z-10 w-32">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {templateFiles.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-8 text-center text-slate-400 text-sm font-medium">
                            Nenhum arquivo modelo cadastrado.
                          </td>
                        </tr>
                      ) : (
                        templateFiles.map((tpl) => (
                          <tr key={tpl.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-3 py-4 font-black text-slate-700 uppercase tracking-wide text-xs">
                              {tpl.name}
                            </td>
                            <td className="px-3 py-4 text-slate-500 text-sm">
                              {tpl.description}
                            </td>
                            <td className="px-3 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <label className="cursor-pointer text-slate-400 hover:text-adasa-mid transition-colors bg-white p-2 rounded-lg shadow-sm border border-slate-200" title="Anexar Arquivo">
                                  <Upload size={14} />
                                  <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                          const result = event.target?.result as string;
                                          if (result) {
                                            setTemplateFiles(prev => prev.map(t => t.id === tpl.id ? { ...t, url: result } : t));
                                            showToast("Sucesso", "Arquivo anexado e salvo localmente.", "success");
                                          }
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                </label>
                                {tpl.url && (
                                  <>
                                    <a
                                      href={tpl.url}
                                      download={tpl.name}
                                      className="text-slate-400 hover:text-emerald-500 transition-colors bg-white p-2 rounded-lg shadow-sm border border-slate-200 block"
                                      title="Baixar Arquivo"
                                    >
                                      <Download size={14} />
                                    </a>
                                    <button
                                      onClick={() => {
                                        setConfirmState({
                                          message: "Remover o arquivo anexado a este modelo?",
                                          onConfirm: () => {
                                            setTemplateFiles(prev => prev.map(t => t.id === tpl.id ? { ...t, url: "" } : t));
                                          }
                                        });
                                      }}
                                      className="text-slate-400 hover:text-rose-500 transition-colors bg-white p-2 rounded-lg shadow-sm border border-slate-200 block"
                                      title="Remover Arquivo"
                                    >
                                      <X size={14} />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => {
                                    setConfirmState({
                                      message: "Certeza que deseja remover este modelo?",
                                      onConfirm: () => {
                                        setTemplateFiles(prev => prev.filter(t => t.id !== tpl.id));
                                      }
                                    });
                                  }}
                                  className="text-slate-400 hover:text-rose-500 transition-colors bg-white p-2 rounded-lg shadow-sm border border-slate-200"
                                  title="Excluir Modelo"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : activeTab === "users" ? (
            <motion.div
              key="users"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-7xl mx-auto w-full"
            >
              <UserManagementTab />
            </motion.div>
          ) : activeTab === "planning" ? (
            <motion.div
              key="planning"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-7xl mx-auto w-full"
            >
              <PlanningTab 
                tasks={tasks}
                setTasks={setTasks}
                showToast={showToast}
                activeSubTab={activePlanningSubTab}
                setConfirmState={setConfirmState}
                myTasksFilterTrigger={myTasksFilterTrigger}
              />
            </motion.div>
          ) : activeTab === "reg_cadastro" ? (
            <motion.div
              key="reg_cadastro"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-7xl mx-auto w-full"
            >
              <React.Suspense fallback={<div className="flex justify-center p-12 text-slate-400">Carregando...</div>}>
                <ResolutionsTab showToast={showToast} currentUser={currentUser} />
              </React.Suspense>
            </motion.div>
          ) : activeTab === "reg_painel" ? (
            <motion.div
              key="reg_painel"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-7xl mx-auto w-full"
            >
              <ResolutionsDashboard showToast={showToast} />
            </motion.div>
          ) : activeTab === "gerencial" ? (
            <motion.div
              key="gerencial"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-7xl mx-auto w-full space-y-6"
            >
              <div className="flex justify-end pr-2">
                <button
                  type="button"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}${window.location.pathname}?public=gerencial`;
                    navigator.clipboard.writeText(shareUrl);
                    showToast("Sucesso", "Link público copiado com sucesso! Compartilhe com qualquer pessoa.", "success");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  <Copy size={14} />
                  Copiar Link Público do Painel
                </button>
              </div>
              <ManagerialHub 
                onOpenPlanning={() => {
                  setActivePlanningSubTab("dashboard");
                  handleTabChange("planning");
                }}
                onOpenResolutions={() => {
                  handleTabChange("reg_painel");
                }}
                isPublic={false}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>



      {confirmState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmState(null)} />
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200 relative z-10 overflow-hidden border border-slate-200">
            <div className={`${confirmState.type === 'alert' ? 'bg-amber-50/50' : 'bg-rose-50/50'} p-5 border-b border-slate-100 flex items-start gap-4`}>
              <div className={`p-3 bg-white rounded-xl shadow-sm border ${confirmState.type === 'alert' ? 'text-amber-500 border-amber-100' : 'text-rose-500 border-rose-100'}`}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">{confirmState.title || (confirmState.type === 'alert' ? "Atenção" : "Confirmar Ação")}</h3>
                <p className="text-sm font-medium text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">{confirmState.message}</p>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 flex justify-end gap-3">
              {confirmState.type === 'alert' ? (
                <button
                  onClick={() => setConfirmState(null)}
                  className="px-5 py-2 font-bold text-sm text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-sm shadow-amber-500/20"
                >
                  Entendi
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setConfirmState(null)}
                    className="px-4 py-2 font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (confirmState.onConfirm) confirmState.onConfirm();
                      setConfirmState(null);
                    }}
                    className="px-5 py-2 font-bold text-sm text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors shadow-sm shadow-rose-500/20"
                  >
                    Confirmar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isSaving && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
            <div className="relative flex items-center justify-center w-16 h-16">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-adasa-mid border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="text-center max-w-[240px]">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-widest mb-2">Processando Dados</h3>
              <p className="text-xs font-semibold text-slate-500 leading-relaxed">Por favor, aguarde enquanto as informações são salvas no banco...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
