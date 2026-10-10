/**
 * Downscales and re-encodes a photo in the browser before upload.
 *
 * Phone camera photos are often 4-12 MB; scaling to the size the server keeps anyway
 * cuts upload time on mobile data. The server still does the final crop/encode, so this
 * only needs to be "big enough": it never upscales, and returns the original file when
 * the browser cannot decode it (the server then handles it).
 */
export async function compressImage(
  file: File,
  options: { maxEdge: number; quality?: number }
): Promise<Blob> {
  const quality = options.quality ?? 0.85;

  let bitmap: ImageBitmap | null = null;
  try {
    // 'from-image' applies the EXIF rotation, so portrait photos stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, options.maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    // Keep the original if re-encoding somehow made it bigger (e.g. an already small JPEG).
    return blob && blob.size < file.size ? blob : file;
  } finally {
    bitmap.close();
  }
}

/** Long edge sent for timing-board photos; the server keeps 1600px. */
export const BOARD_UPLOAD_MAX_EDGE = 2000;
/** Long edge sent for gallery photos; the server crops to 1280x720. */
export const GALLERY_UPLOAD_MAX_EDGE = 1920;
