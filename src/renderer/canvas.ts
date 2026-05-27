// ============================================================
// Canvas 竹编渲染器 — Tile-based 互斥绘制引擎
// ============================================================
//
// 核心规则：
//   pattern[r][c] === 1 → 横条在上，格子内只有横色块 + 横纹理 + 左右阴影
//   pattern[r][c] === 0 → 竖条在上，格子内只有竖色块 + 竖纹理 + 上下阴影
//
//   绝无任何跨格长线、绝无 lineTo 延续、每格独立渲染不依赖相邻格。
// ============================================================

export interface WeaveRenderOptions {
  cellSize?: number;
  gap?: number;
  shadowIntensity?: number;
  showTexture?: boolean;
  warpColor?: string;
  weftColor?: string;
}

export function renderSimpleWeave(
  ctx: CanvasRenderingContext2D,
  pattern: number[][],
  options: WeaveRenderOptions = {},
): void {
  const rows = pattern.length;
  if (rows === 0) return;
  const cols = pattern[0]!.length;
  if (cols === 0) return;

  const S  = options.cellSize ?? 48;
  const G  = options.gap ?? 2;
  const SD = options.shadowIntensity ?? 0.5;
  const TX = options.showTexture ?? true;
  const WC = options.warpColor ?? '#E6C594';   // 天然竹黄（竖）
  const FC = options.weftColor ?? '#D4A574';   // 天然竹色（横）

  // 基底
  ctx.fillStyle = '#1a120b';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = pattern[r]![c]!;
      const x = c * S;
      const y = r * S;

      // ======== 场景 A：横条在上（纬浮）========
      if (v === 1) {
        // ── 底色块 ──
        ctx.fillStyle = FC;
        ctx.fillRect(x, y + G / 2, S, S - G);

        // ── 左右边缘投影（模拟横条压在竖条上）──
        if (SD > 0) {
          const a = Math.min(SD * 0.55, 0.45);
          const g = ctx.createLinearGradient(x, 0, x + S, 0);
          g.addColorStop(0,    `rgba(0,0,0,${a})`);
          g.addColorStop(0.08, 'rgba(0,0,0,0)');
          g.addColorStop(0.92, 'rgba(0,0,0,0)');
          g.addColorStop(1,    `rgba(0,0,0,${a})`);
          ctx.fillStyle = g;
          ctx.fillRect(x, y + G / 2, S, S - G);
        }

        // ── 横向纤维纹理（只用 fillRect 画短横线段，不用 moveTo/lineTo）──
        if (TX) {
          ctx.fillStyle = 'rgba(255,255,255,0.07)';
          const tTop = y + G / 2 + 3;            // 纹理起始 Y
          const tBot = y + S - G / 2 - 2;        // 纹理结束 Y
          for (let ly = tTop; ly < tBot; ly += 3) {
            ctx.globalAlpha = (ly % 6 === 0) ? 0.12 : 0.05;
            // 用 fillRect 画一条 1px 高的水平线段，完全限在格子内部
            ctx.fillRect(x + 1, ly, S - 2, 1);
          }
          ctx.globalAlpha = 1;
        }

        // ── 红色上下边缘线（横条外露边界）──
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y + G / 2);
        ctx.lineTo(x + S, y + G / 2);
        ctx.moveTo(x, y + S - G / 2);
        ctx.lineTo(x + S, y + S - G / 2);
        ctx.stroke();

      // ======== 场景 B：竖条在上（经浮）========
      } else {
        // ── 底色块 ──
        ctx.fillStyle = WC;
        ctx.fillRect(x + G / 2, y, S - G, S);

        // ── 上下边缘投影 ──
        if (SD > 0) {
          const a = Math.min(SD * 0.55, 0.45);
          const g = ctx.createLinearGradient(0, y, 0, y + S);
          g.addColorStop(0,    `rgba(0,0,0,${a})`);
          g.addColorStop(0.08, 'rgba(0,0,0,0)');
          g.addColorStop(0.92, 'rgba(0,0,0,0)');
          g.addColorStop(1,    `rgba(0,0,0,${a})`);
          ctx.fillStyle = g;
          ctx.fillRect(x + G / 2, y, S - G, S);
        }

        // ── 纵向纤维纹理（只用 fillRect 画短竖线段）──
        if (TX) {
          ctx.fillStyle = 'rgba(0,0,0,0.05)';
          const tLft = x + G / 2 + 3;
          const tRgt = x + S - G / 2 - 2;
          for (let lx = tLft; lx < tRgt; lx += 3) {
            ctx.globalAlpha = (lx % 6 === 0) ? 0.10 : 0.04;
            ctx.fillRect(lx, y + 1, 1, S - 2);
          }
          ctx.globalAlpha = 1;
        }

        // ── 红色左右边缘线（竖条外露边界）──
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + G / 2, y);
        ctx.lineTo(x + G / 2, y + S);
        ctx.moveTo(x + S - G / 2, y);
        ctx.lineTo(x + S - G / 2, y + S);
        ctx.stroke();
      }
    }
  }
}

