// ============================================================
// 颜色工具 — 用于生成竹条渐变所需的明暗色
// ============================================================

const HEX_RE = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

export function hexToRgb(hex: string): [number, number, number] {
  const m = HEX_RE.exec(hex);
  if (!m) return [180, 140, 100];
  return [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}

export interface ShadeSet {
  darker: string;
  base: string;
  lighter: string;
}

/** 从基色生成竹条渐变的暗/中/亮三色 */
export function shadeColor(hex: string): ShadeSet {
  const [r, g, b] = hexToRgb(hex);
  return {
    darker: rgbToHex(r * 0.55, g * 0.55, b * 0.55),
    base: hex,
    lighter: rgbToHex(
      Math.min(255, r * 1.35),
      Math.min(255, g * 1.35),
      Math.min(255, b * 1.35),
    ),
  };
}

/** 将颜色变暗指定比例 (0-1) */
export function dimColor(hex: string, ratio: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - ratio), g * (1 - ratio), b * (1 - ratio));
}
