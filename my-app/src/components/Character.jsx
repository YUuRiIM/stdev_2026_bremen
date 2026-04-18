import {
  motion,
  animate,
  useAnimation,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
const BODY_ROLES = new Set(["neck", "topwear", "bottomwear", "legwear"]);
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

const PIECE_CFG = {
  chest_l_r1_out:  { delay: 0,  K: 0.0022, touch: 0.07, touchY: -0.5, spring: EDGE },
  chest_l_r1_in:   { delay: 6,  K: 0.0020, touch: 0.06, touchY: -0.5, spring: EDGE },
  chest_l_r2_out:  { delay: 0,  K: 0.0060, touch: 0.26, touchY: 3.5,  spring: MAIN },
  chest_l_r2_in:   { delay: 8,  K: 0.0048, touch: 0.20, touchY: 2.8,  spring: MAIN },
  chest_l_r3_out:  { delay: 12, K: 0.0055, touch: 0.24, touchY: 3.2,  spring: MAIN },
  chest_l_r3_in:   { delay: 18, K: 0.0044, touch: 0.18, touchY: 2.4,  spring: MAIN },
  chest_l_r4_out:  { delay: 26, K: 0.0032, touch: 0.11, touchY: 1.6,  spring: FAST },
  chest_l_r4_in:   { delay: 32, K: 0.0025, touch: 0.08, touchY: 1.2,  spring: FAST },
  chest_r_r1_out:  { delay: 40, K: 0.0022, touch: 0.07, touchY: -0.5, spring: EDGE },
  chest_r_r1_in:   { delay: 46, K: 0.0020, touch: 0.06, touchY: -0.5, spring: EDGE },
  chest_r_r2_out:  { delay: 40, K: 0.0060, touch: 0.26, touchY: 3.5,  spring: MAIN },
  chest_r_r2_in:   { delay: 48, K: 0.0048, touch: 0.20, touchY: 2.8,  spring: MAIN },
  chest_r_r3_out:  { delay: 52, K: 0.0055, touch: 0.24, touchY: 3.2,  spring: MAIN },
  chest_r_r3_in:   { delay: 58, K: 0.0044, touch: 0.18, touchY: 2.4,  spring: MAIN },
  chest_r_r4_out:  { delay: 66, K: 0.0032, touch: 0.11, touchY: 1.6,  spring: FAST },
  chest_r_r4_in:   { delay: 72, K: 0.0025, touch: 0.08, touchY: 1.2,  spring: FAST },
};
const PIECE_IDS = Object.keys(PIECE_CFG);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function computePivots(manifest) {
  const by = {};
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
  const piecePivot = (x0, y0, x1, y1) => ({
    x: tLeft + tW * ((x0 + x1) / 2),
    y: tTop + tH * ((y0 + y1) / 2),
  });
  return {
    head: { x: cx, y: neck ? neck.top + (neck.bottom - neck.top) * 0.05 : canvasH * 0.48 },
    arm:  { x: cx, y: top ? top.top + tH * 0.04 : canvasH * 0.46 },
    body: { x: cx, y: canvasH },
    eye:  ir ? { x: (ir.left + ir.right) / 2, y: (ir.top + ir.bottom) / 2 } : { x: cx, y: canvasH * 0.33 },
    chest_l_r1_out: piecePivot(0.02, 0.26, 0.22, 0.38),
    chest_l_r1_in:  piecePivot(0.18, 0.26, 0.38, 0.38),
    chest_l_r2_out: piecePivot(0.00, 0.34, 0.22, 0.48),
    chest_l_r2_in:  piecePivot(0.18, 0.34, 0.38, 0.48),
    chest_l_r3_out: piecePivot(0.02, 0.46, 0.24, 0.58),
    chest_l_r3_in:  piecePivot(0.20, 0.46, 0.38, 0.58),
    chest_l_r4_out: piecePivot(0.06, 0.54, 0.26, 0.66),
    chest_l_r4_in:  piecePivot(0.22, 0.54, 0.38, 0.66),
    chest_r_r1_in:  piecePivot(0.62, 0.26, 0.82, 0.38),
    chest_r_r1_out: piecePivot(0.78, 0.26, 0.98, 0.38),
    chest_r_r2_in:  piecePivot(0.62, 0.34, 0.82, 0.48),
    chest_r_r2_out: piecePivot(0.78, 0.34, 1.00, 0.48),
    chest_r_r3_in:  piecePivot(0.62, 0.46, 0.80, 0.58),
    chest_r_r3_out: piecePivot(0.76, 0.46, 0.98, 0.58),
    chest_r_r4_in:  piecePivot(0.62, 0.54, 0.78, 0.66),
    chest_r_r4_out: piecePivot(0.74, 0.54, 0.94, 0.66),
  };
}

function pctOrigin(pivot, manifest) {
  return `${(pivot.x / manifest.width) * 100}% ${(pivot.y / manifest.height) * 100}%`;
}

function layerStyle(layer, manifest) {
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
  };
}

