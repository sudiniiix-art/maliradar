/* MaliRadar Monetization Gate v1 — first real Pro feature gate */
(()=>{"use strict";
const css=()=>{if(document.getElementById("mrProGateCss"))return;const s=document.createElement("style");s.id="mrProGateCss";s.textContent=
".mr-pro-locked{position:relative;overflow:hidden}.mr-pro-lock-layer{position:absolute;inset:0;z-index:8;display:flex;align-items:center;justify-content:center;padding:18px;background:linear-gradient(180deg,rgba(5,13,19,.35),rgba(5,12,18,.96) 55%);backdrop-filter:blur(3px)}"+
".mr-pro-lock-card{width:min(370px,94%);padding:18px;border-radius:18px;text-align:center;background:linear-gradient(145deg,#0c202b,#071219);border:1px solid rgba(56,200,255,.34);box-shadow:0 18px 55px rgba(0,0,0,.5),0 0 30px rgba(56,200,255,.07)}"+
".mr-pro-lock-icon{font-size:27px}.mr-pro-lock-title{font-size:18px;font-weight:950;margin-top:7px}.mr-pro-lock-copy{font-size:11px;color:var(--muted);line-height:1.5;margin-top:6px}.mr-pro-lock-card .btn{margin-top:11px}.mr-pro-mini{font-size:9px;letter-spacing:.7px;color:#74dcff;border:1px solid rgba(56,200,255,.3);border-radius:999px;padding:4px 7px;display:inline-block}";
document.head.appendChild(s)};
function lock(target){
 if(!target||window.MaliRadarEntitlements?.isPro?.())return;
 if(target.dataset.mrProLocked==="1")return;
 target.dataset.mrProLocked="1";target.classList.add("mr-pro-locked");
 const layer=document.createElement("div");layer.className="mr-pro-lock-layer";
 layer.innerHTML='<div class="mr-pro-lock-card"><span class="mr-pro-mini">MALIRADAR PRO</span><div class="mr-pro-lock-icon">⚡</div><div class="mr-pro-lock-title">Advanced Smart Assist</div><div class="mr-pro-lock-copy">Unlock the deeper evidence cockpit, advanced signal tracking and expanded Assist analysis. Basic Smart Assist remains available on the free plan.</div><button type="button" class="btn" data-mr-pro-open>Explore Pro</button></div>';
 target.appendChild(layer);layer.querySelector("[data-mr-pro-open]").onclick=()=>window.MaliRadarEntitlements?.open?.();
}
function unlock(){document.querySelectorAll(".mr-pro-locked").forEach(x=>{x.querySelector(".mr-pro-lock-layer")?.remove();x.classList.remove("mr-pro-locked");delete x.dataset.mrProLocked})}
function scan(){
 if(window.MaliRadarEntitlements?.isPro?.()){unlock();return}
 lock(document.getElementById("mrSa2x"));
}
function boot(){css();scan();setInterval(scan,1200);document.addEventListener("click",e=>{if(e.target.closest(".tabs button"))setTimeout(scan,120)});window.addEventListener("maliRadar:quotesUpdated",()=>setTimeout(scan,80))}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
window.MaliRadarProGates={version:"1.0",refresh:scan};
})();