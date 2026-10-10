import { effect, sampler, texture, type Gpu, type Frame, type Target } from 'vgpu';
import { glassWgsl } from './shaders';
import { DEBUG_MODES, normalizeParameters, type GlassParameters } from './parameters';

/** Isolated volume, one transparent pass. There is deliberately no background/floor pass. */
export function createGlassScene(gpu: Gpu, output: Target, geometry: { size: number; rgba: Uint8Array }) {
  const logo = texture(gpu, { kind: '2d', size: [geometry.size, geometry.size], format: 'rgba8unorm', usage: ['texture_binding', 'copy_dst'] });
  gpu.gpu.queue.writeTexture({ texture: logo.gpu }, geometry.rgba as Uint8Array<ArrayBuffer>, { bytesPerRow: geometry.size * 4 }, [geometry.size, geometry.size]);
  let background = texture(gpu, { kind: '2d', size: [1, 1], format: 'rgba8unorm', usage: ['texture_binding', 'copy_dst', 'render_attachment'] });
  gpu.gpu.queue.writeTexture({ texture: background.gpu }, new Uint8Array([230, 233, 225, 255]), { bytesPerRow: 4 }, [1, 1]);
  const linear = sampler(gpu, { minFilter: 'linear', magFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
  const glass = effect(gpu, glassWgsl, { label: 'floating-glass-monogram' });
  glass.set({ logo_sdf: logo, backdrop: background, backdrop_sampler: linear });
  let destroyed = false;
  let backgroundSize: readonly [number, number] = [1, 1];
  return {
    prepare: () => glass.compile(output),
    uploadBackdrop(source: HTMLCanvasElement) {
      const size: [number, number] = [source.width, source.height];
      if (size[0] !== backgroundSize[0] || size[1] !== backgroundSize[1]) {
        const previous = background;
        background = texture(gpu, { kind: '2d', size, format: 'rgba8unorm', usage: ['texture_binding', 'copy_dst', 'render_attachment'] });
        glass.set({ backdrop: background });
        previous.destroy(); backgroundSize = size;
      }
      gpu.gpu.queue.copyExternalImageToTexture({ source }, { texture: background.gpu, premultipliedAlpha: false }, size);
    },
    // Deterministic raw upload is also useful for headless tests and procedural backgrounds.
    uploadPixels(rgba: Uint8Array, width: number, height: number) {
      if (backgroundSize[0] !== width || backgroundSize[1] !== height) {
        const previous = background;
        background = texture(gpu, { kind: '2d', size: [width, height], format: 'rgba8unorm', usage: ['texture_binding', 'copy_dst', 'render_attachment'] });
        glass.set({ backdrop: background }); previous.destroy(); backgroundSize = [width, height];
      }
      gpu.gpu.queue.writeTexture({ texture: background.gpu }, rgba as Uint8Array<ArrayBuffer>, { bytesPerRow: width * 4 }, [width, height]);
    },
    render(current: Frame, target: Target, values: Partial<GlassParameters>, time = 0) {
      if (destroyed) return;
      const p = normalizeParameters(values);
      glass.set({ params: {
        resolution: target.size, logo_scale: p.logoScale, depth: p.depth, bevel: p.bevelRadius,
        ior: p.ior, roughness: p.roughness, absorption: p.absorptionStrength,
        highlight: p.highlightStrength, distortion: p.distortionStrength, debug_mode: DEBUG_MODES.indexOf(p.debugMode), overlay: p.overlay ? 1 : 0,
        yaw: p.yaw, time, padding: [0, 0], tint: [...p.tint, 0],
      } });
      current.pass({ target, clear: [0, 0, 0, 0] }, pass => pass.draw(glass));
    },
    destroy() { if (destroyed) return; destroyed = true; logo.destroy(); background.destroy(); },
  };
}
