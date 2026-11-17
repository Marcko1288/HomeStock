// Foto prodotti su Firebase Storage. Il modulo firebase/storage viene caricato solo quando serve.
import { app, storageBucket, emulatorsEnabled } from "./firebase.js";
import { compressImage } from "../utils/image.js";

let storagePromise;
function loadStorage() {
  storagePromise ??= import("firebase/storage").then((mod) => {
    const storage = mod.getStorage(app, storageBucket ? `gs://${storageBucket}` : undefined);
    if (emulatorsEnabled) mod.connectStorageEmulator(storage, "127.0.0.1", 9199);
    return { mod, storage };
  });
  return storagePromise;
}

const safeId = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, "_");

/**
 * Comprime e carica la foto in users/{uid}/products/{productId}-{timestamp}.jpg
 * @returns {Promise<{imageUrl: string, imagePath: string}>}
 */
export async function uploadProductImage(uid, productId, file) {
  const blob = await compressImage(file);
  const { mod, storage } = await loadStorage();
  const imagePath = `users/${uid}/products/${safeId(productId)}-${Date.now()}.jpg`;
  const ref = mod.ref(storage, imagePath);
  await mod.uploadBytes(ref, blob, {
    contentType: "image/jpeg",
    cacheControl: "public,max-age=31536000,immutable",
  });
  return { imageUrl: await mod.getDownloadURL(ref), imagePath };
}

/** Ricava il percorso Storage da un URL di download del nostro bucket ("" se esterno, es. Open Food Facts). */
export function storagePathFromUrl(url) {
  if (!url || !storageBucket) return "";
  try {
    const u = new URL(url);
    const isFirebaseHost = u.hostname === "firebasestorage.googleapis.com" || (emulatorsEnabled && u.port === "9199");
    if (!isFirebaseHost) return "";
    const m = u.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (!m || m[1] !== storageBucket) return "";
    return decodeURIComponent(m[2]);
  } catch {
    return "";
  }
}

export const imagePathOf = (item) => item?.imagePath || storagePathFromUrl(item?.imageUrl);

/**
 * Cancella la foto solo se è nostra (users/{uid}/...) e nessun altro documento la usa
 * (duplicati e voci della spesa possono condividere la stessa immagine).
 */
export async function deleteImageIfUnused(uid, path, { products = [], shopping = [], excludeIds = [] } = {}) {
  if (!path || !path.startsWith(`users/${uid}/`)) return false;
  const exclude = new Set(excludeIds);
  const used = [...products, ...shopping].some((x) => !exclude.has(x.id) && imagePathOf(x) === path);
  if (used) return false;
  const { mod, storage } = await loadStorage();
  try {
    await mod.deleteObject(mod.ref(storage, path));
    return true;
  } catch (err) {
    if (err?.code === "storage/object-not-found") return false;
    throw err;
  }
}

export function storageErrorMessage(err) {
  switch (err?.code) {
    case "storage/unauthorized":
      return "Permesso negato per la foto. Controlla che le Storage Rules siano pubblicate.";
    case "storage/unauthenticated":
      return "Sessione scaduta: esci e accedi di nuovo.";
    case "storage/retry-limit-exceeded":
    case "storage/canceled":
      return "Caricamento interrotto. Controlla la connessione e riprova.";
    case "image/unsupported":
      return "Formato immagine non supportato. Usa una foto JPEG o PNG.";
    default:
      return navigator.onLine ? "Impossibile caricare la foto. Riprova." : "Serve la connessione per caricare la foto.";
  }
}
