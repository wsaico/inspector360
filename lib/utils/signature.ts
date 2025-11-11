// Utilidades de optimización de firmas
// - Redimensiona a 400x150 (máx), preservando proporción
// - Elimina alfa con fondo blanco y opcionalmente convierte a escala de grises
// - Codifica en AVIF/WebP/JPEG según soporte y ajusta calidad para ~3–4 KB (<5 KB)
// - Devuelve DataURL (base64) lista para guardar

export async function optimizeSignature(
  canvas: HTMLCanvasElement,
  maxWidth = 400,
  maxHeight = 150,
  initialQuality = 0.65
): Promise<string> {
  const processed = resizeAndPreprocess(canvas, maxWidth, maxHeight, {
    removeAlpha: true,
    forceGrayscale: true,
    multiStepDownscale: true,
    trimWhitespace: true,
  });

  const preferOrder = ["image/avif", "image/webp", "image/jpeg"];
  const supportedTypes = preferOrder.filter(isTypeSupported);

  const idealBytes = 4 * 1024; // 4 KB
  const maxBytes = 5 * 1024; // 5 KB

  const results: EncodeResult[] = [];
  for (const type of supportedTypes) {
    const r = await adaptiveEncode(processed, type, {
      initialQuality,
      minQuality: minQualityForType(type),
      maxQuality: 0.9,
      idealBytes,
      maxBytes,
    });
    results.push(r);
  }

  if (results.length === 0) {
    return processed.toDataURL("image/png");
  }

  const eligible = results.filter((r) => r.size <= maxBytes);
  const best = (eligible.length ? eligible : results).sort((a, b) => a.size - b.size)[0];
  return best.dataURL;
}

type PreprocessOptions = {
  removeAlpha?: boolean;
  forceGrayscale?: boolean;
  multiStepDownscale?: boolean;
  trimWhitespace?: boolean;
};

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}

function resizeAndPreprocess(
  source: HTMLCanvasElement,
  maxWidth: number,
  maxHeight: number,
  opts: PreprocessOptions
): HTMLCanvasElement {
  const { removeAlpha = true, forceGrayscale = true, multiStepDownscale = true, trimWhitespace = true } = opts;

  let srcCanvas: HTMLCanvasElement = source;
  // Recortar espacios en blanco si el lienzo contiene mucho fondo
  if (trimWhitespace) {
    srcCanvas = trimCanvasWhitespace(source) || source;
  }

  let srcW = srcCanvas.width;
  let srcH = srcCanvas.height;
  const ratio = Math.min(maxWidth / srcW, maxHeight / srcH);

  const targetW = ratio < 1 ? Math.round(srcW * ratio) : srcW;
  const targetH = ratio < 1 ? Math.round(srcH * ratio) : srcH;

  // Reducción multietapa para evitar aliasing si la escala es muy grande
  let intermediate: HTMLCanvasElement = srcCanvas;
  if (multiStepDownscale && ratio < 0.5) {
    let stepW = Math.round(srcW / 2);
    let stepH = Math.round(srcH / 2);
    while (stepW > targetW * 1.5 && stepH > targetH * 1.5) {
      const stepCanvas = createCanvas(stepW, stepH);
      const stepCtx = stepCanvas.getContext("2d")!;
      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = "high";
      stepCtx.drawImage(intermediate, 0, 0, stepW, stepH);
      intermediate = stepCanvas;
      stepW = Math.max(targetW, Math.round(stepW / 2));
      stepH = Math.max(targetH, Math.round(stepH / 2));
    }
  }

  const out = createCanvas(targetW, targetH);
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const canUseFilter = "filter" in ctx;
  if (forceGrayscale && canUseFilter) {
    ctx.filter = "grayscale(100%) contrast(105%)";
  }

  ctx.drawImage(intermediate, 0, 0, targetW, targetH);

  // Eliminar alfa: fondo blanco debajo de los trazos
  if (removeAlpha) {
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.globalCompositeOperation = "source-over";
  }

  // Normalizar blancos para mejor compresión
  try {
    const img = ctx.getImageData(0, 0, targetW, targetH);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  } catch {
    // Si el canvas está "tainted", omitimos este paso
  }

  return out;
}

