/* MaliRadar v4.9 — Professional Paper Order Ticket */
(function(){
  "use strict";
  const KEY="maliradar_v07_state";
  const readState=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}};
  const writeState=s=>localStorage.setItem(KEY,JSON.stringify(s));
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const fmt=n=>Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2});
  const getStock=s=>typeof window.stock==="function"?window.stock(s):null;
  const getPrice=s=>{
    try{if(typeof window.paperPrice==="function"){const p=window.paperPrice(s);if(Number.isFinite(p)&&p>0)return p}}catch(e){}
    const q=window.maliRadarProviderQuotes&&window.maliRadarProviderQuotes[s];
    return q&&Number.isFinite(Number(q.price))?Number(q.price):null;
  };
  function refreshApp(){try{if(typeof window.render==="function")window.render()}catch(e){}}
  function close(){try{if(typeof window.closeM==="function")window.closeM()}catch(e){}}
  function ticket(side,s){
    const st=readState(), x=getStock(s), price=getPrice(s);
    if(!price)return alert("Verified provider price is not available for this stock yet. MaliRadar will not invent a paper-trade price.");
    const owned=Number(st.hold&&st.hold[s]||0), cash=Number(st.cash||0);
    const max=side==="BUY"?Math.floor(cash/price):owned;
    const name=x&&x[1]?x[1]:s;
    const delayed=(window.maliRadarProviderQuotes&&window.maliRadarProviderQuotes[s]&&window.maliRadarProviderQuotes[s].delayMinutes)||15;
    const title=side==="BUY"?"Paper Buy":"Paper Sell";
    const action=side==="BUY"?"BUY":"SELL";
    const accent=side==="BUY"?"var(--a)":"var(--r)";
    const root=document.createElement("div");
    root.id="mr49OrderOverlay";
    root.innerHTML='<div style="position:fixed;inset:0;background:#000b;z-index:9000;display:flex;align-items:flex-end;justify-content:center"><div style="width:100%;max-width:480px;background:#0c1820;border:1px solid var(--line);border-radius:20px 20px 0 0;padding:18px;max-height:88vh;overflow:auto">'+
      '<div class="row"><div><div class="muted">PAPER ORDER</div><h2 style="margin:4px 0">'+title+'</h2><div class="muted">'+esc(name)+' • '+esc(s)+'</div></div><button class="btn alt" id="mr49Close">✕</button></div>'+
      '<div class="grid"><div class="metric"><div>Provider price</div><b>KSh '+fmt(price)+'</b></div><div class="metric"><div>Data</div><b style="color:#ffe08a">'+delayed+'-MIN DELAYED</b></div></div>'+
      '<div class="formline" style="margin-top:14px"><label style="width:80px">Quantity</label><input id="mr49Qty" type="number" min="1" max="'+max+'" step="1" value="'+(max?Math.min(1,max):0)+'"></div>'+
      '<div class="metric" style="margin-top:10px"><div>Estimated '+(side==="BUY"?"cost":"proceeds")+'</div><b id="mr49Total">KSh 0.00</b></div>'+
      '<div class="metric" style="margin-top:8px"><div>'+(side==="BUY"?"Paper cash available":"Shares available")+'</div><b id="mr49Available">'+(side==="BUY"?"KSh "+fmt(cash):owned+" shares")+'</b></div>'+
      '<p class="notice" style="margin-top:12px">This is a simulation only. The displayed provider price is delayed. No real money or real order is sent.</p>'+
      '<button class="btn" id="mr49Submit" style="width:100%;margin-top:8px;color:#041015;background:'+accent+'">'+action+' PAPER ORDER</button></div></div>';
    document.body.appendChild(root);
    const qty=root.querySelector("#mr49Qty"), total=root.querySelector("#mr49Total"), submit=root.querySelector("#mr49Submit");
    const update=()=>{let q=Math.floor(Number(qty.value)||0);total.textContent="KSh "+fmt(q*price);submit.disabled=q<1||q>max;submit.style.opacity=submit.disabled?".45":"1"};
    qty.addEventListener("input",update); update();
    root.querySelector("#mr49Close").onclick=()=>root.remove();
    root.firstElementChild.onclick=e=>{if(e.target===root.firstElementChild)root.remove()};
    submit.onclick=()=>{
      const q=Math.floor(Number(qty.value)||0);
      if(q<1||q>max)return;
      const totalValue=q*price;
      const fresh=readState();
      fresh.cash=Number(fresh.cash||0); fresh.hold=fresh.hold||{}; fresh.history=Array.isArray(fresh.history)?fresh.history:[];
      if(side==="BUY"){
        if(totalValue>fresh.cash)return alert("Not enough paper cash.");
        fresh.cash-=totalValue; fresh.hold[s]=(Number(fresh.hold[s]||0)+q);
      }else{
        const have=Number(fresh.hold[s]||0);
        if(q>have)return alert("You do not have enough paper shares.");
        fresh.cash+=totalValue; fresh.hold[s]=have-q; if(!fresh.hold[s])delete fresh.hold[s];
      }
      fresh.history.unshift({type:side,sym:s,q:q,p:price,value:totalValue,time:new Date().toLocaleString(),providerBacked:true,delayMinutes:delayed});
      writeState(fresh); root.remove(); close(); refreshApp();
      setTimeout(()=>{try{if(typeof window.openM==="function")window.openM("Paper "+(side==="BUY"?"buy":"sell")+" successful",'<p><b>'+q+' '+esc(s)+' shares</b> '+(side==="BUY"?"bought":"sold")+' at KSh '+fmt(price)+' each.</p><div class="metric"><div>'+(side==="BUY"?"Total cost":"Cash received")+'</div><b>KSh '+fmt(totalValue)+'</b></div><p class="notice">Provider-backed, '+delayed+'-minute delayed simulation price.</p>')}catch(e){}},80);
    };
  }
  window.MaliRadarOrderTicket={version:"1.0",open:ticket};
  window.buy=function(s){ticket("BUY",s)};
  window.sell=function(s){ticket("SELL",s)};
  document.addEventListener("click",e=>{
    const b=e.target.closest&&e.target.closest("[data-mr49-order]");
    if(b)ticket(b.dataset.mr49Order,b.dataset.symbol);
  });
})();