import React from "react";
import { PlanningProvider } from "./PlanningContext";
import { PlanningTab } from "../../components/PlanningTab";
import { Task } from "../../types";

interface PlanningModuleProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  showToast: (title: string, message: string, type: "success" | "error" | "warning" | "info") => void;
  activeSubTab?: "tasks" | "dashboard" | "plans" | "areas" | "categories" | "responsibles";
  setConfirmState: React.Dispatch<React.SetStateAction<any>>;
  myTasksFilterTrigger: number;
  isMyTasksSelected: boolean;
  plansProp: any[];
  areasProp: any[];
  categoriesProp: any[];
  responsiblesProp: any[];
  setPlansProp: React.Dispatch<React.SetStateAction<any[]>>;
  setAreasProp: React.Dispatch<React.SetStateAction<any[]>>;
  setCategoriesProp: React.Dispatch<React.SetStateAction<any[]>>;
  setResponsiblesProp: React.Dispatch<React.SetStateAction<any[]>>;
}

export const PlanningModule: React.FC<PlanningModuleProps> = (props) => {
  return (
    <PlanningProvider>
      <div className="planning-module-root w-full h-full">
        <PlanningTab {...props} />
      </div>
    </PlanningProvider>
  );
};

