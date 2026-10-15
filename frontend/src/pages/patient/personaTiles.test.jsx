/**
 * 6.md §4 persona variants: tile priority per persona. Pure orderTiles matrix
 * tests — the dashboard only reorders, permissions never change here.
 */
import { describe, expect, it } from 'vitest';
import { orderTiles, PERSONA_TILE_ORDER } from './personaTiles';

const tiles = [
  { id: 'findDoctors' },
  { id: 'videoConsult' },
  { id: 'buyMedicine' },
  { id: 'vaccination' },
  { id: 'emergency' },
  { id: 'insurance' },
];

describe('orderTiles persona matrix', () => {
  it('keeps catalogue order for adult/unknown', () => {
    expect(orderTiles(tiles, 'adult').map((t) => t.id)).toEqual(
      tiles.map((t) => t.id),
    );
    expect(orderTiles(tiles, 'alien').map((t) => t.id)).toEqual(
      tiles.map((t) => t.id),
    );
    expect(orderTiles(tiles, null).map((t) => t.id)).toEqual(
      tiles.map((t) => t.id),
    );
  });

  it('puts emergency first for elderly and vaccination first for parent', () => {
    expect(orderTiles(tiles, 'elderly')[0].id).toBe('emergency');
    expect(orderTiles(tiles, 'parent')[0].id).toBe('vaccination');
  });

  it('keeps unlisted tiles after prioritised ones, stable', () => {
    const out = orderTiles(tiles, 'fitness').map((t) => t.id);
    // fitness priority has none of these ids -> catalogue order preserved
    expect(out).toEqual(tiles.map((t) => t.id));
  });

  it('covers all 7 personas from the closed enum', () => {
    expect(Object.keys(PERSONA_TILE_ORDER).sort()).toEqual(
      ['adult', 'caregiver', 'chronic', 'elderly', 'fitness', 'maternity', 'parent'].sort(),
    );
  });

  it('does not mutate the input array', () => {
    const input = [...tiles];
    orderTiles(input, 'elderly');
    expect(input.map((t) => t.id)).toEqual(tiles.map((t) => t.id));
  });
});
