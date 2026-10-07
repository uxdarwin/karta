# Karta

Mobile wedding invitation for Darwin & Andrea. Next.js, React, TypeScript. Maximum width: 480px.

Requires Node 20.9+ (validated with Node 24). Run `npm ci`, then `npm run dev`. For production, run `npm run build` and `npm start`. TypeScript: `npm run typecheck`.

Content is in `app/page.tsx`; RSVP preview is in `app/rsvp.tsx`. Dates, times, venues, policies, planner contact and artwork are placeholders. April 11, Sunday is displayed without assuming a year.

Frontend only, no authentication or backend. RSVP responses are not saved or sent. Replace placeholder details and connect RSVP before sharing with guests.

## Monogram intro

The invitation opens with a three-second intro (after graphics initialization), then reveals the hero. The floating **Intro · 3 s / Invitación** control replays or skips it. This control is temporary for design review.

The glass renderer adapts the supplied VGPU glass-sculpture example (concept/design by Kazuyuki Chinda, @ckazu; MIT license included in `app/glass/LICENSE`). It ray-marches a shallow extrusion of the exact uploaded SVG using a precomputed 512×512 float32 signed distance field, with studio reflections, refraction and bloom. GPU resolution is capped for mobile performance. WebGPU is dynamically imported and disposed on completion, skip, replay, errors and unmount. Unsupported browsers, reduced motion or initialization over 1.8 seconds use a CSS/SVG fallback. Reduced motion uses a static monogram.

`public/monogram.svg` is the original supplied asset. `public/monogram-sdf.bin` is its derived distance field: SVG rasterized at 512px, alpha threshold 127, `(outside EDT - inside EDT) * 2 / 512`, serialized as little-endian float32. Regenerate it if the SVG changes. WGSL sources live in `app/glass`; `scripts/shaders.mjs` embeds them for Next.js before dev/build.
