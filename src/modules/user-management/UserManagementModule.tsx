import React from "react";
import { UserManagementProvider } from "./UserManagementContext";
import { UserManagementTab } from "../../components/UserManagementTab";

export const UserManagementModule: React.FC = () => {
  return (
    <UserManagementProvider>
      <div className="user-management-module-root w-full h-full">
        <UserManagementTab />
      </div>
    </UserManagementProvider>
  );
};
