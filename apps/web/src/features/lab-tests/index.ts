/** Lab-tests feature barrel. */
export type { LabTestCategory, LabTestResult } from './types';
export { labApi, testsApi } from './api';
export { useLabTests, useLabStats, useLabBookings } from './hooks';
export { isResultFlagged, formatLabValue } from './utils';
