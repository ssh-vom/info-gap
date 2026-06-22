import { useEffect, useRef, useState } from 'react';
import { TUNING, POOL_SIZE } from './constants';
import { Camera, Glance } from './camera';
import { cellLayout, mentorIndex, keyOf } from './layout';
import type { Mentor } from '../../lib/mentors';

interface Props {
  mentors: Mentor[];
  kicker?: string;
  title?: string;
}

const T = TUNING;

function isLowPower() {
  if (typeof navigator === 'undefined') return false;
  const cores = (navigator as any).hardwareConcurrency || 8;
  const mem = (navigator as any).deviceMemory || 8;
  return cores <= 4 || mem <= 4;
}

/**
 * MentorPlane — an immersive, stereoscopic field of mentor cards.
 *
 * Concerns are split across modules:
 *   - layout.ts        seeded infinite-plane layout + mentor assignment
 *   - camera.ts        Camera (inertia) and Glance (parallax) state machines
 *   - constants.ts     every tunable knob, with tasteful defaults
 *   - MentorPlane.tsx  pool recycling, rAF render loop, input handling, a11y
 *
 * The wrapper renders the live experience directly.
 */
export default function MentorPlane({ mentors, kicker, title }: Props) {
  return <MentorPlaneLive mentors={mentors} kicker={kicker} title={title} />;
}

