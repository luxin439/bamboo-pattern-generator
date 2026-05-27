export type {
  BambooStrip,
  CrossingMembrane,
  MembraneState,
  StripType,
  WeaveMatrix,
} from './core/types';

export {
  extractWarpLayer,
  extractWeftLayer,
  getVisibleColor,
  patternToWeaveMatrix,
  toColorMatrix,
  validateWeaveMatrix,
} from './core/weave';

export { imageToPattern, printPattern } from './core/binarizer';
export type { BinarizeOptions } from './core/binarizer';

export { enforceMaxRunLength, countFlips } from './core/optimizer';
export type { OptimizeOptions } from './core/optimizer';

export {
  renderSimpleWeave,
  imageToPatternMatrix,
  loadImageFromFile,
} from './renderer/canvas';
export type { WeaveRenderOptions } from './renderer/canvas';

export { shadeColor, hexToRgb } from './renderer/color';
