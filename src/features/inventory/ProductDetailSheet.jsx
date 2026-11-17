import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeftRight, Copy, Pencil, ShoppingCart, Trash2 } from "lucide-react";
import { BottomSheet } from "../../components/ui/BottomSheet.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { ProductThumb } from "../../components/ui/ProductThumb.jsx";
import { Stepper } from "../../components/ui/Stepper.jsx";
import { useInventory } from "../../hooks/useInventory.js";
import { useSettings, useStatusOptions } from "../../hooks/useSettings.js";
import { formatLongDate } from "../../utils/date.js";
import { formatPrice, formatQty } from "../../utils/format.js";
import { getStatus } from "../../utils/status.js";
import { ProductForm } from "./ProductForm.jsx";
import { StatusBadges } from "./StatusBadges.jsx";
import { useInventoryActions } from "./useInventoryActions.js";
import { useCloseSheet } from "./useCloseSheet.js";

/** /scorte/:id — dettaglio prodotto con modifica, duplica, sposta, elimina. */
export default function ProductDetailSheet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { findById, loading } = useInventory();
  const settings = useSettings();
  const statusOpts = useStatusOptions();
  const actions = useInventoryActions();
  const close = useCloseSheet();
  const [editing, setEditing] = useState(false);
  const product = findById(id);

  if (loading) return null;

  if (!product) {
    return (
      <BottomSheet title="Prodotto" onClose={close}>
        <EmptyState title="Prodotto non trovato">Potrebbe essere stato eliminato.</EmptyState>
      </BottomSheet>
    );
  }

  if (editing) {
    return (
      <BottomSheet title="Modifica prodotto" onClose={() => setEditing(false)} size="full">
        <ProductForm
          initial={product}
          productId={product.id}
          onSubmit={(data) => {
            actions.saveProduct(data, { id: product.id, previous: product });
            setEditing(false);
          }}
        />
      </BottomSheet>
    );
  }

  const status = getStatus(product, statusOpts);
  const otherLocations = settings.locations.filter((l) => l !== product.location);
  const inShopping = actions.isInShopping(product);

  const rows = [
    ["Luogo", product.location],
    ["Categoria", product.category],
    product.barcode && ["Barcode", product.barcode],
    product.expiryDate && ["Scadenza", formatLongDate(product.expiryDate)],
    product.minQuantity > 0 && ["Soglia minima", `${formatQty(product.minQuantity)} ${product.unit}`],
    product.minPrice > 0 && ["Prezzo minimo", formatPrice(product.minPrice)],
  ].filter(Boolean);

  return (
    <BottomSheet title="" onClose={close}>
      <div className="detail">
        <div className="detail__head">
          <ProductThumb src={product.imageUrl} size={84} alt={product.name} />
          <div className="detail__titles">
            <h2 className="detail__name">{product.name}</h2>
            <StatusBadges product={product} status={status} long />
          </div>
        </div>

        <div className="detail__qty">
          <Stepper
            size="lg"
            value={product.quantity}
            unit={product.unit}
            label={product.name}
            onChange={(v) => actions.setProductQuantity(product, v)}
          />
        </div>

        <dl className="group info-list">
          {rows.map(([k, v]) => (
            <div className="info-list__row" key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <div className="action-grid">
          <button type="button" className="action-tile" onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" />
            Modifica
          </button>
          <button
            type="button"
            className="action-tile"
            onClick={() => {
              const newId = actions.duplicateProduct(product);
              navigate(`/scorte/${newId}`, { replace: true, state: { modal: true } });
            }}
          >
            <Copy aria-hidden="true" />
            Duplica
          </button>
          {otherLocations.map((loc) => (
            <button type="button" className="action-tile" key={loc} onClick={() => actions.moveProduct(product, loc)}>
              <ArrowLeftRight aria-hidden="true" />
              Sposta in {loc}
            </button>
          ))}
          <button
            type="button"
            className="action-tile"
            onClick={() => actions.addToShopping(product)}
          >
            <ShoppingCart aria-hidden="true" />
            {inShopping ? "Già in spesa · +1" : "Aggiungi alla spesa"}
          </button>
          <button
            type="button"
            className="action-tile action-tile--danger"
            onClick={() => {
              actions.removeProduct(product);
              close();
            }}
          >
            <Trash2 aria-hidden="true" />
            Elimina
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
