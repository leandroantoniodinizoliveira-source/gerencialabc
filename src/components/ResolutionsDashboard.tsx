import { useState, useEffect } from "react";
import { ResponsiveContainer, ComposedChart, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid, Line, LabelList } from "recharts";
import { FileText, CheckCircle2, AlertTriangle, HelpCircle, Activity, BookmarkCheck, Calendar, History, Search, ArrowUpDown, Filter, ExternalLink, Share2 } from "lucide-react";

interface Resolution {
  id: number;
  especie: string;
  numero: number;
  ano: number;
  data: string;
  ementa: string;
  situacao: string;
  area: string;
  segmento: string;
  tipo: string;
  link: string;
}

interface ResolutionsDashboardProps {
  showToast: any;
}

export function ResolutionsDashboard({ showToast }: ResolutionsDashboardProps) {
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [segmentViewMode, setSegmentViewMode] = useState<"chart" | "bento">("bento");

  // Timeline filters and controls
  const [timelineSearchText, setTimelineSearchText] = useState("");
  const [timelineStatusFilter, setTimelineStatusFilter] = useState("");
  const [timelineSegmentFilter, setTimelineSegmentFilter] = useState("");
  const [timelineSortOrder, setTimelineSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});

  // Load resolutions
  useEffect(() => {
    const fetchResolutions = async () => {
      try {
        const response = await fetch("/api/resolutions");
        const json = await response.json();
        if (json.success) {
          setResolutions(json.data);
        } else {
          showToast(json.error || "Erro ao carregar dados do painel.", "error");
        }
      } catch {
        showToast("Erro ao estabelecer conexão para carregar dados do painel.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchResolutions();
  }, []);

  // Compute stats
  const totalCount = resolutions.length;
  const vigenteCount = resolutions.filter(r => r.situacao === "Vigente").length;
  const alteradaCount = resolutions.filter(r => r.situacao === "Vigente com alterações").length;
  const revogadaCount = resolutions.filter(r => r.situacao === "Revogada").length;

  // Média de resoluções por ano
  const uniqueYears = Array.from(new Set(resolutions.map(r => r.ano).filter(Boolean)));
  const yearsCount = uniqueYears.length;
  const averagePerYear = yearsCount > 0 ? (totalCount / yearsCount) : 0;

  // 1. Data by Year
  const yearMap: { [key: number]: number } = {};
  resolutions.forEach(r => {
    if (r.ano) {
      yearMap[r.ano] = (yearMap[r.ano] || 0) + 1;
    }
  });
  // 1a. Data by Year with Accumulated Quantity
  const sortedYearsForAccum = Object.keys(yearMap)
    .map(Number)
    .sort((a, b) => a - b);

  let accumulated = 0;
  const yearAccumulatedData = sortedYearsForAccum.map(yr => {
    const cnt = yearMap[yr] || 0;
    accumulated += cnt;
    return {
      year: yr.toString(),
      count: cnt,
      accumulated: accumulated
    };
  });

  // 1b. Data by Year and Situation
  const situationYearMap: { [year: number]: { vigente: number; alterada: number; revogada: number } } = {};
  resolutions.forEach(r => {
    if (r.ano) {
      if (!situationYearMap[r.ano]) {
        situationYearMap[r.ano] = { vigente: 0, alterada: 0, revogada: 0 };
      }
      if (r.situacao === "Vigente") {
        situationYearMap[r.ano].vigente += 1;
      } else if (r.situacao === "Vigente com alterações") {
        situationYearMap[r.ano].alterada += 1;
      } else if (r.situacao === "Revogada") {
        situationYearMap[r.ano].revogada += 1;
      }
    }
  });

  const situationYearData = Object.keys(situationYearMap)
    .map(yr => {
      const y = parseInt(yr);
      return {
        year: yr,
        Vigente: situationYearMap[y].vigente,
        "Vigente com alterações": situationYearMap[y].alterada,
        Revogada: situationYearMap[y].revogada
      };
    })
    .sort((a, b) => parseInt(a.year) - parseInt(b.year));

  // Custom label renderer to display values inside bar segments
  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    if (!value || value === 0) return null;
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        fontWeight="bold"
      >
        {value}
      </text>
    );
  };

  // 2. Data by Status (Pie chart)
  const statusData = [
    { name: "Vigente", value: vigenteCount, color: "#0091DA" },
    { name: "Vigente com alterações", value: alteradaCount, color: "#008A3F" },
    { name: "Revogada", value: revogadaCount, color: "#e11d48" }
  ].filter(s => s.value > 0);

  // 3. Data by Segment (Bar horizontal)
  const segmentMap: { [key: string]: number } = {};
  resolutions.forEach(r => {
    const seg = r.segmento || "Não Definido";
    segmentMap[seg] = (segmentMap[seg] || 0) + 1;
  });
  const segmentData = Object.keys(segmentMap)
    .map(seg => ({ name: seg, count: segmentMap[seg] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // top 10

  // Timeline calculations
  const filteredResolutions = resolutions.filter(res => {
    const matchesSearch = timelineSearchText ? (
      (res.ementa || "").toLowerCase().includes(timelineSearchText.toLowerCase()) ||
      (res.numero || "").toString().includes(timelineSearchText) ||
      (res.especie || "").toLowerCase().includes(timelineSearchText.toLowerCase())
    ) : true;
    
    const matchesStatus = timelineStatusFilter ? res.situacao === timelineStatusFilter : true;
    const matchesSegment = timelineSegmentFilter ? res.segmento === timelineSegmentFilter : true;
    
    return matchesSearch && matchesStatus && matchesSegment;
  });

  const rawYears = Array.from(new Set(filteredResolutions.filter(r => r.ano).map(r => r.ano))) as number[];
  const timelineYears = rawYears.sort((a, b) => {
    const numA = Number(a);
    const numB = Number(b);
    return timelineSortOrder === "desc" ? numB - numA : numA - numB;
  });

  const timelineSegments = Array.from(new Set(resolutions.map(r => r.segmento).filter(Boolean))) as string[];
  timelineSegments.sort();

  const toggleYear = (y: number) => {
    setExpandedYears(prev => ({
      ...prev,
      [y]: prev[y] === false ? true : false
    }));
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white border border-slate-200/80 rounded-[2rem] shadow-sm mt-8 w-full min-h-[500px]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Estruturando Métricas...</h4>
        <p className="text-xs text-slate-400 mt-1">Carregando painel de resoluções.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 rounded-3xl p-8 border border-slate-200 text-left flex flex-col gap-6">
      {/* Header element */}
      <div className="bg-adasa-dark rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 font-bold">
          <span className="text-[10px] bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full font-black uppercase tracking-widest leading-none mb-4 inline-block">
            Mapeamento & Monitoramento Regulatório
          </span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-none">
            Painel Estratégico de Resoluções
          </h2>
          <p className="text-xs text-indigo-150 font-medium mt-1.5">
            Estoque Regulatório da Superintendência de Abastecimento de Água e Esgoto • ADASA
          </p>
        </div>
        <div className="relative z-10 shrink-0 self-start md:self-center">
          <button
            onClick={() => {
              const shareUrl = `${window.location.origin}${window.location.pathname}?public=reg_painel`;
              navigator.clipboard.writeText(shareUrl)
                .then(() => {
                  if (showToast) {
                    showToast(
                      "Link Copiado!",
                      "O link de acesso público foi copiado para a área de transferência.",
                      "success"
                    );
                  }
                })
                .catch(() => {
                  alert(`Link público: ${shareUrl}`);
                });
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all text-white border border-white/25 rounded-2xl text-xs font-bold shadow-sm cursor-pointer select-none"
          >
            <Share2 size={14} className="text-adasa-light animate-pulse" />
            <span>Compartilhar Painel</span>
          </button>
        </div>
      </div>

      {/* Box de Destaque Superior: Total de Atos */}
      <div className="bg-gradient-to-r from-adasa-dark to-adasa-mid p-6 md:p-8 rounded-2xl border border-adasa-mid/20 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:translate-y-[-2px] transition-all text-white">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/10 rounded-2xl text-white backdrop-blur-md border border-white/25">
            <FileText size={32} />
          </div>
          <div>
            <span className="block text-xs font-black uppercase tracking-widest text-adasa-light">Estoque Regulatório Total</span>
            <span className="text-4xl md:text-5xl font-black leading-none mt-1">{totalCount}</span>
            <span className="block text-xs text-blue-100 font-bold mt-1.5">Resoluções publicadas e cadastradas no acervo</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/15 rounded-xl border border-white/20 text-xs font-semibold tracking-wide shadow-inner">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-450 animate-pulse"></span>
          <span className="font-extrabold text-blue-50">Base de Dados Integrada em Tempo Real</span>
        </div>
      </div>

      {/* KPI Cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="p-3 bg-emerald-50 border border-emerald-100/60 rounded-xl text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-black">Em Vigor</span>
            <span className="text-2xl font-black text-slate-800 leading-tight">{vigenteCount}</span>
            <span className="block text-[10px] text-emerald-600 font-semibold mt-0.5">
              {totalCount > 0 ? `${((vigenteCount / totalCount) * 100).toFixed(1)}%` : "0%"} do acervo ativo
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="p-3 bg-amber-50 border border-amber-100/60 rounded-xl text-amber-600">
            <AlertTriangle size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Vigente c/ Alterações</span>
            <span className="text-2xl font-black text-slate-800 leading-tight">{alteradaCount}</span>
            <span className="block text-[10px] text-amber-600 font-semibold mt-0.5">Atos com condicionantes</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="p-3 bg-rose-50 border border-rose-100/60 rounded-xl text-rose-600">
            <BookmarkCheck size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Não Vigente (Revogadas)</span>
            <span className="text-2xl font-black text-slate-800 leading-tight">{revogadaCount}</span>
            <span className="block text-[10px] text-rose-500 font-semibold mt-0.5">Acervo histórico arquivado</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-adasa-mid">
            <Activity size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Média por Ano</span>
            <span className="text-2xl font-black text-slate-800 leading-tight">{averagePerYear.toFixed(1)}</span>
            <span className="block text-[10px] text-adasa-mid font-semibold mt-0.5">Inclusões normativas anuais</span>
          </div>
        </div>
      </div>

      {/* Main charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Atos Publicados por Ano e Qtde Acumulada */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm lg:col-span-2">
          <div className="mb-2">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Atos Publicados por Ano e Qtde Acumulada</h4>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Evolução anual e volume acumulado de atos normativos ou resoluções editados.</p>
          </div>
          
          {/* Custom Legend */}
          <div className="flex justify-center items-center gap-6 mb-4 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#0091DA]"></span>
              <span>Qtde</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#1A3E8A]"></span>
              <span>Qtde acumulada</span>
            </div>
          </div>

          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={yearAccumulatedData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} fontWeight={600} />
                <YAxis
                  yAxisId="left"
                  stroke="#94a3b8"
                  fontSize={11}
                  fontWeight={600}
                  allowDecimals={false}
                  label={{ value: "Qtde anual (n)", angle: -90, position: "insideLeft", offset: 0, style: { fontSize: "10px", fill: "#475569", fontWeight: "bold" } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#94a3b8"
                  fontSize={11}
                  fontWeight={600}
                  allowDecimals={false}
                  label={{ value: "Qtde acumulada (n)", angle: 90, position: "insideRight", offset: 0, style: { fontSize: "10px", fill: "#475569", fontWeight: "bold" } }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} 
                  itemStyle={{ fontSize: "11px", fontWeight: "bold" }}
                  labelStyle={{ fontSize: "11px", fontWeight: "bold", color: "#fff" }}
                />
                <Bar yAxisId="left" dataKey="count" fill="#0091DA" radius={[4, 4, 0, 0]} name="Qtde" barSize={24}>
                  <LabelList dataKey="count" content={renderCustomBarLabel} />
                </Bar>
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="accumulated" 
                  stroke="#1A3E8A" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2, stroke: "#1A3E8A", fill: "#fff" }} 
                  activeDot={{ r: 6 }} 
                  name="Qtde acumulada" 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Atos Publicados por Situação (Pizza Completa) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Atos Publicados por Situação</h4>
            <p className="text-xs text-slate-400 font-medium mt-0.5 font-medium">Distribuição percentual global do acervo por situação de vigência (pizza completa).</p>
          </div>
          <div className="h-60 mt-2 flex flex-col sm:flex-row items-center justify-around gap-4">
            <div className="h-full w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", color: "#fff" }}
                    itemStyle={{ fontSize: "11px", fontWeight: "bold" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-col gap-3 justify-center text-left w-full sm:w-1/2">
              {statusData.map((item, index) => (
                <div key={index} className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full block border-2 border-white shadow-sm" style={{ backgroundColor: item.color }}></span>
                  <div>
                    <span className="block text-xs font-bold text-slate-700">{item.name}</span>
                    <span className="block text-[10px] font-semibold text-slate-400">{item.value} Resoluções ({((item.value / totalCount) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 3: Atos Publicados por Ano e Situação */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm">
          <div className="mb-2">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Atos Publicados por Ano e Situação</h4>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Distribuição anual dos atos normativos publicados por situação de eficácia.</p>
          </div>

          {/* Custom Legend */}
          <div className="flex justify-center items-center gap-4 mb-4 text-xs font-bold text-slate-600 flex-wrap">
            <span className="text-slate-400 font-semibold mr-1">Situação</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#e11d48]"></span>
              <span>Revogada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#0091DA]"></span>
              <span>Vigente</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#008A3F]"></span>
              <span>Vigente com alterações</span>
            </div>
          </div>

          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={situationYearData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} fontWeight={600} />
                <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} 
                  itemStyle={{ fontSize: "11px", fontWeight: "bold" }}
                  labelStyle={{ fontSize: "11px", fontWeight: "bold", color: "#fff" }}
                />
                
                {/* Stacked Bars representing the situations */}
                <Bar dataKey="Revogada" stackId="a" fill="#e11d48" barSize={24}>
                  <LabelList dataKey="Revogada" content={renderCustomBarLabel} />
                </Bar>
                <Bar dataKey="Vigente" stackId="a" fill="#0091DA" barSize={24}>
                  <LabelList dataKey="Vigente" content={renderCustomBarLabel} />
                </Bar>
                <Bar dataKey="Vigente com alterações" stackId="a" fill="#008A3F" barSize={24}>
                  <LabelList dataKey="Vigente com alterações" content={renderCustomBarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Ranking de Atos por Segmento e Assunto */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Ranking de Atos por Segmento e Assunto</h4>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Distribuição do volume de resoluções de acordo com os principais focos de saneamento regulado.</p>
            </div>
            
            {/* Visual presentation selector */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0 self-start sm:self-center">
              <button
                onClick={() => setSegmentViewMode("chart")}
                className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                  segmentViewMode === "chart"
                    ? "bg-white text-adasa-dark shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Gráfico
              </button>
              <button
                onClick={() => setSegmentViewMode("bento")}
                className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                  segmentViewMode === "bento"
                    ? "bg-white text-adasa-dark shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Scorecards
              </button>
            </div>
          </div>

          <div className="mt-2">
            {segmentViewMode === "chart" ? (
              <div className="h-[510px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={segmentData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} fontWeight={600} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={90} fontWeight={600} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", color: "#fff" }}
                      itemStyle={{ color: "#fb7185", fontSize: "11px", fontWeight: "bold" }}
                      labelStyle={{ fontSize: "11px", fontWeight: "bold", color: "#fff" }}
                    />
                    <Bar dataKey="count" fill="#0091DA" radius={[0, 8, 8, 0]} name="Normas Editadas" barSize={16}>
                      {segmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? "#1A3E8A" : index < 3 ? "#0091DA" : "#45C4F6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="space-y-2.5">
                {segmentData.map((item, index) => {
                  const maxCount = segmentData[0]?.count || 1;
                  const percentageOfMax = (item.count / maxCount) * 100;
                  const percentOfTotal = (item.count / totalCount) * 100;
                  const rankColor = index === 0 ? "bg-adasa-dark text-white" : index === 1 ? "bg-adasa-mid text-white" : index === 2 ? "bg-adasa-light text-white" : "bg-slate-100 text-slate-600";
                  const barColor = index === 0 ? "bg-adasa-dark" : index < 3 ? "bg-adasa-mid block" : "bg-[#93c5fd]";

                  return (
                    <div key={index} className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className={`w-6 h-6 flex items-center justify-center font-extrabold text-[10px] rounded-lg shrink-0 ${rankColor}`}>
                        {index + 1}º
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs font-bold text-slate-700 truncate mr-2" title={item.name}>
                            {item.name}
                          </span>
                          <span className="text-xs font-extrabold text-slate-800 shrink-0">
                            {item.count} <span className="text-[10px] font-semibold text-slate-400">({percentOfTotal.toFixed(1)}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                            style={{ width: `${percentageOfMax}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Timeline Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm lg:col-span-2">
          {/* Timeline Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-adasa-dark mt-0.5">
                <History size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Linha do Tempo de Atos Regulatórios</h4>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Evolução cronológica de resoluções regulatórias editadas com informações de vigência.</p>
              </div>
            </div>

            {/* Sorting Toggle button */}
            <button
              onClick={() => setTimelineSortOrder(prev => prev === "desc" ? "asc" : "desc")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <ArrowUpDown size={13} />
              {timelineSortOrder === "desc" ? "Mais recentes primeiro" : "Mais antigos primeiro"}
            </button>
          </div>

          {/* Timeline Controls/Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Buscar por ementa, número..."
                value={timelineSearchText}
                onChange={(e) => setTimelineSearchText(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-adasa-mid focus:border-adasa-mid font-semibold text-slate-700"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 py-2.5">
                <Filter size={14} />
              </span>
              <select
                value={timelineStatusFilter}
                onChange={(e) => setTimelineStatusFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-adasa-mid focus:border-adasa-mid font-bold text-slate-600 appearance-none cursor-pointer"
              >
                <option value="">Todas as Situações</option>
                <option value="Vigente">Vigente</option>
                <option value="Vigente com alterações">Vigente com alterações</option>
                <option value="Revogada">Revogada</option>
              </select>
            </div>

            {/* Segment Filter */}
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 py-2.5 font-bold">
                <Filter size={14} />
              </span>
              <select
                value={timelineSegmentFilter}
                onChange={(e) => setTimelineSegmentFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-adasa-mid focus:border-adasa-mid font-bold text-slate-600 appearance-none cursor-pointer"
              >
                <option value="">Todos os Segmentos</option>
                {timelineSegments.map((seg, idx) => (
                  <option key={idx} value={seg}>{seg}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Timeline Scrollable Content */}
          <div className="mt-4 relative max-h-[800px] overflow-y-auto pr-2">
            
            {/* Timeline Line (centered on desktop, left on mobile matching App.tsx) */}
            <div className="absolute inset-y-0 left-6 md:left-1/2 -translate-x-px w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200 pointer-events-none"></div>

            {timelineYears.length === 0 ? (
              <div className="text-center py-12 px-4 z-10 relative bg-white">
                <HelpCircle size={36} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 font-bold text-sm">Nenhum ato regulatório encontrado para os filtros selecionados.</p>
                <button 
                  onClick={() => {
                    setTimelineSearchText("");
                    setTimelineStatusFilter("");
                    setTimelineSegmentFilter("");
                  }}
                  className="mt-3 text-xs font-bold text-adasa-mid hover:text-adasa-dark transition-colors hover:underline"
                >
                  Limpar todos os filtros
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-8 py-4 relative">
                {timelineYears.map((year, yearIndex) => {
                  const yearResolutions = filteredResolutions.filter(r => r.ano === year);
                  const isCollapsed = expandedYears[year] === false; // defaults to true/expanded
                  
                  return (
                    <div key={year} className="relative flex flex-col md:flex-row md:items-start group">
                      
                      {/* Year badge circle */}
                      <div className="flex items-center justify-center w-12 h-12 rounded-full border-[3px] border-white bg-adasa-dark text-white shadow-md shrink-0 z-10 overflow-hidden absolute left-0 md:left-1/2 md:-translate-x-1/2 cursor-pointer select-none group-hover:scale-105 transition-transform"
                        onClick={() => toggleYear(year)}
                      >
                        <span className="text-[11px] font-black">{year}</span>
                      </div>

                      {/* Content Section - Alternating Left and Right for Desktop */}
                      <div className={`w-[calc(100%-3.5rem)] ml-14 md:ml-0 md:w-[calc(50%-2rem)] text-left ${
                        yearIndex % 2 === 0 ? "md:mr-auto md:pr-4" : "md:ml-auto md:pl-4"
                      }`}>
                        
                        {/* Box layout */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
                          {/* Card Year Title and Expand Toggle */}
                          <div className="flex items-center justify-between pb-3 border-b border-dashed border-slate-100 mb-3 cursor-pointer select-none"
                            onClick={() => toggleYear(year)}
                          >
                            <div className="flex items-center gap-1.5">
                              <Calendar size={14} className="text-adasa-mid" />
                              <span className="font-extrabold text-slate-800 text-sm tracking-tight">Atos de {year}</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                              {yearResolutions.length} {yearResolutions.length === 1 ? 'ato' : 'atos'} {isCollapsed ? '[Mostrar]' : '[Ocultar]'}
                            </span>
                          </div>

                          {/* List of resolutions under this year */}
                          {!isCollapsed && (
                            <div className="flex flex-col gap-4">
                              {yearResolutions.map(res => {
                                // determine status classes
                                let statusBg = "bg-emerald-50 text-emerald-800 border-emerald-150";
                                if (res.situacao === "Revogada") {
                                  statusBg = "bg-rose-50 text-rose-800 border-rose-100";
                                }

                                return (
                                  <div key={res.id} className="bg-slate-50/60 hover:bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2 transition-colors relative overflow-hidden group/item">
                                    {/* Number / Species and Status Badge */}
                                    <div className="flex justify-between items-start gap-4 flex-wrap">
                                      <span className="font-extrabold text-slate-800 text-xs tracking-tight">
                                        {res.especie || "Resolução"} nº {res.numero}/{res.ano}
                                      </span>
                                      <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${statusBg}`}>
                                        {res.situacao}
                                      </span>
                                    </div>

                                    {/* Segment tag and Area */}
                                    <div className="flex gap-1.5 flex-wrap">
                                      {res.segmento && (
                                        <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-slate-200/60 text-slate-600">
                                          {res.segmento}
                                        </span>
                                      )}
                                      {res.area && (
                                        <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-slate-200/60 text-slate-600">
                                          {res.area}
                                        </span>
                                      )}
                                    </div>

                                    {/* Ementa text */}
                                    {res.ementa && (
                                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                                        {res.ementa}
                                      </p>
                                    )}

                                    {/* Link & Date footer */}
                                    <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-200/40">
                                      {res.data ? (
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                          Publicado em {res.data}
                                        </span>
                                      ) : (
                                        <span></span>
                                      )}

                                      {res.link && (
                                        <a 
                                          href={res.link} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="inline-flex items-center gap-1 text-[10px] font-bold text-adasa-mid hover:text-adasa-dark transition-colors"
         								>
                                          <ExternalLink size={10} />
                                          Acessar
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
