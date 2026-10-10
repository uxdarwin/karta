# Karta

Mobile wedding invitation for Darwin & Andrea. Next.js, React, TypeScript. Maximum width: 480px.

Requires Node 20.9+ (validated with Node 24). Run `npm ci`, then `npm run dev`. For production, run `npm run build` and `npm start`. TypeScript: `npm run typecheck`.

Content is in `app/page.tsx`; RSVP preview is in `app/rsvp.tsx`. Dates, times, venues, policies, planner contact and artwork are placeholders. April 11, Sunday is displayed without assuming a year.

Frontend only, no authentication or backend. RSVP responses are not saved or sent. Replace placeholder details and connect RSVP before sharing with guests.

## Monogram intro

The invitation opens with a three-second intro (after graphics initialization), then reveals the hero. The floating **Intro · 3 s / Invitación** control replays or skips it. This control is temporary for design review.

The glass renderer adapts the supplied VGPU glass-sculpture example (concept/design by Kazuyuki Chinda, @ckazu; MIT license included in `app/glass/LICENSE`). It ray-marches a shallow extrusion of the exact uploaded SVG using a precomputed 512×512 float32 signed distance field, with studio reflections, refraction and bloom. GPU resolution is capped for mobile performance. WebGPU is dynamically imported and disposed on completion, skip, replay, errors and unmount. Unsupported browsers, reduced motion or initialization over 1.8 seconds use a CSS/SVG fallback. Reduced motion uses a static monogram.

`public/monogram.svg` is the original supplied asset. `public/monogram-sdf.bin` is its derived distance field: SVG rasterized at 512px, alpha threshold 127, `(outside EDT - inside EDT) * 2 / 512`, serialized as little-endian float32. Regenerate it if the SVG changes. WGSL sources live in `app/glass`; `scripts/shaders.mjs` embeds them for Next.js before dev/build.

## VGPU tools for development

`vgpu` already includes its CLI; Karta uses npm and its existing lockfile. Run `npm run vgpu -- --help`, `npm run vgpu -- docs cat getting-started.md`, or `npm run vgpu:doctor`. The setup prompt on vgpu.sh is an instruction to an agent, not a package to install.

Codex project MCP configuration is saved in `.codex/config.toml`. The local `vgpu` server uses the installed package's documentation and examples, and its initialization and documentation lookup have been tested. It is read-only. Codex must load this configuration in a new session; writing the file does not add tools to the running chat. The hosted `vgpu-hosted` server is registered but disabled until network access to `vgpu.sh` is applied, after which set `enabled = true`. It serves current hosted docs; use the local server as the authority for the project's version. Project configuration avoids requiring global installation on your computer.

In this cloud environment, the verified portable CPU renderer is cached at `/workspace/.vgpu-cache`. Use `VGPU_CACHE_DIR=/workspace/.vgpu-cache npm run vgpu:doctor`. To reproduce its installation use `NODE_USE_ENV_PROXY=1 VGPU_CACHE_DIR=/workspace/.vgpu-cache npm exec --no -- vgpu install-software-renderer`. Its SHA-256 checks remain enabled. The doctor render and device-backed validation of `app/glass/sculpture.wgsl` passed.

A 160×200 frame of the existing five-pass monogram scene was also rendered and read back through real CPU WebGPU. This verifies the render graph executes; it does not certify browser playback or final visual quality.
