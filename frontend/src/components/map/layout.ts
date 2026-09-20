export const BUILDING_W = 180;
export const BUILDING_H = 110;
export const GRID_GAP = 30;
export const COLS = 3;
export const TOP_MARGIN = 50;
export const FLOOR_HEIGHT = 260;
export const MAP_WIDTH = 900;
export const PLAYER_SIZE = 28;
export const INTERACT_RADIUS = 56;
export const RECEPTIONIST_SIZE = 56;
export const MOVE_SPEED = 220; // px per second

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface MapLayout {
  mapWidth: number;
  mapHeight: number;
  buildings: Rect[];
  doors: Point[];
  receptionist: Rect;
  receptionistDoor: Point;
  spawn: Point;
}

/** Rooms are laid out as a grid of "buildings"; the receptionist sits below
 * the grid, and the player spawns in the open floor space below that. Pure
 * and deterministic so the interaction geometry is unit-testable without
 * rendering anything. */
export function computeLayout(roomCount: number): MapLayout {
  const rows = Math.max(1, Math.ceil(roomCount / COLS));
  const gridWidth = COLS * BUILDING_W + (COLS - 1) * GRID_GAP;
  const startX = (MAP_WIDTH - gridWidth) / 2;

  const buildings: Rect[] = [];
  const doors: Point[] = [];
  for (let i = 0; i < roomCount; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = startX + col * (BUILDING_W + GRID_GAP);
    const y = TOP_MARGIN + row * (BUILDING_H + GRID_GAP);
    buildings.push({ x, y, w: BUILDING_W, h: BUILDING_H });
    doors.push({ x: x + BUILDING_W / 2, y: y + BUILDING_H + 18 });
  }

  const gridBottom = TOP_MARGIN + rows * (BUILDING_H + GRID_GAP);
  const receptionist: Rect = {
    x: MAP_WIDTH / 2 - RECEPTIONIST_SIZE / 2,
    y: gridBottom + 40,
    w: RECEPTIONIST_SIZE,
    h: RECEPTIONIST_SIZE,
  };
  const receptionistDoor: Point = { x: MAP_WIDTH / 2, y: receptionist.y + RECEPTIONIST_SIZE + 24 };

  const mapHeight = gridBottom + FLOOR_HEIGHT;
  // Comfortably outside INTERACT_RADIUS of the receptionist door, so the
  // "press E" hint doesn't fire the instant you spawn.
  const spawn: Point = { x: MAP_WIDTH / 2, y: mapHeight - 40 };

  return { mapWidth: MAP_WIDTH, mapHeight, buildings, doors, receptionist, receptionistDoor, spawn };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Resolves a proposed move against a set of solid rectangles, one axis at a
 * time, so bumping into a wall diagonally still slides along it instead of
 * stopping the player dead. */
export function resolveMove(current: Point, proposed: Point, size: number, obstacles: Rect[]): Point {
  const half = size / 2;

  function overlapsAny(p: Point): boolean {
    return obstacles.some((o) => p.x + half > o.x && p.x - half < o.x + o.w && p.y + half > o.y && p.y - half < o.y + o.h);
  }

  let { x, y } = current;

  const afterX = { x: proposed.x, y };
  if (!overlapsAny(afterX)) x = proposed.x;

  const afterY = { x, y: proposed.y };
  if (!overlapsAny(afterY)) y = proposed.y;

  return { x, y };
}

export function clampToMap(p: Point, mapWidth: number, mapHeight: number, size: number): Point {
  const half = size / 2;
  return {
    x: Math.min(Math.max(p.x, half), mapWidth - half),
    y: Math.min(Math.max(p.y, half), mapHeight - half),
  };
}
