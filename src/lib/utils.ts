/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateDemand(
  population: number,
  coverage: number,
  perCapitaConsumption: number,
  losses: number
): number {
  // Formula: (Pop * Atend * Consumo) / (1 - Perdas) / 86400
  const demand = (population * coverage * perCapitaConsumption) / (1 - losses) / 86400;
  return demand;
}

export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatInteger(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(num));
}
