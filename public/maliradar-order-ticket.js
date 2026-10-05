/* MaliRadar v5.0 — Professional Paper Order Ticket + Limit Orders */
(function(){
  "use strict";
  const KEY="maliradar_v07_state";
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}};
  const write=s=>localStorage.setItem(KEY,JSON.stringify(s));
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const fmt=n=>Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2});
  const price=s=>{
    try{if(typeof window.paperPrice==="function"){const p=window.paperPrice(s);if(Number.isFinite(p)&&p>0)return p}}catch(e){}
    const q=window.maliRadarProviderQuotes&&window.maliRadarProviderQuotes[s];
    return q&&Number.isFinite(Number(q.price))?Number(q.price):null;
  };
  const stock=s=>typeof window.stock==="function"?window.stock(s):null;
  const delayed=s=>Number(window.maliRadarProviderQuotes&&window.maliRadarProviderQuotes[s]&&window.maliRadarProviderQuotes[s].delayMinutes)||15;
  const refresh=()=>{try{if(typeof window.render==="function")window.render()}catch(e){}};
  function executeLimit(o,p,st){
    st.cash=Number(st.cash||0);st.hold=st.hold||{};st.history=Array.isArray(st.history)?st.history:[];
    const value=o.q*p;
    if(o.side==="BUY"){
      if(value>st.cash)return false;
      st.cash-=value;st.hold[o.sym]=(Number(st.hold[o.sym]||0)+o.q);
    }else{
      const have=Number(st.hold[o.sym]||0);
      if(o.q>have)return false;
      st.cash+=value;st.hold[o.sym]=have-o.q;if(!st.hold[o.sym])delete st.hold[o.sym];
    }
    st.history.unshift({type:o.side,sym:o.sym,q:o.q,p:p,value:value,time:new Date().toLocaleString(),providerBacked:true,delayMinutes:o.delayMinutes,orderType:"LIMIT",orderId:o.id,executedAt:new Date().toISOString()});
    return true;
  }
  function checkLimits(){
    const st=read();const pending=Array.isArray(st.pendingOrders)?st.pendingOrders:[];
    if(!pending.length)return;
    let changed=false;
    const keep=[];
    pending.forEach(o=>{
      const p=price(o.sym);
      if(!p){keep.push(o);return}
      const hit=o.side==="BUY"?p<=o.limitPrice:p>=o.limitPrice;
      if(hit&&executeLimit(o,p,st)){changed=true}
      else keep.push(o);
    });
    if(changed){st.pendingOrders=keep;write(st);refresh()}
  }
  function ticket(side,s){
    const st=read(),x=stock(s),p=price(s);
    if(!p)return alert("Verified provider price is not available for this stock yet. MaliRadar will not invent a paper-trade price.");
    const owned=Number(st.hold&&st.hold[s]||0),cash=Number(st.cash||0),max=side==="BUY"?Math.floor(cash/p):owned;
    const name=x&&x[1]?x[1]:s, d=delayed(s);
    const root=document.createElement("div");root.id="mr49OrderOverlay";
    root.innerHTML='<div style="position:fixed;inset:0;background:#000b;z-index:9000;display:flex;align-items:flex-end;justify-content:center"><div style="width:100%;max-width:480px;background:#0c1820;border:1px solid var(--line);border-radius:20px 20px 0 0;padding:18px;max-height:90vh;overflow:auto">'+
      '<div class="row"><div><div class="muted">PAPER ORDER</div><h2 style="margin:4px 0">Paper '+(side==="BUY"?"Buy":"Sell")+'</h2><div class="muted">'+esc(name)+' • '+esc(s)+'</div></div><button class="btn alt" id="mr50Close">✕</button></div>'+
      '<div class="grid"><div class="metric"><div>Provider price</div><b>KSh '+fmt(p)+'</b></div><div class="metric"><div>Data</div><b style="color:#ffe08a">'+d+'-MIN DELAYED</b></div></div>'+
      '<div class="formline" style="margin-top:14px"><label style="width:80px">Order type</label><select id="mr50Type"><option value="MARKET">Market — execute now</option><option value="LIMIT">Limit — execute at target</option></select></div>'+
      '<div class="formline" id="mr50LimitRow" style="margin-top:8px;display:none"><label style="width:80px">Limit price</label><input id="mr50Limit" type="number" min="0.01" step="0.01" value="'+fmt(p)+'"></div>'+
      '<div class="formline" style="margin-top:8px"><label style="width:80px">Quantity</label><input id="mr50Qty" type="number" min="1" max="'+max+'" step="1" value="'+(max?Math.min(1,max):0)+'"></div>'+
      '<div class="metric" style="margin-top:10px"><div>Estimated '+(side==="BUY"?"cost":"proceeds")+'</div><b id="mr50Total">KSh 0.00</b></div>'+
      '<div class="metric" style="margin-top:8px"><div>'+(side==="BUY"?"Paper cash available":"Shares available")+'</div><b>'+(side==="BUY"?"KSh "+fmt(cash):owned+" shares")+'</b></div>'+
      '<p class="notice" style="margin-top:12px">Simulation only. Provider data is delayed. Limit orders remain pending until the provider price reaches your target.</p>'+
      '<button class="btn" id="mr50Submit" style="width:100%;margin-top:8px;color:#041015;background:'+(side==="BUY"?"var(--a)":"var(--r)")+'">'+(side==="BUY"?"BUY":"SELL")+' PAPER ORDER</button></div></div>';
    document.body.appendChild(root);
    const type=root.querySelector("#mr50Type"),lr=root.querySelector("#mr50LimitRow"),lim=root.querySelector("#mr50Limit"),qty=root.querySelector("#mr50Qty"),tot=root.querySelector("#mr50Total"),submit=root.querySelector("#mr50Submit");
    const update=()=>{const q=Math.floor(Number(qty.value)||0),lp=Number(lim.value)||p;lr.style.display=type.value==="LIMIT"?"flex":"none";tot.textContent="KSh "+fmt(q*(type.value==="LIMIT"?lp:p));submit.disabled=q<1||q>max||(type.value==="LIMIT"&&lp<=0);submit.style.opacity=submit.disabled?".45":"1"};
    type.onchange=update;lim.oninput=update;qty.oninput=update;update();
    root.querySelector("#mr50Close").onclick=()=>root.remove();root.firstElementChild.onclick=e=>{if(e.target===root.firstElementChild)root.remove()};
    submit.onclick=()=>{
      const q=Math.floor(Number(qty.value)||0),kind=type.value,lp=Number(lim.value)||0;
      if(q<1||q>max||(kind==="LIMIT"&&lp<=0))return;
      const fresh=read();fresh.cash=Number(fresh.cash||0);fresh.hold=fresh.hold||{};fresh.history=Array.isArray(fresh.history)?fresh.history:[];
      if(kind==="LIMIT"){
        fresh.pendingOrders=Array.isArray(fresh.pendingOrders)?fresh.pendingOrders:[];
        const id="LMT-"+Date.now().toString(36).toUpperCase();
        fresh.pendingOrders.unshift({id,sym:s,side,q,limitPrice:lp,createdAt:new Date().toISOString(),delayMinutes:d,providerBacked:true});
        write(fresh);root.remove();refresh();renderPending();showOrderStatus((side==="BUY"?"Buy":"Sell")+" limit order for "+q+" "+s+" at KSh "+fmt(lp)+" is waiting for the provider price to reach the target.","pending");return;
      }
      const value=q*p;
      if(side==="BUY"){if(value>fresh.cash)return alert("Not enough paper cash.");fresh.cash-=value;fresh.hold[s]=(Number(fresh.hold[s]||0)+q)}
      else{const have=Number(fresh.hold[s]||0);if(q>have)return alert("You do not have enough paper shares.");fresh.cash+=value;fresh.hold[s]=have-q;if(!fresh.hold[s])delete fresh.hold[s]}
      fresh.history.unshift({type:side,sym:s,q,p,value,time:new Date().toLocaleString(),providerBacked:true,delayMinutes:d,orderType:"MARKET"});
      write(fresh);root.remove();refresh();renderPending();showOrderStatus((side==="BUY"?"Bought ":"Sold ")+q+" "+s+" at KSh "+fmt(p)+" each. This paper order is completed, not pending.","completed");
    };
  }
  function showOrderStatus(message,kind){
    let n=document.getElementById("mr50OrderStatus");
    if(!n){n=document.createElement("div");n.id="mr50OrderStatus";n.style.cssText="position:fixed;left:12px;right:12px;bottom:78px;z-index:9100;padding:13px 15px;border:1px solid var(--line);border-radius:14px;background:#0d1a22;box-shadow:0 10px 30px #0008";document.body.appendChild(n)}
    n.innerHTML='<b>'+esc(kind==="pending"?"⏳ ORDER PENDING":"✓ ORDER COMPLETED")+'</b><div class="muted" style="margin-top:4px">'+esc(message)+'</div>';
    clearTimeout(window.__mr50StatusTimer);window.__mr50StatusTimer=setTimeout(()=>n.remove(),5000);
  }
  function renderPending(){
    const p=document.getElementById("portfolio");if(!p)return;
    let card=document.getElementById("mr50PendingCard");
    if(!card){card=document.createElement("div");card.id="mr50PendingCard";card.className="card";p.insertBefore(card,p.firstElementChild?.nextElementSibling||p.firstChild);}
    const st=read(),arr=Array.isArray(st.pendingOrders)?st.pendingOrders:[];
    card.innerHTML='<div class="row"><div><b>⏳ Pending Paper Orders</b><div class="muted">Limit orders awaiting provider price</div></div><span class="badge">'+arr.length+' OPEN</span></div>'+
      (arr.length?arr.map(o=>'<div class="metric" style="margin-top:8px"><div><b>'+esc(o.side)+' • '+esc(o.sym)+'</b><br><span class="muted">'+o.q+' shares • target KSh '+fmt(o.limitPrice)+'</span></div><button class="btn alt" data-mr50-cancel="'+esc(o.id)+'">Cancel</button></div>').join(''):'<div class="notice" style="margin-top:10px">No pending limit orders.</div>')+
      '<p class="notice" style="margin-top:10px">Limit execution checks use provider-backed prices and the provider delay. This is educational simulation only.</p>';
    card.querySelectorAll("[data-mr50-cancel]").forEach(b=>b.onclick=()=>{
      const s=read();s.pendingOrders=(Array.isArray(s.pendingOrders)?s.pendingOrders:[]).filter(x=>x.id!==b.dataset.mr50Cancel);write(s);renderPending();
    });
  }
  window.MaliRadarOrderTicket={version:"2.0",open:ticket,checkLimits};
  window.buy=s=>ticket("BUY",s);window.sell=s=>ticket("SELL",s);
  document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-mr49-order]");if(b)ticket(b.dataset.mr49Order,b.dataset.symbol)});
  setInterval(()=>{checkLimits();renderPending()},10000);
  setTimeout(()=>{checkLimits();renderPending()},1000);
})();