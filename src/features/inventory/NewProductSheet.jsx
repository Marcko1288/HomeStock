import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { BottomSheet } from "../../components/ui/BottomSheet.jsx";
import { useSettings } from "../../hooks/useSettings.js";
import { resolveOption } from "../../hooks/useFilters.js";
import { emptyProduct } from "../../utils/product.js";
import { ProductForm } from "./ProductForm.jsx";
import { useInventoryActions } from "./useInventoryActions.js";
import { useCloseSheet } from "./useCloseSheet.js";

/** /scorte/nuovo?barcode=…&luogo=… */
export default function NewProductSheet() {
  const [params] = useSearchParams();
  const settings = useSettings();
  const actions = useInventoryActions();
  const close = useCloseSheet();
  const productId = useMemo(() => actions.newId(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const initial = useMemo(
    () =>
      emptyProduct(
        {
          barcode: params.get("barcode") || "",
          location: resolveOption(settings.locations, params.get("luogo")) || settings.locations[0],
        },
        settings,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <BottomSheet title="Nuovo prodotto" onClose={close} size="full">
      <ProductForm
        isNew
        initial={initial}
        productId={productId}
        autoLookup
        onSubmit={(data) => {
          actions.saveProduct(data);
          close();
        }}
      />
    </BottomSheet>
  );
}
