/* MaliRadar Monetization v2 — tiered entitlements, upgrade UX, billing-safe */
(function(){
"use strict";
const KEY="maliradar_entitlements_v2";
const LEGACY="maliradar_entitlements_v1";
const VERSION=2;
const PRICING={currency:"KES",freeMonthly:0,founderMonthly:99,founderYearly:999,premiumMonthly:199,premiumYearly:1999,launchOfferEndsMonthsAfterLaunch:2,launchOfferMaxPaidSlots:100};
const TIERS={free:0,founder:1,premium:2};
const LAUNCH_OFFER={maxAvailable:100,endsMonthsAfterLaunch:2,launchAtKey:"maliradar_launch_started_at",soldKey:"maliradar_launch_paid_slots"};
function launchOffer(){
  const now=Date.now();
  let launch=Number(localStorage.getItem(LAUNCH_OFFER.launchAtKey)||0);
  if(!launch){launch=now;localStorage.setItem(LAUNCH_OFFER.launchAtKey,String(launch))}
  const end=new Date(launch);end.setMonth(end.getMonth()+LAUNCH_OFFER.endsMonthsAfterLaunch);
  const used=Math.min(LAUNCH_OFFER.maxAvailable,Math.max(0,Number(localStorage.getItem(LAUNCH_OFFER.soldKey)||0)));
  return {maxAvailable:LAUNCH_OFFER.maxAvailable,used,remaining:Math.max(0,LAUNCH_OFFER.maxAvailable-used),launchAt:launch,endsAt:end.getTime(),active:now<end.getTime()&&used<LAUNCH_OFFER.maxAvailable};
}
function launchOfferCopy(){
 const o=launchOffer();
 if(!o.active)return o.remaining===0?"Launch offer sold out":"Launch offer ended";
 const days=Math.max(0,Math.ceil((o.endsAt-Date.now())/86400000));
 return o.remaining+" of "+o.maxAvailable+" launch places remaining • ends in "+days+" day"+(days===1?"":"s");
}
const DEFAULT={version:VERSION,tier:"free",source:"none",verifiedAt:null,expiresAt:null,productId:null,plan:null};
const FEATURES={
 advancedAssist:{label:"Advanced Smart Assist",min:"founder"},
 marketScanner:{label:"Advanced Whole-Market Scanner",min:"founder"},
 alerts:{label:"Expanded Intelligent Alerts",min:"founder"},
 history:{label:"Extended Historical Analysis",min:"founder"},
 global:{label:"Expanded Global Markets",min:"founder"},
 competition:{label:"Advanced Competition Insights",min:"founder"},
 personal:{label:"Advanced Personal Intelligence",min:"premium"},
 signals:{label:"Premium Educational Signals",min:"premium"},
 forex:{label:"Forex Learning Sessions",min:"premium"},
 crypto:{label:"Crypto Learning Sessions",min:"premium"},
 maxScanner:{label:"Maximum Scanner Depth",min:"premium"},
 premiumProfile:{label:"Premium Profile Identity",min:"premium"}
};
function safeParse(v){try{return JSON.parse(v||"null")}catch(e){return null}}
function read(){
 let x=safeParse(localStorage.getItem(KEY));
 if(x&&x.version===VERSION)return {...DEFAULT,...x};
 const old=safeParse(localStorage.getItem(LEGACY));
 if(old){
   let tier=old.plan==="premium"?"premium":old.plan==="founder"?"founder":"free";
   if(old.source==="google_play"&&old.pro===true&&tier==="free")tier="founder";
   return {...DEFAULT,tier,source:old.source||"none",verifiedAt:old.verifiedAt||null,expiresAt:old.expiresAt||null,productId:old.productId||null,plan:old.plan||null};
 }
 return {...DEFAULT};
}
function validPaid(x){
 return (x.tier==="founder"||x.tier==="premium")&&x.source==="google_play"&&(!x.expiresAt||Date.parse(x.expiresAt)>Date.now());
}
function tier(){
 const x=read(); return validPaid(x)?x.tier:"free";
}
function isPro(){return tier()!=="free"}
function isFounder(){return tier()==="founder"||tier()==="premium"}
function isPremium(){return tier()==="premium"}
function has(feature){
 const f=FEATURES[feature]; if(!f)return false;
 return TIERS[tier()]>=TIERS[f.min];
}
function plan(){
 const x=read(),t=tier();
 return {...x,tier:t,pro:t!=="free",label:t==="premium"?"PREMIUM":t==="founder"?"FOUNDER PRO":"FREE"};
}
function save(x){localStorage.setItem(KEY,JSON.stringify({...DEFAULT,...x,version:VERSION}))}
function toast(msg,kind){
 let e=document.getElementById("mrProToast");
 if(!e){e=document.createElement("div");e.id="mrProToast";document.body.appendChild(e)}
 e.textContent=msg;e.dataset.kind=kind||"info";e.style.display="block";clearTimeout(e._t);e._t=setTimeout(()=>e.style.display="none",3200);
}
function open(feature){
 const m=document.getElementById("mrProModal");if(m)m.classList.add("show");
 if(feature)setTimeout(()=>{const n=document.getElementById("mrProFeatureNote");if(n)n.textContent=(FEATURES[feature]?.label||feature)+" requires "+tierName(FEATURES[feature]?.min||"founder")+" access.";},0);
}
function close(){document.getElementById("mrProModal")?.classList.remove("show")}
function tierName(t){return t==="premium"?"Premium":t==="founder"?"Founder Pro":"Free"}
function billingUnavailable(){toast("Google Play Billing is not connected yet. No purchase was made.","warn")}
function gate(feature,action){
 if(has(feature))return true;
 open(feature);
 if(typeof action==="function")window._mrProPendingAction=action;
 return false;
}
function css(){
 if(document.getElementById("mrProCss"))return;
 const s=document.createElement("style");s.id="mrProCss";s.textContent=
"#mrProModal{display:none;position:fixed;inset:0;z-index:10050;background:rgba(1,5,10,.86);backdrop-filter:blur(12px);align-items:flex-end;justify-content:center}"+
"#mrProModal.show{display:flex}#mrProSheet{width:min(490px,100%);max-height:94vh;overflow:auto;border:1px solid rgba(56,200,255,.25);border-radius:25px 25px 0 0;background:linear-gradient(145deg,#0b1c27,#071019);padding:16px;box-shadow:0 -20px 75px rgba(0,0,0,.6)}"+
".mrpro-orb{width:45px;height:45px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#fff,#38c8ff 22%,#173c53 62%,#071016);box-shadow:0 0 28px rgba(56,200,255,.35);font-weight:900}.mrpro-title{font-size:26px;font-weight:950;margin-top:10px}.mrpro-sub{font-size:11px;color:var(--muted);line-height:1.55;margin-top:5px}.mrpro-current{margin-top:12px;padding:9px 11px;border-radius:12px;background:#09151c;border:1px solid var(--line);font-size:11px}.mrpro-current b{color:var(--a)}.mrpro-plans{display:grid;grid-template-columns:1fr;gap:9px;margin-top:13px}.mrpro-plan{position:relative;border:1px solid var(--line);border-radius:17px;padding:13px;background:#09151c;overflow:hidden}.mrpro-plan.free-card{border-color:rgba(70,255,150,.52);box-shadow:0 0 24px rgba(70,255,150,.17),inset 0 0 20px rgba(70,255,150,.035)}.mrpro-plan.founder-card{border-color:rgba(185,95,255,.68);box-shadow:0 0 30px rgba(185,95,255,.25),inset 0 0 25px rgba(185,95,255,.05)}.mrpro-plan.premium-card{border-color:rgba(255,205,70,.72);box-shadow:0 0 34px rgba(255,205,70,.28),inset 0 0 27px rgba(255,205,70,.055)}.mrpro-plan.current{outline:1px solid rgba(255,255,255,.28)}.mrpro-plan h4{margin:0;font-size:15px}.mrpro-price{font-size:20px;font-weight:950;margin-top:7px}.mrpro-year{font-size:10px;color:var(--muted);margin-top:2px}.mrpro-features{font-size:10px;color:var(--muted);line-height:1.65;margin-top:9px}.mrpro-features b{color:var(--text)}.mrpro-badge{font-size:8px;letter-spacing:.8px;border:1px solid rgba(56,200,255,.3);color:#74dcff;border-radius:999px;padding:4px 7px}.mrpro-plan.free-card .mrpro-badge{color:#72ffb1;border-color:rgba(72,255,150,.4)}.mrpro-plan.founder-card .mrpro-badge{color:#d6a5ff;border-color:rgba(185,95,255,.5)}.mrpro-plan.premium-card .mrpro-badge{color:#ffe080;border-color:rgba(255,205,70,.55)}.mrpro-plan button{margin-top:10px;width:100%}.mrpro-feature-list{margin-top:12px}.mrpro-feature{display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:11px}.mrpro-feature .dot2{font-weight:900;color:var(--a)}.mrpro-feature.locked .dot2{color:#788b91}.mrpro-note{margin-top:11px;padding:10px;border-radius:11px;background:rgba(255,190,70,.055);border:1px solid rgba(255,190,70,.18);font-size:10px;line-height:1.5;color:#d8c99b}.mrpro-actions{display:flex;gap:8px;margin-top:12px}.mrpro-actions button{flex:1}.mrpro-gold{border-color:rgba(255,202,72,.75)!important;color:#ffe08a!important;background:rgba(255,202,72,.12)!important;box-shadow:0 0 18px rgba(255,202,72,.22)}"+
"#mrProToast{display:none;position:fixed;left:50%;bottom:78px;transform:translateX(-50%);z-index:10100;max-width:92%;padding:11px 14px;border-radius:12px;background:#0d2029;border:1px solid var(--line);box-shadow:0 10px 35px #0008;font-size:12px;font-weight:800}#mrProToast[data-kind=warn]{border-color:#665629;color:#ffe08a}"+
".mr-explore-pro-glow{position:relative!important;border:1px solid rgba(255,202,72,.75)!important;color:#ffe08a!important;background:linear-gradient(135deg,rgba(255,202,72,.16),rgba(255,174,0,.05))!important;box-shadow:0 0 8px rgba(255,202,72,.45),0 0 24px rgba(255,202,72,.24),inset 0 0 14px rgba(255,202,72,.08)!important;text-shadow:0 0 10px rgba(255,202,72,.55);animation:mrProGoldPulse 2.4s ease-in-out infinite}@keyframes mrProGoldPulse{0%,100%{box-shadow:0 0 8px rgba(255,202,72,.4),0 0 20px rgba(255,202,72,.2)}50%{box-shadow:0 0 12px rgba(255,202,72,.7),0 0 32px rgba(255,202,72,.36)}}";
 document.head.appendChild(s);
}
function modal(){
 if(document.getElementById("mrProModal"))return;
 const m=document.createElement("div");m.id="mrProModal";
 const t=plan().tier;
 const features=Object.entries(FEATURES);
 const card=(id,title,badge,price,year,body,cls)=>'<div class="mrpro-plan '+cls+(t===id?' current':'')+'"><div class="row"><h4>'+title+'</h4><span class="mrpro-badge">'+badge+'</span></div><div class="mrpro-price">'+price+'</div><div class="mrpro-year">'+year+'</div><div class="mrpro-features">'+body+'</div><button class="btn '+(id==="premium"?"mrpro-gold":"")+'" data-plan="'+id+'">'+(t===id?"Current plan":id==="free"?"Stay Free":"Choose "+title)+'</button></div>';
 m.innerHTML='<div id="mrProSheet"><div class="row"><div class="mrpro-orb">MR</div><button class="btn alt" id="mrProClose">✕</button></div>'+
 '<div class="mrpro-title">MALIRADAR PLANS</div><div class="mrpro-sub">Upgrade your tools, education and intelligence — never a promise of profit.</div>'+
 '<div class="mrpro-current">CURRENT PLAN: <b id="mrProCurrentTier">'+tierName(t).toUpperCase()+'</b></div>'+
 '<div class="mrpro-note" id="mrLaunchOffer"><b>LAUNCH OFFER • LIMITED TO 100 PAID PLACES</b><br>'+launchOfferCopy()+'</div><div class="mrpro-plans">'+
 card("free","FREE","CORE","KSh 0","Always free","Paper trading · Core academy · Basic intelligence · Basic alerts · Core competition","free-card")+
 card("founder","FOUNDER PRO","LAUNCH","KSh 99 / month","KSh 999 / year","Everything Free · Advanced Smart Assist · Advanced scanner · Expanded alerts · Extended analysis · Expanded global tools · Founder identity","founder-card")+
 card("premium","MALIRADAR PREMIUM","ULTIMATE","KSh 199 / month","KSh 1,999 / year","<b>LAUNCH OFFER: 100 TOTAL PAID PLACES</b> · Everything Founder Pro · Premium Smart Assist & educational signals · Maximum scanner depth · Advanced personal intelligence · Advanced competition · <b>Forex learning sessions</b> · <b>Crypto learning sessions</b> · Premium profile identity","premium-card")+
 '</div><div id="mrProFeatureNote" class="mrpro-note">Choose the level that matches how deeply you want to learn and simulate.</div>'+
 '<div class="mrpro-feature-list">'+features.map(([k,f])=>'<div class="mrpro-feature '+(has(k)?"":"locked")+'"><span class="dot2">'+(has(k)?"◆":"◇")+'</span><div><b>'+f.label+'</b><br><span class="muted">'+tierName(f.min)+' tier or above</span></div></div>').join("")+'</div>'+
 '<div class="mrpro-note">Billing is not connected in this release. No button here can fake a successful purchase. Once Google Play Billing is connected, verified subscription entitlements will control access. Google Play supports tier changes and billing-period changes for subscriptions.</div>'+
 '<div class="mrpro-actions"><button class="btn alt" id="mrProRestore">Restore purchases</button><button class="btn alt" id="mrProManage">Manage subscription</button></div></div>';
 document.body.appendChild(m);
 document.getElementById("mrProClose").onclick=close;
 m.addEventListener("click",e=>{if(e.target===m)close()});
 m.querySelectorAll("[data-plan]").forEach(b=>b.onclick=()=>{const wanted=b.dataset.plan;if(wanted==="free"){toast("Your Free plan is already available. Paid downgrades will be handled by Google Play Billing.","info");return}billingUnavailable()});
 document.getElementById("mrProRestore").onclick=billingUnavailable;
 document.getElementById("mrProManage").onclick=billingUnavailable;
}
function refresh(){
 const p=plan(),b=document.getElementById("mrProPlanBadge"),c=document.getElementById("mrProAccountCopy"),btn=document.getElementById("mrProOpen");
 if(b){b.textContent=p.label;b.classList.toggle("pro",p.pro);b.classList.toggle("premium",p.tier==="premium")}
 if(c)c.innerHTML=p.tier==="premium"?"Premium is active through a verified Google Play entitlement.":p.tier==="founder"?"Founder Pro is active through a verified Google Play entitlement.":"You are on Free. Core paper trading, learning and intelligence remain available.";
 if(btn)btn.textContent=p.pro?"View Plans":"Explore Plans";
}
function mountAccount(){
 const screen=document.getElementById("accountScreen");if(!screen||document.getElementById("mrProAccountCard"))return;
 const card=document.createElement("div");card.className="card";card.id="mrProAccountCard";
 card.innerHTML='<div class="row"><div><b>⚡ MaliRadar Plan</b><div class="muted">Your access level & subscription status</div></div><span id="mrProPlanBadge" class="mrpro-badge">FREE</span></div><div id="mrProAccountCopy" class="notice" style="margin-top:10px">You are on Free.</div><div class="actions"><button class="btn" id="mrProOpen">Explore Plans</button></div>';
 const first=Array.from(screen.children)[0];screen.insertBefore(card,first||null);
 document.getElementById("mrProOpen").onclick=open;
}
function highlight(){const apply=()=>document.querySelectorAll("#mrProOpen").forEach(b=>{b.classList.add("mr-explore-pro-glow")});apply();setTimeout(apply,500);setTimeout(apply,1200)}
function smartAdvertise(){
 if(document.getElementById("mrProAd")||isPro())return;
 const KEYAD="maliradar_pro_ad_v2";let st=safeParse(localStorage.getItem(KEYAD))||{};
 const sessions=Number(localStorage.getItem("maliradar_session_count")||0)+1;localStorage.setItem("maliradar_session_count",String(sessions));
 const meaningful=Number(localStorage.getItem("maliradar_meaningful_actions")||0);
 const started=Number(localStorage.getItem("maliradar_usage_started_at")||Date.now());localStorage.setItem("maliradar_usage_started_at",String(started));
 if(sessions<3||meaningful<4||(Date.now()-started)<90000)return;
 if(Number(st.shown||0)>=3||st.dismissedUntil&&Date.now()<st.dismissedUntil||st.lastShown&&Date.now()-st.lastShown<7*86400000)return;
 const ad=document.createElement("div");ad.id="mrProAd";ad.innerHTML='<div class="mr-pro-ad-card"><div class="mr-pro-ad-orb">MR</div><div class="mr-pro-ad-copy"><div class="mr-pro-ad-kicker">MALIRADAR PLANS</div><b>Your next level is ready.</b><span>Compare Free, Founder Pro and Premium when you are ready.</span></div><button class="mr-pro-ad-open">View</button><button class="mr-pro-ad-close">×</button></div>';
 if(!document.getElementById("mrProAdCss")){const s=document.createElement("style");s.id="mrProAdCss";s.textContent="#mrProAd{position:fixed;left:12px;right:12px;bottom:78px;z-index:10020}.mr-pro-ad-card{display:flex;align-items:center;gap:10px;padding:11px 12px;border:1px solid rgba(255,202,72,.55);border-radius:17px;background:linear-gradient(135deg,rgba(22,20,10,.97),rgba(10,16,20,.97));box-shadow:0 0 16px rgba(255,202,72,.22),0 12px 40px #0008;animation:mrAdIn .45s ease-out}.mr-pro-ad-orb{width:36px;height:36px;flex:0 0 36px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:950;color:#ffe08a;background:radial-gradient(circle at 35% 30%,#fff3b0,#ffca48 28%,#704b10 65%,#161006);box-shadow:0 0 18px rgba(255,202,72,.5)}.mr-pro-ad-copy{min-width:0;flex:1}.mr-pro-ad-kicker{font-size:8px;letter-spacing:1.2px;color:#ffd75a;font-weight:950}.mr-pro-ad-copy b{display:block;font-size:13px;margin:2px 0}.mr-pro-ad-copy span{display:block;font-size:10px;color:var(--muted);line-height:1.3}.mr-pro-ad-open{border:1px solid rgba(255,202,72,.6);background:rgba(255,202,72,.13);color:#ffe08a;border-radius:10px;padding:8px 10px;font-weight:900}.mr-pro-ad-close{border:0;background:transparent;color:var(--muted);font-size:20px;padding:3px}@keyframes mrAdIn{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}";document.head.appendChild(s)}
 document.body.appendChild(ad);const next={shown:Number(st.shown||0)+1,lastShown:Date.now()};localStorage.setItem(KEYAD,JSON.stringify(next));
 ad.querySelector(".mr-pro-ad-open").onclick=()=>{open();ad.remove()};ad.querySelector(".mr-pro-ad-close").onclick=()=>{localStorage.setItem(KEYAD,JSON.stringify({...next,dismissedUntil:Date.now()+14*86400000}));ad.remove()};
}
function track(){
 const inc=()=>{const n=Number(localStorage.getItem("maliradar_meaningful_actions")||0)+1;localStorage.setItem("maliradar_meaningful_actions",String(Math.min(99,n)));};
 document.addEventListener("click",e=>{if(e.target.closest("button,.stock,.card,[role=button]"))inc()},{passive:true});
 setTimeout(smartAdvertise,90000);setTimeout(smartAdvertise,180000);
}
function init(){
 css();modal();themeStyles();mountAccount();refresh();highlight();track();smartAdvertise();
 setTimeout(()=>{mountAccount();refresh();highlight()},900);
 document.addEventListener("click",e=>{if(e.target.closest("[data-mr-pro]"))open()});
 window.addEventListener("maliRadar:entitlementUpdated",()=>{refresh();if(window.MaliRadarProGates?.refresh)window.MaliRadarProGates.refresh()});
}
function themeStyles(){if(document.getElementById("mrPlanThemes"))return;const s=document.createElement("style");s.id="mrPlanThemes";s.textContent=".mrpro-badge.premium{color:#ffe080!important;border-color:rgba(255,205,70,.55)!important}.mr-plan-free{border-color:rgba(72,255,150,.48);box-shadow:0 0 24px rgba(72,255,150,.18)}.mr-plan-founder{border-color:rgba(185,95,255,.58);box-shadow:0 0 30px rgba(185,95,255,.25)}.mr-plan-premium{border-color:rgba(255,202,72,.62);box-shadow:0 0 34px rgba(255,202,72,.27)}";document.head.appendChild(s)}
window.MaliRadarEntitlements={version:VERSION,get:read,save,plan,tier,isPro,isFounder,isPremium,has,require:gate,requirePro:gate,open,close,features:FEATURES,pricing:PRICING,launchOffer,launchOfferCopy,refresh,showPlans:open};
init();
})();