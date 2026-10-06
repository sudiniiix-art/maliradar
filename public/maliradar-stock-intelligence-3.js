(()=>{"use strict";
const ID="mr30css",MOD="MaliRadarStockIntelligence31";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const local=s=>String(s||"").toUpperCase().split(".")[0];
const pct=q=>num(q?.changePct??q?.change??q?.percentChange);
const market=()=>{try{const r=window.getMaliRegion?.()||{};return({ke:"NSE",ng:"NGX",za:"JSE",gh:"GSE",eg:"EGX",ma:"CSE",tz:"DSE",ug:"USE",rw:"RSE",us:"US"})[r.id]||r.market||"NSE"}catch(e){return"NSE"}};
const api=p=>fetch(p,{cache:"no-store",headers:{Accept:"application/json"}}).then(async r=>{const j=await r.json().catch(()=>null);if(!r.ok)throw Error(j?.error||("HTTP "+r.status));return j});
const candles=j=>(Array.isArray(j?.candles)?j.candles:Array.isArray(j?.data)?j.data:Array.isArray(j)?j:[]).map(x=>({p:num(x.close??x.c??x.price)})).filter(x=>x.p!=null);
function css(){if(document.getElementById(ID))return;const s=document.createElement("style");s.id=ID;s.textContent="#mr30{margin-top:12px;padding:12px;border:1px solid rgba(53,224,177,.18);border-radius:15px;background:rgba(255,255,255,.025)}#mr30 .h{display:flex;justify-content:space-between;gap:8px;align-items:center}#mr30 .t{font-weight:900;font-size:15px}#mr30 .sub{font-size:9px;color:var(--muted);margin-top:2px}#mr30 .badge{font-size:9px;padding:5px 7px;border-radius:999px;border:1px solid rgba(255,255,255,.12)}#mr30 .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:9px}#mr30 .stat{padding:8px;border-radius:10px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06)}#mr30 .stat span{display:block;font-size:8px;color:var(--muted)}#mr30 .stat b{display:block;margin-top:3px;font-size:11px}#mr30 .score{font-size:25px;font-weight:900}.mr30-positive{color:#65e6b7}.mr30-watch{color:#ffe08a}.mr30-risk{color:#ff9aa5}.mr30-limited{color:#b9c7d6}#mr30 .why{margin-top:9px;padding:9px;border-left:2px solid rgba(53,224,177,.45);font-size:9px;line-height:1.5;color:var(--muted)}";document.head.appendChild(s)}
function quoteFor(s){const store=window.maliRadarProviderQuotes||{};return store[s]||Object.values(store).find(x=>local(x?.localSymbol||x?.symbol)===s)||null}
function derive(q,a,engine){
 const score=typeof engine?.score==="function"?engine.score(q):50;
 const label=typeof engine?.label==="function"?engine.label(score,q):{t:"WATCH",c:"watch",conf:"LIMITED"};
 let trend="—",momentum="—";
 if(a.length>=2){const n=a.length,short=a.slice(Math.max(0,n-5)),long=a.slice(Math.max(0,n-20)),av=x=>x.reduce((z,d)=>z+d.p,0)/x.length,sa=av(short),la=av(long);trend=sa>la*1.002?"UP":sa<la*.998?"DOWN":"FLAT";const first=a[Math.max(0,n-6)]?.p,last=a[n-1]?.p;momentum=first?((last-first)/first*100).toFixed(2)+"%":"—"}
 const h=num(q?.high??q?.dayHigh),l=num(q?.low??q?.dayLow),price=num(q?.price);let range="—";if(price!=null&&h!=null&&l!=null&&h>=l&&h!==l)range=Math.max(0,Math.min(100,(price-l)/(h-l)*100)).toFixed(0)+"%";
 const v=num(q?.volume),reasons=[];const p=pct(q);
 if(p!=null)reasons.push("Observed move "+(p>=0?"+":"")+p.toFixed(2)+"%.");
 if(trend!=="—")reasons.push("Recent candle trend: "+trend+".");
 if(momentum!=="—")reasons.push("Recent momentum: "+momentum+".");
 if(range!=="—")reasons.push("Price position within reported day range: "+range+".");
 if(v!=null)reasons.push("Provider reported volume: "+v.toLocaleString()+".");
 reasons.push(label.conf==="LIMITED"?"Confidence is limited because supporting evidence is incomplete.":"Classification uses the shared Market Intelligence evidence engine.");
 return{score,label,trend,momentum,range,vol:v!=null?v.toLocaleString():"—",reasons}
}
async function enhance(sym){
 const s=local(sym),mb=document.getElementById("mb");if(!s||!mb)return;
 let q=quoteFor(s);if(!q){await new Promise(r=>setTimeout(r,250));q=quoteFor(s)}
 const engine=window.MaliRadarMarketIntelligence;if(!q||!engine)return;
 let a=[];try{const j=await api("/api/market-data/stock/"+encodeURIComponent(s)+"/candles?market="+encodeURIComponent(market())+"&range=1M&_mr="+Date.now());a=candles(j)}catch(e){}
 const r=derive(q,a,engine),old=document.getElementById("mr30");if(old)old.remove();
 const card=document.createElement("div");card.id="mr30";
 const cls=r.label.c==="positive"?"mr30-positive":r.label.c==="risk"?"mr30-risk":r.label.c==="limited"?"mr30-limited":"mr30-watch";
 card.innerHTML='<div class="h"><div><div class="t">🧠 Stock Intelligence</div><div class="sub">Shared evidence layer • observed conditions only</div></div><span class="badge '+cls+'">'+esc(r.label.t)+" • "+esc(r.label.conf)+'</span></div><div class="grid"><div class="stat"><span>SETUP SCORE</span><b class="score">'+r.score+'/100</b></div><div class="stat"><span>EVIDENCE</span><b>'+esc(r.label.conf)+'</b></div><div class="stat"><span>TREND</span><b>'+esc(r.trend)+'</b></div><div class="stat"><span>MOMENTUM</span><b>'+esc(r.momentum)+'</b></div><div class="stat"><span>DAY RANGE POSITION</span><b>'+esc(r.range)+'</b></div><div class="stat"><span>VOLUME</span><b>'+esc(r.vol)+'</b></div></div><div class="why"><b>Why this classification</b><br>'+r.reasons.map(x=>"◈ "+esc(x)).join("<br>")+'<br><br>Setup Score summarizes provider-backed observations. It is not a prediction, probability, or financial advice.</div>';
 mb.appendChild(card)
}
function wrap(obj,name){
 if(!obj||typeof obj.open!=="function"||obj.__mr31)return;
 const base=obj.open;
 const enhanced=async function(sym,range){window.__maliRadarOpenSymbol=local(sym);const result=await base.call(this,sym,range||"1M");setTimeout(()=>enhance(sym),120);return result};
 obj.open=enhanced;obj.__mr31=true;obj.__mr31Base=base
}
function install(){
 css();
 wrap(window.MaliRadarMarketPro,"MarketPro");
 wrap(window.MaliRadarStockIntel,"StockIntel");
 const currentDetails=window.details;
 window.details=function(sym){
   window.__maliRadarOpenSymbol=local(sym);
   const p=window.MaliRadarMarketPro;
   if(p?.open)return p.open(sym,"1M");
   const i=window.MaliRadarStockIntel;
   if(i?.open)return i.open(sym,"1M");
   if(typeof currentDetails==="function")return currentDetails(sym)
 };
 window.MaliRadarStockIntelligence={version:"3.2",open:sym=>window.details(sym),refresh:()=>enhance(window.__maliRadarOpenSymbol||"")};
}
function boot(){install();setTimeout(install,800);setTimeout(install,1800)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
// Intelligence Fusion bridge
try{const s=document.createElement("script");s.src="/maliradar-intelligence-fusion-1.js?v=1.0";document.head.appendChild(s)}catch(e){}

// Leaderboard + Friends Hub 7.0 bridge
try{const s=document.createElement("script");s.src="/maliradar-leaderboard-friends-7.js?v=7.0";document.head.appendChild(s)}catch(e){}
