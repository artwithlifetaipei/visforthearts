/**
 * Shared client-side upload helpers for the exhibitor portal.
 *
 * Why this exists:
 * - Vercel serverless functions reject request bodies larger than ~4.5MB.
 *   Base64 inflates files by ~33%, so a 3.5MB iPhone photo silently fails.
 * - iPhone photos are often 3–8MB (and sometimes HEIC), which exceeded the old
 *   per-page limits (2–3MB) and confused exhibitors ("無法上傳").
 *
 * Every upload in the portal should go through `prepareImageUpload` (images)
 * or `prepareFileUpload` (PDF / mixed), and parse responses with `safeJson`.
 */

/** Max Base64 payload we will ever send in a single JSON request (~2.8MB). */
export const MAX_UPLOAD_BASE64_CHARS = Math.floor(2.8 * 1024 * 1024);

/** Max original file size we accept from the picker (we compress afterwards). */
export const MAX_ORIGINAL_IMAGE_BYTES = 30 * 1024 * 1024;

/** PDFs cannot be compressed in the browser – keep under Vercel body limit. */
export const MAX_PDF_BYTES = 2 * 1024 * 1024;

export interface PreparedUpload {
  dataUrl: string;
  mimeType: string;
  fileName: string;
  originalBytes: number;
  finalBytes: number;
}

export class UploadPrepError extends Error {}

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new UploadPrepError('無法讀取檔案，請重新選擇。'));
    reader.onabort = () => reject(new UploadPrepError('檔案讀取已中斷，請重新選擇。'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => reject(new UploadPrepError('圖片解析逾時，請改用 JPG 或 PNG 格式。')), 15000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new UploadPrepError('此圖片格式無法解析（例如部分 HEIC 檔），請改用 JPG 或 PNG 格式後再上傳。'));
    };
    img.src = src;
  });
}

function isLikelyImage(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif|bmp|svg)$/i.test(file.name || '');
}

function replaceExt(name: string, ext: string): string {
  const base = (name || 'image').replace(/\.[^.]+$/, '');
  return `${base}.${ext}`;
}

/**
 * Resize + re-encode an image so its Base64 payload fits safely under the
 * serverless body limit. Keeps transparency when `preserveTransparency` is set.
 */
export async function prepareImageUpload(
  file: File,
  opts: { maxDimension?: number; preserveTransparency?: boolean } = {}
): Promise<PreparedUpload> {
  const { maxDimension = 2400, preserveTransparency = false } = opts;

  if (!isLikelyImage(file)) {
    throw new UploadPrepError('請上傳圖片檔案（JPG、PNG、WebP）。');
  }
  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
    throw new UploadPrepError('圖片檔案過大（超過 30MB），請先縮小後再上傳。');
  }

  const originalDataUrl = await readAsDataURL(file);

  // SVG: vector, cannot/should not rasterize – send as-is if small enough.
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
  if (isSvg) {
    if (originalDataUrl.length > MAX_UPLOAD_BASE64_CHARS) {
      throw new UploadPrepError('SVG 檔案過大，請簡化圖檔或改用 PNG 格式。');
    }
    return {
      dataUrl: originalDataUrl,
      mimeType: 'image/svg+xml',
      fileName: file.name,
      originalBytes: file.size,
      finalBytes: file.size,
    };
  }

  // Small, browser-friendly files can be sent untouched (best quality).
  const passthroughTypes = preserveTransparency
    ? ['image/png', 'image/webp']
    : ['image/jpeg', 'image/png', 'image/webp'];
  if (
    passthroughTypes.includes(file.type) &&
    originalDataUrl.length <= MAX_UPLOAD_BASE64_CHARS * 0.6
  ) {
    return {
      dataUrl: originalDataUrl,
      mimeType: file.type,
      fileName: file.name,
      originalBytes: file.size,
      finalBytes: file.size,
    };
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(originalDataUrl);
  } catch (err) {
    // Could not decode (e.g. HEIC on older browsers). Send original if it fits.
    if (originalDataUrl.length <= MAX_UPLOAD_BASE64_CHARS) {
      return {
        dataUrl: originalDataUrl,
        mimeType: file.type || 'application/octet-stream',
        fileName: file.name,
        originalBytes: file.size,
        finalBytes: file.size,
      };
    }
    throw err;
  }

  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) {
    throw new UploadPrepError('圖片尺寸讀取失敗，請改用 JPG 或 PNG 格式。');
  }

  const outType = preserveTransparency ? 'image/png' : 'image/jpeg';
  const outExt = preserveTransparency ? 'png' : 'jpg';

  // Progressive attempts: shrink dimensions / quality until it fits.
  const dims = [maxDimension, 2000, 1600, 1280, 1024, 800];
  const qualities = preserveTransparency ? [undefined] : [0.86, 0.78, 0.7];

  for (const dim of dims) {
    const scale = Math.min(1, dim / Math.max(srcW, srcH));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new UploadPrepError('瀏覽器不支援圖片壓縮，請改用電腦上傳。');

    if (!preserveTransparency) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);

    for (const q of qualities) {
      const dataUrl = q === undefined ? canvas.toDataURL(outType) : canvas.toDataURL(outType, q);
      if (dataUrl.length <= MAX_UPLOAD_BASE64_CHARS) {
        return {
          dataUrl,
          mimeType: outType,
          fileName: replaceExt(file.name, outExt),
          originalBytes: file.size,
          finalBytes: Math.round((dataUrl.length * 3) / 4),
        };
      }
    }
  }

  throw new UploadPrepError('圖片壓縮後仍過大，請先裁切或縮小圖片後再上傳。');
}

/**
 * Generic preparation for inputs that accept both images and PDFs
 * (e.g. physical contract scans, remittance slips).
 */
export async function prepareFileUpload(file: File): Promise<PreparedUpload> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  if (isPdf) {
    if (file.size > MAX_PDF_BYTES) {
      throw new UploadPrepError('PDF 檔案請小於 2MB；若為掃描檔，建議改用手機拍照（JPG）上傳，系統會自動壓縮。');
    }
    const dataUrl = await readAsDataURL(file);
    return {
      dataUrl,
      mimeType: 'application/pdf',
      fileName: file.name,
      originalBytes: file.size,
      finalBytes: file.size,
    };
  }
  return prepareImageUpload(file);
}

/**
 * Parse a fetch Response safely. Vercel returns plain text / HTML for 413
 * (payload too large) and 504 (timeout), which would make `res.json()` throw
 * a cryptic "Unexpected token" error. This always returns an object.
 */
export async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    if (res.status === 413) {
      return { error: '檔案過大，伺服器無法接收。請縮小圖片後再試一次。' };
    }
    if (res.status === 504 || res.status === 502) {
      return { error: '伺服器回應逾時，請稍後再試一次。' };
    }
    return { error: `伺服器回應異常（HTTP ${res.status}），請稍後再試。` };
  }
}

/** fetch with a hard timeout so buttons can never spin forever. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 45000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new UploadPrepError('上傳逾時，請確認網路連線後再試一次。');
    }
    throw new UploadPrepError('網路連線異常，請確認網路後再試一次。');
  } finally {
    clearTimeout(timer);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}
