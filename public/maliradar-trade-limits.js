/* MaliRadar Paper Trading Limits v1 — Free limits + Pro unlimited */
(()=>{"use strict";
const KEY="maliradar_trade_limits_v1";
const LIMITS={free:{maxTradesPerDay:5,maxSharesPerOrder:25,maxSharesPerSymbol:100},founder:{maxTradesPerDay:Infinity,maxSharesPerOrder:Infinity,maxSharesPerSymbol:Infinity},premium:{maxTradesPerDay:Infinity,maxSharesPerOrder:Infinity,maxSharesPerSymbol:Infinity}};
const localState=()=>{try{return JSON.parse(localStorage.getItem("maliradar_v07_state")||"{}")}catch(e){return{}}};
const tier=()=>window.MaliRadarEntitlements?.tier?.()||"free";
const limits=()=>LIMITS[tier()]||LIMITS.free;
const day=()=>new Date().toISOString().slice(0,10);
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return{}}}
function save(x){localStorage.setItem(KEY,JSON.stringify(x))}
function usage(){
 const x=load(),d=day();
 if(x.date!==d){x.date=d;x.trades=0}
 x.trades=Number(x.trades)||0;
 return x;
}
function localHold(sym){const s=localState();return Number(s.hold?.[sym]||0)}
function usedSharesToday(){return usage().trades}
function canTrade(sym,qty){
 qty=Math.floor(Number(qty)||0);const l=limits(),u=usage();
 if(qty<1)return{ok:false,message:"Enter at least 1 share."};
 if(Number.isFinite(l.maxSharesPerOrder)&&qty>l.maxSharesPerOrder)return{ok:false,message:"Free plan limit: maximum "+l.maxSharesPerOrder+" shares per order. Upgrade to Pro for unlimited share quantities."};
 if(Number.isFinite(l.maxTradesPerDay)&&u.trades>=l.maxTradesPerDay)return{ok:false,message:"You have used all "+l.maxTradesPerDay+" free paper trades for today. Upgrade to Pro for unlimited stock trades."};
 if(Number.isFinite(l.maxSharesPerSymbol)&&localHold(sym)+qty>l.maxSharesPerSymbol)return{ok:false,message:"Free plan limit: maximum "+l.maxSharesPerSymbol+" shares of "+sym+". Upgrade to Pro for unlimited stock buys."};
 return{ok:true}
}
function record(){if(tier()!=="free")return;const u=usage();u.trades++;save(u)}
function status(){
 const l=limits(),u=usage(),pro=tier()!=="free";
 return{tier:tier(),pro,tradesUsed:u.trades,tradesLimit:Number.isFinite(l.maxTradesPerDay)?l.maxTradesPerDay:null,tradesRemaining:Number.isFinite(l.maxTradesPerDay)?Math.max(0,l.maxTradesPerDay-u.trades):null,maxSharesPerOrder:Number.isFinite(l.maxSharesPerOrder)?l.maxSharesPerOrder:null,maxSharesPerSymbol:Number.isFinite(l.maxSharesPerSymbol)?l.maxSharesPerSymbol:null};
}
function toast(msg){let e=document.getElementById("mrTradeLimitToast");if(!e){e=document.createElement("div");e.id="mrTradeLimitToast";e.style.cssText="position:fixed;left:50%;bottom:82px;transform:translateX(-50%);z-index:20000;max-width:92%;padding:12px 14px;border-radius:13px;background:#0b1b24;border:1px solid #31515c;color:#e9f5f7;box-shadow:0 12px 40px #0009;font-size:12px;font-weight:800";document.body.appendChild(e)}e.textContent=msg;e.style.display="block";clearTimeout(e._t);e._t=setTimeout(()=>e.style.display="none",3500)}
function openUpgrade(reason){if(window.MaliRadarEntitlements?.open)window.MaliRadarEntitlements.open("advancedAssist");else alert(reason)}
function renderBadge(){
 let el=document.getElementById("mrTradeLimitStatus");if(!el){const target=document.querySelector("#markets .card")||document.querySelector("#markets");if(!target)return;el=document.createElement("div");el.id="mrTradeLimitStatus";el.className="card";el.style.cssText="margin-top:8px";target.parentNode.insertBefore(el,target)}
 const s=status();
 el.innerHTML=s.pro?'<div class="row"><div><b>⚡ PRO TRADING ACCESS</b><div class="muted">Unlimited stock buys, sells, quantities and paper trades.</div></div><span class="badge">UNLIMITED</span></div>':'<div class="row"><div><b>Paper Trading Limits</b><div class="muted">'+s.tradesRemaining+' of '+s.tradesLimit+' trades remaining today • max '+s.maxSharesPerOrder+' shares/order</div></div><button class="btn alt" id="mrTradeUpgrade">GO PRO</button></div><div class="muted" style="margin-top:7px">Free users can practice with limited paper trades. Pro removes the trade and quantity limits.</div>';
 el.querySelector("#mrTradeUpgrade")?.addEventListener("click",()=>openUpgrade("Unlimited trading requires Pro."));
}
function boot(){renderBadge();intercept();setTimeout(()=>{intercept();renderBadge()},700);setInterval(()=>{intercept();renderBadge()},1500)}
window.MaliRadarTradeLimits={version:1,limits:LIMITS,status,canTrade,record,refresh:renderBadge};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();