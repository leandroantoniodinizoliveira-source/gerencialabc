import React, { createContext, useContext, useState, ReactNode } from "react";
import { WaterBalance, System, Region, Demand, SupplySource, OperationalAdjustment } from "../../../types";

interface WaterBalanceState {
  waterBalances: WaterBalance[];
  systems: System[];
  regions: Region[];
  demands: Demand[];
  supplySources: SupplySource[];
  operationalAdjustments: OperationalAdjustment[];
  // Ações de gerenciamento de balanço hídrico
  // ...
}

const WaterBalanceContext = createContext<WaterBalanceState | undefined>(undefined);

export const useWaterBalance = () => {
  const context = useContext(WaterBalanceContext);
  if (!context) throw new Error("useWaterBalance must be used within WaterBalanceProvider");
  return context;
};

export const WaterBalanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [waterBalances, setWaterBalances] = useState<WaterBalance[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [supplySources, setSupplySources] = useState<SupplySource[]>([]);
  const [operationalAdjustments, setOperationalAdjustments] = useState<OperationalAdjustment[]>([]);

  return (
    <WaterBalanceContext.Provider
      value={{
        waterBalances,
        systems,
        regions,
        demands,
        supplySources,
        operationalAdjustments,
      }}
    >
      {children}
    </WaterBalanceContext.Provider>
  );
};
