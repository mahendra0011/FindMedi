/**
 * Lab-tests feature — utility helpers.
 */
import type { LabTestResult } from './types';

export function isResultFlagged(result: LabTestResult): boolean {
  return result.flagged;
}

export function formatLabValue(result: LabTestResult): string {
  const val = result.value;
  return typeof val === 'number' ? `${val} ${result.unit}` : `${val}`;
}
