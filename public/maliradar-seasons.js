/* MALIRADAR Competitive Season 4.0 — stable client */
(function(){
  "use strict";
  const KEY="maliradar_account_v1";
  const esc=function(v){return String(v==null?"":v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});};
  function account(){try{return JSON.parse(localStorage.getItem(KEY)||"null");}catch(e){return null;}}
  async function api(url,opt){
    const r=await fetch(url,Object.assign({cache:"no-store"},opt||{}));
    const d=await r.json().catch(function(){return {};});
    if(!r.ok) throw new Error(d.error||"Request failed");
    return d;
  }
  function inject(){
    if(document.getElementById("mr-s4-style"))return;
    const s=document.createElement("style");
    s.id="mr-s4-style";
    s.textContent=".mr-s4{margin-top:14px}.mr-s4hero{padding:14px;border:1px solid #234854;border-radius:16px;background:#0b1d25}.mr-s4hero b{display:block;font-size:25px;margin-top:5px}.mr-s4grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.mr-s4m{padding:10px;border:1px solid #1b3c47;border-radius:12px}.mr-s4m small{display:block;color:#91aab1}.mr-s4m b{font-size:18px}.mr-s4rows{margin-top:10px}.mr-s4row{display:grid;grid-template-columns:35px 1fr auto;gap:8px;padding:9px 0;border-top:1px solid #17343e}.mr-s4badges{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.mr-s4badge{padding:7px 9px;border:1px solid #254650;border-radius:10px;cursor:pointer}.mr-s4badge.locked{opacity:.42;filter:grayscale(1)}.mr-s4badge.earned{box-shadow:0 0 0 1px #2b6472 inset}.mr-s4badgeHint{margin-top:8px;padding:9px 11px;border-radius:10px;border:1px solid #1b3c47;font-size:13px;color:#9fb7be}.mr-s4progress{margin-top:12px;padding:11px;border:1px solid #1b3c47;border-radius:12px}.mr-s4bar{height:9px;border-radius:9px;background:#102832;overflow:hidden;margin-top:8px}.mr-s4fill{height:100%;background:#22c7d9;border-radius:9px}.mr-s4reward{margin-top:10px;padding:10px;border-radius:12px;border:1px solid #254650}.mr-s4actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}";
    document.head.appendChild(s);
  }
  function mount(){
    inject();
    const root=document.getElementById("leaderboardView");
    if(!root)return null;
    let card=document.getElementById("mrSeason4Card");
    if(!card){
      card=document.createElement("div");
      card.id="mrSeason4Card";
      card.className="lb-card mr-s4";
      const pos=document.getElementById("myPosition");
      const posCard=pos&&pos.closest(".lb-card");
      if(posCard&&posCard.parentNode)posCard.parentNode.insertBefore(card,posCard.nextSibling);
      else root.appendChild(card);
    }
    return card;
  }
  async function render(){
    const card=mount();
    if(!card)return;
    const a=account();
    if(!a||!a.id){
      card.innerHTML="<div class='row'><strong>🏆 Competitive Season</strong><span class='badge'>SEASON</span></div><div class='lb-note' style='margin-top:8px'>Save your MaliRadar profile to enter the seasonal ranking.</div>";
      return;
    }
    card.innerHTML="<div class='row'><strong>🏆 Competitive Season</strong><span class='badge'>LOADING</span></div>";
    try{
      const d=await api("/api/competitive/season?id="+encodeURIComponent(a.id)+"&_="+Date.now());
      const p=d.player,s=d.season;
      if(!p){card.innerHTML="<div class='lb-note'>Season profile unavailable.</div>";return;}
      const zone=p.seasonStatus||"SAFE";
      const badgeHelp={"First Duel":"Complete your first paper duel.","Hot Streak":"Build a winning duel streak.","Unstoppable":"Reach the Unstoppable streak milestone.","Elite Ten":"Reach the Elite Ten seasonal milestone.","Gold Standard":"Reach Gold division.","Veteran":"Reach the Veteran activity milestone."};
      const badges=(p.badges||[]).map(function(b){const earned=!!b.earned;const title=earned?"Earned badge":"Locked • "+(badgeHelp[b.name]||"Complete the required seasonal milestone.");return "<button type='button' class='mr-s4badge "+(earned?"earned":"locked")+"' data-badge='"+esc(b.name)+"' title='"+esc(title)+"'>"+(earned?b.icon:"🔒")+" "+esc(b.name)+"</button>";}).join("");
      const rows=(d.standings||[]).slice(0,10).map(function(x){
        return "<div class='mr-s4row'><b>#"+x.rank+"</b><div><b>"+esc(x.name)+(x.id===p.id?" • YOU":"")+"</b><small>"+x.division.icon+" "+esc(x.division.name)+" • "+x.points+" pts</small></div><span class='badge'>"+esc(x.region)+"</span></div>";
      }).join("");
      card.innerHTML=
        "<div class='row'><div><strong>🏆 "+esc(s.name)+"</strong><div class='muted'>"+s.daysLeft+" days remaining</div></div><span class='badge'>"+esc(p.division.name.toUpperCase())+"</span></div>"+
        "<div class='mr-s4hero'><div class='muted'>CURRENT DIVISION • "+esc(zone)+"</div><b>"+p.division.icon+" "+esc(p.division.name)+"</b></div>"+
        "<div class='mr-s4grid'><div class='mr-s4m'><small>SEASON RANK</small><b>#"+p.rank+"</b></div><div class='mr-s4m'><small>POINTS</small><b>"+p.points+"</b></div><div class='mr-s4m'><small>DUEL STREAK</small><b>🔥 "+p.streak+"</b></div><div class='mr-s4m'><small>W / L</small><b>"+p.wins+" / "+p.losses+"</b></div></div>"+"<div class='mr-s4progress'><div class='row'><strong>📈 Division Progress</strong><span class='muted'>"+(p.progress.next?(p.progress.percent+"% to "+esc(p.progress.next)):"MAX DIVISION")+" </span></div><div class='mr-s4bar'><div class='mr-s4fill' style='width:"+p.progress.percent+"%'></div></div><div class='muted' style='margin-top:7px'>"+(p.progress.next?(p.progress.pointsToNext+" points to "+esc(p.progress.next)):"You have reached Diamond.")+"</div></div>"+
        "<div class='mr-s4reward'><strong>🎁 Season Reward</strong><div style='margin-top:5px'>"+esc(p.reward.reward)+"</div><div class='muted' style='margin-top:4px'>"+esc(p.reward.promotionBonus)+"</div></div>"+
        "<div style='margin-top:12px'><div class='row'><strong>🎖️ Season Badges</strong><span class='muted'>"+(p.badges||[]).filter(function(x){return x.earned;}).length+"/"+(p.badges||[]).length+"</span></div><div class='mr-s4badges'>"+badges+"</div><div class='mr-s4badgeHint' id='mrS4BadgeHint'>Tap a badge to see its status or unlock requirement.</div></div>"+
        "<div style='margin-top:12px'><div class='row'><strong>📊 Seasonal Standings</strong><span class='muted'>Top 10</span></div><div class='mr-s4rows'>"+(rows||"<div class='lb-note'>No standings yet.</div>")+"</div></div>"+
        "<div class='mr-s4actions'><button type='button' class='btn alt' id='mrS4Rules'>📜 Season Rules</button><button type='button' class='btn' id='mrS4Snapshot'>💾 Save Snapshot</button></div>"+
        "<div class='notice' id='mrS4Notice' style='margin-top:10px'>Season metrics are simulated game metrics, not real trading skill or financial advice.</div>";
      document.querySelectorAll("#mrSeason4Card .mr-s4badge").forEach(function(btn){btn.onclick=function(){const name=btn.getAttribute("data-badge")||"Badge";const item=(p.badges||[]).find(function(x){return x.name===name;});const hint=document.getElementById("mrS4BadgeHint");if(!hint)return;if(item&&item.earned)hint.innerHTML="✅ <b>"+esc(name)+"</b> — earned this season.";else hint.innerHTML="🔒 <b>"+esc(name)+"</b> — "+esc(badgeHelp[name]||"Complete the required seasonal milestone.");};});
      const rules=document.getElementById("mrS4Rules");
      if(rules)rules.onclick=function(ev){
        if(ev)ev.preventDefault();
        const n=document.getElementById("mrS4Notice");
        if(!n)return;
        const open=n.dataset.rulesOpen==="1";
        if(open){
          n.dataset.rulesOpen="0";
          n.innerHTML="Season metrics are simulated game metrics, not real trading skill or financial advice.";
          rules.textContent="📜 Season Rules";
          return;
        }
        n.dataset.rulesOpen="1";
        n.innerHTML="<strong>📜 Season 4 Rules</strong><br><br><b>🏆 Points</b><br>Points come from simulated return, XP, completed trades, achievements and competitive results such as duel wins/losses.<br><br><b>⬆️ Promotion</b><br>Finish in the top 20% of your current division to be promoted when the season ends.<br><br><b>⬇️ Relegation</b><br>Finish in the bottom 20% to be relegated. Bronze cannot be relegated.<br><br><b>💎 Diamond</b><br>Diamond is the highest division, so there is no higher promotion tier.<br><br><b>🔥 Streak</b><br>Your streak tracks consecutive completed duel wins.<br><br><b>🎖️ Badges</b><br>Badges are earned from milestones such as your first duel, win streaks, elite ranking, Gold division and veteran activity.<br><br><span class='muted'>These are game/learning metrics only — not real trading skill, investment advice or a prediction of future returns.</span>";
        rules.textContent="✕ Close Rules";
      };
      const snap=document.getElementById("mrS4Snapshot");
      if(snap)snap.onclick=async function(){snap.disabled=true;try{await api("/api/competitive/season/snapshot",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:p.id})});snap.textContent="✓ Saved";}catch(e){snap.textContent="Try again";snap.disabled=false;}};
    }catch(e){
      card.innerHTML="<div class='row'><strong>🏆 Competitive Season</strong><span class='badge'>OFFLINE</span></div><div class='lb-note' style='margin-top:8px'>Season data is temporarily unavailable.</div>";
    }
  }
  window.MaliRadarSeasons={version:"4.0",refresh:render};
  function boot(){setTimeout(render,500);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  setInterval(function(){if(document.getElementById("leaderboardView"))render();},20000);
})();