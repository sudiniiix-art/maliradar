/* MaliRadar Trade Firewall v1 — final client-side execution guard */
(function(){
  "use strict";
  const KEY="maliradar_v07_state";
  const FREE={maxTradesPerDay:5,maxSharesPerOrder:25,maxSharesPerSymbol:100};
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}};
  const tier=()=>{
    try{return String(window.MaliRadarEntitlements?.tier?.()||"free").toLowerCase()}
    catch(e){return "free"}
  };
  const paid=()=>{
    try{
      if(typeof window.MaliRadarEntitlements?.isPro==="function")return !!window.MaliRadarEntitlements.isPro();
      return ["pro","premium","founder","founder_pro","founderpro"].includes(tier());
    }catch(e){return false}
  };
  const today=()=>new Date().toISOString().slice(0,10);
  const tradesToday=st=>{
    const h=Array.isArray(st.history)?st.history:[];
    return h.filter(x=>{
      try{
        const d=x.executedAt?String(x.executedAt).slice(0,10):(x.time?new Date(x.time).toISOString().slice(0,10):"");
        return d===today();
      }catch(e){return false}
    }).length;
  };
  function check(side,sym,q){
    q=Math.floor(Number(q)||0);sym=String(sym||"").toUpperCase().split(".")[0];
    if(paid())return {ok:true,pro:true};
    const st=read(), used=tradesToday(st), held=Number(st.hold?.[sym]||0);
    if(used>=FREE.maxTradesPerDay)return {ok:false,code:"DAILY_TRADES",message:"Free plan limit reached: all 5 stock trades for today have been used."};
    if(q<1)return {ok:false,code:"INVALID_QTY",message:"Enter at least 1 share."};
    if(q>FREE.maxSharesPerOrder)return {ok:false,code:"ORDER_SIZE",message:"Free plan limit: maximum 25 shares per stock order."};
    if(side==="BUY"&&held+q>FREE.maxSharesPerSymbol)return {ok:false,code:"POSITION_SIZE",message:"Free plan limit: maximum 100 shares held per stock."};
    return {ok:true,pro:false};
  }
  function notify(result){
    if(result?.ok)return true;
    const msg=result?.message+"\n\nUpgrade to Pro for unlimited stock trading.";
    try{
      if(typeof window.showOrderStatus==="function")window.showOrderStatus(msg,"limit");
      else alert("FREE PLAN LIMIT REACHED\n\n"+msg);
    }catch(e){try{alert("FREE PLAN LIMIT REACHED\n\n"+msg)}catch(_){}}
    return false;
  }
  window.MaliRadarTradeFirewall={version:1,check,pro:paid,refresh:()=>{}};

  function dailyGate(){
    if(paid())return {ok:true,pro:true};
    const used=tradesToday(read());
    return used<FREE.maxTradesPerDay
      ? {ok:true,pro:false}
      : {ok:false,code:"DAILY_TRADES",message:"Free plan limit reached: all 5 stock trades for today have been used."};
  }
  function patchBuySell(){
    const b=window.buy,s=window.sell;
    if(typeof b==="function"&&!b.__mrTradeFirewallWrapped){
      const wrapped=function(sym){
        const g=dailyGate();
        if(!notify(g))return;
        return b.apply(this,arguments);
      };
      wrapped.__mrTradeFirewallWrapped=true;
      wrapped.__mrOriginal=b;
      window.buy=wrapped;
    }
    if(typeof s==="function"&&!s.__mrTradeFirewallWrapped){
      const wrapped=function(sym){
        const g=dailyGate();
        if(!notify(g))return;
        return s.apply(this,arguments);
      };
      wrapped.__mrTradeFirewallWrapped=true;
      wrapped.__mrOriginal=s;
      window.sell=wrapped;
    }
  }

  function patchTicket(){
    const ot=window.MaliRadarOrderTicket;
    if(!ot||ot.__mrTradeFirewallWrapped)return;
    if(typeof ot.open==="function"){
      const original=ot.open;
      ot.open=function(side,sym){
        const g=dailyGate();
        if(!g.ok){notify(g);return false}
        return original.apply(this,arguments);
      };
      ot.open.__mrTradeFirewallWrapped=true;
      ot.__mrTradeFirewallWrapped=true;
    }
  }

  function arm(){
    patchTicket();
    patchBuySell();
    // Keep this last in the client lifecycle: any module that reassigns buy/sell
    // is wrapped again on the next pass.
  }
  arm();
  setTimeout(arm,100);
  setTimeout(arm,500);
  setTimeout(arm,1200);
  setInterval(arm,1500);
})();
