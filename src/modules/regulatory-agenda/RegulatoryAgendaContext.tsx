import React, { createContext, useContext, useState, ReactNode } from "react";

interface RegulatoryAgendaState {
  agendaItemsCount: number;
  setAgendaItemsCount: React.Dispatch<React.SetStateAction<number>>;
  selectedThemeId: string | null;
  setSelectedThemeId: React.Dispatch<React.SetStateAction<string | null>>;
}

const RegulatoryAgendaContext = createContext<RegulatoryAgendaState | undefined>(undefined);

export const useRegulatoryAgenda = () => {
  const context = useContext(RegulatoryAgendaContext);
  if (!context) throw new Error("useRegulatoryAgenda must be used within RegulatoryAgendaProvider");
  return context;
};

export const RegulatoryAgendaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [agendaItemsCount, setAgendaItemsCount] = useState<number>(0);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);

  return (
    <RegulatoryAgendaContext.Provider
      value={{
        agendaItemsCount,
        setAgendaItemsCount,
        selectedThemeId,
        setSelectedThemeId,
      }}
    >
      {children}
    </RegulatoryAgendaContext.Provider>
  );
};
