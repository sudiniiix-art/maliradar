(()=>{"use strict";
const KEY="maliradar_provider_watchlist_v2";
const local=s=>String(s||"").toUpperCase().split(".")[0];
const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(x)?x:[]}catch(e){return[]}};
const write=x=>localStorage.setItem(KEY,JSON.stringify([...new Set(x.map(local).filter(Boolean))]));
function quoteDirectory(){
  const qs=Object.values(window.maliRadarProviderQuotes||{});
  return qs.filter(q=>q&&(q.localSymbol||q.symbol)).map(q=>({s:local(q.localSymbol||q.symbol),name:q.name||q.localSymbol||q.symbol,exchange:q.exchange||""})).filter((x,i,a)=>a.findIndex(y=>y.s===x.s)===i);
}
function fallbackOptions(){
  const sel=document.getElementById("mr45Symbol");if(!sel)return false;
  const rows=quoteDirectory();if(!rows.length)return false;
  const current=sel.value;
  const saved=new Set(read());
  const existing=[...sel.options].map(o=>local(o.value));
  if(existing.length>0&&existing.some(Boolean))return false;
  sel.innerHTML=rows.map(x=>'<option value="'+esc(x.s)+'">'+esc(x.name)+" — "+esc(x.s)+(saved.has(x.s)?" ✓":"")+"</option>").join("");
  if(current)sel.value=current;
  const status=document.getElementById("mr45Status");
  if(status)status.textContent="Provider directory fallback active • "+rows.length+" verified quote instruments";
  return true;
}
function patch(){
  const api=window.MaliRadarWatch;
  if(!api)return;
  if(!api.__mr83Patched){
    api.__mr83OriginalAddSelected=api.addSelected;
    api.addSelected=function(){
      const sel=document.getElementById("mr45Symbol");
      const sym=local(sel?.value);
      if(!sym){alert("Select a stock first.");return}
      const items=read();
      if(!items.includes(sym)){items.push(sym);write(items)}
      if(typeof api.render==="function")api.render();
      else if(typeof window.renderMarkets==="function")window.renderMarkets();
      fallbackOptions();
    };
    api.__mr83Patched=true;
  }
  fallbackOptions();
}
function boot(){patch();setInterval(patch,2000)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,500));else setTimeout(boot,500);
})();