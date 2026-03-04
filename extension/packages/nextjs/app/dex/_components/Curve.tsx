import { FC, useEffect, useMemo, useRef, useState } from "react";

const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
  const [dx, dy] = [x1 - x2, y1 - y2];
  const norm = Math.sqrt(dx * dx + dy * dy);
  if (!Number.isFinite(norm) || norm === 0) return;
  const [udx, udy] = [dx / norm, dy / norm];
  const size = norm / 7;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 + udx * size - udy * size, y2 + udx * size + udy * size);
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 + udx * size + udy * size, y2 - udx * size + udy * size);
  ctx.stroke();
};

type Rgb = { r: number; g: number; b: number };

const clamp8 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const parseHexColor = (raw: string): Rgb | null => {
  const s = raw.trim();
  if (!s.startsWith("#")) return null;
  const hex = s.slice(1);
  if (hex.length === 3) {
    const r = Number.parseInt(hex[0] + hex[0], 16);
    const g = Number.parseInt(hex[1] + hex[1], 16);
    const b = Number.parseInt(hex[2] + hex[2], 16);
    if ([r, g, b].some(n => Number.isNaN(n))) return null;
    return { r, g, b };
  }
  if (hex.length === 6) {
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].some(n => Number.isNaN(n))) return null;
    return { r, g, b };
  }
  return null;
};

const parseRgbColor = (raw: string): Rgb | null => {
  // rgb(255 255 255) or rgb(255, 255, 255) or rgba(...)
  const m = raw.trim().match(/^rgba?\(\s*([0-9.]+)\s*[, ]\s*([0-9.]+)\s*[, ]\s*([0-9.]+)(?:\s*[,/]\s*[0-9.]+)?\s*\)$/i);
  if (!m) return null;
  const r = Number.parseFloat(m[1]);
  const g = Number.parseFloat(m[2]);
  const b = Number.parseFloat(m[3]);
  if (![r, g, b].every(n => Number.isFinite(n))) return null;
  return { r: clamp8(r), g: clamp8(g), b: clamp8(b) };
};

const parseCssColorToRgb = (raw: string): Rgb | null => {
  return parseHexColor(raw) ?? parseRgbColor(raw);
};

