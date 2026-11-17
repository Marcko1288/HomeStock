import { useCallback, useMemo, useRef } from "react";
import { useUid } from "../../app/AuthProvider.jsx";
import { useData } from "../../app/DataProvider.jsx";
import { useToast } from "../../app/ToastProvider.jsx";
import {
  addShoppingItem,
  deleteShoppingItem,
  deleteShoppingItems,
  restoreShoppingItem,
  updateShoppingItem,
} from "../../services/shoppingRepo.js";
import {
  createProduct,
  deleteProduct,
  newProductId,
  patchProduct,
} from "../../services/inventoryRepo.js";
import { normalizeText, roundQty } from "../../utils/format.js";
import { emptyProduct } from "../../utils/product.js";

const sameProduct = (a, b) =>
  (a.barcode && b.barcode && a.barcode === b.barcode) || normalizeText(a.name) === normalizeText(b.name);

export function useShoppingActions() {
  const uid = useUid();
  const toast = useToast();
  const data = useData();
  const latest = useRef(data);
  latest.current = data;

  const fail = useCallback((msg) => () => toast.error(msg), [toast]);

  const restore = useCallback(
    (item) => {
      const raw = latest.current.shopping.raw.get(item.id);
      return () => raw && restoreShoppingItem(uid, item.id, raw).catch(fail("Impossibile ripristinare."));
    },
    [uid, fail],
  );

  /** Aggiunta veloce per nome: se il prodotto esiste in scorta ne copia barcode, categoria, unità e foto. */
  const quickAdd = useCallback(
    (name) => {
      const clean = name.trim();
      if (!clean) return;
      const { shopping, inventory } = latest.current;
      const existing = shopping.items.find((x) => !x.checked && normalizeText(x.name) === normalizeText(clean));
      if (existing) {
        updateShoppingItem(uid, existing.id, { quantity: roundQty(existing.quantity + 1) }).catch(
          fail("Impossibile aggiornare la lista."),
        );
        toast.success(`${existing.name} ×${roundQty(existing.quantity + 1)}`);
        return;
      }
      const known = inventory.items.find((p) => normalizeText(p.name) === normalizeText(clean));
      addShoppingItem(uid, {
        name: known?.name || clean,
        barcode: known?.barcode || "",
        imageUrl: known?.imageUrl || "",
        unit: known?.unit || "pz",
        category: known?.category || "Altro",
        quantity: 1,
      }).catch(fail("Impossibile aggiungere alla lista."));
    },
    [uid, toast, fail],
  );

  /** Spunta = eliminazione definitiva (come nella versione precedente), annullabile per 5 secondi. */
  const check = useCallback(
    (item) => {
      const undo = restore(item);
      deleteShoppingItem(uid, item.id).catch(fail("Impossibile aggiornare la lista."));
      toast.show({ message: `${item.name} tolto dalla lista`, tone: "success", action: { label: "Annulla", onClick: undo } });
    },
    [uid, toast, fail, restore],
  );

  const update = useCallback(
    (item, patch) => updateShoppingItem(uid, item.id, patch).catch(fail("Modifiche non salvate.")),
    [uid, fail],
  );

  const remove = useCallback(
    (item) => {
      const undo = restore(item);
      deleteShoppingItem(uid, item.id).catch(fail("Impossibile eliminare."));
      toast.show({ message: `${item.name} eliminato`, tone: "info", action: { label: "Annulla", onClick: undo } });
    },
    [uid, toast, fail, restore],
  );

  /**
   * "Ho comprato": rimette il prodotto in scorta nel luogo scelto (somma alla quantità se esiste già,
   * altrimenti lo crea) e lo toglie dalla lista. Annullabile.
   */
  const buy = useCallback(
    (item, { location, quantity, expiryDate }) => {
      const { inventory, settings } = latest.current;
      const qty = roundQty(quantity) || 1;
      const restoreItem = restore(item);
      const match = inventory.items.find((p) => p.location === location && sameProduct(p, item));
      let undoInventory;

      if (match) {
        const prev = { quantity: match.quantity, expiryDate: match.expiryDate };
        const patch = { quantity: roundQty(match.quantity + qty) };
        if (expiryDate) patch.expiryDate = expiryDate;
        patchProduct(uid, match.id, patch).catch(fail("Scorta non aggiornata."));
        undoInventory = () => patchProduct(uid, match.id, prev);
      } else {
        const template = inventory.items.find((p) => sameProduct(p, item));
        const id = newProductId(uid);
        const base = template
          ? template
          : emptyProduct({ category: item.category, unit: item.unit, imageUrl: item.imageUrl }, settings);
        createProduct(uid, id, {
          ...base,
          name: item.name,
          barcode: item.barcode || base.barcode || "",
          quantity: qty,
          location,
          expiryDate: expiryDate || "",
        }).catch(fail("Prodotto non aggiunto in scorta."));
        undoInventory = () => deleteProduct(uid, id);
      }

      deleteShoppingItem(uid, item.id).catch(fail("Impossibile aggiornare la lista."));
      toast.show({
        message: `${item.name} aggiunto in ${location}`,
        tone: "success",
        action: {
          label: "Annulla",
          onClick: () => {
            undoInventory().catch(fail("Impossibile annullare."));
            restoreItem();
          },
        },
      });
    },
    [uid, toast, fail, restore],
  );

  const clearItems = useCallback(
    (items) => {
      deleteShoppingItems(
        uid,
        items.map((x) => x.id),
      ).catch(fail("Impossibile svuotare la lista."));
      toast.success(items.length === 1 ? "1 voce eliminata" : `${items.length} voci eliminate`);
    },
    [uid, toast, fail],
  );

  return useMemo(() => ({ quickAdd, check, update, remove, buy, clearItems }), [quickAdd, check, update, remove, buy, clearItems]);
}
