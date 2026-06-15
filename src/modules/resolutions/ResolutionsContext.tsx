import React, { createContext, useContext, useState, ReactNode } from "react";

interface ResolutionsState {
  resolutionsCount: number;
  setResolutionsCount: React.Dispatch<React.SetStateAction<number>>;
  academicMode: boolean;
  setAcademicMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const ResolutionsContext = createContext<ResolutionsState | undefined>(undefined);

export const useResolutions = () => {
  const context = useContext(ResolutionsContext);
  if (!context) throw new Error("useResolutions must be used within ResolutionsProvider");
  return context;
};

export const ResolutionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [resolutionsCount, setResolutionsCount] = useState<number>(0);
  const [academicMode, setAcademicMode] = useState<boolean>(false);

  return (
    <ResolutionsContext.Provider
      value={{
        resolutionsCount,
        setResolutionsCount,
        academicMode,
        setAcademicMode,
      }}
    >
      {children}
    </ResolutionsContext.Provider>
  );
};
