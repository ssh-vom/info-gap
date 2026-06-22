// Deterministic seeded layout for the infinite mentor plane.
// Everything is a pure function of integer cell coords, so the layout never
// visibly shuffles during movement and recycles cleanly.

export interface CellLayout {
  px: number;     // plane-space center x
  py: number;     // plane-space center y
  size: number;   // scale multiplier for this card
  depth: number;  // 0..1 extra depth fraction
}

// Integer hash → [0,1). Stable across runs, cheap, no deps.
function hash2(i: number, j: number): number {
  let h = Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263);
  h = (h ^ 0x5bf03625) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

// Mentor index for a cell. (7i + 13j) mod N keeps neighbors distinct for any
// N >= 8 — adjacent cells differ by 7, 13, or their sum, none of which is 0
// mod N for the mentor counts we use, so duplicates never sit beside each other.
export function mentorIndex(i: number, j: number, n: number): number {
  return (((7 * i + 13 * j) % n) + n) % n;
}

// Layout for a single cell. Uses two independent hashes per axis so jitter
// isn't axis-coupled, plus extra hashes for size/depth variation.
export function cellLayout(
  i: number,
  j: number,
  cell: number,
  jitter: number,
  sizeVar: number,
  depthVar: number,
): CellLayout {
  const cx = i * cell + cell / 2;
  const cy = j * cell + cell / 2;
  const jx = (hash2(i, j) - 0.5) * cell * jitter;
  const jy = (hash2(j, i) - 0.5) * cell * jitter;
  const size = 1 - sizeVar / 2 + hash2(i + 1, j + 2) * sizeVar;
  const depth = hash2(i + 3, j + 5) * depthVar;
  return { px: cx + jx, py: cy + jy, size, depth };
}

export const keyOf = (i: number, j: number) => `${i},${j}`;
