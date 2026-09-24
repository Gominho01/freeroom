import { describe, expect, it } from 'vitest';
import { BUILDING_H, BUILDING_W, clampToMap, computeLayout, distance, resolveMove } from '../layout';

describe('computeLayout', () => {
  it('places rooms in a grid of up to 3 columns', () => {
    const layout = computeLayout(4);

    expect(layout.buildings).toHaveLength(4);
    expect(layout.doors).toHaveLength(4);
    // Fourth building wraps to a new row, directly below the first.
    expect(layout.buildings[3]!.x).toBe(layout.buildings[0]!.x);
    expect(layout.buildings[3]!.y).toBeGreaterThan(layout.buildings[0]!.y);
  });

  it('sizes every building the same', () => {
    const layout = computeLayout(5);
    for (const building of layout.buildings) {
      expect(building.w).toBe(BUILDING_W);
      expect(building.h).toBe(BUILDING_H);
    }
  });

  it('places the receptionist below the room grid, centered', () => {
    const layout = computeLayout(3);
    const gridBottom = Math.max(...layout.buildings.map((b) => b.y + b.h));

    expect(layout.receptionist.y).toBeGreaterThan(gridBottom);
    expect(layout.receptionist.x + layout.receptionist.w / 2).toBeCloseTo(layout.mapWidth / 2, 1);
  });

  it('spawns the player below the receptionist, inside the map bounds', () => {
    const layout = computeLayout(2);

    expect(layout.spawn.y).toBeGreaterThan(layout.receptionistDoor.y);
    expect(layout.spawn.x).toBeGreaterThan(0);
    expect(layout.spawn.y).toBeLessThan(layout.mapHeight);
  });

  it('still produces a valid layout with zero rooms', () => {
    const layout = computeLayout(0);
    expect(layout.buildings).toHaveLength(0);
    expect(layout.mapHeight).toBeGreaterThan(0);
  });

  it('places the placeholder slot and door exactly where the first building and its door would sit', () => {
    const empty = computeLayout(0);
    const withOne = computeLayout(1);

    expect(empty.placeholderSlot).toEqual(withOne.buildings[0]);
    expect(empty.placeholderDoor).toEqual(withOne.doors[0]);
  });
});

describe('distance', () => {
  it('computes straight-line distance between two points', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe('resolveMove', () => {
  const wall = { x: 100, y: 100, w: 50, h: 50 };

  it('allows a move that does not hit any obstacle', () => {
    const result = resolveMove({ x: 0, y: 0 }, { x: 10, y: 10 }, 20, [wall]);
    expect(result).toEqual({ x: 10, y: 10 });
  });

  it('blocks the axis that would overlap an obstacle, but keeps the other', () => {
    // Approaching the wall from directly above: y is blocked, x still applies.
    const result = resolveMove({ x: 115, y: 70 }, { x: 120, y: 95 }, 20, [wall]);
    expect(result.y).toBe(70);
    expect(result.x).toBe(120);
  });

  it('lets the player slide along a wall face instead of getting stuck', () => {
    // Standing just left of the wall, moving diagonally up-and-into it: the
    // x move would push into the wall (blocked), but sliding up along its
    // face (y only) is still clear.
    const result = resolveMove({ x: 85, y: 105 }, { x: 95, y: 85 }, 20, [wall]);
    expect(result.x).toBe(85);
    expect(result.y).toBe(85);
  });
});

describe('clampToMap', () => {
  it('keeps a point inside the map bounds', () => {
    expect(clampToMap({ x: -10, y: 5 }, 200, 200, 20)).toEqual({ x: 10, y: 10 });
    expect(clampToMap({ x: 500, y: 500 }, 200, 200, 20)).toEqual({ x: 190, y: 190 });
  });

  it('leaves an already-inside point untouched', () => {
    expect(clampToMap({ x: 100, y: 100 }, 200, 200, 20)).toEqual({ x: 100, y: 100 });
  });
});
