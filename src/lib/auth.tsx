import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppUser, UserRole, ModuleId, ActionType } from '../types';

export const DEFAULT_ROLES: UserRole[] = [
  {
    id: 'admin',
    name: 'Administrador',
    description: 'Acesso total ao sistema, todas as ações permitidas',
    permissions: [
      { moduleId: 'planning', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'water_balances', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'systems', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'supply_sources', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'demands', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'dashboard', actions: ['view'] },
      { moduleId: 'users', actions: ['view', 'create', 'edit', 'delete'] },
    ]
  },
  {
    id: 'regulator',
    name: 'Regulador',
    description: 'Acesso de auditoria, edição e alteração técnica, com restrições de exclusão.',
    permissions: [
      { moduleId: 'planning', actions: ['view', 'create', 'edit'] },
      { moduleId: 'water_balances', actions: ['view', 'create', 'edit'] },
      { moduleId: 'systems', actions: ['view', 'create', 'edit'] },
      { moduleId: 'supply_sources', actions: ['view', 'create', 'edit'] },
      { moduleId: 'demands', actions: ['view', 'create', 'edit'] },
      { moduleId: 'dashboard', actions: ['view'] },
      { moduleId: 'users', actions: ['view'] },
    ]
  },
  {
    id: 'provider',
    name: 'Prestador',
    description: 'Acesso restrito às suas próprias funcionalidades e envio de dados.',
    permissions: [
      { moduleId: 'water_balances', actions: ['view', 'create', 'edit'] },
      { moduleId: 'systems', actions: ['view'] },
      { moduleId: 'supply_sources', actions: ['view'] },
      { moduleId: 'demands', actions: ['view'] },
      { moduleId: 'dashboard', actions: ['view'] },
    ]
  }
];

export const DEFAULT_USERS: AppUser[] = [
  { id: '1', name: 'Admin', email: 'admin@adasa.gov.br', roleId: 'admin', status: 'active' },
  { id: '2', name: 'Joao Regulador', email: 'joao@adasa.gov.br', roleId: 'regulator', status: 'active' },
  { id: '3', name: 'Maria CAESB', email: 'maria@caesb.gov.br', roleId: 'provider', agency: 'CAESB', status: 'active' },
];

interface AuthContextType {
  currentUser: AppUser | null;
  users: AppUser[];
  roles: UserRole[];
  login: (email: string) => void;
  loginWithCredentials: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkPermission: (moduleId: ModuleId, action: ActionType) => boolean;
  hasRole: (roleId: string) => boolean;
  addUser: (user: Omit<AppUser, 'id'>) => void;
  updateUser: (id: string, updates: Partial<AppUser>) => void;
  deleteUser: (id: string) => void;
  addRole: (role: Omit<UserRole, 'id'>) => void;
  updateRole: (id: string, updates: Partial<UserRole>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem("adasa-sgi-user");
    return saved ? JSON.parse(saved) : null; // Start as null to show login screen
  });
  const [users, setUsers] = useState<AppUser[]>(DEFAULT_USERS);
  const [roles, setRoles] = useState<UserRole[]>(DEFAULT_ROLES);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const resData = await response.json();
      if (resData.success && Array.isArray(resData.data)) {
        setUsers(resData.data);
      }
    } catch (err) {
      console.warn("Could not fetch users from database, using client defaults:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const loginWithCredentials = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: password || "1234" })
      });
      const data = await response.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem("adasa-sgi-user", JSON.stringify(data.user));
        await fetchUsers(); // Refresh users list
        return { success: true };
      } else {
        return { success: false, error: data.error || "Erro na autenticação" };
      }
    } catch (err: any) {
      console.error("Login verification error:", err);
      // Fallback local authentication for when DB is offline
      const user = users.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim() && u.status === 'active');
      if (user) {
        setCurrentUser(user);
        localStorage.setItem("adasa-sgi-user", JSON.stringify(user));
        return { success: true };
      }
      return { success: false, error: "Serviço indisponível e usuário não encontrado localmente." };
    }
  };

  const login = (email: string) => {
    loginWithCredentials(email, "1234");
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("adasa-sgi-user");
  };

  const checkPermission = (moduleId: ModuleId, action: ActionType): boolean => {
    if (!currentUser) return false;
    const role = roles.find(r => r.id === currentUser.roleId);
    if (!role) return false;
    
    // Admin override (business rule)
    if (role.id === 'admin') return true;

    const modulePerms = role.permissions.find(p => p.moduleId === moduleId);
    if (!modulePerms) return false;

    return modulePerms.actions.includes(action);
  };

  const hasRole = (roleId: string): boolean => {
    return currentUser?.roleId === roleId;
  };

  const addUser = async (userData: Omit<AppUser, 'id'>) => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
      });
      const data = await response.json();
      if (data.success && data.data) {
        await fetchUsers();
      } else {
        // Fallback local
        const newUser = { ...userData, id: Date.now().toString() };
        setUsers(prev => [...prev, newUser]);
      }
    } catch (err) {
      console.error("Error creating database user, falling back:", err);
      const newUser = { ...userData, id: Date.now().toString() };
      setUsers(prev => [...prev, newUser]);
    }
  };

  const updateUser = async (id: string, updates: Partial<AppUser>) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      if (data.success) {
        await fetchUsers();
        // If updating currently logged in user, apply updates
        if (currentUser && currentUser.id === id) {
          const updatedUser = { ...currentUser, ...updates };
          setCurrentUser(updatedUser);
          localStorage.setItem("adasa-sgi-user", JSON.stringify(updatedUser));
        }
      } else {
        // Fallback local
        setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
      }
    } catch (err) {
      console.error("Error updating database user, falling back:", err);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (data.success) {
        await fetchUsers();
      } else {
        // Fallback local
        setUsers(prev => prev.filter(u => u.id !== id));
      }
    } catch (err) {
      console.error("Error deleting database user, falling back:", err);
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const addRole = (roleData: Omit<UserRole, 'id'>) => {
    const newRole = { ...roleData, id: Date.now().toString() };
    setRoles(prev => [...prev, newRole]);
  };

  const updateRole = (id: string, updates: Partial<UserRole>) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  return (
    <AuthContext.Provider value={{ 
        currentUser, users, roles, 
        login, loginWithCredentials, logout, checkPermission, hasRole,
        addUser, updateUser, deleteUser,
        addRole, updateRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ==========================================
// Middleware / Decorators (Wrapper Components)
// ==========================================

interface ProtectedRouteProps {
  moduleId: ModuleId;
  action?: ActionType;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component to protect routes or blocks of UI.
 * If user doesn't have permission to `action` in `moduleId`, renders fallback.
 */
export const RequirePermission = ({ moduleId, action = 'view', children, fallback = null }: ProtectedRouteProps) => {
  const { checkPermission } = useAuth();
  
  if (!checkPermission(moduleId, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
