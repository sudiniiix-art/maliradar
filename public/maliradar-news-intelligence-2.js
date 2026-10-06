(()=>{"use strict";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clean=v=>String(v??"").replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g," ").trim();
const local=s=>String(s||"").toUpperCase().replace(/\.(KE|NG|ZA|GH|EG|MA|TZ|UG|RW)$/,"");
const state={filter:"all",query:"",items:[],loading:false,stamp:0};
function watchSymbols(){try{const raw=JSON.parse(localStorage.getItem("maliradar_v07_state")||"{}");const w=raw.watchlist||raw.watchList||[];return Array.isArray(w)?w.map(x=>local(x.symbol||x)).filter(Boolean):[]}catch{return[]}}
function mount(){
 const screen=document.getElementById("newsView");if(!screen)return null;
 let bar=document.getElementById("mrNews2Bar");
 if(!bar){bar=document.createElement("div");bar.id="mrNews2Bar";bar.className="news-card";bar.style.marginBottom="12px";screen.insertBefore(bar,screen.querySelector(".news-filters"))}
 return bar;
}
function classify(x){
 const t=(x.title+" "+x.summary).toLowerCase();
 if(/profit|dividend|growth|award|partnership|deal|upgrade|surge|gain|approval|contract|expansion|acqui/.test(t))return["POSITIVE","positive"];
 if(/loss|drop|fall|decline|warning|fraud|lawsuit|risk|downgrade|cut|scandal|default|recall|strike|inflation|tax|debt/.test(t))return["RISK","risk"];
 return["NEUTRAL","neutral"];
}
function eventType(x){
 const t=(x.title+" "+x.summary).toLowerCase();
 if(/earnings|profit|revenue|dividend|results/.test(t))return"RESULTS";
 if(/merger|acqui|deal|partnership|contract/.test(t))return"CORPORATE";
 if(/rate|central bank|inflation|tax|budget|currency|shilling|forex/.test(t))return"MACRO";
 if(/regulator|approval|license|law|policy|government/.test(t))return"POLICY";
 if(/oil|fuel|gold|commodity|crude/.test(t))return"COMMODITIES";
 if(/listing|ipo|offer|rights issue|bond/.test(t))return"CAPITAL MARKETS";
 return"MARKET";
}
function urgency(x){
 const t=(x.title+" "+x.summary).toLowerCase();
 if(/breaking|just in|urgent/.test(t))return["BREAKING","high"];
 if(/today|announced|reports|warns|approved|results/.test(t))return["TODAY","medium"];
 return["MONITOR","low"];
}
function enrich(x){
 const [label,cls]=classify(x),[u,uc]=urgency(x);
 return {...x,title:clean(x.title),summary:clean(x.summary),fullNews:clean(x.fullNews||x.summary||x.title),asset:local(x.asset||"MARKET")||"MARKET",sentiment:label,sentimentClass:cls,eventType:eventType(x),urgency:u,urgencyClass:uc};
}
function dedupe(items){
 const seen=new Set();
 return items.map(enrich).filter(x=>{const k=(x.title+"|"+(x.source||"")).toLowerCase();if(seen.has(k))return false;seen.add(k);return true});
}
function status(){
 const b=mount();if(!b)return;
 b.innerHTML='<div class="row"><div><div class="eyebrow">NEWS + EVENT RADAR 2.0</div><h3 style="margin:4px 0">Live Market Intelligence</h3><div class="muted">Verified provider headlines, event classification and linked-asset context. No fabricated news.</div></div><span class="news-badge">'+(state.loading?"🟡 UPDATING":"🟢 READY")+'</span></div>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><input id="mrNews2Search" class="input" placeholder="Search company, ticker or topic…" value="'+esc(state.query)+'" style="flex:1;min-width:180px"><button class="btn" id="mrNews2Go">SEARCH</button><button class="btn alt" id="mrNews2Refresh">↻ REFRESH</button></div>'+
 '<div id="mrNews2Stats" class="muted" style="margin-top:9px"></div>'+
 '<div id="mrNews2Chips" class="news-filters" style="margin-top:9px"><button data-nf="all" class="active">ALL</button><button data-nf="positive">POSITIVE</button><button data-nf="risk">RISK</button><button data-nf="corporate">CORPORATE</button><button data-nf="macro">MACRO</button><button data-nf="policy">POLICY</button></div>';
 document.getElementById("mrNews2Go").onclick=()=>{state.query=document.getElementById("mrNews2Search").value.trim();load()};
 document.getElementById("mrNews2Refresh").onclick=()=>load();
 document.getElementById("mrNews2Search").onkeydown=e=>{if(e.key==="Enter"){state.query=e.target.value.trim();load()}};
 document.querySelectorAll("#mrNews2Chips button").forEach(b=>b.onclick=()=>{state.filter=b.dataset.nf||"all";document.querySelectorAll("#mrNews2Chips button").forEach(x=>x.classList.remove("active"));b.classList.add("active");render()});
}
function filtered(){return state.items.filter(x=>{
 const f=state.filter;
 if(f==="positive")return x.sentimentClass==="positive";
 if(f==="risk")return x.sentimentClass==="risk";
 if(["corporate","macro","policy"].includes(f))return x.eventType.toLowerCase()===f;
 return true;
});}
function renderRadar(){
 const radar=document.getElementById("eventRadar");if(!radar)return;
 const items=state.items.slice(0,10);
 if(!items.length){radar.innerHTML='<div class="event-line"><div class="event-title">No verified events</div><div class="event-asset">Waiting for provider news.</div></div>';return}
 radar.innerHTML=items.map((s,i)=>'<div class="event-line mr20-event" data-event-index="'+i+'"><div class="row"><div class="event-time">'+esc(s.urgency)+' • '+esc(s.eventType)+'</div><span class="news-tag">'+esc(s.sentiment)+'</span></div><div class="event-title">'+esc(s.title)+'</div><div class="event-asset">'+esc(s.asset==="MARKET"?"Market-wide":s.asset)+' • '+esc(s.source||"Provider")+' • '+esc(s.published||s.time||"Recent")+'</div></div>').join("");
 radar.querySelectorAll("[data-event-index]").forEach(e=>e.onclick=()=>openDetail(state.items[Number(e.dataset.eventIndex)]));
}
function render(){
 const feed=document.getElementById("newsFeed"),stats=document.getElementById("mrNews2Stats");if(!feed)return;
 const items=filtered();
 if(stats)stats.textContent=state.items.length+" verified items • "+state.items.filter(x=>x.sentimentClass==="positive").length+" positive • "+state.items.filter(x=>x.sentimentClass==="risk").length+" risk • updated "+new Date().toLocaleTimeString()+" • News may be delayed.";
 feed.innerHTML=items.length?items.map((s,i)=>'<article class="news-card mr20-news"><div class="news-kicker"><span class="news-type">'+esc((s.category||"MARKET").toUpperCase())+' • '+esc(s.urgency)+'</span><span class="news-asset">'+esc(s.asset)+'</span></div><h3>'+esc(s.title)+'</h3><div class="news-tags"><span class="news-tag">'+esc(s.sentiment)+'</span><span class="news-tag">'+esc(s.eventType)+'</span><span class="news-tag">'+esc(s.source||"Provider")+'</span></div><div class="news-summary">'+esc(s.summary||"No summary available.")+'</div><div class="news-source"><span class="news-meta">'+esc(s.published||s.time||"")+'</span><span class="news-open"><button type="button" data-news-open="'+i+'">READ IN MALIRADAR</button></span></div></article>').join(""):'<div class="news-card"><h3>No verified news returned</h3><div class="news-summary">MaliRadar will not replace unavailable live news with invented headlines. Try another filter or search.</div></div>';
 feed.querySelectorAll("[data-news-open]").forEach(b=>b.onclick=()=>openDetail(items[Number(b.dataset.newsOpen)]));
 renderRadar();
}
function openDetail(s){if(!s)return;const ov=document.getElementById("newsDetailOverlay");if(!ov)return;ov.dataset.newsAsset=String(s.asset||"MARKET").toUpperCase();ov.dataset.newsEvent=s.eventType||"MARKET";ov.dataset.newsSentiment=s.sentiment||"NEUTRAL";const set=(sel,val)=>{const e=ov.querySelector(sel);if(e)e.textContent=val};set(".detail-type",(s.eventType||"MARKET").toUpperCase()+" INTELLIGENCE");set(".detail-asset",s.asset||"MARKET");set(".detail-title",clean(s.title||"Market Intelligence"));set(".detail-time",s.published||s.time||"");set(".detail-summary",clean(s.summary||s.title||"No summary available."));const full=clean(s.fullNews||s.summary||s.title||"No expanded provider summary is available.");const why=ov.querySelector(".detail-why");if(why)why.innerHTML="<b>FULL NEWS</b><div style=\"margin-top:8px;line-height:1.65\">"+esc(full)+"</div><div class=\"muted\" style=\"margin-top:10px\">Expanded provider-supplied news view. MaliRadar does not invent missing article text.</div>";set(".detail-source",s.source||"Provider");ov.style.display="flex"}
async function load(){
 if(state.loading)return;
 state.loading=true;status();
 try{
  let q=state.query;
  if(state.filter==="nse")q=q||"NSE Kenya stocks";
  else if(state.filter==="forex")q=q||"USD KES forex";
  else if(state.filter==="crypto")q=q||"crypto markets";
  else if(state.filter==="global")q=q||"global stock markets";
  else if(state.filter==="watchlist"){const w=watchSymbols();q=q||w.slice(0,8).join(" OR ");if(!q)q="Kenya stocks"}
  const r=await fetch("/api/news?market="+encodeURIComponent(["nse","forex","crypto","global","watchlist"].includes(state.filter)?state.filter:"all")+"&query="+encodeURIComponent(q||"Kenya markets"),{cache:"no-store"});
  if(!r.ok)throw Error("News provider unavailable");
  const d=await r.json();
  state.items=dedupe(Array.isArray(d.items)?d.items:[]);
  state.stamp=Date.now();
 }catch(e){state.items=[]}
 finally{state.loading=false;status();render()}
}
function boot(){
 mount();status();
 document.querySelectorAll("#newsFilters button").forEach(b=>{b.onclick=()=>{const f=b.dataset.filter||"all";document.querySelectorAll("#newsFilters button").forEach(x=>x.classList.remove("active"));b.classList.add("active");if(["all","watchlist","nse","forex","crypto","global"].includes(f)){state.filter=f;load()}}});
 load();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
window.MaliRadarNewsIntelligence2={version:"2.0-radar",refresh:load,search:q=>{state.query=String(q||"");load()}};
})();