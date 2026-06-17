import * as React from "react";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ArrowUpRight, Search, X, Upload, ChevronDown, ChevronUp, FileSpreadsheet, BookOpen, Filter, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";

interface Publication {
  id: number;
  titulo_assunto: string;
  descricao: string;
  tipo_documento: string;
  responsavel_autor: string;
  data_publicacao: string;
  link_acesso: string;
  observacoes: string;
  imagem_capa?: string;
}

interface PublicationsTabProps {
  showToast: (title: string, message: string, type: "success" | "error" | "info" | "warning") => void;
  currentUser?: { name?: string; email?: string } | null;
}

export function PublicationsTab({ showToast, currentUser }: PublicationsTabProps) {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTipoDoc, setFilterTipoDoc] = useState("TODOS");
  const [filterAutor, setFilterAutor] = useState("TODOS");

  // Expanded description IDs
  const [expandedDescs, setExpandedDescs] = useState<number[]>([]);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formTitulo, setFormTitulo] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formTipoDoc, setFormTipoDoc] = useState("Relatório de Atividades");
  const [formAutor, setFormAutor] = useState("");
  const [formDataPub, setFormDataPub] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formImagemCapa, setFormImagemCapa] = useState("");
  const [formObservacoes, setFormObservacoes] = useState("");

  const [csvText, setCsvText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Publication;
    direction: "asc" | "desc";
  }>({ key: "data_publicacao", direction: "desc" });

  // Load data
  const fetchPublications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/publications");
      const json = await response.json();
      if (json.success) {
        setPublications(json.data);
      } else {
        showToast("Erro", json.error || "Erro ao carregar publicações.", "error");
      }
    } catch {
      showToast("Erro", "Não foi possível estabelecer contato com o servidor.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPublications();
  }, []);

  // Unique lists for filters
  const tiposDocumento = ["TODOS", ...Array.from(new Set(publications.map(p => p.tipo_documento).filter(Boolean)))];
  const autores = ["TODOS", ...Array.from(new Set(publications.map(p => p.responsavel_autor).filter(Boolean)))];

  const toggleDesc = (id: number) => {
    if (expandedDescs.includes(id)) {
      setExpandedDescs(expandedDescs.filter(x => x !== id));
    } else {
      setExpandedDescs([...expandedDescs, id]);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormTitulo("");
    setFormDescricao("");
    setFormTipoDoc("Relatório de Atividades");
    setFormAutor("Superintendência");
    setFormDataPub("");
    setFormLink("");
    setFormImagemCapa("");
    setFormObservacoes("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pub: Publication) => {
    setEditingId(pub.id);
    setFormTitulo(pub.titulo_assunto);
    setFormDescricao(pub.descricao);
    setFormTipoDoc(pub.tipo_documento);
    setFormAutor(pub.responsavel_autor);
    setFormDataPub(pub.data_publicacao);
    setFormLink(pub.link_acesso);
    setFormImagemCapa(pub.imagem_capa || "");
    setFormObservacoes(pub.observacoes);
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limite
      showToast("Arquivo muito grande", "A imagem deve ter no máximo 2MB.", "error");
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
    if (!formTitulo || !formDescricao) {
      showToast("Campo Obrigatório", "Por favor preencha os campos obrigatórios.", "error");
      return;
    }

    const payload = {
      titulo_assunto: formTitulo,
      descricao: formDescricao,
      tipo_documento: formTipoDoc,
      responsavel_autor: formAutor,
      data_publicacao: formDataPub,
      link_acesso: formLink,
      observacoes: formObservacoes,
      imagem_capa: formImagemCapa
    };

    try {
      const url = editingId ? `/api/publications/${editingId}` : "/api/publications";
      const method = editingId ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      
      if (json.success) {
        showToast("Sucesso", editingId ? "Publicação atualizada com sucesso!" : "Publicação cadastrada com sucesso!", "success");
        setIsModalOpen(false);
        fetchPublications();
      } else {
        showToast("Erro", json.error || "Ocorreu um erro ao salvar.", "error");
      }
    } catch {
      showToast("Erro", "Não foi possível salvar o registro.", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza de que deseja excluir esta publicação?")) return;

    try {
      const response = await fetch(`/api/publications/${id}`, {
        method: "DELETE"
      });
      const json = await response.json();

      if (json.success) {
        showToast("Sucesso", "Publicação excluída com sucesso.", "success");
        fetchPublications();
      } else {
        showToast("Erro", json.error || "Erro ao excluir publicação.", "error");
      }
    } catch {
      showToast("Erro", "Não foi possível excluir a publicação.", "error");
    }
  };

  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) {
      showToast("Erro", "Forneça o conteúdo do arquivo CSV.", "error");
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch("/api/publications/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvData: csvText })
      });
      const json = await response.json();

      if (json.success) {
        showToast("Sucesso", `${json.count} registros importados com sucesso!`, "success");
        setIsImportModalOpen(false);
        setCsvText("");
        fetchPublications();
      } else {
        showToast("Erro", json.error || "Erro ao importar registros.", "error");
      }
    } catch {
      showToast("Erro", "Falha na importação dos dados.", "error");
    } finally {
      setIsImporting(false);
    }
  };

  // Filtered list
  const filtered = publications.filter(pub => {
    const matchesSearch = 
      (pub.titulo_assunto || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pub.descricao || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pub.responsavel_autor || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pub.observacoes || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTipoDoc = filterTipoDoc === "TODOS" || pub.tipo_documento === filterTipoDoc;
    const matchesAutor = filterAutor === "TODOS" || pub.responsavel_autor === filterAutor;

    return matchesSearch && matchesTipoDoc && matchesAutor;
  });

  const handleSort = (key: keyof Publication) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" }; // Default to desc for new columns
    });
  };

  const getSortIcon = (key: keyof Publication) => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={12} className="text-slate-300 ml-1" />;
    return sortConfig.direction === "asc" ? <ArrowUp size={12} className="text-indigo-600 ml-1" /> : <ArrowDown size={12} className="text-indigo-600 ml-1" />;
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return 0;
    // Assuming DD/MM/YYYY
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).valueOf();
    }
    // If it's just year YYYY
    if (parts.length === 1 && dateStr.length === 4) {
      return new Date(parseInt(dateStr), 0, 1).valueOf();
    }
    return 0; // Fallback
  };

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const { key, direction } = sortConfig;
    const dirMultipler = direction === "asc" ? 1 : -1;

    if (key === "data_publicacao") {
      const dateA = parseDate(a.data_publicacao);
      const dateB = parseDate(b.data_publicacao);
      return (dateA - dateB) * dirMultipler;
    }

    const valA = (a[key] || "").toString().toLowerCase();
    const valB = (b[key] || "").toString().toLowerCase();
    
    if (valA < valB) return -1 * dirMultipler;
    if (valA > valB) return 1 * dirMultipler;
    return 0;
  });

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 py-6" id="publications-tab-root">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider text-blue-200">
            <BookOpen size={12} />
            Publicações ADASA
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-none">
            Gestão de Publicações
          </h1>
          <p className="text-white/80 text-sm font-medium max-w-xl leading-relaxed">
            Consolide e gerencie relatórios de atividades, boletins informativos, cartilhas educativas, guias e artigos técnicos.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/20 transition-all flex items-center gap-2 hover:shadow-lg"
          >
            <Upload size={16} />
            Importar CSV
          </button>
          <button
            onClick={handleOpenNew}
            className="px-4 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            Nova Publicação
          </button>
        </div>
      </div>

      {/* Control Panel: Search & Filters */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar por título, descrição, autor, observações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all text-slate-700"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:w-max">
            {/* Filter Tipo Documento */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1.5 px-3">
              <Filter size={14} className="text-slate-400" />
              <span className="text-slate-500 text-[10px] font-black uppercase">Tipo:</span>
              <select
                value={filterTipoDoc}
                onChange={(e) => setFilterTipoDoc(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                {tiposDocumento.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Filter Autor */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1.5 px-3">
              <Filter size={14} className="text-slate-400" />
              <span className="text-slate-500 text-[10px] font-black uppercase">Autor/Resp:</span>
              <select
                value={filterAutor}
                onChange={(e) => setFilterAutor(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                {autores.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            
            {(searchQuery || filterTipoDoc !== "TODOS" || filterAutor !== "TODOS") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterTipoDoc("TODOS");
                  setFilterAutor("TODOS");
                }}
                className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title="Limpar Filtros"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        
        {/* Results Info Bar */}
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 pt-2 border-t border-slate-50">
          <div>
            Mostrando <span className="font-bold text-slate-700">{filtered.length}</span> de <span className="font-bold text-slate-700">{publications.length}</span> publicações cadastradas.
          </div>
        </div>
      </div>

      {/* Main Grid / List of Publications */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-slate-500 text-xs font-bold tracking-wider uppercase">Carregando acervo de publicações...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl py-16 px-4 text-center max-w-xl mx-auto shadow-sm">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-full w-max mx-auto mb-4">
            <BookOpen size={36} />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1.5">Nenhuma publicação encontrada</h3>
          <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">
            Ajuste os filtros de busca ou clique no botão acima para adicionar uma nova publicação ao acervo do saneamento.
          </p>
          <button
            onClick={handleOpenNew}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all"
          >
            Cadastrar Primeira Publicação
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-widest font-black">
                  <th className="px-5 py-4 w-[416px] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("titulo_assunto")}>
                    <div className="flex items-center">Documento / Tipo {getSortIcon("titulo_assunto")}</div>
                  </th>
                  <th className="px-5 py-4 w-28 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("data_publicacao")}>
                    <div className="flex items-center">Data {getSortIcon("data_publicacao")}</div>
                  </th>
                  <th className="px-5 py-4 w-[300px] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("descricao")}>
                    <div className="flex items-center">Descrição / Resumo {getSortIcon("descricao")}</div>
                  </th>
                  <th className="px-5 py-4 w-40 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("responsavel_autor")}>
                    <div className="flex items-center justify-center">Autor / Resp. {getSortIcon("responsavel_autor")}</div>
                  </th>
                  <th className="px-5 py-4 w-28 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sortedFiltered.map(pub => {
                  const isExpanded = expandedDescs.includes(pub.id);
                  return (
                    <tr key={pub.id} className="hover:bg-slate-50/40 transition-colors group align-top">
                      <td className="px-5 py-4 font-semibold text-slate-700 max-w-[416px]">
                        <div className="flex flex-col">
                          <span className="text-xs text-indigo-600 font-bold uppercase tracking-widest">{pub.tipo_documento || "Documento"}</span>
                          <span className="text-sm font-bold text-slate-800 line-clamp-2 md:line-clamp-none">{pub.titulo_assunto}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                        {pub.data_publicacao || "--"}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600 leading-relaxed font-normal max-w-[300px]">
                        <div className="relative">
                          <p className={isExpanded ? "" : "line-clamp-3"}>
                            {pub.descricao}
                          </p>
                          {pub.descricao?.length > 150 && (
                            <button
                              onClick={() => toggleDesc(pub.id)}
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
                        <span className="inline-flex px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {pub.responsavel_autor || "Não informado"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right align-middle">
                        <div className="flex gap-1 justify-end">
                          {pub.link_acesso && (
                            <a
                              href={pub.link_acesso}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Visualizar Documento"
                            >
                              <ArrowUpRight size={15} />
                            </a>
                          )}
                          <button
                            onClick={() => handleOpenEdit(pub)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Editar"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(pub.id)}
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Edit MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-250 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-150 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">
                    {editingId ? "Editar Publicação" : "Nova Publicação"}
                  </h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    {editingId ? `ID: #${editingId}` : "Formulário de Cadastro"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-150 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Título de Assunto (Obrigatório) */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Título / Assunto *</label>
                  <input
                    type="text"
                    required
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    placeholder="Ex: Relatório de Atividades da Superintendência de 2025"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-slate-700"
                  />
                </div>

                {/* Descrição / Resumo (Obrigatório) */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Descrição / Resumo Técnico *</label>
                  <textarea
                    required
                    value={formDescricao}
                    onChange={(e) => setFormDescricao(e.target.value)}
                    rows={4}
                    placeholder="Descrição institucional detalhada ou resumo executivo contendo as principais ações..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-slate-700 leading-relaxed"
                  />
                </div>

                {/* Tipo de Documento */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Tipo de Documento</label>
                  <select
                    value={formTipoDoc}
                    onChange={(e) => setFormTipoDoc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold text-slate-700"
                  >
                    <option value="Relatório de Atividades">Relatório de Atividades</option>
                    <option value="Boletim">Boletim Informativo</option>
                    <option value="Informativo">Informativo</option>
                    <option value="Guia">Guia / Manual técnico</option>
                    <option value="Artigo">Artigo técnico / Científico</option>
                    <option value="Resolução">Resolução</option>
                  </select>
                </div>

                {/* Autor / Responsável */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Responsável / Autor</label>
                  <input
                    type="text"
                    value={formAutor}
                    onChange={(e) => setFormAutor(e.target.value)}
                    placeholder="Ex: Superintendência, Regulação, Leandro Oliveira..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-slate-700"
                  />
                </div>

                {/* Data de Publicação */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Data de Publicação</label>
                  <input
                    type="text"
                    value={formDataPub}
                    onChange={(e) => setFormDataPub(e.target.value)}
                    placeholder="Ex: 31/12/2025"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-slate-700"
                  />
                </div>

                {/* Link de Acesso PDF/Externa */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Link de Acesso (URL)</label>
                  <input
                    type="url"
                    value={formLink}
                    onChange={(e) => setFormLink(e.target.value)}
                    placeholder="Ex: https://www.adasa.df.gov.br/pdf..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-slate-700"
                  />
                </div>

                {/* Imagem de Capa (Upload / URL) */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Imagem de Capa (Upload ou URL)</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <input
                        type="url"
                        value={formImagemCapa}
                        onChange={(e) => setFormImagemCapa(e.target.value)}
                        placeholder="Opcional. Ex: https://exemplo.com/capa.jpg"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-slate-700 pr-10"
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
                      <div className="px-4 py-2.5 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors max-h-[42px]">
                        <Upload size={16} />
                        <span className="text-xs font-bold">Fazer Upload</span>
                      </div>
                    </div>
                  </div>
                  {formImagemCapa && (
                    <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 inline-block">
                      <img src={formImagemCapa} alt="Preview da Capa" className="h-32 object-contain" />
                    </div>
                  )}
                </div>

                {/* Observações */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Observações de Registro</label>
                  <input
                    type="text"
                    value={formObservacoes}
                    onChange={(e) => setFormObservacoes(e.target.value)}
                    placeholder="Ex: Reunião do Sindicato, Hospedado em Canva, Foco em Gestão, etc."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-slate-700"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
                >
                  {editingId ? "Salvar Alterações" : "Salvar Publicação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-150 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-indigo-600" size={18} />
                <div>
                  <h3 className="font-black text-slate-800 text-sm">Importar Publicações via CSV</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Lote ou Arquivo</p>
                </div>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 hover:bg-slate-150 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleImportCSV} className="p-6 space-y-4">
              <p className="text-xs font-semibold text-slate-500 leading-relaxed mb-1">
                Cole abaixo o conteúdo CSV separado por ponto e vírgula (<code className="font-mono font-bold bg-slate-100 p-0.5 px-1 text-slate-700 rounded select-all">;</code>) respeitando os campos do cabeçalho abaixo:
              </p>
              
              <div className="p-2 bg-slate-50 border border-slate-200 font-mono text-[9px] text-slate-700 rounded-lg select-all mb-3 text-center font-bold">
                id;titulo_assunto;descricao;tipo_documento;responsavel_autor;data_publicacao;link_acesso;observacoes
              </div>

              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder=";Relatório de Atividades...;Documento institucional...;Relatório...;Superintendência;31/12/2019;http..."
                rows={10}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[11px] font-mono leading-normal text-slate-700"
              />

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1"
                >
                  {isImporting ? "Importando..." : "Enviar Registros"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
