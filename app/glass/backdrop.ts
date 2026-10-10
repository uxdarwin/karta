/** The browser cannot read its DOM compositor from WebGPU. Sources must be explicit. */
export type BackdropPixels = HTMLCanvasElement | HTMLImageElement | HTMLVideoElement | ImageBitmap;
export type BackdropSource = BackdropPixels | (() => BackdropPixels | Promise<BackdropPixels>);

export function sourceSize(source: BackdropPixels): [number, number] {
  if (source instanceof HTMLVideoElement) return [source.videoWidth, source.videoHeight];
  if (source instanceof HTMLImageElement) return [source.naturalWidth, source.naturalHeight];
  return [source.width, source.height];
}

/** Same object-fit: cover mapping for the visible background and the refracted texture. */
export function drawCover(context: CanvasRenderingContext2D, source: BackdropPixels, width: number, height: number) {
  const [sw, sh] = sourceSize(source);
  if (!sw || !sh) throw new Error('Backdrop media is not ready');
  const scale = Math.max(width / sw, height / sh);
  context.drawImage(source, (width - sw * scale) / 2, (height - sh * scale) / 2, sw * scale, sh * scale);
}

/** Best-effort DOM snapshot, never capture the glass canvas itself.
 * Caller owns refresh cadence. Not a live screenshot of arbitrary browser content:
 * cross-origin assets, iframe content, WebGL canvases and some CSS are restricted.
 * Use direct media sources for video and rapidly animated canvases.
 */
export function createDomBackdrop(element: HTMLElement, intervalMs = 300): () => Promise<HTMLCanvasElement> {
  let last: HTMLCanvasElement | undefined;
  let pending: Promise<HTMLCanvasElement> | undefined;
  let capturedAt = -Infinity;
  return async () => {
    if (last && performance.now() - capturedAt < intervalMs) return last;
    if (!pending) {
      pending = import('html-to-image').then(({ toCanvas }) => toCanvas(element, {
        pixelRatio: 1, skipFonts: true, cacheBust: false,
        filter: node => !(node instanceof HTMLElement && node.hasAttribute('data-glass-layer')),
      })).then(canvas => { last = canvas; capturedAt = performance.now(); return canvas; })
        .finally(() => { pending = undefined; });
    }
    return pending;
  };
}
