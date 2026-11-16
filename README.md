# Scorte Casa v2

## Nuove funzioni
- Scanner EAN/UPC tramite fotocamera con BarcodeDetector quando supportato dal browser.
- Lookup automatico su Open Food Facts: barcode -> nome/foto.
- Inserimento manuale sempre disponibile.
- Modifica e duplicazione prodotti.
- Soglia minima per prodotto con indicazione "Sotto soglia".
- Data di scadenza con indicazione "Scaduto".
- Aggiunta diretta alla lista della spesa.
- Riacquisto dalla lista e reinserimento nella scorta.
- Foto caricata in Firebase Storage.
- Ricerca per nome o barcode.
- Casa/Cantina.
- PWA base.

## Configurazione
1. Copia `.env.example` in `.env`.
2. Inserisci la configurazione della Web App Firebase.
3. Firebase Authentication: abilita Anonymous.
4. Firestore: crea il database.
5. Storage: abilita Storage.
6. `npm install`
7. `npm run dev`

## Note scanner
Il supporto BarcodeDetector dipende dal browser/dispositivo. Se non è disponibile, usare il campo barcode manuale. La ricerca prodotto usa Open Food Facts e quindi richiede connessione Internet.

## Sicurezza
Prima della pubblicazione impostare le regole Firestore/Storage riportate in `firestore.rules` e `storage.rules`.


## Deploy Firebase — versione modificata

Dopo aver estratto il progetto:
```bash
npm install
npm run build
firebase deploy --only "storage,firestore,hosting"
```

È importante pubblicare anche `storage.rules`: il codice dell'app usa il bucket
`homestock-446ce.firebasestorage.app` e permette upload/download solo all'utente
autenticato nel proprio percorso `users/{uid}/...`.

Se l'upload foto continua a restituire `storage/unauthorized` dopo il deploy,
verificare in Firebase Console che l'utente sia autenticato e che le Storage Rules
pubblicate siano quelle contenute in `storage.rules`.
