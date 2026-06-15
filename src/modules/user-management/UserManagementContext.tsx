import React, { createContext, useContext, useState, ReactNode } from "react";

interface UserManagementState {
  usersCount: number;
  setUsersCount: React.Dispatch<React.SetStateAction<number>>;
  selectedRoleFilter: string | null;
  setSelectedRoleFilter: React.Dispatch<React.SetStateAction<string | null>>;
}

const UserManagementContext = createContext<UserManagementState | undefined>(undefined);

export const useUserManagement = () => {
  const context = useContext(UserManagementContext);
  if (!context) throw new Error("useUserManagement must be used within UserManagementProvider");
  return context;
};

export const UserManagementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [usersCount, setUsersCount] = useState<number>(0);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | null>(null);

  return (
    <UserManagementContext.Provider
      value={{
        usersCount,
        setUsersCount,
        selectedRoleFilter,
        setSelectedRoleFilter,
      }}
    >
      {children}
    </UserManagementContext.Provider>
  );
};
