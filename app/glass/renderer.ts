// Adapted from the VGPU glass-sculpture example.
// Original concept and visual design: Kazuyuki Chinda (@ckazu).
import { frame, init, surface, type Gpu } from 'vgpu';
import { createScene, DEFAULT_CONTROLS } from './scene';

export function createMonogramRenderer(canvas: HTMLCanvasElement, onError: () => void) {
  let disposed = false;
  let gpu: Gpu | undefined;
  let cleanupResize: (() => void) | undefined;
  let raf = 0;
  let started = 0;
  let preparing = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    cleanupResize?.();
    if (!preparing) gpu?.dispose();
  };
  const ready = (async () => {
    const response = await fetch('/monogram-sdf.bin');
    if (!response.ok) throw new Error('Cannot load monogram distance field');
    const field = await response.arrayBuffer();
    if (field.byteLength !== 512 * 512 * 4) throw new Error('Invalid monogram distance field');
    if (disposed) return;
    const context = await init({ powerPreference: 'low-power' });
    if (disposed) { context.dispose(); return; }
    gpu = context;
    context.onError(error => { if (!disposed) { console.warn('Glass renderer:', error); dispose(); onError(); } });
    const output = surface(context, canvas, { dpr: [1, 1.25] });
    const controls = { ...DEFAULT_CONTROLS, renderScale: 0.5 as const, dispersion: false, light: 'noir' as const };
    const scene = createScene(context, output, controls, field);
    preparing = true;
    try { await scene.prepare(output); } finally { preparing = false; if (disposed) context.dispose(); }
    if (disposed) return;
    cleanupResize = output.onResize(() => scene.resize(output.size, controls.renderScale));
    const render = (now: number) => {
      if (disposed) return;
      const seconds = started ? Math.min((now - started) / 1000, 3) : 0;
      try {
        frame(context, current => scene.render(current, output, { yaw: 0, pitch: 0.025, radius: 4.8 }, controls, {
          sculptureTime: seconds, clockTime: seconds, deltaTime: 1 / 30, light: { azimuth: -0.65 + seconds * 0.55, elevation: 0.55 },
        }));
      } catch (error) { console.warn('Glass frame:', error); dispose(); onError(); return; }
      // A static first frame is prepared before the three-second timeline begins.
      if (started && seconds < 3) raf = requestAnimationFrame(render);
    };
    render(performance.now());
    return () => { if (!disposed) { started = performance.now(); raf = requestAnimationFrame(render); } };
  })();
  return { ready, dispose };
}
