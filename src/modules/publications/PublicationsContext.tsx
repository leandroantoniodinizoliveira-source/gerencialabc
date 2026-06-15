import React, { createContext, useContext, useState, ReactNode } from "react";

interface PublicationsState {
  publicationsCount: number;
  setPublicationsCount: React.Dispatch<React.SetStateAction<number>>;
  selectedCategory: string | null;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string | null>>;
}

const PublicationsContext = createContext<PublicationsState | undefined>(undefined);

export const usePublications = () => {
  const context = useContext(PublicationsContext);
  if (!context) throw new Error("usePublications must be used within PublicationsProvider");
  return context;
};

export const PublicationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [publicationsCount, setPublicationsCount] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <PublicationsContext.Provider
      value={{
        publicationsCount,
        setPublicationsCount,
        selectedCategory,
        setSelectedCategory,
      }}
    >
      {children}
    </PublicationsContext.Provider>
  );
};
