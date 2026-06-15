const fs = require('fs');
let code = fs.readFileSync('src/components/PlanningTab.tsx', 'utf-8');

// 1. Add "calc" tab to `timelineModalTab` type
code = code.replace(
  /useState<"timeline" \| "gantt">/g,
  'useState<"timeline" | "gantt" | "calc">'
);

// 2. Add "Cálculo do Progresso" button in the Timeline Modals
// There are two Gantt buttons in the modals
code = code.replace(
  /(<button[^>]+onClick={\(\) => setTimelineModalTab\("gantt"\)}[^>]+>\s*Gráfico de Gantt\s*<\/button>)/g,
  `$1\n                      <button\n                        type="button"\n                        onClick={() => setTimelineModalTab("calc")}\n                        className={\`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer \${timelineModalTab === "calc" ? "bg-white text-slate-850 shadow-xs border border-slate-200/40" : "text-slate-500 hover:text-slate-800"}\`}\n                      >\n                        Cálculo do Progresso\n                      </button>`
);

// 3. Extract the `taskFormTab === "calc"` rendering block to a helper function.
// It starts at: {taskFormTab === "calc" && (
const calcBlockRegex = /{taskFormTab === "calc" && \([\s\S]*?(?={taskFormTab === "links"|{taskFormTab === "form"|<div className="flex gap-3 justify-end pt-4 border-t border-slate-100">)/;

// Wait, the calc block in the original file:
//               {taskFormTab === "calc" && (
//                 <div className="space-y-4">
// ...
//                   </div>
//                   <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
//                     <button ... Retroceder ...>

// Let's just find the Calculation logic using string split
const part1 = "Cálculo por Pesos Relativos Livres</h4>";
const index1 = code.indexOf(part1);
if (index1 !== -1) {
  // Find the start of `{taskFormTab === "calc" && (`
  const startTarget = '{taskFormTab === "calc" && (';
  const startIdx = code.lastIndexOf(startTarget, index1);
  
  // Find the end, which is right before the bottom container "<div className=\"flex gap-3 justify-end pt-4 border-t border-slate-100\">"
  const endTarget = '<div className="flex gap-3 justify-end pt-4 border-t border-slate-100">';
  const endIdx = code.indexOf(endTarget, index1);
  
  if (startIdx !== -1 && endIdx !== -1) {
    const calcContentOriginal = code.substring(startIdx + startTarget.length, endIdx).trim();
    // calcContentOriginal is:
    // <div className="space-y-4">
    //    ...
    // </div>
    // wait, it ends with `</div>`
    
    // We want to isolate just the content inside `space-y-4`, specifically the `.max-h-[50vh]` block
    // Let's just get the block starting with `<div className="space-y-5 max-h-[50vh]`
    const innerStart = calcContentOriginal.indexOf('<div className="space-y-5 max-h-[50vh]');
    const innerEnd = calcContentOriginal.lastIndexOf('</div>', calcContentOriginal.length - 8); // the end of space-y-4
    
    let innerContent = calcContentOriginal.substring(innerStart, innerEnd + 6);
    
    // Now we must replace `editingTask.id` with `targetTaskId`
    // and `editingTask.progress ?? 0` with `fallbackProgress`
    innerContent = innerContent.replace(/editingTask\.id/g, 'targetTaskId');
    innerContent = innerContent.replace(/editingTask\.progress \?\? 0/g, 'fallbackProgress');
    
    // Wrap it in a function
    const helperFunction = `
  const renderProgressCalc = (targetTaskId: number | null, fallbackProgress: number) => {
    if (!targetTaskId) return null;
    return (
      ${innerContent}
    );
  };
`;

    // Inject the helper before `function renderTaskNode`
    code = code.replace('function renderTaskNode', helperFunction + '\n  function renderTaskNode');
    
    // Replace the original editing form's long code with a call to the helper
    const originalBlock = code.substring(startIdx, endIdx);
    const replacementBlock = `{taskFormTab === "calc" && (
                <div className="space-y-4">
                  {renderProgressCalc(editingTask.id || 0, editingTask.progress ?? 0)}
                `;
    code = code.replace(originalBlock, replacementBlock);
    
    // Now add the call to the timeline modal tab
    // There are two "timelineModalTab === "timeline"" blocks
    // Wait, the easiest is to add right after the Gantt rendering or inside the timeline rendering?
    // The previous code ends with:
    // {timelineModalTab === "timeline" ? (
    //    <> ... </>
    // ) : (
    //    <GanttTimeline currentTaskId={timelineTaskId} tasks={filteredTasksOrAll} />
    // )}
    
    // We want to change to:
    // timelineModalTab === "calc" ? (
    //   renderProgressCalc(timelineTaskId, taskById[timelineTaskId]?.progress ?? 0)
    // ) :
    
    code = code.replace(
      /: \(\s*<GanttTimeline currentTaskId={timelineTaskId}/g,
      `: timelineModalTab === "calc" ? (\n                      <div className="mt-4">{renderProgressCalc(timelineTaskId, taskById[timelineTaskId || 0]?.progress ?? 0)}</div>\n                    ) : (\n                      <GanttTimeline currentTaskId={timelineTaskId}`
    );
  }
}

fs.writeFileSync('src/components/PlanningTab.tsx', code);
console.log("Edit complete");
