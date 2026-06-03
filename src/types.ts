/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
