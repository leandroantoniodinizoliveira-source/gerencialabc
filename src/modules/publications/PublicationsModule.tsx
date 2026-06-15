import React from "react";
import { PublicationsProvider } from "./PublicationsContext";
import { PublicationsTab } from "../../components/PublicationsTab";
import { PublicationsDashboard } from "../../components/PublicationsDashboard";

interface PublicationsModuleProps {
  view: "cadastro" | "painel";
  showToast: (title: string, message: string, type: "success" | "error" | "warning" | "info") => void;
  currentUser?: any;
}

export const PublicationsModule: React.FC<PublicationsModuleProps> = ({ view, showToast, currentUser }) => {
  return (
    <PublicationsProvider>
      <div className="publications-module-root w-full h-full">
        {view === "cadastro" ? (
          <React.Suspense fallback={<div className="flex justify-center p-12 text-slate-400">Carregando...</div>}>
            <PublicationsTab showToast={showToast} currentUser={currentUser} />
          </React.Suspense>
        ) : (
          <PublicationsDashboard showToast={showToast} />
        )}
      </div>
    </PublicationsProvider>
  );
};
