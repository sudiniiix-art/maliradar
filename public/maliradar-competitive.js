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
   const trades=Array.isArray(s.history)?s.history.length:0;
   const guided=!!localStorage.getItem("maliradar_guided_academy_completed");
   const started=!!ac.started;
   const step=Math.max(0,Number(ac.step)||0);
   const missions=started?Math.min(5,step+1):0;
   const xp=(guided?100:0)+(started?50:0)+(missions*50)+(trades>0?50:0)+(trades>=5?100:0)+(trades>=10?150:0);
   const achievements=(guided?1:0)+(started?1:0)+(missions>=5?1:0)+(trades>0?1:0)+(trades>=5?1:0)+(trades>=10?1:0);
   const region=(document.getElementById("regionSelect")?.value||"global").toLowerCase();
   const name=document.getElementById("profileUsername")?.value||a.name||"MaliRadar User";
   return {id:a.id,name,region,xp,profit,ret,trades,achievements};
 }
 async function sync(){
   const p=profile(); if(!p.id)return;
   try{await fetch("/api/competitive/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});}catch(e){}
 }
 async function load(metric,scope){
   try{const a=account(); const extra=scope==="friends"&&a?.id?"&id="+encodeURIComponent(a.id):"";
   const r=await fetch("/api/competitive/leaderboard?metric="+encodeURIComponent(metric)+"&scope="+encodeURIComponent(scope)+extra);if(!r.ok)throw 0;return await r.json();}catch(e){return null}
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
     const box=document.getElementById("lbRows"); if(!box)return;
     const me=account();
     const val=x=>metric==="xp"?Number(x.xp||0).toLocaleString()+" XP":metric==="profit"?"KSh "+Number(x.profit||0).toLocaleString():metric==="return"?Number(x.ret||0).toFixed(2)+"%":Number(x.trades||0)+" trades";
     const podium=document.getElementById("lbPodium");
     if(podium)podium.innerHTML=data.participants.slice(0,3).map((x,i)=>'<div class="lb-podium-card '+(x.id===me?.id?'you':'')+'"><div class="lb-podium-rank">'+["🥇","🥈","🥉"][i]+'</div><div class="lb-podium-name">'+String(x.name||"?").replace(/[<>]/g,"")+'</div><div class="lb-podium-value">'+val(x)+'</div></div>').join("");
     const count=document.getElementById("lbCount"); if(count)count.textContent=data.participants.length+" server participants";
     const best=data.participants[0], worst=data.participants[data.participants.length-1];
     const bestEl=document.getElementById("lbBest"), worstEl=document.getElementById("lbWorst");
     if(bestEl)bestEl.textContent=best?String(best.name||"?")+" • "+val(best):"—";
     if(worstEl)worstEl.textContent=worst?String(worst.name||"?")+" • "+val(worst):"—";
     box.innerHTML=data.participants.map((x,i)=>'<div class="lb-row" style="'+(x.id===me?.id?'border:1px solid rgba(80,220,190,.45);border-radius:12px;padding:11px;margin:5px 0':'')+'"><div class="lb-rank">#'+(i+1)+'</div><div class="lb-avatar">'+String(x.name||"?")[0]+'</div><div class="lb-name"><b>'+String(x.name||"MaliRadar User").replace(/[<>]/g,"")+(x.id===me?.id?' • YOU':'')+'</b><div class="muted">Server profile'+(x.region==="kenya"?' • 🇰🇪':'')+'</div></div><div class="lb-stat"><b>'+val(x)+'</b><div class="muted">'+Number(x.trades||0)+' total trades</div></div></div>').join("")||'<div class="lb-note">No server profiles yet.</div>';
     const mine=data.participants.findIndex(x=>x.id===me?.id);
     const pos=document.getElementById("myPosition");if(pos)pos.textContent=mine>=0?"#"+(mine+1):"#—";
     const stat=document.getElementById("myStat");if(stat)stat.textContent=mine>=0?"Your server-ranked position is based on your saved paper-trading/learning statistics.":"Sync your profile to enter the server ranking.";
     mark();
     const card=document.querySelector("#leaderboardView .lb-card");
     if(card){let demo=card.querySelector(".mr-competitive-demo-note");if(!demo){demo=document.createElement("div");demo.className="lb-note mr-competitive-demo-note";demo.style.marginTop="8px";card.appendChild(demo)}demo.textContent="Demo participants are not mixed into the server ranking. Your position above uses server-recorded MaliRadar profiles only.";}
   };
   // Remove the old demo click handlers. They call the original lexical renderer
   // directly, which could overwrite the server ranking after a tap.
   const oldTabs=document.querySelectorAll("#lbMetricTabs button,#lbScopeTabs button");
   oldTabs.forEach(b=>{
     const fresh=b.cloneNode(true);
     b.replaceWith(fresh);
   });
   const tabs=document.querySelectorAll("#lbMetricTabs button,#lbScopeTabs button");
   tabs.forEach(b=>b.addEventListener("click",()=>{
     const group=b.closest("#lbMetricTabs,#lbScopeTabs");
     if(group)group.querySelectorAll("button").forEach(x=>x.classList.remove("active"));
     b.classList.add("active");
     window.renderLeaderboards();
   }));
 }
 function ensureFriendsCard(){
   const root=document.getElementById("leaderboardView"); if(!root)return null;
   let card=document.getElementById("mrFriendsCard");
   if(card)return card;
   card=document.createElement("div"); card.id="mrFriendsCard"; card.className="lb-card"; card.style.marginTop="14px";
   card.innerHTML='<div class="row"><strong>👥 Friends Network</strong><span class="badge">BETA</span></div>'+
     '<div class="muted" style="margin-top:6px">Add another MaliRadar user by their MaliRadar ID. Friends appear in the Friends leaderboard.</div>'+
     '<div class="actions" style="margin-top:10px"><input id="mrFriendSearch" class="input" placeholder="Enter MaliRadar ID or username" style="flex:1"><button class="btn" id="mrFriendFind">Find</button></div>'+
     '<div id="mrFriendResults" style="margin-top:8px"></div>'+
     '<div class="lb-note" style="margin-top:8px">Paper profiles only. No real-money or private financial information is shared.</div>';
   const challengeCard=root.querySelector("#lbChallengeTitle")?.closest(".lb-card");
   if(challengeCard&&challengeCard.parentElement)challengeCard.parentElement.insertBefore(card,challengeCard);
   else root.appendChild(card);
   card.querySelector("#mrFriendFind").onclick=async()=>{
     const q=card.querySelector("#mrFriendSearch").value.trim();
     const out=card.querySelector("#mrFriendResults");
     if(q.length<2){out.textContent="Enter at least 2 characters.";return;}
     out.textContent="Searching…";
     try{
       const r=await fetch("/api/competitive/profile/search?q="+encodeURIComponent(q),{cache:"no-store"});
       const d=await r.json(), me=account();
       out.innerHTML=(d.profiles||[]).filter(p=>p.id!==me?.id).map(p=>'<div class="lb-row" style="margin-top:6px"><div class="lb-avatar">'+String(p.name||"?")[0]+'</div><div class="lb-name"><b>'+String(p.name||"User").replace(/[<>]/g,"")+'</b><div class="muted">'+p.id+(p.region==="kenya"?" • 🇰🇪":"")+'</div></div><button class="btn alt" data-friend="'+p.id+'">Add</button></div>').join("")||'<div class="lb-note">No matching users.</div>';
       out.querySelectorAll("[data-friend]").forEach(b=>b.onclick=async()=>{
         b.disabled=true;b.textContent="Adding…";
         try{
           const rr=await fetch("/api/competitive/friends/add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:me.id,friendId:b.dataset.friend})});
           if(!rr.ok)throw 0;
           b.textContent="✓ Added";
           if(document.querySelector("#lbScopeTabs button[data-scope='friends']")?.classList.contains("active"))window.renderLeaderboards();
         }catch(e){b.disabled=false;b.textContent="Add";}
       });
     }catch(e){out.textContent="Could not search right now.";}
   };
   return card;
 }
 async function challenge(){
   const me=account(); if(!me?.id)return;
   try{
     const cr=await fetch("/api/competitive/challenges",{cache:"no-store"});
     const cd=await cr.json(); const x=cd.challenges?.[0]; if(!x)return;
     const card=document.querySelector("#leaderboardView .lb-grid .lb-card:last-child"); if(!card)return;
     const title=card.querySelector("#lbChallengeTitle"); if(title)title.textContent=x.title;
     const grid=card.querySelector(".grid");
     if(grid){
       const cells=grid.querySelectorAll(".metric");
       if(cells[0])cells[0].querySelector("b").textContent="KSh "+Number(x.startingCapital).toLocaleString();
       if(cells[1])cells[1].querySelector("b").textContent=x.mode;
       if(cells[2])cells[2].querySelector("b").textContent="Return %";
       if(cells[3])cells[3].querySelector("b").textContent=x.status;
     }
     let actions=card.querySelector(".mr-challenge-actions");
     if(!actions){
       actions=document.createElement("div"); actions.className="actions mr-challenge-actions"; actions.style.marginTop="10px";
       card.appendChild(actions);
     }
     actions.innerHTML="";
     if(x.status==="ACTIVE"){
       const b=document.createElement("button"); b.className="btn"; b.textContent=x.joined?"✓ Joined":"Join Challenge";
       b.disabled=!!x.joined;
       if(!x.joined)b.onclick=async()=>{
         b.disabled=true; b.textContent="Joining…";
         try{
           const r=await fetch("/api/competitive/challenges/"+encodeURIComponent(x.id)+"/join",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:me.id})});
           if(!r.ok)throw 0;
           b.textContent="✓ Joined";
           challenge();
         }catch(e){b.disabled=false;b.textContent="Join Challenge";}
       };
       actions.appendChild(b);
     }else{
       const s=document.createElement("span");s.className="badge";s.textContent=x.status;actions.appendChild(s);
     }
     let board=card.querySelector(".mr-challenge-board");
     if(!board){board=document.createElement("div");board.className="lb-note mr-challenge-board";board.style.marginTop="10px";card.appendChild(board);}
     const lr=await fetch("/api/competitive/challenges/"+encodeURIComponent(x.id)+"/leaderboard",{cache:"no-store"});
     const ld=await lr.json();
     const rows=Array.isArray(ld.participants)?ld.participants:[];
     const mine=rows.findIndex(r=>r.id===me.id);
     board.innerHTML=x.joined
       ? "🏆 Challenge position: <b>"+(mine>=0?"#"+(mine+1):"—")+"</b> • "+rows.length+" joined<br><span class=\"muted\">Performance is measured from the moment you joined, not from your earlier paper-trading history.</span>"
       : "Join the challenge to enter its separate paper-performance ranking.";
   }catch(e){}
 }
 window.MaliRadarCompetitive={version:"1.0",sync,load};
 setTimeout(()=>{sync();upgradeRender();setTimeout(()=>{ensureFriendsCard();challenge()},1800)},1200);
 setInterval(ensureFriendsCard,30000);
 setInterval(challenge,30000);
 setInterval(sync,30000);
})();