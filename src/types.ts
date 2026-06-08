/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ActionType = 'view' | 'create' | 'edit' | 'delete';
export type ModuleId = 'planning' | 'water_balances' | 'systems' | 'supply_sources' | 'demands' | 'dashboard' | 'users';

export interface AppPermission {
  moduleId: ModuleId;
  actions: ActionType[];
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: AppPermission[];
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  agency?: string;
  status: 'active' | 'inactive';
}

export interface System {
  id: number;
  code?: string;
  name: string;
  waterBalanceId?: number;
}

export interface Region {
  id: number;
  code?: string;
  name: string;
  systemId: number;
  description?: string;
  waterBalanceId?: number;
}

export interface DemandEntry {
  regionId: number;
  year: number;
  population: number;
  coverage: number; // 0 to 1
  perCapitaConsumption: number; // L/hab.dia
  losses: number; // 0 to 1
}

export interface DemandModifiers {
  population: number;
  coverage: number | null;
  perCapitaConsumption: number;
  losses: number | null;
}

export interface Demand {
  id: number;
  name: string;
  description?: string;
  entries: DemandEntry[];
  modifiers: DemandModifiers;
  waterBalanceId?: number;
}

export interface SupplySource {
  id: number;
  code?: string;
  systemId: number;
  name: string;
  type: string;
  grantedFlow: number;
  operationalFlow: number;
  unavailableFlow: number;
  unavailabilityReason: string;
  waterBalanceId?: number;
}

export type AdjustmentType = 'Aumento da vazão' | 'Redução da vazão' | 'Transferência';

export interface OperationalAdjustment {
  id: number;
  systemId: number;
  type: AdjustmentType;
  description: string;
  startYear: number;
  endYear: number;
  flowValue: number;
  waterBalanceId?: number;
  linkedAdjustmentId?: number;
}

export interface WaterBalance {
  id: number;
  description: string;
  responsible: string;
  deliveryDate: string;
  receivedBy: string;
  receiptDate: string;
  status: 'Validado' | 'Pendente';
}

export interface CalculationResult extends DemandEntry {
  projectedDemand: number; // L/s
}

export interface Task {
  id: number;
  title: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  status: 'pending' | 'in_progress' | 'completed' | string;
  parentId: number | null;
  progress: number;
  priority?: string;
  categoryIds?: number[];
  assignedTo?: string;
  createdBy?: string;
  notes?: string;
  planId?: number | null;
  areaIds?: number[];
  responsibleIds?: number[];
  dependsOnTaskId?: number | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface Plan {
  id: number;
  name: string;
  description: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface Area {
  id: number;
  name: string;
  abbreviation?: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface Category {
  id: number;
  name: string;
  areaIds: number[];
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface Responsible {
  id: number;
  name: string;
  email?: string;
  role?: string;
  areaIds: number[];
  updatedAt?: string | null;
  updatedBy?: string | null;
}

