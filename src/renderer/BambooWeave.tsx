'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  renderSimpleWeave,
  drawHoverOverlay,
  getCellInfo,
  type WeaveRenderOptions,
  type CellInfo,
} from './canvas';

// ============================================================
// React 组件 — 竹编图案渲染
// ============================================================

export interface BambooWeaveProps extends WeaveRenderOptions {
  pattern: number[][];
  width?: number | string;
  height?: number | string;
  onCellClick?: (r: number, c: number) => void;
}

export const BambooWeave: React.FC<BambooWeaveProps> = ({
  pattern,
  cellSize = 48,
  gap,
  shadowIntensity,
  showTexture,
  warpColor,
  weftColor,
  width,
  height,
  onCellClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverInfo, setHoverInfo] = useState<CellInfo | null>(null);

  const rows = pattern.length;
  const cols = pattern[0]?.length ?? 0;

  // ---- 全量渲染 ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rows === 0 || cols === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const pw = cols * cellSize;
    const ph = rows * cellSize;

    canvas.width = pw * dpr;
    canvas.height = ph * dpr;
    canvas.style.width = `${pw}px`;
    canvas.style.height = `${ph}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    renderSimpleWeave(ctx, pattern, {
      cellSize,
      gap,
      shadowIntensity,
      showTexture,
      warpColor,
      weftColor,
    });

    // 重绘悬停层
    if (hoverInfo) {
      drawHoverOverlay(ctx, hoverInfo.col, hoverInfo.row, cellSize, hoverInfo);
    }
  }, [pattern, cellSize, gap, shadowIntensity, showTexture, warpColor, weftColor, rows, cols, hoverInfo]);

  // ---- 鼠标移动 — 计算悬停格 ----
  const handleMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / cellSize);
    const row = Math.floor((e.clientY - rect.top) / cellSize);
    const info = getCellInfo(pattern, row, col);
    setHoverInfo(prev =>
      prev?.row === row && prev?.col === col ? prev : info,
    );
    canvasRef.current.title = info ? `[${row},${col}] ${info.label}` : '';
  }, [pattern, cellSize]);

  const handleLeave = useCallback(() => {
    setHoverInfo(null);
  }, []);

  const handleClick = onCellClick
    ? (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const col = Math.floor((e.clientX - rect.left) / cellSize);
        const row = Math.floor((e.clientY - rect.top) / cellSize);
        if (row >= 0 && row < rows && col >= 0 && col < cols) {
          onCellClick(row, col);
        }
      }
    : undefined;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: width ?? cols * cellSize,
          height: height ?? rows * cellSize,
          cursor: 'crosshair',
        }}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onClick={handleClick}
      />
      {hoverInfo && (
        <div
          style={{
            position: 'absolute',
            bottom: -26,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
            fontSize: 11,
            padding: '2px 10px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          [{hoverInfo.row}, {hoverInfo.col}] {hoverInfo.label}
        </div>
      )}
    </div>
  );
};
