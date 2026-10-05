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
 function challengeReward(rank){return rank===1?50000:rank===2?25000:rank===3?15000:rank<=10?5000:1000}
 function challengeBadge(rank){return rank===1?["CHAMPION","🏆"]:rank===2?["ELITE RUNNER-UP","🥈"]:rank===3?["TOP 3","🥉"]:rank<=10?["TOP 10","✦"]:["CHALLENGER","◆"]}
 function showChallengeCeremony(rank,name){
   let o=document.getElementById("mrChallengeCeremony");if(o)o.remove();
   const reward=challengeReward(rank),badge=challengeBadge(rank);
   o=document.createElement("div");o.id="mrChallengeCeremony";o.className="mr-ceremony";
   o.innerHTML='<div class="mr-ceremony-backdrop"></div><div class="mr-ceremony-panel"><button class="mr-ceremony-close">×</button><div class="mr-ceremony-kicker">CHALLENGE RESULT</div><div class="mr-ceremony-title">FINAL POSITION</div><div class="mr-ceremony-position">#'+rank+'</div><div class="mr-ceremony-name">'+String(name||"Challenger").replace(/[<>]/g,"")+'</div><div class="mr-3d-badge"><div class="mr-badge-ring"><div class="mr-badge-core"><span>'+badge[1]+'</span><b>'+badge[0]+'</b></div></div></div><div class="mr-ceremony-earned">VIRTUAL CASH PRIZE</div><div class="mr-ceremony-cash">KSh '+reward.toLocaleString("en-KE")+'</div><div class="mr-ceremony-note">Simulation credits only • no cash value • no withdrawal</div></div>';
   document.body.appendChild(o);o.querySelector(".mr-ceremony-close").onclick=()=>o.remove();setTimeout(()=>o.classList.add("show"),40);setTimeout(()=>o.classList.add("badge-pop"),900);setTimeout(()=>o.classList.add("cash-pop"),1800);
 } async function challenge(){
   const me=account(); if(!me?.id)return;
   if(!document.getElementById("mr-challenge-ceremony-css")){const st=document.createElement("style");st.id="mr-challenge-ceremony-css";st.textContent=".mr-ceremony{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .35s;font-family:inherit}.mr-ceremony.show{opacity:1;pointer-events:auto}.mr-ceremony-backdrop{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,rgba(55,190,255,.22),rgba(3,7,18,.96) 55%);backdrop-filter:blur(8px)}.mr-ceremony-panel{position:relative;width:min(90vw,390px);padding:26px 20px 24px;text-align:center;border:1px solid rgba(100,210,255,.35);border-radius:28px;background:linear-gradient(145deg,rgba(18,29,51,.98),rgba(5,10,22,.98));box-shadow:0 0 55px rgba(0,190,255,.2),inset 0 0 35px rgba(100,200,255,.05);overflow:hidden;transform:translateY(24px) scale(.92);transition:transform .5s}.mr-ceremony.show .mr-ceremony-panel{transform:translateY(0) scale(1)}.mr-ceremony-close{position:absolute;right:12px;top:8px;background:none;border:0;color:#9eb0c8;font-size:28px}.mr-ceremony-kicker{font-size:10px;letter-spacing:3px;color:#67d7ff;font-weight:800}.mr-ceremony-title{margin-top:6px;font-size:15px;font-weight:800;letter-spacing:2px}.mr-ceremony-position{font-size:64px;line-height:1;font-weight:950;margin:10px 0 0;text-shadow:0 0 25px rgba(70,210,255,.55)}.mr-ceremony-name{font-size:14px;color:#9fb0c5;margin-top:5px}.mr-3d-badge{height:165px;display:flex;align-items:center;justify-content:center;perspective:700px}.mr-badge-ring{width:125px;height:125px;border-radius:50%;padding:8px;background:conic-gradient(#6be7ff,#8b5cff,#ffd35a,#6be7ff);box-shadow:0 0 30px rgba(90,210,255,.38);transform:rotateX(16deg) rotateY(-12deg);animation:mrBadgeSpin 4s ease-in-out infinite}.mr-badge-core{width:100%;height:100%;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 25%,#334a68,#09101f 62%);border:2px solid rgba(255,255,255,.22);box-shadow:inset 0 0 22px rgba(100,220,255,.25),8px 12px 20px rgba(0,0,0,.45);transform:translateZ(22px)}.mr-badge-core span{font-size:42px;filter:drop-shadow(0 5px 5px #000)}.mr-badge-core b{font-size:9px;letter-spacing:1.3px;margin-top:5px}.mr-ceremony-earned{font-size:10px;letter-spacing:2px;color:#91a4bb;font-weight:800}.mr-ceremony-cash{font-size:36px;font-weight:950;margin-top:4px;color:#71f5b0;text-shadow:0 0 22px rgba(70,255,160,.35);transform:scale(.75);opacity:0;transition:.55s}.mr-ceremony.cash-pop .mr-ceremony-cash{transform:scale(1);opacity:1}.mr-ceremony-note{font-size:10px;color:#75859a;margin-top:8px}@keyframes mrBadgeSpin{0%,100%{transform:rotateX(16deg) rotateY(-12deg) scale(.92)}50%{transform:rotateX(16deg) rotateY(12deg) scale(1.05)}}.mr-ceremony.badge-pop .mr-badge-ring{animation:mrBadgeBurst .9s ease-out}@keyframes mrBadgeBurst{0%{transform:rotateX(16deg) rotateY(-12deg) scale(.7);filter:brightness(1)}60%{transform:rotateX(16deg) rotateY(8deg) scale(1.15);filter:brightness(1.8)}100%{transform:rotateX(16deg) rotateY(0) scale(1);filter:brightness(1)}}";document.head.appendChild(st);}
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
     if(x.status==="ENDED" && x.joined && !sessionStorage.getItem("mr_challenge_ceremony_"+x.id)){const meRow=rows.find(r=>r.id===me.id);const finalRank=meRow?rows.findIndex(r=>r.id===me.id)+1:0;if(finalRank){sessionStorage.setItem("mr_challenge_ceremony_"+x.id,"1");showChallengeCeremony(finalRank,meRow.name);}}
     if(x.joined){
       const meRow=mine>=0?rows[mine]:null;
       const tier=mine===0?"🥇 CHAMPION":mine===1?"🥈 RUNNER-UP":mine===2?"🥉 TOP 3":mine>=0&&mine<10?"🏅 TOP 10":"🎯 PARTICIPANT";
       const esc=v=>String(v??"").replace(/[<>]/g,"");
       const pct=v=>(Number(v)||0).toFixed(2)+"%";
       const top=rows.slice(0,3).map((r,i)=>'<div class="metric"><b>'+["🥇","🥈","🥉"][i]+" "+esc(r.name||"User")+'</b><span>'+pct(r.ret)+"</span></div>").join("");
       board.innerHTML='<div style="font-weight:800">🏆 Challenge Ranking</div>'+
         '<div class="grid" style="margin-top:8px">'+top+'</div>'+
         '<div class="actions" style="margin-top:8px">'+
         '<span class="badge">'+tier+'</span>'+
         '<span class="badge">#'+(mine>=0?mine+1:"—")+' / '+rows.length+'</span></div>'+
         '<div class="grid" style="margin-top:8px">'+
         '<div class="metric">Your return<b>'+pct(meRow?.ret)+'</b></div>'+
         '<div class="metric">Challenge P/L<b>KSh '+Math.round(Number(meRow?.profit)||0).toLocaleString("en-KE")+'</b></div>'+
         '<div class="metric">Trades<b>'+Number(meRow?.trades||0)+'</b></div>'+
         '<div class="metric">Reward tier<b>'+tier+'</b></div></div>'+
         '<div class="muted" style="margin-top:8px">Recognition only — no cash prize is implied. Performance is measured from the moment you joined, not from earlier paper-trading history.</div>';
     }else{
       board.innerHTML="Join the challenge to enter its separate paper-performance ranking.";
     }
   }catch(e){}
 }
 window.MaliRadarCompetitive={version:"1.0",sync,load};
 setTimeout(()=>{sync();upgradeRender();setTimeout(()=>{ensureFriendsCard();challenge()},1800)},1200);
 setInterval(ensureFriendsCard,30000);
 setInterval(challenge,30000);
 setInterval(sync,30000);
})();