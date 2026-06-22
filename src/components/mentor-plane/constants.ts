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
  GLANCE_RETURN: 0.04,  // lerp factor back to neutral when pointer leaves

  // Camera inertial movement.
  CAMERA_FRICTION: 0.93, // velocity multiplier each frame (higher = glides longer)
  MAX_VELOCITY: 42,      // px/frame velocity cap
  SPRING: 0.12,          // cam -> target lerp for keyboard / recenter

  // Scroll-driven camera travel. The mentor section is only slightly taller
  // than the viewport (STAGE_VH); scrolling through it moves the camera along
  // a path so the page carries you in and out — short pin, never a trap.
  STAGE_VH: 160,         // section height as a % of viewport (scroll distance)
  SCROLL_TRAVEL_X: 1500, // px the camera travels across the plane over full scroll
  SCROLL_TRAVEL_Y: 1150, // px the camera travels down the plane over full scroll
  SCROLL_SWAY: 220,      // gentle sideways sine sway for an organic path
  // Very high tracking rate: scroll is the user's direct input, so the camera
  // must follow it ~1:1. A hair of smoothing hides wheel quantization. Soft-
  // springing scroll is what makes pinned sections feel laggy and trapped.
  SCROLL_DAMP: 0.9,      // how quickly the camera eases toward the scroll target

  // Drag / keys offset on top of the scroll path. Committed (stays where you
  // leave it) so you can wander the field; scroll is never hijacked, it just
  // travels the base path underneath. Recycling is infinite, so a generous
  // cap still has content everywhere.
  DRAG_MAX: 2600,        // px cap on the committed wander offset
  DRAG_STEP: 7,          // px per keyboard pan tick

  // Per-card levitation. Each card bobs on its own phase (derived from its
  // cell hash) so the field reads as a living, floating constellation rather
  // than a locked grid. Amplitudes are small and periods slow — cinematic,
  // not wobbly.
  FLOAT_XY: 7,           // px of horizontal/vertical drift
  FLOAT_Z: 22,           // px of depth bob (toward/away from camera)
  FLOAT_ROT: 1.6,        // deg of gentle tilt sway
  FLOAT_PERIOD: 7.5,     // base period in seconds; per-card phase spreads it

  // Per-card depth falloff from viewport center (0 = center, 1 = far edge).
  DEPTH: 520,            // max z recession (px) — edges sit this far back
  SCALE_FALLOFF: 0.18,   // scale shrink at the far edge (less = denser edges)
  OPACITY_FALLOFF: 0.5,  // opacity reduction at the far edge
  OPACITY_MIN: 0.32,     // floor so deep cards stay readable
  CARD_ROT: 9,           // max deg cards rotate toward the viewer at edges
  CENTER_EMPHASIS: 1.0,  // multiplies the center-vs-edge contrast curve

  // Layout / tiling. Tight cells + smaller cards = a dense floating field;
  // generous jitter breaks the grid so it reads as a constellation, not rows.
  CELL: 210,             // base grid cell size (px) in plane space
  JITTER: 0.5,           // positional jitter as a fraction of CELL
  SIZE_VAR: 0.4,         // card size variation range (0.8 .. 1.2)
  DEPTH_VAR: 0.5,        // extra per-card depth variation fraction

  CARD_W: 200,           // base card width (px)
  CARD_H: 250,           // base card height (px)

  // Hover / focus behaviour.
  HOVER_LIFT: 45,        // px a hovered card pulls toward the camera (−z)
  HOVER_SCALE: 1.06,     // scale bump on hover
  HOVER_DIM: 0.5,        // opacity multiplier applied to non-hovered cards

  // Interaction thresholds.
  CLICK_THRESHOLD: 6,    // px of pointer movement before a drag starts

  // Recycling margin in cell units around the viewport.
  MARGIN_CELLS: 1.5,
} as const;

export const POOL_SIZE = 80;
