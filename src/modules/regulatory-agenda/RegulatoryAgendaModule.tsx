import React from "react";
import { RegulatoryAgendaProvider } from "./RegulatoryAgendaContext";
import { RegulatoryAgendaTab } from "../../components/RegulatoryAgendaTab";
import { RegulatoryAgendaDashboard } from "../../components/RegulatoryAgendaDashboard";

interface RegulatoryAgendaModuleProps {
  view: "agenda" | "painel";
  showToast: (title: string, message: string, type: "success" | "error" | "warning" | "info") => void;
  currentUser?: any;
}

export const RegulatoryAgendaModule: React.FC<RegulatoryAgendaModuleProps> = ({ view, showToast, currentUser }) => {
  return (
    <RegulatoryAgendaProvider>
      <div className="regulatory-agenda-module-root w-full h-full">
        {view === "agenda" ? (
          <RegulatoryAgendaTab showToast={showToast} currentUser={currentUser} />
        ) : (
          <RegulatoryAgendaDashboard showToast={showToast} />
        )}
      </div>
    </RegulatoryAgendaProvider>
  );
};
