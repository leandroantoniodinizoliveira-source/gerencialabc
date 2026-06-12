import { useState, useEffect } from "react";
import { ResponsiveContainer, ComposedChart, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Line, LabelList } from "recharts";
import { BookOpen, FileText, Calendar, History, Search, ArrowUpDown, Filter, ExternalLink, Share2, ClipboardList, TrendingUp, Inbox } from "lucide-react";

interface Publication {
  id: number;
  titulo_assunto: string;
  descricao: string;
  tipo_documento: string;
  responsavel_autor: string;
  data_publicacao: string;
  link_acesso: string;
  observacoes: string;
}

interface PublicationsDashboardProps {
  showToast: (title: string, message: string, type: "success" | "error" | "info" | "warning") => void;
}

export function PublicationsDashboard({ showToast }: PublicationsDashboardProps) {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state
  const [searchText, setSearchText] = useState("");
  const [selectedTipoDoc, setSelectedTipoDoc] = useState("TODOS");
  const [selectedAutor, setSelectedAutor] = useState("TODOS");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Expand states for publications timeline
  const [expandedItems, setExpandedItems] = useState<{ [id: number]: boolean }>({});

  useEffect(() => {
    const fetchPublications = async () => {
      setIsLoading(false);
      try {
        const res = await fetch("/api/publications");
        const json = await res.json();
        if (json.success) {
          setPublications(json.data);
        } else {
          showToast("Erro", "Falha ao carregar publicações no painel.", "error");
        }
      } catch {
        showToast("Erro", "Falha ao se conectar com o servidor.", "error");
      } finally {
        setIsLoading(true);
      }
    };
    fetchPublications();
  }, [showToast]);

  // Actual loading flag is set correctly based on fetch state
  const actualIsLoading = !isLoading;

  // Calculos e Métricas
  const totalCount = publications.length;

  const relatoriosCount = publications.filter(p => p.tipo_documento === "Relatório de Atividades").length;
  const boletinsCount = publications.filter(p => p.tipo_documento === "Boletim").length;
  const outrosCount = totalCount - (relatoriosCount + boletinsCount);

  // Extract years to calculate Average per year
  const extractYear = (dateStr: string): number | null => {
    if (!dateStr) return null;
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const yr = parseInt(parts[2]);
      if (!isNaN(yr)) return yr;
    }
    const match = dateStr.match(/\b(20\d{2})\b/);
    if (match) return parseInt(match[1]);
    return null;
  };

  const yearsList: number[] = publications.map(p => extractYear(p.data_publicacao)).filter((y): y is number => y !== null);
  const uniqueYears: number[] = Array.from(new Set(yearsList)).sort((a: number, b: number) => a - b);
  const yearSpan = uniqueYears.length > 0 ? (Number(uniqueYears[uniqueYears.length - 1]) - Number(uniqueYears[0]) + 1) : 1;
  const averagePerYear = totalCount > 0 ? (totalCount / yearSpan) : 0;

  // 1. Group publications by year for chart
  const yearMap: { [key: number]: number } = {};
  publications.forEach(p => {
    const yr = extractYear(p.data_publicacao);
    if (yr) {
      yearMap[yr] = (yearMap[yr] || 0) + 1;
    }
  });

  const sortedYearsForChart = Object.keys(yearMap).map(Number).sort((a, b) => a - b);
  let accumulatedSum = 0;
  const yearAccumulatedData = sortedYearsForChart.map(yr => {
    accumulatedSum += yearMap[yr];
    return {
      year: String(yr),
      count: yearMap[yr],
      accumulated: accumulatedSum
    };
  });

  // 2. Group publications by type for document type chart
  const typeMap: { [key: string]: number } = {};
  publications.forEach(p => {
    const tp = p.tipo_documento || "Outros";
    typeMap[tp] = (typeMap[tp] || 0) + 1;
  });

  const typeChartData = Object.keys(typeMap).map(tp => ({
    name: tp,
    count: typeMap[tp]
  })).sort((a, b) => b.count - a.count);

  // Filter list for the list component
  const filteredPublications = publications.filter(pub => {
    const matchesSearch = 
      (pub.titulo_assunto || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (pub.descricao || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (pub.responsavel_autor || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (pub.observacoes || "").toLowerCase().includes(searchText.toLowerCase());

    const matchesTipoDoc = selectedTipoDoc === "TODOS" || pub.tipo_documento === selectedTipoDoc;
    const matchesAutor = selectedAutor === "TODOS" || pub.responsavel_autor === selectedAutor;

    return matchesSearch && matchesTipoDoc && matchesAutor;
  });

  // Unique types and authors for filters
  const tiposDocumento = ["TODOS", ...Array.from(new Set(publications.map(p => p.tipo_documento).filter(Boolean)))];
  const autores = ["TODOS", ...Array.from(new Set(publications.map(p => p.responsavel_autor).filter(Boolean)))];

  // Sort filtered publications
  const sortedPublications = [...filteredPublications].sort((a, b) => {
    const yearA = extractYear(a.data_publicacao) || 1900;
    const yearB = extractYear(b.data_publicacao) || 1900;

    if (yearA !== yearB) {
      return sortOrder === "desc" ? yearB - yearA : yearA - yearB;
    }
    return sortOrder === "desc" 
      ? (b.titulo_assunto || "").localeCompare(a.titulo_assunto || "")
      : (a.titulo_assunto || "").localeCompare(b.titulo_assunto || "");
  });

  const toggleExpand = (id: number) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === 0) return null;
    return (
      <text x={x + width / 2} y={y - 6} fill="#334155" fontSize={10} fontWeight="bold" textAnchor="middle">
        {value}
      </text>
    );
  };

  if (actualIsLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white border border-slate-200/80 rounded-[2rem] shadow-sm mt-8 max-w-7xl mx-auto min-h-[500px]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Estruturando Métricas...</h4>
        <p className="text-xs text-slate-400 mt-1">Carregando painel de publicações e relatórios ADASA.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200 text-left flex flex-col gap-6" id="publications-dashboard-root">
      {/* Header Element */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-indigo-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 font-bold">
          <span className="text-[10px] bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full font-black uppercase tracking-widest leading-none mb-4 inline-block">
            Histórico & Acervo Técnico-Científico
          </span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-none">
            Painel Estratégico de Publicações
          </h2>
          <p className="text-xs text-indigo-150 font-medium mt-1.5">
            Estatísticas gerenciais, boletins informativos, cartilhas técnicas e artigos publicados • ADASA-DF
          </p>
        </div>
        <div className="relative z-10 shrink-0 self-start md:self-center">
          <button
            onClick={() => {
              const shareUrl = `${window.location.origin}${window.location.pathname}?public=publications_dashboard`;
              navigator.clipboard.writeText(shareUrl)
                .then(() => {
                  showToast(
                    "Link Copiado!",
                    "O link de acesso público foi copiado para a área de transferência.",
                    "success"
                  );
                })
                .catch(() => {
                  alert(`Link público: ${shareUrl}`);
                });
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all text-white border border-white/25 rounded-2xl text-xs font-bold shadow-sm cursor-pointer select-none"
          >
            <Share2 size={14} className="text-indigo-300 animate-pulse" />
            <span>Compartilhar Painel</span>
          </button>
        </div>
      </div>

      {/* Main KPI Card Row */}
      <div className="bg-gradient-to-r from-indigo-950 to-indigo-850 p-6 md:p-8 rounded-2xl border border-indigo-800/30 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:translate-y-[-2px] transition-all text-white">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/10 rounded-2xl text-white backdrop-blur-md border border-white/25 shadow-inner">
            <BookOpen size={32} />
          </div>
          <div>
            <span className="block text-xs font-black uppercase tracking-widest text-[#0091DA]">Acervo de Publicações Total</span>
            <span className="text-4xl md:text-5xl font-black leading-none mt-1">{totalCount}</span>
            <span className="block text-xs text-indigo-100 font-bold mt-1.5">Relatórios institucionais, guias e boletins publicados</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/15 rounded-xl border border-white/20 text-xs font-semibold tracking-wide shadow-inner text-indigo-100">
          <History size={14} className="text-indigo-300" />
          <span>Série Histórica: {uniqueYears[0] || 2019} - {uniqueYears[uniqueYears.length-1] || 2026}</span>
        </div>
      </div>

      {/* Grid of sub KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
            <ClipboardList size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Relatórios Atividades</span>
            <span className="text-2xl font-black text-slate-800 leading-tight">{relatoriosCount}</span>
            <span className="block text-[10px] text-blue-600 font-bold mt-0.5">
              {totalCount > 0 ? `${((relatoriosCount / totalCount) * 100).toFixed(0)}%` : "0%"} do acervo total
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl text-violet-600">
            <BookOpen size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Boletins Informativos</span>
            <span className="text-2xl font-black text-slate-800 leading-tight">{boletinsCount}</span>
            <span className="block text-[10px] text-violet-600 font-bold mt-0.5">
              {totalCount > 0 ? `${((boletinsCount / totalCount) * 100).toFixed(0)}%` : "0%"} do acervo total
            </span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="p-3 bg-indigo-50 border border-indigo-100/60 rounded-xl text-indigo-600">
            <FileText size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Guias, Manuais e Artigos</span>
            <span className="text-2xl font-black text-slate-800 leading-tight">{outrosCount}</span>
            <span className="block text-[10px] text-indigo-600 font-bold mt-0.5">
              {totalCount > 0 ? `${((outrosCount / totalCount) * 100).toFixed(0)}%` : "0%"} artigos e cartilhas
            </span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-black">Produção Média</span>
            <span className="text-2xl font-black text-slate-800 leading-tight">{averagePerYear.toFixed(1)}</span>
            <span className="block text-[10px] text-emerald-600 font-bold mt-0.5">Publicações anuais editadas</span>
          </div>
        </div>
      </div>

      {/* Visual Chart Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Publicações ao Longo dos Anos */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Publicações por Ano e Evolução Acumulada</h4>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Evolução do volume anual e total acumulado das publicações da superintendência.</p>
          </div>
          
          <div className="flex justify-center items-center gap-6 mb-4 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#0091DA]"></span>
              <span>Anual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#4f46e5]"></span>
              <span>Acumulado</span>
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
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#94a3b8"
                  fontSize={11}
                  fontWeight={600}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} 
                  itemStyle={{ fontSize: "11px", fontWeight: "bold" }}
                  labelStyle={{ fontSize: "11px", fontWeight: "bold", color: "#fff" }}
                />
                <Bar yAxisId="left" dataKey="count" fill="#0091DA" radius={[4, 4, 0, 0]} name="Qtde Anual" barSize={24}>
                  <LabelList dataKey="count" content={renderCustomBarLabel} />
                </Bar>
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="accumulated" 
                  stroke="#4f46e5" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2, stroke: "#4f46e5", fill: "#fff" }} 
                  activeDot={{ r: 6 }} 
                  name="Qtde Acumulada" 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Distribuição por Tipo de Publicação */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Distribuição por Categoria/Tipo de Documento</h4>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Contagem absoluta de cada espécie ou natureza das publicações técnicas.</p>
          </div>

          <div className="h-72 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeChartData} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} fontWeight={600} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#475569" fontSize={11} fontWeight={700} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", color: "#fff" }}
                  itemStyle={{ fontSize: "11px", fontWeight: "bold" }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[0, 6, 6, 0]} barSize={16}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: "11px", fill: "#334155", fontWeight: "bold" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Interactive Listing and Creative Timeline Filters */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-black text-slate-800">Acervo Bibliográfico Interativo</h3>
          <p className="text-xs text-slate-400 mt-1">Busque publicações e relatórios técnicos por palavra-chave ou filtre categorias de interesse.</p>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
          {/* Keyword search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Pesquisar por título, resumo, assunto..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white text-slate-700 font-medium"
            />
          </div>

          {/* Type dropdown */}
          <div className="flex items-center gap-2 px-3 bg-slate-50 border border-slate-200 rounded-xl">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <select
              value={selectedTipoDoc}
              onChange={(e) => setSelectedTipoDoc(e.target.value)}
              className="w-full bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer py-3"
            >
              <option value="TODOS">Todos os Documentos</option>
              {tiposDocumento.filter(t => t !== "TODOS").map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Author/Organizer dropdown */}
          <div className="flex items-center gap-2 px-3 bg-slate-50 border border-slate-200 rounded-xl">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <select
              value={selectedAutor}
              onChange={(e) => setSelectedAutor(e.target.value)}
              className="w-full bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer py-3"
            >
              <option value="TODOS">Todos os Autores</option>
              {autores.filter(a => a !== "TODOS").map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle List Sort Bar */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 pb-2">
          <div>
            Encontradas: <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">{sortedPublications.length}</span> publicações.
          </div>
          <button
            onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
            className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
          >
            <ArrowUpDown size={13} />
            <span>Ano: {sortOrder === "desc" ? "Mais Recentes" : "Mais Antigas"}</span>
          </button>
        </div>

        {/* Visual Timeline / Bento List */}
        {sortedPublications.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Inbox size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-bold">Nenhum resultado corresponde aos filtros selecionados.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPublications.map(pub => {
              const isOpen = !!expandedItems[pub.id];
              return (
                <div
                  key={pub.id}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all hover:bg-indigo-50/20"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl shrink-0 mt-0.5">
                        <FileText size={16} />
                      </div>
                      <div>
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-[9px] font-black uppercase">
                            {pub.tipo_documento}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                            {pub.data_publicacao}
                          </span>
                          <span className="text-[10px] text-slate-400 italic">
                            Por: {pub.responsavel_autor}
                          </span>
                        </div>
                        {/* Title */}
                        <h4 className="text-sm font-black text-slate-800 leading-tight">
                          {pub.titulo_assunto}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {pub.link_acesso && (
                        <a
                          href={pub.link_acesso}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 rounded-xl transition-all shadow-xs flex items-center justify-center cursor-pointer"
                          title="Acessar Relatório"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => toggleExpand(pub.id)}
                        className="p-1 px-2.5 text-xs font-black text-slate-600 hover:text-indigo-600 hover:bg-white rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                      >
                        {isOpen ? "Recolher" : "Mostrar Resumo"}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible description box */}
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-slate-200/70 text-xs text-slate-600 leading-relaxed font-medium pl-1 mr-4 animate-in fade-in duration-200">
                      <p className="mb-2"><strong>Resumo Executivo:</strong> {pub.descricao}</p>
                      {pub.observacoes && (
                        <div className="bg-white/85 p-2.5 border border-slate-150 rounded-lg text-[11px] text-slate-500 italic mt-3">
                          <strong>Observações:</strong> {pub.observacoes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