// ============================================================
// 实物呈现渲染 — 天然竹篾物理质感
// ============================================================

export function renderPhysicalWeave(
  ctx: CanvasRenderingContext2D,
  pattern: number[][],
  options: WeaveRenderOptions = {},
): void {
  const rows = pattern.length;
  if (rows === 0) return;
  const cols = pattern[0]!.length;
  if (cols === 0) return;

  const S  = options.cellSize ?? 48;
  const G  = options.gap ?? 2;
  const SD = options.shadowIntensity ?? 0.5;
  const TX = options.showTexture ?? true;
  // 实物模块使用天然竹篾色系，忽略用户颜色选取
  const WC = '#C4A67A';   // 竹青（竖）
  const FC = '#D4B896';   // 篾黄（横）

  // 暖色深底
  ctx.fillStyle = '#15100b';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = pattern[r]![c]!;
      const x = c * S;
      const y = r * S;

      if (v === 1) {
        // ════════ 横条在上（纬浮）════════

        // ── Gap 透光：缝隙处隐约透出下方竖条的暗影 ──
        ctx.globalAlpha = 0.12 * Math.sqrt(SD);
        ctx.fillStyle = WC;
        ctx.fillRect(x, y, S, G / 2);
        ctx.fillRect(x, y + S - G / 2, S, G / 2);
        ctx.globalAlpha = 1;

        // ── 暗-亮-暗 竹篾弧度渐变（模拟竹条微鼓的曲面）──
        const grad = ctx.createLinearGradient(x, y + G / 2, x, y + S - G / 2);
        grad.addColorStop(0,   '#A8845C');
        grad.addColorStop(0.2, '#DFC49C');
        grad.addColorStop(0.5, '#D4B896');
        grad.addColorStop(0.8, '#DFC49C');
        grad.addColorStop(1,   '#A8845C');

        // ── shadowBlur 物理压痕阴影（向下方投射到竖条上）──
        ctx.save();
        ctx.shadowColor = `rgba(0,0,0,${0.3 + SD * 0.35})`;
        ctx.shadowBlur  = 4 + SD * 6;
        ctx.shadowOffsetY = 2 + SD * 3;
        ctx.fillStyle = grad;
        ctx.fillRect(x, y + G / 2, S, S - G);
        ctx.restore();

        // ── 竹篾横向纤维纹理 ──
        if (TX) {
          ctx.fillStyle = 'rgba(180,150,120,0.07)';
          for (let ly = y + G / 2 + 3; ly < y + S - G / 2 - 2; ly += 2) {
            ctx.fillRect(x + 2, ly, S - 4, 1);
          }
        }
      } else {
        // ════════ 竖条在上（经浮）════════

        // ── Gap 透光：缝隙处隐约透出右方横条的暗影 ──
        ctx.globalAlpha = 0.12 * Math.sqrt(SD);
        ctx.fillStyle = FC;
        ctx.fillRect(x, y, G / 2, S);
        ctx.fillRect(x + S - G / 2, y, G / 2, S);
        ctx.globalAlpha = 1;

        // ── 暗-亮-暗 竹篾弧度渐变 ──
        const grad = ctx.createLinearGradient(x + G / 2, y, x + S - G / 2, y);
        grad.addColorStop(0,   '#92744E');
        grad.addColorStop(0.2, '#CCB48C');
        grad.addColorStop(0.5, '#C4A67A');
        grad.addColorStop(0.8, '#CCB48C');
        grad.addColorStop(1,   '#92744E');

        // ── shadowBlur 物理压痕阴影（左右双向）──
        // 向右投射
        ctx.save();
        ctx.shadowColor = `rgba(0,0,0,${0.3 + SD * 0.35})`;
        ctx.shadowBlur  = 4 + SD * 6;
        ctx.shadowOffsetX = 2 + SD * 3;
        ctx.fillStyle = grad;
        ctx.fillRect(x + G / 2, y, S - G, S);
        ctx.restore();

        // 向左投射（二次绘制仅用于阴影，fill 被覆盖无影响）
        ctx.save();
        ctx.shadowColor = `rgba(0,0,0,${0.3 + SD * 0.35})`;
        ctx.shadowBlur  = 4 + SD * 6;
        ctx.shadowOffsetX = -(2 + SD * 3);
        ctx.fillStyle = grad;
        ctx.fillRect(x + G / 2, y, S - G, S);
        ctx.restore();

        // ── 竹篾纵向纤维纹理 ──
        if (TX) {
          ctx.fillStyle = 'rgba(150,120,90,0.07)';
          for (let lx = x + G / 2 + 3; lx < x + S - G / 2 - 2; lx += 2) {
            ctx.fillRect(lx, y + 2, 1, S - 4);
          }
        }
      }
    }
  }
}

