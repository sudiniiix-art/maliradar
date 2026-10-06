(()=>{"use strict";
const local=s=>String(s||"").toUpperCase().split(".")[0];
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
function quotes(){return window.maliRadarProviderQuotes||{}}
function quote(sym){const k=local(sym),a=quotes();return a[k]||a[k+".KE"]||Object.values(a).find(x=>local(x?.symbol||x?.localSymbol)===k)||null}
function scanRows(){return Array.isArray(window.MaliRadarSmartScan?.results)?window.MaliRadarSmartScan.results:[]}
function alerts(){try{const s=JSON.parse(localStorage.getItem("maliradar_v07_state")||"{}");return Array.isArray(s.alerts)?s.alerts.filter(x=>x&&x.active):[]}catch(e){return[]}}
function readNews(){
 const feed=document.getElementById("newsFeed");
 const cards=feed?[...feed.querySelectorAll("article.news-card")]:[];
 return cards.map(card=>({
  asset:local(card.querySelector(".news-asset")?.textContent),
  sentiment:String(card.querySelector(".news-tag")?.textContent||"NEUTRAL").toUpperCase(),
  eventType:String(card.querySelectorAll(".news-tag")[1]?.textContent||"MARKET").toUpperCase(),
  title:card.querySelector("h3")?.textContent||""
 })).filter(x=>x.asset);
}
function readScanner(){
 const root=document.getElementById("smartAssistView")||document;
 const text=root.textContent||"";
 const m=text.match(/SCANNED\\s*(\\d+)/i);
 const buy=text.match(/BUY SETUPS\\s*(\\d+)/i);
 const sell=text.match(/SELL \/ RISK\\s*(\\d+)/i);
 const rows=document.querySelectorAll("#saBuyList .stock,#saSellList .stock,#saWatchList .stock");
 return {scanned:m?Number(m[1]):rows.length,buy:buy?Number(buy[1]):document.querySelectorAll("#saBuyList .stock").length,sell:sell?Number(sell[1]):document.querySelectorAll("#saSellList .stock").length};
}
function refresh(){
 const news=readNews();
 const scans=readScanner();
 const active=alerts().length;
 const events=news.filter(x=>x.eventType&&x.eventType!=="MARKET");
 const host=document.getElementById("newsView")||document.getElementById("smartAssistView"); if(!host)return;
 let el=document.getElementById("mrFusion");
 if(!el){el=document.createElement("div");el.id="mrFusion";host.insertBefore(el,host.firstElementChild?.nextElementSibling||host.firstChild)}
 el.style.cssText="margin:10px 0 12px;padding:14px;border-radius:18px;background:linear-gradient(145deg,rgba(10,27,39,.96),rgba(6,13,23,.96));border:1px solid rgba(56,200,255,.22);font-size:12px";
 el.innerHTML="<b>🧬 Intelligence Fusion</b><div style=\"color:var(--muted);margin-top:4px\">News + Event Radar + Whole-Market Scanner + Alerts</div><div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:10px\"><span>NEWS<br><b>"+news.length+"</b></span><span>EVENTS<br><b>"+events.length+"</b></span><span>SCANNED<br><b>"+scans.scanned+"</b></span><span>ALERTS<br><b>"+active+"</b></span></div><div style=\"margin-top:9px;color:var(--muted)\">Scanner: "+scans.buy+" buy / "+scans.sell+" sell. Combined evidence is observational, not predictive.</div>";
 decorateNews();
}
function decorateNews(){const feed=document.getElementById("newsFeed");if(!feed)return;feed.querySelectorAll("article.news-card").forEach(card=>{if(card.querySelector(".mrFusionContext"))return;const sym=local(card.querySelector(".news-asset")?.textContent);if(!sym||sym==="MARKET")return;const z=scanRows().find(x=>local(x.symbol||x.ticker)===sym);const p=quote(sym);const mv=num(p?.changePct??p?.change??p?.percentChange);const n=(window.MaliRadarNewsIntelligence2?.getState?.()?.items||[]).filter(x=>local(x.asset)===sym).length;const a=alerts().filter(x=>local(x.symbol)===sym).length;const bits=[];if(z?.score!=null)bits.push("Setup "+z.score+"/100");if(mv!=null)bits.push("Move "+(mv>=0?"+":"")+mv.toFixed(2)+"%");if(n)bits.push(n+" news");if(a)bits.push(a+" alert"+(a===1?"":"s"));if(bits.length){const e=document.createElement("div");e.className="mrFusionContext";e.style.cssText="margin-top:9px;padding:8px 9px;border-radius:10px;border:1px solid rgba(56,200,255,.12);background:rgba(56,200,255,.04);font-size:10px";e.textContent="🧬 "+bits.join(" • ");card.appendChild(e)}})}
function boot(){refresh();setInterval(refresh,3000)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
window.MaliRadarIntelligenceFusion={version:"1.0",refresh};
})();