import sharp from 'sharp';

// ============================================================
// 配置 & 类型
// ============================================================

export interface BinarizeOptions {
  /** 目标网格大小 N × N */
  size: number;

  /**
   * 二值化阈值，范围 0–255。
   *
   *   像素灰度值 <= threshold → 1（图案 / 经线在上）
   *   像素灰度值 >  threshold → 0（背景 / 纬线在上）
   *
   * 竹编参考图通常是深色图案在浅色底上，此时 threshold ≈ 128 效果较好。
   * 调低 threshold → 更多区域被识别为背景（0）
   * 调高 threshold → 更多区域被识别为图案（1）
   *
   * @default 128
   */
  threshold?: number;

  /**
   * 是否翻转二值化结果。
   * true  → 暗=0，亮=1（默认是暗=1，亮=0）
   * @default false
   */
  invert?: boolean;

  /**
   * 缩放裁剪策略。
   * - 'fill'  ：拉伸至 N×N，可能变形（默认）
   * - 'cover' ：按比例裁剪居中区域，不拉伸
   * @default 'fill'
   */
  fit?: 'fill' | 'cover';
}

// ============================================================
// 主函数
// ============================================================

/**
 * 将图片压缩并二值化为 N×N 的 0/1 矩阵，供 patternToWeaveMatrix 使用。
 *
 * 处理管线：
 *   输入图片 → 灰度化 → resize 至 N×N → threshold 二值化 → 0/1 矩阵
 *
 * @param input   图片路径（string）或 Buffer
 * @param options 配置项
 */
export async function imageToPattern(
  input: string | Buffer,
  options: BinarizeOptions,
): Promise<number[][]> {
  const { size, threshold = 128, invert = false, fit = 'fill' } = options;

  // ---- 参数校验 ----
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error(`size must be a positive integer, got ${size}`);
  }
  if (threshold < 0 || threshold > 255 || !Number.isInteger(threshold)) {
    throw new Error(`threshold must be an integer in [0, 255], got ${threshold}`);
  }

  // ---- sharp pipeline ----
  const { data } = await sharp(input)
    .grayscale()                                                 // 单通道灰度
    .resize(size, size, { fit: fit === 'cover' ? 'cover' : 'fill', position: 'centre' })
    .raw()                                                       // 原始像素 Buffer
    .toBuffer({ resolveWithObject: true });

  // ---- 二值化 ----
  const pattern: number[][] = [];

  for (let row = 0; row < size; row++) {
    const rowData: number[] = [];
    for (let col = 0; col < size; col++) {
      const pixel = data[row * size + col]!; // 0–255
      const bit = pixel <= threshold ? 1 : 0;
      rowData.push(invert ? 1 - bit : bit);
    }
    pattern.push(rowData);
  }

  return pattern;
}

// ============================================================
// 工具：可视化 0/1 矩阵（用于调试）
// ============================================================

/** 将 0/1 矩阵打印为 ASCII，方便终端调试 */
export function printPattern(pattern: number[][]): void {
  for (const row of pattern) {
    console.log(row.map(v => (v === 1 ? '██' : '  ')).join(''));
  }
}
