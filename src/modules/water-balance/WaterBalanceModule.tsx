import React from "react";
import { WaterBalanceProvider } from "./WaterBalanceContext";

export const WaterBalanceModule: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <WaterBalanceProvider>
      <div className="water-balance-module-root w-full h-full">
        {/* Aqui ficariam a renderização de sub-componentes refatorados de App.tsx: 
            ManageTab, AnalyzeTab, CompareTab etc.
            Por enquanto, passa-se os "children" para compatibilizar o App refatorado 
        */}
        {children}
      </div>
    </WaterBalanceProvider>
  );
};
