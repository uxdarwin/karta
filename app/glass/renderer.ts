import { GlassError, type GlassStage } from './errors';
import { init, frame, surface, type Gpu } from 'vgpu';
import { loadGeometry } from './geometry';
import { createGlassScene } from './scene';
import { drawCover, type BackdropSource } from './backdrop';
import { normalizeParameters, type GlassParameters } from './parameters';

export interface RendererOptions {
  svgUrl?: string; backdrop: BackdropSource; parameters?: Partial<GlassParameters>;
  animate?: boolean; onStage?: (stage: GlassStage) => void; onError?: (error: unknown) => void;
}
export function createMonogramRenderer(canvas: HTMLCanvasElement, options: RendererOptions) {
  let disposed = false, preparing = false;
  let gpu: Gpu | undefined;
  let scene: ReturnType<typeof createGlassScene> | undefined;
  let raf = 0; let epoch = 0; let lastFrame = 0; let running = false;
  let p = normalizeParameters(options.parameters);
  let source = options.backdrop;
  const dispose = () => {
    if (disposed) return; disposed = true; cancelAnimationFrame(raf);
    if (!preparing) { scene?.destroy(); gpu?.dispose(); }
  };
  let stage: GlassStage = 'geometry';
  const enter = (next: GlassStage) => { stage = next; options.onStage?.(next); };
  const ready = (async () => {
    enter('geometry');
    const geometry = await loadGeometry(options.svgUrl);
    if (disposed) return;
    enter('device');
    const context = await init({ powerPreference: 'low-power' });
    if (disposed) { context.dispose(); return; } gpu = context;
    enter('surface');
    const format = navigator.gpu.getPreferredCanvasFormat();
    const output = surface(context, canvas, { format, dpr: [1, 1.5], alphaMode: 'premultiplied' });
    scene = createGlassScene(context, output, geometry, { colors: [format], sampleCount: 1 });
    context.onError(error => { if (!disposed) { dispose(); options.onError?.(new GlassError('render', error)); } });
    const buffer = document.createElement('canvas');
    const drawing = buffer.getContext('2d')!;
    let pending: Promise<void> | undefined; let backgroundError: unknown;
    const capture = async () => {
      try {
      const pixels = typeof source === 'function' ? await source() : source;
      if (disposed) return;
      buffer.width = output.size[0]; buffer.height = output.size[1];
      drawCover(drawing, pixels, buffer.width, buffer.height);
      // Reading forces a clean CORS check before attempting a GPU copy.
      drawing.getImageData(0, 0, 1, 1);
      scene!.uploadBackdrop(buffer);
      } catch (error) { throw new GlassError('backdrop', error); }
    };
    preparing = true;
    try { enter('shader'); await scene.prepare(); enter('backdrop'); await capture(); }
    finally { preparing = false; if (disposed) { scene.destroy(); context.dispose(); } }
    if (disposed) return;
    enter('render');
    const render = (now: number) => {
      if (disposed) return;
      if (now - lastFrame >= 1000 / 30 || !running) {
        const seconds = epoch ? (now - epoch) / 1000 : 0;
        try {
          if (backgroundError) throw backgroundError;
          const yaw = options.animate ? Math.sin(Math.min(seconds, 3) * Math.PI / 3) * .12 : p.yaw;
          frame(context, current => scene!.render(current, output, { ...p, yaw }, seconds));
          lastFrame = now;
          if (running && !pending) {
            pending = capture().catch(error => { backgroundError = error; }).finally(() => { pending = undefined; });
          }
        } catch (error) { dispose(); options.onError?.(error instanceof GlassError ? error : new GlassError('render', error)); return; }
      }
      if (running) raf = requestAnimationFrame(render);
    };
    render(performance.now());
    return () => { if (!disposed) { epoch = performance.now(); running = true; raf = requestAnimationFrame(render); } };
  })().catch(error => { dispose(); throw error instanceof GlassError ? error : new GlassError(stage, error); });
  return {
    ready, dispose,
    setParameters(values: Partial<GlassParameters>) { p = normalizeParameters({ ...p, ...values }); },
    setBackdrop(value: BackdropSource) { source = value; },
  };
}
