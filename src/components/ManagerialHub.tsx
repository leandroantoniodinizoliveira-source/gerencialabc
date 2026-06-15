import React from "react";
import { 
  ArrowRight, 
  FolderKanban, 
  TrendingUp,
  FileText,
  Droplets,
  BookOpen,
  Copy,
  Check,
  Globe
} from "lucide-react";
import { motion } from "motion/react";

interface ManagerialHubProps {
  onOpenPlanning: () => void;
  onOpenResolutions: () => void;
  onOpenWaterBalance: () => void;
  onOpenPublications: () => void;
  onOpenRegulatoryAgenda: () => void;
  isPublic?: boolean;
  showOnlyPublic?: boolean;
}

export function ManagerialHub({ 
  onOpenPlanning, 
  onOpenResolutions, 
  onOpenWaterBalance, 
  onOpenPublications,
  onOpenRegulatoryAgenda,
  isPublic = false,
  showOnlyPublic = false
}: ManagerialHubProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?public=publico_hub`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-16">
      {/* Dynamic Header Promo Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden border border-slate-700/30">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className={`inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10 text-xs font-bold uppercase tracking-widest ${showOnlyPublic ? "text-emerald-300" : "text-blue-300"}`}>
              {showOnlyPublic ? (
                <>
                  <Globe size={12} className="text-emerald-300 animate-pulse" />
                  ACESSO EXTERNO • PAINÉIS PÚBLICOS
                </>
              ) : (
                <>
                  <TrendingUp size={12} className="text-blue-300 animate-pulse" />
                  GERENCIAL SAE
                </>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-white">
              {showOnlyPublic ? (
                <>
                  Plataforma Pública <br className="hidden sm:block" />
                  de Transparência SAE
                </>
              ) : (
                <>
                  Plataforma de Planejamento <br className="hidden sm:block" />
                  e Gestão da SAE
                </>
              )}
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm font-medium max-w-lg leading-relaxed">
              {showOnlyPublic 
                ? "Portal aberto de transparência para consulta ao estoque regulatório e acervo de publicações técnicas da Superintendência de Abastecimento de Água e Esgoto."
                : "Central de monitoramento e coordenação das atividades finalísticas e regulatórias da ADASA para superintendentes e técnicos."}
            </p>
          </div>

          {/* Action button to share the public link */}
          <div className="flex-shrink-0">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl px-5 py-3 text-xs font-bold transition-all shadow-md active:scale-95"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span>Link Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copiar Link Público</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Module Group */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 px-4 rounded-xl text-sm sm:text-lg font-black uppercase tracking-wider border ${showOnlyPublic ? "bg-emerald-50 text-emerald-800 border-emerald-150" : "bg-blue-50 text-blue-700 border-blue-150"}`}>
              {showOnlyPublic ? "Painéis Externos (Públicos)" : "Painéis Gerenciais Compartilhados"}
            </div>
          </div>
        </div>

        {/* Master Row with relevant cards depending on public mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Painel de Atividades Card - PRIVATE */}
          {!showOnlyPublic && (
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={onOpenPlanning}
              className="p-8 rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <FolderKanban size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel de Atividades</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Acompanhe o andamento geral das tarefas e metas. Visualize status, progressos acumulados e índices gerenciais por área operational em gráficos de tempo real.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-700">
                Abrir Painel de Atividades <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          )}

          {/* Painel de Resoluções Card - PUBLIC */}
          <motion.div 
            whileHover={{ y: -2 }}
            onClick={onOpenResolutions}
            className="p-8 rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full"
          >
            <div>
              <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                <FileText size={24} />
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

          {/* Painel da Agenda Regulatória Card - PUBLIC */}
          <motion.div 
            whileHover={{ y: -2 }}
            onClick={onOpenRegulatoryAgenda}
            className="p-8 rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full"
          >
            <div>
              <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                <BookOpen size={24} className="text-blue-600" />
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

          {/* Painel do Balanço Hídrico Card - PRIVATE */}
          {!showOnlyPublic && (
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={onOpenWaterBalance}
              className="p-8 rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <Droplets size={24} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel do Balanço Hídrico</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Visualize de forma isolada as projeções de oferta e demanda ao longo do tempo. Explore os subsistemas e mapas do Balanço Hídrico.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-700">
                Abrir Painel do Balanço Hídrico <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          )}

          {/* Painel de Publicações Card - PUBLIC */}
          <motion.div 
            whileHover={{ y: -2 }}
            onClick={onOpenPublications}
            className="p-8 rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full"
          >
            <div>
              <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                <BookOpen size={24} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel de Publicações</h3>
              <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                Monitore o acervo bibliográfico e estatísticas gerais de publicações. Pesquise relatórios anuais de atividades, boletins informativos e artigos científicos.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-700">
              Abrir Painel de Publicações <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
