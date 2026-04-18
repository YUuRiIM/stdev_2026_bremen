'use client';

import {
  motion,
  animate,
  useAnimation,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

export interface CharacterLayer {
  name: string;
  role: string;
  group?: string;
  z: number;
  src: string;
  bbox: { left: number; top: number; right: number; bottom: number };
  /** Optional side for split eye layers. Present on eyewhite/eyelash/irides
   * after extract_psd.py's split pass. */
  side?: "l" | "r";
  /** Radians, principal-axis angle of the eye silhouette. Only present on
   * side-split eye layers. */
  tilt?: number;
  /** Canvas pixels the upper eyelash should translate downward at full blink. */
  blink_drop_px?: number;
}

export interface CharacterManifest {
  id: string;
  width: number;
  height: number;
  layers: CharacterLayer[];
}

export interface CharacterProps {
  manifest: CharacterManifest;
  assetBase: string;
  width?: number | string;
  className?: string;
  style?: CSSProperties;
  eyeTrackRadius?: { x: number; y: number };
  /** Pointer-distance gate for eye tracking, in character-widths from center.
   *  `full`: eyes fully track inside this radius. `fade`: eyes linearly return
   *  to center between `full` and `full + fade`. Beyond, eyes rest (look forward). */
  eyeTrackingRange?: { full: number; fade: number };
  idleEnabled?: boolean;
  onReact?: () => void;
}

const EYE_ROLES = new Set([
  "eyewhite",
  "eyelash",
  "eyelash_upper",
  "eyelash_lower",
  "eyelid_closed",
  "irides",
]);
const HEAD_ROLES = new Set([
  "back hair",
  "front hair",
  "face",
  "ears",
  "earwear",
  "headwear",
  "eyebrow",
  "eyelash",
  "eyelash_upper",
  "eyelash_lower",
  "eyelid_closed",
  "eyewhite",
  "eyewear",
  "nose",
  "mouth",
  "irides",
]);
const BODY_ROLES = new Set(["neck", "topwear", "bottomwear", "legwear", "footwear", "objects"]);
const ARM_ROLES = new Set(["handwear"]);
const CHEST_ROLES = new Set([
  "chest", "chest_l", "chest_r",
  "chest_l_r1_in", "chest_l_r1_out", "chest_l_r2_in", "chest_l_r2_out",
  "chest_l_r3_in", "chest_l_r3_out", "chest_l_r4_in", "chest_l_r4_out",
  "chest_r_r1_in", "chest_r_r1_out", "chest_r_r2_in", "chest_r_r2_out",
  "chest_r_r3_in", "chest_r_r3_out", "chest_r_r4_in", "chest_r_r4_out",
]);

const FAST = { stiffness: 170, damping: 9.0, mass: 1.5 };
const MAIN = { stiffness: 110, damping: 7.5, mass: 1.8 };
const EDGE = { stiffness: 210, damping: 11,  mass: 1.0 };

const PIECE_CFG: Record<
  string,
  { delay: number; K: number; touch: number; touchY: number; spring: { stiffness: number; damping: number; mass: number } }
> = {
  chest_l_r1_out:  { delay: 0,  K: 0.0030, touch: 0.10, touchY: -0.7, spring: EDGE },
  chest_l_r1_in:   { delay: 6,  K: 0.0028, touch: 0.09, touchY: -0.7, spring: EDGE },
  chest_l_r2_out:  { delay: 0,  K: 0.0085, touch: 0.38, touchY: 5.0,  spring: MAIN },
  chest_l_r2_in:   { delay: 8,  K: 0.0068, touch: 0.29, touchY: 4.0,  spring: MAIN },
  chest_l_r3_out:  { delay: 12, K: 0.0078, touch: 0.35, touchY: 4.6,  spring: MAIN },
  chest_l_r3_in:   { delay: 18, K: 0.0062, touch: 0.26, touchY: 3.4,  spring: MAIN },
  chest_l_r4_out:  { delay: 26, K: 0.0045, touch: 0.16, touchY: 2.3,  spring: FAST },
  chest_l_r4_in:   { delay: 32, K: 0.0036, touch: 0.12, touchY: 1.7,  spring: FAST },
  chest_r_r1_out:  { delay: 40, K: 0.0030, touch: 0.10, touchY: -0.7, spring: EDGE },
  chest_r_r1_in:   { delay: 46, K: 0.0028, touch: 0.09, touchY: -0.7, spring: EDGE },
  chest_r_r2_out:  { delay: 40, K: 0.0085, touch: 0.38, touchY: 5.0,  spring: MAIN },
  chest_r_r2_in:   { delay: 48, K: 0.0068, touch: 0.29, touchY: 4.0,  spring: MAIN },
  chest_r_r3_out:  { delay: 52, K: 0.0078, touch: 0.35, touchY: 4.6,  spring: MAIN },
  chest_r_r3_in:   { delay: 58, K: 0.0062, touch: 0.26, touchY: 3.4,  spring: MAIN },
  chest_r_r4_out:  { delay: 66, K: 0.0045, touch: 0.16, touchY: 2.3,  spring: FAST },
  chest_r_r4_in:   { delay: 72, K: 0.0036, touch: 0.12, touchY: 1.7,  spring: FAST },
};
const PIECE_IDS = Object.keys(PIECE_CFG);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface Pivot {
  x: number;
  y: number;
}

function computePivots(manifest: CharacterManifest) {
  const by: Record<string, CharacterLayer["bbox"]> = {};
  for (const l of manifest.layers) by[l.role] = l.bbox;
  const cx = manifest.width / 2;
  const canvasH = manifest.height;
  const neck = by.neck;
  const top = by.topwear;
  const ir = by.irides;
  const tH = top ? top.bottom - top.top : 0;
  const tW = top ? top.right - top.left : 0;
  const tLeft = top ? top.left : cx - 80;
  const tTop = top ? top.top : canvasH * 0.32;
  const piecePivot = (x0: number, y0: number, x1: number, y1: number): Pivot => ({
    x: tLeft + tW * ((x0 + x1) / 2),
    y: tTop + tH * ((y0 + y1) / 2),
  });
  return {
    head: { x: cx, y: neck ? neck.top + (neck.bottom - neck.top) * 0.05 : canvasH * 0.48 },
    arm: { x: cx, y: top ? top.top + tH * 0.04 : canvasH * 0.46 },
    body: { x: cx, y: canvasH },
    eye: ir
      ? { x: (ir.left + ir.right) / 2, y: (ir.top + ir.bottom) / 2 }
      : { x: cx, y: canvasH * 0.33 },
    chest_l_r1_out:  piecePivot(0.02, 0.26, 0.22, 0.38),
    chest_l_r1_in:   piecePivot(0.18, 0.26, 0.38, 0.38),
    chest_l_r2_out:  piecePivot(0.00, 0.34, 0.22, 0.48),
    chest_l_r2_in:   piecePivot(0.18, 0.34, 0.38, 0.48),
    chest_l_r3_out:  piecePivot(0.02, 0.46, 0.24, 0.58),
    chest_l_r3_in:   piecePivot(0.20, 0.46, 0.38, 0.58),
    chest_l_r4_out:  piecePivot(0.06, 0.54, 0.26, 0.66),
    chest_l_r4_in:   piecePivot(0.22, 0.54, 0.38, 0.66),
    chest_r_r1_in:   piecePivot(0.62, 0.26, 0.82, 0.38),
    chest_r_r1_out:  piecePivot(0.78, 0.26, 0.98, 0.38),
    chest_r_r2_in:   piecePivot(0.62, 0.34, 0.82, 0.48),
    chest_r_r2_out:  piecePivot(0.78, 0.34, 1.00, 0.48),
    chest_r_r3_in:   piecePivot(0.62, 0.46, 0.80, 0.58),
    chest_r_r3_out:  piecePivot(0.76, 0.46, 0.98, 0.58),
    chest_r_r4_in:   piecePivot(0.62, 0.54, 0.78, 0.66),
    chest_r_r4_out:  piecePivot(0.74, 0.54, 0.94, 0.66),
  };
}

function pctOrigin(pivot: Pivot, manifest: CharacterManifest) {
  return `${(pivot.x / manifest.width) * 100}% ${(pivot.y / manifest.height) * 100}%`;
}

function layerStyle(layer: CharacterLayer, manifest: CharacterManifest): CSSProperties {
  const { bbox } = layer;
  const w = bbox.right - bbox.left;
  const h = bbox.bottom - bbox.top;
  return {
    position: "absolute",
    left: `${(bbox.left / manifest.width) * 100}%`,
    top: `${(bbox.top / manifest.height) * 100}%`,
    width: `${(w / manifest.width) * 100}%`,
    height: `${(h / manifest.height) * 100}%`,
    pointerEvents: "none",
    userSelect: "none",
    WebkitUserDrag: "none",
  } as CSSProperties;
}

type ChestScales = Record<
  string,
  { scaleX: MotionValue<number>; scaleY: MotionValue<number>; y: MotionValue<number> }
>;
type ChestImpulses = Record<string, MotionValue<number>>;

function useChestSprings(
  bodyY: MotionValue<number>,
): { scales: ChestScales; impulses: ChestImpulses; yImpulses: ChestImpulses } {
  const bodyV = useVelocity(bodyY);

  const impulses: Record<string, MotionValue<number>> = {};
  const springs: Record<string, MotionValue<number>> = {};
  const yImpulses: Record<string, MotionValue<number>> = {};
  const ySprings: Record<string, MotionValue<number>> = {};
  for (const id of PIECE_IDS) {
    const imp = useMotionValue(0);
    const cfg = PIECE_CFG[id];
    const s = useSpring(imp, { ...cfg.spring, restSpeed: 0.0002 });
    const yImp = useMotionValue(0);
    const yS = useSpring(yImp, { ...cfg.spring, restSpeed: 0.0002 });
    impulses[id] = imp;
    springs[id] = s;
    yImpulses[id] = yImp;
    ySprings[id] = yS;
  }

  useEffect(() => {
    const pending = new Set<ReturnType<typeof setTimeout>>();
    const unsubs = PIECE_IDS.map((id) => {
      const cfg = PIECE_CFG[id];
      return bodyV.on("change", (v: number) => {
        const clamped = Math.max(-600, Math.min(600, v));
        const target = clamped * cfg.K;
        if (cfg.delay === 0) {
          impulses[id].set(target);
        } else {
          const t = setTimeout(() => {
            impulses[id].set(target);
            pending.delete(t);
          }, cfg.delay);
          pending.add(t);
        }
      });
    });
    return () => {
      unsubs.forEach((u) => u());
      pending.forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyV]);

  const breath = useMotionValue(0);
  useEffect(() => {
    const ctl = animate(breath, [0, 0.012, 0, -0.003, 0], {
      duration: 4.4,
      repeat: Infinity,
      ease: "easeInOut",
      times: [0, 0.45, 0.75, 0.9, 1],
    });
    return () => ctl.stop();
  }, [breath]);

  const scales: ChestScales = {};
  for (const id of PIECE_IDS) {
    scales[id] = {
      scaleY: useTransform([springs[id], breath] as const, ([p, b]: number[]) => 1 + p + b),
      scaleX: useTransform([springs[id], breath] as const, ([p, b]: number[]) => 1 - p * 0.35 + b * 0.3),
      y: ySprings[id],
    };
  }
  return { scales, impulses, yImpulses };
}

export function Character({
  manifest,
  assetBase,
  width = 360,
  className,
  style,
  eyeTrackRadius = { x: 4.2, y: 1.2 },
  eyeTrackingRange = { full: 1.0, fade: 0.8 },
  idleEnabled = true,
  onReact,
}: CharacterProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.32;
      const dx = (e.clientX - cx) / (r.width / 2);
      const dy = (e.clientY - cy) / (r.height / 2);
      const dist = Math.hypot(dx, dy);
      // Proximity gate: 1 inside `full` radius, fades to 0 across `fade` width.
      const { full, fade } = eyeTrackingRange;
      const gate = Math.max(0, Math.min(1, (full + fade - dist) / fade));
      mx.set(Math.max(-1, Math.min(1, dx)) * gate);
      my.set(Math.max(-1, Math.min(1, dy)) * gate);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my, eyeTrackingRange]);

  const eyeX = useSpring(useTransform(mx, [-1, 1], [-eyeTrackRadius.x, eyeTrackRadius.x]), {
    stiffness: 240,
    damping: 24,
    mass: 0.4,
  });
  const eyeY = useSpring(useTransform(my, [-1, 1], [-eyeTrackRadius.y, eyeTrackRadius.y]), {
    stiffness: 240,
    damping: 24,
    mass: 0.4,
  });

  // Per-side iris travel limits, expressed as a fraction of the character canvas
  // (matches how bbox percentages resolve inside the render container). The
  // useTransform clamps below re-scale to container px on every frame.
  const irisLimitsFrac = useMemo(() => {
    const out: { l: { x: number; y: number }; r: { x: number; y: number } } = {
      l: { x: 0, y: 0 },
      r: { x: 0, y: 0 },
    };
    for (const side of ["l", "r"] as const) {
      const ew = manifest.layers.find((l) => l.role === "eyewhite" && l.side === side);
      const ir = manifest.layers.find((l) => l.role === "irides" && l.side === side);
      if (!ew || !ir) continue;
      const ewW = ew.bbox.right - ew.bbox.left;
      const ewH = ew.bbox.bottom - ew.bbox.top;
      const irW = ir.bbox.right - ir.bbox.left;
      const irH = ir.bbox.bottom - ir.bbox.top;
      out[side].x = Math.max(0, (ewW - irW) / 2) / manifest.width;
      out[side].y = Math.max(0, (ewH - irH) / 2) / manifest.height;
    }
    return out;
  }, [manifest]);

  const eyeXL = useTransform(() => {
    const el = rootRef.current;
    const raw = eyeX.get();
    const frac = irisLimitsFrac.l.x;
    if (!el || frac <= 0) return 0;
    const lim = frac * el.getBoundingClientRect().width;
    return Math.max(-lim, Math.min(lim, raw));
  });
  const eyeXR = useTransform(() => {
    const el = rootRef.current;
    const raw = eyeX.get();
    const frac = irisLimitsFrac.r.x;
    if (!el || frac <= 0) return 0;
    const lim = frac * el.getBoundingClientRect().width;
    return Math.max(-lim, Math.min(lim, raw));
  });
  const eyeYL = useTransform(() => {
    const el = rootRef.current;
    const raw = eyeY.get();
    const frac = irisLimitsFrac.l.y;
    if (!el || frac <= 0) return 0;
    const lim = frac * el.getBoundingClientRect().height;
    return Math.max(-lim, Math.min(lim, raw));
  });
  const eyeYR = useTransform(() => {
    const el = rootRef.current;
    const raw = eyeY.get();
    const frac = irisLimitsFrac.r.y;
    if (!el || frac <= 0) return 0;
    const lim = frac * el.getBoundingClientRect().height;
    return Math.max(-lim, Math.min(lim, raw));
  });

  const bodyY = useMotionValue(0);
  const { scales: chestScales, impulses: chestImpulses, yImpulses: chestYImpulses } = useChestSprings(bodyY);

  const rootCtl = useAnimation();
  const armCtl = useAnimation();
  const headCtl = useAnimation();

  // Blink is now a 0..1 progress motion value; each eye-layer role derives its
  // own motion from it (scaleY for eyewhite/iris, y for upper eyelash, opacity
  // for the generated eyelid_closed overlay).
  const blinkT = useMotionValue(0);
  const eyeScaleY = useTransform(blinkT, [0, 1], [1, 0.12]);
  // Everything behind the closing lid (iris + eyewhite + the untranslated upper
  // lash) fades out quickly so the closed state is carried solely by
  // eyelid_closed sliding down.
  const eyeOpacity = useTransform(blinkT, [0, 0.15, 0.4], [1, 1, 0]);
  const upperLashOpacity = useTransform(blinkT, [0, 0.15, 0.4], [1, 1, 0]);
  const eyelidOpacity = useTransform(blinkT, [0, 0.1, 0.5], [0, 0.2, 1]);
  const upperDrops = useMemo(() => {
    const m: { l: number; r: number } = { l: 0, r: 0 };
    for (const l of manifest.layers) {
      if (l.role === "eyelash_upper" && (l.side === "l" || l.side === "r") && typeof l.blink_drop_px === "number") {
        m[l.side] = l.blink_drop_px;
      }
    }
    return m;
  }, [manifest]);
  const LID_DROP_SCALE = 0.55;
  const lidYL = useTransform(blinkT, (v) => v * upperDrops.l * LID_DROP_SCALE);
  const lidYR = useTransform(blinkT, (v) => v * upperDrops.r * LID_DROP_SCALE);

  const reactingRef = useRef(false);
  const breathingRef = useRef<ReturnType<typeof animate> | null>(null);

  const runBreathing = useCallback(() => {
    if (breathingRef.current) breathingRef.current.stop();
    // Deeper, slightly slower breath — bigger amplitude with asymmetric inhale/exhale
    // (inhale rises quickly, exhale settles longer) reads as a real breath cycle.
    breathingRef.current = animate(bodyY, [0, -2, -7.5, -5, 0], {
      duration: 5.2,
      repeat: Infinity,
      ease: "easeInOut",
      times: [0, 0.28, 0.5, 0.72, 1],
    });
    armCtl.start({
      rotate: [0, -0.2, 0.15, -0.1, 0],
      transition: { duration: 5.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 },
    });
  }, [armCtl, bodyY]);

  useEffect(() => {
    runBreathing();
    return () => {
      if (breathingRef.current) breathingRef.current.stop();
    };
  }, [runBreathing]);

  useEffect(() => {
    if (!idleEnabled) return;
    let cancelled = false;
    const loop = async () => {
      while (!cancelled) {
        await sleep(2400 + Math.random() * 3600);
        if (cancelled || reactingRef.current) continue;
        const pick = Math.random();
        if (pick < 0.55) {
          await animate(blinkT, [0, 1, 0], {
            duration: 0.18,
            times: [0, 0.5, 1],
            ease: [0.76, 0, 0.24, 1],
          });
        } else if (pick < 0.85) {
          await animate(blinkT, [0, 1, 0, 1, 0], {
            duration: 0.48,
            times: [0, 0.22, 0.5, 0.72, 1],
          });
        } else {
          await animate(blinkT, [0, 1, 1, 0], {
            duration: 0.7,
            times: [0, 0.2, 0.7, 1],
            ease: "easeInOut",
          });
        }
      }
    };
    loop();
    return () => {
      cancelled = true;
    };
  }, [idleEnabled, headCtl, blinkT]);

  const twitch = useCallback(async () => {
    if (reactingRef.current) return;
    reactingRef.current = true;
    onReact?.();

    if (breathingRef.current) breathingRef.current.stop();
    armCtl.stop();
    headCtl.stop();

    const ease: [number, number, number, number] = [0.34, 1.2, 0.64, 1];
    const dur = 0.9;

    const chestPs: ReturnType<typeof animate>[] = [];
    for (const id of PIECE_IDS) {
      const cfg = PIECE_CFG[id];
      const mv = chestImpulses[id];
      const ymv = chestYImpulses[id];
      const a = cfg.touch;
      const ay = cfg.touchY || 0;
      chestPs.push(
        animate(mv, [mv.get(), a, -a * 0.2, a * 0.06, 0], {
          duration: 0.5,
          ease: "easeOut",
          delay: cfg.delay / 1000,
          times: [0, 0.2, 0.52, 0.78, 1],
        }),
        animate(ymv, [ymv.get(), ay, -ay * 0.25, 0], {
          duration: 0.5,
          ease: "easeOut",
          delay: cfg.delay / 1000,
          times: [0, 0.22, 0.6, 1],
        }),
      );
    }

    await Promise.all([
      animate(bodyY, [bodyY.get(), -3, 1, -0.5, 0.2, 0], {
        duration: dur,
        ease,
        times: [0, 0.18, 0.42, 0.62, 0.82, 1],
      }),
      // Head stays still on touch — only chest + body bounce + blink.
      headCtl.start({ rotate: 0, transition: { duration: 0.0 } }),
      armCtl.start({
        rotate: [0, -0.2, 0.15, -0.1, 0.05, 0],
        transition: { duration: dur, ease, times: [0, 0.2, 0.45, 0.68, 0.88, 1] },
      }),
      animate(blinkT, [0, 0.6, 0], {
        duration: 0.28,
        times: [0, 0.4, 1],
      }),
      rootCtl.start({
        scale: [1, 0.994, 1.002, 1],
        transition: { duration: 0.45, ease: "easeOut", times: [0, 0.24, 0.6, 1] },
      }),
      ...chestPs,
    ]);
    reactingRef.current = false;
    runBreathing();
  }, [rootCtl, armCtl, headCtl, blinkT, bodyY, runBreathing, onReact, chestImpulses]);

  const pivots = useMemo(() => computePivots(manifest), [manifest]);

  const { outsideHead, headLayers, headStartZ } = useMemo(() => {
    const sorted = [...manifest.layers].sort((a, b) => a.z - b.z);
    const bodyOnlyZs = sorted
      .filter((l) => BODY_ROLES.has(l.role) || CHEST_ROLES.has(l.role))
      .map((l) => l.z);
    const maxBodyZ = bodyOnlyZs.length ? Math.max(...bodyOnlyZs) : -1;
    const outside: CharacterLayer[] = [];
    const inside: CharacterLayer[] = [];
    for (const l of sorted) {
      const isHead = HEAD_ROLES.has(l.role);
      if (isHead && l.z > maxBodyZ) inside.push(l);
      else outside.push(l);
    }
    const startZ = inside.length ? Math.min(...inside.map((l) => l.z)) : maxBodyZ + 1;
    return { outsideHead: outside, headLayers: inside, headStartZ: startZ };
  }, [manifest.layers]);

  type Node =
    | { kind: "layer"; layer: CharacterLayer }
    | {
        kind: "eye";
        z: number;
        key: string;
        layers: CharacterLayer[];
        pivot: Pivot;
        tiltDeg: number;
      };

  const insideNodes = useMemo<Node[]>(() => {
    const nodes: Node[] = [];
    let eyeRun: { layers: CharacterLayer[]; zMax: number } | null = null;

    const flush = () => {
      if (!eyeRun) return;
      const run = eyeRun;
      eyeRun = null;
      // If layers carry `side`, split by side so each eye rotates around its own pivot.
      const bySide: Record<string, CharacterLayer[]> = {};
      const legacy: CharacterLayer[] = [];
      for (const l of run.layers) {
        if (l.side === "l" || l.side === "r") {
          (bySide[l.side] ||= []).push(l);
        } else {
          legacy.push(l);
        }
      }
      const emitGroup = (layers: CharacterLayer[], keySuffix: string) => {
        if (!layers.length) return;
        // Pivot: prefer eyewhite bbox center, fallback to irides, fallback to eyelash.
        const prefs = ["eyewhite", "irides", "eyelash_upper", "eyelash", "eyelash_lower", "eyelid_closed"];
        let pivotLayer: CharacterLayer | undefined;
        for (const role of prefs) {
          pivotLayer = layers.find((l) => l.role === role);
          if (pivotLayer) break;
        }
        const bb = (pivotLayer ?? layers[0]).bbox;
        const pivot: Pivot = { x: (bb.left + bb.right) / 2, y: (bb.top + bb.bottom) / 2 };
        const tilt = layers.find((l) => typeof l.tilt === "number")?.tilt ?? 0;
        const zMax = layers.reduce((m, l) => Math.max(m, l.z), layers[0].z);
        nodes.push({
          kind: "eye",
          z: zMax,
          key: `eye-${keySuffix}-${zMax}`,
          layers,
          pivot,
          tiltDeg: (tilt * 180) / Math.PI,
        });
      };
      if (legacy.length) emitGroup(legacy, "all");
      if (bySide.l) emitGroup(bySide.l, "l");
      if (bySide.r) emitGroup(bySide.r, "r");
    };

    for (const l of headLayers) {
      if (EYE_ROLES.has(l.role)) {
        if (!eyeRun) eyeRun = { layers: [], zMax: l.z };
        eyeRun.layers.push(l);
        eyeRun.zMax = Math.max(eyeRun.zMax, l.z);
      } else {
        flush();
        nodes.push({ kind: "layer", layer: l });
      }
    }
    flush();
    return nodes;
  }, [headLayers]);

  const containerStyle: CSSProperties = {
    position: "relative",
    width,
    aspectRatio: `${manifest.width} / ${manifest.height}`,
    userSelect: "none",
    touchAction: "manipulation",
    cursor: "pointer",
    ...style,
  };

  const wrapperFill: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    willChange: "transform",
  };

  const headOrigin = pctOrigin(pivots.head, manifest);
  const armOrigin = pctOrigin(pivots.arm, manifest);
  const bodyOrigin = pctOrigin(pivots.body, manifest);

  const renderPlain = (layer: CharacterLayer, prefix = "layer") => (
    <img
      key={`${prefix}-${layer.z}`}
      src={`${assetBase}/${layer.src}`}
      draggable={false}
      style={{ ...layerStyle(layer, manifest), zIndex: layer.z }}
      alt=""
    />
  );

  const renderOutside = (layer: CharacterLayer) => {
    if (ARM_ROLES.has(layer.role)) {
      return (
        <motion.div
          key={`arm-${layer.z}`}
          style={{ ...wrapperFill, transformOrigin: armOrigin, zIndex: layer.z }}
          animate={armCtl}
        >
          <img src={`${assetBase}/${layer.src}`} draggable={false} style={layerStyle(layer, manifest)} alt="" />
        </motion.div>
      );
    }
    if (chestScales[layer.role]) {
      const pivotKey = layer.role as keyof typeof pivots;
      const origin = pctOrigin((pivots[pivotKey] ?? pivots.body) as Pivot, manifest);
      const { scaleX, scaleY, y } = chestScales[layer.role];
      return (
        <motion.div
          key={`${layer.role}-${layer.z}`}
          style={{
            ...wrapperFill,
            transformOrigin: origin,
            zIndex: layer.z,
            scaleY,
            scaleX,
            y,
          }}
        >
          <img src={`${assetBase}/${layer.src}`} draggable={false} style={layerStyle(layer, manifest)} alt="" />
        </motion.div>
      );
    }
    if (layer.role === "chest" || layer.role === "chest_l") {
      const { scaleX, scaleY } = (chestScales as Record<string, ChestScales[string]>).chest_l_mid;
      const origin = pctOrigin((pivots as Record<string, Pivot>).chest_l_mid, manifest);
      return (
        <motion.div
          key={`chest-legacy-${layer.z}`}
          style={{ ...wrapperFill, transformOrigin: origin, zIndex: layer.z, scaleY, scaleX }}
        >
          <img src={`${assetBase}/${layer.src}`} draggable={false} style={layerStyle(layer, manifest)} alt="" />
        </motion.div>
      );
    }
    if (layer.role === "chest_r") {
      const { scaleX, scaleY } = (chestScales as Record<string, ChestScales[string]>).chest_r_mid;
      const origin = pctOrigin((pivots as Record<string, Pivot>).chest_r_mid, manifest);
      return (
        <motion.div
          key={`chest-legacy-${layer.z}`}
          style={{ ...wrapperFill, transformOrigin: origin, zIndex: layer.z, scaleY, scaleX }}
        >
          <img src={`${assetBase}/${layer.src}`} draggable={false} style={layerStyle(layer, manifest)} alt="" />
        </motion.div>
      );
    }
    return renderPlain(layer, "outside");
  };

  const renderEyeGroup = (group: Extract<Node, { kind: "eye" }>) => {
    const origin = pctOrigin(group.pivot, manifest);
    // Each role animates differently: eyewhite/iris/legacy-eyelash scale Y toward
    // the eye center; eyelash_upper slides down by its precomputed drop_px;
    // eyelid_closed fades in from the auto-generated arc overlay; eyelash_lower
    // stays put.
    return (
      <div key={group.key} style={{ ...wrapperFill, zIndex: group.z }}>
        {group.layers.map((l) => {
          const base = layerStyle(l, manifest);
          const keyBase = `${l.role}-${l.side ?? ""}-${l.z}`;
          const role = l.role;
          if (role === "eyewhite" || role === "eyelash") {
            return (
              <motion.div
                key={keyBase}
                style={{
                  ...wrapperFill,
                  transformOrigin: origin,
                  scaleY: eyeScaleY,
                  opacity: eyeOpacity,
                  zIndex: l.z,
                }}
              >
                <img src={`${assetBase}/${l.src}`} draggable={false} style={base} alt="" />
              </motion.div>
            );
          }
          if (role === "irides") {
            const ix = l.side === "r" ? eyeXR : l.side === "l" ? eyeXL : eyeX;
            const iy = l.side === "r" ? eyeYR : l.side === "l" ? eyeYL : eyeY;
            return (
              <motion.div
                key={keyBase}
                style={{
                  ...wrapperFill,
                  transformOrigin: origin,
                  scaleY: eyeScaleY,
                  opacity: eyeOpacity,
                  zIndex: l.z,
                }}
              >
                <IrisLayer layer={l} manifest={manifest} assetBase={assetBase} x={ix} y={iy} />
              </motion.div>
            );
          }
          if (role === "eyelash_upper") {
            return (
              <motion.div
                key={keyBase}
                style={{ ...wrapperFill, opacity: upperLashOpacity, zIndex: l.z }}
              >
                <img src={`${assetBase}/${l.src}`} draggable={false} style={base} alt="" />
              </motion.div>
            );
          }
          if (role === "eyelid_closed") {
            const yMv = l.side === "r" ? lidYR : lidYL;
            return (
              <motion.img
                key={keyBase}
                src={`${assetBase}/${l.src}`}
                draggable={false}
                style={{ ...base, zIndex: l.z, opacity: eyelidOpacity, y: yMv }}
                alt=""
              />
            );
          }
          // eyelash_lower and any other static eye layer.
          return (
            <img
              key={keyBase}
              src={`${assetBase}/${l.src}`}
              draggable={false}
              style={{ ...base, zIndex: l.z }}
              alt=""
            />
          );
        })}
      </div>
    );
  };

  return (
    <motion.div
      ref={rootRef}
      className={className}
      style={containerStyle}
      animate={rootCtl}
      onPointerDown={twitch}
    >
      <motion.div style={{ ...wrapperFill, transformOrigin: bodyOrigin, y: bodyY }}>
        {outsideHead.map(renderOutside)}
        <motion.div
          style={{ ...wrapperFill, transformOrigin: headOrigin, zIndex: headStartZ }}
          animate={headCtl}
        >
          {insideNodes.map((n) => (n.kind === "eye" ? renderEyeGroup(n) : renderPlain(n.layer, "head")))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function IrisLayer({
  layer,
  manifest,
  assetBase,
  x,
  y,
}: {
  layer: CharacterLayer;
  manifest: CharacterManifest;
  assetBase: string;
  x: MotionValue<number>;
  y: MotionValue<number>;
}) {
  return (
    <motion.img
      src={`${assetBase}/${layer.src}`}
      draggable={false}
      style={{ ...layerStyle(layer, manifest), zIndex: layer.z, x, y }}
      alt=""
    />
  );
}

export async function loadManifest(url: string): Promise<CharacterManifest> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`manifest load failed: ${res.status}`);
  return (await res.json()) as CharacterManifest;
}

export function useManifest(url: string) {
  const [manifest, setManifest] = useState<CharacterManifest | null>(null);
  useEffect(() => {
    let alive = true;
    loadManifest(url)
      .then((m) => {
        if (alive) setManifest(m);
      })
      .catch((err) => {
        console.error(`[Character] useManifest(${url}) failed:`, err);
      });
    return () => {
      alive = false;
    };
  }, [url]);
  return manifest;
}
