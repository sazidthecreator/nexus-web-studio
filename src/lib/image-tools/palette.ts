/**
 * On-device color palette extractor — k-means in the main thread on a
 * down-sampled bitmap (fast, ~50-100ms for typical images). Returns top
 * N dominant colors as hex.
 */

export type Swatch = { hex: string; r: number; g: number; b: number; weight: number };

export async function extractPalette(file: Blob, k = 5, sampleSize = 96): Promise<Swatch[]> {
  const bitmap = await loadBitmap(file);
  const { width, height } = fit(bitmap.width, bitmap.height, sampleSize, sampleSize);
  const canvas = makeCanvas(width, height);
  const ctx = (canvas as any).getContext("2d") as CanvasRenderingContext2D | null;
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap as any, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  // Quantize to 4 bits per channel for stability and speed.
  const points: Array<[number, number, number]> = [];
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    points.push([data[i] & 0xf0, data[i + 1] & 0xf0, data[i + 2] & 0xf0]);
  }
  if (!points.length) return [];

  const centroids = kmeans(points, Math.max(1, Math.min(k, 8)), 8);
  return centroids
    .map((c) => ({
      hex: rgbToHex(c.r, c.g, c.b),
      r: c.r, g: c.g, b: c.b,
      weight: c.count / points.length,
    }))
    .sort((a, b) => b.weight - a.weight);
}

type Centroid = { r: number; g: number; b: number; count: number };

function kmeans(points: Array<[number, number, number]>, k: number, iters: number): Centroid[] {
  // Deterministic seed: even spacing in the array
  const step = Math.max(1, Math.floor(points.length / k));
  let centroids: Centroid[] = Array.from({ length: k }, (_, i) => {
    const p = points[Math.min(points.length - 1, i * step)];
    return { r: p[0], g: p[1], b: p[2], count: 0 };
  });

  for (let iter = 0; iter < iters; iter++) {
    const sums = centroids.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));
    for (const p of points) {
      let best = 0, bestD = Infinity;
      for (let i = 0; i < centroids.length; i++) {
        const c = centroids[i];
        const dr = p[0] - c.r, dg = p[1] - c.g, db = p[2] - c.b;
        const d = dr * dr + dg * dg + db * db;
        if (d < bestD) { bestD = d; best = i; }
      }
      const s = sums[best];
      s.r += p[0]; s.g += p[1]; s.b += p[2]; s.count += 1;
    }
    centroids = sums.map((s, i) =>
      s.count > 0
        ? { r: Math.round(s.r / s.count), g: Math.round(s.g / s.count), b: Math.round(s.b / s.count), count: s.count }
        : centroids[i],
    );
  }
  return centroids.filter((c) => c.count > 0);
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0")).join("");
}

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file); } catch { /* fall through */ }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function fit(w: number, h: number, mw: number, mh: number) {
  const scale = Math.min(1, mw / w, mh / h);
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

function makeCanvas(w: number, h: number) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}
