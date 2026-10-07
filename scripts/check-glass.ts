// CPU-side validation of shader bindings and the five-pass render graph.
// Run with a TypeScript runner, e.g. npm exec --package=tsx -- tsx scripts/check-glass.ts.
// This does not substitute for visual checks on a WebGPU-capable browser.
import { readFileSync } from 'node:fs';
import { frame, init, target } from 'vgpu/mock';
import { createScene, DEFAULT_CONTROLS } from '../app/glass/scene';
async function check() {
  const gpu = await init();
  const output = target(gpu, { size: [390, 480], format: 'rgba8unorm' });
  const bytes = readFileSync('public/monogram-sdf.bin');
  const field = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const scene = createScene(gpu, output, { ...DEFAULT_CONTROLS, renderScale: 0.5 }, field);
  const errors: unknown[] = [];
  gpu.onError(error => errors.push(error));
  try {
    await scene.prepare(output);
    for (const time of [0, 1.5, 3]) {
      frame(gpu, current => scene.render(current, output, { yaw: 0, pitch: .025, radius: 4.8 }, DEFAULT_CONTROLS, {
        sculptureTime: time, clockTime: time, deltaTime: 1 / 30, light: { azimuth: -.65, elevation: .55 },
      }));
    }
    scene.resize([320, 420], 0.5);
    await gpu.settled();
    if (errors.length) throw new Error(errors.map(String).join('\n'));
    console.log('Glass render graph: 3 frames, resize and bindings passed (mock GPU).');
  } finally { scene.destroy(); gpu.dispose(); }
}
check().catch(error => { console.error(error); process.exitCode = 1; });
