# Transparent SVG glass monogram

The invitation intro runs for three seconds after the renderer or SVG fallback becomes ready. Its background is an ordinary sibling canvas; the material contains no floor, fixed backdrop, warm color grading, bloom or baked reflection image. `/glass` is the development playground. The reference image guides clear glass, thickness and edge highlights only.

## Geometry and rendering

`public/monogram.svg` is unchanged from the supplied asset. `scripts/generate-sdf.ts` rasterizes it at 1024px with Resvg. `app/glass/geometry.ts` computes a Euclidean signed distance field with subpixel coverage correction. `public/monogram-sdf.png` stores signed distance in RG and original coverage in B. Default geometry is cached; a custom `svgUrl` is rasterized in the browser. This implementation assumes a square SVG viewBox.

The 2D field is extruded into a 3D SDF. Rounded edges inset the underlying shape before rounding, so bevel does not inflate the widest silhouette. Orthographic projection preserves the supplied frontal shape. Turning the object naturally changes its projected silhouette; contour comparison is intended at yaw zero. Original coverage antialiases the frontal outline.

WGSL is divided into `bindings`, `geometry`, `raymarch`, `compositing`, `optics`, and `entry` under `app/glass/wgsl/`. `scripts/shaders.mjs` assembles `glass.wgsl` and the TypeScript shader export; edit the fragments, not generated files. The ray marcher uses bounded traversal and finite-difference normals. Optics traces entry/exit refraction, up to three internal interfaces, Fresnel and thickness absorption. Neutral softbox proxies supply controllable highlights independently of the background. Outside the logo the surface writes transparent pixels, with premultiplied alpha for composition.

`scene.ts` owns textures and the single render pass. `renderer.ts` owns the transparent WebGPU surface, background updates, animation and resource cleanup. `GlassMonogram.tsx` provides the reusable React layer. `backdrop.ts` supplies cover mapping and optional DOM snapshots.

## Use over media or DOM

The browser cannot expose arbitrary DOM compositor pixels directly to a shader. Supply the actual background explicitly. It must cover the same rectangle as the glass layer, using centered `object-fit: cover` for media.

```tsx
'use client';
import { useState } from 'react';
import GlassMonogram from '@/app/glass/GlassMonogram';

export default function Example() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  return <div style={{ position: 'relative', height: 430 }}>
    <img src="/your-photo.jpg" alt="" onLoad={event => setImage(event.currentTarget)}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    <GlassMonogram backdrop={image} parameters={{ depth: .18, ior: 1.46 }} />
  </div>;
}
```

The project uses relative imports; adapt the import path to your file. Global glass styles are in `app/globals.css`.

For video, pass the `HTMLVideoElement` after `onLoadedData`. For canvas, pass the visible background canvas. Providers may return a canvas/image/video/ImageBitmap synchronously or asynchronously. Images and videos must be same-origin or have permissive CORS with `crossOrigin="anonymous"` set before loading. Missing or unreadable sources trigger the explicitly identified SVG fallback.

For DOM, create a stable provider with `createDomBackdrop(backgroundElement)`, then pass it as `backdrop`. The element should contain only the background; descendants marked `data-glass-layer` are excluded. Gradients and patterns can be painted into a canvas or captured from the DOM. DOM snapshots are best effort, refresh at most every 300ms by default, and do not reproduce cross-origin iframes, WebGL content or all CSS effects. Use direct video/canvas sources for moving backgrounds.

## Material parameters

All parameters are exposed in `/glass` and accepted by `GlassMonogram.parameters`.

| Parameter | Default | Purpose |
| --- | --- | --- |
| logoScale | 0.74 | Monogram size within the surface |
| depth | 0.18 | Extrusion thickness in model units |
| bevelRadius | 0.028 | Inward rounding, capped below half the depth |
| ior | 1.46 | Refractive index, clamped to 1–2 |
| roughness | 0.035 | Width/softness of highlight proxies |
| absorptionStrength | 0.12 | Thickness-dependent attenuation |
| tint | [0.98, 0.99, 1] | Linear RGB transmission tint |
| highlightStrength | 0.85 | Neutral proxy reflection intensity |
| distortionStrength | 1 | Refracted backdrop displacement multiplier |
| debugMode | glass | glass, svg, sdf or solid |
| overlay | false | Original SVG contour overlay |
| yaw | 0 | Horizontal rotation in radians |

The SVG mode uses original coverage, SDF mode visualizes signed distance, and solid mode shows opaque geometry. The original contour overlay makes shape errors visible without relying on subjective glass appearance. At IOR 1 with absorption disabled, the output reproduces the source backdrop exactly within the shape.

## Verification and limits

`npm run build` and `npm run typecheck` check the frontend. `npm run check:glass` uses real Node WebGPU rendering, readback and independent SVG rasterization. In this cloud workspace, run:

```sh
VGPU_CACHE_DIR=/workspace/.vgpu-cache XDG_CACHE_HOME=/workspace/.cache npm run check:glass
VGPU_CACHE_DIR=/workspace/.vgpu-cache XDG_CACHE_HOME=/workspace/.cache npm exec --no -- vgpu check app/glass/glass.wgsl --require-validation
```

The 320px frontal solid render overlaps the independently rasterized original by 99.31% IoU; solid versus diagnostic coverage reaches 99.99%. IOR-1 pixel error is zero. Checks also assert transparent corners, deterministic rendering, and changes in transmission when the actual background changes. Diagnostic PNGs are written to `/tmp/karta-glass-validation`.

`npm run check:browser` requires a running production server on port 3000, Chromium (or `CHROMIUM_PATH`) and ffmpeg. It exercises the three-second intro, replay/skip, diagnostic controls, DOM/gradient/pattern captures, local image/video sources, mobile widths and the no-JavaScript invitation. It deliberately disables browser WebGPU. Chromium in this cloud environment cannot initialize a stable GPU device; successful CPU WebGPU shader validation does not certify GPU browser playback or mobile frame rate.

This is a ray-marched extrusion, not a physically modeled mesh. Finite SDF resolution limits extremely fine details. Refraction samples a 2D background plane, and reflections use neutral lighting proxies rather than a reconstructed environment. Roughness broadens those proxies rather than integrating full microfacet scattering. Dispersion and spectral caustics are intentionally absent. Perspective, complex multiple scattering and thick overlapping geometry are outside this version. On unsupported or failed WebGPU, the exact SVG is shown with a clear status; it is not simulated glass. Rendering targets 30fps with device pixel ratio capped at 1.5; mobile GPU performance still requires device testing.

The original VGPU glass-sculpture example attribution remains in `app/glass/LICENSE`.
