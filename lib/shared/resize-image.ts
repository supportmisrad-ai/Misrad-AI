/**
 * Auto-resize an image file on the client so it fits within maxBytes.
 * Uses Canvas to progressively reduce quality (JPEG/WebP) or dimensions.
 * SVGs are returned as-is (they're almost always small).
 *
 * @param file     The original File from an <input type="file">
 * @param maxBytes Maximum allowed file size in bytes (default 5 MB)
 * @returns        A File that is ≤ maxBytes, or the original if already small enough
 */
export async function resizeImageIfNeeded(
  file: File,
  maxBytes = 5 * 1024 * 1024,
): Promise<File> {
  // SVG — skip (not a raster image)
  if (file.type === 'image/svg+xml') return file;

  // Already within limit
  if (file.size <= maxBytes) return file;

  // Load image into a canvas
  const img = await loadImage(file);
  const { width, height } = img;

  // Output format — prefer WebP for best compression, fallback to JPEG
  const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp';
  const ext = outputType === 'image/png' ? '.png' : '.webp';

  // Strategy: first try reducing quality, then reduce dimensions
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Phase 1: Try quality reduction at current dimensions (0.8 → 0.5 → 0.3)
  for (const quality of [0.8, 0.6, 0.4, 0.3]) {
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, outputType, quality);
    if (blob.size <= maxBytes) {
      return blobToFile(blob, file.name, ext, outputType);
    }
  }

  // Phase 2: Progressively reduce dimensions (75% → 50% → 25%)
  for (const scale of [0.75, 0.5, 0.35, 0.25]) {
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await canvasToBlob(canvas, outputType, 0.7);
    if (blob.size <= maxBytes) {
      return blobToFile(blob, file.name, ext, outputType);
    }
  }

  // Last resort: very small
  canvas.width = Math.round(img.width * 0.15);
  canvas.height = Math.round(img.height * 0.15);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToBlob(canvas, outputType, 0.5);
  return blobToFile(blob, file.name, ext, outputType);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      type,
      quality,
    );
  });
}

function blobToFile(blob: Blob, originalName: string, ext: string, type: string): File {
  const baseName = originalName.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}${ext}`, { type, lastModified: Date.now() });
}
