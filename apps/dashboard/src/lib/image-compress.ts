/**
 * Client-Side 3-Width Image Resizer & Direct R2 Uploader
 * Invariant #3: Zero Server Image Processing.
 * 
 * - Never processes or resizes images on the server or VPS (no sharp).
 * - Client-side browser Canvas / Web Worker resizes images into 3 widths: 360px, 720px, 1080px.
 * - Enforces WebP format with automatic Safari / legacy fallback to JPEG.
 * - Uploads directly to Cloudflare R2 using AWS SigV4 presigned PUT URLs.
 * - Verifies uploaded objects via backend HTTP HEAD endpoint.
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface Image3WidthBatch {
  small: Blob; // 360px max width
  medium: Blob; // 720px max width
  large: Blob; // 1080px max width
  format: "image/webp" | "image/jpeg";
  originalSize: number;
  totalSize: number;
  dimensions: {
    small: ImageDimensions;
    medium: ImageDimensions;
    large: ImageDimensions;
  };
}

export interface UploadResult {
  uploadId: string;
  format: "image/webp" | "image/jpeg";
  urls: {
    small: string;
    medium: string;
    large: string;
  };
  primaryUrl: string;
  srcset: string;
}

/**
 * Checks if browser canvas can encode to WebP
 */
let cachedWebpSupport: boolean | null = null;
export async function checkWebpCanvasSupport(): Promise<boolean> {
  if (cachedWebpSupport !== null) return cachedWebpSupport;

  if (typeof document === "undefined") {
    cachedWebpSupport = false;
    return false;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      cachedWebpSupport = Boolean(blob && blob.type === "image/webp");
      resolve(cachedWebpSupport);
    }, "image/webp");
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image into DOM"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function renderResizedCanvas(
  img: HTMLImageElement,
  maxWidth: number
): { canvas: HTMLCanvasElement; dimensions: ImageDimensions } {
  let width = img.width;
  let height = img.height;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas 2D rendering context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  return { canvas, dimensions: { width, height } };
}

function canvasToOptimizedBlob(
  canvas: HTMLCanvasElement,
  preferWebp = true
): Promise<{ blob: Blob; format: "image/webp" | "image/jpeg" }> {
  return new Promise((resolve, reject) => {
    if (!preferWebp) {
      canvas.toBlob(
        (jpegBlob) => {
          if (jpegBlob) resolve({ blob: jpegBlob, format: "image/jpeg" });
          else reject(new Error("Canvas JPEG toBlob failed"));
        },
        "image/jpeg",
        0.85
      );
      return;
    }

    // Try WebP first
    canvas.toBlob(
      (webpBlob) => {
        // Fall back to JPEG if Safari fails to encode WebP or returns non-webp
        if (webpBlob && webpBlob.type === "image/webp" && webpBlob.size > 0) {
          resolve({ blob: webpBlob, format: "image/webp" });
        } else {
          // Safari JPEG fallback
          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob) resolve({ blob: jpegBlob, format: "image/jpeg" });
              else reject(new Error("Canvas toBlob failed for both WebP and Safari JPEG fallback"));
            },
            "image/jpeg",
            0.85
          );
        }
      },
      "image/webp",
      0.82
    );
  });
}

/**
 * Resizes a raw camera/product photo into 3 widths (360px, 720px, 1080px)
 */
export async function compressImageTo3Widths(file: File): Promise<Image3WidthBatch> {
  const img = await loadImage(file);
  const isWebpSupported = await checkWebpCanvasSupport();

  const { canvas: smallCanvas, dimensions: smallDim } = renderResizedCanvas(img, 360);
  const { canvas: mediumCanvas, dimensions: mediumDim } = renderResizedCanvas(img, 720);
  const { canvas: largeCanvas, dimensions: largeDim } = renderResizedCanvas(img, 1080);

  const [smallRes, mediumRes, largeRes] = await Promise.all([
    canvasToOptimizedBlob(smallCanvas, isWebpSupported),
    canvasToOptimizedBlob(mediumCanvas, isWebpSupported),
    canvasToOptimizedBlob(largeCanvas, isWebpSupported),
  ]);

  const format = smallRes.format;
  const totalSize = smallRes.blob.size + mediumRes.blob.size + largeRes.blob.size;

  return {
    small: smallRes.blob,
    medium: mediumRes.blob,
    large: largeRes.blob,
    format,
    originalSize: file.size,
    totalSize,
    dimensions: {
      small: smallDim,
      medium: mediumDim,
      large: largeDim,
    },
  };
}

