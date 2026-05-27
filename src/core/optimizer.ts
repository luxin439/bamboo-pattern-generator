import type { WeaveMatrix, CrossingMembrane } from './types';

// ============================================================
// 配置选项
// ============================================================

export interface OptimizeOptions {
  /**
   * 最大允许连续相同跨越状态数。
   * 单根竹条连续"浮"（over）或"沉"（under）超过此值时会自动打断。
   * @default 3
   */
  maxRun?: number;

  /**
   * 最大迭代次数，防止意外死循环。
   * @default 1000
   */
  maxIterations?: number;
}

// ============================================================
// 主函数
// ============================================================

/**
 * 结构优化：约束每根竹条的连续跨越长度 ≤ maxRun。
 *
 * 接收一个已生成的 WeaveMatrix，返回一个结构合规的新矩阵。
 * 改动方式：在违规的连续段中按最优间距插入"挑压交错"；
 *           优先选择能同时修复经线和纬线违规的位置以最小化改动量。
 */
export function enforceMaxRunLength(
  matrix: WeaveMatrix,
  options: OptimizeOptions = {},
): WeaveMatrix {
  const { maxRun = 3, maxIterations = 1000 } = options;

  if (maxRun < 1) {
    throw new Error(`maxRun must be at least 1, got ${maxRun}`);
  }

  const rows = matrix.wefts.length;
  const cols = matrix.warps.length;

  // ---- 1. 提取为可变的 0/1 矩阵 ----
  // 0 → warp over, 1 → weft over
  const pattern: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) =>
      matrix.crossings[i]![j]!.weft === 'over' ? 1 : 0,
    ),
  );

  // ---- 2. 迭代修复 ----
  fixRuns(pattern, maxRun, maxIterations);

  // ---- 3. 转回 WeaveMatrix ----
  const crossings: CrossingMembrane[][] = pattern.map(row =>
    row.map(v =>
      v === 1
        ? { warp: 'under' as const, weft: 'over' as const }
        : { warp: 'over' as const, weft: 'under' as const },
    ),
  );

  return { warps: matrix.warps, wefts: matrix.wefts, crossings };
}

// ============================================================
// 核心修复算法
// ============================================================

/**
 * 在一维数组中找出所有长度超过 maxRun 的连续相等值段。
 * 返回 [{ start, end }] 每个段在原数组中的起止下标（含）。
 */
function findOverMaxRuns(
  arr: number[],
  maxRun: number,
): Array<{ start: number; end: number }> {
  const result: Array<{ start: number; end: number }> = [];
  let i = 0;
  while (i < arr.length) {
    let j = i;
    while (j < arr.length && arr[j] === arr[i]) j++;
    if (j - i > maxRun) result.push({ start: i, end: j - 1 });
    i = j;
  }
  return result;
}

/**
 * 在一维数组中找到需要翻转的下标位置。
 * 对于一个从 start 到 end 的连续段，每隔 maxRun+1 格设一个断点。
 *
 * 例：段长 9，maxRun=3
 *   下标: 0 1 2 3 4 5 6 7 8
 *   值:   V V V V V V V V V
 *   翻转:         ^       ^       (下标 3 和 7)
 *   结果:  V V V x V V V x V     （最大连续长度 = 3 ✓）
 */
function idealFlipPositions(start: number, end: number, maxRun: number): number[] {
  const positions: number[] = [];
  for (let p = start + maxRun; p <= end; p += maxRun + 1) {
    positions.push(p);
  }
  return positions;
}

/**
 * 修复 0/1 矩阵中的所有超长连续段。
 *
 * 贪心策略（每次只翻一个最优位置），但仍保证两点：
 *  1. 优先翻转「同时在行和列违规段中」的位置（一次改动解决两个维度）
 *  2. 翻转位置按最优间距选取（最小改动量）
 */
function fixRuns(pattern: number[][], maxRun: number, maxIter: number): void {
  const rows = pattern.length;
  const cols = pattern[0]!.length;

  for (let iter = 0; iter < maxIter; iter++) {
    // ---- 找出所有理想翻转位置 ----
    const rowFixSet = new Set<string>();
    for (let r = 0; r < rows; r++) {
      for (const { start, end } of findOverMaxRuns(pattern[r]!, maxRun)) {
        for (const p of idealFlipPositions(start, end, maxRun)) {
          rowFixSet.add(`${r},${p}`);
        }
      }
    }

    const colFixSet = new Set<string>();
    for (let c = 0; c < cols; c++) {
      const col = Array.from({ length: rows }, (_, r) => pattern[r]![c]!);
      for (const { start, end } of findOverMaxRuns(col, maxRun)) {
        for (const p of idealFlipPositions(start, end, maxRun)) {
          colFixSet.add(`${p},${c}`);
        }
      }
    }

    if (rowFixSet.size === 0 && colFixSet.size === 0) break;

    // ---- 优先级 1：行和列的交集（一次翻转解决两个违规） ----
    let found = false;
    for (const key of rowFixSet) {
      if (colFixSet.has(key)) {
        flip(pattern, key);
        found = true;
        break;
      }
    }
    if (found) continue;

    // ---- 优先级 2：任一行或列的理想位置 ----
    const all = rowFixSet.size > 0 ? rowFixSet : colFixSet;
    flip(pattern, all.values().next().value!);
  }
}

function flip(pattern: number[][], key: string): void {
  const [r, c] = key.split(',').map(Number);
  pattern[r!]![c!] = 1 - pattern[r!]![c!]!;
}

// ============================================================
// 工具：统计改动量
// ============================================================

/** 对比两个编织矩阵，返回发生了多少次翻转 */
export function countFlips(original: WeaveMatrix, optimized: WeaveMatrix): number {
  let count = 0;
  for (let i = 0; i < original.wefts.length; i++) {
    for (let j = 0; j < original.warps.length; j++) {
      if (original.crossings[i]![j]!.warp !== optimized.crossings[i]![j]!.warp) {
        count++;
      }
    }
  }
  return count;
}
