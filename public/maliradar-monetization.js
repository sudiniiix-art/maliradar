/* MaliRadar Monetization Foundation v1 — entitlement-safe Pro architecture */
(function(){
"use strict";
const KEY="maliradar_entitlements_v1";
const VERSION=1;
const PRICING={currency:"KES",founderMonthly:99,founderYearly:999,premiumMonthly:299,premiumYearly:2999};
const DEFAULT={version:VERSION,tier:"free",pro:false,source:"none",verifiedAt:null,expiresAt:null};
const FEATURES={
 advancedAssist:"Advanced Smart Assist",
 marketScanner:"Advanced Whole-Market Scanner",
 alerts:"Expanded Intelligent Alerts",
 history:"Extended Historical Analysis",
 global:"Expanded Global Markets",
 competition:"Advanced Competition Insights"
};
function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||"null");if(x&&x.version===VERSION)return {...DEFAULT,...x};}catch(e){}return {...DEFAULT};}
function save(x){localStorage.setItem(KEY,JSON.stringify({...DEFAULT,...x,version:VERSION}));}
function isPro(){const x=read();return x.pro===true&&x.tier==="pro"&&x.source==="google_play"&&(!x.expiresAt||Date.parse(x.expiresAt)>Date.now());}
function plan(){const x=read();if(!isPro())return {...x,tier:"free",pro:false,label:"FREE"};return {...x,label:x.plan==="premium"?"PREMIUM":x.plan==="founder"?"FOUNDER PRO":"PRO"};}
function toast(msg,kind){let e=document.getElementById("mrProToast");if(!e){e=document.createElement("div");e.id="mrProToast";document.body.appendChild(e)}e.textContent=msg;e.dataset.kind=kind||"info";e.style.display="block";clearTimeout(e._t);e._t=setTimeout(()=>e.style.display="none",3000);}
function open(){const m=document.getElementById("mrProModal");if(m)m.classList.add("show");}
function close(){document.getElementById("mrProModal")?.classList.remove("show");}
function billingUnavailable(){toast("Google Play Billing is not connected yet. No purchase was made.","warn");}
function gate(feature,action){
 if(isPro())return true;
 const label=FEATURES[feature]||"This Pro feature";
 open();
 setTimeout(()=>{const b=document.getElementById("mrProFeatureNote");if(b)b.textContent=label+" is part of MaliRadar Pro.";},0);
 if(typeof action==="function")window._mrProPendingAction=action;
 return false;
}
function themeStyles(){if(document.getElementById("mrPlanThemes"))return;const s=document.createElement("style");s.id="mrPlanThemes";s.textContent=".mr-plan-card{position:relative;overflow:hidden;border-radius:18px;border:1px solid rgba(255,255,255,.1);padding:14px}.mr-plan-free{border-color:rgba(72,255,150,.48);box-shadow:0 0 24px rgba(72,255,150,.18),inset 0 0 25px rgba(72,255,150,.04)}.mr-plan-free .mr-plan-accent{color:#5cffaa;text-shadow:0 0 12px rgba(72,255,150,.7)}.mr-plan-founder{border-color:rgba(185,95,255,.58);box-shadow:0 0 30px rgba(185,95,255,.25),inset 0 0 30px rgba(185,95,255,.06)}.mr-plan-founder .mr-plan-accent{color:#d29aff;text-shadow:0 0 14px rgba(185,95,255,.8)}.mr-plan-premium{border-color:rgba(255,202,72,.62);box-shadow:0 0 34px rgba(255,202,72,.27),inset 0 0 32px rgba(255,202,72,.06)}.mr-plan-premium .mr-plan-accent{color:#ffd75a;text-shadow:0 0 15px rgba(255,202,72,.85)}";document.head.appendChild(s)}function css(){
 if(document.getElementById("mrProCss"))return;
 const s=document.createElement("style");s.id="mrProCss";s.textContent=
"#mrProModal{display:none;position:fixed;inset:0;z-index:10050;background:rgba(1,5,10,.82);backdrop-filter:blur(10px);align-items:flex-end;justify-content:center}"+
"#mrProModal.show{display:flex}#mrProSheet{width:min(480px,100%);max-height:91vh;overflow:auto;border:1px solid rgba(56,200,255,.28);border-radius:24px 24px 0 0;background:linear-gradient(145deg,#0b1c27,#071019);padding:18px;box-shadow:0 -20px 70px rgba(0,0,0,.55),0 0 45px rgba(56,200,255,.08)}"+
".mrpro-orb{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#fff,#38c8ff 22%,#173c53 62%,#071016 100%);box-shadow:0 0 28px rgba(56,200,255,.35);font-weight:900}.mrpro-title{font-size:27px;font-weight:950;margin-top:11px}.mrpro-sub{font-size:12px;color:var(--muted);line-height:1.55;margin-top:5px}.mrpro-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.mrpro-plan{border:1px solid var(--line);border-radius:15px;padding:12px;background:#09151c}.mrpro-plan.pro{border-color:rgba(56,200,255,.5);box-shadow:0 0 22px rgba(56,200,255,.06)}.mrpro-plan.free-card{border-color:rgba(70,255,150,.48);box-shadow:0 0 24px rgba(70,255,150,.18),inset 0 0 20px rgba(70,255,150,.035)}.mrpro-plan.founder-card{border-color:rgba(180,90,255,.62);box-shadow:0 0 28px rgba(180,90,255,.25),inset 0 0 24px rgba(180,90,255,.045)}.mrpro-plan.premium-card{border-color:rgba(255,205,70,.7);box-shadow:0 0 32px rgba(255,205,70,.28),inset 0 0 25px rgba(255,205,70,.055)}.mrpro-plan h4{margin:0 0 8px}.mrpro-plan div{font-size:11px;line-height:1.65;color:var(--muted)}.mrpro-list{margin-top:13px}.mrpro-feature{display:flex;gap:8px;align-items:flex-start;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:12px}.mrpro-feature b{font-size:11px}.mrpro-check{color:var(--a);font-weight:900}.mrpro-note{margin-top:12px;padding:10px;border-radius:11px;background:rgba(255,190,70,.06);border:1px solid rgba(255,190,70,.18);font-size:10px;line-height:1.5;color:#d8c99b}.mrpro-actions{display:flex;gap:8px;margin-top:14px}.mrpro-actions button{flex:1}.mrpro-badge{font-size:9px;letter-spacing:.8px;border:1px solid rgba(56,200,255,.3);color:#74dcff;border-radius:999px;padding:5px 8px}.mrpro-upgrade{border:1px solid rgba(56,200,255,.28);background:rgba(56,200,255,.07);color:inherit;border-radius:10px;padding:9px 11px;font-weight:900}.mrpro-upgrade.pro{color:var(--a);border-color:rgba(80,230,195,.3);background:rgba(80,230,195,.06)}#mrProToast{display:none;position:fixed;left:50%;bottom:78px;transform:translateX(-50%);z-index:10100;max-width:90%;padding:11px 14px;border-radius:12px;background:#0d2029;border:1px solid var(--line);box-shadow:0 10px 35px #0008;font-size:12px;font-weight:800}#mrProToast[data-kind=warn]{border-color:#665629;color:#ffe08a}";
 document.head.appendChild(s);
}
function modal(){
 if(document.getElementById("mrProModal"))return;
 const m=document.createElement("div");m.id="mrProModal";m.innerHTML=
'<div id="mrProSheet"><div class="row"><div class="mrpro-orb">MR</div><button class="btn alt" id="mrProClose">✕</button></div>'+
'<div class="mrpro-title">MALIRADAR PRO</div><div class="mrpro-sub">Go deeper without turning MaliRadar into a promise machine. Pro unlocks advanced tools, analysis depth and personalization — not guaranteed profits.</div>'+
'<div class="mrpro-grid"><div class="mrpro-plan free-card"><h4>FREE</h4><div>Core paper trading<br>Learning academy<br>Basic market intelligence<br>Basic alerts<br>Competition & profile</div></div><div class="mrpro-plan founder-card"><div class="row"><h4 style="margin:0">FOUNDER PRO</h4><span class="mrpro-badge">LAUNCH</span></div><div>Advanced Smart Assist<br>Advanced market scanner<br>Expanded alerts<br>Extended analysis<br>Expanded global tools</div><div style="margin-top:9px;font-size:14px;font-weight:950;color:var(--a)">KSh 99 / month</div><div style="font-size:10px;color:var(--muted)">Founder pricing · KSh 999 / year</div></div></div><div class="mrpro-plan premium-card" style="margin-top:8px"><div class="row"><h4 style="margin:0">MALIRADAR PREMIUM</h4><span class="mrpro-badge">ULTIMATE</span></div><div>Everything in Founder Pro<br>Premium Smart Assist & educational signals<br>Maximum scanner depth<br>Advanced personal intelligence<br>Expanded competition insights</div><div style="margin-top:9px;font-size:16px;font-weight:950;color:var(--a)">KSh 299 / month</div><div style="font-size:10px;color:var(--muted)">or KSh 2,999 / year</div></div><div id="mrProFeatureNote" class="mrpro-note">Pro is designed around better tools and education, never guaranteed returns.</div>'+
'<div class="mrpro-list">'+Object.values(FEATURES).map(x=>'<div class="mrpro-feature"><span class="mrpro-check">◆</span><div><b>'+x+'</b><br><span class="muted">Available in the Pro architecture.</span></div></div>').join("")+'</div>'+
'<div class="mrpro-note">Billing is not connected in this release. The app will never show a fake purchase success. When Google Play Billing is connected, verified entitlements will activate Pro automatically.</div>'+
'<div class="mrpro-actions"><button class="btn" id="mrProChoose">Choose Pro</button><button class="btn alt" id="mrProRestore">Restore purchases</button></div></div>';
 document.body.appendChild(m);
 document.getElementById("mrProClose").onclick=close;
 m.addEventListener("click",e=>{if(e.target===m)close()});
 document.getElementById("mrProChoose").onclick=billingUnavailable;
 document.getElementById("mrProRestore").onclick=billingUnavailable;
}
function mountAccount(){
 const screen=document.getElementById("accountScreen");if(!screen||document.getElementById("mrProAccountCard"))return;
 const card=document.createElement("div");card.className="card";card.id="mrProAccountCard";
 card.innerHTML='<div class="row"><div><b>⚡ MaliRadar Plan</b><div class="muted">Your access level & Pro status</div></div><span id="mrProPlanBadge" class="mrpro-badge">FREE</span></div><div id="mrProAccountCopy" class="notice" style="margin-top:10px">You are using the full core MaliRadar experience. Upgrade later for advanced tools.</div><div class="actions"><button class="btn" id="mrProOpen">Explore Pro</button></div>';
 const first=Array.from(screen.children)[0];screen.insertBefore(card,first||null);
 document.getElementById("mrProOpen").onclick=open;
}
function refresh(){const p=plan(),b=document.getElementById("mrProPlanBadge"),c=document.getElementById("mrProAccountCopy"),btn=document.getElementById("mrProOpen");if(b){b.textContent=p.label;b.classList.toggle("pro",p.pro)}if(c)c.textContent=p.pro?"MaliRadar Pro is active through a verified Google Play entitlement.":"You are on the free plan. Core paper trading, learning and intelligence remain available.";if(btn)btn.textContent=p.pro?"View Pro":"Explore Pro";}
function init(){themeStyles();css();modal();const kick=()=>{mountAccount();refresh()};if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",kick,{once:true});else kick();setTimeout(kick,1000);document.addEventListener("click",e=>{if(e.target.closest("[data-mr-pro]"))open();});}
window.MaliRadarEntitlements={version:VERSION,get:read,plan,isPro,open,close,requirePro:gate,features:FEATURES,pricing:PRICING,refresh};
init();
})();