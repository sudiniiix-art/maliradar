(()=>{"use strict";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const local=s=>String(s||"").toUpperCase().replace(/\.(KE|NG|ZA|GH|EG|MA|TZ|UG|RW)$/,"");
const state={tab:"summary",summary:"",full:"",asset:"MARKET",title:"",source:"",published:""};
function resolveAsset(raw,title,summary){
  const a=local(raw); if(["SCOM","KCB","EQTY","EABL","ABSA"].includes(a))return a;
  const t=String((title||"")+" "+(summary||"")).toLowerCase();
  if(/safaricom/.test(t))return "SCOM"; if(/\bkcb\b|kenya commercial bank/.test(t))return "KCB";
  if(/equity bank|equity group/.test(t))return "EQTY"; if(/eabl|east african breweries/.test(t))return "EABL";
  if(/absa bank/.test(t))return "ABSA"; return a;
}
function quote(asset){
  const q=window.maliRadarProviderQuotes||{};
  const key=local(asset);
  const direct=q[key]||q[key+".KE"]||q[asset];
  if(direct)return direct;
  for(const [k,v] of Object.entries(q)){if(local(k)===key)return v}
  return null;
}
function impact(){
  const q=quote(state.asset);
  if(!q||!Number.isFinite(Number(q.price))) return {status:"PENDING DATA",copy:"No verified provider quote is available for this news-linked asset right now.",move:null,price:null};
  const move=Number(q.changePct??q.change??q.percentChange);
  if(!Number.isFinite(move))return {status:"OBSERVED PRICE",copy:"A verified provider price is available, but no verified percentage move was returned.",move:null,price:Number(q.price)};
  let status="STABLE OBSERVATION";
  if(move>=2)status="STRONG POSITIVE MOVE";
  else if(move>=0.5)status="POSITIVE MOVE";
  else if(move<=-2)status="STRONG NEGATIVE MOVE";
  else if(move<=-0.5)status="NEGATIVE MOVE";
  return {status,copy:"Observed provider movement only. This does not establish that the news caused the move or predict what happens next.",move,price:Number(q.price)};
}
function ensureTabs(){
  const ov=document.getElementById("newsDetailOverlay");if(!ov)return null;
  const detail=ov.querySelector(".news-detail");if(!detail)return null;
  let tabs=detail.querySelector("#mrNews3Tabs");
  if(!tabs){
    const anchor=detail.querySelector(".detail-section");
    tabs=document.createElement("div");tabs.id="mrNews3Tabs";tabs.style.cssText="display:flex;gap:7px;flex-wrap:wrap;margin:14px 0 2px";
    tabs.innerHTML='<button type="button" data-tab="summary" class="btn alt">SUMMARY</button><button type="button" data-tab="full" class="btn alt">FULL NEWS</button><button type="button" data-tab="impact" class="btn alt">MARKET IMPACT</button>';
    detail.insertBefore(tabs,anchor);
    let panel=document.createElement("div");panel.id="mrNews3Panel";panel.className="detail-section";detail.insertBefore(panel,tabs.nextSibling);
    tabs.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;renderPanel()});
  }
  return {ov,detail,tabs,panel:detail.querySelector("#mrNews3Panel")};
}
function renderPanel(){
  const x=ensureTabs();if(!x)return;
  x.tabs.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("primary",b.dataset.tab===state.tab));
  const p=x.panel;
  if(state.tab==="summary"){
    p.innerHTML='<div class="detail-label">EVENT SUMMARY</div><div class="detail-text">'+esc(state.summary||state.title||"No summary available.")+'</div>';
  }else if(state.tab==="full"){
    p.innerHTML='<div class="detail-label">FULL NEWS</div><div class="detail-text">'+esc(state.full||state.summary||state.title||"No expanded provider summary is available.")+'</div><div class="muted" style="margin-top:10px">Provider-supplied expanded news only. MaliRadar does not invent missing article text.</div>';
  }else{
    const x=impact(),move=x.move==null?"—":(x.move>0?"+":"")+x.move.toFixed(2)+"%";
    const price=x.price==null?"—":"KSh "+x.price.toFixed(2);
    p.innerHTML='<div class="detail-label">MARKET IMPACT • OBSERVED ONLY</div><div class="grid" style="margin-top:8px"><div class="metric">STATUS<b>'+esc(imp.status)+'</b></div><div class="metric">CURRENT PRICE<b>'+esc(price)+'</b></div><div class="metric">OBSERVED MOVE<b>'+esc(move)+'</b></div><div class="metric">LINKED ASSET<b>'+esc(state.asset)+'</b></div></div><div class="detail-text" style="margin-top:12px">'+esc(imp.copy)+'</div><div class="actions" style="margin-top:12px"><button type="button" class="btn" id="mrNews3Open">OPEN STOCK</button></div>';
    const b=p.querySelector("#mrNews3Open");if(b){const s=resolveAsset(x.ov.dataset.newsAsset||state.asset,state.title,state.summary);b.setAttribute("data-mr-news-symbol",s);b.onclick=function(e){e.preventDefault();e.stopPropagation();const sym=String(this.getAttribute("data-mr-news-symbol")||"").trim().toUpperCase();if(!sym||sym==="MARKET"||sym==="USD/KES"||sym==="BTC"){b.textContent="STOCK DATA UNAVAILABLE";b.disabled=true;return}try{b.disabled=true;b.textContent="OPENING STOCK…";closeNewsDetail();if(typeof window.openM==="function"){window.openM("📈 "+sym,'<div class="notice">Loading verified '+esc(sym)+' stock data…</div>')}if(window.MaliRadarMarketPro&&typeof window.MaliRadarMarketPro.open==="function"){window.MaliRadarMarketPro.open(sym,"1M");return}if(window.MaliRadarStockIntel&&typeof window.MaliRadarStockIntel.open==="function"){window.MaliRadarStockIntel.open(sym,"1M");return}if(typeof window.details==="function"){window.details(sym);return}throw new Error("Stock detail engine unavailable")}catch(err){console.error("MaliRadar News Open Stock failed",err);if(typeof window.openM==="function"){window.openM("STOCK DETAIL ERROR",'<div class="notice">Unable to open verified stock detail right now.</div>')}else{b.disabled=false;b.textContent="OPEN STOCK"}}}}}
  }
}
function closeNewsDetail(){
  const ov=document.getElementById("newsDetailOverlay");
  if(ov)ov.style.display="none";
}
window.closeNewsDetail=closeNewsDetail;
function capture(){
  const ov=document.getElementById("newsDetailOverlay");if(!ov||ov.style.display!=="flex")return;
  const sum=ov.querySelector(".detail-summary"),why=ov.querySelector(".detail-why");
  state.summary=sum?.textContent||"";state.full=why?.textContent?.replace(/FULL NEWS/i,"").trim()||state.summary;
  state.title=ov.querySelector(".detail-title")?.textContent||"";
  state.asset=resolveAsset(ov.dataset.newsAsset||ov.querySelector(".detail-asset")?.textContent||"MARKET",state.title,state.summary);
  state.source=ov.querySelector(".detail-source")?.textContent||"";
  state.published=ov.querySelector(".detail-time")?.textContent||"";
  if(sum)sum.parentElement.style.display="none";if(why)why.parentElement.style.display="none";
  ensureTabs();renderPanel();
}
function decorateCards(){
  document.querySelectorAll("#newsFeed article.news-card").forEach(card=>{
    if(card.querySelector(".mr-news3-impact"))return;
    const asset=card.querySelector(".news-asset")?.textContent||"MARKET",q=quote(asset);
    const move=Number(q?.changePct??q?.change??q?.percentChange);
    const el=document.createElement("div");el.className="mr-news3-impact";
    el.style.cssText="margin-top:10px;padding:8px 9px;border-radius:10px;background:rgba(56,200,255,.055);border:1px solid rgba(56,200,255,.12);font-size:11px";
    el.innerHTML=q&&Number.isFinite(move)?"📊 Market response observed: <b>"+esc((move>0?"+":"")+move.toFixed(2)+"%")+"</b> • "+esc(asset):"📊 Market response: <span class='muted'>awaiting verified quote</span>";
    const src=card.querySelector(".news-source");if(src)src.before(el);
  });
}
function boot(){
  const ov=document.getElementById("newsDetailOverlay");if(!ov)return;
  const mo=new MutationObserver(()=>capture());mo.observe(ov,{attributes:true,attributeFilter:["style"]});
    setTimeout(decorateCards,300);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
window.MaliRadarNewsIntelligence3={version:"3.5-key-moments",refresh:()=>{decorateCards();capture()}};
})();