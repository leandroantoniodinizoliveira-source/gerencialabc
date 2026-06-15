import React from "react";
import { ResolutionsProvider } from "./ResolutionsContext";
import { ResolutionsTab } from "../../components/ResolutionsTab";
import { ResolutionsDashboard } from "../../components/ResolutionsDashboard";

interface ResolutionsModuleProps {
  view: "cadastro" | "painel";
  showToast: (title: string, message: string, type: "success" | "error" | "warning" | "info") => void;
  currentUser?: any;
}

export const ResolutionsModule: React.FC<ResolutionsModuleProps> = ({ view, showToast, currentUser }) => {
  return (
    <ResolutionsProvider>
      <div className="resolutions-module-root w-full h-full">
        {view === "cadastro" ? (
          <React.Suspense fallback={<div className="flex justify-center p-12 text-slate-400">Carregando...</div>}>
            <ResolutionsTab showToast={showToast} currentUser={currentUser} />
          </React.Suspense>
        ) : (
          <ResolutionsDashboard showToast={showToast} />
        )}
      </div>
    </ResolutionsProvider>
  );
};
