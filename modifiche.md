1) Problema nel caricamento delle foto
2) Aggiungere la possibilità di filtrare la home in base alle card presenti
3) Eliminare definitivamente nella lista spesa se spuntati





ncaught (in promise) Error: Could not establish connection. Receiving end does not exist.
index-Dm1vQ0Bv.js:55  POST https://firebasestorage.googleapis.com/v0/b/homestock-446ce.firebasestorage.app/o?name=users%2FWPQssw9uqie6QQakUjOHTIs3Dur2%2Fproducts%2F1791206752860-Screenshot%202026-05-06%20140033.png 403 (Forbidden)
send @ index-Dm1vQ0Bv.js:55
e @ index-Dm1vQ0Bv.js:47
(anonime) @ index-Dm1vQ0Bv.js:47
setTimeout
g @ index-Dm1vQ0Bv.js:47
tM @ index-Dm1vQ0Bv.js:47
start_ @ index-Dm1vQ0Bv.js:47
(anonime) @ index-Dm1vQ0Bv.js:47
sM @ index-Dm1vQ0Bv.js:47
fM @ index-Dm1vQ0Bv.js:47
_makeRequest @ index-Dm1vQ0Bv.js:55
makeRequestWithTokens @ index-Dm1vQ0Bv.js:55
await in makeRequestWithTokens
kM @ index-Dm1vQ0Bv.js:55
qM @ index-Dm1vQ0Bv.js:55
g @ index-Dm1vQ0Bv.js:75
A_ @ index-Dm1vQ0Bv.js:8
(anonime) @ index-Dm1vQ0Bv.js:8
au @ index-Dm1vQ0Bv.js:8
Bg @ index-Dm1vQ0Bv.js:8
bg @ index-Dm1vQ0Bv.js:9
gO @ index-Dm1vQ0Bv.js:9
index-Dm1vQ0Bv.js:75 Uncaught (in promise) FirebaseError: Firebase Storage: User does not have permission to access 'users/WPQssw9uqie6QQakUjOHTIs3Dur2/products/1791206752860-Screenshot 2026-05-06 140033.png'. (storage/unauthorized)
Forbidden
4) Implementate nella v3:
- Upload foto reso più robusto: nome file sanitizzato, content-type/cache-control, gestione errori e bucket esplicito.
- Filtri home per luogo, categoria (solo categorie presenti) e stato: disponibili, esauriti, sotto soglia, scaduti.
- Spunta nella lista spesa: l'elemento viene eliminato definitivamente da Firestore.
