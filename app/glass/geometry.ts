/** SVG raster → exact squared Euclidean distance transform → signed field.
 * Coordinates stay in the original SVG viewBox; paths are never repositioned.
 */
export const SDF_SIZE = 1024;

function edtLine(input: Float64Array, output: Float64Array, size: number) {
  const sites = new Int32Array(size);
  const bounds = new Float64Array(size + 1);
  let count = 0;
  sites[0] = 0; bounds[0] = -Infinity; bounds[1] = Infinity;
  for (let q = 1; q < size; q++) {
    let intersection = 0;
    do {
      const site = sites[count];
      intersection = ((input[q] + q * q) - (input[site] + site * site)) / (2 * (q - site));
      if (intersection > bounds[count]) break;
      count--;
    } while (count >= 0);
    count++; sites[count] = q; bounds[count] = intersection; bounds[count + 1] = Infinity;
  }
  count = 0;
  for (let q = 0; q < size; q++) {
    while (bounds[count + 1] < q) count++;
    output[q] = (q - sites[count]) ** 2 + input[sites[count]];
  }
}

function distanceTransform(alpha: Uint8Array, size: number, toInside: boolean) {
  const result = new Float64Array(size * size);
  const line = new Float64Array(size), out = new Float64Array(size);
  // Finite infinity avoids NaN intersections in rows with no feature pixels.
  const infinity = size * size * 8;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) line[x] = (alpha[y * size + x] >= 128) === toInside ? 0 : infinity;
    edtLine(line, out, size);
    for (let x = 0; x < size; x++) result[y * size + x] = out[x];
  }
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) line[y] = result[y * size + x];
    edtLine(line, out, size);
    for (let y = 0; y < size; y++) result[y * size + x] = Math.sqrt(out[y]);
  }
  return result;
}

export function generateDistanceField(alpha: Uint8Array, size: number) {
  if (alpha.length !== size * size) throw new Error('Invalid SVG raster size');
  if (!alpha.some(value => value >= 128) || alpha.every(value => value >= 128)) throw new Error('SVG needs a nonempty shape and transparent margins');
  const outside = distanceTransform(alpha, size, true);
  const inside = distanceTransform(alpha, size, false);
  const field = new Float32Array(size * size);
  for (let i = 0; i < field.length; i++) {
    // Preserve antialiased coverage at the boundary, without inflating the contour.
    const coverage = alpha[i] / 255;
    const pixels = coverage > 0 && coverage < 1 ? 0.5 - coverage : coverage >= 0.5 ? -inside[i] + 0.5 : outside[i] - 0.5;
    field[i] = pixels * 2 / size;
  }
  return field;
}

/** RG stores a signed 16-bit distance; B preserves source SVG alpha for diagnostics. */
export function packDistanceField(field: Float32Array, alpha: Uint8Array) {
  const rgba = new Uint8Array(field.length * 4);
  for (let i = 0; i < field.length; i++) {
    const encoded = Math.round(Math.max(0, Math.min(1, field[i] / 2 + 0.5)) * 65535);
    rgba[i * 4] = encoded >> 8; rgba[i * 4 + 1] = encoded & 255;
    rgba[i * 4 + 2] = alpha[i]; rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

export async function rasterizeSvg(url: string, size = SDF_SIZE) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Cannot load SVG geometry');
  const blob = new Blob([await response.text()], { type: 'image/svg+xml' });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image(); image.src = objectUrl; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(image, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size).data;
    const alpha = new Uint8Array(size * size);
    for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3];
    return { rgba: packDistanceField(generateDistanceField(alpha, size), alpha), size };
  } finally { URL.revokeObjectURL(objectUrl); }
}

let defaultGeometry: Promise<{ rgba: Uint8Array; size: number }> | undefined;
export function loadGeometry(svgUrl = '/monogram.svg') {
  if (svgUrl !== '/monogram.svg') return rasterizeSvg(svgUrl);
  return defaultGeometry ??= (async () => {
    const response = await fetch('/monogram-sdf.png');
    if (!response.ok) throw new Error('Cannot load monogram SDF');
    const image = await createImageBitmap(await response.blob(), { colorSpaceConversion: 'none' });
    try {
      if (image.width !== SDF_SIZE || image.height !== SDF_SIZE) throw new Error('Unexpected SDF resolution');
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = SDF_SIZE;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(image, 0, 0);
      return { rgba: new Uint8Array(context.getImageData(0, 0, SDF_SIZE, SDF_SIZE).data), size: SDF_SIZE };
    } finally { image.close(); }
  })().catch(error => { defaultGeometry = undefined; throw error; });
}
