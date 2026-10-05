/* MALIRADAR Competitive Season 4.0 — client */
(function(){
  "use strict";
  const ACCOUNT="maliradar_account_v1";
  const me=()=>{try{return JSON.parse(localStorage.getItem(ACCOUNT)||"null")}catch(e){return null}};
  const esc=v=>String(v??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[m]));
  const pct=n=>{const x=Number(n)||0;return (x>=0?"+":"")+x.toFixed(2)+"%"};
  async function api(u,opt={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),5000);try{const r=await fetch(u,{...opt,cache:"no-store",signal:c.signal}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Request failed");return d}finally{clearTimeout(t)}}
  function css(){if(document.getElementById("mr-season4-css"))return;const s=document.createElement("style");s.id="mr-season4-css";s.textContent=
    ".mr-s4-card{margin-top:14px}.mr-s4-hero{padding:14px;border:1px solid #234854;border-radius:16px;background:linear-gradient(135deg,#0b1d25,#071218)}.mr-s4-div{font-size:25px;font-weight:950;margin-top:7px}.mr-s4-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.mr-s4-metric{padding:10px;border:1px solid #1b3c47;border-radius:13px}.mr-s4-metric span{display:block;font-size:10px;color:#91aab1;font-weight:800}.mr-s4-metric b{display:block;font-size:18px;margin-top:3px}.mr-s4-zone{display:inline-block;margin-top:8px;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:900;border:1px solid #2c5b68}.mr-s4-list{margin-top:9px}.mr-s4-row{display:grid;grid-template-columns:34px 1fr auto;gap:8px;align-items:center;padding:9px 0;border-top:1px solid #17343e}.mr-s4-row small{display:block;color:#91aab1;margin-top:2px}.mr-s4-badges{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.mr-s4-badge{padding:8px 9px;border-radius:12px;border:1px solid #254650;min-width:115px}.mr-s4-badge.lock{opacity:.42}.mr-s4-badge b{display:block}.mr-s4-badge small{color:#91aab1}.mr-s4-rules{margin-top:11px}.mr-s4-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}@media(max-width:650px){.mr-s4-grid{grid-template-columns:1fr 1fr}.mr-s4-row{grid-template-columns:28px 1fr auto}}";
    document.head.appendChild(s)
  }
  function root(){return document.getElementById("leaderboardView")}
  function render(){
    css();const r=root();if(!r)return;let card=document.getElementById("mrSeason4Card");
    if(!card){card=document.createElement("div");card.id="mrSeason4Card";card.className="lb-card mr-s4-card";r.appendChild(card)}
    const a=me();if(!a?.id){card.innerHTML='<div class="row"><strong>🏆 Competitive Season 4.0</strong><span class="badge">SEASON</span></div><div class="lb-note" style="margin-top:10px">Create/save your MaliRadar profile to enter the seasonal ranking.</div>';return}
    card.innerHTML='<div class="row"><div><strong>🏆 Competitive Season 4.0</strong><div class="muted">Seasonal divisions, promotion, streaks and badges.</div></div><span class="badge">LIVE SEASON</span></div><div class="lb-note" style="margin-top:10px">Loading season standings…</div>';
    api("/api/competitive/season?id="+encodeURIComponent(a.id)+"&_="+Date.now()).then(d=>{
      const p=d.player,s=d.season;
      if(!p){card.innerHTML='<div class="lb-note">Season profile unavailable.</div>';return}
      const zone=p.seasonStatus==="PROMOTION ZONE"?"🟢 PROMOTION ZONE":p.seasonStatus==="RELEGATION ZONE"?"🔴 RELEGATION ZONE":"🟡 SAFE";
      card.innerHTML=
        '<div class="row"><div><strong>🏆 '+esc(s.name)+'</strong><div class="muted">'+s.daysLeft+' days remaining</div></div><span class="badge">'+esc(p.division.name.toUpperCase())+'</span></div>'+
        '<div class="mr-s4-hero"><div class="muted">'+p.division.icon+' CURRENT DIVISION</div><div class="mr-s4-div">'+esc(p.division.name)+'</div><span class="mr-s4-zone">'+zone+'</span></div>'+
        '<div class="mr-s4-grid"><div class="mr-s4-metric"><span>SEASON RANK</span><b>#'+p.rank+'</b></div><div class="mr-s4-metric"><span>POINTS</span><b>'+p.points+'</b></div><div class="mr-s4-metric"><span>DUEL STREAK</span><b>🔥 '+p.streak+'</b></div><div class="mr-s4-metric"><span>W / L</span><b>'+p.wins+' / '+p.losses+'</b></div></div>'+
        '<div style="margin-top:14px"><div class="row"><strong>🎖️ Season Badges</strong><span class="muted">'+p.badges.filter(x=>x.earned).length+'/'+p.badges.length+' earned</span></div><div class="mr-s4-badges">'+p.badges.map(b=>'<div class="mr-s4-badge '+(b.earned?'':'lock')+'"><b>'+b.icon+' '+esc(b.name)+'</b><small>'+esc(b.desc)+'</small></div>').join("")+'</div></div>'+
        '<div style="margin-top:14px"><div class="row"><strong>📊 Seasonal Standings</strong><span class="muted">Top 50</span></div><div class="mr-s4-list">'+(d.standings||[]).slice(0,10).map(x=>'<div class="mr-s4-row"><b>#'+x.rank+'</b><div><b>'+esc(x.name)+(x.id===p.id?" • YOU":"")+'</b><small>'+x.division.icon+' '+esc(x.division.name)+' • '+x.points+' pts • '+pct(x.ret)+'</small></div><span class="badge">'+esc(x.region)+'</span></div>').join("")+'</div></div>'+
        '<div class="mr-s4-actions"><button class="btn alt" id="mrS4Rules">📜 Season Rules</button><button class="btn" id="mrS4Snapshot">💾 Save Season Snapshot</button></div>'+
        '<div class="notice mr-s4-rules" id="mrS4Notice">Season points are game metrics only. They do not measure real trading skill or predict investment returns.</div>';
      card.querySelector("#mrS4Rules").onclick=()=>{const n=card.querySelector("#mrS4Notice");n.innerHTML='<b>Promotion:</b> top 20% of your division are projected to move up. <b>Relegation:</b> bottom 20% are projected to move down. Diamond has no higher division; Bronze has no lower division.<br><br><b>Points:</b> simulated return + learning/activity + competitive results.<br><br><b>Badges:</b> earned from paper competition milestones.';
      };
      card.querySelector("#mrS4Snapshot").onclick=async e=>{e.target.disabled=true;try{await api("/api/competitive/season/snapshot",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:p.id})});e.target.textContent="✓ Snapshot saved"}catch(err){e.target.textContent="Try again"}};
    }).catch(()=>{card.innerHTML='<div class="row"><strong>🏆 Competitive Season 4.0</strong><span class="badge">OFFLINE</span></div><div class="lb-note" style="margin-top:10px">Season data is temporarily unavailable. Your paper portfolio is unaffected.</div>'});
  }
  window.MaliRadarSeasons={version:"4.0",refresh:render};
  function boot(){render()}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,900));else setTimeout(boot,900);
  setInterval(()=>{if(document.getElementById("leaderboardView")?.classList.contains("active"))render()},15000);
})();