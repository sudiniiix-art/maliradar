/* MaliRadar Paper Trading Limits UI v4 — visible animated premium card */
(()=>{"use strict";
const STYLE_ID="mrTradeLimitGlowStyles";
function installStyle(){
  if(document.getElementById(STYLE_ID))return;
  const st=document.createElement("style");st.id=STYLE_ID;st.textContent=String.raw`
.mr-trade-limit-card{
  position:relative!important;
  overflow:hidden!important;
  isolation:isolate;
  animation:mrTradeLimitPulse 2.8s ease-in-out infinite!important;
  border:1px solid rgba(56,200,255,.42)!important;
  box-shadow:0 0 0 1px rgba(56,200,255,.24),0 0 22px rgba(56,200,255,.28),inset 0 0 24px rgba(255,255,255,.05)!important;
  will-change:box-shadow;
}
.mr-trade-limit-card::before{
  content:""!important;
  position:absolute!important;
  z-index:0!important;
  top:-70%!important;
  bottom:-70%!important;
  left:-70%!important;
  width:46%!important;
  background:linear-gradient(100deg,transparent 0%,rgba(255,255,255,.03) 28%,rgba(255,255,255,.82) 50%,rgba(130,220,255,.18) 62%,transparent 100%)!important;
  transform:skewX(-18deg) translateX(-220%)!important;
  animation:mrTradeLimitShine 3.4s ease-in-out infinite!important;
  pointer-events:none!important;
  display:block!important;
}
.mr-trade-limit-card::after{
  content:""!important;
  position:absolute!important;
  inset:0!important;
  z-index:0!important;
  border-radius:inherit!important;
  background:linear-gradient(115deg,transparent 0%,rgba(255,255,255,.025) 42%,rgba(255,255,255,.12) 50%,transparent 58%)!important;
  background-size:220% 100%!important;
  animation:mrTradeLimitSweep 5s linear infinite!important;
  pointer-events:none!important;
}
.mr-trade-limit-card>*{position:relative;z-index:1}
@keyframes mrTradeLimitShine{
  0%,12%{transform:skewX(-18deg) translateX(-220%)}
  55%,100%{transform:skewX(-18deg) translateX(520%)}
}
@keyframes mrTradeLimitSweep{
  0%{background-position:200% 0}
  100%{background-position:-20% 0}
}
@keyframes mrTradeLimitPulse{
  0%,100%{box-shadow:0 0 0 1px rgba(56,200,255,.24),0 0 20px rgba(56,200,255,.24),inset 0 0 22px rgba(255,255,255,.05)}
  50%{box-shadow:0 0 0 1px rgba(255,255,255,.9),0 0 42px rgba(56,200,255,.65),0 0 82px rgba(56,200,255,.2),inset 0 0 34px rgba(255,255,255,.12)}
}
@media(prefers-reduced-motion:reduce){
  .mr-trade-limit-card,.mr-trade-limit-card::before,.mr-trade-limit-card::after{animation:none!important}
  .mr-trade-limit-card{box-shadow:0 0 0 1px rgba(255,255,255,.75),0 0 34px rgba(56,200,255,.55),inset 0 0 28px rgba(255,255,255,.1)!important}
}`;
  document.head.appendChild(st);
}
const LIMITS={free:{maxTradesPerDay:5,maxSharesPerOrder:25,maxSharesPerSymbol:100},founder:{maxTradesPerDay:Infinity,maxSharesPerOrder:Infinity,maxSharesPerSymbol:Infinity},premium:{maxTradesPerDay:Infinity,maxSharesPerOrder:Infinity,maxSharesPerSymbol:Infinity}};
const read=()=>{try{return JSON.parse(localStorage.getItem("maliradar_v07_state")||"{}")}catch(e){return{}}};
const tier=()=>window.MaliRadarEntitlements?.tier?.()||"free";
const today=()=>new Date().toISOString().slice(0,10);
const tradesToday=()=>{const h=Array.isArray(read().history)?read().history:[];return h.filter(x=>{try{return x.executedAt?String(x.executedAt).slice(0,10)===today():x.time?new Date(x.time).toISOString().slice(0,10)===today():false}catch(e){return false}}).length};
function status(){const t=tier(),l=LIMITS[t]||LIMITS.free,u=tradesToday();return{tier:t,pro:t!=="free",tradesUsed:u,tradesLimit:Number.isFinite(l.maxTradesPerDay)?l.maxTradesPerDay:null,tradesRemaining:Number.isFinite(l.maxTradesPerDay)?Math.max(0,l.maxTradesPerDay-u):null,maxSharesPerOrder:Number.isFinite(l.maxSharesPerOrder)?l.maxSharesPerOrder:null,maxSharesPerSymbol:Number.isFinite(l.maxSharesPerSymbol)?l.maxSharesPerSymbol:null}}
function render(){
  installStyle();
  let el=document.getElementById("mrTradeLimitStatus");
  const target=document.querySelector("#markets .card")||document.querySelector("#markets");
  if(!target)return;
  if(!el){el=document.createElement("div");el.id="mrTradeLimitStatus";el.className="card mr-trade-limit-card";el.style.cssText="margin-top:8px;position:relative;overflow:hidden";target.insertBefore(el,target.firstChild)}
  const s=status();
  const html=s.pro
    ?'<div class="row"><div><b>⚡ PRO TRADING ACCESS</b><div class="muted">Unlimited stock buys, sells, quantities and paper trades.</div></div><span class="badge">UNLIMITED</span></div>'
    :'<div class="row"><div><b>Paper Trading Limits</b><div class="muted">'+s.tradesRemaining+' of '+s.tradesLimit+' trades remaining today • max '+s.maxSharesPerOrder+' shares/order</div></div><button class="btn alt" id="mrTradeUpgrade">GO PRO</button></div><div class="muted" style="margin-top:7px">Free: 5 stock trades/day, 25 shares/order, 100 shares held per stock. Pro removes these limits.</div>';
  const sig=s.tier+"|"+s.tradesUsed+"|"+s.tradesRemaining+"|"+s.maxSharesPerOrder;
  if(el.dataset.signature!==sig){el.innerHTML=html;el.dataset.signature=sig;el.querySelector("#mrTradeUpgrade")?.addEventListener("click",()=>window.MaliRadarEntitlements?.open?.("advancedAssist"))}
}
window.MaliRadarTradeLimits={version:4,limits:LIMITS,status,refresh:render};
function boot(){installStyle();render();setInterval(render,1200);window.addEventListener("maliRadar:entitlementUpdated",render)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();