function MentorPlaneLive({ mentors, kicker, title }: Props) {
  const [lowPower] = useState(isLowPower);
  const [recenterFlash, setRecenterFlash] = useState(false);

  const sceneRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<HTMLDivElement[]>([]);
  const imgRef = useRef<HTMLImageElement[]>([]);
  const capRef = useRef<HTMLSpanElement[]>([]);
  const nameRef = useRef<HTMLSpanElement[]>([]);
  const recenterRef = useRef<() => void>(() => {});

  useEffect(() => {
    const scene = sceneRef.current!;
    const world = worldRef.current!;
    const pool = poolRef.current;
    const imgs = imgRef.current;
    const caps = capRef.current;
    const names = nameRef.current;
    const N = mentors.length;

    // Centre on the first compelling cell so the opening frame is composed.
    const startX = T.CELL / 2;
    const startY = T.CELL / 2;
    const camera = new Camera(startX, startY);
    const glance = new Glance();
    const slots = new Map<string, number>(); // cellKey -> pool index
    const freeSlots: number[] = Array.from({ length: POOL_SIZE }, (_, k) => k).reverse();
    let hoverSlot = -1;
    let focusSlot = -1;

    // Scroll no longer moves the camera — the plane is a still canvas you
    // explore by drag / arrow keys. Scroll just passes through the page.
    let dragX = 0, dragY = 0;
    let lastK = 1; // viewport scale factor — shrinks the field on small screens

    let raf = 0;
    let running = true;
    let inView = true; // IntersectionObserver gates the rAF loop — wakes on scroll-in
    const keysDown = new Set<string>();

    const dim = () => ({ vw: scene.clientWidth, vh: scene.clientHeight });

    // Assign / release pool slots for the current visible cell set. Content is
    // set once, when a cell first enters (off-screen thanks to the margin), so
    // there's never a mid-screen image swap.
    const syncSlots = (visible: { i: number; j: number; key: string }[]) => {
      const visSet = new Set(visible.map((v) => v.key));
      for (const [key, slot] of slots) {
        if (!visSet.has(key)) {
          slots.delete(key);
          freeSlots.push(slot);
          if (hoverSlot === slot) hoverSlot = -1;
          if (focusSlot === slot) focusSlot = -1;
        }
      }
      for (const v of visible) {
        if (slots.has(v.key)) continue;
        const slot = freeSlots.pop();
        if (slot === undefined) break; // pool exhausted — skip the extra
        const m = mentors[mentorIndex(v.i, v.j, N)];
        imgs[slot].src = m.img;
        imgs[slot].alt = `${m.name} — ${m.cat}`;
        caps[slot].textContent = m.cat;
        names[slot].textContent = m.name;
        pool[slot].dataset.key = v.key;
        slots.set(v.key, slot);
      }
    };

    const renderFrame = () => {
      // ponytail: clear raf on early return so the IO/visibility restart
      // guards (!raf) can wake the loop. Without this a stale id deadlocks
      // it after fullscreen/focus flips IO off — unfreezing on refocus.
      if (!running || !inView) { raf = 0; return; }
      glance.step(T.GLANCE_DAMP);

      const { vw, vh } = dim();
      // Viewport scale: shrink the field (cells, cards, perspective, depth) on
      // small screens so mobile gets the same card density + parallax as
      // desktop instead of one giant card filling the viewport.
      const k = Math.max(0.4, Math.min(1, vw / 1000));
      if (k !== lastK) { scene.style.setProperty('--mp-scale', String(k)); lastK = k; }
      const CELL = T.CELL * k, CARD_W = T.CARD_W * k, CARD_H = T.CARD_H * k;
      const DEPTH = T.DEPTH * k, HOVER_LIFT = T.HOVER_LIFT * k;
      const GLANCE_T = T.GLANCE_TRANSLATE * k, DRAG_MAX = T.DRAG_MAX * k;

      // Drag / keys commit a persistent offset from the centered start — so
      // you can wander through the field. Scroll is not in the loop at all.
      if (keysDown.size) {
        if (keysDown.has('left')) dragX -= T.DRAG_STEP;
        if (keysDown.has('right')) dragX += T.DRAG_STEP;
        if (keysDown.has('up')) dragY -= T.DRAG_STEP;
        if (keysDown.has('down')) dragY += T.DRAG_STEP;
      }
      dragX = Math.max(-DRAG_MAX, Math.min(DRAG_MAX, dragX));
      dragY = Math.max(-DRAG_MAX, Math.min(DRAG_MAX, dragY));

      // Camera sits at the start cell plus the committed drag/keys offset.
      camera.setTarget(CELL / 2 + dragX, CELL / 2 + dragY);
      camera.step(T.CAMERA_SPRING);

      world.style.transform =
        `translate3d(${glance.x.toFixed(2)}px, ${glance.y.toFixed(2)}px, 0px)` +
        ` rotateX(${glance.rx.toFixed(3)}deg) rotateY(${glance.ry.toFixed(3)}deg)`;

      const margin = CELL * T.MARGIN_CELLS;
      const iMin = Math.floor((camera.x - vw / 2 - margin) / CELL);
      const iMax = Math.ceil((camera.x + vw / 2 + margin) / CELL);
      const jMin = Math.floor((camera.y - vh / 2 - margin) / CELL);
      const jMax = Math.ceil((camera.y + vh / 2 + margin) / CELL);

      const visible: { i: number; j: number; key: string }[] = [];
      for (let j = jMin; j <= jMax; j++) {
        for (let i = iMin; i <= iMax; i++) {
          visible.push({ i, j, key: keyOf(i, j) });
        }
      }
      syncSlots(visible);

      // Frame-accurate hover: cards move every frame, so re-hit-test against
      // the last pointer position. Dragging suppresses hover.
      if (ptr.present && !dragging) {
        const hit = (document.elementFromPoint(ptr.cx, ptr.cy) as HTMLElement | null)?.closest('.mp-card') as HTMLElement | null;
        hoverSlot = hit ? pool.indexOf(hit) : -1;
      } else if (!ptr.present) {
        hoverSlot = -1;
      }

      const half = Math.max(vw, vh) / 2;
      const anyEmphasis = hoverSlot !== -1 || focusSlot !== -1;

      for (const v of visible) {
        const slot = slots.get(v.key);
        if (slot === undefined) continue;
        const L = cellLayout(v.i, v.j, CELL, T.JITTER, T.SIZE_VAR, T.DEPTH_VAR);
        const sx = L.px - camera.x + vw / 2;
        const sy = L.py - camera.y + vh / 2;
        const dx = sx - vw / 2;
        const dy = sy - vh / 2;
        const nd = Math.min(1, Math.hypot(dx, dy) / half) * T.CENTER_EMPHASIS;

        let z = -DEPTH * nd * nd * (0.7 + L.depth * 0.6);
        let scale = (1 - T.SCALE_FALLOFF * nd) * L.size;
        let rotY = -T.CARD_ROT * nd * (dx / half);
        let rotX = T.CARD_ROT * nd * (dy / half);
        let op = Math.max(T.OPACITY_MIN, 1 - T.OPACITY_FALLOFF * nd * nd);
        let blur = 0;

        const isEmph = slot === hoverSlot || slot === focusSlot;
        if (isEmph) {
          z -= HOVER_LIFT;
          scale *= T.HOVER_SCALE;
          op = 1;
          rotY *= 0.4;
          rotX *= 0.4;
        } else if (anyEmphasis) {
          op *= T.HOVER_DIM;
        }
        if (!lowPower && nd > 0.88 && !isEmph) blur = (nd - 0.88) * 18;

        const w = CARD_W * scale;
        const h = CARD_H * scale;
        const el = pool[slot];
        el.style.transform =
          `translate3d(${(sx - w / 2).toFixed(2)}px, ${(sy - h / 2).toFixed(2)}px, ${z.toFixed(2)}px)` +
          ` rotateX(${rotX.toFixed(3)}deg) rotateY(${rotY.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
        el.style.opacity = op.toFixed(3);
        el.style.zIndex = String(2000 - Math.round(nd * 1000) + (isEmph ? 500 : 0));
        el.style.filter = blur > 0 ? `blur(${blur.toFixed(2)}px)` : '';
        el.classList.toggle('mp-emph', isEmph);
      }

      raf = requestAnimationFrame(renderFrame);
    };

    // Only run the loop while the section is on screen: scroll into view → wakes,
    // scroll away → pauses. Saves cycles and makes the plane feel like it
    // "turns on" as you reach it.
    const io = new IntersectionObserver((entries) => {
      inView = entries[0]?.isIntersecting ?? true;
      if (inView && running && !raf) raf = requestAnimationFrame(renderFrame);
    }, { threshold: 0.01 });
    io.observe(scene);

    raf = requestAnimationFrame(renderFrame);

    // ---- Input: pointer peek + glance + click-vs-drag --------------------
    // Scroll is NOT captured — the page scrolls past the section naturally.
    // Touch drags scroll the page; only mouse/pen drags peek around the plane.
    let down: { x: number; y: number; lx: number; ly: number; moved: number } | null = null;
    let dragging = false;
    // ponytail: track pointer in viewport coords + re-hit-test each frame
    // via elementFromPoint. Cards slide under a still cursor every frame, so
    // pointerover/out (boundary events) go stale; per-frame hit-testing is
    // frame-accurate and immune to child-element flicker.
    let ptr = { cx: 0, cy: 0, present: false };

    const localPos = (e: PointerEvent) => {
      const r = scene.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // let the page scroll
      const p = localPos(e);
      down = { x: p.x, y: p.y, lx: p.x, ly: p.y, moved: 0 };
      dragging = false;
      scene.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      const p = localPos(e);
      const { vw, vh } = dim();
      ptr.cx = e.clientX; ptr.cy = e.clientY; ptr.present = true;
      // Glance (parallax) follows any pointer; on touch it tracks the finger
      // subtly while the page scrolls, which reads as life, not a trap.
      glance.setTarget(
        (p.x - vw / 2) / (vw / 2),
        (p.y - vh / 2) / (vh / 2),
        T.GLANCE_YAW, T.GLANCE_PITCH, T.GLANCE_TRANSLATE * lastK,
      );

      if (down) {
        const dx = p.x - down.lx;
        const dy = p.y - down.ly;
        down.lx = p.x;
        down.ly = p.y;
        down.moved += Math.hypot(dx, dy);
        if (down.moved > T.CLICK_THRESHOLD) {
          dragging = true;
          scene.classList.add('mp-dragging');
        }
        if (dragging) {
          dragX += -dx; // drag content with the hand — committed, stays put
          dragY += -dy;
        }
      }
    };

    const onUp = (e: PointerEvent) => {
      if (down && !dragging) {
        // Click, not drag — find the card under the pointer.
        const target = (e.target as HTMLElement)?.closest('.mp-card') as HTMLElement | null;
        if (target) {
          const slot = pool.indexOf(target);
          if (slot !== -1) activate(slot);
        }
      }
      down = null;
      dragging = false;
      scene.classList.remove('mp-dragging');
    };

    const onLeave = () => {
      glance.release();
      ptr.present = false;
      hoverSlot = -1;
    };

    // No wheel/scroll handler: scroll just passes through the section —
    // the plane is a still canvas, not a scroll-driven flythrough.

    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (t?.classList?.contains('mp-card')) focusSlot = pool.indexOf(t);
    };
    const onFocusOut = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (t === pool[focusSlot]) focusSlot = -1;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft': case 'a': case 'A': keysDown.add('left'); e.preventDefault(); break;
        case 'ArrowRight': case 'd': case 'D': keysDown.add('right'); e.preventDefault(); break;
        case 'ArrowUp': case 'w': case 'W': keysDown.add('up'); e.preventDefault(); break;
        case 'ArrowDown': case 's': case 'S': keysDown.add('down'); e.preventDefault(); break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft': case 'a': case 'A': keysDown.delete('left'); break;
        case 'ArrowRight': case 'd': case 'D': keysDown.delete('right'); break;
        case 'ArrowUp': case 'w': case 'W': keysDown.delete('up'); break;
        case 'ArrowDown': case 's': case 'S': keysDown.delete('down'); break;
      }
    };

    function recenter() {
      // Just reset the wander offset — no scroll to undo anymore.
      dragX = 0;
      dragY = 0;
      setRecenterFlash(true);
      window.setTimeout(() => setRecenterFlash(false), 500);
    }
    recenterRef.current = recenter;

    function activate(slot: number) {
      // Original cards had no click target; keep it a quiet focus + lift so the
      // spatial illusion isn't broken. Wire a destination here when mentors link out.
      const el = pool[slot];
      if (el) {
        focusSlot = slot;
        el.focus?.();
      }
    }

    scene.addEventListener('pointerdown', onDown);
    scene.addEventListener('pointermove', onMove);
    scene.addEventListener('pointerup', onUp);
    scene.addEventListener('pointercancel', onUp);
    scene.addEventListener('pointerleave', onLeave);
    scene.addEventListener('keydown', onKeyDown);
    scene.addEventListener('keyup', onKeyUp);
    scene.addEventListener('focusin', onFocusIn);
    scene.addEventListener('focusout', onFocusOut);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!running) {
        running = true;
        if (inView) raf = requestAnimationFrame(renderFrame);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    const onResize = () => { glance.release(); };
    window.addEventListener('resize', onResize);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      scene.removeEventListener('pointerdown', onDown);
      scene.removeEventListener('pointermove', onMove);
      scene.removeEventListener('pointerup', onUp);
      scene.removeEventListener('pointercancel', onUp);
      scene.removeEventListener('pointerleave', onLeave);
      scene.removeEventListener('keydown', onKeyDown);
      scene.removeEventListener('keyup', onKeyUp);
      scene.removeEventListener('focusin', onFocusIn);
      scene.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      io.disconnect();
    };
  }, [mentors, lowPower]);

  const doRecenter = () => recenterRef.current();

  return (
    <div className="mp-stage">
      <div className="mp-sticky">
        {(kicker || title) && (
          <div className="mp-stage-head">
            {kicker && <p className="mp-stage-kicker">{kicker}</p>}
            {title && <h2 className="mp-stage-title">{title}</h2>}
          </div>
        )}
        <div
          className={`mp-scene${lowPower ? ' mp-lowpower' : ''}`}
          ref={sceneRef}
          role="region"
          aria-label="Mentor field — scroll through, drag to look around, or use arrow keys"
          tabIndex={0}
        >
          <div className="mp-world" ref={worldRef}>
            {Array.from({ length: POOL_SIZE }, (_, k) => (
              <article
                className="mp-card"
                key={k}
                ref={(el) => { if (el) poolRef.current[k] = el; }}
                tabIndex={0}
              >
                <img
                  ref={(el) => { if (el) imgRef.current[k] = el; }}
                  src=""
                  alt=""
                  loading="lazy"
                  width="270"
                  height="340"
                />
                <div className="mp-cap">
                  <span className="mp-cat" ref={(el) => { if (el) capRef.current[k] = el; }} />
                  <span className="mp-name" ref={(el) => { if (el) nameRef.current[k] = el; }} />
                </div>
              </article>
            ))}
          </div>

          {/* Accessible, static content for screen readers — the visual pool mutates,
              so the real mentor list lives here in a stable, semantic list. */}
          <ul className="mp-sr">
            {mentors.map((m) => (
              <li key={m.name}>{m.cat} — {m.name}</li>
            ))}
          </ul>

          <button type="button" className="mp-recenter" onClick={doRecenter} aria-label="Recenter the mentor field">
            ⟲
          </button>
          <div className={`mp-hint${recenterFlash ? ' mp-hint-on' : ''}`}>Recentered</div>
          <div className="mp-instructions">
            Drag to explore
          </div>
        </div>
      </div>
    </div>
  );
}