/**
 * Backwards compatibility helper for single-blob requests
 */
export async function compressImageToWebp(file: File, maxWidth = 1080, _quality = 0.8): Promise<Blob> {
  const batch = await compressImageTo3Widths(file);
  if (maxWidth <= 360) return batch.small;
  if (maxWidth <= 720) return batch.medium;
  return batch.large;
}

/**
 * Direct client-to-R2 upload workflow with HEAD verification
 */
export async function uploadResizedImageToR2(
  file: File,
  apiBaseUrl = "/v1",
  onProgress?: (stage: string) => void,
  folder: "products" | "logos" | "themes" = "products"
): Promise<UploadResult> {
  const token = (function () {
    try {
      return (
        localStorage.getItem("gocom_session_token") ||
        localStorage.getItem("gocom_auth_token") ||
        sessionStorage.getItem("gocom_token")
      );
    } catch {
      return null;
    }
  })();

  const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
  }

  onProgress?.("ছবির ৩টি সাইজ (৩৬০, ৭২০, ১০৮০ পিক্সেল) প্রসেস হচ্ছে...");
  const batch = await compressImageTo3Widths(file);

  onProgress?.("ক্লাউডফ্লেয়ার R2 এর প্রিসাইন্ড URL তৈরি হচ্ছে...");
  const presignRes = await fetch(`${apiBaseUrl}/media/presign`, {
    method: "POST",
    headers: authHeaders,
    credentials: "include",
    body: JSON.stringify({
      filename: file.name,
      contentType: batch.format,
      folder,
    }),
  });

  if (!presignRes.ok) {
    const errorJson = await presignRes.json().catch(() => ({}));
    throw new Error(errorJson.detail || `Presign request failed: HTTP ${presignRes.status}`);
  }

  const { data: presignData } = await presignRes.json();
  const { uploadId, urls } = presignData;

  onProgress?.("ক্লাউডফ্লেয়ার R2-তে সরাসরি আপলোড হচ্ছে (৩টি সাইজ)...");
  // Direct client-side parallel PUT to Cloudflare R2
  await Promise.all([
    fetch(urls.small.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": batch.small.type },
      body: batch.small,
    }),
    fetch(urls.medium.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": batch.medium.type },
      body: batch.medium,
    }),
    fetch(urls.large.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": batch.large.type },
      body: batch.large,
    }),
  ]);

  onProgress?.("সার্ভারে অবজেক্ট ভেরিফাই (HEAD চেক) করা হচ্ছে...");
  const verifyRes = await fetch(`${apiBaseUrl}/media/verify`, {
    method: "POST",
    headers: authHeaders,
    credentials: "include",
    body: JSON.stringify({
      keys: [urls.small.key, urls.medium.key, urls.large.key],
    }),
  });

  if (!verifyRes.ok) {
    const errorJson = await verifyRes.json().catch(() => ({}));
    throw new Error(errorJson.detail || `Media verification failed: HTTP ${verifyRes.status}`);
  }

  onProgress?.("✅ ছবি সফলভাবে আপলোড ও ভেরিফাই সম্পন্ন!");

  const smallPublic = urls.small.publicUrl;
  const mediumPublic = urls.medium.publicUrl;
  const largePublic = urls.large.publicUrl;

  return {
    uploadId,
    format: batch.format,
    urls: {
      small: smallPublic,
      medium: mediumPublic,
      large: largePublic,
    },
    primaryUrl: largePublic,
    srcset: `${smallPublic} 360w, ${mediumPublic} 720w, ${largePublic} 1080w`,
  };
}
