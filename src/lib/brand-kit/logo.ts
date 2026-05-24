// Deterministic SVG logo generator.
import { hash32, rng, range, pick } from "./hash";
import type { Palette } from "./palette";

export type LogoVariant = "minimal" | "bold" | "gradient";
export type LogoKind = "lettermark" | "abstract" | "wordmark" | "combination";
export type ContainerShape = "circle" | "rounded" | "hexagon" | "shield" | "badge" | "square";

export type LogoParams = {
  brand: string;
  industry?: string;
  style?: string;
  palette: Palette;
  variant: LogoVariant;
  kind: LogoKind;
  font?: string;
};

function initials(brand: string): string {
  const parts = brand.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashSeed(p: LogoParams): number {
  return hash32(`${p.brand}|${p.industry ?? ""}|${p.style ?? ""}|${p.kind}|${p.variant}`);
}

function fillFor(p: LogoParams, role: "primary" | "accent"): string {
  const c = role === "primary" ? p.palette.primary : p.palette.accent;
  if (p.variant === "gradient") return `url(#g-${role})`;
  return c;
}

function gradients(p: LogoParams): string {
  if (p.variant !== "gradient") return "";
  return `<defs>
    <linearGradient id="g-primary" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p.palette.primary}"/>
      <stop offset="100%" stop-color="${p.palette.accent}"/>
    </linearGradient>
    <linearGradient id="g-accent" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.palette.accent}"/>
      <stop offset="100%" stop-color="${p.palette.secondary}"/>
    </linearGradient>
  </defs>`;
}

function containerPath(shape: ContainerShape, cx: number, cy: number, r: number): string {
  switch (shape) {
    case "circle": return `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
    case "rounded": return `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="${r * 0.28}"/>`;
    case "square":  return `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}"/>`;
    case "hexagon": {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 2 + i * Math.PI / 3;
        pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
      }
      return `<polygon points="${pts.join(" ")}"/>`;
    }
    case "shield": {
      const x = cx - r, y = cy - r, w = r * 2, h = r * 2;
      return `<path d="M ${x} ${y + h * 0.15}
        Q ${x} ${y}, ${x + w * 0.5} ${y}
        Q ${x + w} ${y}, ${x + w} ${y + h * 0.15}
        L ${x + w} ${y + h * 0.55}
        Q ${x + w} ${y + h}, ${x + w * 0.5} ${y + h}
        Q ${x} ${y + h}, ${x} ${y + h * 0.55} Z"/>`;
    }
    case "badge": {
      const teeth = 14;
      const inner = r * 0.92;
      const pts = [];
      for (let i = 0; i < teeth * 2; i++) {
        const a = (i / (teeth * 2)) * Math.PI * 2;
        const rad = i % 2 === 0 ? r : inner;
        pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
      }
      return `<polygon points="${pts.join(" ")}"/>`;
    }
  }
}

export function generateLogoSvg(p: LogoParams, size = 256): string {
  switch (p.kind) {
    case "lettermark": return lettermark(p, size);
    case "abstract":   return abstract(p, size);
    case "wordmark":   return wordmark(p, size);
    case "combination":return combination(p, size);
  }
}

function lettermark(p: LogoParams, size: number): string {
  const seed = hashSeed(p);
  const r = rng(seed);
  const shape = pick<ContainerShape>(r, ["circle", "rounded", "hexagon", "shield", "badge", "square"]);
  const init = initials(p.brand);
  const cx = size / 2, cy = size / 2, rad = size * 0.42;
  const stroke = p.variant === "minimal" ? p.palette.primary : "none";
  const fill = p.variant === "minimal" ? "none" : fillFor(p, "primary");
  const sw = p.variant === "minimal" ? Math.max(6, size * 0.035) : 0;
  const textColor = p.variant === "minimal" ? p.palette.primary : p.palette.background;
  const fontSize = init.length > 1 ? size * 0.42 : size * 0.55;
  const fontFamily = p.font ?? "Inter, system-ui, sans-serif";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
${gradients(p)}
<g fill="${fill}" stroke="${stroke}" stroke-width="${sw}">${containerPath(shape, cx, cy, rad)}</g>
<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
  font-family="${fontFamily}" font-weight="${p.variant === "bold" ? 800 : 700}"
  font-size="${fontSize}" letter-spacing="-0.04em" fill="${textColor}">${init}</text>
</svg>`;
}

function abstract(p: LogoParams, size: number): string {
  const seed = hashSeed(p);
  const r = rng(seed);
  const num = Math.floor(range(r, 2, 6)); // 2-5 shapes
  const baseAngle = range(r, 0, 360);
  const corner = range(r, 0, size * 0.15);
  const cx = size / 2, cy = size / 2;
  const baseR = size * 0.32;
  const shapes: string[] = [];
  for (let i = 0; i < num; i++) {
    const a = (baseAngle + (i * 360) / num) * Math.PI / 180;
    const dist = baseR * (0.4 + (i / num) * 0.6);
    const x = cx + Math.cos(a) * dist;
    const y = cy + Math.sin(a) * dist;
    const w = size * range(r, 0.18, 0.34);
    const h = size * range(r, 0.18, 0.34);
    const fill = i % 2 === 0 ? fillFor(p, "primary") : fillFor(p, "accent");
    const opacity = p.variant === "minimal" ? (i === 0 ? 1 : 0.55) : 0.92;
    const kind = Math.floor(r() * 3);
    if (kind === 0) {
      shapes.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(Math.min(w, h) / 2).toFixed(2)}" fill="${fill}" opacity="${opacity}"/>`);
    } else if (kind === 1) {
      shapes.push(`<rect x="${(x - w / 2).toFixed(2)}" y="${(y - h / 2).toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="${corner.toFixed(2)}" fill="${fill}" opacity="${opacity}" transform="rotate(${(baseAngle / 6).toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})"/>`);
    } else {
      const p1 = `${x.toFixed(2)},${(y - h / 2).toFixed(2)}`;
      const p2 = `${(x + w / 2).toFixed(2)},${(y + h / 2).toFixed(2)}`;
      const p3 = `${(x - w / 2).toFixed(2)},${(y + h / 2).toFixed(2)}`;
      shapes.push(`<polygon points="${p1} ${p2} ${p3}" fill="${fill}" opacity="${opacity}"/>`);
    }
  }
  const stroke = p.variant === "minimal" ? `<g fill="none" stroke="${p.palette.primary}" stroke-width="${size * 0.025}">${shapes.join("")}</g>` : shapes.join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
