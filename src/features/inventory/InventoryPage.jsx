import { useDeferredValue, useEffect, useMemo, useRef } from "react";
import { Link, Outlet } from "react-router";
import { Boxes, Layers, Plus, ScanBarcode, Search, SearchX, X } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader.jsx";
import { Chip, ChipRow } from "../../components/ui/Chip.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { SkeletonList } from "../../components/ui/Skeleton.jsx";
import { useInventory } from "../../hooks/useInventory.js";
import { useSettings, useStatusOptions } from "../../hooks/useSettings.js";
import { resolveOption, useFilters } from "../../hooks/useFilters.js";
import { normalizeText, toSlug } from "../../utils/format.js";
import { STATUS_FILTERS, getStatus, matchesStatus } from "../../utils/status.js";
import { ProductRow } from "./ProductRow.jsx";
import { useInventoryActions } from "./useInventoryActions.js";

export default function InventoryPage() {
  const { products, loading, error } = useInventory();
  const settings = useSettings();
  const statusOpts = useStatusOptions();
  const actions = useInventoryActions();
  const { filters, setFilter, clear, search } = useFilters();
  const query = useDeferredValue(filters.q);
  const toolbar = useRef(null);

  const location = resolveOption(settings.locations, filters.luogo);
  const categoriesPresent = useMemo(
    () => settings.categories.filter((c) => products.some((p) => p.category === c)),
    [settings.categories, products],
  );
  const category = resolveOption(categoriesPresent, filters.categoria);
  const statusFilter = STATUS_FILTERS.find((s) => s.id === filters.stato);
  const grouped = filters.gruppi === "1";
  const hasFilters = Boolean(filters.q || location || category || statusFilter);

  const rows = useMemo(() => {
    const q = normalizeText(query);
    return products
      .map((product) => ({ product, status: getStatus(product, statusOpts) }))
      .filter(({ product, status }) => {
        if (q && !normalizeText(product.name).includes(q) && !product.barcode.includes(q)) return false;
        if (location && product.location !== location) return false;
        if (category && product.category !== category) return false;
        if (statusFilter && !matchesStatus(status, statusFilter.id)) return false;
        return true;
      });
  }, [products, query, location, category, statusFilter, statusOpts.today, statusOpts.expiringDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    if (!grouped) return null;
    const map = new Map();
    rows.forEach((r) => {
      const k = r.product.category;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "it"));
  }, [rows, grouped]);

  // Altezza della barra sticky → offset delle intestazioni di gruppo.
  useEffect(() => {
    const el = toolbar.current;
    if (!el || !("ResizeObserver" in window)) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty("--toolbar-h", `${Math.round(entry.target.offsetHeight)}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toggle = (key, value, current) => setFilter(key, current ? "" : value);

  const renderRow = ({ product, status }) => (
    <li key={product.id}>
      <ProductRow product={product} status={status} showLocation={!location} search={search} actions={actions} />
    </li>
  );

  let content;
  if (error) {
    content = (
      <EmptyState icon={SearchX} title="Impossibile caricare le scorte">
        Controlla la connessione e riapri l'app. ({error.code || "errore"})
      </EmptyState>
    );
  } else if (loading) {
    content = <SkeletonList />;
  } else if (!products.length) {
    content = (
      <EmptyState
        icon={Boxes}
        title="Nessun prodotto"
        action={
          <div className="empty__actions">
            <Link to="/scansiona" className="btn btn--primary">
              <ScanBarcode aria-hidden="true" /> Scansiona
            </Link>
            <Link to={`/scorte/nuovo${search}`} state={{ modal: true }} className="btn btn--secondary">
              <Plus aria-hidden="true" /> Aggiungi a mano
            </Link>
          </div>
        }
      >
        Aggiungi il primo prodotto alla tua scorta.
      </EmptyState>
    );
  } else if (!rows.length) {
    content = (
      <EmptyState
        icon={SearchX}
        title="Nessun risultato"
        action={
          <button type="button" className="btn btn--secondary" onClick={clear}>
            Azzera filtri
          </button>
        }
      >
        Nessun prodotto corrisponde ai filtri scelti.
      </EmptyState>
    );
  } else if (groups) {
    content = groups.map(([name, items]) => (
      <section key={name} className="list-section" aria-label={name}>
        <h2 className="list-section__title">
          {name} <span>{items.length}</span>
        </h2>
        <ul className="list">{items.map(renderRow)}</ul>
      </section>
    ));
  } else {
    content = <ul className="list">{rows.map(renderRow)}</ul>;
  }

  return (
    <div className="page">
      <PageHeader
        title="Scorte"
        actions={
          <>
            <button
              type="button"
              className={`icon-btn ${grouped ? "is-active" : ""}`}
              onClick={() => setFilter("gruppi", grouped ? "" : "1")}
              aria-pressed={grouped}
              aria-label="Raggruppa per categoria"
            >
              <Layers aria-hidden="true" />
            </button>
            <Link to={`/scorte/nuovo${search}`} state={{ modal: true }} className="icon-btn icon-btn--primary" aria-label="Aggiungi prodotto">
              <Plus aria-hidden="true" />
            </Link>
          </>
        }
      />

      <div className="toolbar" ref={toolbar}>
        <div className="searchbar">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
            placeholder="Cerca nome o barcode"
            aria-label="Cerca prodotto per nome o barcode"
            autoComplete="off"
            enterKeyHint="search"
          />
          {filters.q && (
            <button type="button" className="searchbar__clear" onClick={() => setFilter("q", "")} aria-label="Cancella ricerca">
              <X aria-hidden="true" />
            </button>
          )}
        </div>
        <ChipRow label="Filtri">
          {hasFilters && (
            <button type="button" className="chip chip--reset" onClick={clear} aria-label="Azzera filtri">
              <X aria-hidden="true" />
            </button>
          )}
          {settings.locations.map((l) => (
            <Chip key={l} active={location === l} onClick={() => toggle("luogo", toSlug(l), location === l)}>
              {l}
            </Chip>
          ))}
          <span className="chip-sep" aria-hidden="true" />
          {STATUS_FILTERS.map((s) => (
            <Chip key={s.id} active={statusFilter?.id === s.id} onClick={() => toggle("stato", s.id, statusFilter?.id === s.id)}>
              {s.label}
            </Chip>
          ))}
          {categoriesPresent.length > 1 && <span className="chip-sep" aria-hidden="true" />}
          {categoriesPresent.length > 1 &&
            categoriesPresent.map((c) => (
              <Chip key={c} active={category === c} onClick={() => toggle("categoria", toSlug(c), category === c)}>
                {c}
              </Chip>
            ))}
        </ChipRow>
      </div>

      {!loading && products.length > 0 && (
        <p className="list-count">
          {rows.length === products.length ? `${products.length} prodotti` : `${rows.length} di ${products.length} prodotti`}
        </p>
      )}

      {content}
      <Outlet />
    </div>
  );
}
