(()=>{"use strict";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const local=s=>String(s||"").toUpperCase().replace(/\.(KE|NG|ZA|GH|EG|MA|TZ|UG|RW)$/,"");
const state={summary:"",full:"",asset:"MARKET",title:"",source:"",published:""};

function resolveAsset(raw,title,summary){
 const a=local(raw);
 if(["SCOM","KCB","EQTY","EABL","ABSA"].includes(a))return a;
 const t=String((title||"")+" "+(summary||"")).toLowerCase();
 if(/safaricom|\bscom\b/.test(t))return "SCOM";
 if(/\bkcb\b|kenya commercial bank/.test(t))return "KCB";
 if(/equity bank|equity group|\beqty\b/.test(t))return "EQTY";
 if(/eabl|east african breweries/.test(t))return "EABL";
 if(/absa bank|\babsa\b/.test(t))return "ABSA";
 if(/co-operative bank|co-op bank|cooperative bank|\bcoop\b/.test(t))return "COOP";
 if(/ncba group|ncba bank|\bncba\b/.test(t))return "NCBA";
 if(/standard chartered|\bscbk\b/.test(t))return "SCBK";
 if(/i&m group|i&m bank|i\&m|\bimh\b/.test(t))return "IMH";
 if(/kenya pipeline|\bkpc\b/.test(t))return "KPC";
 if(/kenya power|\bkplc\b/.test(t))return "KPLC";
 if(/kengen|kenya electricity generating|\bkegn\b/.test(t))return "KEGN";
 if(/nation media|\bnmg\b/.test(t))return "NMG";
 if(/kenya airways|\bkq\b/.test(t))return "KQ";
 if(/jubilee holdings|\bjub\b/.test(t))return "JUB";
 if(/diamond trust|dtb kenya|\bdtk\b/.test(t))return "DTK";
 if(/hf group|\bhfck\b/.test(t))return "HFCK";
 if(/cic group|\bcic\b/.test(t))return "CIC";
 if(/stanbic|\bsbic\b/.test(t))return "SBIC";
 if(/british american tobacco|\bbat\b/.test(t))return "BAT";
 if(/totalenergies kenya|\btotl\b/.test(t))return "TOTL";
 if(/bamburi cement|\bbamb\b/.test(t))return "BAMB";
 if(/crown paints|\bcrwn\b/.test(t))return "CRWN";
 if(/bank of baroda|\bbob\b/.test(t))return "BOB";
 if(/bank of africa kenya|\bboa\b/.test(t))return "BOA";
 if(/boc kenya|\bboc\b/.test(t))return "BOC";
 return a||"MARKET";
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
 if(!q||!Number.isFinite(Number(q.price)))return{status:"PENDING DATA",copy:"No verified provider quote is available for this news-linked asset right now.",move:null,price:null};
 const move=Number(q.changePct??q.change??q.percentChange);
 if(!Number.isFinite(move))return{status:"OBSERVED PRICE",copy:"A verified provider price is available, but no verified percentage move was returned.",move:null,price:Number(q.price)};
 let status="STABLE OBSERVATION";
 if(move>=2)status="STRONG POSITIVE MOVE";
 else if(move>=0.5)status="POSITIVE MOVE";
 else if(move<=-2)status="STRONG NEGATIVE MOVE";
 else if(move<=-0.5)status="NEGATIVE MOVE";
 return{status,copy:"Observed provider movement only. This does not establish that the news caused the move or predict what happens next.",move,price:Number(q.price)};
}

function stockAvailable(sym){
 return !!sym && !["MARKET","USD/KES","BTC"].includes(sym);
}

function openStock(sym,button){
 const s=String(sym||"").trim().toUpperCase();
 if(!stockAvailable(s)){
  button.disabled=true;button.textContent="NO NSE STOCK LINK";return;
 }
 try{
  button.disabled=true;button.textContent="OPENING STOCK…";
  closeNewsDetail();
  if(window.MaliRadarMarketPro&&typeof window.MaliRadarMarketPro.open==="function"){window.MaliRadarMarketPro.open(s,"1M");return}
  if(window.MaliRadarStockIntel&&typeof window.MaliRadarStockIntel.open==="function"){window.MaliRadarStockIntel.open(s,"1M");return}
  if(typeof window.details==="function"){window.details(s);return}
  if(typeof window.openM==="function"){window.openM("STOCK DETAIL ERROR",'<div class="notice">Stock detail engine unavailable right now.</div>');return}
  throw new Error("Stock detail engine unavailable");
 }catch(err){
  console.error("MaliRadar News Open Stock failed",err);
  button.disabled=false;button.textContent="OPEN STOCK";
 }
}

function ensurePanels(){
 const ov=document.getElementById("newsDetailOverlay");if(!ov)return null;
 const detail=ov.querySelector(".news-detail");if(!detail)return null;
 let wrap=detail.querySelector("#mrNews3Panels");
 if(!wrap){
  wrap=document.createElement("div");
  wrap.id="mrNews3Panels";
  wrap.style.cssText="display:grid;gap:10px;margin-top:14px";
  detail.appendChild(wrap);
 }
 return {ov,detail,wrap};
}

function renderPanels(){
 const x=ensurePanels();if(!x)return;
 const imp=impact();
 const move=imp.move==null?"—":(imp.move>0?"+":"")+imp.move.toFixed(2)+"%";
 const price=imp.price==null?"—":"KSh "+imp.price.toFixed(2);
 const sym=resolveAsset(state.asset,state.title,state.summary);
 x.wrap.innerHTML=
  '<div class="detail-section"><div class="detail-label">1 • EVENT SUMMARY</div><div class="detail-text">'+esc(state.summary||state.title||"No summary available.")+'</div></div>'+
  '<div class="detail-section"><div class="detail-label">2 • FULL NEWS</div><div class="detail-text">'+esc(state.full||state.summary||state.title||"No expanded provider summary is available.")+'</div><div class="muted" style="margin-top:10px">Provider-supplied expanded news only. MaliRadar does not invent missing article text.</div></div>'+
  '<div class="detail-section"><div class="detail-label">3 • MARKET IMPACT</div><div class="grid" style="margin-top:8px"><div class="metric">STATUS<b>'+esc(imp.status)+'</b></div><div class="metric">CURRENT PRICE<b>'+esc(price)+'</b></div><div class="metric">OBSERVED MOVE<b>'+esc(move)+'</b></div><div class="metric">LINKED ASSET<b>'+esc(sym)+'</b></div></div><div class="detail-text" style="margin-top:12px">'+esc(imp.copy)+'</div><div class="actions" style="margin-top:12px"><button type="button" class="btn" id="mrNews3Open">OPEN STOCK</button></div></div>';
 const b=x.wrap.querySelector("#mrNews3Open");
 if(b){
  b.setAttribute("data-mr-news-symbol",sym);
  b.onclick=e=>{e.preventDefault();e.stopPropagation();openStock(b.getAttribute("data-mr-news-symbol"),b)};
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
 state.summary=sum?.textContent||"";
 state.full=why?.textContent?.replace(/FULL NEWS/i,"").trim()||state.summary;
 state.title=ov.querySelector(".detail-title")?.textContent||"";
 state.asset=resolveAsset(ov.dataset.newsAsset||ov.querySelector(".detail-asset")?.textContent||"MARKET",state.title,state.summary);
 state.source=ov.querySelector(".detail-source")?.textContent||"";
 state.published=ov.querySelector(".detail-time")?.textContent||"";
 if(sum)sum.parentElement.style.display="none";
 if(why)why.parentElement.style.display="none";
 const source=ov.querySelector(".detail-source");
 if(source)source.parentElement.style.display="none";
 renderPanels();
}

function decorateCards(){
 document.querySelectorAll("#newsFeed article.news-card").forEach(card=>{
  if(card.querySelector(".mr-news3-impact"))return;
  const asset=card.querySelector(".news-asset")?.textContent||"MARKET",q=quote(asset);
  const move=Number(q?.changePct??q?.change??q?.percentChange);
  const el=document.createElement("div");
  el.className="mr-news3-impact";
  el.style.cssText="margin-top:10px;padding:8px 9px;border-radius:10px;background:rgba(56,200,255,.055);border:1px solid rgba(56,200,255,.12);font-size:11px";
  el.innerHTML=q&&Number.isFinite(move)?"📊 Market response observed: <b>"+esc((move>0?"+":"")+move.toFixed(2)+"%")+"</b> • "+esc(asset):"📊 Market response: <span class='muted'>awaiting verified quote</span>";
  const src=card.querySelector(".news-source");if(src)src.before(el);
 });
}

function boot(){
 const ov=document.getElementById("newsDetailOverlay");if(!ov)return;
 const mo=new MutationObserver(()=>capture());
 mo.observe(ov,{attributes:true,attributeFilter:["style"]});
 setTimeout(decorateCards,500);
 setInterval(decorateCards,2500);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
window.MaliRadarNewsIntelligence3={version:"4.0-three-sections",refresh:()=>{decorateCards();capture()}};
})();