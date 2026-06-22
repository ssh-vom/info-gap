// Camera + glance state machines. Plain mutable objects kept out of React
// state so the rAF loop can mutate them without re-renders.

export class Camera {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  private tx: number;
  private ty: number;
  private hasTarget = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.tx = x;
    this.ty = y;
  }

  // Programmatic move (keyboard / recenter): ease toward a target.
  setTarget(x: number, y: number) {
    this.tx = x;
    this.ty = y;
    this.hasTarget = true;
    this.vx = 0;
    this.vy = 0;
  }

  // Direct drag / wheel: move immediately and seed inertia from the delta.
  nudge(dx: number, dy: number) {
    this.x += dx;
    this.y += dy;
    this.vx = dx;
    this.vy = dy;
    this.hasTarget = false;
  }

  step(friction: number, maxVel: number, spring: number) {
    if (this.hasTarget) {
      this.x += (this.tx - this.x) * spring;
      this.y += (this.ty - this.y) * spring;
      if (Math.abs(this.tx - this.x) < 0.4 && Math.abs(this.ty - this.y) < 0.4) {
        this.x = this.tx;
        this.y = this.ty;
        this.hasTarget = false;
        this.vx = 0;
        this.vy = 0;
      }
      return;
    }
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= friction;
    this.vy *= friction;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > maxVel) {
      this.vx = (this.vx / sp) * maxVel;
      this.vy = (this.vy / sp) * maxVel;
    }
    if (Math.abs(this.vx) < 0.01) this.vx = 0;
    if (Math.abs(this.vy) < 0.01) this.vy = 0;
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
