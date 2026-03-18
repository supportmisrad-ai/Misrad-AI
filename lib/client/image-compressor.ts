/**
 * Image Compressor - Client-side image optimization before upload
 * Zero dependencies, canvas-based compression
 * Optimized for Israeli users: fast, simple, Hebrew error messages
 */

export interface CompressionOptions {
  /** Max width/height in pixels (default: 1200) */
  maxDimension?: number;
  /** JPEG quality 0-1 (default: 0.85) */
  quality?: number;
  /** Max file size in MB (default: 2) */
  maxFileSizeMB?: number;
  /** Output format: 'image/jpeg' | 'image/png' | 'image/webp' (default: auto) */
  outputType?: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Preserve transparency if source has it (default: true) */
  preserveTransparency?: boolean;
}

export interface CompressionResult {
  blob: Blob;
  originalFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
  outputType: string;
}

export interface CompressionProgress {
  phase: 'loading' | 'resizing' | 'compressing' | 'finalizing';
  progress: number; // 0-100
  message: string;
}

type ProgressCallback = (progress: CompressionProgress) => void;

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxDimension: 1200,
  quality: 0.85,
  maxFileSizeMB: 2,
  outputType: 'image/jpeg',
  preserveTransparency: true,
};

/** Hebrew messages for each phase */
const PHASE_MESSAGES: Record<CompressionProgress['phase'], string> = {
  loading: 'טוען תמונה...',
  resizing: 'מכוון ממדים...',
  compressing: 'דוחס תמונה...',
  finalizing: 'מסיים...',
};

/**
 * Detect if image has transparency by checking a sample of pixels
 */
async function hasTransparency(img: HTMLImageElement): Promise<boolean> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;

  // Sample at small size for performance
  canvas.width = Math.min(img.naturalWidth, 100);
  canvas.height = Math.min(img.naturalHeight, 100);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Check alpha channel of sampled pixels (every 10th pixel for speed)
  for (let i = 3; i < data.length; i += 40) {
    if (data[i] < 255) return true;
  }
  return false;
}

/**
 * Load image from file with progress tracking
 */
function loadImage(file: File, onProgress?: ProgressCallback): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    onProgress?.({ phase: 'loading', progress: 0, message: PHASE_MESSAGES.loading });

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      onProgress?.({ phase: 'loading', progress: 100, message: PHASE_MESSAGES.loading });
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('לא ניתן לטעון את התמונה'));
    };

    img.src = url;
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxDimension: number
): { width: number; height: number } {
  if (naturalWidth <= maxDimension && naturalHeight <= maxDimension) {
    return { width: naturalWidth, height: naturalHeight };
  }

  const ratio = Math.min(maxDimension / naturalWidth, maxDimension / naturalHeight);
  return {
    width: Math.round(naturalWidth * ratio),
    height: Math.round(naturalHeight * ratio),
  };
}

/**
 * Compress image to target file size with binary search approach
 */
async function compressToTargetSize(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  options: Required<CompressionOptions>,
  hasAlpha: boolean,
  onProgress?: ProgressCallback
): Promise<{ blob: Blob; quality: number }> {
  const outputType = hasAlpha && options.preserveTransparency
    ? 'image/png'
    : options.outputType;

  // For PNG, we can't adjust quality - use canvas dimensions
  if (outputType === 'image/png') {
    onProgress?.({ phase: 'compressing', progress: 50, message: PHASE_MESSAGES.compressing });
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('דחיסה נכשלה'))), outputType);
    });
    onProgress?.({ phase: 'finalizing', progress: 100, message: PHASE_MESSAGES.finalizing });
    return { blob, quality: 1 };
  }

  const targetBytes = options.maxFileSizeMB * 1024 * 1024;
  let minQuality = 0.1;
  let maxQuality = options.quality;
  let bestBlob: Blob | null = null;
  let bestQuality = minQuality;

  // Binary search for optimal quality (max 6 iterations for speed)
  for (let i = 0; i < 6; i++) {
    const progress = Math.round((i / 6) * 100);
    onProgress?.({ phase: 'compressing', progress, message: PHASE_MESSAGES.compressing });

    const currentQuality = (minQuality + maxQuality) / 2;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), outputType, currentQuality);
    });

    if (!blob) continue;

    if (blob.size <= targetBytes) {
      bestBlob = blob;
      bestQuality = currentQuality;
      minQuality = currentQuality; // Try higher quality
    } else {
      maxQuality = currentQuality; // Must lower quality
    }

    // Early exit if we're close enough
    if (Math.abs(blob.size - targetBytes) < targetBytes * 0.1) break;
  }

  // If we never found a blob under target, use lowest quality attempt
  if (!bestBlob) {
    bestBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('דחיסה נכשלה'))), outputType, minQuality);
    });
    bestQuality = minQuality;
  }

  onProgress?.({ phase: 'finalizing', progress: 100, message: PHASE_MESSAGES.finalizing });
  return { blob: bestBlob, quality: bestQuality };
}

