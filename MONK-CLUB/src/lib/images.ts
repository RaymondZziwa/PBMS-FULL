/**
 * Phone photos are often 4–10 MB. Shrink images to at most `max` px on the long
 * side as JPEG before upload (the API accepts up to 5 MB). PDFs pass through.
 */
export const shrinkImage = async (file: File, max = 1600, quality = 0.82): Promise<File> => {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
};

export const MAX_BYTES = 5 * 1024 * 1024;
export const ACCEPT_IMAGE = "image/jpeg,image/png,image/webp";
export const ACCEPT_DOC = "image/jpeg,image/png,image/webp,application/pdf";
