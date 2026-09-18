/** Bed management feature barrel. */
export type { BedItem, BedForm, BedStats } from './types';
export { getBeds, getBedStats, createBed, updateBed, deleteBed } from './api';
export { useBeds, useBedStats, useCreateBed, useUpdateBed, useDeleteBed } from './hooks';
