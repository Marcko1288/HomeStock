# HomeStock

Web app (PWA) per le scorte di casa, pensata per iPhone: in 3 secondi dice **cosa manca, cosa sta scadendo e cosa comprare**.

- **Home**: 4 indicatori (scaduti, in scadenza, sotto soglia/esauriti, da comprare) filtrabili per luogo e "Da gestire ora".
- **Scorte**: ricerca, filtri nell'URL (`/scorte?stato=scaduti&luogo=cantina`), stepper –/+, swipe (← elimina, → spesa), dettaglio in bottom sheet.
- **Scansiona**: fotocamera con zxing, prodotto esistente → +1/–1, nuovo → Open Food Facts e form precompilato.
- **Spesa**: lista per categoria, spunta con "Annulla", "Ho comprato" che rimette in scorta (Casa/Cantina).
- **Altro**: luoghi, categorie, soglie, tema, aggiornamenti.
- Funziona offline (cache persistente di Firestore), dark mode automatica, installabile da Safari.

Stack: React 19 + Vite 7, React Router 7, Firebase JS SDK (Auth email/password, Firestore, Storage), vite-plugin-pwa, @zxing/browser, lucide-react.

## Setup

Requisiti: Node 20+ e [Firebase CLI](https://firebase.google.com/docs/cli) (`npm i -g firebase-tools`).

```bash
npm install
cp .env.example .env   # poi inserisci i valori della Web App Firebase
npm run dev
```

I valori di `.env` si trovano in Console Firebase → Impostazioni progetto → Le tue app → Web app.
Il file `.env` non va committato (è in `.gitignore`).

In Firebase Console servono: **Authentication → Email/Password** abilitato (gli utenti si creano dalla console),
**Firestore** e **Storage** attivi.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo |
| `npm run build` | Build di produzione in `dist/` (non committata) |
| `npm run preview` | Anteprima della build |
| `npm test` | Test di date e logica di stato (Vitest) |
| `npm run deploy` | Build + `firebase deploy --only "storage,firestore,hosting"` |

### Sviluppo con gli emulatori (facoltativo)

```bash
firebase emulators:start --only auth,firestore,storage
VITE_USE_EMULATORS=true npm run dev
```

Gli utenti di prova si creano dall'emulatore Auth. Gli emulatori usano le stesse `firestore.rules` e `storage.rules`.

## Deploy

```bash
firebase login
npm run deploy
```

Il progetto è `homestock-446ce` (`.firebaserc`). Le regole Storage sono pubblicate esplicitamente sul bucket
`homestock-446ce.firebasestorage.app` (target `products`). Pubblica **sempre** anche `storage` e `firestore`:
senza le regole aggiornate il caricamento foto risponde `storage/unauthorized` (403).

## Modello dati

Compatibile con le versioni precedenti, nessuna migrazione richiesta.

- `users/{uid}/inventory/{id}`: `name, barcode, quantity, unit (pz|kg|g|L|ml), location, category, imageUrl,
  minQuantity, expiryDate ("YYYY-MM-DD"), minPrice, createdAt, updatedAt` + opzionale `imagePath` (percorso Storage della foto).
- `users/{uid}/shoppingList/{id}`: `name, barcode, imageUrl, quantity, unit, category, checked, createdAt`.
  Spuntare una voce la elimina (con "Annulla"); le vecchie voci con `checked: true` compaiono in "Già spuntate".
- `users/{uid}/settings/app` (opzionale): `locations, categories, defaultMinQuantity, expiringDays`.
- Storage: `users/{uid}/products/{productId}-{timestamp}.jpg` (JPEG max 1024 px, compresso sul telefono).

Stati di un prodotto (`src/utils/status.js`, unico punto di verità):

- **Scaduto**: quantità > 0 e scadenza passata.
- **In scadenza**: quantità > 0 e scadenza entro N giorni (default 7, configurabile).
- **Sotto soglia**: 0 < quantità ≤ soglia minima.
- **Esaurito**: quantità = 0.

## Struttura

```
src/
  app/          routing, layout, provider (Auth, Data, Theme, Toast, aggiornamento PWA), login
  features/     dashboard, inventory, scanner, shopping, settings
  services/     firebase, db, authService, inventoryRepo, shoppingRepo, settingsRepo, storageService, openFoodFacts
  hooks/        useInventory, useShopping, useSettings, useFilters, useOnlineStatus
  components/ui BottomSheet, Toast, Stepper, Chip, Badge, EmptyState, SwipeRow, TabBar, Segmented…
  utils/        date, status, format, product, image
  styles/       token, base, componenti, schermate
```

Firestore è usato solo dai repository in `services/`.

## Installazione su iPhone

Apri l'app in Safari → Condividi → **Aggiungi alla schermata Home**. Al primo avvio dall'icona serve un nuovo
accesso (la PWA ha un'archiviazione separata da Safari). Se esce una nuova versione compare il banner
"Nuova versione disponibile — Aggiorna".
