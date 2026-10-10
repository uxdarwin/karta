# Karta

Mobile wedding invitation for Darwin & Andrea. Next.js, React, TypeScript. Maximum width: 480px.

Requires Node 20.9+ (validated with Node 24). Run `npm ci`, then `npm run dev`. For production, run `npm run build` and `npm start`. TypeScript: `npm run typecheck`.

Content is in `app/page.tsx`; RSVP preview is in `app/rsvp.tsx`. Dates, times, venues, policies, planner contact and artwork are placeholders. April 11, Sunday is displayed without assuming a year.

Frontend only, no authentication or backend. RSVP responses are not saved or sent. Replace placeholder details and connect RSVP before sharing with guests.

## Monogram intro

The invitation opens with a three-second intro (after graphics initialization), then reveals the hero. The floating **Intro · 3 s / Invitación** control replays or skips it. This control is temporary for design review.

The transparent glass layer extrudes the exact uploaded SVG from a 1024×1024 signed distance field. Its inward bevel preserves the silhouette. Refraction samples the supplied background; independent neutral reflection proxies provide highlights without a floor or baked scene. Unsupported WebGPU uses the original SVG. Reduced motion disables rotation.

Open `/glass` (the floating **Cristal** link) to compare original SVG, SDF, opaque geometry and glass. Try colors, gradients, patterns, images, video and DOM content, adjust the material, and overlay the original contour. Uploaded media stays in your browser.

See [Glass monogram documentation](docs/GLASS_MONOGRAM.md) for component usage, parameter defaults, architecture, verification and limitations. `npm run dev` and `npm run build` regenerate the SDF and assemble the shader automatically.

## VGPU tools for development

`vgpu` already includes its CLI; Karta uses npm and its existing lockfile. Run `npm run vgpu -- --help`, `npm run vgpu -- docs cat getting-started.md`, or `npm run vgpu:doctor`. The setup prompt on vgpu.sh is an instruction to an agent, not a package to install.

Codex project MCP configuration is saved in `.codex/config.toml`. The local `vgpu` server uses the installed package's documentation and examples, and its initialization and documentation lookup have been tested. It is read-only. Codex must load this configuration in a new session; writing the file does not add tools to the running chat. The hosted `vgpu-hosted` server is registered but disabled until network access to `vgpu.sh` is applied, after which set `enabled = true`. It serves current hosted docs; use the local server as the authority for the project's version. Project configuration avoids requiring global installation on your computer.

In this cloud environment, the verified portable CPU renderer is cached at `/workspace/.vgpu-cache`. Use `VGPU_CACHE_DIR=/workspace/.vgpu-cache npm run vgpu:doctor`. To reproduce its installation use `NODE_USE_ENV_PROXY=1 VGPU_CACHE_DIR=/workspace/.vgpu-cache npm exec --no -- vgpu install-software-renderer`. Its SHA-256 checks remain enabled. The doctor render and device-backed validation of `app/glass/glass.wgsl` passed.

Run `npm run check:glass` with the renderer cache configured to validate actual shader pixels. Run `npm run check:browser` against a server at localhost:3000 to validate the three-second timeline and controls; this test requires Chromium and ffmpeg and deliberately exercises the SVG fallback.
