// Tunable constants for the mentor plane. Defaults chosen for a quiet,
// cinematic, premium feel — not a VR demo.

export const TUNING = {
  // 3D perspective on the scene container (px). Smaller = stronger perspective.
  PERSPECTIVE: 1500,

  // Pointer "glance" effect — small, damped yaw/pitch/translate of the world.
  GLANCE_YAW: 7,        // deg of world yaw at full pointer offset
  GLANCE_PITCH: 5,      // deg of world pitch
  GLANCE_TRANSLATE: 55, // px the world shifts opposite the pointer
  GLANCE_DAMP: 0.08,    // lerp factor toward glance target each frame

  // Camera lerp toward the per-frame target (scroll path + drag offset).
  CAMERA_SPRING: 0.9, // ponytail: ~1:1 scroll tracking; one value covers it

  // Drag / keys offset from the centered start. Committed (stays where you
  // leave it) so you can wander the field. Recycling is infinite, so a
  // generous cap still has content everywhere.
  DRAG_MAX: 2600,        // px cap on the committed wander offset
  DRAG_STEP: 7,          // px per keyboard pan tick

  // Per-card depth falloff from viewport center (0 = center, 1 = far edge).
  DEPTH: 520,            // max z recession (px) — edges sit this far back
  SCALE_FALLOFF: 0.18,   // scale shrink at the far edge (less = denser edges)
  OPACITY_FALLOFF: 0.5,  // opacity reduction at the far edge
  OPACITY_MIN: 0.32,     // floor so deep cards stay readable
  CARD_ROT: 9,           // max deg cards rotate toward the viewer at edges
  CENTER_EMPHASIS: 1.0,  // multiplies the center-vs-edge contrast curve

  // Layout / tiling. Bigger cards + cells = fewer on screen at once, so the
  // per-frame render set shrinks while the plane stays infinite. Jitter
  // breaks the grid so it reads as a constellation, not rows.
  CELL: 290,             // base grid cell size (px) in plane space
  JITTER: 0.5,           // positional jitter as a fraction of CELL
  SIZE_VAR: 0.4,         // card size variation range (0.8 .. 1.2)
  DEPTH_VAR: 0.5,        // extra per-card depth variation fraction

  CARD_W: 270,           // base card width (px)
  CARD_H: 340,           // base card height (px)

  // Hover / focus behaviour.
  HOVER_LIFT: 45,        // px a hovered card pulls toward the camera (−z)
  HOVER_SCALE: 1.06,     // scale bump on hover
  HOVER_DIM: 0.5,        // opacity multiplier applied to non-hovered cards

  // Interaction thresholds.
  CLICK_THRESHOLD: 6,    // px of pointer movement before a drag starts

  // Recycling margin in cell units around the viewport.
  MARGIN_CELLS: 1.5,
} as const;

// ponytail: trimmed from 80 — bigger cells mean fewer visible at once (~45
// worst case at 1440x900 + margin), so the pool needs fewer recycled nodes.
export const POOL_SIZE = 56;
