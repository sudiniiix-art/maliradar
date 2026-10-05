/* MALIRADAR Social Competition 3.0 — client layer */
(function(){
  "use strict";
  const A="maliradar_account_v1";
  const esc=v=>String(v??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":">",""":"&quot;"}[m]));
  const me=()=>{try{return JSON.parse(localStorage.getItem(A)||"null")}catch(e){return null}};
  async function api(url,opt={}){
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),5000);
    try{const r=await fetch(url,{...opt,cache:"no-store",signal:ctl.signal});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||("HTTP "+r.status));return d}
    finally{clearTimeout(timer)}
  }
  function css(){
    if(document.getElementById("mr-sc3-css"))return;
    const s=document.createElement("style");s.id="mr-sc3-css";s.textContent=
      ".mr-sc3-card{margin-top:14px}.mr-sc3-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.mr-sc3-metric{padding:11px;border:1px solid #193b47;border-radius:13px;background:#081820}.mr-sc3-metric span{display:block;color:#91aab1;font-size:10px;font-weight:800}.mr-sc3-metric b{display:block;font-size:19px;margin-top:4px}.mr-sc3-list{margin-top:10px}.mr-sc3-row{display:flex;align-items:center;gap:8px;padding:9px 0;border-top:1px solid #16313b}.mr-sc3-row .copy{flex:1;min-width:0}.mr-sc3-row small{display:block;color:#91aab1;margin-top:2px}.mr-sc3-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.mr-sc3-modal{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:15px}.mr-sc3-box{width:min(620px,100%);max-height:88vh;overflow:auto;background:#071219;border:1px solid #20404b;border-radius:22px;padding:18px;box-shadow:0 25px 90px rgba(0,0,0,.65)}.mr-sc3-vs{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.mr-sc3-player{padding:13px;border:1px solid #1d414d;border-radius:15px;background:#091a22}.mr-sc3-win{border-color:#28d8a3;box-shadow:0 0 0 1px rgba(40,216,163,.18)}.mr-sc3-activity{max-height:220px;overflow:auto}.mr-sc3-empty{padding:10px;border:1px dashed #244550;border-radius:12px;color:#91aab1;margin-top:8px}@media(max-width:600px){.mr-sc3-grid{grid-template-columns:1fr 1fr}.mr-sc3-vs{grid-template-columns:1fr}}";
    document.head.appendChild(s);
  }
  function leaderboardRoot(){return document.getElementById("leaderboardView")}
  function card(){
    css();let c=document.getElementById("mrSocialCompetition3"),root=leaderboardRoot();if(!root)return null;
    if(!c){c=document.createElement("div");c.id="mrSocialCompetition3";c.className="lb-card mr-sc3-card";root.appendChild(c)}
    return c;
  }
  function modal(title,body){
    document.getElementById("mr-sc3-modal")?.remove();
    const m=document.createElement("div");m.id="mr-sc3-modal";m.className="mr-sc3-modal";
    m.innerHTML='<div class="mr-sc3-box"><div class="row"><strong style="font-size:19px">'+esc(title)+'</strong><button class="btn alt" data-close>✕</button></div>'+body+'</div>';
    document.body.appendChild(m);m.onclick=e=>{if(e.target===m)m.remove()};m.querySelector("[data-close]").onclick=()=>m.remove();return m;
  }
  function pct(n){const x=Number(n)||0;return (x>=0?"+":"")+x.toFixed(2)+"%"}
  async function compare(id,friendId,name){
    const m=modal("Head-to-Head • "+name,'<div class="lb-note">Loading verified server profile comparison…</div>');
    try{
      const d=await api("/api/competitive/social/compare/"+encodeURIComponent(id)+"/"+encodeURIComponent(friendId));
      const a=d.a,b=d.b;
      m.querySelector(".mr-sc3-box").innerHTML=
        '<div class="row"><strong style="font-size:19px">⚔️ Head-to-Head</strong><button class="btn alt" data-close>✕</button></div>'+
        '<div class="mr-sc3-vs">'+player(a,d.edge===a.id)+'<div style="display:none"></div>'+player(b,d.edge===b.id)+'</div>'+
        '<div class="mr-sc3-grid"><div class="mr-sc3-metric"><span>RETURN GAP</span><b>'+pct(a.ret-b.ret)+'</b></div><div class="mr-sc3-metric"><span>XP GAP</span><b>'+Math.round(a.xp-b.xp)+'</b></div><div class="mr-sc3-metric"><span>TRADE GAP</span><b>'+Math.round(a.trades-b.trades)+'</b></div></div>'+
        '<div class="mr-sc3-actions"><button class="btn" data-duel="'+esc(b.id)+'">⚔️ Challenge '+esc(b.name)+'</button><button class="btn alt" data-close>Close</button></div>'+
        '<p class="notice" style="margin-top:10px">'+esc(d.disclaimer)+'</p>';
      m.querySelectorAll("[data-close]").forEach(x=>x.onclick=()=>m.remove());
      m.querySelector("[data-duel]")?.addEventListener("click",()=>invite(id,b.id,b.name,m));
    }catch(e){m.querySelector(".mr-sc3-box").insertAdjacentHTML("beforeend",'<div class="notice" style="margin-top:10px">Comparison unavailable right now.</div>')}
  }
  function player(p,win){
    return '<div class="mr-sc3-player '+(win?"mr-sc3-win":"")+'"><b>'+esc(p.name)+(win?" 🏆":"")+'</b><small>'+esc(p.region)+'</small><div class="mr-sc3-grid"><div class="mr-sc3-metric"><span>RETURN</span><b>'+pct(p.ret)+'</b></div><div class="mr-sc3-metric"><span>XP</span><b>'+p.xp+'</b></div><div class="mr-sc3-metric"><span>TRADES</span><b>'+p.trades+'</b></div></div></div>';
  }
  async function invite(from,to,name,m){
    const days=prompt("Duel duration in days (1–14):","7");if(days===null)return;
    try{
      const d=await api("/api/competitive/social/duels/invite",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({from,to,durationDays:Number(days)})});
      if(m)m.remove();
      toast("⚔️ Challenge sent to "+name+" • "+d.challenge.durationDays+" days");
      render();
    }catch(e){toast(e.message||"Challenge failed")}
  }
  function toast(msg){
    const t=document.createElement("div");t.className="notice";t.style.cssText="position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:100001;background:#071219;border:1px solid #28515d;padding:12px 15px;border-radius:14px;box-shadow:0 12px 40px #000";t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2800);
  }
  async function respond(challengeId,action){
    const a=me();if(!a?.id)return;
    try{await api("/api/competitive/social/duels/respond",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:a.id,challengeId,action})});render()}catch(e){toast(e.message||"Action failed")}
  }
  function activityText(x){
    const n=x.actorProfile?.name||"A player",t=x.targetProfile?.name||"a player";
    if(x.type==="DUEL_INVITE")return "⚔️ "+n+" challenged "+t+" to a paper duel.";
    if(x.type==="DUEL_ACCEPTED")return "✅ "+n+" accepted a paper duel with "+t+".";
    if(x.type==="DUEL_DECLINED")return "↩️ "+n+" declined a paper duel from "+t+".";
    return "• Social activity";
  }
  async function render(){
    const a=me(),c=card();if(!a?.id||!c)return;
    try{
      const [summary,duels,activity]=await Promise.all([
        api("/api/competitive/social/friends-summary/"+encodeURIComponent(a.id)),
        api("/api/competitive/social/duels/"+encodeURIComponent(a.id)),
        api("/api/competitive/social/activity/"+encodeURIComponent(a.id))
      ]);
      const incoming=duels.incoming||[],active=duels.active||[];
      c.innerHTML=
        '<div class="row"><div><strong>⚔️ Social Competition</strong><div class="muted">Compare friends, issue paper duels and track your competitive activity.</div></div><span class="badge">SOCIAL 3.0</span></div>'+
        '<div class="mr-sc3-grid"><div class="mr-sc3-metric"><span>FRIEND RANK</span><b>#'+(summary.rank||"—")+'</b></div><div class="mr-sc3-metric"><span>FRIEND NETWORK</span><b>'+(summary.total||0)+'</b></div><div class="mr-sc3-metric"><span>ACTIVE DUELS</span><b>'+active.length+'</b></div></div>'+
        '<div style="margin-top:14px"><div class="row"><strong>🏁 Your Friend Ranking</strong><span class="muted">Return</span></div><div class="mr-sc3-list">'+(summary.top||[]).map(p=>'<div class="mr-sc3-row"><span>#'+p.rank+'</span><div class="copy"><b>'+esc(p.name)+(p.id===a.id?" • YOU":"")+'</b><small>'+pct(p.ret)+' • '+p.xp+' XP</small></div>'+(p.id!==a.id?'<button class="btn alt" data-compare="'+esc(p.id)+'">Compare</button>':"")+'</div>').join("")+'</div></div>'+
        '<div style="margin-top:14px"><div class="row"><strong>📨 Duel Invitations</strong><span class="muted">'+incoming.length+' pending</span></div><div class="mr-sc3-list">'+(incoming.map(x=>'<div class="mr-sc3-row"><div class="copy"><b>⚔️ '+esc(x.fromProfile?.name||"Player")+'</b><small>'+x.durationDays+'-day paper duel</small></div><button class="btn" data-accept="'+esc(x.id)+'">Accept</button><button class="btn alt" data-decline="'+esc(x.id)+'">Decline</button></div>').join("")||'<div class="mr-sc3-empty">No pending duel invitations.</div>')+'</div></div>'+
        '<div style="margin-top:14px"><div class="row"><strong>📰 Social Activity</strong><span class="muted">Latest</span></div><div class="mr-sc3-list mr-sc3-activity">'+((activity.activities||[]).map(x=>'<div class="mr-sc3-row"><div class="copy"><b>'+esc(activityText(x))+'</b><small>'+new Date(x.createdAt).toLocaleString()+'</small></div></div>').join("")||'<div class="mr-sc3-empty">Your social activity will appear here.</div>')+'</div></div>'+
        '<p class="notice" style="margin-top:12px">All competition is simulated. Rankings and duel results are game metrics, not financial performance or trading advice.</p>';
      c.querySelectorAll("[data-compare]").forEach(x=>x.onclick=()=>compare(a.id,x.dataset.compare,"player"));
      c.querySelectorAll("[data-accept]").forEach(x=>x.onclick=()=>respond(x.dataset.accept,"accept"));
      c.querySelectorAll("[data-decline]").forEach(x=>x.onclick=()=>respond(x.dataset.decline,"decline"));
    }catch(e){c.innerHTML='<div class="row"><strong>⚔️ Social Competition 3.0</strong><span class="badge">OFFLINE</span></div><div class="lb-note" style="margin-top:10px">Social competition is temporarily unavailable. Your paper portfolio remains unaffected.</div>'}
  }
  function enhanceFriends(){
    const hub=document.getElementById("mrFriendsStaticHub");if(!hub||hub.dataset.mrSc3Friends==="1")return;
    hub.dataset.mrSc3Friends="1";
    hub.addEventListener("click",e=>{
      const btn=e.target.closest("[data-mr-remove]");if(btn)return;
      const row=e.target.closest(".lb-row");if(!row)return;
      const id=row.querySelector("[data-mr-remove]")?.dataset.mrRemove;if(!id)return;
      const a=me();if(!a?.id)return;
      const actions=row.querySelector(".lb-name")?.parentElement;
      if(actions&&!row.querySelector("[data-mr-compare]")){
        const b=document.createElement("button");b.className="btn alt";b.dataset.mrCompare=id;b.textContent="Compare";actions.appendChild(b);
      }
    });
    // Friends Hub re-renders rows; add compare buttons repeatedly without altering its logic.
    setInterval(()=>{
      hub.querySelectorAll("[data-mr-remove]").forEach(x=>{
        const row=x.closest(".lb-row");if(!row||row.querySelector("[data-mr-compare]"))return;
        const b=document.createElement("button");b.className="btn alt";b.dataset.mrCompare=x.dataset.mrRemove;b.textContent="Compare";row.appendChild(b);
        b.onclick=()=>compare(me()?.id,x.dataset.mrRemove,row.querySelector(".lb-name b")?.textContent||"friend");
      });
    },1000);
  }
  function boot(){css();enhanceFriends();render()}
  window.MaliRadarSocialCompetition={version:"3.0",refresh:render,compare};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,700));else setTimeout(boot,700);
  setInterval(()=>{enhanceFriends();render()},8000);
})();