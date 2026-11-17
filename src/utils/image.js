// Ridimensiona e comprime una foto lato client (max 1024 px, JPEG 0.8).
// Safari su iPhone decodifica nativamente le foto HEIC, che vengono così convertite in JPEG.

const MAX_SIZE = 1024;
const QUALITY = 0.8;

function unsupported() {
  const err = new Error("Formato immagine non supportato");
  err.code = "image/unsupported";
  return err;
}

async function decode(file) {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Ripiego su <img> (alcune versioni di Safari non supportano le opzioni).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw unsupported();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressImage(file) {
  const source = await decode(file);
  const w = source.width || source.naturalWidth;
  const h = source.height || source.naturalHeight;
  if (!w || !h) throw unsupported();
  const scale = Math.min(1, MAX_SIZE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // le PNG trasparenti diventano su sfondo bianco
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob) throw unsupported();
  return blob;
}
