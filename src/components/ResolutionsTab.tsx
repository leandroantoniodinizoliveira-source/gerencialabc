import * as React from "react";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ArrowUpRight, Search, X, Upload, CheckCircle2, ChevronDown, ChevronUp, FileSpreadsheet, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";

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
  imagem_capa?: string;
}

interface ResolutionsTabProps {
  showToast: any;
  currentUser?: { name?: string; email?: string } | null;
}

export function ResolutionsTab({ showToast, currentUser }: ResolutionsTabProps) {
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSituacao, setFilterSituacao] = useState("TODOS");
  const [filterSegmento, setFilterSegmento] = useState("TODOS");
  const [filterTipo, setFilterTipo] = useState("TODOS");

  // Expanded ementa IDs
  const [expandedEmentas, setExpandedEmentas] = useState<number[]>([]);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formEspecie, setFormEspecie] = useState("Resolução");
  const [formNumero, setFormNumero] = useState("");
  const [formAno, setFormAno] = useState("");
  const [formData, setFormData] = useState("");
  const [formEmenta, setFormEmenta] = useState("");
  const [formSituacao, setFormSituacao] = useState("Vigente");
  const [formArea, setFormArea] = useState("Saneamento Básico");
  const [formSegmento, setFormSegmento] = useState("");
  const [formTipo, setFormTipo] = useState("Principal");
  const [formLink, setFormLink] = useState("");
  const [formImagemCapa, setFormImagemCapa] = useState("");

  const [csvText, setCsvText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Resolution;
    direction: "asc" | "desc";
  }>({ key: "data", direction: "desc" });

  // Load data
  const fetchResolutions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/resolutions");
      const json = await response.json();
      if (json.success) {
        setResolutions(json.data);
      } else {
        showToast(json.error || "Erro ao carregar resoluções.", "error");
      }
    } catch (error: any) {
      console.error(error);
      showToast("Não foi possível estabelecer contato com o servidor.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResolutions();
  }, []);

  // Unique lists for filters
  const segmentos = ["TODOS", ...Array.from(new Set(resolutions.map(r => r.segmento).filter(Boolean)))];
  const situacoes = ["TODOS", "Vigente", "Revogada", "Vigente com alterações"];
  const tipos = ["TODOS", "Principal", "Acessória"];

  const toggleEmenta = (id: number) => {
    if (expandedEmentas.includes(id)) {
      setExpandedEmentas(expandedEmentas.filter(x => x !== id));
    } else {
      setExpandedEmentas([...expandedEmentas, id]);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormEspecie("Resolução");
    setFormNumero("");
    setFormAno(new Date().getFullYear().toString());
    setFormData("");
    setFormEmenta("");
    setFormSituacao("Vigente");
    setFormArea("Saneamento Básico");
    setFormSegmento("");
    setFormTipo("Principal");
    setFormLink("");
    setFormImagemCapa("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (res: Resolution) => {
    setEditingId(res.id);
    setFormEspecie(res.especie);
    setFormNumero(res.numero.toString());
    setFormAno(res.ano.toString());
    setFormData(res.data);
    setFormEmenta(res.ementa);
    setFormSituacao(res.situacao);
    setFormArea(res.area);
    setFormSegmento(res.segmento);
    setFormTipo(res.tipo);
    setFormLink(res.link);
    setFormImagemCapa(res.imagem_capa || "");
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limite
      showToast("Arquivo muito grande, a imagem deve ter no máximo 2MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormImagemCapa(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNumero || !formAno || !formEmenta) {
      showToast("Por favor preencha os campos obrigatórios.", "error");
      return;
    }

    const payload = {
      especie: formEspecie,
      numero: parseInt(formNumero),
      ano: parseInt(formAno),
      data: formData,
      ementa: formEmenta,
      situacao: formSituacao,
      area: formArea,
      segmento: formSegmento,
      tipo: formTipo,
      link: formLink,
      imagem_capa: formImagemCapa
    };

    try {
      const url = editingId ? `/api/resolutions/${editingId}` : "/api/resolutions";
      const method = editingId ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      
      if (json.success) {
        showToast(editingId ? "Resolução atualizada com sucesso!" : "Resolução cadastrada com sucesso!", "success");
        setIsModalOpen(false);
        fetchResolutions();
      } else {
        showToast(json.error || "Ocorreu um erro ao salvar.", "error");
      }
    } catch {
      showToast("Não foi possível salvar o registro.", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Deseja realmente excluir esta resolução?")) return;
    try {
      const response = await fetch(`/api/resolutions/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (json.success) {
        showToast("Resolução excluída com sucesso!", "success");
        fetchResolutions();
      } else {
        showToast(json.error || "Erro ao excluir resolução.", "error");
      }
    } catch {
      showToast("Não foi possível excluir a resolução.", "error");
    }
  };

  // CSV Import parser from pasted text or loaded file
  const handleCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) {
      showToast("Cole o conteúdo CSV para importar.", "error");
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch("/api/resolutions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvData: csvText })
      });
      const json = await response.json();
      if (json.success) {
        showToast(`Importação concluída! ${json.count} resoluções importadas com sucesso.`, "success");
        setIsImportModalOpen(false);
        setCsvText("");
        fetchResolutions();
      } else {
        showToast(json.error || "Erro ao importar registros.", "error");
      }
    } catch {
      showToast("Falha na importação dos dados.", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      showToast("Arquivo carregado com sucesso! Clique em Importar.", "info");
    };
    reader.readAsText(file, "UTF-8");
  };

  // Filter logic
  const filteredResolutions = resolutions.filter(res => {
    const term = searchQuery.toLowerCase();
    const matchSearch =
      res.numero.toString().includes(term) ||
      res.ano.toString().includes(term) ||
      (res.especie || "").toLowerCase().includes(term) ||
      (res.ementa || "").toLowerCase().includes(term) ||
      (res.segmento || "").toLowerCase().includes(term);

    const matchSituacao = filterSituacao === "TODOS" || res.situacao === filterSituacao;
    const matchSegmento = filterSegmento === "TODOS" || res.segmento === filterSegmento;
    const matchTipo = filterTipo === "TODOS" || res.tipo === filterTipo;

    return matchSearch && matchSituacao && matchSegmento && matchTipo;
  });

  const handleSort = (key: keyof Resolution) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  };

  const getSortIcon = (key: keyof Resolution) => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={12} className="text-slate-300 ml-1" />;
    return sortConfig.direction === "asc" ? <ArrowUp size={12} className="text-indigo-600 ml-1" /> : <ArrowDown size={12} className="text-indigo-600 ml-1" />;
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).valueOf();
    }
    if (parts.length === 1 && dateStr.length === 4) {
      return new Date(parseInt(dateStr), 0, 1).valueOf();
    }
    return 0;
  };

  const sortedFilteredResolutions = [...filteredResolutions].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const { key, direction } = sortConfig;
    const dirMultipler = direction === "asc" ? 1 : -1;

    if (key === "data") {
      const dateA = parseDate(a.data);
      const dateB = parseDate(b.data);
      return (dateA - dateB) * dirMultipler;
    }

    if (key === "numero" || key === "ano") {
      return ((a[key] as number) - (b[key] as number)) * dirMultipler;
    }

    const valA = (a[key] || "").toString().toLowerCase();
    const valB = (b[key] || "").toString().toLowerCase();
    
    if (valA < valB) return -1 * dirMultipler;
    if (valA > valB) return 1 * dirMultipler;
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto w-full bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-left flex flex-col relative min-h-[80vh]">
      {/* Header section similar to Cadastro de Categorias */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-indigo-600" size={28} />
            Cadastro de Resoluções Regulatórias
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gestão do acervo de normas, atos legais e resoluções aplicados à regulação do saneamento básico e recursos hídricos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
          >
            <Upload size={16} /> Importar CSV
          </button>
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20"
          >
            <Plus size={16} /> Nova Resolução
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
        {/* Search */}
        <div className="relative">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Pesquisar</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nº, Ano, Ementa ou termo..."
              className="w-full bg-white border border-slate-200 text-slate-700 placeholder:text-slate-400 text-xs font-semibold rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-indigo-500 transition-all"
            />
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          </div>
        </div>

        {/* Situacao */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Situação</label>
          <select
            value={filterSituacao}
            onChange={(e) => setFilterSituacao(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            {situacoes.map(sit => (
              <option key={sit} value={sit}>{sit === "TODOS" ? "Tudo (Situações)" : sit}</option>
            ))}
          </select>
        </div>

        {/* Segmento */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Segmento / Assunto</label>
          <select
            value={filterSegmento}
            onChange={(e) => setFilterSegmento(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            {segmentos.map(seg => (
              <option key={seg} value={seg}>{seg === "TODOS" ? "Tudo (Segmentos)" : seg}</option>
            ))}
          </select>
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo Regulatório</label>
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            {tipos.map(t => (
              <option key={t} value={t}>{t === "TODOS" ? "Tudo (Tipos)" : t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main content area */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 bg-slate-50/50 border border-slate-200/60 rounded-3xl">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Carregando Acervo...</h4>
          <p className="text-xs text-slate-400 mt-1">Conectando ao banco de dados securitário.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-widest font-black">
                  <th className="px-5 py-4 w-44 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("numero")}>
                    <div className="flex items-center">Resolução / Ato {getSortIcon("numero")}</div>
                  </th>
                  <th className="px-5 py-4 w-28 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("data")}>
                    <div className="flex items-center">Data {getSortIcon("data")}</div>
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("ementa")}>
                    <div className="flex items-center">Ementa Reguladora {getSortIcon("ementa")}</div>
                  </th>
                  <th className="px-5 py-4 w-36 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("situacao")}>
                    <div className="flex items-center justify-center">Situação {getSortIcon("situacao")}</div>
                  </th>
                  <th className="px-5 py-4 w-48 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("segmento")}>
                    <div className="flex items-center">Segmentação {getSortIcon("segmento")}</div>
                  </th>
                  <th className="px-5 py-4 w-28 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sortedFilteredResolutions.map(res => {
                  const isExpanded = expandedEmentas.includes(res.id);
                  return (
                    <tr key={res.id} className="hover:bg-slate-50/40 transition-colors group align-top">
                      <td className="px-5 py-4 font-semibold text-slate-700">
                        <div className="flex flex-col">
                          <span className="text-xs text-indigo-600 font-bold uppercase tracking-widest">{res.especie}</span>
                          <span className="text-sm font-bold text-slate-800">Nº {res.numero} / {res.ano}</span>
                          <span className="text-[10px] text-slate-400 font-semibold mt-1 bg-slate-100 px-1.5 py-0.5 rounded w-fit uppercase">{res.tipo}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                        {res.data || "--"}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600 leading-relaxed font-normal">
                        <div className="relative">
                          <p className={isExpanded ? "" : "line-clamp-3"}>
                            {res.ementa}
                          </p>
                          {res.ementa?.length > 150 && (
                            <button
                              onClick={() => toggleEmenta(res.id)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold mt-1 flex items-center gap-0.5 transition-colors focus:outline-none"
                            >
                              {isExpanded ? (
                                <>Recolher <ChevronUp size={12} /></>
                              ) : (
                                <>Mostrar mais <ChevronDown size={12} /></>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center align-middle">
                        <span className={`inline-flex px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${
                          res.situacao === "Vigente" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" 
                            : res.situacao === "Revogada" 
                            ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                            : "bg-amber-50 text-amber-700 border border-amber-200/60"
                        }`}>
                          {res.situacao}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5 max-w-[170px]">
                          <span className="text-[11px] font-semibold text-slate-700 truncate" title={res.area}>{res.area}</span>
                          <span className="text-[10px] text-slate-400 font-medium truncate" title={res.segmento}>{res.segmento || "--"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right align-middle">
                        <div className="flex gap-1 justify-end">
                          {res.link && (
                            <a
                              href={res.link}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Visualizar no Diário Oficial"
                            >
                              <ArrowUpRight size={15} />
                            </a>
                          )}
                          <button
                            onClick={() => handleOpenEdit(res)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Editar"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(res.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Excluir"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredResolutions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm font-semibold">
                      Nenhuma regulamentação encontrada com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT REGULATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1.5 transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight flex items-center gap-2">
              {editingId !== null ? <Edit2 size={20} className="text-indigo-600" /> : <Plus size={20} className="text-indigo-600" />}
              {editingId !== null ? "Editar Resolução" : "Cadastrar Nova Resolução"}
            </h3>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Espécie */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Espécie Legislativa *</label>
                <input
                  type="text"
                  required
                  value={formEspecie}
                  onChange={(e) => setFormEspecie(e.target.value)}
                  placeholder="Ex: Resolução"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Numero */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Número do Ato *</label>
                <input
                  type="number"
                  required
                  value={formNumero}
                  onChange={(e) => setFormNumero(e.target.value)}
                  placeholder="Ex: 59"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Ano */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ano *</label>
                <input
                  type="number"
                  required
                  value={formAno}
                  onChange={(e) => setFormAno(e.target.value)}
                  placeholder="Ex: 2025"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Data assinatura */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Publicação</label>
                <input
                  type="text"
                  value={formData}
                  onChange={(e) => setFormData(e.target.value)}
                  placeholder="Ex: 12/11/2025"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Situação */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Situação de Vigência</label>
                <select
                  value={formSituacao}
                  onChange={(e) => setFormSituacao(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none bg-white transition-all cursor-pointer"
                >
                  <option value="Vigente">Vigente</option>
                  <option value="Vigente com alterações">Vigente com alterações</option>
                  <option value="Revogada">Revogada</option>
                </select>
              </div>

              {/* Tipo */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo da Norma</label>
                <select
                  value={formTipo}
                  onChange={(e) => setFormTipo(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none bg-white transition-all cursor-pointer"
                >
                  <option value="Principal">Principal</option>
                  <option value="Acessória">Acessória</option>
                </select>
              </div>

              {/* Área tematica */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Área Temática</label>
                <input
                  type="text"
                  value={formArea}
                  onChange={(e) => setFormArea(e.target.value)}
                  placeholder="Ex: Saneamento Básico"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Segmento */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Segmento / Assunto</label>
                <input
                  type="text"
                  value={formSegmento}
                  onChange={(e) => setFormSegmento(e.target.value)}
                  placeholder="Ex: Indicadores"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Link norma */}
              <div className="space-y-1 md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Link de Acesso Integrado</label>
                <input
                  type="url"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  placeholder="https://www.adasa.df.gov.br/..."
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Imagem de Capa (Upload / URL) */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Imagem de Capa (Upload ou URL)</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={formImagemCapa}
                      onChange={(e) => setFormImagemCapa(e.target.value)}
                      placeholder="Opcional. Ex: https://exemplo.com/capa.jpg"
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 pr-10 text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                    />
                    {formImagemCapa && (
                      <button
                        type="button"
                        onClick={() => setFormImagemCapa("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  
                  <div className="sm:w-auto relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="px-4 py-3 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors h-full">
                      <Upload size={16} />
                      <span className="text-xs font-bold whitespace-nowrap">Fazer Upload</span>
                    </div>
                  </div>
                </div>
                {formImagemCapa && (
                  <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 inline-block p-1">
                    <img src={formImagemCapa} alt="Preview da Capa" className="h-32 object-contain rounded-lg" />
                  </div>
                )}
              </div>

              {/* Ementa */}
              <div className="space-y-1 md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ementa Reguladora (Descrição Principal) *</label>
                <textarea
                  required
                  rows={4}
                  value={formEmenta}
                  onChange={(e) => setFormEmenta(e.target.value)}
                  placeholder="Insira as diretrizes, atos e detalhes descritivos da resolução legislativa..."
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-700 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="md:col-span-2 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-xs font-black text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl uppercase tracking-wider transition shadow-md shadow-indigo-600/10"
                >
                  {editingId !== null ? "Salvar Alterações" : "Cadastrar Ator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl p-8 shadow-2xl relative">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1.5 transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight flex items-center gap-2">
              <Upload className="text-indigo-600" size={22} />
              Importar Carga de Resoluções CSV
            </h3>
            <p className="text-xs text-slate-400 font-medium mb-6">
              Faça upload de arquivos ou cole os dados brutos com delimitador ponto e vírgula (;). Estrutura esperada:
              <code className="block bg-slate-50 border border-slate-200 rounded p-1.5 text-[9px] font-mono mt-1 text-slate-600">
                especie;Numero;ano;data;ementa;situacao;area;segmento;tipo;link
              </code>
            </p>

            <form onSubmit={handleCSVImport} className="space-y-4">
              {/* File upload option */}
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/30 transition-all group">
                <input
                  type="file"
                  id="csv-file-input"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="csv-file-input"
                  className="cursor-pointer flex flex-col items-center text-center"
                >
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 group-hover:scale-105 transition-transform mb-3">
                    <Upload className="text-indigo-600" size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Escolha o arquivo .csv ou arraste aqui</span>
                  <span className="text-[10px] text-slate-400 mt-1">Modulação text/plain com delimitador ponto e vírgula</span>
                </label>
              </div>

              {/* Raw CSV Text box */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest block font-medium">Ou cole os dados CSV brutos abaixo:</label>
                <textarea
                  rows={8}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="especie;Numero;ano;data;ementa;situacao;area;segmento;tipo;link&#10;Resolução;14;2011;27/10/2011;Estabelece as condições da prestação...;Vigente;Saneamento Básico;Condições Gerais;Principal;http://..."
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-mono text-slate-700 focus:border-indigo-500 outline-none transition-all bg-slate-50 placeholder:text-slate-400"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="flex-1 py-3 text-xs font-black text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="flex-1 py-3 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Fazer Importação
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
