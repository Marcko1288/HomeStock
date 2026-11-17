import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Flashlight, FlashlightOff, Keyboard, PackagePlus, RefreshCw, X } from "lucide-react";
import { BottomSheet } from "../../components/ui/BottomSheet.jsx";
import { ProductThumb } from "../../components/ui/ProductThumb.jsx";
import { Segmented } from "../../components/ui/Segmented.jsx";
import { useInventory } from "../../hooks/useInventory.js";
import { useSettings } from "../../hooks/useSettings.js";
import { formatQty } from "../../utils/format.js";
import { emptyProduct } from "../../utils/product.js";
import { ProductForm } from "../inventory/ProductForm.jsx";
import { useInventoryActions } from "../inventory/useInventoryActions.js";
import { useToast } from "../../app/ToastProvider.jsx";
import { useBarcodeScanner } from "./useBarcodeScanner.js";

const LOC_KEY = "homestock.scanLocation";
// Lo stesso codice viene ignorato finché resta inquadrato (e per 1,5 s dopo che è uscito).
const COOLDOWN_MS = 1500;

function readLocation(locations) {
  try {
    const saved = localStorage.getItem(LOC_KEY);
    if (saved && locations.includes(saved)) return saved;
  } catch {
    // ignora
  }
  return locations[0];
}

