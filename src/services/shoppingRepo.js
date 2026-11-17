// Unico punto di accesso a users/{uid}/shoppingList.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./db.js";
import { shoppingFields } from "../utils/product.js";

const shoppingCol = (uid) => collection(db, "users", uid, "shoppingList");
const itemDoc = (uid, id) => doc(db, "users", uid, "shoppingList", id);

export function subscribeShopping(uid, onData, onError) {
  return onSnapshot(
    shoppingCol(uid),
    { includeMetadataChanges: true },
    (snap) =>
      onData(
        snap.docs.map((d) => ({ id: d.id, data: d.data({ serverTimestamps: "estimate" }) })),
        { pending: snap.metadata.hasPendingWrites, fromCache: snap.metadata.fromCache },
      ),
    onError,
  );
}

export function addShoppingItem(uid, input) {
  return addDoc(shoppingCol(uid), { ...shoppingFields(input), createdAt: serverTimestamp() });
}

export function updateShoppingItem(uid, id, patch) {
  return updateDoc(itemDoc(uid, id), patch);
}

export const deleteShoppingItem = (uid, id) => deleteDoc(itemDoc(uid, id));

export const restoreShoppingItem = (uid, id, rawData) => setDoc(itemDoc(uid, id), rawData);

export async function deleteShoppingItems(uid, ids) {
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    ids.slice(i, i + 400).forEach((id) => batch.delete(itemDoc(uid, id)));
    await batch.commit();
  }
}
