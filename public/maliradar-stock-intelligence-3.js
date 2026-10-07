(()=>{"use strict";
const ID="mr30css",MOD="MaliRadarStockIntelligence31";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const local=s=>String(s||"").toUpperCase().split(".")[0];
const pct=q=>num(q?.changePct??q?.change??q?.percentChange);
const market=()=>{try{const r=window.getMaliRegion?.()||{};return({ke:"NSE",ng:"NGX",za:"JSE",gh:"GSE",eg:"EGX",ma:"CSE",tz:"DSE",ug:"USE",rw:"RSE",us:"US"})[r.id]||r.market||"NSE"}catch(e){return"NSE"}};
const api=p=>fetch(p,{cache:"no-store",headers:{Accept:"application/json"}}).then(async r=>{const j=await r.json().catch(()=>null);if(!r.ok)throw Error(j?.error||("HTTP "+r.status));return j});
const candles=j=>{const rows=Array.isArray(j?.candles)?j.candles:Array.isArray(j?.data?.candles)?j.data.candles:Array.isArray(j?.data)?j.data:Array.isArray(j?.results)?j.results:Array.isArray(j)?j:[];return rows.map(x=>({p:num(x.close??x.c??x.price),time:x.time??x.date??null})).filter(x=>x.p!=null)}
function css(){if(document.getElementById(ID))return;const s=document.createElement("style");s.id=ID;s.textContent="#mr30{margin-top:12px;padding:12px;border:1px solid rgba(53,224,177,.18);border-radius:15px;background:rgba(255,255,255,.025)}#mr30 .h{display:flex;justify-content:space-between;gap:8px;align-items:center}#mr30 .t{font-weight:900;font-size:15px}#mr30 .sub{font-size:9px;color:var(--muted);margin-top:2px}#mr30 .badge{font-size:9px;padding:5px 7px;border-radius:999px;border:1px solid rgba(255,255,255,.12)}#mr30 .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:9px}#mr30 .stat{padding:8px;border-radius:10px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06)}#mr30 .stat span{display:block;font-size:8px;color:var(--muted)}#mr30 .stat b{display:block;margin-top:3px;font-size:11px}#mr30 .score{font-size:25px;font-weight:900}.mr30-positive{color:#65e6b7}.mr30-watch{color:#ffe08a}.mr30-risk{color:#ff9aa5}.mr30-limited{color:#b9c7d6}#mr30 .why{margin-top:9px;padding:9px;border-left:2px solid rgba(53,224,177,.45);font-size:9px;line-height:1.5;color:var(--muted)}";document.head.appendChild(s)}
function quoteFor(s){const store=window.maliRadarProviderQuotes||{};return store[s]||Object.values(store).find(x=>local(x?.localSymbol||x?.symbol)===s)||null}
function derive(q,a,engine){
 const baseScore=typeof engine?.score==="function"?engine.score(q):50;
 const label=typeof engine?.label==="function"?engine.label(baseScore,q):{t:"WATCH",c:"watch",conf:"LIMITED"};
 let trend="—",momentum="—",trendScore=0;
 if(a.length>=2){
   const n=a.length,short=a.slice(Math.max(0,n-5)),long=a.slice(Math.max(0,n-20));
   const av=x=>x.reduce((z,d)=>z+d.p,0)/x.length,sa=av(short),la=av(long);
   trend=sa>la*1.002?"UP":sa<la*.998?"DOWN":"FLAT";
   const first=a[Math.max(0,n-6)]?.p,last=a[n-1]?.p;
   momentum=first?((last-first)/first*100).toFixed(2)+"%":"—";
   const mom=Number(momentum);
   trendScore=trend==="UP"?6:trend==="DOWN"?-6:0;
   if(Number.isFinite(mom))trendScore+=mom>=3?8:mom>=1?4:mom<=-3?-8:mom<=-1?-4:0;
 }
 const score=Math.max(0,Math.min(100,Math.round(baseScore+trendScore)));
 const h=num(q?.high??q?.dayHigh),l=num(q?.low??q?.dayLow),price=num(q?.price);
 let range="—";if(price!=null&&h!=null&&l!=null&&h>=l&&h!==l)range=Math.max(0,Math.min(100,(price-l)/(h-l)*100)).toFixed(0)+"%";
 const v=num(q?.volume),reasons=[],p=pct(q);
 if(p!=null)reasons.push("Observed move "+(p>=0?"+":"")+p.toFixed(2)+"%.");
 if(a.length>=2)reasons.push("Provider history: "+a.length+" candles loaded.");
 if(trend!=="—")reasons.push("Recent candle trend: "+trend+".");
 if(momentum!=="—")reasons.push("Recent momentum: "+momentum+".");
 if(range!=="—")reasons.push("Price position within reported day range: "+range+".");
 if(v!=null)reasons.push("Provider reported volume: "+v.toLocaleString()+".");
 if(!a.length)reasons.push("Historical evidence is unavailable from the provider right now.");
 else reasons.push("Classification combines the verified quote with provider historical observations.");
 const evidenceParts=[p!=null,h!=null&&l!=null,v!=null,a.length>=2,a.length>=6].filter(Boolean).length;
 const evidenceScore=Math.min(100,evidenceParts*20);
 const confidence=evidenceScore>=80?"HIGH":evidenceScore>=60?"GOOD":evidenceScore>=40?"MODERATE":evidenceScore>=20?"QUOTE ONLY":"LIMITED";
 const finalLabel=typeof engine?.label==="function"&&evidenceScore>=40?engine.label(score,q):{t:confidence==="QUOTE ONLY"?"WATCH":(score>=65?"POSITIVE SETUP":score<=35?"RISK / WEAK":"WATCH"),c:score>=65?"positive":score<=35?"risk":"watch",conf:confidence};
 return{score,label:finalLabel,trend,momentum,range,vol:v!=null?v.toLocaleString():"—",reasons,evidence:evidenceScore,candles:a.length}
}