export default function ScannerPage() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const settings = useSettings();
  const { products } = useInventory();
  const actions = useInventoryActions();
  const toast = useToast();
  const video = useRef(null);
  const lastScan = useRef({ code: "", at: 0 });
  const [where, setWhere] = useState(() => readLocation(settings.locations));
  // sheet: null | { type: "existing", product } | { type: "other", product, code } | { type: "new", code, base } | { type: "manual" }
  const [sheet, setSheet] = useState(null);

  const closeScanner = () => {
    if (routerLocation.key !== "default") navigate(-1);
    else navigate("/", { replace: true });
  };

  const chooseWhere = (loc) => {
    setWhere(loc);
    try {
      localStorage.setItem(LOC_KEY, loc);
    } catch {
      // ignora
    }
  };

  function handleCode(raw) {
    const code = String(raw).replace(/\s+/g, "");
    if (!code) return;
    const now = Date.now();
    if (code === lastScan.current.code && now - lastScan.current.at < COOLDOWN_MS) {
      lastScan.current.at = now;
      return;
    }
    lastScan.current = { code, at: now };
    navigator.vibrate?.(30);
    const matches = products.filter((p) => p.barcode === code);
    const here = matches.find((p) => p.location === where);
    if (here) setSheet({ type: "existing", product: here });
    else if (matches.length) setSheet({ type: "other", product: matches[0], code });
    else setSheet({ type: "new", code });
  }

  const adjust = (product, delta) => {
    const next = Math.max(0, product.quantity + delta);
    actions.changeQuantity(product, delta);
    if (next > 0) toast.success(`${product.name}: ${formatQty(next)} ${product.unit} in ${product.location}`);
    closeSheet();
  };

  const closeSheet = () => {
    lastScan.current.at = Date.now(); // evita di rileggere subito lo stesso codice
    setSheet(null);
  };

  const { state, error, torch, toggleTorch, retry } = useBarcodeScanner(video, {
    onDetected: handleCode,
    paused: sheet !== null,
  });

  const locOptions = useMemo(() => settings.locations.map((l) => ({ value: l, label: l })), [settings.locations]);

  // Aggiornamento ottimistico: la scheda mostra subito la nuova quantità.
  const liveProduct = sheet?.product ? products.find((p) => p.id === sheet.product.id) || sheet.product : null;

  return (
    <div className="scanner">
      <video ref={video} className="scanner__video" playsInline muted autoPlay aria-hidden="true" />

      <div className="scanner__top">
        <button type="button" className="icon-btn icon-btn--glass" onClick={closeScanner} aria-label="Chiudi scanner">
          <X aria-hidden="true" />
        </button>
        <div className="scanner__where">
          <Segmented label="Aggiungi in" options={locOptions} value={where} onChange={chooseWhere} size="sm" />
        </div>
        {torch.supported ? (
          <button
            type="button"
            className={`icon-btn icon-btn--glass ${torch.on ? "is-active" : ""}`}
            onClick={toggleTorch}
            aria-pressed={torch.on}
            aria-label={torch.on ? "Spegni torcia" : "Accendi torcia"}
          >
            {torch.on ? <FlashlightOff aria-hidden="true" /> : <Flashlight aria-hidden="true" />}
          </button>
        ) : (
          <span className="icon-btn-spacer" />
        )}
      </div>

      <div className="scanner__frame" aria-hidden="true">
        <span className="scanner__corners" />
        {state === "running" && <span className="scanner__laser" />}
      </div>

      <div className="scanner__bottom">
        {state === "error" ? (
          <div className="scanner__error" role="alert">
            <p>{error?.message}</p>
            {error?.kind !== "unsupported" && error?.kind !== "nocamera" && (
              <button type="button" className="btn btn--light" onClick={retry}>
                <RefreshCw aria-hidden="true" /> Riprova
              </button>
            )}
          </div>
        ) : (
          <p className="scanner__hint" aria-live="polite">
            {state === "starting" ? "Avvio fotocamera…" : "Inquadra il codice a barre"}
          </p>
        )}
        <div className="scanner__manual">
          <button type="button" className="btn btn--glass" onClick={() => setSheet({ type: "manual" })}>
            <Keyboard aria-hidden="true" /> Inserisci codice
          </button>
          <button type="button" className="btn btn--glass" onClick={() => setSheet({ type: "new", code: "" })}>
            <PackagePlus aria-hidden="true" /> Senza barcode
          </button>
        </div>
      </div>

      {sheet?.type === "existing" && liveProduct && (
        <BottomSheet title="" onClose={closeSheet}>
          <div className="scan-result">
            <ProductThumb src={liveProduct.imageUrl} size={72} alt={liveProduct.name} />
            <div>
              <h2 className="scan-result__name">{liveProduct.name}</h2>
              <p className="scan-result__qty">
                <b>{formatQty(liveProduct.quantity)}</b> {liveProduct.unit} in {liveProduct.location}
              </p>
            </div>
          </div>
          <div className="stack-8">
            <button
              type="button"
              className="btn btn--primary btn--block btn--lg"
              onClick={() => adjust(liveProduct, 1)}
            >
              Aggiungi +1
            </button>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--secondary"
                disabled={liveProduct.quantity <= 0}
                onClick={() => adjust(liveProduct, -1)}
              >
                Togli 1
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => navigate(`/scorte/${liveProduct.id}`, { replace: true })}
              >
                Apri
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {sheet?.type === "other" && liveProduct && (
        <BottomSheet title="" onClose={closeSheet}>
          <div className="scan-result">
            <ProductThumb src={liveProduct.imageUrl} size={72} alt={liveProduct.name} />
            <div>
              <h2 className="scan-result__name">{liveProduct.name}</h2>
              <p className="scan-result__qty">
                Presente in {liveProduct.location}: <b>{formatQty(liveProduct.quantity)}</b> {liveProduct.unit}
              </p>
            </div>
          </div>
          <div className="stack-8">
            <button
              type="button"
              className="btn btn--primary btn--block btn--lg"
              onClick={() => setSheet({ type: "new", code: sheet.code, base: liveProduct })}
            >
              Aggiungi in {where}
            </button>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => adjust(liveProduct, 1)}
              >
                +1 in {liveProduct.location}
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => navigate(`/scorte/${liveProduct.id}`, { replace: true })}
              >
                Apri
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {sheet?.type === "new" && (
        <NewFromScan
          key={sheet.code + (sheet.base?.id || "")}
          code={sheet.code}
          base={sheet.base}
          where={where}
          settings={settings}
          actions={actions}
          onClose={closeSheet}
        />
      )}

      {sheet?.type === "manual" && (
        <ManualCodeSheet
          onClose={closeSheet}
          onSubmit={(code) => {
            lastScan.current = { code: "", at: 0 };
            handleCode(code);
          }}
        />
      )}
    </div>
  );
}

function NewFromScan({ code, base, where, settings, actions, onClose }) {
  const productId = useMemo(() => actions.newId(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const initial = useMemo(() => {
    if (base) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...copy } = base;
      return { ...copy, quantity: 1, location: where, expiryDate: "" };
    }
    return emptyProduct({ barcode: code, location: where }, settings);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <BottomSheet title={code ? "Nuovo prodotto" : "Inserimento manuale"} onClose={onClose} size="full">
      <ProductForm
        isNew
        initial={initial}
        productId={productId}
        autoLookup={!base}
        submitLabel="Aggiungi"
        onSubmit={(data) => {
          actions.saveProduct(data);
          onClose();
        }}
      />
    </BottomSheet>
  );
}

function ManualCodeSheet({ onClose, onSubmit }) {
  const [code, setCode] = useState("");
  return (
    <BottomSheet title="Inserisci codice" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) onSubmit(code.trim());
        }}
      >
        <div className="group">
          <div className="field">
            <label htmlFor="manual-code">Codice a barre</label>
            <input
              id="manual-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s+/g, ""))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="es. 8076809513753"
              autoFocus
            />
          </div>
        </div>
        <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={!code.trim()}>
          Cerca
        </button>
      </form>
    </BottomSheet>
  );
}