function trimCanvasWhitespace(canvas: HTMLCanvasElement): HTMLCanvasElement | null {
  try {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;
    let top = 0, left = 0, right = w - 1, bottom = h - 1;

    // Encontrar límites no-blancos
    outer: for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (!(data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245)) { top = y; break outer; }
      }
    }
    outer2: for (let y = h - 1; y >= 0; y--) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (!(data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245)) { bottom = y; break outer2; }
      }
    }
    outer3: for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const i = (y * w + x) * 4;
        if (!(data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245)) { left = x; break outer3; }
      }
    }
    outer4: for (let x = w - 1; x >= 0; x--) {
      for (let y = 0; y < h; y++) {
        const i = (y * w + x) * 4;
        if (!(data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245)) { right = x; break outer4; }
      }
    }

    if (left >= right || top >= bottom) return null; // todo blanco
    const tw = right - left + 1;
    const th = bottom - top + 1;
    const out = createCanvas(tw, th);
    const octx = out.getContext("2d")!;
    octx.drawImage(canvas, left, top, tw, th, 0, 0, tw, th);
    return out;
  } catch {
    return null;
  }
}

function isTypeSupported(type: string): boolean {
  const test = createCanvas(2, 2);
  const ctx = test.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 2, 2);
  try {
    const url = test.toDataURL(type, 0.5 as any);
    return url.startsWith(`data:${type}`);
  } catch {
    return false;
  }
}

function minQualityForType(type: string): number {
  switch (type) {
    case "image/avif": return 0.35;
    case "image/webp": return 0.40;
    case "image/jpeg": return 0.55;
    default: return 0.5;
  }
}

type EncodeResult = {
  dataURL: string;
  size: number;
  type: string;
  quality: number;
};

async function encodeCanvas(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<EncodeResult> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Error al codificar la firma."))),
      type,
      quality as any
    );
  });
  const size = blob.size;
  const dataURL = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
  return { dataURL, size, type, quality };
}

type AdaptiveOptions = {
  initialQuality: number;
  minQuality: number;
  maxQuality: number;
  idealBytes: number;
  maxBytes: number;
};

async function adaptiveEncode(
  canvas: HTMLCanvasElement,
  type: string,
  opts: AdaptiveOptions
): Promise<EncodeResult> {
  const { initialQuality, minQuality, maxQuality, idealBytes, maxBytes } = opts;
  let lo = Math.max(minQuality, 0.1);
  let hi = Math.min(maxQuality, 0.95);
  let q = clamp(initialQuality, lo, hi);

  let best: EncodeResult | null = null;
  for (let i = 0; i < 6; i++) {
    const r = await encodeCanvas(canvas, type, q);
    if (!best || r.size < best.size) best = r;
    if (r.size > idealBytes) {
      hi = q;
      q = (lo + hi) / 2;
    } else {
      lo = q;
      const nextQ = (lo + hi) / 2;
      const probe = await encodeCanvas(canvas, type, nextQ);
      if (probe.size <= idealBytes) {
        q = nextQ;
        if (probe.size < best.size) best = probe;
      } else {
        break;
      }
    }
  }

  if (best && best.size > maxBytes) {
    lo = Math.max(minQuality, 0.1);
    hi = Math.min(q, maxQuality);
    for (let i = 0; i < 4; i++) {
      const mid = (lo + hi) / 2;
      const r = await encodeCanvas(canvas, type, mid);
      if (r.size <= maxBytes) {
        best = r.size < (best?.size ?? Infinity) ? r : best;
        hi = mid;
      } else {
        lo = mid;
      }
    }
  }

  return best!;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// Helpers para servicios de storage
export function getMimeFromDataURL(dataURL: string): string | null {
  const m = /^data:([^;]+);base64,/.exec(dataURL);
  return m ? m[1] : null;
}

export function getExtensionForMime(mime: string): string {
  switch (mime) {
    case "image/avif": return "avif";
    case "image/webp": return "webp";
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    default: return "bin";
  }
}