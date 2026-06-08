import React, { createContext, useContext, useState, ReactNode } from "react";
import { Task, Plan, Area, Category, Responsible } from "../../types";

// 1. Definição do Estado do Módulo
interface PlanningState {
  tasks: Task[];
  plans: Plan[];
  areas: Area[];
  categories: Category[];
  responsibles: Responsible[];
  // Ações
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
}

// 2. Criação do Contexto (Injeção de Dependências local)
const PlanningContext = createContext<PlanningState | undefined>(undefined);

export const usePlanning = () => {
  const context = useContext(PlanningContext);
  if (!context) throw new Error("usePlanning must be used within PlanningProvider");
  return context;
};

// 3. Provider que gerencia a lógica de negócio do Planejamento isoladamente
export const PlanningProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);

  const addTask = (task: Task) => setTasks((prev) => [...prev, task]);
  const updateTask = (updated: Task) =>
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

  return (
    <PlanningContext.Provider
      value={{ tasks, plans, areas, categories, responsibles, addTask, updateTask }}
    >
      {children}
    </PlanningContext.Provider>
  );
};