function useChestSprings(bodyY) {
  const bodyV = useVelocity(bodyY);

  const impulses = {
    chest_l_r1_out: useMotionValue(0),
    chest_l_r1_in: useMotionValue(0),
    chest_l_r2_out: useMotionValue(0),
    chest_l_r2_in: useMotionValue(0),
    chest_l_r3_out: useMotionValue(0),
    chest_l_r3_in: useMotionValue(0),
    chest_l_r4_out: useMotionValue(0),
    chest_l_r4_in: useMotionValue(0),
    chest_r_r1_in: useMotionValue(0),
    chest_r_r1_out: useMotionValue(0),
    chest_r_r2_in: useMotionValue(0),
    chest_r_r2_out: useMotionValue(0),
    chest_r_r3_in: useMotionValue(0),
    chest_r_r3_out: useMotionValue(0),
    chest_r_r4_in: useMotionValue(0),
    chest_r_r4_out: useMotionValue(0),
  };

  const springs = {
    chest_l_r1_out: useSpring(impulses.chest_l_r1_out, { ...PIECE_CFG.chest_l_r1_out.spring, restSpeed: 0.0002 }),
    chest_l_r1_in: useSpring(impulses.chest_l_r1_in, { ...PIECE_CFG.chest_l_r1_in.spring, restSpeed: 0.0002 }),
    chest_l_r2_out: useSpring(impulses.chest_l_r2_out, { ...PIECE_CFG.chest_l_r2_out.spring, restSpeed: 0.0002 }),
    chest_l_r2_in: useSpring(impulses.chest_l_r2_in, { ...PIECE_CFG.chest_l_r2_in.spring, restSpeed: 0.0002 }),
    chest_l_r3_out: useSpring(impulses.chest_l_r3_out, { ...PIECE_CFG.chest_l_r3_out.spring, restSpeed: 0.0002 }),
    chest_l_r3_in: useSpring(impulses.chest_l_r3_in, { ...PIECE_CFG.chest_l_r3_in.spring, restSpeed: 0.0002 }),
    chest_l_r4_out: useSpring(impulses.chest_l_r4_out, { ...PIECE_CFG.chest_l_r4_out.spring, restSpeed: 0.0002 }),
    chest_l_r4_in: useSpring(impulses.chest_l_r4_in, { ...PIECE_CFG.chest_l_r4_in.spring, restSpeed: 0.0002 }),
    chest_r_r1_in: useSpring(impulses.chest_r_r1_in, { ...PIECE_CFG.chest_r_r1_in.spring, restSpeed: 0.0002 }),
    chest_r_r1_out: useSpring(impulses.chest_r_r1_out, { ...PIECE_CFG.chest_r_r1_out.spring, restSpeed: 0.0002 }),
    chest_r_r2_in: useSpring(impulses.chest_r_r2_in, { ...PIECE_CFG.chest_r_r2_in.spring, restSpeed: 0.0002 }),
    chest_r_r2_out: useSpring(impulses.chest_r_r2_out, { ...PIECE_CFG.chest_r_r2_out.spring, restSpeed: 0.0002 }),
    chest_r_r3_in: useSpring(impulses.chest_r_r3_in, { ...PIECE_CFG.chest_r_r3_in.spring, restSpeed: 0.0002 }),
    chest_r_r3_out: useSpring(impulses.chest_r_r3_out, { ...PIECE_CFG.chest_r_r3_out.spring, restSpeed: 0.0002 }),
    chest_r_r4_in: useSpring(impulses.chest_r_r4_in, { ...PIECE_CFG.chest_r_r4_in.spring, restSpeed: 0.0002 }),
    chest_r_r4_out: useSpring(impulses.chest_r_r4_out, { ...PIECE_CFG.chest_r_r4_out.spring, restSpeed: 0.0002 }),
  };

  const yImpulses = {
    chest_l_r1_out: useMotionValue(0),
    chest_l_r1_in: useMotionValue(0),
    chest_l_r2_out: useMotionValue(0),
    chest_l_r2_in: useMotionValue(0),
    chest_l_r3_out: useMotionValue(0),
    chest_l_r3_in: useMotionValue(0),
    chest_l_r4_out: useMotionValue(0),
    chest_l_r4_in: useMotionValue(0),
    chest_r_r1_in: useMotionValue(0),
    chest_r_r1_out: useMotionValue(0),
    chest_r_r2_in: useMotionValue(0),
    chest_r_r2_out: useMotionValue(0),
    chest_r_r3_in: useMotionValue(0),
    chest_r_r3_out: useMotionValue(0),
    chest_r_r4_in: useMotionValue(0),
    chest_r_r4_out: useMotionValue(0),
  };

  const ySprings = {
    chest_l_r1_out: useSpring(yImpulses.chest_l_r1_out, { ...PIECE_CFG.chest_l_r1_out.spring, restSpeed: 0.0002 }),
    chest_l_r1_in: useSpring(yImpulses.chest_l_r1_in, { ...PIECE_CFG.chest_l_r1_in.spring, restSpeed: 0.0002 }),
    chest_l_r2_out: useSpring(yImpulses.chest_l_r2_out, { ...PIECE_CFG.chest_l_r2_out.spring, restSpeed: 0.0002 }),
    chest_l_r2_in: useSpring(yImpulses.chest_l_r2_in, { ...PIECE_CFG.chest_l_r2_in.spring, restSpeed: 0.0002 }),
    chest_l_r3_out: useSpring(yImpulses.chest_l_r3_out, { ...PIECE_CFG.chest_l_r3_out.spring, restSpeed: 0.0002 }),
    chest_l_r3_in: useSpring(yImpulses.chest_l_r3_in, { ...PIECE_CFG.chest_l_r3_in.spring, restSpeed: 0.0002 }),
    chest_l_r4_out: useSpring(yImpulses.chest_l_r4_out, { ...PIECE_CFG.chest_l_r4_out.spring, restSpeed: 0.0002 }),
    chest_l_r4_in: useSpring(yImpulses.chest_l_r4_in, { ...PIECE_CFG.chest_l_r4_in.spring, restSpeed: 0.0002 }),
    chest_r_r1_in: useSpring(yImpulses.chest_r_r1_in, { ...PIECE_CFG.chest_r_r1_in.spring, restSpeed: 0.0002 }),
    chest_r_r1_out: useSpring(yImpulses.chest_r_r1_out, { ...PIECE_CFG.chest_r_r1_out.spring, restSpeed: 0.0002 }),
    chest_r_r2_in: useSpring(yImpulses.chest_r_r2_in, { ...PIECE_CFG.chest_r_r2_in.spring, restSpeed: 0.0002 }),
    chest_r_r2_out: useSpring(yImpulses.chest_r_r2_out, { ...PIECE_CFG.chest_r_r2_out.spring, restSpeed: 0.0002 }),
    chest_r_r3_in: useSpring(yImpulses.chest_r_r3_in, { ...PIECE_CFG.chest_r_r3_in.spring, restSpeed: 0.0002 }),
    chest_r_r3_out: useSpring(yImpulses.chest_r_r3_out, { ...PIECE_CFG.chest_r_r3_out.spring, restSpeed: 0.0002 }),
    chest_r_r4_in: useSpring(yImpulses.chest_r_r4_in, { ...PIECE_CFG.chest_r_r4_in.spring, restSpeed: 0.0002 }),
    chest_r_r4_out: useSpring(yImpulses.chest_r_r4_out, { ...PIECE_CFG.chest_r_r4_out.spring, restSpeed: 0.0002 }),
  };

  useEffect(() => {
    const pending = new Set();
    const unsubs = PIECE_IDS.map((id) => {
      const cfg = PIECE_CFG[id];
      return bodyV.on("change", (v) => {
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

  const scales = {
    chest_l_r1_out: {
      scaleY: useTransform([springs.chest_l_r1_out, breath], ([p, b]) => 1 + p + b),
      scaleX: useTransform([springs.chest_l_r1_out, breath], ([p, b]) => 1 - p * 0.35 + b * 0.3),
      y: ySprings.chest_l_r1_out,
    },
    chest_l_r1_in: {
      scaleY: useTransform([springs.chest_l_r1_in, breath], ([p, b]) => 1 + p + b),
      scaleX: useTransform([springs.chest_l_r1_in, breath], ([p, b]) => 1 - p * 0.35 + b * 0.3),
      y: ySprings.chest_l_r1_in,
    },
    chest_l_r2_out: {
      scaleY: useTransform([springs.chest_l_r2_out, breath], ([p, b]) => 1 + p + b),
      scaleX: useTransform([springs.chest_l_r2_out, breath], ([p, b]) => 1 - p * 0.35 + b * 0.3),
      y: ySprings.chest_l_r2_out,
    },
    chest_l_r2_in: {
      scaleY: useTransform([springs.chest_l_r2_in, breath], ([p, b]) => 1 + p + b),
      scaleX: useTransform([springs.chest_l_r2_in, breath], ([p, b]) => 1 - p * 0.35 + b * 0.3),
      y: ySprings.chest_l_r2_in,
    },
    chest_l_r3_out: {
      scaleY: useTransform([springs.chest_l_r3_out, breath], ([p, b]) => 1 + p + b),
      scaleX: useTransform([springs.chest_l_r3_out, breath], ([p, b]) => 1 - p * 0.35 + b * 0.3),
      y: ySprings.chest_l_r3_out,
    },
    chest_l_r3_in: {
      scaleY: useTransform([springs.chest_l_r3_in, breath], ([p, b]) => 1 + p + b),
      scaleX: useTransform([springs.chest_l_r3_in, breath], ([p, b]) => 1 - p * 0.35 + b * 0.3),
      y: ySprings.chest_l_r3_in,
    },
    chest_l_r4_out: {
      scaleY: useTransform([springs.chest_l_r4_out, breath], ([p, b]) => 1 + p + b),
      scaleX: useTransform([springs.chest_l_r4_out, breath], ([p, b]) => 1 - p * 0.35 + b * 0.3),
      y: ySprings.chest_l_r4_out,
    },
    chest_l_r4_in: {
      scaleY: useTransform([springs.chest_l_r4_in, breath], ([p, b]) => 1 + p + b),
      scaleX: useTransform([springs.chest_l_r4_in, breath], ([p, b]) => 1 - p * 0.35 + b * 0.3),
      y: ySprings.chest_l_r4_in,
    },
    chest_r_r1_in: {
      scaleY: useTransform([springs.chest_r_r1_in, breath], ([p, b]) => 1 + p + b),
      scaleX: useTransform([springs.chest_r_r1_in, breath], ([p, b]) => 1 - p * 0.35 + b * 0.3),
      y: ySprings.chest_r_r1_in,
    },
    chest_r_r1_out: {
      scaleY: useTransform([springs.chest_r_r1_out, breath], ([p, b]) => 1 + p + b),
      scaleX: useTransform([springs.chest_r_r1_out, breath], ([p, b]) => 1 - p * 0.35 + b * 0.3),
      y: ySprings.chest_r_r1_out,
    },
    chest_r_r2_in: {
      scaleY: useTransform([springs.chest_r_r2_in, breath], ([p, b]) => 1 + p + b),
      scaleX: useTransform([springs.chest_r_r2_in, breath], ([p, b]) => 1 - p * 0.35 + b * 0.3),
      y: ySprings.chest_r_r2_in,
    },
    chest_r_r2_out: {
      scaleY: useTransform([springs.chest_r_r2_out, breath], ([p, b]) => 1 + p + b),
      scaleX: useTransform([springs.chest_r_r2_out, breath], ([p, b]) => 1 - p * 0.35 + b * 0.3),
      y: ySprings.chest_r_r2_out,
    },
    chest_r_r3_in: {
      scaleY: useTransform([springs.chest_r_r3_in, breath], ([p, b]) => 1 + p + b),
      scaleX: useTransform([springs.chest_r_r3_in, breath], ([p, b]) => 1 - p * 0.35 + b * 0.3),
      y: ySprings.chest_r_r3_in,
    },
    chest_r_r3_out: {
      scaleY: useTransform([springs.chest_r_r3_out, breath], ([p, b]) => 1 + p + b),
      scaleX: useTransform([springs.chest_r_r3_out, breath], ([p, b]) => 1 - p * 0.35 + b * 0.3),
      y: ySprings.chest_r_r3_out,
    },
    chest_r_r4_in: {
      scaleY: useTransform([springs.chest_r_r4_in, breath], ([p, b]) => 1 + p + b),
      scaleX: useTransform([springs.chest_r_r4_in, breath], ([p, b]) => 1 - p * 0.35 + b * 0.3),
      y: ySprings.chest_r_r4_in,
    },
    chest_r_r4_out: {
      scaleY: useTransform([springs.chest_r_r4_out, breath], ([p, b]) => 1 + p + b),
      scaleX: useTransform([springs.chest_r_r4_out, breath], ([p, b]) => 1 - p * 0.35 + b * 0.3),
      y: ySprings.chest_r_r4_out,
    },
  };

  return { scales, impulses, yImpulses };
}

function IrisLayer({ layer, manifest, assetBase, x, y }) {
  return (
    <motion.img
      src={`${assetBase}/${layer.src}`}
      draggable={false}
      style={{ ...layerStyle(layer, manifest), zIndex: layer.z, x, y }}
      alt=""
    />
  );
}

export function Character({
  manifest,
  assetBase,
  width = 360,
  className,
  style,
  eyeTrackRadius = { x: 0.8, y: 0.4 },
  idleEnabled = true,
  onReact,
}) {
  const rootRef = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  useEffect(() => {
    const onMove = (e) => {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.32;
      mx.set(Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width / 2))));
      my.set(Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height / 2))));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  const eyeX = useSpring(useTransform(mx, [-1, 1], [-eyeTrackRadius.x, eyeTrackRadius.x]), {
    stiffness: 240, damping: 24, mass: 0.4,
  });
  const eyeY = useSpring(useTransform(my, [-1, 1], [-eyeTrackRadius.y, eyeTrackRadius.y]), {
    stiffness: 240, damping: 24, mass: 0.4,
  });

  const bodyY = useMotionValue(0);
  const { scales: chestScales, impulses: chestImpulses, yImpulses: chestYImpulses } = useChestSprings(bodyY);

  const rootCtl = useAnimation();
  const armCtl = useAnimation();
  const headCtl = useAnimation();
  const blinkCtl = useAnimation();

  const reactingRef = useRef(false);
  const breathingRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runBreathing = useCallback(() => {
    if (!mountedRef.current) return;
    if (breathingRef.current) breathingRef.current.stop();
    breathingRef.current = animate(bodyY, [0, -4.5, 0], {
      duration: 4.4,
      repeat: Infinity,
      ease: "easeInOut",
    });
    if (mountedRef.current) {
      armCtl.start({
        rotate: [0, -0.25, 0.2, -0.15, 0],
        transition: { duration: 5.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 },
      });
    }
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
      while (!cancelled && mountedRef.current) {
        await sleep(2400 + Math.random() * 3600);
        if (cancelled || reactingRef.current || !mountedRef.current) continue;
        const pick = Math.random();
        if (pick < 0.4) {
          await blinkCtl.start({
            scaleY: [1, 0.08, 1],
            transition: { duration: 0.18, times: [0, 0.5, 1], ease: [0.76, 0, 0.24, 1] },
          });
        } else if (pick < 0.72) {
          await headCtl.start({
            rotate: [0, -1.8, 1.2, -0.6, 0],
            transition: { duration: 1.25, ease: "easeInOut" },
          });
        } else if (pick < 0.9) {
          await headCtl.start({
            y: [0, -1.4, 0.4, 0],
            rotate: [0, -0.5, 0.3, 0],
            transition: { duration: 0.9, ease: "easeInOut" },
          });
        } else {
          await Promise.all([
            blinkCtl.start({
              scaleY: [1, 0.08, 1, 0.08, 1],
              transition: { duration: 0.48, times: [0, 0.22, 0.5, 0.72, 1] },
            }),
            headCtl.start({
              rotate: [0, 0.9, -0.6, 0],
              transition: { duration: 0.6 },
            }),
          ]);
        }
      }
    };
    loop();
    return () => { cancelled = true; };
  }, [idleEnabled, headCtl, blinkCtl]);

  const twitch = useCallback(async () => {
    if (reactingRef.current) return;
    reactingRef.current = true;
    if (onReact) onReact();

    if (breathingRef.current) breathingRef.current.stop();
    armCtl.stop();
    headCtl.stop();

    const ease = [0.34, 1.2, 0.64, 1];
    const dur = 0.9;

    const chestPs = [];
    for (const id of PIECE_IDS) {
      const cfg = PIECE_CFG[id];
      const mv = chestImpulses[id];
      const ymv = chestYImpulses[id];
      const a = cfg.touch;
      const ay = cfg.touchY || 0;
      chestPs.push(
        animate(mv, [mv.get(), a, -a * 0.2, a * 0.06, 0], {
          duration: 0.5, ease: "easeOut", delay: cfg.delay / 1000,
          times: [0, 0.2, 0.52, 0.78, 1],
        }),
        animate(ymv, [ymv.get(), ay, -ay * 0.25, 0], {
          duration: 0.5, ease: "easeOut", delay: cfg.delay / 1000,
          times: [0, 0.22, 0.6, 1],
        }),
      );
    }

    await Promise.all([
      animate(bodyY, [bodyY.get(), -3, 1, -0.5, 0.2, 0], {
        duration: dur, ease, times: [0, 0.18, 0.42, 0.62, 0.82, 1],
      }),
      headCtl.start({
        rotate: [0, -0.6, 0.4, -0.2, 0, 0],
        y: [0, -0.6, 0.3, -0.1, 0, 0],
        transition: { duration: dur, ease, times: [0, 0.18, 0.42, 0.65, 0.85, 1] },
      }),
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
    if (mountedRef.current) runBreathing();
  }, [rootCtl, armCtl, headCtl, blinkCtl, bodyY, runBreathing, onReact, chestImpulses, chestYImpulses]);

  const pivots = useMemo(() => computePivots(manifest), [manifest]);

  const { outsideHead, headLayers, headStartZ } = useMemo(() => {
    const sorted = [...manifest.layers].sort((a, b) => a.z - b.z);
    const bodyOrArmZs = sorted
      .filter((l) => BODY_ROLES.has(l.role) || ARM_ROLES.has(l.role) || CHEST_ROLES.has(l.role))
      .map((l) => l.z);
    const maxBodyZ = bodyOrArmZs.length ? Math.max(...bodyOrArmZs) : -1;
    const outside = [];
    const inside = [];
    for (const l of sorted) {
      const isHead = HEAD_ROLES.has(l.role);
      if (isHead && l.z > maxBodyZ) inside.push(l);
      else outside.push(l);
    }
    const startZ = inside.length ? Math.min(...inside.map((l) => l.z)) : maxBodyZ + 1;
    return { outsideHead: outside, headLayers: inside, headStartZ: startZ };
  }, [manifest.layers]);

  const insideNodes = useMemo(() => {
    const nodes = [];
    let eyeRun = null;
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

  const containerStyle = {
    position: "relative",
    width,
    aspectRatio: `${manifest.width} / ${manifest.height}`,
    userSelect: "none",
    touchAction: "manipulation",
    cursor: "pointer",
    ...style,
  };
  const wrapperFill = { position: "absolute", inset: 0, pointerEvents: "none", willChange: "transform" };

  const headOrigin = pctOrigin(pivots.head, manifest);
  const armOrigin = pctOrigin(pivots.arm, manifest);
  const bodyOrigin = pctOrigin(pivots.body, manifest);
  const eyeOrigin = pctOrigin(pivots.eye, manifest);

  const renderPlain = (layer, prefix = "layer") => (
    <img
      key={`${prefix}-${layer.z}`}
      src={`${assetBase}/${layer.src}`}
      draggable={false}
      style={{ ...layerStyle(layer, manifest), zIndex: layer.z }}
      alt=""
    />
  );

  const renderOutside = (layer) => {
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
      const origin = pctOrigin(pivots[layer.role] || pivots.body, manifest);
      const { scaleX, scaleY, y } = chestScales[layer.role];
      return (
        <motion.div
          key={`${layer.role}-${layer.z}`}
          style={{ ...wrapperFill, transformOrigin: origin, zIndex: layer.z, scaleY, scaleX, y }}
        >
          <img src={`${assetBase}/${layer.src}`} draggable={false} style={layerStyle(layer, manifest)} alt="" />
        </motion.div>
      );
    }
    return renderPlain(layer, "outside");
  };

  const renderEyeGroup = (group) => (
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

export async function loadManifest(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`manifest load failed: ${res.status}`);
  return await res.json();
}

export function useManifest(url) {
  const [manifest, setManifest] = useState(null);
  useEffect(() => {
    let alive = true;
    loadManifest(url)
      .then((m) => { if (alive) setManifest(m); })
      .catch((err) => console.error(`[Character] useManifest(${url}) failed:`, err));
    return () => { alive = false; };
  }, [url]);
  return manifest;
}
