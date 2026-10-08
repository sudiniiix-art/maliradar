/* MaliRadar Monetization Gates v2 — tier-aware feature protection */
(()=>{"use strict";
const css=()=>{if(document.getElementById("mrProGateCss"))return;const s=document.createElement("style");s.id="mrProGateCss";s.textContent=
".mr-pro-locked{position:relative!important;overflow:hidden!important}.mr-pro-lock-layer{position:absolute;inset:0;z-index:8;display:flex;align-items:center;justify-content:center;padding:18px;background:linear-gradient(180deg,rgba(5,13,19,.35),rgba(5,12,18,.96) 55%);backdrop-filter:blur(3px)}"+
".mr-pro-lock-card{width:min(380px,94%);padding:18px;border-radius:18px;text-align:center;background:linear-gradient(145deg,#0c202b,#071219);border:1px solid rgba(185,95,255,.42);box-shadow:0 18px 55px rgba(0,0,0,.5),0 0 30px rgba(185,95,255,.1)}"+
".mr-pro-lock-icon{font-size:27px}.mr-pro-lock-title{font-size:18px;font-weight:950;margin-top:7px}.mr-pro-lock-copy{font-size:11px;color:var(--muted);line-height:1.5;margin-top:6px}.mr-pro-lock-card .btn{margin-top:11px}.mr-pro-mini{font-size:9px;letter-spacing:.7px;color:#d6a5ff;border:1px solid rgba(185,95,255,.4);border-radius:999px;padding:4px 7px;display:inline-block}";
document.head.appendChild(s)};
function required(target){return target?.dataset?.mrRequiredTier||"founder"}
function hasTier(t){const e=window.MaliRadarEntitlements;return e?.tier?((t==="premium"?e.isPremium?.():t==="founder"?e.isFounder?.():true)):true}
function lock(target,feature,tier){
 if(!target||hasTier(tier))return;
 if(target.dataset.mrProLocked==="1")return;
 target.dataset.mrProLocked="1";target.classList.add("mr-pro-locked");
 const label=window.MaliRadarEntitlements?.features?.[feature]?.label||"This advanced feature";
 const layer=document.createElement("div");layer.className="mr-pro-lock-layer";
 layer.innerHTML='<div class="mr-pro-lock-card"><span class="mr-pro-mini">'+(tier==="premium"?"MALIRADAR PREMIUM":"FOUNDER PRO")+'</span><div class="mr-pro-lock-icon">'+(tier==="premium"?"◆":"⚡")+'</div><div class="mr-pro-lock-title">'+label+'</div><div class="mr-pro-lock-copy">'+(tier==="premium"?"This is part of Premium. Founder Pro unlocks the advanced foundation; Premium goes further with maximum depth, personalization and specialist learning.":"Unlock this Founder Pro feature while keeping the core MaliRadar experience free.")+'</div><button type="button" class="btn" data-mr-pro-open>View Plans</button></div>';
 target.appendChild(layer);layer.querySelector("[data-mr-pro-open]").onclick=()=>window.MaliRadarEntitlements?.open?.(feature);
}
function unlock(){document.querySelectorAll(".mr-pro-locked").forEach(x=>{x.querySelector(".mr-pro-lock-layer")?.remove();x.classList.remove("mr-pro-locked");delete x.dataset.mrProLocked})}
function scan(){
 const e=window.MaliRadarEntitlements;if(!e)return;
 if(e.isPro?.())unlock();
 lock(document.getElementById("mrSa2x"),"advancedAssist","founder");
 document.querySelectorAll("[data-mr-feature]").forEach(x=>{
   const f=x.dataset.mrFeature,meta=e.features?.[f],tier=meta?.min||"founder";
   if(e.has?.(f)) {x.querySelector(".mr-pro-lock-layer")?.remove();x.classList.remove("mr-pro-locked");delete x.dataset.mrProLocked}
   else lock(x,f,tier);
 });
}
function boot(){css();scan();setInterval(scan,1500);document.addEventListener("click",e=>{if(e.target.closest(".tabs button"))setTimeout(scan,120)});window.addEventListener("maliRadar:quotesUpdated",()=>setTimeout(scan,80))}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
window.MaliRadarProGates={version:"2.0",refresh:scan,lock};
})();