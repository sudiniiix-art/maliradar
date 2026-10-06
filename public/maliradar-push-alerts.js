(()=>{"use strict";
const KEY="maliradar_push_v1",CLIENT="maliradar_push_client_v1",STATE="maliradar_v07_state";
const load=()=>{try{return JSON.parse(localStorage.getItem(STATE)||"{}")}catch(e){return{}}};
const prefs=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return{enabled:false}}};
const savePrefs=x=>localStorage.setItem(KEY,JSON.stringify(x));
const clientId=()=>{let x=localStorage.getItem(CLIENT);if(!x){x="mr-"+crypto.randomUUID();localStorage.setItem(CLIENT,x)}return x};
const b64=s=>{const p="=".repeat((4-s.length%4)%4),u=(s+p).replace(/-/g,"+").replace(/_/g,"/");return Uint8Array.from(atob(u),c=>c.charCodeAt(0))};
async function config(){const r=await fetch("/api/push/config",{cache:"no-store"});if(!r.ok)throw Error("Push service unavailable");return r.json()}
async function sync(enabled){
 const s=load(),alerts=Array.isArray(s.alerts)?s.alerts.filter(a=>a&&a.active):[];
 const r=await fetch("/api/push/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clientId:clientId(),alerts,enabled})});
 if(!r.ok)throw Error("Could not sync alert settings");
}
async function enable(){
 if(!("serviceWorker"in navigator)||!("PushManager"in window))throw Error("This browser does not support push notifications.");
 if(!("Notification"in window))throw Error("Notifications are not supported.");
 const cfg=await config();if(!cfg.enabled||!cfg.publicKey)throw Error("Push notifications are not configured on the MaliRadar server yet.");
 const reg=await navigator.serviceWorker.register("/push-sw.js",{scope:"/"});
 const perm=await Notification.requestPermission();if(perm!=="granted")throw Error("Notification permission was not granted.");
 let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(cfg.publicKey)});
 const s=load();
 const r=await fetch("/api/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clientId:clientId(),subscription:sub.toJSON(),alerts:Array.isArray(s.alerts)?s.alerts.filter(a=>a&&a.active):[],enabled:true})});
 if(!r.ok){const j=await r.json().catch(()=>({}));throw Error(j.error||"Push registration failed.");}
 savePrefs({enabled:true,updatedAt:new Date().toISOString()});render();toast("🔔 Push alerts enabled");
}
async function disable(){
 try{await sync(false)}catch(e){}
 try{const r=await navigator.serviceWorker.ready,sub=await r.pushManager.getSubscription();if(sub)await sub.unsubscribe()}catch(e){}
 try{await fetch("/api/push/unsubscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clientId:clientId()})})}catch(e){}
 savePrefs({enabled:false,updatedAt:new Date().toISOString()});render();toast("Push alerts disabled");
}
async function syncNow(){if(!prefs().enabled)return;try{await sync(true)}catch(e){}}
function toast(m){let x=document.getElementById("mrPushToast");if(!x){x=document.createElement("div");x.id="mrPushToast";x.style.cssText="position:fixed;left:50%;bottom:76px;transform:translateX(-50%);z-index:10001;background:#0d1c24;border:1px solid #2b6d67;border-radius:12px;padding:11px 14px;color:var(--text);font-size:12px;box-shadow:0 15px 35px #0008";document.body.appendChild(x)}x.textContent=m;clearTimeout(x._t);x._t=setTimeout(()=>x.remove(),3000)}
function render(){
 const screen=document.getElementById("alertsScreen");if(!screen)return;
 let card=document.getElementById("mrPushCard");if(!card){card=document.createElement("div");card.id="mrPushCard";card.className="card";screen.appendChild(card)}
 const on=!!prefs().enabled;
 card.innerHTML='<div class="row"><div><b>📲 Push Notifications</b><div class="muted">Get alert notifications even when MaliRadar is not open.</div></div><span class="badge">'+(on?"ON":"OFF")+'</span></div><p class="notice" style="margin-top:9px">When an armed price or watchlist-move alert is reached, MaliRadar can send a browser notification. Notifications use provider-backed delayed data and are informational only.</p><div class="actions"><button class="btn '+(on?"red":"")+'" id="mrPushToggle">'+(on?"Disable Push Alerts":"Enable Push Alerts")+'</button><button class="btn alt" id="mrPushTest">Test Permission</button></div><div class="muted" style="margin-top:8px;font-size:9px">Requires HTTPS and notification permission. Server-side delivery also requires MaliRadar Web Push credentials.</div>';
 card.querySelector("#mrPushToggle").onclick=()=>{(on?disable:enable)().catch(e=>toast("⚠️ "+e.message))};
 card.querySelector("#mrPushTest").onclick=()=>{if(Notification?.permission==="granted")toast("🔔 Notification permission is granted.");else toast("Notification permission: "+(Notification?.permission||"unsupported"))};
}
function boot(){
 render();
 document.addEventListener("click",e=>{if(e.target.closest?.(".tabs button"))setTimeout(render,120)});
 setInterval(syncNow,60000);
 window.addEventListener("maliRadar:quotesUpdated",syncNow);
}
window.MaliRadarPushAlerts={version:"1.0",enable,disable,sync:syncNow,render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,700));else setTimeout(boot,700);
})();