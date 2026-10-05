/* MALIRADAR Competitive Tournaments 5.2 — integrated UI */
(function(){
"use strict";
const KEY="maliradar_account_v1";
const acct=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){return null}};
const esc=v=>String(v==null?"":v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const api=async(u,o)=>{const r=await fetch(u,Object.assign({cache:"no-store"},o||{})),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Request failed");return d};
const left=t=>{const n=Math.max(0,Date.parse(t)-Date.now()),d=Math.floor(n/86400000),h=Math.floor(n%86400000/3600000),m=Math.floor(n%3600000/60000),s=Math.floor(n%60000/1000);return d?d+"d "+h+"h":h?h+"h "+m+"m":m?m+"m "+s+"s":s+"s"};
function css(){if(document.getElementById("mr-t52-css"))return;const s=document.createElement("style");s.id="mr-t52-css";s.textContent=".mr-t52{margin-top:14px}.mr-t52list{display:grid;gap:9px;margin-top:10px}.mr-t52event{padding:12px;border:1px solid #1b3c47;border-radius:14px}.mr-t52top{display:flex;justify-content:space-between;gap:8px}.mr-t52meta{font-size:11px;color:#91aab1;margin-top:4px}.mr-t52actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.mr-t52modal{position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:12px}.mr-t52box{width:min(720px,100%);max-height:90vh;overflow:auto;background:#071219;border:1px solid #20404b;border-radius:22px;padding:17px}.mr-t52match{display:grid;grid-template-columns:1fr 24px 1fr;gap:7px;align-items:center;padding:8px;border-top:1px solid #17343e}.mr-t52player{padding:8px;border:1px solid #1b3c47;border-radius:10px;min-width:0}.mr-t52you{box-shadow:0 0 0 1px #22c7d9 inset}.mr-t52win{font-weight:900}.mr-t52section{margin-top:14px}.mr-t52grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mr-t52stat{padding:10px;border:1px solid #1b3c47;border-radius:12px}.mr-t52stat small{display:block;color:#91aab1}.mr-t52stat b{display:block;margin-top:3px;font-size:17px}";document.head.appendChild(s)}
function mount(){css();const root=document.getElementById("leaderboardView");if(!root)return null;let c=document.getElementById("mrT5Card");if(!c){c=document.createElement("div");c.id="mrT5Card";c.className="lb-card mr-t52"}const season=document.getElementById("mrSeason4Card"),profile=document.getElementById("mrCp4Card"),pos=document.getElementById("myPosition"),anchor=profile||season||pos?.closest(".lb-card");if(anchor?.parentNode)anchor.parentNode.insertBefore(c,anchor.nextSibling);else if(!c.parentNode)root.appendChild(c);return c}
function button(label,attr,alt){return "<button type='button' class='btn "+(alt?"alt":"")+"' "+attr+">"+label+"</button>"}
async function render(){
 const c=mount();if(!c)return;const a=acct();
 if(!a?.id){c.innerHTML="<strong>🌍 Global Competitions</strong><div class='lb-note'>Save your MaliRadar profile first.</div>";return}
 try{
  const d=await api("/api/competitive/tournaments?id="+encodeURIComponent(a.id)+"&_="+Date.now());
  c.innerHTML="<div class='row'><div><strong>🌍 Global Competitions</strong><div class='muted'>Tournaments • brackets • paper rewards</div></div><span class='badge'>5.2</span></div><div class='mr-t52list'>"+(d.tournaments||[]).map(t=>{
   const time=t.status==="UPCOMING"?"Starts in "+left(t.start):t.status==="LIVE"?"Ends in "+left(t.end):"Ended";
   const main=t.joined?button("📊 Standings","data-open='"+t.id+"'"):t.status==="UPCOMING"?button("🚀 Join","data-join='"+t.id+"'"):button("📊 Results","data-open='"+t.id+"'",true);
   return "<div class='mr-t52event'><div class='mr-t52top'><b>"+esc(t.title)+"</b><span class='badge'>"+esc(t.status)+"</span></div><div class='mr-t52meta'>"+esc(t.region)+" • "+new Date(t.start).toLocaleDateString()+" → "+new Date(t.end).toLocaleDateString()+" • "+esc(t.count||0)+" entrants • "+esc(time)+"</div><div class='mr-t52actions'>"+main+button("🧩 Bracket","data-bracket='"+t.id+"'",true)+"</div></div>";
  }).join("")+"</div><div class='notice' style='margin-top:10px'>Paper-simulation competition only. Entry baselines are locked when you join.</div><div class='mr-t52actions'>"+button("🗂️ Tournament History","data-history='1'",true)+"</div>";
  c.querySelectorAll("[data-join]").forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api("/api/competitive/tournaments/"+encodeURIComponent(b.dataset.join)+"/join",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:a.id})});await render()}catch(e){b.disabled=false;alert(e.message)}});
  c.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openStandings(b.dataset.open));
  c.querySelectorAll("[data-bracket]").forEach(b=>b.onclick=()=>openBracket(b.dataset.bracket));
  c.querySelector("[data-history]")?.addEventListener("click",openHistory);
 }catch(e){c.innerHTML="<strong>🌍 Global Competitions</strong><div class='lb-note'>Competition service temporarily unavailable.</div>"}
}
function modal(title,body){
 document.getElementById("mrT5Modal")?.remove();const m=document.createElement("div");m.id="mrT5Modal";m.className="mr-t52modal";m.innerHTML="<div class='mr-t52box'><button type='button' class='btn alt' id='mrT52Close'>✕ Close</button><h3>"+esc(title)+"</h3>"+body+"</div>";document.body.appendChild(m);m.querySelector("#mrT52Close").onclick=()=>m.remove();m.onclick=e=>{if(e.target===m)m.remove()};return m;
}
async function openStandings(id){
 try{const d=await api("/api/competitive/tournaments/"+encodeURIComponent(id)+"/leaderboard?userId="+encodeURIComponent(acct()?.id||""));const me=d.user;
  const personal=me?"<div class='mr-t52grid'><div class='mr-t52stat'><small>YOUR RANK</small><b>#"+me.rank+"</b></div><div class='mr-t52stat'><small>TOURNAMENT SCORE</small><b>"+Number(me.score).toFixed(2)+"%</b></div></div>":"<div class='lb-note'>Join the tournament to receive a personal standing.</div>";
  const rewards="<div class='mr-t52section'><b>🎁 Rewards</b><div class='notice'>"+(d.rewards||[]).map(esc).join(" • ")+"</div></div>";
  const rows=(d.participants||[]).map(x=>"<div class='mr-t52match'><b>#"+x.rank+"</b><div class='mr-t52player "+(x.id===acct()?.id?"mr-t52you":"")+"'>"+esc(x.name)+"<br><small>"+esc(x.region)+"</small></div><b>"+Number(x.score).toFixed(2)+"%</b></div>").join("")||"<div class='lb-note'>No entrants yet.</div>";
  modal(d.tournament.title,personal+rewards+"<div class='mr-t52section'><b>📊 Standings</b>"+rows+"</div>");
 }catch(e){alert(e.message)}
}
async function openBracket(id){
 try{
  const d=await api("/api/competitive/tournaments/"+encodeURIComponent(id)+"/bracket?userId="+encodeURIComponent(acct()?.id||"")),b=d.bracket;
  if(!b.rounds.length){modal(d.tournament.title,"<div class='lb-note'>Bracket will activate when at least two players are registered.</div>");return}
  const html=b.rounds.map(r=>"<div class='mr-t52section'><div class='row'><b>"+esc(r.name)+"</b><span class='muted'>"+(r.matches.length)+" match"+(r.matches.length===1?"":"es")+"</span></div>"+r.matches.map(m=>{
    const a=b.seeded.find(s=>s.id===m.seedA),z=b.seeded.find(s=>s.id===m.seedB),sa=a?esc(a.name):"BYE",sb=z?esc(z.name):"BYE";
    const ca=m.winner===m.seedA?"mr-t52win":"",cb=m.winner===m.seedB?"mr-t52win":"";
    const scoreA=m.scoreA==null?"":Number(m.scoreA).toFixed(2)+"%",scoreB=m.scoreB==null?"":Number(m.scoreB).toFixed(2)+"%";
    return "<div class='mr-t52match'><div class='mr-t52player "+ca+" "+(m.seedA===d.userId?"mr-t52you":"")+"'>"+sa+"<br><small>"+scoreA+"</small></div><span>"+esc(m.status)+"</span><div class='mr-t52player "+cb+" "+(m.seedB===d.userId?"mr-t52you":"")+"'>"+sb+"<br><small>"+scoreB+"</small></div></div>";
  }).join("")+"</div>").join("");
  modal(d.tournament.title,"<div class='notice'>"+(d.status==="UPCOMING"?"Registration is open; seeds are provisional.":d.status==="LIVE"?"Live bracket — winners are determined from the locked-baseline return score when each round closes.":"Final bracket.")+"</div>"+html+"<p class='notice'>"+esc(d.disclaimer)+"</p>");
 }catch(e){alert(e.message)}
}
async function openHistory(){
 try{const d=await api("/api/competitive/tournaments/history");modal("Tournament History",(d.history||[]).length?d.history.map(x=>"<div class='mr-t52event'><b>"+esc(x.title)+"</b><div class='mr-t52meta'>"+esc(x.region)+" • ended "+new Date(x.end).toLocaleDateString()+" • "+esc(x.count)+" entrants</div><div class='notice'>"+(x.rewards||[]).map(esc).join(" • ")+"</div></div>").join(""):"<div class='lb-note'>No completed tournaments yet.</div>")}catch(e){alert(e.message)}
}
window.MaliRadarTournaments={version:"5.2",refresh:render,openStandings,openBracket};
function boot(){setTimeout(render,700)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();setInterval(()=>{if(document.getElementById("leaderboardView"))render()},20000);
})();