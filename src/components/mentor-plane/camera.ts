// Camera + glance state machines. Plain mutable objects kept out of React
// state so the rAF loop can mutate them without re-renders.

// ponytail: Camera just lerps to a target set every frame (scroll path + drag
// offset). No inertia/velocity path — setTarget() runs each tick so the
// hasTarget branch was always taken. Add vx/vy + nudge() back if you wire
// wheel/drag-fling with momentum.
export class Camera {
  x: number;
  y: number;
  private tx: number;
  private ty: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.tx = x;
    this.ty = y;
  }

  setTarget(x: number, y: number) {
    this.tx = x;
    this.ty = y;
  }

  step(spring: number) {
    this.x += (this.tx - this.x) * spring;
    this.y += (this.ty - this.y) * spring;
  }
}

// Pointer "glance": small yaw / pitch / translate of the whole world that
// eases toward a target derived from the pointer position, and eases back
// to neutral when the pointer leaves the viewport.
export class Glance {
  x = 0; y = 0;        // current px translate
  ry = 0; rx = 0;      // current deg rotation
  tx = 0; ty = 0;      // target translate
  try_ = 0; trx = 0;   // target rotation (avoid `try` keyword)
  active = false;

  setTarget(nx: number, ny: number, yaw: number, pitch: number, translate: number) {
    this.active = true;
    this.tx = -translate * nx;
    this.ty = -translate * ny;
    this.try_ = yaw * nx;
    this.trx = -pitch * ny;
  }

  release() {
    this.active = false;
    this.tx = 0;
    this.ty = 0;
    this.try_ = 0;
    this.trx = 0;
  }

  step(damp: number) {
    this.x += (this.tx - this.x) * damp;
    this.y += (this.ty - this.y) * damp;
    this.ry += (this.try_ - this.ry) * damp;
    this.rx += (this.trx - this.rx) * damp;
  }
}
