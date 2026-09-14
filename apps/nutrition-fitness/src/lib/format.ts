/** Display formatting helpers that respect the user's measurement units. */
import { MeasurementUnit } from '@/types';
import { cmToFtIn, kgToLb } from './calculations';

export function formatWeight(kg: number, units: MeasurementUnit): string {
  if (units === 'imperial') return `${kgToLb(kg)} lb`;
  return `${round1(kg)} kg`;
}

export function weightValue(kg: number, units: MeasurementUnit): number {
  return units === 'imperial' ? kgToLb(kg) : round1(kg);
}

export function weightUnit(units: MeasurementUnit): string {
  return units === 'imperial' ? 'lb' : 'kg';
}

export function formatHeight(cm: number, units: MeasurementUnit): string {
  if (units === 'imperial') {
    const { ft, in: inches } = cmToFtIn(cm);
    return `${ft}'${inches}"`;
  }
  return `${Math.round(cm)} cm`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
