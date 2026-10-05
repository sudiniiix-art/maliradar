/* MALIRADAR Challenge Dashboard 3.0 — resilient direct renderer */
(function(){
  "use strict";
  const KEY="mr_joined_october-paper-2026";
  const esc=v=>String(v==null?"":v).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const fallback={
    id:"october-paper-2026",
    title:"October Paper Challenge",
    start:"2026-10-01T00:00:00.000Z",
    end:"2026-10-31T23:59:59.999Z",
    startingCapital:100000,
    metric:"ret",
    mode:"Paper only",
    prizes:{first:50000,second:25000,third:15000,top10:5000,participant:1000},
    prizeCurrency:"KSh virtual credits"
  };
  let latest=fallback, busy=false;
  function account(){try{return JSON.parse(localStorage.getItem("maliradar_account_v1")||"null")}catch(e){return null}}
  function state(){try{return JSON.parse(localStorage.getItem("maliradar_v07_state")||"{}")}catch(e){return {}}}
  function status(c){
    const n=Date.now(), s=Date.parse(c.start), e=Date.parse(c.end);
    return n<s?"UPCOMING":n>e?"ENDED":"ACTIVE";
  }
  function fmtTime(ms){
    if(ms<=0)return "00d 00h 00m 00s";
    let x=Math.floor(ms/1000),d=Math.floor(x/86400);x%=86400;
    let h=Math.floor(x/3600);x%=3600;let m=Math.floor(x/60),s=x%60;
    return String(d).padStart(2,"0")+"d "+String(h).padStart(2,"0")+"h "+String(m).padStart(2,"0")+"m "+String(s).padStart(2,"0")+"s";
  }
  function findCard(){
    const root=document.getElementById("leaderboardView");
    if(!root)return null;
    let card=document.getElementById("mrChallengeV3");
    if(card)return card;
    const old=root.querySelector("#lbChallengeTitle")?.closest(".lb-card");
    if(old){old.id="mrChallengeV3";return old}
    const cards=[...root.querySelectorAll(".lb-card")];
    const hit=cards.find(x=>/October Paper Challenge|Monthly Paper Portfolio Challenge|beta challenge area/i.test(x.textContent||""));
    if(hit){hit.id="mrChallengeV3";return hit}
    return null;
  }
  async function getChallenge(){
    try{
      const r=await fetch("/api/competitive/challenges?_mr_challenge_v3="+Date.now(),{cache:"no-store"});
      if(!r.ok)throw 0;
      const j=await r.json();
      if(j&&Array.isArray(j.challenges)&&j.challenges[0])return {...fallback,...j.challenges[0]};
    }catch(e){}
    return {...fallback,status:status(fallback),joined:localStorage.getItem(KEY)==="1",localFallback:true};
  }
  function rankRows(rows,me){
    return (rows||[]).map((x,i)=>'<div class="mr-c3-row '+(x.id===me?"you":"")+'"><span>#'+(i+1)+'</span><b>'+esc(x.name||"MaliRadar User")+(x.id===me?" • YOU":"")+'</b><span>'+Number(x.ret||0).toFixed(2)+'%</span></div>').join("")||'<div class="mr-c3-empty">No challenge entrants yet. Join to appear on the board.</div>';
  }
  async function render(){
    if(busy)return;busy=true;
    try{
      const c=latest=await getChallenge(), st=c.status||status(c), joined=!!c.joined||localStorage.getItem(KEY)==="1";
      const card=findCard(); if(!card)return;
      const me=account(), s=state();
      const cash=Number(s.cash||100000), hold=s.hold||{}, q=window.maliRadarProviderQuotes||{};
      let value=cash;
      Object.keys(hold).forEach(sym=>{const p=Number(q[String(sym).toUpperCase()]?.price);if(Number.isFinite(p))value+=Number(hold[sym]||0)*p});
      const ret=(value-100000)/100000*100;
      const end=Date.parse(c.end), start=Date.parse(c.start);
      const countdown=st==="UPCOMING"?fmtTime(start-Date.now()):st==="ACTIVE"?fmtTime(end-Date.now()):"CHALLENGE ENDED";
      const joinedText=joined?"✓ JOINED":"NOT JOINED";
      card.innerHTML=
        '<div class="mr-c3-head"><div><div class="mr-c3-kicker">🏆 MONTHLY PAPER COMPETITION</div><h3 style="margin:5px 0">October Paper Challenge</h3><div class="muted">Server-recorded paper trading competition • no real money</div></div><span class="mr-c3-status '+st.toLowerCase()+'">'+st+'</span></div>'+
        '<div class="mr-c3-count">'+countdown+'</div>'+
        '<div class="mr-c3-grid">'+
          '<div><span>STARTING CAPITAL</span><b>KSh 100,000</b></div>'+
          '<div><span>MODE</span><b>Paper only</b></div>'+
          '<div><span>SCORING</span><b>Return %</b></div>'+
          '<div><span>YOUR RETURN</span><b>'+ret.toFixed(2)+'%</b></div>'+
        '</div>'+
        '<div class="mr-c3-prizes"><b>PRIZE LADDER • VIRTUAL CREDITS</b><div class="mr-c3-prize-row"><span>🥇 1st</span><strong>KSh 50,000</strong></div><div class="mr-c3-prize-row"><span>🥈 2nd</span><strong>KSh 25,000</strong></div><div class="mr-c3-prize-row"><span>🥉 3rd</span><strong>KSh 15,000</strong></div><div class="mr-c3-prize-row"><span>✦ Top 10</span><strong>KSh 5,000</strong></div><div class="mr-c3-prize-row"><span>◆ Participant</span><strong>KSh 1,000</strong></div></div>'+
        '<div class="mr-c3-actions"><button class="btn" id="mrC3Join" '+(joined||st==="ENDED"?"disabled":"")+'>'+joinedText+'</button><button class="btn alt" id="mrC3Refresh">↻ Refresh</button></div>'+
        '<div class="mr-c3-meta">Competition engine 3.0 • '+(c.localFallback?"offline-safe fallback":"server challenge API")+' • Data is simulated/paper only.</div>'+
        '<div class="mr-c3-board"><div class="row"><b>Challenge Leaderboard</b><span class="badge">RETURN SINCE JOIN</span></div><div id="mrC3Rows">Loading…</div></div>';
      if(!document.getElementById("mr-c3-css")){
        const style=document.createElement("style");style.id="mr-c3-css";style.textContent=
          ".mr-c3-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.mr-c3-kicker{font-size:10px;letter-spacing:.18em;font-weight:900;opacity:.8}.mr-c3-status{padding:6px 9px;border-radius:999px;font-size:10px;font-weight:900;border:1px solid rgba(255,255,255,.18)}.mr-c3-status.active{color:#8fffd9;border-color:rgba(80,240,190,.35)}.mr-c3-status.upcoming{color:#ffe08a}.mr-c3-status.ended{color:#ff9c9c}.mr-c3-count{font-size:27px;font-weight:1000;letter-spacing:.04em;margin:16px 0;text-align:center;padding:13px;border-radius:14px;background:linear-gradient(135deg,rgba(80,220,255,.1),rgba(255,255,255,.025));border:1px solid var(--line)}.mr-c3-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mr-c3-grid>div{padding:10px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.02)}.mr-c3-grid span{display:block;font-size:9px;color:var(--muted);letter-spacing:.08em}.mr-c3-grid b{display:block;margin-top:4px}.mr-c3-prizes{margin-top:12px;padding:12px;border:1px solid var(--line);border-radius:14px}.mr-c3-prize-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06)}.mr-c3-prize-row:last-child{border-bottom:0}.mr-c3-actions{display:flex;gap:8px;margin-top:12px}.mr-c3-actions button{flex:1}.mr-c3-meta{font-size:10px;color:var(--muted);margin-top:9px;text-align:center}.mr-c3-board{margin-top:13px;padding-top:12px;border-top:1px solid var(--line)}.mr-c3-row{display:grid;grid-template-columns:34px 1fr auto;gap:7px;align-items:center;padding:9px;border-bottom:1px solid rgba(255,255,255,.05)}.mr-c3-row.you{border:1px solid rgba(80,220,190,.4);border-radius:10px}.mr-c3-empty{padding:12px;color:var(--muted);font-size:12px}";
        document.head.appendChild(style);
      }
      const join=document.getElementById("mrC3Join"), refresh=document.getElementById("mrC3Refresh");
      join.onclick=async()=>{
        if(joined||st==="ENDED"||!me?.id)return;
        join.disabled=true;join.textContent="Joining…";
        try{
          const r=await fetch("/api/competitive/challenges/"+encodeURIComponent(c.id)+"/join",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:me.id}),cache:"no-store"});
          if(!r.ok)throw 0;
          localStorage.setItem(KEY,"1");
          await render();
        }catch(e){join.disabled=false;join.textContent="JOIN";join.title="Server is unavailable — try again after deployment."}
      };
      refresh.onclick=()=>render();
      const rows=document.getElementById("mrC3Rows");
      try{
        const controller=new AbortController();
        const timer=setTimeout(()=>controller.abort(),5000);
        const r=await fetch("/api/competitive/challenges/"+encodeURIComponent(c.id)+"/leaderboard?_mr_c3="+Date.now(),{cache:"no-store",signal:controller.signal});
        clearTimeout(timer);
        if(!r.ok)throw new Error("challenge leaderboard "+r.status);
        const j=await r.json();
        if(rows)rows.innerHTML=rankRows(j?.participants||[],me?.id);
      }catch(e){
        if(rows)rows.innerHTML='<div class="mr-c3-empty">'+(e?.name==="AbortError"?"Challenge rankings are taking too long to respond. Tap Refresh to retry.":"Challenge rankings are temporarily unavailable. Tap Refresh to retry.")+'</div>';
      }
    }finally{busy=false}
  }
  function boot(){
    render();
    setInterval(render,2000);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)render()});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,700));else setTimeout(boot,700);
  window.MaliRadarChallengeV3={version:"3.0",render};
})();