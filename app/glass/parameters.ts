export const DEBUG_MODES = ['glass', 'svg', 'sdf', 'solid'] as const;
export type DebugMode = typeof DEBUG_MODES[number];
export interface GlassParameters {
  logoScale: number; depth: number; bevelRadius: number; ior: number;
  roughness: number; absorptionStrength: number; tint: readonly [number, number, number];
  highlightStrength: number; distortionStrength: number; debugMode: DebugMode;
  overlay: boolean; yaw: number;
}
export const DEFAULT_GLASS: GlassParameters = {
  logoScale: .74, depth: .18, bevelRadius: .028, ior: 1.46,
  roughness: .035, absorptionStrength: .12, tint: [.98, .99, 1],
  highlightStrength: .85, distortionStrength: 1, debugMode: 'glass', overlay: false, yaw: 0,
};
export function normalizeParameters(values: Partial<GlassParameters> = {}): GlassParameters {
  const p = { ...DEFAULT_GLASS, ...values };
  const clamp = (v: number, min: number, max: number, fallback: number) => Math.max(min, Math.min(max, Number.isFinite(v) ? v : fallback));
  p.logoScale = clamp(p.logoScale, .2, .94, .74);
  p.depth = clamp(p.depth, .015, .4, .18);
  p.bevelRadius = clamp(p.bevelRadius, 0, p.depth / 2 - .0001, .028);
  p.ior = clamp(p.ior, 1, 2, 1.46); p.roughness = clamp(p.roughness, 0, .5, .035);
  p.absorptionStrength = clamp(p.absorptionStrength, 0, 3, .12);
  p.highlightStrength = clamp(p.highlightStrength, 0, 3, .85);
  p.distortionStrength = clamp(p.distortionStrength, 0, 3, 1);
  p.yaw = clamp(p.yaw, -.65, .65, 0);
  p.tint = p.tint.map(v => clamp(v, 0, 1, 1)) as [number, number, number];
  p.debugMode = DEBUG_MODES.includes(p.debugMode) ? p.debugMode : 'glass';
  return p;
}
