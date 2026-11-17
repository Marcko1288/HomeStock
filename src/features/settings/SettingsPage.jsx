import { useId, useState } from "react";
import { ChevronRight, LogOut, RefreshCw } from "lucide-react";
import { Link } from "react-router";
import { useAuth, useUid } from "../../app/AuthProvider.jsx";
import { useTheme } from "../../app/ThemeProvider.jsx";
import { useToast } from "../../app/ToastProvider.jsx";
import { usePwaUpdate } from "../../app/UpdatePrompt.jsx";
import { PageHeader } from "../../components/ui/PageHeader.jsx";
import { Segmented } from "../../components/ui/Segmented.jsx";
import { Stepper } from "../../components/ui/Stepper.jsx";
import { useData } from "../../app/DataProvider.jsx";
import { useSettings } from "../../hooks/useSettings.js";
import { logout } from "../../services/authService.js";
import { saveSettings } from "../../services/settingsRepo.js";

export default function SettingsPage() {
  const { user } = useAuth();
  const uid = useUid();
  const settings = useSettings();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const pwa = usePwaUpdate();
  const [checking, setChecking] = useState(false);

  const save = (patch) => saveSettings(uid, patch).catch(() => toast.error("Impostazioni non salvate."));

  const checkUpdates = async () => {
    setChecking(true);
    const found = await pwa.check();
    setChecking(false);
    if (!found) toast.info("Stai usando l'ultima versione.");
  };

  return (
    <div className="page">
      <PageHeader title="Altro" />

      <h2 className="group-title">Organizzazione</h2>
      <ul className="group nav-list">
        <li>
          <Link to="/altro/luoghi" className="nav-list__item">
            <span>Luoghi</span>
            <span className="nav-list__value">{settings.locations.join(", ")}</span>
            <ChevronRight aria-hidden="true" />
          </Link>
        </li>
        <li>
          <Link to="/altro/categorie" className="nav-list__item">
            <span>Categorie</span>
            <span className="nav-list__value">{settings.categories.length}</span>
            <ChevronRight aria-hidden="true" />
          </Link>
        </li>
      </ul>

      <h2 className="group-title">Avvisi</h2>
      <div className="group">
        <div className="field field--row">
          <span className="field__label">
            Soglia minima predefinita
            <small>Per i nuovi prodotti</small>
          </span>
          <Stepper value={settings.defaultMinQuantity} onChange={(v) => save({ defaultMinQuantity: v })} />
        </div>
        <div className="field field--row">
          <span className="field__label">
            «In scadenza» entro
            <small>giorni</small>
          </span>
          <Stepper
            value={settings.expiringDays}
            min={1}
            onChange={(v) => save({ expiringDays: Math.min(60, Math.max(1, Math.round(v))) })}
          />
        </div>
      </div>

      <h2 className="group-title">Aspetto</h2>
      <div className="group">
        <div className="field">
          <Segmented
            label="Tema"
            options={[
              { value: "system", label: "Sistema" },
              { value: "light", label: "Chiaro" },
              { value: "dark", label: "Scuro" },
            ]}
            value={theme}
            onChange={setTheme}
          />
        </div>
      </div>

      <h2 className="group-title">Account</h2>
      <div className="group">
        <div className="info-list__row">
          <span>Accesso come</span>
          <span className="nav-list__value">{user?.email}</span>
        </div>
        <button type="button" className="nav-list__item nav-list__item--danger" onClick={() => logout()}>
          <LogOut aria-hidden="true" /> Esci
        </button>
      </div>

      <h2 className="group-title">App</h2>
      <div className="group">
        <div className="info-list__row">
          <span>Versione</span>
          <span className="nav-list__value">{__APP_VERSION__}</span>
        </div>
        <button type="button" className="nav-list__item" onClick={checkUpdates} disabled={checking}>
          <RefreshCw aria-hidden="true" className={checking ? "spin" : ""} /> Controlla aggiornamenti
        </button>
      </div>
      <p className="footnote">
        Per installare l'app: in Safari tocca Condividi › «Aggiungi alla schermata Home».
      </p>
    </div>
  );
}

/** Gestione elenchi (luoghi o categorie). Un valore in uso non può essere eliminato. */
export function ListEditorPage({ kind }) {
  const uid = useUid();
  const settings = useSettings();
  const toast = useToast();
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const isLoc = kind === "locations";
  const title = isLoc ? "Luoghi" : "Categorie";
  const configured = isLoc ? settings.configuredLocations : settings.configuredCategories;
  const all = isLoc ? settings.locations : settings.categories;
  const usage = useUsage(kind);

  const persist = (list) =>
    saveSettings(uid, { [kind]: list }).catch(() => toast.error("Modifica non salvata."));

  const add = (e) => {
    e.preventDefault();
    const v = draft.trim().slice(0, 40);
    if (!v) return;
    if (all.some((x) => x.toLowerCase() === v.toLowerCase())) {
      toast.info(`«${v}» esiste già.`);
      return;
    }
    persist([...all, v]);
    setDraft("");
  };

  const remove = (value) => {
    if (isLoc && all.length <= 1) return;
    persist(all.filter((x) => x !== value));
  };

  return (
    <div className="page">
      <PageHeader title={title} />
      <form className="quick-add" onSubmit={add}>
        <label htmlFor={inputId} className="sr-only">
          {isLoc ? "Nuovo luogo" : "Nuova categoria"}
        </label>
        <input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={isLoc ? "Nuovo luogo (es. Garage)" : "Nuova categoria"}
          autoComplete="off"
        />
        <button type="submit" className="btn btn--primary" disabled={!draft.trim()}>
          Aggiungi
        </button>
      </form>
      <ul className="group nav-list">
        {all.map((v) => {
          const n = usage.get(v) || 0;
          const locked = n > 0 || (isLoc && all.length <= 1);
          return (
            <li key={v} className="nav-list__item nav-list__item--static">
              <span>{v}</span>
              <span className="nav-list__value">{n ? `${n} in uso` : configured.includes(v) ? "" : "dai dati"}</span>
              <button
                type="button"
                className="btn btn--plain btn--sm btn--danger-text"
                onClick={() => remove(v)}
                disabled={locked}
                aria-label={`Elimina ${v}`}
              >
                Elimina
              </button>
            </li>
          );
        })}
      </ul>
      <p className="footnote">
        {isLoc ? "Un luogo" : "Una categoria"} usato da prodotti {isLoc ? "" : "o voci della spesa "}non può essere
        eliminato: sposta prima i prodotti.
      </p>
    </div>
  );
}


function useUsage(kind) {
  const { inventory, shopping } = useData();
  const map = new Map();
  const key = kind === "locations" ? "location" : "category";
  inventory.items.forEach((p) => map.set(p[key], (map.get(p[key]) || 0) + 1));
  if (kind === "categories") shopping.items.forEach((x) => map.set(x.category, (map.get(x.category) || 0) + 1));
  return map;
}
