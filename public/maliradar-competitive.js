/* MaliRadar Competitive Profiles v1 — server-backed demo leaderboard */
(function(){
 "use strict";
 const ACCOUNT_KEY="maliradar_account_v1";
 function account(){try{return JSON.parse(localStorage.getItem(ACCOUNT_KEY)||"null")}catch(e){return null}}
 function state(){try{return JSON.parse(localStorage.getItem("maliradar_v07_state")||"{}")}catch(e){return {}}}
 function academy(){try{return JSON.parse(localStorage.getItem("maliradar_academy_v1")||"{}")}catch(e){return {}}}
 function profile(){
   const a=account()||{id:"",name:"MaliRadar User"};
   const s=state(), ac=academy();
   const cash=Number(s.cash||100000), hold=s.hold||{}, q=window.maliRadarProviderQuotes||{};
   let value=cash;
   Object.keys(hold).forEach(sym=>{const p=Number(q[String(sym).toUpperCase()]?.price);if(Number.isFinite(p))value+=Number(hold[sym]||0)*p});
   const profit=value-100000, ret=profit/100000*100;
   const history=Array.isArray(s.history)?s.history:[];
   const xp=(Number(ac.xp)||0)+ (localStorage.getItem("maliradar_guided_academy_completed")?"100":0);
   const achievements=document.querySelectorAll("#mr53LearningProfile .badge").length||0;
   const region=(document.getElementById("regionSelect")?.value||"global").toLowerCase();
   const name=document.getElementById("profileUsername")?.value||a.name||"MaliRadar User";
   return {id:a.id,name,region,xp,profit,ret,trades:history.length,achievements};
 }
 async function sync(){
   const p=profile(); if(!p.id)return;
   try{await fetch("/api/competitive/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});}catch(e){}
 }
 async function load(metric,scope){
   try{const r=await fetch("/api/competitive/leaderboard?metric="+encodeURIComponent(metric)+"&scope="+encodeURIComponent(scope));if(!r.ok)throw 0;return await r.json();}catch(e){return null}
 }
 function mark(){
   const n=document.querySelector(".lb-note");
   if(n)n.textContent="🟢 Competitive beta: server-recorded MaliRadar profiles are ranked separately from demo participants. Paper trading only.";
   const c=document.getElementById("lbCount");
   if(c)c.dataset.cloud="1";
 }
 async function upgradeRender(){
   if(typeof window.renderLeaderboards!=="function")return;
   const original=window.renderLeaderboards;
   window.renderLeaderboards=async function(){
     await sync();
     const metric=document.querySelector("#lbMetricTabs button.active")?.dataset.metric||"xp";
     const scope=document.querySelector("#lbScopeTabs button.active")?.dataset.scope||"global";
     const data=await load(metric,scope);
     if(!data||!Array.isArray(data.participants)){original();return}
     original();
     const box=document.getElementById("lbRows"); if(!box)return;
     const me=account();
     const val=x=>metric==="xp"?Number(x.xp||0).toLocaleString()+" XP":metric==="profit"?"KSh "+Number(x.profit||0).toLocaleString():metric==="return"?Number(x.ret||0).toFixed(2)+"%":Number(x.trades||0)+" trades";
     box.innerHTML=data.participants.map((x,i)=>'<div class="lb-row" style="'+(x.id===me?.id?'border:1px solid rgba(80,220,190,.45);border-radius:12px;padding:11px;margin:5px 0':'')+'"><div class="lb-rank">#'+(i+1)+'</div><div class="lb-avatar">'+String(x.name||"?")[0]+'</div><div class="lb-name"><b>'+String(x.name||"MaliRadar User").replace(/[<>]/g,"")+(x.id===me?.id?' • YOU':'')+'</b><div class="muted">Server profile'+(x.region==="kenya"?' • 🇰🇪':'')+'</div></div><div class="lb-stat"><b>'+val(x)+'</b><div class="muted">'+Number(x.trades||0)+' total trades</div></div></div>').join("")||'<div class="lb-note">No server profiles yet.</div>';
     const mine=data.participants.findIndex(x=>x.id===me?.id);
     const pos=document.getElementById("myPosition");if(pos)pos.textContent=mine>=0?"#"+(mine+1):"#—";
     const stat=document.getElementById("myStat");if(stat)stat.textContent=mine>=0?"Your server-ranked position is based on your saved paper-trading/learning statistics.":"Sync your profile to enter the server ranking.";
     mark();
   };
   const tabs=document.querySelectorAll("#lbMetricTabs button,#lbScopeTabs button");
   tabs.forEach(b=>b.addEventListener("click",()=>setTimeout(()=>window.renderLeaderboards(),250)));
 }
 window.MaliRadarCompetitive={version:"1.0",sync,load};
 setTimeout(()=>{sync();upgradeRender()},1200);
 setInterval(sync,30000);
})();