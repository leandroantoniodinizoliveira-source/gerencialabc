/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines CSS classes using clsx and tailwind-merge.
 * Useful for conditional Tailwind classes.
 *
 * @param inputs - Array of class values to be combined
 * @returns A merged string of valid Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculates water demand based on population, coverage, consumption, and losses.
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 *
 * @param population - Total population
 * @param coverage - Service coverage (e.g., 0.9 for 90%)
 * @param perCapitaConsumption - Daily consumption per person in liters
 * @param losses - Water loss rate (e.g., 0.3 for 30%)
 * @returns The calculated demand in liters per second
 */
export function calculateDemand(
  population: number,
  coverage: number,
  perCapitaConsumption: number,
  losses: number
): number {
  if (losses >= 1) return 0; // Prevent division by zero or negative demand
  return (population * coverage * perCapitaConsumption) / (1 - losses) / 86400;
}

/**
 * Formats a number to a string using Brazilian Portuguese locale.
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 *
 * @param num - Number to format
 * @param decimals - Number of decimal places
 * @returns Formatted number string
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Formats a number as an integer using Brazilian Portuguese locale.
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 *
 * @param num - Number to format
 * @returns Formatted integer string
 */
export function formatInteger(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(num));
}
