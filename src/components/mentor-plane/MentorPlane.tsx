import { useEffect, useRef, useState } from 'react';
import { TUNING, POOL_SIZE } from './constants';
import { Camera, Glance } from './camera';
import { cellLayout, mentorIndex, keyOf } from './layout';

interface Mentor {
  cat: string;
  name: string;
  img: string;
}

interface Props {
  mentors: Mentor[];
  kicker?: string;
  title?: string;
}

const T = TUNING;

function prefersReduced() {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

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
 * The wrapper decides a reduced-motion fallback vs. the live experience so the
 * two never mix their hook counts.
 */
export default function MentorPlane({ mentors, kicker, title }: Props) {
  const [reduced] = useState(prefersReduced);
  if (reduced) return <MentorPlaneFallback mentors={mentors} />;
  return <MentorPlaneLive mentors={mentors} kicker={kicker} title={title} />;
}

/** Non-parallax fallback: the original static mosaic. */
function MentorPlaneFallback({ mentors }: Props) {
  return (
    <div className="mp-fallback">
      <div className="m-grid">
        {mentors.map((m) => (
          <figure className="m-tile" key={m.name}>
            <img src={m.img} alt={`${m.name} — ${m.cat}`} loading="lazy" width="600" height="600" />
            <figcaption className="m-overlay">
              <span className="m-cat">{m.cat}</span>
              <span className="m-name">{m.name}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
function MentorPlaneLive({ mentors, kicker, title }: Props) {
  const [lowPower] = useState(isLowPower);
  const [recenterFlash, setRecenterFlash] = useState(false);

  const sceneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<HTMLDivElement[]>([]);
  const imgRef = useRef<HTMLImageElement[]>([]);
  const capRef = useRef<HTMLSpanElement[]>([]);
  const nameRef = useRef<HTMLSpanElement[]>([]);
  const recenterRef = useRef<() => void>(() => {});

  useEffect(() => {
    const stage = stageRef.current!;
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

    // Scroll drives the camera; drag is a peek offset on top that eases back.
    let progress = 0;       // 0..1 through the stage
    let dragX = 0, dragY = 0;

    let raf = 0;
    let running = true;
    let inView = true; // IntersectionObserver gates the rAF loop — wakes on scroll-in
    const keysDown = new Set<string>();

    const dim = () => ({ vw: scene.clientWidth, vh: scene.clientHeight });

    // Scroll progress through the tall stage: 0 when the stage top hits the
    // viewport top, 1 when the stage bottom hits the viewport bottom. While the
    // sticky inner viewport is pinned, this is the only value that changes —
    // and it's what flies the camera through the plane.
    const readProgress = () => {
      const r = stage.getBoundingClientRect();
      const span = stage.offsetHeight - window.innerHeight;
      progress = span > 0 ? Math.max(0, Math.min(1, -r.top / span)) : 0;
    };

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
      if (!running || !inView) return;
      glance.step(T.GLANCE_DAMP);

      // Drag / keys commit a persistent offset on top of the scroll path — so
      // you can actually wander through the field, not just peek. Scroll still
      // carries you in and out (it's never hijacked); this layers on top.
      if (keysDown.size) {
        if (keysDown.has('left')) dragX -= T.DRAG_STEP;
        if (keysDown.has('right')) dragX += T.DRAG_STEP;
        if (keysDown.has('up')) dragY -= T.DRAG_STEP;
        if (keysDown.has('down')) dragY += T.DRAG_STEP;
      }
      dragX = Math.max(-T.DRAG_MAX, Math.min(T.DRAG_MAX, dragX));
      dragY = Math.max(-T.DRAG_MAX, Math.min(T.DRAG_MAX, dragY));

      // Camera follows a gentle path through the plane driven by scroll
      // progress, plus the committed drag/keys offset.
      const pathX = startX + progress * T.SCROLL_TRAVEL_X;
      const pathY = startY + progress * T.SCROLL_TRAVEL_Y
        + Math.sin(progress * Math.PI) * T.SCROLL_SWAY;
      camera.setTarget(pathX + dragX, pathY + dragY);
      camera.step(T.CAMERA_FRICTION, T.MAX_VELOCITY, T.SCROLL_DAMP);

      const { vw, vh } = dim();
      world.style.transform =
        `translate3d(${glance.x.toFixed(2)}px, ${glance.y.toFixed(2)}px, 0px)` +
        ` rotateX(${glance.rx.toFixed(3)}deg) rotateY(${glance.ry.toFixed(3)}deg)`;

      const margin = T.CELL * T.MARGIN_CELLS;
      const iMin = Math.floor((camera.x - vw / 2 - margin) / T.CELL);
      const iMax = Math.ceil((camera.x + vw / 2 + margin) / T.CELL);
      const jMin = Math.floor((camera.y - vh / 2 - margin) / T.CELL);
      const jMax = Math.ceil((camera.y + vh / 2 + margin) / T.CELL);

      const visible: { i: number; j: number; key: string }[] = [];
      for (let j = jMin; j <= jMax; j++) {
        for (let i = iMin; i <= iMax; i++) {
          visible.push({ i, j, key: keyOf(i, j) });
        }
      }
      syncSlots(visible);

      const half = Math.max(vw, vh) / 2;
      const anyEmphasis = hoverSlot !== -1 || focusSlot !== -1;

      for (const v of visible) {
        const slot = slots.get(v.key);
        if (slot === undefined) continue;
        const L = cellLayout(v.i, v.j, T.CELL, T.JITTER, T.SIZE_VAR, T.DEPTH_VAR);
        const sx = L.px - camera.x + vw / 2;
        const sy = L.py - camera.y + vh / 2;
        const dx = sx - vw / 2;
        const dy = sy - vh / 2;
        const nd = Math.min(1, Math.hypot(dx, dy) / half) * T.CENTER_EMPHASIS;

        let z = -T.DEPTH * nd * nd * (0.7 + L.depth * 0.6);
        let scale = (1 - T.SCALE_FALLOFF * nd) * L.size;
        let rotY = -T.CARD_ROT * nd * (dx / half);
        let rotX = T.CARD_ROT * nd * (dy / half);
        let op = Math.max(T.OPACITY_MIN, 1 - T.OPACITY_FALLOFF * nd * nd);
        let blur = 0;

        const isEmph = slot === hoverSlot || slot === focusSlot;
        if (isEmph) {
          z -= T.HOVER_LIFT;
          scale *= T.HOVER_SCALE;
          op = 1;
          rotY *= 0.4;
          rotX *= 0.4;
        } else if (anyEmphasis) {
          op *= T.HOVER_DIM;
        }
        if (!lowPower && nd > 0.88 && !isEmph) blur = (nd - 0.88) * 18;

        const w = T.CARD_W * scale;
        const h = T.CARD_H * scale;
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
    // Scroll is NOT captured — the page scrolls naturally through the stage.
    // Touch drags scroll the page; only mouse/pen drags peek around the plane.
    let down: { x: number; y: number; lx: number; ly: number; moved: number } | null = null;
    let dragging = false;

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
      // Glance (parallax) follows any pointer; on touch it tracks the finger
      // subtly while the page scrolls, which reads as life, not a trap.
      glance.setTarget(
        (p.x - vw / 2) / (vw / 2),
        (p.y - vh / 2) / (vh / 2),
        T.GLANCE_YAW, T.GLANCE_PITCH, T.GLANCE_TRANSLATE,
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

    const onLeave = () => glance.release();

    const onOver = (e: PointerEvent) => {
      if (dragging || e.pointerType === 'touch') return;
      const target = (e.target as HTMLElement)?.closest('.mp-card') as HTMLElement | null;
      if (target) hoverSlot = pool.indexOf(target);
    };
    const onOut = (e: PointerEvent) => {
      const target = (e.target as HTMLElement)?.closest('.mp-card') as HTMLElement | null;
      if (target && pool.indexOf(target) === hoverSlot) hoverSlot = -1;
    };

    // No wheel handler: the page scrolls through the stage naturally.
    const onScroll = () => readProgress();

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
        case 'r': case 'R': case 'Home': recenter(); e.preventDefault(); break;
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
      // Scroll the page back to the start of the stage — the camera follows.
      const top = stage.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: 'smooth' });
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
    scene.addEventListener('pointerover', onOver);
    scene.addEventListener('pointerout', onOut);
    scene.addEventListener('keydown', onKeyDown);
    scene.addEventListener('keyup', onKeyUp);
    scene.addEventListener('focusin', onFocusIn);
    scene.addEventListener('focusout', onFocusOut);
    window.addEventListener('scroll', onScroll, { passive: true });
    readProgress();

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
    const onResize = () => { readProgress(); glance.release(); };
    window.addEventListener('resize', onResize);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      scene.removeEventListener('pointerdown', onDown);
      scene.removeEventListener('pointermove', onMove);
      scene.removeEventListener('pointerup', onUp);
      scene.removeEventListener('pointercancel', onUp);
      scene.removeEventListener('pointerleave', onLeave);
      scene.removeEventListener('pointerover', onOver);
      scene.removeEventListener('pointerout', onOut);
      scene.removeEventListener('keydown', onKeyDown);
      scene.removeEventListener('keyup', onKeyUp);
      scene.removeEventListener('focusin', onFocusIn);
      scene.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      io.disconnect();
    };
  }, [mentors, lowPower]);

  const doRecenter = () => recenterRef.current();

  return (
    <div className="mp-stage" ref={stageRef}>
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
                  width="200"
                  height="250"
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
            Scroll to travel · drag to explore · <kbd>R</kbd> to recenter
          </div>
        </div>
      </div>
    </div>
  );
}
