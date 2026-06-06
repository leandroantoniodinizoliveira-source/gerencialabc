import React from "react";
import { PlanningProvider } from "./PlanningContext";
// Futuramente importar componentes menores, por exemplo:
// import { TaskList } from "./components/TaskList";
// import { PlanningDashboard } from "./components/PlanningDashboard";
import { PlanningTab } from "../../components/PlanningTab"; // Usando o componente legado/existente como casca inicial
import { Task } from "../../types";

interface PlanningModuleProps {
  // Passamos as deps que ainda estão no App enquanto a migração não finaliza 100%
  // O ideal é que estas props sumam e usemos chamadas à API via context/store!
  activeSubTab?: "tasks" | "dashboard" | "plans" | "areas" | "categories" | "responsibles";
  legacyTasks?: Task[];
  legacySetTasks?: any;
  showToast: (title: string, message: string, type: "success" | "error" | "info") => void;
}

export const PlanningModule: React.FC<PlanningModuleProps> = ({ 
  activeSubTab, 
  legacyTasks, 
  legacySetTasks, 
  showToast 
}) => {
  return (
    <PlanningProvider>
      <div className="planning-module-root w-full h-full">
        {/* Usando o componente refatorável. Idealmente, ele próprio consumirá o contexto */}
        <PlanningTab 
          tasks={legacyTasks || []} 
          setTasks={legacySetTasks}
          showToast={showToast}
          activeSubTab={activeSubTab}
        />
      </div>
    </PlanningProvider>
  );
};
