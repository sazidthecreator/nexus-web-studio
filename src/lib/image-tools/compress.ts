/**
 * Smart on-device image compressor — Canvas + browser-native WebP.
 * No third-party API, no upload. Returns a Blob ready for Storage.
 */

export type CompressOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0..1
  format?: "image/webp" | "image/jpeg" | "image/png";
};

export type CompressResult = {
  blob: Blob;
  width: number;
  height: number;
  originalBytes: number;
  bytes: number;
  ratio: number; // 0..1 — bytes / originalBytes
  format: string;
};

const DEFAULTS: Required<CompressOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.82,
  format: "image/webp",
};

export async function compressImage(
  file: Blob,
  opts: CompressOptions = {},
): Promise<CompressResult> {
  const o = { ...DEFAULTS, ...opts };
  const bitmap = await loadBitmap(file);
  const { width, height } = scaleToFit(bitmap.width, bitmap.height, o.maxWidth, o.maxHeight);

  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, o.format, o.quality);
  return {
    blob,
    width,
    height,
    originalBytes: file.size,
    bytes: blob.size,
    ratio: file.size > 0 ? blob.size / file.size : 1,
    format: blob.type || o.format,
  };
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

function scaleToFit(w: number, h: number, maxW: number, maxH: number) {
  const scale = Math.min(1, maxW / w, maxH / h);
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h) as any;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  format: string,
  quality: number,
): Promise<Blob> {
  if ("convertToBlob" in canvas) {
    return await (canvas as OffscreenCanvas).convertToBlob({ type: format, quality });
  }
  return await new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encode failed"))),
      format,
      quality,
    );
  });
}
