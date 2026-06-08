import React, { useState } from "react";
import { Users, Shield, Plus, Edit, Trash2, Key, Check, Info } from "lucide-react";
import { AppUser, UserRole, ModuleId, ActionType } from "../types";
import { useAuth } from "../lib/auth";

export function UserManagementTab() {
  const { users, roles, currentUser, addUser, updateUser, deleteUser, addRole, updateRole, checkPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [isEditingUser, setIsEditingUser] = useState<Partial<AppUser> | null>(null);
  const [isEditingRole, setIsEditingRole] = useState<Partial<UserRole> | null>(null);

  const canEdit = checkPermission("users", "edit");
  const canCreate = checkPermission("users", "create");
  const canDelete = checkPermission("users", "delete");

  const availableModules: ModuleId[] = ['planning', 'water_balances', 'systems', 'supply_sources', 'demands', 'dashboard', 'users'];
  const allActions: ActionType[] = ['view', 'create', 'edit', 'delete'];

  const handleSaveUser = () => {
    if (!isEditingUser?.name || !isEditingUser?.email || !isEditingUser?.roleId) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }
    if (isEditingUser.id) {
      updateUser(isEditingUser.id, isEditingUser);
    } else {
      addUser(isEditingUser as Omit<AppUser, 'id'>);
    }
    setIsEditingUser(null);
  };

  const handleSaveRole = () => {
    if (!isEditingRole?.name) {
      alert("Preencha o nome do papel");
      return;
    }
    if (isEditingRole.id) {
      updateRole(isEditingRole.id, isEditingRole);
    } else {
      addRole(isEditingRole as Omit<UserRole, 'id'>);
    }
    setIsEditingRole(null);
  };

  const togglePermission = (moduleId: ModuleId, action: ActionType) => {
    if (!isEditingRole) return;
    
    const newPerms = [...(isEditingRole.permissions || [])];
    const existingModulePerm = newPerms.find(p => p.moduleId === moduleId);
    
    if (existingModulePerm) {
      if (existingModulePerm.actions.includes(action)) {
        existingModulePerm.actions = existingModulePerm.actions.filter(a => a !== action);
      } else {
        existingModulePerm.actions.push(action);
      }
      if (existingModulePerm.actions.length === 0) {
        // remove completely if no actions
        const index = newPerms.findIndex(p => p.moduleId === moduleId);
        newPerms.splice(index, 1);
      }
    } else {
      newPerms.push({ moduleId, actions: [action] });
    }
    setIsEditingRole({ ...isEditingRole, permissions: newPerms });
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-2">
        <button
          className={`flex items-center gap-2 px-4 py-2 ${activeTab === "users" ? "border-b-2 border-indigo-500 text-indigo-600 font-bold" : "text-slate-500 font-medium"}`}
          onClick={() => setActiveTab("users")}
        >
          <Users size={16} /> Usuários
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 ${activeTab === "roles" ? "border-b-2 border-indigo-500 text-indigo-600 font-bold" : "text-slate-500 font-medium"}`}
          onClick={() => setActiveTab("roles")}
        >
          <Shield size={16} /> Papéis e Permissões
        </button>
      </div>

      {activeTab === "users" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 flex items-center justify-between bg-slate-50 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Usuários do Sistema</h3>
            {canCreate && (
              <button onClick={() => setIsEditingUser({ status: 'active', roleId: roles[0]?.id })} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition">
                <Plus size={14} /> Novo Usuário
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Papel</th>
                  <th className="px-4 py-3">Agência (Opcional)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{u.name} {u.id === currentUser?.id && <span className="ml-2 text-[9px] bg-indigo-100 text-indigo-600 py-0.5 px-1.5 rounded-full uppercase font-black">Você</span>}</td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold border border-slate-200">{roles.find(r => r.id === u.roleId)?.name || 'Desconhecido'}</span></td>
                    <td className="px-4 py-3 text-slate-500">{u.agency || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {u.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <button onClick={() => setIsEditingUser(u)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition">
                            <Edit size={14} />
                          </button>
                        )}
                        {canDelete && u.id !== currentUser?.id && (
                          <button onClick={() => deleteUser(u.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "roles" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden col-span-1">
             <div className="p-4 flex items-center justify-between bg-slate-50 border-b border-slate-100">
               <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Papéis</h3>
               {canCreate && (
                 <button onClick={() => setIsEditingRole({ permissions: [] })} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition">
                   <Plus size={14} />
                 </button>
               )}
             </div>
             <div className="divide-y divide-slate-100">
               {roles.map(r => (
                 <div key={r.id} className="p-4 hover:bg-slate-50 transition cursor-pointer" onClick={() => canEdit && setIsEditingRole(r)}>
                   <div className="flex items-center justify-between">
                     <span className="font-bold text-slate-700">{r.name}</span>
                     {r.id === 'admin' && <Shield size={14} className="text-amber-500" />}
                   </div>
                   <p className="text-xs text-slate-500 mt-1 line-clamp-1">{r.description}</p>
                 </div>
               ))}
             </div>
          </div>
          
          <div className="col-span-1 lg:col-span-2">
            {!isEditingRole ? (
               <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-slate-400">
                 <Key size={32} className="mb-3 opacity-50" />
                 <p className="text-sm font-medium">Selecione um papel para visualizar ou editar permissões</p>
               </div>
            ) : (
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                   <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">{isEditingRole.id ? 'Editar Papel' : 'Novo Papel'}</h3>
                   <div className="flex gap-2">
                     <button onClick={() => setIsEditingRole(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition">Cancelar</button>
                     <button onClick={handleSaveRole} className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition">Salvar</button>
                   </div>
                 </div>
                 <div className="p-5 space-y-4">
                   {isEditingRole.id === 'admin' && (
                     <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800 text-sm">
                       <Info size={16} className="mt-0.5 shrink-0" />
                       <p>O papel <strong>Administrador</strong> tem acesso total ao sistema. As permissões abaixo são apenas demonstrativas.</p>
                     </div>
                   )}
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                       <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
                       <input type="text" value={isEditingRole.name || ''} onChange={e => setIsEditingRole({...isEditingRole, name: e.target.value})} className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500" disabled={isEditingRole.id === 'admin'} />
                     </div>
                     <div className="space-y-1">
                       <label className="text-xs font-bold text-slate-500 uppercase">Descrição</label>
                       <input type="text" value={isEditingRole.description || ''} onChange={e => setIsEditingRole({...isEditingRole, description: e.target.value})} className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500" disabled={isEditingRole.id === 'admin'} />
                     </div>
                   </div>
                   
                   <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
                     <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black border-b border-slate-200">
                         <tr>
                           <th className="px-4 py-2">Módulo</th>
                           {allActions.map(a => <th key={a} className="px-4 py-2 text-center">{a === 'view' ? 'Visualizar' : a === 'create' ? 'Criar' : a === 'edit' ? 'Alterar' : 'Excluir'}</th>)}
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {availableModules.map(mod => {
                           const perms = isEditingRole.permissions?.find(p => p.moduleId === mod)?.actions || [];
                           return (
                             <tr key={mod} className="hover:bg-slate-50">
                               <td className="px-4 py-3 font-medium text-slate-700 capitalize">
                                 {mod.replace('_', ' ')}
                               </td>
                               {allActions.map(action => (
                                 <td key={action} className="px-4 py-2 text-center">
                                   <button 
                                     onClick={() => togglePermission(mod, action)}
                                     disabled={isEditingRole.id === 'admin'}
                                     className={`w-5 h-5 rounded flex items-center justify-center mx-auto transition-colors ${perms.includes(action) || isEditingRole.id === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-transparent hover:bg-slate-200 border border-slate-200'}`}
                                   >
                                     <Check size={12} strokeWidth={4} />
                                   </button>
                                 </td>
                               ))}
                             </tr>
                           )
                         })}
                       </tbody>
                     </table>
                   </div>
                 </div>
               </div>
            )}
          </div>
        </div>
      )}

      {/* User Edit Modal */}
      {isEditingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
             <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
               <h3 className="font-black text-slate-800 uppercase tracking-wider">{isEditingUser.id ? 'Editar Usuário' : 'Novo Usuário'}</h3>
             </div>
             <div className="p-5 space-y-4">
               <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
                 <input type="text" value={isEditingUser.name || ''} onChange={e => setIsEditingUser({...isEditingUser, name: e.target.value})} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500" />
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">E-mail / Login</label>
                 <input type="email" value={isEditingUser.email || ''} onChange={e => setIsEditingUser({...isEditingUser, email: e.target.value})} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500" />
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Papel</label>
                 <select value={isEditingUser.roleId || ''} onChange={e => setIsEditingUser({...isEditingUser, roleId: e.target.value})} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white">
                   {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Agência (Opcional)</label>
                 <input type="text" value={isEditingUser.agency || ''} onChange={e => setIsEditingUser({...isEditingUser, agency: e.target.value})} placeholder="Ex: CAESB" className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500" />
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                 <select value={isEditingUser.status || 'active'} onChange={e => setIsEditingUser({...isEditingUser, status: e.target.value as any})} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white">
                   <option value="active">Ativo</option>
                   <option value="inactive">Inativo</option>
                 </select>
               </div>
             </div>
             <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button onClick={() => setIsEditingUser(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition">Cancelar</button>
                <button onClick={handleSaveUser} className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition shadow-sm">Salvar Usuário</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
