(()=>{"use strict";
const VER="4.0",ID="mrAlertIntelCss",STATE="maliradar_v07_state",PREF="maliradar_alert_center_v1";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const local=s=>String(s||"").toUpperCase().split(".")[0];
const pct=q=>num(q?.changePct??q?.change??q?.percentChange);
const quotes=()=>Object.values(window.maliRadarProviderQuotes||{}).filter(q=>num(q?.price)!=null);
function state(){try{const s=JSON.parse(localStorage.getItem(STATE)||"{}");s.alerts=Array.isArray(s.alerts)?s.alerts:[];s.alertHistory=Array.isArray(s.alertHistory)?s.alertHistory:[];return s}catch(e){return{alerts:[],alertHistory:[]}}}
function quote(sym){const s=local(sym);return quotes().find(q=>local(q?.localSymbol||q?.symbol)===s)||null}
function intel(q){
 const eng=window.MaliRadarMarketIntelligence;
 if(!q)return{score:50,label:"DATA LIMITED",conf:"NONE"};
 const score=typeof eng?.score==="function"?eng.score(q):50;
 const x=typeof eng?.label==="function"?eng.label(score,q):{t:"WATCH",conf:"LIMITED"};
 return{score,label:x.t,conf:x.conf||"LIMITED"};
}
function css(){if(document.getElementById(ID))return;const s=document.createElement("style");s.id=ID;s.textContent=".ai4{margin-top:10px}.ai4-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.ai4-title{font-size:17px;font-weight:900}.ai4-sub{font-size:10px;color:var(--muted);line-height:1.45;margin-top:3px}.ai4-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}.ai4-stat{padding:9px;border:1px solid var(--line);border-radius:11px;background:rgba(255,255,255,.025)}.ai4-stat span{display:block;font-size:8px;color:var(--muted)}.ai4-stat b{display:block;font-size:15px;margin-top:3px}.ai4-list{display:grid;gap:8px;margin-top:10px}.ai4-item{padding:10px;border:1px solid var(--line);border-radius:12px;background:#09151c}.ai4-row{display:flex;justify-content:space-between;gap:8px;align-items:center}.ai4-name{font-weight:900;font-size:12px}.ai4-meta{font-size:9px;color:var(--muted);margin-top:4px;line-height:1.45}.ai4-bar{height:5px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden;margin-top:7px}.ai4-fill{height:100%;background:currentColor}.ai4-positive{color:#65e6b7}.ai4-watch{color:#ffe08a}.ai4-risk{color:#ff9aa5}.ai4-limited{color:#b9c7d6}.ai4-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.ai4-note{margin-top:9px;padding:9px;border-left:2px solid rgba(53,224,177,.45);background:#091a22;border-radius:9px;font-size:9px;line-height:1.5;color:var(--muted)}@media(max-width:420px){.ai4-grid{grid-template-columns:1fr 1fr}}";document.head.appendChild(s)}
function thresholdStatus(a,q){
 if(!q)return["PENDING","No verified quote currently available."];
 const p=num(q.price),m=pct(q);
 if(a.type==="price"){const d=Math.abs(p-a.value),near=d<=Math.max(.01,p*.02);return[near?"NEAR TARGET":"ARMED",near?"Within ~2% of target price.":"Waiting for target price condition."]}
 if(a.type==="move"||a.type==="position"){if(m==null)return["PENDING","Movement evidence unavailable."];const t=Math.abs(a.value),d=Math.abs(Math.abs(m)-t);return[d<=1?"NEAR THRESHOLD":"ARMED",(m>=0?"+":"")+m.toFixed(2)+"% observed vs "+t.toFixed(2)+"% threshold."]}
 if(a.type==="data")return[q.stale===true||num(q.dataFreshnessSeconds)>900?"DATA WARNING":"DATA HEALTHY",q.stale===true?"Provider marked quote stale.":"Quote is currently usable for monitoring."];
 return["ARMED","Monitoring provider-backed condition."];
}
function classFor(label){const x=String(label||"").toLowerCase();return x.includes("positive")?"positive":x.includes("risk")?"risk":x.includes("limited")?"limited":"watch"}
function description(a,q){
 if(a.type==="price")return(a.operator==="below"?"At/below ":"At/above ")+"KSh "+num(a.value)?.toFixed(2);
 if(a.type==="move"||a.type==="position")return(a.operator==="down"?"Move down ≤ ":"Move up ≥ ")+num(a.value)?.toFixed(2)+"%";
 if(a.type==="data")return"Data-quality monitoring";
 if(a.type==="market")return"Market breadth / average-move monitoring";
 if(a.type==="smart")return"Smart Assist signal monitoring";
 return"Provider-backed condition";
}
function install(){
 css();
 let root=document.getElementById("mrAlertIntelMount");
 const screen=document.getElementById("alertsScreen");
 if(!screen)return;
 if(!root){root=document.createElement("div");root.id="mrAlertIntelMount";const center=document.getElementById("mrAlertCenterMount");if(center&&center.parentNode===screen)screen.insertBefore(root,center);else screen.insertBefore(root,screen.firstElementChild||null)}
 let old=document.getElementById("mrAlertIntel");
 if(!old){old=document.createElement("div");old.id="mrAlertIntel";old.className="card ai4";root.appendChild(old)}
 render();
 if(!window.__mrAI4RenderHook&&typeof window.renderAlerts==="function"){const base=window.renderAlerts;window.renderAlerts=function(){const r=base.apply(this,arguments);setTimeout(render,0);return r};window.__mrAI4RenderHook=true}
}
function render(){
 const root=document.getElementById("mrAlertIntel");if(!root)return;
 const s=state(),active=s.alerts.filter(a=>a.active),qs=quotes();
 const monitored=active.map(a=>({a,q:a.symbol==="*" ? null:quote(a.symbol)}));
 const near=monitored.filter(x=>thresholdStatus(x.a,x.q)[0]==="NEAR TARGET"||thresholdStatus(x.a,x.q)[0]==="NEAR THRESHOLD").length;
 const pending=monitored.filter(x=>thresholdStatus(x.a,x.q)[0]==="PENDING").length;
 const triggered=s.alertHistory.length;
 const actionable=monitored.filter(x=>{const i=intel(x.q);return i.label==="POSITIVE SETUP"||i.label==="RISK / WEAK"}).length;
 const avg=qs.length?qs.map(pct).filter(v=>v!=null):[];
 const av=avg.length?avg.reduce((a,b)=>a+b,0)/avg.length:null;
 root.innerHTML='<div class="ai4-head"><div><div class="ai4-title">🧠 Alert Intelligence</div><div class="ai4-sub">Context layer for your alerts: proximity, provider health and observed market evidence.</div></div><span class="badge">v4.0</span></div>'+
 '<div class="ai4-grid"><div class="ai4-stat"><span>ARMED</span><b>'+active.length+'</b></div><div class="ai4-stat"><span>NEAR TRIGGER</span><b>'+near+'</b></div><div class="ai4-stat"><span>PENDING DATA</span><b>'+pending+'</b></div></div>'+
 '<div class="ai4-list">'+(monitored.length?monitored.map(({a,q})=>{const st=thresholdStatus(a,q),i=intel(q),cl=classFor(i.label);return '<div class="ai4-item"><div class="ai4-row"><span class="ai4-name">'+esc(a.symbol==="*"?"MARKET":a.symbol)+' • '+esc(String(a.type||"").toUpperCase())+'</span><span class="badge">'+esc(st[0])+'</span></div><div class="ai4-meta">'+esc(description(a,q))+' • '+esc(st[1])+'</div><div class="ai4-bar '+cl+'"><div class="ai4-fill" style="width:'+Math.max(0,Math.min(100,i.score))+'%"></div></div><div class="ai4-meta">Observed setup '+i.score+'/100 • '+esc(i.label)+' • evidence '+esc(i.conf)+' • '+(q?.delayMinutes||15)+' min delayed</div><div class="ai4-actions"><button class="btn alt" data-ai-open="'+esc(a.symbol||"")+'">Open Stock</button></div></div>'}).join(""):'<div class="ai4-item"><div class="ai4-meta">No active alerts yet. Create an alert and this intelligence layer will monitor its context.</div></div>')+'</div>'+
 '<div class="ai4-note">Market context: '+(av==null?"movement unavailable":(av>=0?"+":"")+av.toFixed(2)+"% average observed move")+' across '+qs.length+' verified quote rows. Setup labels are observations, not predictions or trading advice. Alert Intelligence does not change the underlying trigger rules.</div>';
 root.querySelectorAll("[data-ai-open]").forEach(b=>{b.type="button";b.onclick=null});
 if(!window.__mrAI4OpenDelegate){
   document.addEventListener("click",function(e){
     const b=e.target&&e.target.closest?e.target.closest("#mrAlertIntel [data-ai-open]"):null;
     if(!b)return;
     e.preventDefault();e.stopPropagation();
     const s=String(b.getAttribute("data-ai-open")||"").trim().toUpperCase().replace(/\\.(KE|NG|ZA|GH|EG|MA|TZ|UG|RW)$/,"");
     if(!s||s==="*")return;
     window.__maliRadarOpenSymbol=s;
     try{
       const p=window.MaliRadarMarketPro;
       if(p&&typeof p.open==="function"){p.open(s,"1M");return}
       const d=window.MaliRadarProviderDetail;
       if(d&&typeof d.open==="function"){d.open(s,"1M");return}
       if(typeof window.details==="function"){window.details(s);return}
     }catch(err){console.error("MaliRadar Alert Intelligence stock open failed",err)}
   },true);
   window.__mrAI4OpenDelegate=true;
 }
}
function boot(){
 install();
 document.addEventListener("click",e=>{const b=e.target.closest?.(".tabs button");if(b&&/Alerts/i.test(b.textContent||""))setTimeout(install,80)});
 window.addEventListener("maliRadar:quotesUpdated",()=>setTimeout(render,50));
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")setTimeout(render,50)});
 setInterval(()=>{if(document.visibilityState==="visible"&&document.getElementById("alertsScreen")?.classList.contains("active"))render()},30000);
}
window.MaliRadarAlertIntelligence={version:VER,render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,500));else setTimeout(boot,500);
})();