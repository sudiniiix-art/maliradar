/* MaliRadar Friends Hub — standalone resilient mount */
(function(){
  "use strict";
  const ACCOUNT_KEY="maliradar_account_v1";
  const esc=v=>String(v??"").replace(/[<>]/g,"");
  function me(){try{return JSON.parse(localStorage.getItem(ACCOUNT_KEY)||"null")}catch(e){return null}}
  async function api(url,options={}){
    const ctl=new AbortController(), timer=setTimeout(()=>ctl.abort(),5000);
    try{
      const r=await fetch(url,{cache:"no-store",...options,signal:ctl.signal});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||("HTTP "+r.status));
      return d;
    }finally{clearTimeout(timer)}
  }
  function getCard(){
    let card=document.getElementById("mrFriendsStaticHub");
    const mount=document.getElementById("mrFriendsMount");
    const leaderboard=document.getElementById("leaderboardView");
    if(!mount && !leaderboard)return null;
    if(!card){
      card=document.createElement("div");
      card.id="mrFriendsStaticHub";
      card.className="lb-card";
      card.style.marginTop="14px";
      card.innerHTML='<div class="row"><div><strong>👥 Friends Hub</strong><div class="muted">Search players, send requests and manage your network.</div></div><span class="badge">SOCIAL 4.0</span></div>'+
        '<div class="actions" style="margin-top:12px"><input id="mrFHSearch" class="formline" placeholder="Search username or MaliRadar ID" autocomplete="off" style="flex:1"><button id="mrFHSearchBtn" class="btn">Search</button></div>'+
        '<div id="mrFHResults" style="margin-top:10px"></div><div id="mrFHRequests" style="margin-top:14px"></div><div id="mrFHFriends" style="margin-top:14px"></div>';
    }
    if(mount && card.parentElement!==mount)mount.appendChild(card);
    else if(!card.parentElement && leaderboard)leaderboard.appendChild(card);
    return card;
  }
  function bind(card){
    if(!card || card.dataset.mrFriends40==="1")return;
    card.dataset.mrFriends40="1";
    const q=card.querySelector("#mrFHSearch"), btn=card.querySelector("#mrFHSearchBtn");
    if(!q||!btn)return;
    async function refresh(){
      const m=me(), req=card.querySelector("#mrFHRequests"), fr=card.querySelector("#mrFHFriends");
      if(!m?.id){
        req.innerHTML='<div class="lb-note">Save your MaliRadar profile first to use Friends Hub.</div>';
        fr.innerHTML="";
        return;
      }
      try{
        const d=await api("/api/competitive/friends/"+encodeURIComponent(m.id));
        req.innerHTML='<div class="row"><strong>📨 Friend Requests</strong><span class="muted">'+(d.incoming?.length||0)+' incoming</span></div>'+
          ((d.incoming||[]).map(p=>'<div class="lb-row" style="margin-top:7px"><div class="lb-name"><b>'+esc(p.name)+'</b><div class="muted">'+esc(p.id)+'</div></div><button class="btn" data-mr-accept="'+esc(p.id)+'">Accept</button><button class="btn alt" data-mr-decline="'+esc(p.id)+'">Decline</button></div>').join("")||'<div class="lb-note" style="margin-top:7px">No pending requests.</div>');
        fr.innerHTML='<div class="row"><strong>👥 Your Friends</strong><span class="muted">'+(d.friends?.length||0)+' connected</span></div>'+
          ((d.friends||[]).map(p=>'<div class="lb-row" style="margin-top:7px"><div class="lb-name"><b>'+esc(p.name)+'</b><div class="muted">'+esc(p.id)+'</div></div><button class="btn alt" data-mr-remove="'+esc(p.id)+'">Remove</button></div>').join("")||'<div class="lb-note" style="margin-top:7px">No friends yet. Search for a username above.</div>');
        req.querySelectorAll("[data-mr-accept]").forEach(x=>x.onclick=async()=>{
          x.disabled=true;
          try{await api("/api/competitive/friends/respond",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:m.id,friendId:x.dataset.mrAccept,action:"accept"})});await refresh()}catch(e){x.disabled=false}
        });
        req.querySelectorAll("[data-mr-decline]").forEach(x=>x.onclick=async()=>{
          x.disabled=true;
          try{await api("/api/competitive/friends/respond",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:m.id,friendId:x.dataset.mrDecline,action:"decline"})});await refresh()}catch(e){x.disabled=false}
        });
        fr.querySelectorAll("[data-mr-remove]").forEach(x=>x.onclick=async()=>{
          x.disabled=true;
          try{await api("/api/competitive/friends/"+encodeURIComponent(m.id)+"/"+encodeURIComponent(x.dataset.mrRemove),{method:"DELETE"});await refresh()}catch(e){x.disabled=false}
        });
      }catch(e){
        req.innerHTML='<div class="lb-note">⚠️ Friend network is temporarily unavailable. Try again in a moment.</div>';
        fr.innerHTML="";
      }
    }
    async function search(){
      const m=me(), value=q.value.trim(), out=card.querySelector("#mrFHResults");
      if(!m?.id){out.innerHTML='<div class="lb-note">Save your MaliRadar profile first.</div>';return}
      if(value.length<2){out.innerHTML='<div class="lb-note">Enter at least 2 characters.</div>';return}
      out.innerHTML='<div class="lb-note">Searching…</div>';
      try{
        const d=await api("/api/competitive/profile/search?q="+encodeURIComponent(value)+"&_mr_fh="+Date.now());
        const network=await api("/api/competitive/friends/"+encodeURIComponent(m.id));
        const friends=new Set((network.friends||[]).map(x=>x.id)), incoming=new Set((network.incoming||[]).map(x=>x.id)), outgoing=new Set(network.outgoing||[]);
        out.innerHTML=(d.profiles||[]).filter(p=>p.id!==m.id).map(p=>{
          const status=friends.has(p.id)?"✓ Friends":incoming.has(p.id)?"Incoming request":outgoing.has(p.id)?"✓ Request sent":"Add";
          const disabled=status!=="Add";
          return '<div class="lb-row" style="margin-top:7px"><div class="lb-name"><b>'+esc(p.name)+'</b><div class="muted">'+esc(p.id)+(p.region==="kenya"?" • 🇰🇪":"")+'</div></div><button class="btn '+(disabled?"alt":"")+'" data-mr-add="'+esc(p.id)+'" '+(disabled?"disabled":"")+'>'+status+'</button></div>';
        }).join("")||'<div class="lb-note">No matching users.</div>';
        out.querySelectorAll("[data-mr-add]:not([disabled])").forEach(x=>x.onclick=async()=>{
          x.disabled=true;x.textContent="Sending…";
          try{
            const r=await api("/api/competitive/friends/add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:m.id,friendId:x.dataset.mrAdd})});
            x.textContent=r.status==="friend"?"✓ Friends":"✓ Request sent";x.classList.add("alt");await refresh();
          }catch(e){x.disabled=false;x.textContent="Add"}
        });
      }catch(e){out.innerHTML='<div class="lb-note">Search failed or timed out. Tap Search to retry.</div>'}
    }
    btn.onclick=search;
    q.addEventListener("keydown",e=>{if(e.key==="Enter")search()});
    refresh();
  }
  function boot(){
    const card=getCard();
    if(card)bind(card);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,250));
  else setTimeout(boot,250);
  setTimeout(boot,1200);
  setInterval(boot,3000);
  window.MaliRadarFriendsHub={version:"4.0",mount:boot};
})();