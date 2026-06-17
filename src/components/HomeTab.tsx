import React from "react";
import { 
  Droplets, 
  Activity, 
  GitCompare, 
  FolderKanban, 
  FileSpreadsheet, 
  ArrowRight, 
  ListTodo, 
  BookmarkCheck, 
  Users, 
  Tags, 
  ClipboardList,
  BarChart3,
  CalendarCheck,
  FileText,
  BarChart2,
  BookOpen
} from "lucide-react";
import { motion } from "motion/react";
import { Task, Area } from "../types";

interface HomeTabProps {
  setActiveTab: (tab: any) => void;
  setActivePlanningSubTab: (subTab: "tasks" | "dashboard" | "plans" | "areas" | "categories" | "responsibles") => void;
  tasks: Task[];
  areas: Area[];
  onMyTasksSelect?: () => void;
}

export function HomeTab({ setActiveTab, setActivePlanningSubTab, tasks, areas, onMyTasksSelect }: HomeTabProps) {
  
  // Quick navigation helper to switch tab + subtab
  const navigateToPlanning = (subTab: "tasks" | "dashboard" | "plans" | "areas" | "categories" | "responsibles") => {
    setActivePlanningSubTab(subTab);
    setActiveTab("planning");
  };

  return (
    <div className="space-y-10 w-full pb-16">
      {/* Dynamic Header Promo Banner */}
      <div className="bg-adasa-dark rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden border border-slate-700/30">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-adasa-light/10 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10 text-xs font-black uppercase tracking-widest text-adasa-light/80">
              <Droplets size={12} className="text-adasa-light animate-pulse" />
              Gerencial SAE
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none">
              Plataforma de Planejamento <br className="hidden sm:block" />
              e Gestão da SAE
            </h1>
          </div>
        </div>
      </div>

      {/* Module Group: Painéis Gerenciais */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-black uppercase tracking-wider">
              Painéis
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Painéis Gerenciais</h2>
          </div>
        </div>

        {/* Master Row with major cards */}
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Painel de Atividades Card */}
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => {
                setActivePlanningSubTab("dashboard");
                setActiveTab("planning");
              }}
              className="p-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group text-left h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <FolderKanban size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel de Atividades</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Acompanhe o andamento geral das tarefas e metas. Visualize status, progressos acumulados e índices gerenciais por área operacional em gráficos de tempo real.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-700">
                Abrir Painel de Atividades <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Painel de Resoluções Card */}
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => setActiveTab("reg_painel")}
              className="p-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group text-left h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <FileSpreadsheet size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel de Resoluções</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Acompanhe as resoluções vigentes, atas de audiência, estoque regulatório normas organizadas e monitoramentos das obrigações legais em formato agregador dinâmico.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-700">
                Abrir Painel de Resoluções <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Painel da Agenda Regulatória Card */}
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => setActiveTab("reg_agenda_painel")}
              className="p-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group text-left h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel da Agenda Regulatória</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Acompanhamento estratégico, metas, indicadores gráficos e percentual de entregas dos itens da Agenda Regulatória de forma integrada e visual.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-700">
                Abrir Painel da Agenda <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Painel do Balanço Hídrico Card */}
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => setActiveTab("analyze")}
              className="p-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group text-left h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <Droplets size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel do Balanço Hídrico</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Explore mapas interativos de balanço e visualize gráficos de projeções isoladas de oferta versus demandas projetadas de recursos para saneamento básico.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-700">
                Abrir Painel do Balanço Hídrico <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Painel de Publicações Card */}
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => setActiveTab("pub_painel")}
              className="p-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-white to-indigo-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group text-left h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-indigo-50 text-indigo-600 w-max border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                  <BookOpen size={24} className="text-indigo-600" />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel de Publicações</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Visualize estatísticas gerais de publicações da agência. Explore a ementa de relatórios técnicos, artigos científicos e boletins informativos.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-indigo-700">
                Abrir Painel de Publicações <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Module Group 1: Planejamento e Plano de Trabalho */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-black uppercase tracking-wider">
              Módulo 1
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Planejamento e Cronogramas</h2>
          </div>
        </div>

        {/* Master Row with two major cards: Minhas Tarefas on the left, Painel de Atividades on the right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Minhas Tarefas Card */}
          <motion.div 
            whileHover={{ y: -2 }}
            onClick={onMyTasksSelect}
            className="p-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
          >
            <div>
              <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                <CalendarCheck size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Minhas Tarefas</h3>
              <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                Veja as atividades atribuídas diretamente a você no plano ativo de tarefas. Monitore seus prazos, entregas pendentes e atualize seus progressos de forma simplificada.
              </p>
            </div>
            <div className="mt-auto flex items-center gap-2 text-xs font-bold text-blue-700">
              Ir para Minhas Tarefas <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Painel de Atividades Card */}
          <motion.div 
            whileHover={{ y: -2 }}
            onClick={() => navigateToPlanning("dashboard")}
            className="p-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
          >
            <div>
              <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                <FolderKanban size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel de Atividades</h3>
              <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                Acompanhe o andamento geral das tarefas e metas. Visualize status, progressos acumulados e índices gerenciais por área operacional em gráficos de tempo real.
              </p>
            </div>
            <div className="mt-auto flex items-center gap-2 text-xs font-bold text-blue-700">
              Abrir Painel de Atividades <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </div>

        {/* Shortcuts Sub-grid list: remaining 6 elements positioned in 2 columns of 3 items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Shortcut A: Painel de Atividades */}
          <div 
            onClick={() => navigateToPlanning("dashboard")}
            className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer group transition-all duration-200 flex items-start gap-3"
          >
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mt-0.5">
              <BarChart3 size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-800 transition-colors">Painel de Atividades</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Gráficos de progresso, relatórios sintéticos e métricas unificadas.</p>
            </div>
          </div>

          {/* Shortcut B: Atividades e Tarefas */}
          <div 
            onClick={() => navigateToPlanning("tasks")}
            className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer group transition-all duration-200 flex items-start gap-3"
          >
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mt-0.5">
              <ListTodo size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-800 transition-colors">Atividades & Tarefas</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Cadastrar, gerenciar e editar tarefas e cronogramas detalhados.</p>
            </div>
          </div>

          {/* Shortcut C: Planos de Trabalho */}
          <div 
            onClick={() => navigateToPlanning("plans")}
            className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer group transition-all duration-200 flex items-start gap-3"
          >
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mt-0.5">
              <ClipboardList size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-800 transition-colors">Planos de Trabalho</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Configurar macrometas e planos estratégicos estruturados.</p>
            </div>
          </div>

          {/* Shortcut D: Areas Tematicas */}
          <div 
            onClick={() => navigateToPlanning("areas")}
            className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer group transition-all duration-200 flex items-start gap-3"
          >
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mt-0.5">
              <BookmarkCheck size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-800 transition-colors">Áreas Temáticas</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Gerenciar áreas de atuação, siglas e descrições temáticas.</p>
            </div>
          </div>

          {/* Shortcut E: Categorias */}
          <div 
            onClick={() => navigateToPlanning("categories")}
            className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer group transition-all duration-200 flex items-start gap-3"
          >
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mt-0.5">
              <Tags size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-800 transition-colors">Categorias de Tarefas</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Categorizar as atividades para rotular e analisar relatórios.</p>
            </div>
          </div>

          {/* Shortcut F: Responsáveis */}
          <div 
            onClick={() => navigateToPlanning("responsibles")}
            className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer group transition-all duration-200 flex items-start gap-3"
          >
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mt-0.5">
              <Users size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-800 transition-colors">Atribuição de Responsáveis</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Cadastrar membros da equipe, cargos e e-mails de acompanhamento.</p>
            </div>
          </div>

        </div>
      </section>

      {/* Module Group 2: Regulação */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase tracking-wider">
              Módulo 2
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Regulação</h2>
          </div>
        </div>
        
        <div className="pt-2 space-y-8">
          {/* Sub-Módulo 2.1: Resoluções */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1 px-2.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                Sub-Módulo 2.1
              </div>
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Resoluções</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Item 2.1.1: Cadastrar Resoluções */}
              <motion.div 
                whileHover={{ y: -3 }}
                onClick={() => setActiveTab("reg_cadastro")}
                className="p-6 rounded-2xl border border-slate-200 hover:border-blue-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-500 w-max border border-blue-100 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <FileText size={24} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">Cadastrar Resoluções</h3>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                    Cadastre e gerencie o estoque regulatório, resoluções vigentes, atos normativos e atas de audiência da superintendência.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-blue-600 mt-2">
                  Acessar cadastro <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>

              {/* Item 2.1.2: Painel de Resoluções */}
              <motion.div 
                whileHover={{ y: -3 }}
                onClick={() => setActiveTab("reg_painel")}
                className="p-6 rounded-2xl border border-indigo-200 hover:border-indigo-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-4 p-3 rounded-xl bg-indigo-50 text-indigo-500 w-max border border-indigo-100 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                    <BarChart2 size={24} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">Painel de Resoluções</h3>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                    Visualize estatísticas gerenciais do estoque regulatório, painel de monitoramento de obrigações e relatórios analíticos de resoluções.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 mt-2">
                  Visualizar painel <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Sub-Módulo 2.2: Agenda Regulatória */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1 px-2.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                Sub-Módulo 2.2
              </div>
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Agenda Regulatória</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Item 2.2.1: Cadastrar Agenda Regulatória */}
              <motion.div 
                whileHover={{ y: -3 }}
                onClick={() => setActiveTab("reg_agenda")}
                className="p-6 rounded-2xl border border-slate-200 hover:border-blue-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-500 w-max border border-blue-100 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <BookOpen size={24} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">Cadastrar Agenda Regulatória</h3>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                    Cadastre e gerencie a agenda regulatória, metas, temas e ações da agência reguladora e monitore seu progresso.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-blue-600 mt-2">
                  Acessar cadastro <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>

              {/* Item 2.2.2: Painel da Agenda Regulatória */}
              <motion.div 
                whileHover={{ y: -3 }}
                onClick={() => setActiveTab("reg_agenda_painel")}
                className="p-6 rounded-2xl border border-indigo-200 hover:border-indigo-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-4 p-3 rounded-xl bg-indigo-50 text-indigo-500 w-max border border-indigo-100 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                    <BarChart2 size={24} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">Painel da Agenda Regulatória</h3>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                    Acompanhamento estratégico, metas, indicadores gráficos e percentual de entregas dos itens da Agenda Regulatória.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 mt-2">
                  Visualizar painel <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Module Group 3: Fiscalização */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase tracking-wider">
              Módulo 3
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Fiscalização</h2>
          </div>
        </div>
        
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1 px-2.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
              Sub-Módulo 3.1
            </div>
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Balanço Hídrico dos Sistemas de Abastecimento de Água</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Item 3.1: Gerenciar Balancos */}
          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => setActiveTab("manage")}
            className="p-6 rounded-2xl border border-slate-200 hover:border-blue-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-500 w-max border border-blue-100 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                <Droplets size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">1. Gerenciar Balanços</h3>
              <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                Cadastro centralizado, duplicação rápida e controle histórico de todas as séries de balanço hídrico cadastradas.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-blue-600 mt-2">
              Acessar registros <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Item 3.2: Análie Individual */}
          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => setActiveTab("analyze")}
            className="p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-500 w-max border border-emerald-100 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                <Activity size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">2. Análise Individual</h3>
              <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                Explore mapas interativos de balanço e visualize gráficos de projeções isoladas de oferta versus demandas projetadas de recursos.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 mt-2">
              Visualizar gráficos <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Item 3.3: Comparar Balanços */}
          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => setActiveTab("compare")}
            className="p-6 rounded-2xl border border-slate-200 hover:border-purple-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="mb-4 p-3 rounded-xl bg-purple-50 text-purple-500 w-max border border-purple-100 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                <GitCompare size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">3. Comparação de Cenários</h3>
              <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                Comparações agregadas de múltiplos balanços hídricos selecionados simultaneamente em formato de curvas comparativas consolidadas.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-purple-600 mt-2">
              Ver comparação <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </div>
        </div>
      </section>

      {/* Module Group 4: Publicações */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase tracking-wider">
              Módulo 4
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Publicações</h2>
          </div>
        </div>

        <div className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sub-Módulo 4.1: Cadastrar Publicações */}
            <motion.div 
              whileHover={{ y: -3 }}
              onClick={() => setActiveTab("pub_cadastro")}
              className="p-6 rounded-2xl border border-slate-200 hover:border-blue-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-500 w-max border border-blue-100 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">Cadastrar Publicações</h3>
                <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                  Cadastre e gerencie o acervo bibliográfico da agência, relatórios anuais de atividades, boletins informativos e artigos de pesquisa científica. Siga o mesmo layout da página de Resoluções.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-blue-600 mt-2">
                Acessar cadastro <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Sub-Módulo 4.2: Painel de Publicações */}
            <motion.div 
              whileHover={{ y: -3 }}
              onClick={() => setActiveTab("pub_painel")}
              className="p-6 rounded-2xl border border-indigo-200 hover:border-indigo-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-indigo-50 text-indigo-500 w-max border border-indigo-100 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                  <BarChart2 size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">Painel de Publicações</h3>
                <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                  Visualize os painéis gerenciais gráficos de publicações, filtre seu acervo histórico e pesquise relatórios e artigos por autor, tipo de arquivo ou ementa explicativa de forma dinâmica.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 mt-2">
                Visualizar painel gráfico <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Module Group 3: Outros Recursos */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="p-1 px-2.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-black uppercase tracking-wider">
            Suporte
          </div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Arquivos de Apoio e Templates</h2>
        </div>

        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => setActiveTab("templates")}
          className="p-5 rounded-2xl border border-slate-200 hover:border-rose-300 bg-white cursor-pointer group shadow-sm transition-all duration-200 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-50 text-rose-500 group-hover:bg-rose-100 transition-colors">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 leading-tight">Baixar Arquivos Modelo para Carga de Dados</h3>
              <p className="text-slate-500 text-[11px] font-medium mt-0.5">Baixe formatos estruturados em Excel/CSV para preencher demandas com facilidade.</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform mr-2" />
        </motion.div>
      </section>
    </div>
  );
}
