// ============================================================
// 竹编图案生成器 — 核心类型定义
// ============================================================

/** 竹条类型 */
export type StripType = 'warp' | 'weft';

/** 单根竹条定义 */
export interface BambooStrip {
  readonly index: number;
  readonly color: string;
  readonly type: StripType;
}

/** 跨越膜状态：单根竹条在某个交叉点处是跨越（在上）还是被跨越（在下） */
export type MembraneState = 'over' | 'under';

/**
 * 双向跨越膜状态
 * 每个交叉点同时记录经线和纬线的视角。
 * 不变量: warp !== weft（两者必定一上一下）
 */
export interface CrossingMembrane {
  readonly warp: MembraneState;
  readonly weft: MembraneState;
}

/**
 * 编织矩阵
 *
 * 包含所有竹条定义以及每个交叉点的双向跨越膜状态。
 * crossings[weftIdx][warpIdx] = 第 weftIdx 根纬线与第 warpIdx 根经线的交叉点
 *
 * 存储约定（与视觉习惯对齐）：
 *   warps   — 纵向排列，索引从左到右  [0 … warpCount-1]
 *   wefts   — 横向排列，索引从上到下  [0 … weftCount-1]
 *   crossings[i][j] — 第 i 行纬线与第 j 列经线的交叉
 */
export interface WeaveMatrix {
  readonly warps: BambooStrip[];
  readonly wefts: BambooStrip[];
  readonly crossings: CrossingMembrane[][];
}
