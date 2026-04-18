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

const EYE_ROLES = new Set(["eyewhite", "eyelash", "irides"]);
const HEAD_ROLES = new Set([
  "back hair",
  "front hair",
  "face",
  "ears",
  "earwear",
  "headwear",
  "eyebrow",
  "eyelash",
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

/* eslint-disable react-hooks/rules-of-hooks -- PIECE_IDS is a compile-time constant array, so hook order is stable across renders. */
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
/* eslint-enable react-hooks/rules-of-hooks */

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

  const bodyY = useMotionValue(0);
  const { scales: chestScales, impulses: chestImpulses, yImpulses: chestYImpulses } = useChestSprings(bodyY);

  const rootCtl = useAnimation();
  const armCtl = useAnimation();
  const headCtl = useAnimation();
  const blinkCtl = useAnimation();

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
        // Head rotation removed. Idle variety comes from single/double blinks.
        if (pick < 0.55) {
          await blinkCtl.start({
            scaleY: [1, 0.08, 1],
            transition: { duration: 0.18, times: [0, 0.5, 1], ease: [0.76, 0, 0.24, 1] },
          });
        } else if (pick < 0.85) {
          await blinkCtl.start({
            scaleY: [1, 0.08, 1, 0.08, 1],
            transition: { duration: 0.48, times: [0, 0.22, 0.5, 0.72, 1] },
          });
        } else {
          // Slow "hold-eyes-closed" blink — reads as a sigh or contemplation beat.
          await blinkCtl.start({
            scaleY: [1, 0.08, 0.08, 1],
            transition: { duration: 0.7, times: [0, 0.2, 0.7, 1], ease: "easeInOut" },
          });
        }
      }
    };
    loop();
    return () => {
      cancelled = true;
    };
  }, [idleEnabled, headCtl, blinkCtl]);

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
      headCtl.start({ rotate: 0, transition: { duration: 0.1 } }),
      armCtl.start({
        rotate: [0, -0.2, 0.15, -0.1, 0.05, 0],
        transition: { duration: dur, ease, times: [0, 0.2, 0.45, 0.68, 0.88, 1] },
      }),
      blinkCtl.start({
        scaleY: [1, 0.25, 1],
        transition: { duration: 0.28, times: [0, 0.4, 1] },
      }),
      rootCtl.start({
        scale: [1, 0.994, 1.002, 1],
        transition: { duration: 0.45, ease: "easeOut", times: [0, 0.24, 0.6, 1] },
      }),
      ...chestPs,
    ]);
    reactingRef.current = false;
    runBreathing();
  }, [rootCtl, armCtl, headCtl, blinkCtl, bodyY, runBreathing, onReact, chestImpulses]);

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
    | { kind: "eye"; z: number; layers: CharacterLayer[] };

  const insideNodes = useMemo<Node[]>(() => {
    const nodes: Node[] = [];
    let eyeRun: { layers: CharacterLayer[]; zMax: number } | null = null;
    const flush = () => {
      if (!eyeRun) return;
      nodes.push({ kind: "eye", z: eyeRun.zMax, layers: eyeRun.layers });
      eyeRun = null;
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
  const eyeOrigin = pctOrigin(pivots.eye, manifest);

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
      // Legacy fallback for pre-ring chest layers. Current manifests use chest_l_r[1-4]_{in,out}.
      const legacyScales = chestScales as unknown as Record<string, { scaleX: MotionValue<number>; scaleY: MotionValue<number>; y: MotionValue<number> }>;
      const legacyPivots = pivots as unknown as Record<string, { x: number; y: number }>;
      const fallback = legacyScales.chest_l_mid ?? legacyScales[PIECE_IDS[0]!]!;
      const { scaleX, scaleY } = fallback;
      const origin = pctOrigin(legacyPivots.chest_l_mid ?? { x: 0.5, y: 0.5 }, manifest);
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
      const legacyScales = chestScales as unknown as Record<string, { scaleX: MotionValue<number>; scaleY: MotionValue<number>; y: MotionValue<number> }>;
      const legacyPivots = pivots as unknown as Record<string, { x: number; y: number }>;
      const fallback = legacyScales.chest_r_mid ?? legacyScales[PIECE_IDS[0]!]!;
      const { scaleX, scaleY } = fallback;
      const origin = pctOrigin(legacyPivots.chest_r_mid ?? { x: 0.5, y: 0.5 }, manifest);
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

  const renderEyeGroup = (group: Extract<Node, { kind: "eye" }>) => (
    <motion.div
      key={`eye-${group.z}`}
      style={{ ...wrapperFill, transformOrigin: eyeOrigin, zIndex: group.z }}
      animate={blinkCtl}
    >
      {group.layers.map((l) =>
        l.role === "irides" ? (
          <IrisLayer key={`iris-${l.z}`} layer={l} manifest={manifest} assetBase={assetBase} x={eyeX} y={eyeY} />
        ) : (
          <img
            key={`eyepart-${l.z}`}
            src={`${assetBase}/${l.src}`}
            draggable={false}
            style={{ ...layerStyle(l, manifest), zIndex: l.z }}
            alt=""
          />
        ),
      )}
    </motion.div>
  );

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
