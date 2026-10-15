/**
 * 6.md §4 persona variants: per-persona quick-action tile priority.
 * Tiles not listed keep their relative order AFTER prioritised ones.
 * `adult`/unknown = catalogue order. Pure module — dashboard + tests share it.
 * Permissions never change here; this only reorders.
 */
export const PERSONA_TILE_ORDER: Record<string, string[]> = {
  adult: [],
  parent: ['vaccination', 'dentist', 'eyeCare', 'findDoctors', 'uploadReport', 'videoConsult', 'emergency'],
  elderly: ['emergency', 'findDoctors', 'buyMedicine', 'videoConsult', 'uploadReport', 'elderCare', 'insurance'],
  caregiver: ['elderCare', 'findDoctors', 'uploadReport', 'videoConsult', 'buyMedicine', 'emergency'],
  fitness: ['gymYoga', 'dietNutrition', 'dietMeals', 'findDoctors', 'camps'],
  chronic: ['uploadReport', 'labTest', 'buyMedicine', 'dietNutrition', 'findDoctors', 'videoConsult', 'insurance'],
  maternity: ['uploadReport', 'findDoctors', 'vaccination', 'dietNutrition', 'videoConsult', 'emergency', 'insurance'],
};

export function orderTiles<T extends { id: string }>(tiles: T[], persona?: string | null): T[] {
  const priority = PERSONA_TILE_ORDER[persona || ''] || [];
  if (priority.length === 0) return tiles;
  const rank = new Map(priority.map((id, i) => [id, i]));
  return [...tiles].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id)! : Infinity;
    const rb = rank.has(b.id) ? rank.get(b.id)! : Infinity;
    return ra - rb;
  });
}
