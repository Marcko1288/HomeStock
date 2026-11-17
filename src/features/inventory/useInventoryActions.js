import { useCallback, useMemo, useRef } from "react";
import { useUid } from "../../app/AuthProvider.jsx";
import { useData } from "../../app/DataProvider.jsx";
import { useToast } from "../../app/ToastProvider.jsx";
import {
  createProduct,
  deleteProduct,
  newProductId,
  patchProduct,
  restoreProduct,
  setQuantity,
  updateProduct,
} from "../../services/inventoryRepo.js";
import { addShoppingItem, updateShoppingItem } from "../../services/shoppingRepo.js";
import { deleteImageIfUnused, imagePathOf } from "../../services/storageService.js";
import { normalizeText, roundQty } from "../../utils/format.js";

/**
 * Le scritture non vengono mai attese dall'interfaccia: la cache locale di Firestore
 * aggiorna subito la vista (anche offline) e la sincronizzazione avviene in background.
 */
export function useInventoryActions() {
  const uid = useUid();
  const toast = useToast();
  const { inventory, shopping } = useData();
  const pendingQty = useRef(new Map());
  const timers = useRef(new Map());

  // Riferimenti sempre aggiornati per le callback ritardate (toast).
  const latest = useRef({ inventory, shopping });
  latest.current = { inventory, shopping };

  const fail = useCallback(
    (msg) => (err) => {
      toast.error(err?.code === "permission-denied" ? "Permesso negato dal server. Riprova dopo un nuovo accesso." : msg);
    },
    [toast],
  );

  const findShoppingMatch = useCallback(
    (product) =>
      latest.current.shopping.items.find(
        (x) =>
          !x.checked &&
          ((product.barcode && x.barcode === product.barcode) || normalizeText(x.name) === normalizeText(product.name)),
      ),
    [],
  );

  const addToShopping = useCallback(
    (product, { silent = false } = {}) => {
      const existing = findShoppingMatch(product);
      if (existing) {
        updateShoppingItem(uid, existing.id, { quantity: roundQty(existing.quantity + 1) }).catch(
          fail("Impossibile aggiornare la lista della spesa."),
        );
        if (!silent) toast.success(`Già in lista: ${existing.name} ×${roundQty(existing.quantity + 1)}`);
        return;
      }
      addShoppingItem(uid, {
        name: product.name,
        barcode: product.barcode,
        imageUrl: product.imageUrl,
        quantity: 1,
        unit: product.unit,
        category: product.category,
      }).catch(fail("Impossibile aggiungere alla lista della spesa."));
      if (!silent) toast.success(`${product.name} aggiunto alla spesa`);
    },
    [uid, toast, fail, findShoppingMatch],
  );

  /** Aggiornamento ottimistico: tap ripetuti partono dall'ultimo valore richiesto. */
  const changeQuantity = useCallback(
    (product, delta) => {
      const base = pendingQty.current.get(product.id) ?? product.quantity;
      const next = Math.max(0, roundQty(base + delta));
      if (next === base) return;
      pendingQty.current.set(product.id, next);
      clearTimeout(timers.current.get(product.id));
      timers.current.set(
        product.id,
        setTimeout(() => pendingQty.current.delete(product.id), 1500),
      );
      setQuantity(uid, product.id, next).catch(fail("Quantità non salvata. Riprova."));
      if (next === 0 && base > 0) {
        const inList = Boolean(findShoppingMatch(product));
        toast.show({
          message: inList ? `${product.name} terminato — è già nella spesa` : `${product.name} terminato`,
          tone: "info",
          ...(inList
            ? {}
            : { action: { label: "Aggiungi alla spesa", onClick: () => addToShopping(product) } }),
        });
      }
    },
    [uid, toast, fail, addToShopping, findShoppingMatch],
  );

  const setProductQuantity = useCallback(
    (product, value) => changeQuantity(product, value - (pendingQty.current.get(product.id) ?? product.quantity)),
    [changeQuantity],
  );

  /** Elimina subito, con "Annulla" per 5 secondi. La foto viene rimossa solo a toast scaduto. */
  const removeProduct = useCallback(
    (product) => {
      const raw = latest.current.inventory.raw.get(product.id);
      deleteProduct(uid, product.id).catch(fail("Impossibile eliminare il prodotto."));
      toast.show({
        message: `${product.name} eliminato`,
        tone: "info",
        action: {
          label: "Annulla",
          onClick: () => raw && restoreProduct(uid, product.id, raw).catch(fail("Impossibile ripristinare.")),
        },
        onExpire: () => {
          const { inventory: inv, shopping: shop } = latest.current;
          deleteImageIfUnused(uid, imagePathOf(product), {
            products: inv.items,
            shopping: shop.items,
            excludeIds: [product.id],
          }).catch(() => {});
        },
      });
    },
    [uid, toast, fail],
  );

  /**
   * Salva un prodotto dal form. Per un prodotto nuovo con barcode già presente nello stesso
   * luogo, aumenta la quantità esistente (comportamento della versione precedente).
   * @returns {{ id: string, merged: boolean }}
   */
  const saveProduct = useCallback(
    (data, { id, previous, merge = true } = {}) => {
      if (id) {
        updateProduct(uid, id, data).catch(fail("Modifiche non salvate. Riprova."));
        // Foto sostituita o rimossa → cancella la vecchia se non più usata.
        const oldPath = previous ? imagePathOf(previous) : "";
        if (oldPath && oldPath !== imagePathOf(data)) {
          const { inventory: inv, shopping: shop } = latest.current;
          deleteImageIfUnused(uid, oldPath, { products: inv.items, shopping: shop.items, excludeIds: [id] }).catch(
            () => {},
          );
        }
        toast.success("Modifiche salvate");
        return { id, merged: false };
      }
      const existing =
        merge &&
        data.barcode &&
        latest.current.inventory.items.find((p) => p.barcode === data.barcode && p.location === data.location);
      if (existing) {
        const next = roundQty(existing.quantity + (Number(data.quantity) || 0));
        setQuantity(uid, existing.id, next).catch(fail("Quantità non salvata. Riprova."));
        toast.success(`${existing.name}: ora ${next} ${existing.unit} in ${existing.location}`);
        return { id: existing.id, merged: true };
      }
      const newId = data.id || newProductId(uid);
      createProduct(uid, newId, data).catch(fail("Prodotto non salvato. Riprova."));
      toast.success(`${data.name} aggiunto in ${data.location}`);
      return { id: newId, merged: false };
    },
    [uid, toast, fail],
  );

  const duplicateProduct = useCallback(
    (product) => {
      const newId = newProductId(uid);
      createProduct(uid, newId, { ...product, name: `${product.name} (copia)`, quantity: 1 }).catch(
        fail("Impossibile duplicare il prodotto."),
      );
      toast.success("Prodotto duplicato");
      return newId;
    },
    [uid, toast, fail],
  );

  const moveProduct = useCallback(
    (product, location) => {
      const from = product.location;
      patchProduct(uid, product.id, { location }).catch(fail("Impossibile spostare il prodotto."));
      toast.show({
        message: `Spostato in ${location}`,
        tone: "success",
        action: { label: "Annulla", onClick: () => patchProduct(uid, product.id, { location: from }) },
      });
    },
    [uid, toast, fail],
  );

  return useMemo(
    () => ({
    newId: () => newProductId(uid),
    changeQuantity,
    setProductQuantity,
    removeProduct,
    saveProduct,
    duplicateProduct,
    moveProduct,
    addToShopping,
    isInShopping: (p) => Boolean(findShoppingMatch(p)),
    }),
    [uid, changeQuantity, setProductQuantity, removeProduct, saveProduct, duplicateProduct, moveProduct, addToShopping, findShoppingMatch],
  );
}
