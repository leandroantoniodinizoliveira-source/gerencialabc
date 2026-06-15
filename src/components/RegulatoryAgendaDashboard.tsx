import React, { useState, useEffect, useMemo } from "react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  CartesianGrid, 
  Legend 
} from "recharts";
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  TrendingUp, 
  Search, 
  Filter, 
  ExternalLink, 
  Share2, 
  Layers, 
  Compass, 
  Sparkles,
  CalendarCheck,
  ChevronDown,
  ChevronRight
} from "lucide-react";

interface Task {
  id: number;
  title: string;
  description?: string;
  status?: string;
}

interface RegulatoryAgenda {
  id: number;
  nome: string;
  tema: string;
  status: string;
  entrega: string;
  task_ids: number[];
  agenda_tasks?: {
    task_id: number;
    status: string;
    entrega: string;
    entrega_link?: string;
  }[];
}

interface RegulatoryAgendaDashboardProps {
  showToast: any;
}

export function RegulatoryAgendaDashboard({ showToast }: RegulatoryAgendaDashboardProps) {
  const [agendas, setAgendas] = useState<RegulatoryAgenda[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [searchText, setSearchText] = useState("");
  const [filterTema, setFilterTema] = useState("TODOS");
  const [filterStatus, setFilterStatus] = useState("TODOS");

  // State to track collapsed/expanded agendas in the table grouping
  const [collapsedAgendas, setCollapsedAgendas] = useState<Record<string, boolean>>({});

  const toggleAgendaCollapse = (agendaNome: string) => {
    setCollapsedAgendas(prev => ({
      ...prev,
      [agendaNome]: !prev[agendaNome]
    }));
  };

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const agendasRes = await fetch("/api/agendas");
        if (!agendasRes.ok) {
          throw new Error(`Erro na API agendas: ${agendasRes.status}`);
        }
        const agendasJson = await agendasRes.json();
        
        const tasksRes = await fetch("/api/tasks");
        if (!tasksRes.ok) {
          throw new Error(`Erro na API tasks: ${tasksRes.status}`);
        }
        const tasksJson = await tasksRes.json();

        if (agendasJson.success) {
          setAgendas(agendasJson.data || []);
        } else {
          showToast(agendasJson.error || "Erro ao carregar agendas.", "error");
        }

        if (tasksJson.success) {
          setTasks(tasksJson.data || []);
        }
      } catch (error: any) {
        console.error("Erro no fetchData do RegulatoryAgendaDashboard:", error);
        showToast(error.message || "Erro ao estabelecer conexão de dados.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const themeList = [
    "TODOS",
    "QUALIDADE DA PRESTAÇÃO DOS SERVIÇOS",
    "FORTALECIMENTO DA CAPACIDADE REGULATÓRIA"
  ];

  const statusList = [
    "TODOS",
    "Não Concluída",
    "Prevista",
    "Concluída"
  ];

  // Map Task names for quick lookup
  const taskMap = useMemo(() => {
    const map: Record<number, Task> = {};
    tasks.forEach(t => {
      map[t.id] = t;
    });
    return map;
  }, [tasks]);

  // Aggregate stats across all agendas and items
  const stats = useMemo(() => {
    let totalItems = 0;
    let completedItems = 0;
    let previstaItems = 0;
    let pendingItems = 0;

    agendas.forEach(agenda => {
      const items = agenda.agenda_tasks || [];
      items.forEach(it => {
        totalItems++;
        if (it.status === "Concluída") {
          completedItems++;
        } else if (it.status === "Prevista") {
          previstaItems++;
        } else {
          pendingItems++;
        }
      });
    });

    return {
      totalAgendas: agendas.length,
      totalItems,
      completedItems,
      previstaItems,
      pendingItems,
      completedPct: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      previstaPct: totalItems > 0 ? Math.round((previstaItems / totalItems) * 100) : 0,
      pendingPct: totalItems > 0 ? Math.round((pendingItems / totalItems) * 100) : 0
    };
  }, [agendas]);

  // Chart data: Distribution of items status
  const pieChartData = useMemo(() => {
    return [
      { name: "Concluída", value: stats.completedItems, color: "#10b981" },
      { name: "Prevista", value: stats.previstaItems, color: "#0ea5e9" },
      { name: "Não Concluída", value: stats.pendingItems, color: "#f43f5e" }
    ].filter(i => i.value > 0);
  }, [stats]);

  // Chart data: Themes performance (stacked bars)
  const themeChartData = useMemo(() => {
    const dataMap: Record<string, { concluida: number; prevista: number; naoConcluida: number }> = {};
    
    // Initialize
    themeList.forEach(theme => {
      if (theme !== "TODOS") {
        dataMap[theme] = { concluida: 0, prevista: 0, naoConcluida: 0 };
      }
    });

    agendas.forEach(agenda => {
      const theme = agenda.tema;
      if (!dataMap[theme]) {
        dataMap[theme] = { concluida: 0, prevista: 0, naoConcluida: 0 };
      }
      const items = agenda.agenda_tasks || [];
      items.forEach(it => {
        if (it.status === "Concluída") {
          dataMap[theme].concluida++;
        } else if (it.status === "Prevista") {
          dataMap[theme].prevista++;
        } else {
          dataMap[theme].naoConcluida++;
        }
      });
    });

    return Object.keys(dataMap).map(key => {
      let displayName = key;
      if (key === "QUALIDADE DA PRESTAÇÃO DOS SERVIÇOS") {
        displayName = "Qualidade Mod. 1";
      } else if (key === "FORTALECIMENTO DA CAPACIDADE REGULATÓRIA") {
        displayName = "Capacid. Regulatória";
      }

      return {
        tema: displayName,
        fullTemaName: key,
        "Concluída": dataMap[key].concluida,
        "Prevista": dataMap[key].prevista,
        "Não Concluída": dataMap[key].naoConcluida
      };
    });
  }, [agendas, themeList]);

  // Filtered listing of all individual items (tasks) across agendas
  const flattenedAndFilteredItems = useMemo(() => {
    const items: Array<{
      agendaId: number;
      agendaNome: string;
      agendaTema: string;
      taskId: number;
      taskTitle: string;
      status: string;
      entrega: string;
      entregaLink?: string;
    }> = [];

    agendas.forEach(agenda => {
      const agendaTasks = agenda.agenda_tasks || [];
      agendaTasks.forEach(it => {
        const taskObj = taskMap[it.task_id];
        const taskTitle = taskObj ? taskObj.title : `Atividade ID: ${it.task_id}`;
        
        // Apply filters
        const matchesSearch = searchText === "" || 
          taskTitle.toLowerCase().includes(searchText.toLowerCase()) ||
          agenda.nome.toLowerCase().includes(searchText.toLowerCase()) ||
          (it.entrega || "").toLowerCase().includes(searchText.toLowerCase());

        const matchesTema = filterTema === "TODOS" || agenda.tema === filterTema;
        const matchesStatus = filterStatus === "TODOS" || it.status === filterStatus;

        if (matchesSearch && matchesTema && matchesStatus) {
          items.push({
            agendaId: agenda.id,
            agendaNome: agenda.nome,
            agendaTema: agenda.tema,
            taskId: it.task_id,
            taskTitle: taskTitle,
            status: it.status,
            entrega: it.entrega,
            entregaLink: it.entrega_link
          });
        }
      });
    });

    return items;
  }, [agendas, taskMap, searchText, filterTema, filterStatus]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof flattenedAndFilteredItems> = {};
    flattenedAndFilteredItems.forEach(item => {
      if (!groups[item.agendaNome]) {
        groups[item.agendaNome] = [];
      }
      groups[item.agendaNome].push(item);
    });
    return groups;
  }, [flattenedAndFilteredItems]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white border border-slate-200/80 rounded-[2rem] shadow-sm mt-8 max-w-7xl mx-auto min-h-[500px]">
        <div className="w-12 h-12 border-4 border-adasa-mid border-t-transparent rounded-full animate-spin mb-4"></div>
        <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Carregando Indicadores...</h4>
        <p className="text-xs text-slate-400 mt-1">Sincronizando status das ações regulatórias.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-200 text-left flex flex-col gap-6">
      {/* Header element */}
      <div className="bg-gradient-to-r from-adasa-dark to-[#133170] rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-adasa-mid/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 font-bold">
          <span className="text-[10px] bg-white/10 text-white/90 border border-white/20 px-3 py-1 rounded-full font-black uppercase tracking-widest leading-none mb-3 inline-block">
            MAPEAMENTO & MONITORAMENTO REGULATÓRIO
          </span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-none">
            Painel Estratégico da Agenda Regulatória
          </h2>
          <p className="text-xs text-blue-105 font-medium mt-2">
            Agenda Regulatória da Superintendência de Abastecimento de Água e Esgoto • ADASA
          </p>
        </div>
        <div className="relative z-10 shrink-0 self-start md:self-center">
          <button
            onClick={() => {
              const shareUrl = `${window.location.origin}${window.location.pathname}?public=reg_agenda_painel`;
              navigator.clipboard.writeText(shareUrl)
                .then(() => {
                  showToast("Link Copiado!", "O link de acesso público do painel da agenda regulatória foi copiado para a área de transferência.", "success");
                })
                .catch(() => {
                  alert(`Link público do painel: ${shareUrl}`);
                });
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all text-white border border-white/25 rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer select-none"
          >
            <Share2 size={14} className="text-adasa-light animate-pulse" />
            <span>Compartilhar Painel</span>
          </button>
        </div>
      </div>

      {/* Middle broad banner - Estoque Regulatório Total */}
      <div className="bg-gradient-to-r from-adasa-mid to-[#109FEF] rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-white/15 border border-white/25 rounded-2xl flex items-center justify-center shrink-0">
            <FileText size={28} className="text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-sky-100 block">
              TOTAL DE ITENS REGULATÓRIOS
            </span>
            <h3 className="text-4xl md:text-5xl font-black text-white leading-none mt-2">
              {stats.totalItems}
            </h3>
            <p className="text-xs text-sky-100/90 font-medium mt-1">
              Metas e atividades cadastradas e monitoradas pelas superintendências
            </p>
          </div>
        </div>
        <div className="relative z-10 shrink-0 self-start md:self-center">
          <div className="bg-white/10 border border-white/20 text-white rounded-full px-5 py-2.5 text-xs font-bold leading-none select-none shadow-sm">
            Base de Dados Integrada em Tempo Real
          </div>
        </div>
      </div>

      {/* KPI Overviews container (4 columns matching mockup) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Concluídas (Green) */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl flex items-center gap-4 shadow-sm hover:translate-y-[-2px] transition-all">
          <div className="w-12 h-12 bg-emerald-500/10 text-[#008A3F] border border-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none">CONCLUÍDAS</span>
            <span className="text-3xl font-black text-slate-800 tracking-tight mt-1">{stats.completedItems}</span>
            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{stats.completedPct}% das metas concluídas</p>
          </div>
        </div>

        {/* KPI 2: Previstas (Orange) */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl flex items-center gap-4 shadow-sm hover:translate-y-[-2px] transition-all">
          <div className="w-12 h-12 bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/15 rounded-2xl flex items-center justify-center shrink-0">
            <AlertTriangle size={22} className="stroke-[2.5px]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none">PREVISTAS</span>
            <span className="text-3xl font-black text-slate-800 tracking-tight mt-1">{stats.previstaItems}</span>
            <p className="text-[10px] text-amber-600 font-bold mt-0.5">Fases normativas agendadas</p>
          </div>
        </div>

        {/* KPI 3: Não Concluídas (Pink/Red) */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl flex items-center gap-4 shadow-sm hover:translate-y-[-2px] transition-all">
          <div className="w-12 h-12 bg-rose-500/10 text-rose-600 border border-rose-550/15 rounded-2xl flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none">NÃO CONCLUÍDAS</span>
            <span className="text-3xl font-black text-slate-800 tracking-tight mt-1">{stats.pendingItems}</span>
            <p className="text-[10px] text-rose-500 font-bold mt-0.5">Demandas remanescentes</p>
          </div>
        </div>

        {/* KPI 4: Agendas Ativas (Blue) */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl flex items-center gap-4 shadow-sm hover:translate-y-[-2px] transition-all">
          <div className="w-12 h-12 bg-sky-500/10 text-sky-600 border border-sky-550/15 rounded-2xl flex items-center justify-center shrink-0">
            <BookOpen size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none">AGENDAS ATIVAS</span>
            <span className="text-3xl font-black text-slate-800 tracking-tight mt-1">{stats.totalAgendas}</span>
            <p className="text-[10px] text-sky-600 font-bold mt-0.5">Planos estratégicos em vigor</p>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Compass size={16} className="text-adasa-dark" />
              Execução das Metas por Situação
            </h4>
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              Distribuição percentual global das metas cadastradas por status de entrega (pizza completa).
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mt-4 flex-1">
            <div className="w-40 h-40 shrink-0 relative flex items-center justify-center">
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ border: 'none', borderRadius: '12px', background: '#0f172a', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-xs text-slate-400 font-medium">Nenhum item associado disponível</span>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-3 justify-center">
              {pieChartData.map((entry, idx) => {
                const pct = stats.totalItems > 0 ? ((entry.value / stats.totalItems) * 100).toFixed(1) : "0.0";
                return (
                  <div key={idx} className="flex flex-col">
                    <div className="flex items-center gap-2 font-black text-xs text-slate-800 uppercase tracking-tight">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <span>{entry.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-bold ml-5">
                      {entry.value} {entry.value === 1 ? 'Meta' : 'Metas'} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stacked theme distribution chart */}
        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={16} className="text-adasa-dark" />
              Metas por Tema e Situação
            </h4>
            <p className="text-[11px] font-bold text-slate-400 mt-1 mb-4">
              Distribuição quantitativa de itens normativos e progresso por cada área regulatória estratégica.
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-end">
            {/* Custom Legend to match screenshot */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-black uppercase text-slate-505 mb-4 select-none">
              <span className="text-slate-400">Situação:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span>Concluída</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9]" />
                <span>Prevista</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
                <span>Não Concluída</span>
              </div>
            </div>

            <div className="h-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={themeChartData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="tema" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ border: 'none', borderRadius: '16px', background: '#0f172a', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="Não Concluída" stackId="a" fill="#f43f5e" />
                  <Bar dataKey="Prevista" stackId="a" fill="#0ea5e9" />
                  <Bar dataKey="Concluída" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Agendas Performance */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
          <BookOpen size={16} className="text-adasa-dark" />
          Status de Execução das Agendas Regulatórias
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-widest font-black text-[10px]">
                <th className="px-5 py-4">Agenda / Nome</th>
                <th className="px-5 py-4">Tema Estratégico</th>
                <th className="px-5 py-4 text-center">Ações Vinculadas</th>
                <th className="px-5 py-4 text-center">Metas Concluídas</th>
                <th className="px-5 py-4">Progresso Geral</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agendas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 font-semibold">
                    Nenhuma agenda cadastrada.
                  </td>
                </tr>
              ) : (
                agendas.map(agenda => {
                  const items = agenda.agenda_tasks || [];
                  const total = items.length;
                  const completed = items.filter(it => it.status === "Concluída").length;
                  const previstas = items.filter(it => it.status === "Prevista").length;
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                  return (
                    <tr key={agenda.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-800">{agenda.nome}</td>
                      <td className="px-5 py-4 text-slate-500 font-semibold">{agenda.tema}</td>
                      <td className="px-5 py-4 text-center font-black text-slate-600">{total}</td>
                      <td className="px-5 py-4 text-center font-bold text-adasa-dark">
                        {completed} de {total}
                        {previstas > 0 && (
                          <span className="text-[9px] text-adasa-mid block">({previstas} prevista{previstas > 1 ? 's' : ''})</span>
                        )}
                      </td>
                      <td className="px-5 py-4 w-44">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-adasa-green' : pct >= 50 ? 'bg-adasa-mid' : 'bg-amber-550'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`font-black text-[10px] w-8 text-right ${pct === 100 ? 'text-adasa-green' : pct >= 50 ? 'text-adasa-mid' : 'text-amber-600'}`}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item-by-item detailed listing table (Interactive) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-adasa-dark" />
              Detalhador de Metas da Agenda
            </h4>
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              Relação detalhada de cada item/meta associada para acompanhamento das entregas e anexos.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search items bar */}
            <div className="relative flex-1 md:flex-initial md:min-w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" size={15} />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Filtrar atividade ou entrega..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:bg-white focus:border-adasa-mid outline-none transition-all"
              />
            </div>

            {/* Tema filter */}
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-slate-405 shrink-0" />
              <select
                value={filterTema}
                onChange={(e) => setFilterTema(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 outline-none cursor-pointer focus:border-adasa-mid transition-colors"
              >
                {themeList.map((st, idx) => (
                  <option key={idx} value={st}>{st === "TODOS" ? "Todos os Temas" : st.substring(0, 25) + "..."}</option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 outline-none cursor-pointer focus:border-adasa-mid transition-colors"
            >
              {statusList.map((st, idx) => (
                <option key={idx} value={st}>{st === "TODOS" ? "Todos os Status" : st}</option>
              ))}
            </select>
          </div>
        </div>

        {/* List of actions/items */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-150 text-slate-500 uppercase tracking-widest font-black text-[10px]">
                <th className="px-5 py-3.5 pl-8">Item / Atividade Regulatória</th>
                <th className="px-5 py-3.5">Meta / Tipo de Entrega</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Documento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flattenedAndFilteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-400 font-medium">
                    Nenhum item encontrado para as chaves de busca e filtros ativos.
                  </td>
                </tr>
              ) : (
                (Object.entries(groupedItems) as [string, typeof flattenedAndFilteredItems][]).map(([agendaNome, items]) => {
                  const isCollapsed = !!collapsedAgendas[agendaNome];
                  return (
                    <React.Fragment key={agendaNome}>
                      <tr 
                        onClick={() => toggleAgendaCollapse(agendaNome)}
                        className="bg-blue-50/20 border-y border-blue-100/30 cursor-pointer hover:bg-slate-100/60 select-none transition-all"
                      >
                        <td colSpan={4} className="px-5 py-3 font-black text-adasa-dark text-[11px] uppercase tracking-wider bg-slate-50/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BookOpen size={13} className="text-adasa-mid" />
                              <span>Agenda: {agendaNome}</span>
                              <span className="text-[9px] bg-blue-50 text-adasa-mid px-2 py-0.5 rounded-full font-black">
                                {items.length} {items.length === 1 ? "Item/Meta" : "Itens/Metas"}
                              </span>
                            </div>
                            <div className="flex items-center text-adasa-mid font-bold text-[10px] uppercase gap-1 bg-white border border-blue-100/80 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                              <span>{isCollapsed ? "Expandir" : "Recolher"}</span>
                              {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                            </div>
                          </div>
                        </td>
                      </tr>
                      {!isCollapsed && items.map((item, idx) => {
                        return (
                          <tr key={`${item.agendaId}-${item.taskId}-${idx}`} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-5 py-4 font-bold text-slate-800 text-[13px] max-w-xs whitespace-normal pl-8">
                              {item.taskTitle}
                            </td>
                            <td className="px-5 py-4 text-slate-600 font-medium whitespace-pre-wrap max-w-xs text-left">
                              {item.entrega || <span className="text-slate-350 italic">Sem detalhamento de meta</span>}
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                item.status === "Concluída" 
                                  ? "bg-emerald-50 text-adasa-green border border-emerald-200" 
                                  : item.status === "Prevista"
                                  ? "bg-blue-50 text-adasa-mid border border-blue-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              {item.entregaLink ? (
                                <a 
                                  href={item.entregaLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100/80 active:bg-blue-200 text-adasa-dark font-black uppercase text-[9px] tracking-wider rounded-lg transition-colors border border-blue-200"
                                >
                                  <ExternalLink size={11} />
                                  Acessar Link
                                </a>
                              ) : (
                                <span className="text-slate-350 italic text-[10px] font-medium">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
