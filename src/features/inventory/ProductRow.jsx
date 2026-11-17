import { memo } from "react";
import { Link } from "react-router";
import { ShoppingCart, Trash2 } from "lucide-react";
import { SwipeRow } from "../../components/ui/SwipeRow.jsx";
import { Stepper } from "../../components/ui/Stepper.jsx";
import { ProductThumb } from "../../components/ui/ProductThumb.jsx";
import { StatusBadges } from "./StatusBadges.jsx";

const LEFT = { label: "Elimina", tone: "red", icon: <Trash2 aria-hidden="true" /> };
const RIGHT = { label: "Spesa", tone: "blue", icon: <ShoppingCart aria-hidden="true" /> };

export const ProductRow = memo(function ProductRow({ product, status, showLocation, search, actions }) {
  return (
    <SwipeRow
      leftAction={LEFT}
      rightAction={RIGHT}
      onSwipeLeft={() => actions.removeProduct(product)}
      onSwipeRight={() => actions.addToShopping(product)}
    >
      <div className={`row ${status.out ? "is-out" : ""}`}>
        <Link className="row__main" to={`/scorte/${product.id}${search}`} state={{ modal: true }} draggable={false}>
          <ProductThumb src={product.imageUrl} size={48} />
          <span className="row__text">
            <span className="row__name">{product.name}</span>
            <span className="row__meta">
              {showLocation && <span className="row__loc">{product.location}</span>}
              <StatusBadges product={product} status={status} />
            </span>
          </span>
        </Link>
        <Stepper
          size="sm"
          value={product.quantity}
          unit={product.unit}
          label={product.name}
          onChange={(v) => actions.setProductQuantity(product, v)}
        />
      </div>
    </SwipeRow>
  );
});
