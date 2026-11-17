import { useId, useMemo, useState } from "react";
import { Check, ChevronDown, PackageCheck, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { BottomSheet, ConfirmSheet } from "../../components/ui/BottomSheet.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { PageHeader } from "../../components/ui/PageHeader.jsx";
import { ProductThumb } from "../../components/ui/ProductThumb.jsx";
import { Segmented } from "../../components/ui/Segmented.jsx";
import { SkeletonList } from "../../components/ui/Skeleton.jsx";
import { Stepper } from "../../components/ui/Stepper.jsx";
import { useInventory } from "../../hooks/useInventory.js";
import { useSettings } from "../../hooks/useSettings.js";
import { useShopping } from "../../hooks/useShopping.js";
import { UNITS } from "../../utils/constants.js";
import { formatQty, normalizeText } from "../../utils/format.js";
import { useShoppingActions } from "./useShoppingActions.js";

const BUY_LOC_KEY = "homestock.buyLocation";

function ShoppingRow({ item, actions, onOpen, onBuy }) {
  return (
    <li className="shop-row">
      <button type="button" className="checkbox" onClick={() => actions.check(item)} aria-label={`Spunta ${item.name}`}>
        <Check aria-hidden="true" />
      </button>
      <button type="button" className="shop-row__main" onClick={() => onOpen(item)}>
        {item.imageUrl && <ProductThumb src={item.imageUrl} size={36} />}
        <span className="shop-row__text">
          <span className="shop-row__name">{item.name}</span>
          <span className="shop-row__qty">
            {formatQty(item.quantity)} {item.unit}
          </span>
        </span>
      </button>
      <button type="button" className="pill-btn" onClick={() => onBuy(item)}>
        <PackageCheck aria-hidden="true" /> Ho comprato
      </button>
    </li>
  );
}

export default function ShoppingPage() {
  const { open, legacyChecked, loading, error } = useShopping();
  const actions = useShoppingActions();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(null);
  const [buying, setBuying] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const inputId = useId();

  const groups = useMemo(() => {
    const map = new Map();
    open.forEach((x) => {
      if (!map.has(x.category)) map.set(x.category, []);
      map.get(x.category).push(x);
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "it"))
      .map(([k, items]) => [k, items.sort((a, b) => a.name.localeCompare(b.name, "it"))]);
  }, [open]);

  const submit = (e) => {
    e.preventDefault();
    actions.quickAdd(draft);
    setDraft("");
  };

  let content;
  if (error) {
    content = (
      <EmptyState icon={ShoppingCart} title="Impossibile caricare la lista">
        Controlla la connessione e riapri l'app.
      </EmptyState>
    );
  } else if (loading) {
    content = <SkeletonList rows={5} />;
  } else if (!open.length) {
    content = (
      <EmptyState emoji="🛒" title="Lista vuota">
        Aggiungi qui sopra cosa comprare, oppure scorri a destra un prodotto in Scorte.
      </EmptyState>
    );
  } else {
    content = groups.map(([cat, items]) => (
      <section key={cat} className="list-section" aria-label={cat}>
        <h2 className="list-section__title list-section__title--flat">
          {cat} <span>{items.length}</span>
        </h2>
        <ul className="list">
          {items.map((item) => (
            <ShoppingRow key={item.id} item={item} actions={actions} onOpen={setEditing} onBuy={setBuying} />
          ))}
        </ul>
      </section>
    ));
  }

  return (
    <div className="page">
      <PageHeader title="Spesa" subtitle={open.length ? `${open.length} da comprare` : undefined} />

      <form className="quick-add" onSubmit={submit}>
        <label htmlFor={inputId} className="sr-only">
          Aggiungi alla lista
        </label>
        <input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Aggiungi alla lista…"
          autoComplete="off"
          enterKeyHint="done"
        />
        <button type="submit" className="icon-btn icon-btn--primary" disabled={!draft.trim()} aria-label="Aggiungi">
          <Plus aria-hidden="true" />
        </button>
      </form>

      {content}

      {legacyChecked.length > 0 && (
        <details className="legacy">
          <summary>
            <span>Già spuntate ({legacyChecked.length})</span>
            <ChevronDown aria-hidden="true" />
          </summary>
          <ul className="list list--muted">
            {legacyChecked.map((x) => (
              <li key={x.id} className="shop-row is-done">
                <span className="checkbox is-checked" aria-hidden="true">
                  <Check />
                </span>
                <span className="shop-row__text">
                  <span className="shop-row__name">{x.name}</span>
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn--plain btn--danger-text btn--block" onClick={() => setConfirmClear(true)}>
            <Trash2 aria-hidden="true" /> Svuota
          </button>
        </details>
      )}

      {editing && <EditItemSheet item={editing} actions={actions} onClose={() => setEditing(null)} />}
      {buying && <BuySheet item={buying} actions={actions} onClose={() => setBuying(null)} />}
      {confirmClear && (
        <ConfirmSheet
          title="Svuotare le voci spuntate?"
          message={`${legacyChecked.length} voci già spuntate verranno eliminate definitivamente.`}
          confirmLabel="Elimina voci"
          onConfirm={() => actions.clearItems(legacyChecked)}
          onClose={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}

function EditItemSheet({ item, actions, onClose }) {
  const settings = useSettings();
  const [d, setD] = useState({ name: item.name, quantity: item.quantity, unit: item.unit, category: item.category });
  const nameId = useId();
  const catId = useId();
  const save = (e) => {
    e.preventDefault();
    actions.update(item, { ...d, name: d.name.trim() || item.name });
    onClose();
  };
  return (
    <BottomSheet title="Modifica voce" onClose={onClose}>
      <form className="form" onSubmit={save}>
        <div className="group">
          <div className="field">
            <label htmlFor={nameId}>Nome</label>
            <input id={nameId} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoComplete="off" />
          </div>
          <div className="field field--row">
            <span className="field__label">Quantità</span>
            <Stepper value={d.quantity} min={1} onChange={(v) => setD({ ...d, quantity: v })} />
          </div>
          <div className="field">
            <span className="field__label">Unità</span>
            <Segmented
              label="Unità"
              options={UNITS.map((u) => ({ value: u, label: u }))}
              value={UNITS.includes(d.unit) ? d.unit : "pz"}
              onChange={(v) => setD({ ...d, unit: v })}
            />
          </div>
          <div className="field">
            <label htmlFor={catId}>Categoria</label>
            <select id={catId} value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })}>
              {settings.categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="stack-8">
          <button type="submit" className="btn btn--primary btn--block btn--lg">
            Salva
          </button>
          <button
            type="button"
            className="btn btn--plain btn--danger-text btn--block"
            onClick={() => {
              actions.remove(item);
              onClose();
            }}
          >
            <Trash2 aria-hidden="true" /> Elimina dalla lista
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}

function BuySheet({ item, actions, onClose }) {
  const settings = useSettings();
  const { products } = useInventory();
  // Luogo proposto: dove si trova già il prodotto, altrimenti l'ultimo usato.
  const known = products.find(
    (p) => (item.barcode && p.barcode === item.barcode) || normalizeText(p.name) === normalizeText(item.name),
  );
  const [location, setLocation] = useState(() => {
    if (known) return known.location;
    try {
      const saved = localStorage.getItem(BUY_LOC_KEY);
      if (saved && settings.locations.includes(saved)) return saved;
    } catch {
      // ignora
    }
    return settings.locations[0];
  });
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [expiryDate, setExpiryDate] = useState("");
  const expId = useId();

  const confirm = () => {
    try {
      localStorage.setItem(BUY_LOC_KEY, location);
    } catch {
      // ignora
    }
    actions.buy(item, { location, quantity, expiryDate });
    onClose();
  };

  return (
    <BottomSheet title="Ho comprato" onClose={onClose}>
      <div className="scan-result">
        <ProductThumb src={item.imageUrl} size={56} />
        <div>
          <h2 className="scan-result__name">{item.name}</h2>
          {known && (
            <p className="scan-result__qty">
              In scorta: {formatQty(known.quantity)} {known.unit} in {known.location}
            </p>
          )}
        </div>
      </div>
      <div className="form">
        <div className="group">
          <div className="field">
            <span className="field__label">Dove lo metti?</span>
            <Segmented
              label="Luogo"
              options={settings.locations.map((l) => ({ value: l, label: l }))}
              value={location}
              onChange={setLocation}
            />
          </div>
          <div className="field field--row">
            <span className="field__label">Quantità</span>
            <Stepper value={quantity} min={1} unit={item.unit} onChange={setQuantity} />
          </div>
          <div className="field">
            <label htmlFor={expId}>Scadenza (facoltativa)</label>
            <input id={expId} type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
        </div>
        <button type="button" className="btn btn--primary btn--block btn--lg" onClick={confirm}>
          Aggiungi in {location}
        </button>
      </div>
    </BottomSheet>
  );
}
