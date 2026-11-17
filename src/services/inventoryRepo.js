// Unico punto di accesso a users/{uid}/inventory.
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./db.js";
import { productFields } from "../utils/product.js";

const inventoryCol = (uid) => collection(db, "users", uid, "inventory");
const productDoc = (uid, id) => doc(db, "users", uid, "inventory", id);

/** Genera l'id prima del salvataggio, così la foto può essere caricata col nome definitivo. */
export const newProductId = (uid) => doc(inventoryCol(uid)).id;

/**
 * Nessun orderBy: con orderBy("name") Firestore escluderebbe i documenti senza nome.
 * L'ordinamento avviene lato client.
 */
export function subscribeInventory(uid, onData, onError) {
  return onSnapshot(
    inventoryCol(uid),
    { includeMetadataChanges: true },
    (snap) =>
      onData(
        snap.docs.map((d) => ({ id: d.id, data: d.data({ serverTimestamps: "estimate" }) })),
        { pending: snap.metadata.hasPendingWrites, fromCache: snap.metadata.fromCache },
      ),
    onError,
  );
}

export function createProduct(uid, id, input) {
  return setDoc(productDoc(uid, id), {
    ...productFields(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateProduct(uid, id, input) {
  return updateDoc(productDoc(uid, id), { ...productFields(input), updatedAt: serverTimestamp() });
}

export function patchProduct(uid, id, patch) {
  return updateDoc(productDoc(uid, id), { ...patch, updatedAt: serverTimestamp() });
}

export const setQuantity = (uid, id, quantity) => patchProduct(uid, id, { quantity });

export const deleteProduct = (uid, id) => deleteDoc(productDoc(uid, id));

/** Ripristina un documento cancellato con lo stesso id e gli stessi dati (per "Annulla"). */
export const restoreProduct = (uid, id, rawData) => setDoc(productDoc(uid, id), rawData);