/**
 * Main compression function
 * Smart defaults for email assets: 1200px max, 2MB max, auto format
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {},
  onProgress?: ProgressCallback
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Validate file
  if (!file.type.startsWith('image/')) {
    throw new Error('הקובץ חייב להיות תמונה (JPEG, PNG, WebP)');
  }

  const originalSize = file.size;
  const originalSizeMB = originalSize / (1024 * 1024);

  // Quick pass for small images
  if (originalSizeMB <= opts.maxFileSizeMB * 0.8 && !opts.maxDimension) {
    return {
      blob: file,
      originalFile: file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      width: 0,
      height: 0,
      outputType: file.type,
    };
  }

  // Load image
  const img = await loadImage(file, onProgress);

  onProgress?.({ phase: 'resizing', progress: 0, message: PHASE_MESSAGES.resizing });

  // Calculate dimensions
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxDimension
  );

  onProgress?.({ phase: 'resizing', progress: 50, message: PHASE_MESSAGES.resizing });

  // Check for transparency
  const transparent = opts.preserveTransparency ? await hasTransparency(img) : false;

  onProgress?.({ phase: 'resizing', progress: 100, message: PHASE_MESSAGES.resizing });

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', {
    alpha: transparent,
    desynchronized: true, // Performance hint
  });

  if (!ctx) {
    throw new Error('דפדפן לא תומך בדחיסת תמונות');
  }

  // Draw with smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (!transparent) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(img, 0, 0, width, height);

  // Compress
  const { blob } = await compressToTargetSize(canvas, img, opts, transparent, onProgress);

  return {
    blob,
    originalFile: file,
    originalSize,
    compressedSize: blob.size,
    compressionRatio: blob.size / originalSize,
    width,
    height,
    outputType: blob.type,
  };
}

/**
 * Convert compression result to File for upload
 */
export function compressionResultToFile(
  result: CompressionResult,
  newName?: string
): File {
  const extension = result.outputType.split('/')[1] || 'jpg';
  const name = newName || result.originalFile.name.replace(/\.[^.]+$/, `.${extension}`);

  return new File([result.blob], name, { type: result.outputType });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} בייט`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Validate image before compression
 * Returns Hebrew error message or null if valid
 */
export function validateImageFile(file: File): string | null {
  // Type check
  if (!file.type.startsWith('image/')) {
    return 'הקובץ חייב להיות תמונה (JPEG, PNG, GIF, WebP)';
  }

  // Allowed types
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
  if (!allowedTypes.includes(file.type)) {
    return 'פורמט לא נתמך. ניתן להעלות: JPEG, PNG, WebP';
  }

  // Max size (50MB before compression - we'll compress down)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return `הקובץ גדול מדי (${formatFileSize(file.size)}). מקסימום: 50 מגה-בייט`;
  }

  return null;
}

/**
 * Quick compression preset for email assets
 * Optimized for founder photos, logos, banners
 */
export function compressForEmailAsset(
  file: File,
  onProgress?: ProgressCallback
): Promise<CompressionResult> {
  return compressImage(
    file,
    {
      maxDimension: 800, // Email-friendly size
      quality: 0.9,
      maxFileSizeMB: 1.5, // Well under Vercel limits
      preserveTransparency: true,
    },
    onProgress
  );
}

/**
 * Create object URL for preview (remember to revoke!)
 */
export function createPreviewUrl(file: File | Blob): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke preview URL to prevent memory leaks
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
