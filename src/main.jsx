import React, {useEffect,useMemo,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import {addDoc,collection,deleteDoc,doc,onSnapshot,orderBy,query,serverTimestamp,updateDoc} from "firebase/firestore";
import {getDownloadURL,ref,uploadBytes} from "firebase/storage";
import {onAuthStateChanged,signInWithEmailAndPassword,signOut} from "firebase/auth";
import {BrowserMultiFormatReader} from "@zxing/browser";
import {BarcodeFormat,DecodeHintType} from "@zxing/library";
import {auth,db,storage} from "./firebase";
import {Camera,Check,Copy,Edit3,Home,LogOut,MapPin,Minus,PackagePlus,Plus,Search,ShoppingCart,Trash2,X,ScanLine,AlertTriangle,CalendarDays} from "lucide-react";
import "./styles.css";
import "./auth.css";

const BASE_CATEGORIES=["Alimentari","Bevande","Casa","Detersivi","Bagno","Altro"];
const DEFAULT_LOCATIONS=["Casa","Cantina"];
const units=["pz","kg","g","L","ml"];
const emptyForm={name:"",barcode:"",quantity:1,unit:"pz",location:"Casa",category:"Alimentari",imageUrl:"",minQuantity:0,expiryDate:"",minPrice:0};

function App(){
 const [user,setUser]=useState(undefined),[tab,setTab]=useState("inventory"),[inventory,setInventory]=useState([]),[shopping,setShopping]=useState([]);
 const [search,setSearch]=useState(""),[location,setLocation]=useState("Tutte"),[categoryFilter,setCategoryFilter]=useState("Tutte"),[statusFilter,setStatusFilter]=useState("Tutti"),[modal,setModal]=useState(null),[scanner,setScanner]=useState(false);
 const [locations,setLocations]=useState(DEFAULT_LOCATIONS),[categories,setCategories]=useState(BASE_CATEGORIES);
 useEffect(()=>onAuthStateChanged(auth,setUser),[]);
 useEffect(()=>{if(!user)return;const uid=user.uid;
   const uq=query(collection(db,"users",uid,"inventory"),orderBy("name")); const sq=query(collection(db,"users",uid,"shoppingList"),orderBy("createdAt","desc"));
   const a=onSnapshot(uq,s=>setInventory(s.docs.map(d=>({id:d.id,...d.data()}))));
   const b=onSnapshot(sq,s=>setShopping(s.docs.map(d=>({id:d.id,...d.data()}))));
   return()=>{a();b()};
 },[user]);
 const filtered=useMemo(()=>inventory.filter(p=>{
   const matchesSearch=!search||`${p.name} ${p.barcode||""}`.toLowerCase().includes(search.toLowerCase());
   const matchesLocation=location==="Tutte"||p.location===location;
   const matchesCategory=categoryFilter==="Tutte"||p.category===categoryFilter;
   const low=p.minQuantity>0&&p.quantity>0&&p.quantity<=p.minQuantity;
   const expired=!!p.expiryDate&&new Date(p.expiryDate)<new Date();
   const matchesStatus=statusFilter==="Tutti"||
     (statusFilter==="Disponibili"&&p.quantity>0)||
     (statusFilter==="Esauriti"&&p.quantity<=0)||
     (statusFilter==="Sotto soglia"&&low)||
     (statusFilter==="Scaduti"&&expired);
   return matchesSearch&&matchesLocation&&matchesCategory&&matchesStatus;
 }),[inventory,search,location,categoryFilter,statusFilter]);
 async function saveProduct(data,id=null){
   const uid=auth.currentUser.uid; const clean={...data,quantity:Number(data.quantity||0),minQuantity:Number(data.minQuantity||0),minPrice:Number(data.minPrice||0)};
   if(id) await updateDoc(doc(db,"users",uid,"inventory",id),{...clean,updatedAt:serverTimestamp()});
   else {
     const existing=inventory.find(p=>data.barcode&&p.barcode===data.barcode&&p.location===data.location);
     if(existing) await updateDoc(doc(db,"users",uid,"inventory",existing.id),{quantity:Number(existing.quantity||0)+clean.quantity,updatedAt:serverTimestamp()});
     else await addDoc(collection(db,"users",uid,"inventory"),{...clean,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
   }
   setModal(null);
 }
 async function addShopping(product){
   const uid=auth.currentUser.uid;
   const existing=shopping.find(x=>x.barcode&&product.barcode&&x.barcode===product.barcode&&!x.checked);
   if(existing) await updateDoc(doc(db,"users",uid,"shoppingList",existing.id),{quantity:Number(existing.quantity||1)+1});
   else await addDoc(collection(db,"users",uid,"shoppingList"),{name:product.name,barcode:product.barcode||"",imageUrl:product.imageUrl||"",quantity:1,unit:product.unit||"pz",category:product.category||"Altro",checked:false,createdAt:serverTimestamp()});
 }
 async function changeQty(p,delta){
   const next=Math.max(0,Number(p.quantity||0)+delta); await updateDoc(doc(db,"users",auth.currentUser.uid,"inventory",p.id),{quantity:next,updatedAt:serverTimestamp()});
   if(next===0 && window.confirm(`"${p.name}" è terminato. Aggiungerlo alla lista della spesa?`)) await addShopping(p);
 }
 async function removeProduct(p){
   await deleteDoc(doc(db,"users",auth.currentUser.uid,"inventory",p.id));
   if(window.confirm(`"${p.name}" è stato rimosso. Aggiungerlo alla lista della spesa?`)) await addShopping(p);
 }
 async function duplicate(p){const {id,...copy}=p; await saveProduct({...copy,name:`${copy.name} (copia)`,quantity:1},null)}
 async function toggleShop(x){
   // Spuntando un elemento, viene eliminato definitivamente da Firestore.
   await deleteDoc(doc(db,"users",auth.currentUser.uid,"shoppingList",x.id));
 }
 async function buyShop(x){await saveProduct({name:x.name,barcode:x.barcode,imageUrl:x.imageUrl,quantity:x.quantity||1,unit:x.unit||"pz",category:x.category||"Altro",location:"Casa",minQuantity:0,expiryDate:""},null);await deleteDoc(doc(db,"users",auth.currentUser.uid,"shoppingList",x.id))}
 if(user===undefined)return <div className="loading">Caricamento Scorte Casa…</div>;
 if(!user)return <Login/>;
 return <div className="app">
  <header><div><div className="eyebrow">GESTIONE SCORTE CASA</div><h1>{tab==="inventory"?"Le mie scorte":"Lista della spesa"}</h1></div>
   <div className="actions">{tab==="inventory"&&<><button className="secondary" onClick={()=>setScanner(true)}><ScanLine/> Scansiona</button><button className="primary" onClick={()=>setModal({type:"new"})}><Plus/> Aggiungi</button></>}<button className="secondary iconButton" onClick={()=>signOut(auth)} title="Esci"><LogOut/></button></div></header>
  {tab==="inventory"?<>
   <div className="search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca prodotto o barcode…"/></div>
   <div className="filterGroup">
    <span className="filterLabel">Luogo</span>
    <div className="filters">{["Tutte",...locations].map(x=><button className={location===x?"active":""} onClick={()=>setLocation(x)} key={x}>{x}</button>)}</div>
   </div>
   <div className="filterGroup">
    <span className="filterLabel">Categoria</span>
    <div className="filters">{["Tutte",...categories.filter(c=>inventory.some(p=>p.category===c))].map(x=><button className={categoryFilter===x?"active":""} onClick={()=>setCategoryFilter(x)} key={x}>{x}</button>)}</div>
   </div>
   <div className="filterGroup">
    <span className="filterLabel">Stato</span>
    <div className="filters">{["Tutti","Disponibili","Esauriti","Sotto soglia","Scaduti"].map(x=><button className={statusFilter===x?"active":""} onClick={()=>setStatusFilter(x)} key={x}>{x}</button>)}</div>
   </div>
   <div className="stats"><div><b>{inventory.length}</b><span>Prodotti</span></div><div><b>{inventory.filter(x=>x.quantity>0).length}</b><span>Disponibili</span></div><div><b>{inventory.filter(x=>x.quantity>0&&x.minQuantity>0&&x.quantity<=x.minQuantity).length}</b><span>Sotto soglia</span></div><div><b>{shopping.filter(x=>!x.checked).length}</b><span>Da comprare</span></div></div>
   <main className="grid">{filtered.length?filtered.map(p=><ProductCard key={p.id} p={p} minus={()=>changeQty(p,-1)} plus={()=>changeQty(p,1)} edit={()=>setModal({type:"edit",product:p})} dup={()=>duplicate(p)} del={()=>removeProduct(p)} addShop={()=>addShopping(p)}/>):<div className="empty"><PackagePlus/><h2>Nessun prodotto</h2><p>Aggiungi il primo elemento della tua scorta.</p></div>}</main>
  </>:<ShoppingList items={shopping} toggle={toggleShop} buy={buyShop}/>}
  <nav className="bottom"><button className={tab==="inventory"?"selected":""} onClick={()=>setTab("inventory")}><Home/><span>Scorte</span></button><button className={tab==="shopping"?"selected":""} onClick={()=>setTab("shopping")}><ShoppingCart/><span>Spesa {shopping.filter(x=>!x.checked).length?`(${shopping.filter(x=>!x.checked).length})`:""}</span></button></nav>
  {modal&&<ProductModal initial={modal.product||{...emptyForm,barcode:modal.barcode||""}} edit={modal.type==="edit"} categories={categories} locations={locations} close={()=>setModal(null)} save={saveProduct}/>}
  {scanner&&<Scanner onClose={()=>setScanner(false)} onDetected={code=>{setScanner(false);setModal({type:"scan",barcode:code})}}/>}
 </div>
}

function Login(){
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function submit(e){e.preventDefault();setError("");setBusy(true);try{await signInWithEmailAndPassword(auth,email.trim(),password)}catch(e){setError(["auth/invalid-credential","auth/user-not-found","auth/wrong-password"].includes(e.code)?"Email o password non corretti.":"Impossibile effettuare l'accesso. Riprova.")}finally{setBusy(false)}}
 return <main className="loginPage"><form className="loginCard" onSubmit={submit}><div className="eyebrow">GESTIONE SCORTE CASA</div><h1>Accedi</h1><p>Inserisci le credenziali del tuo account.</p><label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<div className="loginError">{error}</div>}<button className="primary full" disabled={busy}>{busy?"Accesso in corso…":"Accedi"}</button></form></main>
}

function ProductCard({p,minus,plus,edit,dup,del,addShop}){
 const low=p.minQuantity>0&&p.quantity>0&&p.quantity<=p.minQuantity, expired=p.expiryDate&&new Date(p.expiryDate)<new Date();
 return <article className="card"><div className="photo">{p.imageUrl?<img src={p.imageUrl}/>:<PackagePlus/>}</div><div className="cardbody"><div className="tag"><MapPin/> {p.location}</div><h3>{p.name}</h3><small>{p.category||"Altro"} {p.barcode?`• ${p.barcode}`:""}</small>
 {low&&<div className="warning"><AlertTriangle/> Sotto soglia</div>}{expired&&<div className="warning"><CalendarDays/> Scaduto</div>}
 <div className="qty"><button onClick={minus}><Minus/></button><strong>{p.quantity}</strong><span>{p.unit||"pz"}</span><button onClick={plus}><Plus/></button></div></div>
 <div className="cardactions"><button onClick={edit} title="Modifica"><Edit3/></button><button onClick={dup} title="Duplica"><Copy/></button><button onClick={addShop} title="Aggiungi alla spesa"><ShoppingCart/></button><button onClick={del} title="Elimina"><Trash2/></button></div></article>
}

function ShoppingList({items,toggle,buy}){return <main className="shopping">{items.length?items.map(x=><div className={`shopitem ${x.checked?"done":""}`} key={x.id}><button className="check" onClick={()=>toggle(x)}>{x.checked&&<Check/>}</button><div className="shoptext"><b>{x.name}</b><span>{x.quantity} {x.unit||"pz"}</span></div>{!x.checked&&<button className="buy" onClick={()=>buy(x)}>Acquistato</button>}</div>):<div className="empty"><ShoppingCart/><h2>Lista vuota</h2><p>Quando una scorta termina potrai aggiungerla qui.</p></div>}</main>}

function ProductModal({initial,edit,categories,locations,close,save}){
 const [d,setD]=useState({...emptyForm,...initial}); const [busy,setBusy]=useState(false);
 const set=(k,v)=>setD(x=>({...x,[k]:v}));
 useEffect(()=>{if(initial.barcode&&!initial.name){lookupBarcode(initial.barcode).then(x=>{if(x)setD(y=>({...y,...x}))})}},[]);
 async function upload(e){
   const f=e.target.files?.[0]; if(!f)return;
   setBusy(true);
   try{
     const currentUser=auth.currentUser;
     if(!currentUser) throw new Error("AUTH_REQUIRED");
     const safeName=f.name.replace(/[^a-zA-Z0-9._-]/g,"_");
     const r=ref(storage,`users/${currentUser.uid}/products/${Date.now()}-${safeName}`);
     await uploadBytes(r,f,{contentType:f.type||"image/jpeg",cacheControl:"public,max-age=31536000"});
     set("imageUrl",await getDownloadURL(r));
   }catch(err){
     console.error("Errore caricamento foto:",err);
     alert(err?.code==="storage/unauthorized"
       ?"Non hai i permessi per caricare la foto. Verifica che le Storage Rules siano pubblicate su Firebase e che l'utente sia autenticato."
       :"Impossibile caricare la foto. Riprova.");
   }finally{setBusy(false)}
 }
 async function lookup(){if(!d.barcode)return;setBusy(true);const x=await lookupBarcode(d.barcode);if(x)setD(y=>({...y,...x}));else alert("Prodotto non trovato. Puoi inserirlo manualmente.");setBusy(false)}
 return <div className="overlay"><form className="modal" onSubmit={e=>{e.preventDefault();save(d,edit?initial.id:null)}}><div className="modalhead"><h2>{edit?"Modifica prodotto":"Nuovo prodotto"}</h2><button type="button" onClick={close}><X/></button></div>
 <label className="photoUpload">{d.imageUrl?<img src={d.imageUrl}/>:<Camera/>}<span>{busy?"Elaborazione…":"Foto prodotto"}</span><input type="file" accept="image/*" capture="environment" onChange={upload}/></label>
 <label>Nome<input value={d.name} onChange={e=>set("name",e.target.value)} placeholder="es. Pasta Barilla" required/></label>
 <label>Barcode<div className="inline"><input inputMode="numeric" value={d.barcode} onChange={e=>set("barcode",e.target.value)} placeholder="EAN / UPC"/><button type="button" className="secondary small" onClick={lookup}><Search/></button></div></label>
 <div className="two"><label>Quantità<input type="number" min="0" step="0.1" value={d.quantity} onChange={e=>set("quantity",e.target.value)}/></label><label>Unità<select value={d.unit} onChange={e=>set("unit",e.target.value)}>{units.map(x=><option key={x}>{x}</option>)}</select></label></div>
 <div className="two"><label>Luogo<select value={d.location} onChange={e=>set("location",e.target.value)}>{locations.map(x=><option key={x}>{x}</option>)}</select></label><label>Categoria<select value={d.category} onChange={e=>set("category",e.target.value)}>{categories.map(x=><option key={x}>{x}</option>)}</select></label></div>
 <div className="two"><label>Soglia minima<input type="number" min="0" step="1" value={d.minQuantity} onChange={e=>set("minQuantity",e.target.value)}/></label><label>Scadenza<input type="date" value={d.expiryDate||""} onChange={e=>set("expiryDate",e.target.value)}/></label></div>
 <div className="two"><label>Prezzo minimo (€/l - €/kg - €/pz)
  <input
    type="number"
    min="0"
    step="0.01"
    value={d.minPrice}
    onChange={e=>set("minPrice",e.target.value)}
    placeholder="es. 0,79"
  />
</label></div>
 
 <button className="primary full" disabled={busy}><PackagePlus/> Salva</button></form></div>
}

async function lookupBarcode(barcode){
 try{const r=await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`);if(!r.ok)return null;const j=await r.json();if(j.status!==1)return null;const p=j.product||{};return {name:p.product_name_it||p.product_name||"",imageUrl:p.image_front_url||p.image_url||"",category:"Alimentari"};}catch{return null}
}

function Scanner({onClose,onDetected}){
 const video=useRef(null),stream=useRef(null),controls=useRef(null),[error,setError]=useState("");
 useEffect(()=>{let active=true;
  const stop=()=>{controls.current?.stop();stream.current?.getTracks().forEach(t=>t.stop())};
  const detected=code=>{if(!active)return;active=false;stop();onDetected(code)};
  async function startFallback(){
   const hints=new Map([[DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.EAN_13,BarcodeFormat.EAN_8,BarcodeFormat.UPC_A,BarcodeFormat.UPC_E]]]);
   const reader=new BrowserMultiFormatReader(hints);
   controls.current=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:"environment"}}},video.current,(result)=>{if(result)detected(result.getText())});
  }
  async function start(){try{
   if("BarcodeDetector" in window){
    const det=new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e"]});
    stream.current=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}}});video.current.srcObject=stream.current;await video.current.play();
    const loop=async()=>{if(!active)return;try{const codes=await det.detect(video.current);if(codes.length){detected(codes[0].rawValue);return}}catch{}requestAnimationFrame(loop)};loop();
   }else await startFallback();
  }catch(e){if(active)setError("Impossibile avviare la fotocamera. Verifica i permessi di Safari e riprova.")}}
  start();return()=>{active=false;stop()}
 },[]);
 return <div className="overlay"><div className="scanner"><div className="modalhead"><h2>Scansiona barcode</h2><button onClick={onClose}><X/></button></div><div className="video"><video ref={video} playsInline muted/><div className="scanline"/></div>{error&&<p className="scanerror">{error}</p>}<p>Inquadra il codice EAN del prodotto.</p></div></div>
}

createRoot(document.getElementById("root")).render(<App/>);
