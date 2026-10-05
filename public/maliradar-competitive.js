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
   const theme=rank===1?"rank1":rank===2?"rank2":rank===3?"rank3":"rankN";
   const clean=String(name||"Challenger").replace(/[<>]/g,"");
   o=document.createElement("div");o.id="mrChallengeCeremony";o.className="mr-ceremony "+theme;
   o.innerHTML='<div class="mr-ceremony-backdrop"><div class="mr-stars"></div><div class="mr-particles"></div><div class="mr-energy-ring er-a"></div><div class="mr-energy-ring er-b"></div><div class="mr-energy-burst"></div></div><div class="mr-ceremony-panel"><div class="mr-scanline"></div><button class="mr-ceremony-close">×</button><div class="mr-ceremony-kicker">MALIRADAR // CHALLENGE COMPLETE</div><div class="mr-ceremony-title">'+(rank===1?"CHAMPIONSHIP MOMENT":rank===2?"ELITE PODIUM MOMENT":rank===3?"PODIUM MOMENT":"FINAL POSITION")+'</div><div class="mr-ceremony-position">#'+rank+'</div><div class="mr-ceremony-name">'+clean+'</div><div class="mr-3d-badge"><div class="mr-badge-orbit orbit-a"></div><div class="mr-badge-orbit orbit-b"></div><div class="mr-badge-ring"><div class="mr-badge-core"><span>'+badge[1]+'</span><b>'+badge[0]+'</b></div></div></div><div class="mr-ceremony-earned">VIRTUAL CASH PRIZE</div><div class="mr-ceremony-cash">KSh '+reward.toLocaleString("en-KE")+'</div><div class="mr-ceremony-note">Simulation credits only • no cash value • no withdrawal</div><button class="mr-continue">CONTINUE</button></div>';
   document.body.appendChild(o);
   o.querySelector(".mr-ceremony-close").onclick=()=>o.remove();
   o.querySelector(".mr-continue").onclick=()=>o.remove();
   setTimeout(()=>o.classList.add("show"),40);
   setTimeout(()=>o.classList.add("badge-pop"),900);
   setTimeout(()=>o.classList.add("cash-pop"),1800);
 } async function challenge(){
   const me=account(); if(!me?.id)return;
   if(!document.getElementById("mr-challenge-ceremony-css")){const st=document.createElement("style");st.id="mr-challenge-ceremony-css";st.textContent=
".mr-ceremony{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .45s;font-family:inherit}.mr-ceremony.show{opacity:1;pointer-events:auto}.mr-ceremony-backdrop{position:absolute;inset:0;overflow:hidden;background:radial-gradient(circle at 50% 42%,rgba(80,210,255,.28),rgba(6,10,25,.97) 52%,#010207 100%)}.mr-stars{position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.8) 1px,transparent 1.5px);background-size:67px 67px;opacity:.28;animation:mrStars 10s linear infinite}.mr-particles{position:absolute;inset:-20%;background:radial-gradient(circle,rgba(0,220,255,.12) 0 1px,transparent 2px);background-size:31px 31px;animation:mrParticles 7s linear infinite}.mr-ceremony-panel{position:relative;width:min(92vw,410px);padding:25px 20px 22px;text-align:center;border:1px solid rgba(120,225,255,.42);border-radius:30px;background:linear-gradient(145deg,rgba(18,29,51,.97),rgba(3,7,17,.98));box-shadow:0 0 80px rgba(0,190,255,.25),inset 0 0 45px rgba(100,200,255,.06);overflow:hidden;transform:translateY(30px) scale(.82);transition:transform .7s cubic-bezier(.17,.89,.32,1.28)}.mr-ceremony.show .mr-ceremony-panel{transform:translateY(0) scale(1)}.mr-scanline{position:absolute;left:0;right:0;top:-20%;height:2px;background:#8ff6ff;box-shadow:0 0 18px #00dfff;opacity:.45;animation:mrScan 3.5s linear infinite}.mr-ceremony-close{position:absolute;right:12px;top:7px;background:none;border:0;color:#a9bbd0;font-size:28px;z-index:3}.mr-ceremony-kicker{font-size:9px;letter-spacing:3px;color:#68ddff;font-weight:900}.mr-ceremony-title{margin-top:7px;font-size:14px;font-weight:900;letter-spacing:3px;color:#d9e6f5}.mr-ceremony-position{font-size:76px;line-height:.9;font-weight:950;margin:12px 0 0;background:linear-gradient(#fff,#61eaff 55%,#3b77ff);-webkit-background-clip:text;color:transparent;text-shadow:0 0 35px rgba(70,210,255,.45)}.mr-ceremony-name{font-size:15px;color:#a7b8ca;margin-top:7px}.mr-3d-badge{height:190px;display:flex;align-items:center;justify-content:center;perspective:900px;position:relative}.mr-badge-ring{width:132px;height:132px;border-radius:50%;padding:8px;background:conic-gradient(#72f4ff,#315cff,#9e54ff,#ffd35a,#72f4ff);box-shadow:0 0 25px rgba(50,220,255,.45),0 0 70px rgba(90,80,255,.25);transform-style:preserve-3d;animation:mrBadgeFloat 3.8s ease-in-out infinite}.mr-badge-core{width:100%;height:100%;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 33% 23%,#5b7896,#111c31 45%,#030711 80%);border:2px solid rgba(255,255,255,.3);box-shadow:inset 0 0 30px rgba(100,220,255,.28),8px 15px 25px rgba(0,0,0,.65);transform:translateZ(28px)}.mr-badge-core span{font-size:48px;filter:drop-shadow(0 7px 7px #000)}.mr-badge-core b{font-size:9px;letter-spacing:1.5px;margin-top:4px}.mr-badge-orbit{position:absolute;width:170px;height:60px;border:1px solid rgba(105,225,255,.45);border-radius:50%;transform-style:preserve-3d;box-shadow:0 0 10px rgba(50,220,255,.2)}.orbit-a{transform:rotateX(67deg) rotateZ(18deg);animation:mrOrbit 4s linear infinite}.orbit-b{transform:rotateY(67deg) rotateZ(-18deg);animation:mrOrbit 5s linear reverse infinite}.mr-ceremony-earned{font-size:10px;letter-spacing:2.5px;color:#9aabc0;font-weight:900}.mr-ceremony-cash{font-size:38px;font-weight:950;margin-top:5px;color:#72f5b0;text-shadow:0 0 25px rgba(70,255,160,.45);transform:scale(.55);opacity:0;transition:.65s cubic-bezier(.17,.89,.32,1.28)}.mr-ceremony.cash-pop .mr-ceremony-cash{transform:scale(1);opacity:1}.mr-ceremony-note{font-size:10px;color:#718299;margin-top:7px}.mr-continue{margin-top:17px;padding:10px 30px;border-radius:22px;border:1px solid rgba(100,220,255,.5);background:rgba(50,200,255,.1);color:#fff;font-weight:900}.mr-ceremony.badge-pop .mr-badge-ring{animation:mrBadgeBurst .9s ease-out}@keyframes mrBadgeBurst{0%{transform:scale(.45) rotateY(180deg);filter:brightness(.6)}55%{transform:scale(1.2) rotateY(-18deg);filter:brightness(2)}100%{transform:scale(1) rotateY(0);filter:brightness(1)}}@keyframes mrBadgeFloat{0%,100%{transform:rotateX(10deg) rotateY(-9deg) translateY(0)}50%{transform:rotateX(10deg) rotateY(9deg) translateY(-8px)}}@keyframes mrOrbit{to{transform:rotateX(67deg) rotateZ(378deg)}}@keyframes mrStars{to{background-position:0 67px}}@keyframes mrParticles{to{transform:translate(31px,31px)}}@keyframes mrScan{to{top:120%}}";
.mr-ceremony.rank1 .mr-ceremony-backdrop{background:radial-gradient(circle at 50% 42%,rgba(255,184,0,.34),rgba(26,15,3,.97) 52%,#010101 100%)}.mr-ceremony.rank1 .mr-ceremony-panel{border-color:rgba(255,213,75,.55);box-shadow:0 0 100px rgba(255,190,0,.32),inset 0 0 45px rgba(255,210,70,.08)}.mr-ceremony.rank1 .mr-ceremony-kicker,.mr-ceremony.rank1 .mr-ceremony-title{color:#ffd84a}.mr-ceremony.rank1 .mr-ceremony-position{background:linear-gradient(#fff7bd,#ffd84a,#9a5b00);-webkit-background-clip:text;color:transparent;text-shadow:0 0 35px rgba(255,190,0,.45)}.mr-ceremony.rank1 .mr-badge-ring{background:conic-gradient(#fff2a0,#ffd84a,#a56500,#fff2a0);box-shadow:0 0 30px rgba(255,200,50,.65),0 0 90px rgba(255,150,0,.28)}.mr-ceremony.rank1 .mr-badge-core{background:radial-gradient(circle at 30% 20%,#fff8c5,#8d6411 42%,#090704 82%)}.mr-ceremony.rank1 .mr-ceremony-cash{color:#fff0a1;text-shadow:0 0 28px rgba(255,190,50,.6)}.mr-ceremony.rank1 .mr-energy-ring{border-color:rgba(255,210,65,.7);box-shadow:0 0 25px rgba(255,190,0,.45)}.mr-ceremony.rank2 .mr-ceremony-backdrop{background:radial-gradient(circle at 50% 42%,rgba(80,210,255,.3),rgba(4,14,24,.97) 52%,#010207 100%)}.mr-ceremony.rank2 .mr-ceremony-panel{border-color:rgba(180,235,255,.55);box-shadow:0 0 100px rgba(70,210,255,.3),inset 0 0 45px rgba(170,235,255,.07)}.mr-ceremony.rank2 .mr-ceremony-kicker,.mr-ceremony.rank2 .mr-ceremony-title{color:#bdeeff}.mr-ceremony.rank2 .mr-ceremony-position{background:linear-gradient(#fff,#c8f2ff,#6b8494);-webkit-background-clip:text;color:transparent}.mr-ceremony.rank2 .mr-badge-ring{background:conic-gradient(#fff,#bceeff,#638ba1,#eefcff,#fff);box-shadow:0 0 30px rgba(110,225,255,.58),0 0 85px rgba(70,170,255,.25)}.mr-ceremony.rank2 .mr-badge-core{background:radial-gradient(circle at 30% 20%,#e9fcff,#507586 42%,#071017 82%)}.mr-ceremony.rank2 .mr-ceremony-cash{color:#d8f8ff;text-shadow:0 0 28px rgba(90,220,255,.6)}.mr-ceremony.rank2 .mr-energy-ring{border-color:rgba(150,230,255,.7);box-shadow:0 0 25px rgba(80,210,255,.45)}.mr-ceremony.rank3 .mr-ceremony-backdrop{background:radial-gradient(circle at 50% 42%,rgba(255,100,45,.3),rgba(30,8,3,.97) 52%,#020101 100%)}.mr-ceremony.rank3 .mr-ceremony-panel{border-color:rgba(255,160,105,.55);box-shadow:0 0 100px rgba(255,90,35,.28),inset 0 0 45px rgba(255,140,70,.07)}.mr-ceremony.rank3 .mr-ceremony-kicker,.mr-ceremony.rank3 .mr-ceremony-title{color:#ffae80}.mr-ceremony.rank3 .mr-ceremony-position{background:linear-gradient(#fff0df,#ffab7c,#8a3518);-webkit-background-clip:text;color:transparent}.mr-ceremony.rank3 .mr-badge-ring{background:conic-gradient(#ffe1ca,#ff9d67,#8c3d20,#ffc2a0,#ffe1ca);box-shadow:0 0 30px rgba(255,110,50,.55),0 0 85px rgba(255,70,20,.22)}.mr-ceremony.rank3 .mr-badge-core{background:radial-gradient(circle at 30% 20%,#fff0df,#92502f 42%,#0f0503 82%)}.mr-ceremony.rank3 .mr-ceremony-cash{color:#ffd0b5;text-shadow:0 0 28px rgba(255,100,50,.58)}.mr-ceremony.rank3 .mr-energy-ring{border-color:rgba(255,150,100,.7);box-shadow:0 0 25px rgba(255,100,50,.4)}.mr-energy-ring{position:absolute;left:50%;top:42%;width:58vw;height:19vw;transform:translate(-50%,-50%) rotateX(68deg);border:2px solid rgba(110,225,255,.55);border-radius:50%;animation:mrEnergy 2.2s ease-in-out infinite;opacity:.75}.er-b{width:78vw;height:25vw;animation-delay:-.7s;opacity:.3}.mr-energy-burst{position:absolute;inset:-20%;background:repeating-conic-gradient(from 0deg at 50% 42%,transparent 0 7deg,rgba(100,220,255,.08) 8deg 10deg,transparent 11deg 22deg);animation:mrBurst 6s linear infinite}.rank1 .mr-energy-burst{background:repeating-conic-gradient(from 0deg at 50% 42%,transparent 0 7deg,rgba(255,205,60,.1) 8deg 10deg,transparent 11deg 22deg)}.rank3 .mr-energy-burst{background:repeating-conic-gradient(from 0deg at 50% 42%,transparent 0 7deg,rgba(255,105,55,.1) 8deg 10deg,transparent 11deg 22deg)}@keyframes mrEnergy{0%,100%{transform:translate(-50%,-50%) rotateX(68deg) scale(.72);opacity:.25}50%{transform:translate(-50%,-50%) rotateX(68deg) scale(1.25);opacity:1}}@keyframes mrBurst{to{transform:rotate(360deg)}}document.head.appendChild(st);}
   try{
     const cr=await fetch("/api/competitive/challenges",{cache:"no-store"});
     const cd=await cr.json(); const x=cd.challenges?.[0]; if(!x)return;
     const card=document.querySelector("#leaderboardView .lb-grid .lb-card:last-child"); if(!card)return;
     const title=card.querySelector("#lbChallengeTitle"); if(title)title.textContent=x.title;
     let prize=card.querySelector(".mr-prize-table");
     if(!prize){prize=document.createElement("div");prize.className="lb-note mr-prize-table";prize.style.marginTop="10px";card.appendChild(prize);}
     const p=x.prizes||{first:50000,second:25000,third:15000,top10:5000,participant:1000};
     prize.innerHTML='<b>💠 Virtual Prize Ladder</b><br>🥇 KSh '+Number(p.first).toLocaleString("en-KE")+' • 🥈 KSh '+Number(p.second).toLocaleString("en-KE")+' • 🥉 KSh '+Number(p.third).toLocaleString("en-KE")+'<br>🏅 Top 10 KSh '+Number(p.top10).toLocaleString("en-KE")+' • 🎯 Participant KSh '+Number(p.participant).toLocaleString("en-KE")+'<br><span class="muted">Virtual simulation credits only — no cash value or withdrawal.</span>';
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