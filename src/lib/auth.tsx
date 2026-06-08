import React, { createContext, useContext, useState, ReactNode } from 'react';
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
  const [currentUser, setCurrentUser] = useState<AppUser | null>(DEFAULT_USERS[0]); // Auto-login admin for demo
  const [users, setUsers] = useState<AppUser[]>(DEFAULT_USERS);
  const [roles, setRoles] = useState<UserRole[]>(DEFAULT_ROLES);

  const login = (email: string) => {
    const user = users.find(u => u.email === email && u.status === 'active');
    if (user) setCurrentUser(user);
    else alert('Usuário não encontrado ou inativo.');
  };

  const logout = () => setCurrentUser(null);

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

  const addUser = (userData: Omit<AppUser, 'id'>) => {
    const newUser = { ...userData, id: Date.now().toString() };
    setUsers(prev => [...prev, newUser]);
  };

  const updateUser = (id: string, updates: Partial<AppUser>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const addRole = (roleData: Omit<UserRole, 'id'>) => {
      const newRole = { ...roleData, id: Date.now().toString() };
      setRoles(prev => [...prev, newRole]);
  }

  const updateRole = (id: string, updates: Partial<UserRole>) => {
      setRoles(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  return (
    <AuthContext.Provider value={{ 
        currentUser, users, roles, 
        login, logout, checkPermission, hasRole,
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
