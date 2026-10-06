(()=>{"use strict";
const STATE_KEY="maliradar_v07_state";
const PREF_KEY="maliradar_alert_center_v1";
const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const sym=q=>String(q?.localSymbol||q?.symbol||"").toUpperCase().split(".")[0];
const quotes=()=>Object.values(window.maliRadarProviderQuotes||{}).filter(q=>num(q?.price)!=null);
const load=()=>{try{return JSON.parse(localStorage.getItem(STATE_KEY)||"{}")}catch(e){return{}}};
const save=s=>localStorage.setItem(STATE_KEY,JSON.stringify(s));
const prefs=()=>{try{return JSON.parse(localStorage.getItem(PREF_KEY)||"{}")}catch(e){return{}}};
const savePrefs=p=>localStorage.setItem(PREF_KEY,JSON.stringify(p));
const getAlerts=()=>{const s=load();s.alerts=Array.isArray(s.alerts)?s.alerts:[];s.alertHistory=Array.isArray(s.alertHistory)?s.alertHistory:[];return s};
const watchSet=()=>{const s=load();let w=[];try{w=JSON.parse(localStorage.getItem("maliradar_provider_watchlist_v2")||"[]")}catch(e){};if(!Array.isArray(w))w=[];if(!w.length&&Array.isArray(s.watch))w=s.watch;return new Set(w.map(x=>String(x).toUpperCase().split(".")[0]))};
const heldSet=()=>{const s=load();return new Set(Object.keys(s.hold||{}).map(x=>x.toUpperCase()))};
const findQuote=s=>quotes().find(q=>sym(q)===String(s).toUpperCase().split(".")[0]);
const pct=q=>num(q?.changePct??q?.change??q?.percentChange);
const fresh=q=>q?.stale===true||num(q?.dataFreshnessSeconds)>900?false:true;
const now=()=>new Date().toISOString();

function css(){
 if(document.getElementById("mrAlertCenterCss"))return;
 const st=document.createElement("style");st.id="mrAlertCenterCss";
 st.textContent=`.ac-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.ac-title{font-size:24px;font-weight:900}.ac-sub{font-size:12px;color:var(--muted);line-height:1.45;margin-top:5px}.ac-bell{position:relative}.ac-badge{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#ff6b7a;color:#071016;font-size:10px;font-weight:900;margin-left:5px}.ac-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.ac-stat{background:#09151c;border:1px solid var(--line);border-radius:12px;padding:10px}.ac-stat span{display:block;color:var(--muted);font-size:10px}.ac-stat b{display:block;margin-top:4px;font-size:18px}.ac-tabs{display:flex;gap:7px;overflow:auto;margin:12px 0}.ac-tabs button{white-space:nowrap}.ac-list{margin-top:8px}.ac-item{padding:12px;border:1px solid var(--line);border-radius:13px;background:#09151c;margin-bottom:8px}.ac-item.unread{border-color:#2b6d67;box-shadow:0 0 15px #35e0b10d}.ac-row{display:flex;justify-content:space-between;gap:8px;align-items:center}.ac-name{font-weight:900}.ac-meta{font-size:10px;color:var(--muted);margin-top:4px}.ac-desc{font-size:12px;line-height:1.45;margin-top:7px}.ac-pill{font-size:9px;border:1px solid var(--line);border-radius:999px;padding:4px 7px;color:var(--muted)}.ac-pill.high{color:#ff9aa5;border-color:#65303a}.ac-pill.watch{color:#ffe08a;border-color:#665629}.ac-pill.info{color:var(--a);border-color:#1f6659}.ac-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.ac-form{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ac-form select,.ac-form input{width:100%;background:#09151c;border:1px solid var(--line);border-radius:10px;padding:10px;color:var(--text);outline:0}.ac-full{grid-column:1/-1}.ac-note{padding:10px;border-left:2px solid var(--c);background:#091a22;border-radius:9px;font-size:11px;line-height:1.45}.ac-empty{padding:18px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:12px}.ac-toggle{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}.ac-toggle:first-child{border-top:0}.ac-toggle input{width:18px;height:18px}.ac-toast{position:fixed;left:50%;bottom:76px;transform:translateX(-50%) translateY(10px);z-index:10000;background:#0d1c24;border:1px solid #2b6d67;border-radius:12px;padding:11px 14px;box-shadow:0 15px 35px #0008;opacity:0;pointer-events:none;transition:.2s;font-size:12px;max-width:90%;text-align:center}.ac-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}@media(max-width:420px){.ac-stats{grid-template-columns:1fr 1fr}.ac-form{grid-template-columns:1fr}.ac-full{grid-column:auto}}`;
 document.head.appendChild(st);
}

function seedLegacy(){
 const s=getAlerts(); let changed=false;
 s.alerts=s.alerts.map(a=>{
   if(!a)return a;
   const x={...a};
   if(!x.id){x.id="legacy-"+Date.now()+"-"+Math.random().toString(36).slice(2,7);changed=true}
   if(!x.symbol)x.symbol=String(x.s||"").toUpperCase();
   if(x.type==="cross"){x.type="price";x.operator=String(x.dir||"above")==="below"?"below":"above";changed=true}
   if(x.type==="move"&&!x.operator){x.operator=String(x.dir||"up")==="down"?"down":"above";changed=true}
   if(!x.type){x.type="price";x.operator="above";x.value=num(x.p??x.value)||0;changed=true}
   if(x.type==="price"&&!x.operator)x.operator=String(x.dir||"above")==="below"?"below":"above";
   if((x.value==null||!Number.isFinite(Number(x.value)))&&x.p!=null)x.value=num(x.p)||0;
   if(x.priority==null)x.priority="watch";
   if(x.active==null)x.active=true;
   if(!x.createdAt)x.createdAt=now();
   return x;
 });
 if(changed)save(s);
 return s;
}
function symbolOptions(){
 const seen=new Set(),arr=[];
 quotes().forEach(q=>{const s=sym(q);if(s&&!seen.has(s)){seen.add(s);arr.push(s)}});
 [...watchSet(),...heldSet()].forEach(s=>{if(s&&!seen.has(s)){seen.add(s);arr.push(s)}});
 return arr.sort();
}
function description(a,q){
 const p=num(q?.price), ch=pct(q);
 if(a.type==="price")return "Price "+(a.operator==="below"?"at or below ":"at or above ")+"KSh "+Number(a.value).toFixed(2)+(p!=null?" • observed KSh "+p.toFixed(2):"");
 if(a.type==="move")return "Observed move "+(a.operator==="down"?"≤ ":"≥ ")+Number(a.value).toFixed(2)+"%"+(ch!=null?" • current "+ch.toFixed(2)+"%":"");
 if(a.type==="position")return "Held position move "+(a.operator==="down"?"≤ ":"≥ ")+Number(a.value).toFixed(2)+"%"+(ch!=null?" • current "+ch.toFixed(2)+"%":"");
 if(a.type==="data")return q?.stale===true?"Provider marked this quote stale.":"Provider freshness/quality condition needs review.";
 if(a.type==="smart")return "Smart Assist signal changed for "+a.symbol+".";
 if(a.type==="market")return "Market breadth condition observed from provider quotes.";
 return "Provider-backed alert condition.";
}
function severity(a){
 return a.priority==="high"?"HIGH":a.priority==="watch"?"WATCH":"INFO";
}
function unreadCount(s){return (s.alertHistory||[]).filter(x=>!x.read).length}
function trigger(s,a,q,extra){
 const stamp=now(), copy={...a,triggered:true,triggeredAt:stamp,triggerPrice:num(q?.price),read:false,triggerReason:extra||description(a,q)};
 a.lastTriggeredAt=stamp;
 if(a.repeat===false)a.active=false;
 s.alertHistory=[copy,...(s.alertHistory||[])].slice(0,100);
 save(s);
 toast("⚡ "+a.symbol+" • "+severity(a));
}
function cooldownOk(a){
 const mins=Math.max(0,num(a.cooldownMinutes)??30),last=Date.parse(a.lastTriggeredAt||"");
 return !last||Date.now()-last>=mins*60000;
}
function evaluate(){
 const s=seedLegacy(), qs=quotes(); if(!qs.length)return;
 const by=new Map(qs.map(q=>[sym(q),q]));
 let changed=false;
 s.alerts.forEach(a=>{
   if(!a.active||!a.symbol||!cooldownOk(a))return;
   const q=by.get(String(a.symbol).toUpperCase());
   if(a.type==="market"){
     const vals=qs.map(pct).filter(v=>v!=null), avg=vals.length?vals.reduce((x,y)=>x+y,0)/vals.length:null;
     if(avg!=null&&((a.operator==="down"&&avg<=-Math.abs(a.value))||(a.operator!=="down"&&avg>=Math.abs(a.value)))){trigger(s,a,null,"Average observed market move reached "+avg.toFixed(2)+"%.");changed=true}
     return;
   }
   if(!q)return;
   const ch=pct(q);
   let hit=false;
   if(a.type==="price"&&num(q.price)!=null)hit=a.operator==="below"?q.price<=a.value:q.price>=a.value;
   if((a.type==="move"||a.type==="position")&&ch!=null)hit=a.operator==="down"?ch<=-Math.abs(a.value):ch>=Math.abs(a.value);
   if(a.type==="data")hit=q.stale===true||num(q.dataFreshnessSeconds)>900||String(q.dataQuality||"").toLowerCase().includes("stale");
   if(a.type==="position"&&!heldSet().has(a.symbol))hit=false;
   if(a.type==="move"&&!watchSet().has(a.symbol))hit=false;
   if(hit){trigger(s,a,q);changed=true}
 });
 if(changed)render();
}
function toast(msg){
 let el=document.getElementById("mrAlertToast");if(!el){el=document.createElement("div");el.id="mrAlertToast";el.className="ac-toast";document.body.appendChild(el)}
 el.textContent=msg;el.classList.add("show");clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove("show"),3200);
}
function add(type){
 const root=document.getElementById("mrAlertForm");if(!root)return;
 const symbol=root.querySelector("[data-f=symbol]")?.value;
 const value=num(root.querySelector("[data-f=value]")?.value);
 const op=root.querySelector("[data-f=op]")?.value||"above";
 const priority=root.querySelector("[data-f=priority]")?.value||"watch";
 if(type!=="data"&&type!=="smart"&&type!=="market"&&(!symbol||value==null||value<=0))return toast("Complete the alert fields first.");
 const s=getAlerts();
 const a={id:"ac-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),symbol:symbol||"*",type,operator:op,value:value||0,priority,active:true,repeat:true,cooldownMinutes:30,createdAt:now()};
 s.alerts.unshift(a);save(s);render();toast("Alert created");
}
function toggle(id){
 const s=getAlerts(),a=s.alerts.find(x=>x.id===id);if(!a)return;a.active=!a.active;save(s);render();
}
function remove(id){
 const s=getAlerts();s.alerts=s.alerts.filter(x=>x.id!==id);save(s);render();toast("Alert removed");
}
function markRead(){
 const s=getAlerts();s.alertHistory=(s.alertHistory||[]).map(x=>({...x,read:true}));save(s);render();
}
function clearHistory(){
 const s=getAlerts();s.alertHistory=[];save(s);render();toast("Alert history cleared");
}
function smartAssistHook(){
 const el=document.getElementById("saSignalTitle");if(!el||el._acHook)return;
 el._acHook=true;let last=el.textContent.trim();
 const obs=new MutationObserver(()=>{const next=el.textContent.trim();if(!next||next===last)return;last=next;const s=getAlerts();s.alerts.filter(a=>a.active&&a.type==="smart"&&(a.symbol==="*"||a.symbol===last.split(" ")[0])).forEach(a=>trigger(s,a,null,"Smart Assist signal changed to: "+next));render();});
 obs.observe(el,{childList:true,subtree:true,characterData:true});
}
function render(){
 const root=document.getElementById("mrAlertCenterMount")||document.getElementById("alertsScreen")||document.getElementById("alerts");if(!root)return;
 const s=seedLegacy(), active=s.alerts.filter(a=>a.active), hist=s.alertHistory||[];
 root.innerHTML=`<div class="card hero" id="mrAlertCenterRoot">
 <div class="ac-head"><div><div class="ac-title">🚨 Alert Command Center</div><div class="ac-sub">One place for price, movement, position, Smart Assist, market and data-quality alerts.</div></div><span class="badge">PAPER ONLY</span></div>
 <div class="ac-stats"><div class="ac-stat"><span>ACTIVE</span><b>${active.length}</b></div><div class="ac-stat"><span>TRIGGERED</span><b>${hist.length}</b></div><div class="ac-stat"><span>UNREAD</span><b class="green">${unreadCount(s)}</b></div></div></div>
 <div class="card"><div class="row"><b>Create alert</b><span class="muted">Provider observations</span></div>
 <div class="ac-tabs" id="acTypes"><button class="btn" data-type="price">Price</button><button class="btn alt" data-type="move">Watchlist move</button><button class="btn alt" data-type="position">Position</button><button class="btn alt" data-type="data">Data quality</button><button class="btn alt" data-type="market">Market</button><button class="btn alt" data-type="smart">Smart Assist</button></div>
 <div id="mrAlertForm" class="ac-form"><select data-f=symbol></select><select data-f=op><option value=above>At / above</option><option value=below>At / below</option><option value=down>Move down</option></select><input data-f=value type=number step="0.01" placeholder="Threshold"><select data-f=priority><option value=watch>WATCH</option><option value=high>HIGH</option><option value=info>INFO</option></select><button class="btn ac-full" id="acCreate">Create Price Alert</button></div></div>
 <div class="card"><div class="row"><b>Alert history</b><div class="ac-actions"><button class="btn alt" id="acRead">Mark read</button><button class="btn red" id="acClear">Clear</button></div></div><div class="ac-list">${hist.length?hist.map((a,i)=>`<div class="ac-item ${a.read?"":"unread"}"><div class="ac-row"><span class="ac-name">${esc(a.symbol||"Market")}</span><span class="ac-pill ${String(a.priority)==="high"?"high":String(a.priority)==="watch"?"watch":"info"}">${esc(severity(a))}</span></div><div class="ac-desc">${esc(a.triggerReason||description(a,null))}</div><div class="ac-meta">${esc(a.triggeredAt||"")}</div></div>`).join(""):"<div class=ac-empty>No triggered alerts yet.</div>"}</div></div>
 <div class="card"><div class="row"><b>Active alerts</b><span class="muted">${active.length} armed</span></div><div class="ac-list">${active.length?active.map(a=>`<div class="ac-item"><div class="ac-row"><span class="ac-name">${esc(a.symbol==="*"?"Market":a.symbol)} • ${esc(a.type.toUpperCase())}</span><span class="ac-pill ${a.priority==="high"?"high":a.priority==="watch"?"watch":"info"}">${esc(a.priority.toUpperCase())}</span></div><div class="ac-desc">${esc(description(a,findQuote(a.symbol)))}</div><div class="ac-actions"><button class="btn alt" data-toggle="${esc(a.id)}">Pause</button><button class="btn red" data-remove="${esc(a.id)}">Delete</button></div></div>`).join(""):"<div class=ac-empty>No active alerts. Create one above.</div>"}</div></div>
 <div class="card"><b>Alert rules</b><div class="ac-note" style="margin-top:9px">Alerts are triggered only from observed provider-backed data available to the app. The provider feed is delayed; an alert is not a prediction, recommendation or trading instruction.</div><div class="ac-toggle"><span>Auto-check while Alerts is open</span><b class=green>ON</b></div></div>`;
 const sel=root.querySelector("[data-f=symbol]");symbolOptions().forEach(x=>{const o=document.createElement("option");o.value=x;o.textContent=x;sel.appendChild(o)});
 let type="price";
 root.querySelectorAll("#acTypes [data-type]").forEach(b=>b.onclick=()=>{type=b.dataset.type;root.querySelectorAll("#acTypes button").forEach(x=>x.className=x===b?"btn":"btn alt");const symbol=sel;const op=root.querySelector("[data-f=op]"),val=root.querySelector("[data-f=value]"),create=document.getElementById("acCreate");if(type==="price"){op.innerHTML='<option value=above>At / above</option><option value=below>At / below</option>';val.placeholder="Price threshold";create.textContent="Create Price Alert"}else if(type==="move"||type==="position"){op.innerHTML='<option value=above>Move up</option><option value=down>Move down</option>';val.placeholder="Move % threshold";create.textContent=type==="move"?"Create Watchlist Alert":"Create Position Alert"}else{op.innerHTML='<option value=above>Condition</option>';val.placeholder=type==="market"?"Average move %":"Optional threshold";create.textContent=type==="data"?"Create Data Alert":type==="market"?"Create Market Alert":"Create Smart Assist Alert"}symbol.style.display=(type==="market"||type==="data"||type==="smart")?"none":"";val.style.display=(type==="data"||type==="smart")?"none":"";op.style.display=(type==="data"||type==="smart")?"none":"";});
 document.getElementById("acCreate").onclick=()=>add(type);
 root.querySelectorAll("[data-toggle]").forEach(b=>b.onclick=()=>toggle(b.dataset.toggle));
 root.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>remove(b.dataset.remove));
 document.getElementById("acRead").onclick=markRead;document.getElementById("acClear").onclick=clearHistory;
 smartAssistHook();
}
function boot(){
 css();seedLegacy();render();
 setTimeout(smartAssistHook,800);
 document.addEventListener("click",e=>{const t=e.target.closest?.(".tabs button");if(t&&t.textContent.includes("Alerts"))setTimeout(render,80)});
 setInterval(()=>{if(document.visibilityState==="visible"&&(document.getElementById("alertsScreen")?.classList.contains("active")||document.getElementById("alertsScreen")?.style.display!=="none")){evaluate();render()}},30000);
}
window.MaliRadarAlertCenter={version:"2.0",render,evaluate,markRead,clearHistory};\nwindow.renderAlerts=render;\nwindow.checkAlerts=evaluate;
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,300));else setTimeout(boot,300);
})();