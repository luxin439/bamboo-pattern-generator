import type { WeaveMatrix, CrossingMembrane, BambooStrip, MembraneState } from './types';

// ============================================================
// 默认配色（原竹色系）
// ============================================================

const DEFAULT_WARP_COLOR = '#8B7355';
const DEFAULT_WEFT_COLOR = '#D2B48C';

// ============================================================
// 内部构造器
// ============================================================

function createStrip(index: number, type: 'warp' | 'weft', color: string): BambooStrip {
  return { index, color, type };
}

/**
 * 从单个图案像素构造交叉膜状态
 *
 *   pattern = 0 → 经线在上（经线颜色可见），纬线在下
 *   pattern = 1 → 纬线在上（纬线颜色可见），经线在下
 */
function crossingFromPixel(value: 0 | 1): CrossingMembrane {
  return value === 0
    ? { warp: 'over', weft: 'under' }
    : { warp: 'under', weft: 'over' };
}

// ============================================================
// 主算法
// ============================================================

/**
 * 输入一个二维 0/1 矩阵（目标图案），输出对应的编织矩阵。
 *
 * 图案约定：
 *   pattern[weftIdx][warpIdx] = 第 weftIdx 行纬线与第 warpIdx 列经线交叉点的像素
 *   0 — 经线在上（经线颜色露头）
 *   1 — 纬线在上（纬线颜色露头）
 *
 * @param pattern  二维 0/1 数组，行数 = 纬线数，列数 = 经线数
 * @param options  可选配色覆盖
 */
export function patternToWeaveMatrix(
  pattern: number[][],
  options?: {
    warpColor?: string;
    weftColor?: string;
  },
): WeaveMatrix {
  const weftCount = pattern.length;
  const row0 = pattern[0];
  if (!row0) {
    throw new Error('Pattern matrix must not be empty');
  }
  const warpCount = row0.length;

  if (weftCount === 0 || warpCount === 0) {
    throw new Error('Pattern matrix must not be empty');
  }

  // 验证二维矩阵的完整性
  for (let i = 0; i < weftCount; i++) {
    const row = pattern[i]!;
    if (row.length !== warpCount) {
      throw new Error(`Row ${i} has length ${row.length}, expected ${warpCount}`);
    }
    for (let j = 0; j < warpCount; j++) {
      const v = row[j]!;
      if (v !== 0 && v !== 1) {
        throw new Error(`Invalid value at [${i}][${j}]: ${v}, expected 0 or 1`);
      }
    }
  }

  // 创建竹条
  const warps: BambooStrip[] = Array.from(
    { length: warpCount },
    (_, i) => createStrip(i, 'warp', options?.warpColor ?? DEFAULT_WARP_COLOR),
  );

  const wefts: BambooStrip[] = Array.from(
    { length: weftCount },
    (_, i) => createStrip(i, 'weft', options?.weftColor ?? DEFAULT_WEFT_COLOR),
  );

  // 构造 crossing 矩阵
  const crossings: CrossingMembrane[][] = wefts.map((_, weftIdx) =>
    warps.map((_, warpIdx) =>
      crossingFromPixel(pattern[weftIdx]![warpIdx]! as 0 | 1),
    ),
  );

  return { warps, wefts, crossings };
}

// ============================================================
// 查询 & 转换工具
// ============================================================

/** 获取指定交叉点处从上方可见的颜色 */
export function getVisibleColor(
  matrix: WeaveMatrix,
  weftIdx: number,
  warpIdx: number,
): string {
  const c = matrix.crossings[weftIdx]![warpIdx]!;
  return c.warp === 'over'
    ? matrix.warps[warpIdx]!.color
    : matrix.wefts[weftIdx]!.color;
}

/** 将编织矩阵渲染为颜色矩阵（可直接用于 Canvas / SVG 绘制） */
export function toColorMatrix(matrix: WeaveMatrix): string[][] {
  return matrix.wefts.map((_, i) =>
    matrix.warps.map((_, j) => getVisibleColor(matrix, i, j)),
  );
}

/** 提取「经线层」状态子矩阵：每个交叉点经线是 over 还是 under */
export function extractWarpLayer(matrix: WeaveMatrix): MembraneState[][] {
  return matrix.wefts.map((_, i) =>
    matrix.warps.map((_, j) => matrix.crossings[i]![j]!.warp),
  );
}

/** 提取「纬线层」状态子矩阵：每个交叉点纬线是 over 还是 under */
export function extractWeftLayer(matrix: WeaveMatrix): MembraneState[][] {
  return matrix.wefts.map((_, i) =>
    matrix.warps.map((_, j) => matrix.crossings[i]![j]!.weft),
  );
}

// ============================================================
// 不变量校验
// ============================================================

/** 运行时验证编织矩阵的一致性 */
export function validateWeaveMatrix(matrix: WeaveMatrix): boolean {
  const { warps, wefts, crossings } = matrix;
  const wc = warps.length;
  const wt = wefts.length;

  if (crossings.length !== wt) return false;

  for (let i = 0; i < wt; i++) {
    const row = crossings[i]!;
    if (row.length !== wc) return false;

    for (let j = 0; j < wc; j++) {
      const c = row[j]!;
      if (c.warp === c.weft) return false;
      if (!isValidState(c.warp) || !isValidState(c.weft)) return false;
    }
  }

  for (let i = 0; i < wt; i++) {
    const s = wefts[i]!;
    if (s.index !== i || s.type !== 'weft') return false;
  }
  for (let j = 0; j < wc; j++) {
    const s = warps[j]!;
    if (s.index !== j || s.type !== 'warp') return false;
  }

  return true;
}

function isValidState(s: string): s is MembraneState {
  return s === 'over' || s === 'under';
}
