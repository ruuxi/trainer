export const MAX_IMAGE_PIXELS = 1024 * 1024;
export const MAX_IMAGES_PER_DATASET = 500;
export const MAX_CAPTIONS_PER_DATASET = 500;
export const UPLOAD_CONCURRENCY = 3;

export const isImageFile = (file: File) => {
  if (file.type && file.type.startsWith("image/")) {
    return true;
  }
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
};

export const isCaptionFile = (file: File) =>
  file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");

export const isZipFile = (file: File) =>
  file.type === "application/zip" || file.name.toLowerCase().endsWith(".zip");

const loadImageFromFile = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    img.src = url;
  });

export const ensureMaxResolution = async (file: File) => {
  if (!isImageFile(file)) {
    return file;
  }

  try {
    const img = await loadImageFromFile(file);
    const totalPixels = img.naturalWidth * img.naturalHeight;
    if (totalPixels <= MAX_IMAGE_PIXELS) {
      return file;
    }

    const scale = Math.sqrt(MAX_IMAGE_PIXELS / totalPixels);
    const targetWidth = Math.max(1, Math.round(img.naturalWidth * scale));
    const targetHeight = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to resize image");
    }
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const targetType = ["image/png", "image/webp", "image/jpeg"].includes(file.type)
      ? file.type
      : "image/jpeg";

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Failed to resize image"));
          }
        },
        targetType,
        0.95,
      );
    });

    return new File([blob], file.name, { type: blob.type });
  } catch (error) {
    console.error("Failed to resize image", error);
    return file;
  }
};

export const runWithConcurrency = async <T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
) => {
  if (limit <= 0) {
    throw new Error("Concurrency limit must be greater than 0");
  }
  const executing = new Set<Promise<void>>();

  for (let index = 0; index < items.length; index += 1) {
    const p = worker(items[index], index);
    executing.add(p);
    // eslint-disable-next-line promise/catch-or-return
    p.finally(() => {
      executing.delete(p);
    });
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
};