const rgb = (c: Rgb) => `rgb(${c.r}, ${c.g}, ${c.b})`;
const rgba = (c: Rgb, a: number) => `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;

const getFontPx = (ctx: CanvasRenderingContext2D) => {
  const m = ctx.font.match(/(\d+(?:\.\d+)?)px/);
  const px = m ? Number.parseFloat(m[1]) : 12;
  return Number.isFinite(px) && px > 0 ? px : 12;
};

const measurePill = (
  ctx: CanvasRenderingContext2D,
  text: string,
  opts: { paddingX: number; paddingY: number; minHeightPx: number },
) => {
  const metrics = ctx.measureText(text);
  const ascent = metrics.actualBoundingBoxAscent || getFontPx(ctx) * 0.8;
  const descent = metrics.actualBoundingBoxDescent || getFontPx(ctx) * 0.3;
  const textH = ascent + descent;

  const rectW = metrics.width + opts.paddingX * 2;
  const rectH = Math.max(textH + opts.paddingY * 2, opts.minHeightPx);
  return { rectW, rectH, textH, ascent, descent, textW: metrics.width };
};

const drawPillLabel = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: {
    fg: string;
    bg: string;
    stroke?: string;
    baseline?: CanvasTextBaseline;
    paddingX?: number;
    paddingY?: number;
  },
) => {
  const paddingX = opts.paddingX ?? 6;
  const paddingY = opts.paddingY ?? 3;
  const baseline = opts.baseline ?? "middle";

  ctx.save();
  ctx.textBaseline = baseline;

  const minHeightPx = opts.paddingY === undefined ? getFontPx(ctx) * 1.8 : getFontPx(ctx) * 1.8;
  const metrics = measurePill(ctx, text, { paddingX, paddingY, minHeightPx });

  const align = ctx.textAlign || "start";
  const textLeft =
    align === "center" ? x - metrics.textW / 2 : align === "right" || align === "end" ? x - metrics.textW : x;

  // Convert baseline-based y into a top-left for the text.
  const textTop =
    baseline === "top"
      ? y
      : baseline === "middle"
        ? y - metrics.textH / 2
        : baseline === "bottom"
          ? y - metrics.textH
          : y - metrics.ascent; // alphabetic

  // Expand to pill rect and keep text vertically centered if we enforced a min height.
  const baseRectH = metrics.textH + paddingY * 2;
  const extraH = metrics.rectH - baseRectH;

  const rectX = textLeft - paddingX;
  const rectY = textTop - paddingY - extraH / 2;
  const rectW = metrics.rectW;
  const rectH = metrics.rectH;
  const r = Math.min(10, rectH / 2);

  ctx.beginPath();
  ctx.moveTo(rectX + r, rectY);
  ctx.arcTo(rectX + rectW, rectY, rectX + rectW, rectY + rectH, r);
  ctx.arcTo(rectX + rectW, rectY + rectH, rectX, rectY + rectH, r);
  ctx.arcTo(rectX, rectY + rectH, rectX, rectY, r);
  ctx.arcTo(rectX, rectY, rectX + rectW, rectY, r);
  ctx.closePath();

  ctx.fillStyle = opts.bg;
  ctx.fill();

  if (opts.stroke) {
    ctx.strokeStyle = opts.stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.fillStyle = opts.fg;
  ctx.fillText(text, x, y);
  ctx.restore();
};

export interface ICurveProps {
  ethReserve: number;
  tokenReserve: number;
  addingEth: number;
  addingToken: number;
  width: number;
  height: number;
}

export const Curve: FC<ICurveProps> = (props: ICurveProps) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [themeTick, setThemeTick] = useState(0);
  const [view, setView] = useState<{ centerEth: number; scale: number } | null>(null);

  // Re-render on theme toggle (daisyUI toggles via data-theme and/or class changes).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const obs = new MutationObserver(() => setThemeTick(t => t + 1));
    obs.observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => obs.disconnect();
  }, []);

  // Keep a stable viewport so the point actually moves along the curve when reserves change.
  // If a swap is so large that the point would go out of view, we *zoom out* (expand the x-range)
  // instead of re-centering (which would visually pin the point back to the same location).
  useEffect(() => {
    if (!(props.ethReserve > 0) || !(props.tokenReserve > 0)) return;

    setView(prev => {
      if (!prev || !Number.isFinite(prev.centerEth) || prev.centerEth <= 0) {
        return { centerEth: props.ethReserve, scale: 4 };
      }

      const centerEth = prev.centerEth;
      let scale = prev.scale;
      if (!Number.isFinite(scale) || scale <= 0) scale = 4;

      const minX = Math.max(centerEth / scale, 1e-9);
      const maxX = centerEth * scale;

      // Expand x-range when the new point would be off-screen.
      // Keep a little margin so it doesn't sit flush on the edge.
      const margin = 1.2;
      const x = Math.max(props.ethReserve, 1e-9);
      if (x < minX) {
        scale = Math.max(scale, (centerEth * margin) / x);
      } else if (x > maxX) {
        scale = Math.max(scale, (x * margin) / centerEth);
      }

      // Avoid pathological zoom-out.
      scale = Math.min(Math.max(scale, 1.5), 1e6);

      if (scale === prev.scale) return prev;
      return { ...prev, scale };
    });
  }, [props.ethReserve, props.tokenReserve]);

  const colors = useMemo(() => {
    // Intentionally "use" themeTick so this recomputes on theme toggle.
    void themeTick;

    if (typeof window === "undefined") {
      // Reasonable defaults (won't really render on SSR anyway).
      const base100 = { r: 240, g: 252, b: 255 };
      const base200 = { r: 225, g: 250, b: 255 };
      const base300 = { r: 200, g: 245, b: 255 };
      const baseContent = { r: 8, g: 132, b: 132 };
      const secondary = { r: 137, g: 215, b: 233 };
      const success = { r: 52, g: 238, b: 182 };
      const error = { r: 255, g: 136, b: 99 };
      return {
        chartBg: rgb(base100),
        labelBg: rgba(base200, 0.92),
        labelStroke: rgba(base300, 0.9),
        ink: rgb(baseContent),
        grid: rgba(baseContent, 0.12),
        axis: rgba(baseContent, 0.55),
        curveStart: rgb(secondary),
        curveEnd: rgba(secondary, 0.35),
        point: rgb(secondary),
        ethArrow: rgb(success),
        tokenArrow: rgb(error),
      };
    }

    const style = getComputedStyle(document.documentElement);
    const readRgbVar = (name: string, fallback: Rgb) => parseCssColorToRgb(style.getPropertyValue(name)) ?? fallback;

    // These are defined in `globals.css` via the DaisyUI theme plugin.
    const base100 = readRgbVar("--color-base-100", { r: 255, g: 255, b: 255 });
    const base200 = readRgbVar("--color-base-200", { r: 244, g: 248, b: 255 });
    const base300 = readRgbVar("--color-base-300", { r: 218, g: 232, b: 255 });
    const baseContent = readRgbVar("--color-base-content", { r: 33, g: 38, b: 56 });
    const secondary = readRgbVar("--color-secondary", { r: 218, g: 232, b: 255 });
    const success = readRgbVar("--color-success", { r: 52, g: 238, b: 182 });
    const error = readRgbVar("--color-error", { r: 255, g: 136, b: 99 });

    return {
      chartBg: rgb(base100),
      labelBg: rgba(base200, 0.92),
      labelStroke: rgba(base300, 0.9),
      ink: rgb(baseContent),
      grid: rgba(baseContent, 0.12),
      axis: rgba(baseContent, 0.55),
      curveStart: rgb(secondary),
      curveEnd: rgba(secondary, 0.35),
      point: rgb(secondary),
      ethArrow: rgb(success),
      tokenArrow: rgb(error),
    };
  }, [themeTick]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // HiDPI/retina rendering for a sharper, more modern look.
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(props.width * dpr);
    canvas.height = Math.floor(props.height * dpr);
    canvas.style.width = `${props.width}px`;
    canvas.style.height = `${props.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = props.width;
    const height = props.height;

    // Styling
    const textSize = 14;
    const padding = 16;
    const { chartBg, labelBg, labelStroke, grid, axis, ink, curveStart, curveEnd, point, ethArrow, tokenArrow } =
      colors;

    // Clear + background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = chartBg;
    ctx.fillRect(0, 0, width, height);

    ctx.font = `${textSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const hasReserves = props.ethReserve > 0 && props.tokenReserve > 0;
    if (!hasReserves) {
      ctx.fillStyle = ink;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Add liquidity to visualize the curve", width / 2, height / 2);
      return;
    }

    const k = props.ethReserve * props.tokenReserve;

    // Viewport X-range: stable and anchored to the initial reserves (not the current ones),
    // otherwise the point would appear "stuck" at the same place.
    const centerEth = view?.centerEth ?? props.ethReserve;
    const scale = view?.scale ?? 4;
    const minX = Math.max(centerEth / scale, 1e-9);
    const maxX = centerEth * scale;

    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    // Fit the curve for the chosen X-range.
    const maxY = k / minX;
    const minY = k / maxX;

    const denomX = maxX - minX || 1;
    const denomY = maxY - minY || 1;

    const plotX = (x: number) => padding + ((x - minX) / denomX) * plotWidth;
    const plotY = (y: number) => padding + (1 - (y - minY) / denomY) * plotHeight;

    // Grid
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const gx = padding + (plotWidth * i) / 5;
      const gy = padding + (plotHeight * i) / 5;
      ctx.beginPath();
      ctx.moveTo(gx, padding);
      ctx.lineTo(gx, padding + plotHeight);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding, gy);
      ctx.lineTo(padding + plotWidth, gy);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = axis;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + plotHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padding, padding + plotHeight);
    ctx.lineTo(padding + plotWidth, padding + plotHeight);
    ctx.stroke();

    // Curve stroke (theme primary)
    const gradient = ctx.createLinearGradient(padding, padding + plotHeight, padding + plotWidth, padding);
    gradient.addColorStop(0, curveStart);
    gradient.addColorStop(1, curveEnd);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2.25;
    ctx.beginPath();

    // Avoid x=0 (infinite y)
    const step = Math.max((maxX - minX) / plotWidth, 1e-9);
    let first = true;
    for (let x = Math.max(minX + step, step); x <= maxX; x += step) {
      const y = k / x;
      const px = plotX(x);
      const py = plotY(y);
      if (!Number.isFinite(py) || !Number.isFinite(px)) continue;
      if (first) {
        ctx.moveTo(px, py);
        first = false;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // Current reserves point
    const rx = plotX(props.ethReserve);
    const ry = plotY(props.tokenReserve);
    ctx.save();
    ctx.shadowColor = point;
    ctx.shadowBlur = 10;
    ctx.fillStyle = point;
    ctx.beginPath();
    ctx.arc(rx, ry, 5.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    // Arrows + annotations
    ctx.lineWidth = 1.5;
    const pillPaddingX = 8;
    const pillPaddingY = 4;
    const pillMinHeight = getFontPx(ctx) * 1.8; // make ETH pill match emoji pill height
    const pillGap = 8; // predictable spacing from point

    // Clamp the pill's LEFT edge so it's always visible, but keep it aligned with the point when possible.
    const clampPillLeftX = (rectW: number, leftX: number) => clamp(leftX, padding, width - padding - rectW);
    const clampPillCenterY = (rectH: number, cy: number) =>
      clamp(cy, padding + rectH / 2, height - padding - rectH / 2);

    if (props.addingEth) {
      const newEthReserve = props.ethReserve + props.addingEth;
      const nx = plotX(newEthReserve);
      const ny = plotY(k / newEthReserve);

      ctx.strokeStyle = ethArrow;
      drawArrow(ctx, rx, ry, nx, ry);

      ctx.strokeStyle = tokenArrow;
      drawArrow(ctx, nx, ry, nx, ny);

      {
        // ETH pill: directly ABOVE the current point.
        const text = `${props.addingEth} ETH in`;
        const { rectW, rectH } = measurePill(ctx, text, {
          paddingX: pillPaddingX,
          paddingY: pillPaddingY,
          minHeightPx: pillMinHeight,
        });
        const leftX = clampPillLeftX(rectW, rx);
        // When preview moves down the curve, add a bit more vertical gap for ETH pill.
        const extraGap = 4;
        const cy = clampPillCenterY(rectH, ry - (pillGap + extraGap) - rectH / 2);
        ctx.textAlign = "left";
        drawPillLabel(ctx, text, leftX + pillPaddingX, cy, {
          fg: ink,
          bg: labelBg,
          stroke: labelStroke,
          paddingX: pillPaddingX,
          paddingY: pillPaddingY,
          baseline: "middle",
        });
      }

      const amountGained = Math.round((10000 * (props.addingEth * props.tokenReserve)) / newEthReserve) / 10000;
      {
        // 🎈 pill: directly BELOW the lower (new) point.
        const text = `${amountGained} 🎈 out (fee incl.)`;
        const { rectW, rectH } = measurePill(ctx, text, {
          paddingX: pillPaddingX,
          paddingY: pillPaddingY,
          minHeightPx: pillMinHeight,
        });
        const leftX = clampPillLeftX(rectW, nx);
        const cy = clampPillCenterY(rectH, ny + pillGap + rectH / 2);
        ctx.textAlign = "left";
        drawPillLabel(ctx, text, leftX + pillPaddingX, cy, {
          fg: ink,
          bg: labelBg,
          stroke: labelStroke,
          paddingX: pillPaddingX,
          paddingY: pillPaddingY,
          baseline: "middle",
        });
      }
    } else if (props.addingToken) {
      const newTokenReserve = props.tokenReserve + props.addingToken;
      const nx = plotX(k / newTokenReserve);
      const ny = plotY(newTokenReserve);

      ctx.strokeStyle = tokenArrow;
      drawArrow(ctx, rx, ry, rx, ny);

      ctx.strokeStyle = ethArrow;
      drawArrow(ctx, rx, ny, nx, ny);

      {
        // 🎈 pill: directly BELOW the lower (current) point.
        const text = `${props.addingToken} 🎈 in`;
        const { rectW, rectH } = measurePill(ctx, text, {
          paddingX: pillPaddingX,
          paddingY: pillPaddingY,
          minHeightPx: pillMinHeight,
        });
        const leftX = clampPillLeftX(rectW, rx);
        const cy = clampPillCenterY(rectH, ry + pillGap + rectH / 2);
        ctx.textAlign = "left";
        drawPillLabel(ctx, text, leftX + pillPaddingX, cy, {
          fg: ink,
          bg: labelBg,
          stroke: labelStroke,
          paddingX: pillPaddingX,
          paddingY: pillPaddingY,
          baseline: "middle",
        });
      }

      const amountGained = Math.round((10000 * (props.addingToken * props.ethReserve)) / newTokenReserve) / 10000;
      {
        // ETH pill: directly ABOVE the new point.
        const text = `${amountGained} ETH out (fee incl.)`;
        const { rectW, rectH } = measurePill(ctx, text, {
          paddingX: pillPaddingX,
          paddingY: pillPaddingY,
          minHeightPx: pillMinHeight,
        });
        const leftX = clampPillLeftX(rectW, nx);
        const cy = clampPillCenterY(rectH, ny - pillGap - rectH / 2);
        ctx.textAlign = "left";
        drawPillLabel(ctx, text, leftX + pillPaddingX, cy, {
          fg: ink,
          bg: labelBg,
          stroke: labelStroke,
          paddingX: pillPaddingX,
          paddingY: pillPaddingY,
          baseline: "middle",
        });
      }
    }
  }, [
    props.width,
    props.height,
    props.ethReserve,
    props.tokenReserve,
    props.addingEth,
    props.addingToken,
    colors,
    view,
  ]);

  return (
    <div className="rounded-2xl bg-base-100 shadow-lg shadow-secondary border border-base-300 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-base-content">AMM Curve</div>
        <div className="text-sm text-base-content/60">x · y = k</div>
      </div>
      <div style={{ width: props.width, height: props.height }} className="rounded-xl overflow-hidden bg-base-200">
        <canvas ref={ref} />
      </div>
    </div>
  );
};
