import fs from 'fs';

const filePath = './src/components/PlanningTab.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Normalize to LF
content = content.replace(/\r\n/g, '\n');

// 1. Locate and replace button header area
const targetButtons = `<div className="flex flex-wrap items-center justify-center gap-2 overflow-x-auto pb-1 xl:pb-0 w-full xl:w-auto">
              <button
                onClick={() => { setViewMode("category"); setTimelineTaskId(null); }}
                className={\`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm \${viewMode === "category" && timelineTaskId === null ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}\`}
              >
                <Tag size={16} /> Categorias
              </button>
              <button
                onClick={() => { setViewMode("board"); setTimelineTaskId(null); }}
                className={\`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm \${viewMode === "board" && timelineTaskId === null ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}\`}
              >
                <LayoutGrid size={16} /> Quadro
              </button>
              <button
                onClick={() => { setViewMode("status"); setTimelineTaskId(null); }}
                className={\`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm \${viewMode === "status" && timelineTaskId === null ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}\`}
              >
                <CheckCircle2 size={16} /> Status
              </button>
              <button
                onClick={() => { setViewMode("area"); setTimelineTaskId(null); }}
                className={\`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm \${viewMode === "area" && timelineTaskId === null ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}\`}
              >
                <Briefcase size={16} /> Áreas
              </button>
              <button
                onClick={() => { setViewMode("responsible"); setTimelineTaskId(null); }}
                className={\`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm \${viewMode === "responsible" && timelineTaskId === null ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}\`}
              >
                <Users size={16} /> Responsáveis
              </button>
              <button
                onClick={() => { setViewMode("tree"); setTimelineTaskId(null); }}
                className={\`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm \${viewMode === "tree" && timelineTaskId === null ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}\`}
              >
                <FolderKanban size={16} /> Lista
              </button>
              <button
                onClick={() => { setViewMode("table"); setTimelineTaskId(null); }}
                className={\`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm \${viewMode === "table" && timelineTaskId === null ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}\`}
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
            </div>`;

const replacementButtons = `<div className="flex flex-wrap items-center justify-center gap-2 overflow-x-auto pb-1 xl:pb-0 w-full xl:w-auto">
              <button
                onClick={() => setViewMode("category")}
                className={\`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm \${viewMode === "category" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}\`}
              >
                <Tag size={16} /> Categorias
              </button>
              <button
                onClick={() => setViewMode("board")}
                className={\`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm \${viewMode === "board" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}\`}
              >
                <LayoutGrid size={16} /> Quadro
              </button>
              <button
                onClick={() => setViewMode("status")}
                className={\`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm \${viewMode === "status" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}\`}
              >
                <CheckCircle2 size={16} /> Status
              </button>
              <button
                onClick={() => setViewMode("area")}
                className={\`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm \${viewMode === "area" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}\`}
              >
                <Briefcase size={16} /> Áreas
              </button>
              <button
                onClick={() => setViewMode("responsible")}
                className={\`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm \${viewMode === "responsible" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}\`}
              >
                <Users size={16} /> Responsáveis
              </button>
              <button
                onClick={() => setViewMode("tree")}
                className={\`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm \${viewMode === "tree" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}\`}
              >
                <FolderKanban size={16} /> Lista
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={\`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shadow-sm \${viewMode === "table" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}\`}
              >
                <Table size={16} /> Tabela
              </button>
            </div>`;

if (content.includes(targetButtons)) {
  content = content.replace(targetButtons, replacementButtons);
  console.log("SUCCESS: Replaced button headers area!");
} else {
  console.error("ERROR: Button headers area mismatch.");
}

// 2. Replace container ternary and trailing inline timeline block
const targetTernaryStart = `          {/* Main Container */}
          {timelineTaskId === null ? (
            <div className="space-y-4">`;

const replacementTernaryStart = `          {/* Main Container */}
          <div className="space-y-4">`;

if (content.includes(targetTernaryStart)) {
  content = content.replace(targetTernaryStart, replacementTernaryStart);
  console.log("SUCCESS: Replaced main container ternary start!");
} else {
  console.error("ERROR: Ternary start block not found.");
}

// Match the ending of container and start of inline timeline
// Let's print some lines to verify exactly what's there in the file.
fs.writeFileSync(filePath, content, 'utf-8');