${gradients(p)}
${p.variant === "minimal" ? stroke : shapes.join("")}
</svg>`;
}

function wordmark(p: LogoParams, size: number): string {
  const w = size * 4, h = size;
  const fontFamily = p.font ?? "Inter, system-ui, sans-serif";
  const weight = p.variant === "bold" ? 900 : p.variant === "minimal" ? 400 : 700;
  const fontSize = size * 0.48;
  const fill = fillFor(p, "primary");
  const tracking = p.variant === "minimal" ? "0.18em" : p.variant === "bold" ? "-0.04em" : "-0.01em";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
${gradients(p)}
<text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="central"
  font-family="${fontFamily}" font-weight="${weight}"
  font-size="${fontSize}" letter-spacing="${tracking}" fill="${fill}">${escapeXml(p.brand)}</text>
</svg>`;
}

function combination(p: LogoParams, size: number): string {
  const w = size * 4.2, h = size;
  const markSize = size * 0.86;
  const mark = generateLogoSvg({ ...p, kind: "lettermark" }, markSize)
    .replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  const fontFamily = p.font ?? "Inter, system-ui, sans-serif";
  const weight = p.variant === "bold" ? 900 : p.variant === "minimal" ? 500 : 700;
  const fontSize = size * 0.36;
  const fill = p.palette.foreground;
  const tracking = p.variant === "minimal" ? "0.12em" : "-0.01em";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
${gradients(p)}
<g transform="translate(${(h - markSize) / 2}, ${(h - markSize) / 2})">${mark}</g>
<text x="${markSize + size * 0.3}" y="${h / 2}" dominant-baseline="central"
  font-family="${fontFamily}" font-weight="${weight}"
  font-size="${fontSize}" letter-spacing="${tracking}" fill="${fill}">${escapeXml(p.brand)}</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
}

// ---- Rasterization (browser only) ----

export async function svgToPng(svg: string, size: number, bg?: string): Promise<Blob> {
  const blobUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("svg image load failed"));
      img.src = blobUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size); }
    // Square fit using SVG aspect — center if wider.
    const ratio = img.width && img.height ? img.width / img.height : 1;
    let w = size, h = size;
    if (ratio > 1) h = size / ratio; else w = size * ratio;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

// Build a multi-size .ico from PNG blobs.
export async function buildIco(svg: string, sizes: number[] = [32, 64], bg?: string): Promise<Blob> {
  const pngs = await Promise.all(sizes.map((s) => svgToPng(svg, s, bg).then((b) => b.arrayBuffer())));
  const headerSize = 6 + 16 * pngs.length;
  let totalSize = headerSize;
  for (const p of pngs) totalSize += p.byteLength;
  const buf = new ArrayBuffer(totalSize);
  const dv = new DataView(buf);
  dv.setUint16(0, 0, true);
  dv.setUint16(2, 1, true);
  dv.setUint16(4, pngs.length, true);
  let offset = headerSize;
  for (let i = 0; i < pngs.length; i++) {
    const sz = sizes[i] >= 256 ? 0 : sizes[i];
    const dirOff = 6 + 16 * i;
    dv.setUint8(dirOff, sz);
    dv.setUint8(dirOff + 1, sz);
    dv.setUint8(dirOff + 2, 0);
    dv.setUint8(dirOff + 3, 0);
    dv.setUint16(dirOff + 4, 1, true);
    dv.setUint16(dirOff + 6, 32, true);
    dv.setUint32(dirOff + 8, pngs[i].byteLength, true);
    dv.setUint32(dirOff + 12, offset, true);
    new Uint8Array(buf, offset, pngs[i].byteLength).set(new Uint8Array(pngs[i]));
    offset += pngs[i].byteLength;
  }
  return new Blob([buf], { type: "image/x-icon" });
}

export async function buildOgImage(svg: string, brand: string, palette: Palette, font: string): Promise<Blob> {
  const W = 1200, H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  // Background gradient.
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, palette.background);
  grad.addColorStop(1, palette.surface);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Draw logo.
  const logoSize = 320;
  const logoBlob = await svgToPng(svg, logoSize);
  const logoUrl = URL.createObjectURL(logoBlob);
  const img = new Image();
  await new Promise<void>((res) => { img.onload = () => res(); img.src = logoUrl; });
  ctx.drawImage(img, 96, (H - logoSize) / 2);
  URL.revokeObjectURL(logoUrl);
  // Brand text.
  ctx.fillStyle = palette.foreground;
  ctx.font = `700 84px ${font}`;
  ctx.textBaseline = "middle";
  ctx.fillText(brand, 96 + logoSize + 56, H / 2 - 24);
  ctx.fillStyle = palette.mutedForeground;
  ctx.font = `400 32px ${font}`;
  ctx.fillText("Built with Sitely", 96 + logoSize + 56, H / 2 + 56);
  return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
}
