import { Link, useSearchParams } from "react-router";
import { CalendarClock, CalendarX, ChevronRight, Minus, PackageX, ShoppingCart, Trash2 } from "lucide-react";
import { useAuth } from "../../app/AuthProvider.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { ProductThumb } from "../../components/ui/ProductThumb.jsx";
import { Segmented } from "../../components/ui/Segmented.jsx";
import { SkeletonCards, SkeletonList } from "../../components/ui/Skeleton.jsx";
import { resolveOption } from "../../hooks/useFilters.js";
import { useSettings } from "../../hooks/useSettings.js";
import { formatToday, greeting } from "../../utils/date.js";
import { formatQty, toSlug } from "../../utils/format.js";
import { StatusBadges } from "../inventory/StatusBadges.jsx";
import { useInventoryActions } from "../inventory/useInventoryActions.js";
import { useDashboard } from "./indicators.js";

function StatCard({ to, tone, icon: Icon, value, label, hint }) {
  return (
    <Link to={to} className={`stat stat--${tone} ${value === 0 ? "is-zero" : ""}`}>
      <span className="stat__top">
        <span className="stat__icon">
          <Icon aria-hidden="true" />
        </span>
        <ChevronRight className="stat__chev" aria-hidden="true" />
      </span>
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
      {hint && <span className="stat__hint">{hint}</span>}
    </Link>
  );
}

function UrgentRow({ product, status, actions }) {
  let action;
  if (status.expired) {
    action = (
      <button type="button" className="pill-btn pill-btn--red" onClick={() => actions.removeProduct(product)}>
        <Trash2 aria-hidden="true" /> Elimina
      </button>
    );
  } else if (status.expiring) {
    action = (
      <button
        type="button"
        className="pill-btn"
        onClick={() => actions.changeQuantity(product, -1)}
        aria-label={`Usa 1 ${product.name}`}
      >
        <Minus aria-hidden="true" /> Usa 1
      </button>
    );
  } else {
    action = (
      <button type="button" className="pill-btn pill-btn--blue" onClick={() => actions.addToShopping(product)}>
        <ShoppingCart aria-hidden="true" /> In spesa
      </button>
    );
  }
  return (
    <li className="urgent">
      <Link to={`/scorte/${product.id}`} state={{ modal: true }} className="urgent__main">
        <ProductThumb src={product.imageUrl} size={44} />
        <span className="urgent__text">
          <span className="urgent__name">{product.name}</span>
          <span className="urgent__meta">
            <StatusBadges product={product} status={status} long />
            <span className="urgent__qty">
              {formatQty(product.quantity)} {product.unit} · {product.location}
            </span>
          </span>
        </span>
      </Link>
      {action}
    </li>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const settings = useSettings();
  const [params, setParams] = useSearchParams();
  const location = resolveOption(settings.locations, params.get("luogo")) || null;
  const { loading, error, counts, urgent, total, expiringDays } = useDashboard(location);
  const actions = useInventoryActions();

  const scope = location ? `&luogo=${toSlug(location)}` : "";
  const segOptions = [{ value: "", label: "Tutto" }, ...settings.locations.map((l) => ({ value: toSlug(l), label: l }))];
  const name = user?.displayName || "";
  const allClear = counts.expired + counts.expiring + counts.reorder === 0;

  return (
    <div className="page page--home">
      <header className="page-header">
        <p className="page-header__subtitle">{formatToday()}</p>
        <h1 className="page-header__title">
          {greeting()}
          {name ? `, ${name}` : ""}
        </h1>
        <div className="home-scope">
          <Segmented
            label="Filtra per luogo"
            options={segOptions}
            value={location ? toSlug(location) : ""}
            onChange={(v) => setParams(v ? { luogo: v } : {}, { replace: true })}
          />
        </div>
      </header>

      {error ? (
        <EmptyState icon={PackageX} title="Impossibile caricare i dati">
          Controlla la connessione e riapri l'app.
        </EmptyState>
      ) : loading ? (
        <>
          <SkeletonCards />
          <SkeletonList rows={3} />
        </>
      ) : (
        <>
          <section className="stat-grid" aria-label="Riepilogo">
            <StatCard to={`/scorte?stato=scaduti${scope}`} tone="red" icon={CalendarX} value={counts.expired} label="Scaduti" />
            <StatCard
              to={`/scorte?stato=in-scadenza${scope}`}
              tone="orange"
              icon={CalendarClock}
              value={counts.expiring}
              label="In scadenza"
              hint={`entro ${expiringDays} giorni`}
            />
            <StatCard
              to={`/scorte?stato=da-riordinare${scope}`}
              tone="yellow"
              icon={PackageX}
              value={counts.reorder}
              label="Sotto soglia / Esauriti"
              hint={counts.reorder ? `${counts.low} sotto soglia · ${counts.out} esauriti` : undefined}
            />
            <StatCard to="/spesa" tone="blue" icon={ShoppingCart} value={counts.toBuy} label="Da comprare" />
          </section>

          <section className="home-section" aria-labelledby="urgent-title">
            <div className="home-section__head">
              <h2 id="urgent-title">Da gestire ora</h2>
            </div>
            {total === 0 ? (
              <EmptyState
                emoji="📦"
                title="Nessun prodotto"
                action={
                  <Link to="/scansiona" className="btn btn--primary">
                    Scansiona il primo prodotto
                  </Link>
                }
              >
                {location ? `Non ci sono prodotti in ${location}.` : "Inizia ad aggiungere le tue scorte."}
              </EmptyState>
            ) : urgent.length ? (
              <ul className="group urgent-list">
                {urgent.map(({ product, status }) => (
                  <UrgentRow key={product.id} product={product} status={status} actions={actions} />
                ))}
              </ul>
            ) : allClear ? (
              <EmptyState emoji="👍" title="Scorte in ordine" tone="green">
                Niente di scaduto, in scadenza o da riordinare.
              </EmptyState>
            ) : (
              <EmptyState emoji="🛒" title="Tutto sotto controllo" tone="green">
                I prodotti da riordinare sono già nella lista della spesa.
              </EmptyState>
            )}
          </section>
        </>
      )}
    </div>
  );
}
