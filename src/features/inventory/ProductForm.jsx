import { useEffect, useId, useRef, useState } from "react";
import { Camera, Loader2, Search, Trash2, X } from "lucide-react";
import { useUid } from "../../app/AuthProvider.jsx";
import { useToast } from "../../app/ToastProvider.jsx";
import { useInventory } from "../../hooks/useInventory.js";
import { useSettings } from "../../hooks/useSettings.js";
import { useOnlineStatus } from "../../hooks/useOnlineStatus.js";
import { lookupBarcode } from "../../services/openFoodFacts.js";
import { deleteImageIfUnused, storageErrorMessage, uploadProductImage } from "../../services/storageService.js";
import { Segmented } from "../../components/ui/Segmented.jsx";
import { Stepper } from "../../components/ui/Stepper.jsx";
import { UNITS } from "../../utils/constants.js";
import { formatQty, parseDecimal } from "../../utils/format.js";

/**
 * Form prodotto (nuovo o modifica). Le foto vengono compresse e caricate subito
 * con l'id definitivo; se il form viene chiuso senza salvare, le foto caricate vengono rimosse.
 */
export function ProductForm({ initial, productId, isNew, autoLookup = false, onSubmit, submitLabel = "Salva" }) {
  const uid = useUid();
  const toast = useToast();
  const online = useOnlineStatus();
  const settings = useSettings();
  const { products } = useInventory();
  const [d, setD] = useState(() => ({ ...initial, minPrice: initial.minPrice ? String(initial.minPrice).replace(".", ",") : "" }));
  const [uploading, setUploading] = useState(false);
  const [lookup, setLookup] = useState("idle"); // idle | loading | found | notfound | error
  const [nameError, setNameError] = useState(false);
  const sessionUploads = useRef([]);
  const submitted = useRef(false);
  const ids = { name: useId(), barcode: useId(), category: useId(), expiry: useId(), price: useId() };

  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));

  async function runLookup(code = d.barcode, { fillOnlyEmpty = false } = {}) {
    if (!code) return;
    if (!online) {
      setLookup("error");
      return;
    }
    setLookup("loading");
    try {
      const found = await lookupBarcode(code);
      if (!found) return setLookup("notfound");
      setD((x) => ({
        ...x,
        name: fillOnlyEmpty && x.name ? x.name : found.name || x.name,
        // La foto di Open Food Facts si usa solo se non ce n'è già una.
        imageUrl: x.imageUrl || found.imageUrl,
        imagePath: x.imageUrl ? x.imagePath : "",
        category: settings.categories.includes(found.category) ? found.category : x.category,
      }));
      setLookup("found");
    } catch {
      setLookup("error");
    }
  }

  useEffect(() => {
    if (autoLookup && initial.barcode && !initial.name) runLookup(initial.barcode, { fillOnlyEmpty: true });
    // Alla chiusura senza salvataggio rimuove le foto caricate in questa sessione.
    return () => {
      if (!submitted.current) {
        sessionUploads.current.forEach((path) => deleteImageIfUnused(uid, path).catch(() => {}));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!online) return toast.error("Serve la connessione per caricare la foto.");
    setUploading(true);
    try {
      const res = await uploadProductImage(uid, productId, file);
      // Una foto caricata prima in questo form e poi sostituita non serve più.
      const prevSession = sessionUploads.current.find((p) => p === d.imagePath);
      if (prevSession) {
        deleteImageIfUnused(uid, prevSession).catch(() => {});
        sessionUploads.current = sessionUploads.current.filter((p) => p !== prevSession);
      }
      sessionUploads.current.push(res.imagePath);
      setD((x) => ({ ...x, ...res }));
    } catch (err) {
      toast.error(storageErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  function removePhoto() {
    setD((x) => ({ ...x, imageUrl: "", imagePath: "" }));
  }

  function submit(e) {
    e.preventDefault();
    if (!d.name.trim()) {
      setNameError(true);
      document.getElementById(ids.name)?.focus();
      return;
    }
    if (uploading) return;
    submitted.current = true;
    // Le foto caricate e poi scartate in questo form vanno rimosse.
    sessionUploads.current
      .filter((p) => p !== d.imagePath)
      .forEach((path) => deleteImageIfUnused(uid, path).catch(() => {}));
    onSubmit({ ...d, id: productId, name: d.name.trim(), minPrice: parseDecimal(d.minPrice) });
  }

  const duplicate =
    isNew && d.barcode ? products.find((p) => p.barcode === d.barcode && p.location === d.location) : null;

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="photo-field">
        <label className={`photo-picker ${uploading ? "is-busy" : ""}`}>
          {d.imageUrl ? <img src={d.imageUrl} alt="Foto del prodotto" /> : <Camera aria-hidden="true" />}
          {uploading && (
            <span className="photo-picker__busy">
              <Loader2 className="spin" aria-hidden="true" />
            </span>
          )}
          <span className="sr-only">{d.imageUrl ? "Cambia foto" : "Aggiungi foto"}</span>
          <input type="file" accept="image/*" onChange={onPhoto} disabled={uploading} />
        </label>
        <div className="photo-field__actions">
          <span className="photo-field__label">{uploading ? "Caricamento foto…" : d.imageUrl ? "Tocca per cambiare" : "Aggiungi foto"}</span>
          {d.imageUrl && !uploading && (
            <button type="button" className="btn btn--plain btn--sm btn--danger-text" onClick={removePhoto}>
              <Trash2 aria-hidden="true" /> Rimuovi foto
            </button>
          )}
        </div>
      </div>

      <div className="group">
        <div className="field">
          <label htmlFor={ids.name}>Nome</label>
          <input
            id={ids.name}
            value={d.name}
            onChange={(e) => {
              set("name", e.target.value);
              if (nameError) setNameError(false);
            }}
            placeholder={lookup === "loading" ? "Ricerca in corso…" : "es. Pasta Barilla"}
            autoComplete="off"
            enterKeyHint="next"
            aria-invalid={nameError}
            aria-describedby={nameError ? `${ids.name}-err` : undefined}
          />
          {nameError && (
            <p className="field__error" id={`${ids.name}-err`}>
              Inserisci il nome del prodotto.
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor={ids.barcode}>Barcode</label>
          <div className="field__inline">
            <input
              id={ids.barcode}
              value={d.barcode}
              onChange={(e) => {
                set("barcode", e.target.value.replace(/\s+/g, ""));
                setLookup("idle");
              }}
              inputMode="numeric"
              placeholder="EAN / UPC"
              autoComplete="off"
            />
            <button
              type="button"
              className="icon-btn icon-btn--filled"
              onClick={() => runLookup()}
              disabled={!d.barcode || lookup === "loading"}
              aria-label="Cerca il prodotto su Open Food Facts"
            >
              {lookup === "loading" ? <Loader2 className="spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
            </button>
          </div>
          {lookup === "found" && <p className="field__hint">Dati trovati su Open Food Facts.</p>}
          {lookup === "notfound" && <p className="field__hint">Prodotto non trovato: inseriscilo a mano.</p>}
          {lookup === "error" && (
            <p className="field__hint">{online ? "Ricerca non riuscita. Riprova." : "Ricerca non disponibile offline."}</p>
          )}
        </div>
      </div>

      <div className="group">
        <div className="field field--row">
          <span className="field__label">Quantità</span>
          <Stepper value={Number(d.quantity) || 0} onChange={(v) => set("quantity", v)} />
        </div>
        <div className="field">
          <span className="field__label">Unità</span>
          <Segmented
            label="Unità"
            options={UNITS.map((u) => ({ value: u, label: u }))}
            value={UNITS.includes(d.unit) ? d.unit : "pz"}
            onChange={(v) => set("unit", v)}
          />
        </div>
      </div>

      <div className="group">
        <div className="field">
          <span className="field__label">Luogo</span>
          <Segmented
            label="Luogo"
            options={settings.locations.map((l) => ({ value: l, label: l }))}
            value={d.location}
            onChange={(v) => set("location", v)}
          />
          {duplicate && (
            <p className="field__hint field__hint--warn">
              Già presente in {duplicate.location} ({formatQty(duplicate.quantity)} {duplicate.unit}): salvando aumenterai la
              quantità.
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor={ids.category}>Categoria</label>
          <select id={ids.category} value={d.category} onChange={(e) => set("category", e.target.value)}>
            {settings.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="group">
        <div className="field field--row">
          <span className="field__label">
            Soglia minima
            <small>Avvisa quando ne restano così pochi</small>
          </span>
          <Stepper value={Number(d.minQuantity) || 0} onChange={(v) => set("minQuantity", v)} />
        </div>
        <div className="field">
          <label htmlFor={ids.expiry}>Scadenza</label>
          <div className="field__inline">
            <input id={ids.expiry} type="date" value={d.expiryDate || ""} onChange={(e) => set("expiryDate", e.target.value)} />
            {d.expiryDate && (
              <button type="button" className="icon-btn icon-btn--filled" onClick={() => set("expiryDate", "")} aria-label="Rimuovi scadenza">
                <X aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <div className="field">
          <label htmlFor={ids.price}>Prezzo minimo (€/kg, €/L o €/pz)</label>
          <input
            id={ids.price}
            value={d.minPrice}
            onChange={(e) => set("minPrice", e.target.value.replace(/[^\d.,]/g, ""))}
            inputMode="decimal"
            placeholder="es. 0,79"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="form__submit">
        <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={uploading}>
          {uploading ? "Attendi il caricamento della foto…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