// ============================================================
// 悬停交互
// ============================================================

export interface CellInfo {
  row: number;
  col: number;
  value: number;
  label: string;
}

export function getCellInfo(pattern: number[][], row: number, col: number): CellInfo | null {
  if (row < 0 || row >= pattern.length) return null;
  const rr = pattern[row]!;
  if (col < 0 || col >= rr.length) return null;
  const v = rr[col]!;
  return { row, col, value: v, label: v === 1 ? '横条在上（纬浮）' : '竖条在上（经浮）' };
}

export function drawHoverOverlay(
  ctx: CanvasRenderingContext2D,
  col: number, row: number,
  cellSize: number,
  info: CellInfo,
): void {
  const x = col * cellSize;
  const y = row * cellSize;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,200,0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
  ctx.restore();

  ctx.save();
  const text = `[${row},${col}] ${info.label}`;
  ctx.font = '11px monospace';
  const m = ctx.measureText(text);
  const tx = x + 4;
  const ty = y + 14;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(tx - 2, ty - 11, m.width + 4, 16);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, tx, ty);
  ctx.restore();
}

// ============================================================
// 图片管线
// ============================================================

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(img.src); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('加载失败: ' + file.name)); };
    img.src = URL.createObjectURL(file);
  });
}

export function imageToPatternMatrix(
  source: HTMLImageElement | HTMLCanvasElement,
  gridSize: number,
  threshold: number,
): number[][] {
  const c = document.createElement('canvas');
  c.width = c.height = gridSize;
  const cx = c.getContext('2d')!;
  cx.drawImage(source, 0, 0, gridSize, gridSize);
  const d = cx.getImageData(0, 0, gridSize, gridSize).data;
  const p: number[][] = [];
  for (let r = 0; r < gridSize; r++) {
    const row: number[] = [];
    for (let cc = 0; cc < gridSize; cc++) {
      const i = (r * gridSize + cc) * 4;
      row.push((d[i]! + d[i + 1]! + d[i + 2]!) / 3 <= threshold ? 1 : 0);
    }
    p.push(row);
  }
  return p;
}
