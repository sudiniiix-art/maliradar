/* MaliRadar Player Progression 2.0
   Local progression + public profile cards. Paper trading only. */
(function(){
  "use strict";
  const STATE="maliradar_v07_state";
  const ACADEMY="maliradar_academy_v1";
  const PROG="maliradar_progression_v2";
  const ACCOUNT="maliradar_account_v1";

  const ACH=[
    {id:"navigator",icon:"🧭",name:"Navigator",desc:"Complete the guided navigation tour",xp:50},
    {id:"practice",icon:"🎯",name:"First Practice",desc:"Start the Trading Academy",xp:50},
    {id:"graduate",icon:"🎓",name:"Academy Graduate",desc:"Complete all 5 practice missions",xp:100},
    {id:"first-trade",icon:"📄",name:"First Trade",desc:"Complete your first paper trade",xp:50},
    {id:"active-trader",icon:"🔥",name:"Active Trader",desc:"Complete 5 paper trades",xp:75},
    {id:"dedicated",icon:"⚡",name:"Dedicated Trader",desc:"Complete 10 paper trades",xp:100},
    {id:"profitable",icon:"📈",name:"First Profit",desc:"Reach a positive verified portfolio return",xp:75},
    {id:"diversified",icon:"🧩",name:"Diversifier",desc:"Hold 3 or more different symbols",xp:75},
    {id:"challenger",icon:"🏁",name:"Challenger",desc:"Join a paper challenge",xp:50},
    {id:"top10",icon:"🏅",name:"Top 10",desc:"Finish a challenge in the top 10",xp:150},
    {id:"top3",icon:"🥉",name:"Podium",desc:"Finish a challenge in the top 3",xp:250},
    {id:"champion",icon:"🏆",name:"Champion",desc:"Win a challenge",xp:500}
  ];

  function read(k,f){try{return JSON.parse(localStorage.getItem(k)||"null")||f}catch(e){return f}}
  function state(){return read(STATE,{cash:100000,hold:{},history:[]})}
  function academy(){return read(ACADEMY,{})}
  function account(){return read(ACCOUNT,{id:"",name:"MaliRadar User"})}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function guided(){return !!localStorage.getItem("maliradar_guided_academy_completed")}
  function tradeCount(){const h=state().history;return Array.isArray(h)?h.length:0}
  function missionCount(){const a=academy();if(!a.started)return 0;return Math.min(5,Math.max(0,(Number(a.step)||0)+1))}
  function symbols(){const h=state().hold||{};return Object.keys(h).filter(k=>Number(h[k])>0)}
  function quoteMap(){return window.maliRadarProviderQuotes||{}}

  function portfolioReturn(){
    const s=state(), q=quoteMap();
    let value=Number(s.cash)||0, priced=true;
    Object.keys(s.hold||{}).forEach(sym=>{
      const p=Number(q[String(sym).toUpperCase()]?.price);
      if(Number.isFinite(p)) value+=(Number(s.hold[sym])||0)*p; else priced=false;
    });
    return {value,ret:(value-100000)/100000*100,priced};
  }

  function challengeState(){
    return {joined:localStorage.getItem("mr_joined_october-paper-2026")==="1",rank:0};
  }

  function evaluate(extra){
    const t=tradeCount(), m=missionCount(), pr=portfolioReturn(), c=challengeState();
    const earned={
      navigator:guided(),
      practice:!!academy().started,
      graduate:m>=5,
      "first-trade":t>=1,
      "active-trader":t>=5,
      dedicated:t>=10,
      profitable:pr.priced && pr.ret>0,
      diversified:symbols().length>=3,
      challenger:c.joined,
      top10:(extra?.rank||0)>=1 && (extra.rank||0)<=10,
      top3:(extra?.rank||0)>=1 && (extra.rank||0)<=3,
      champion:(extra?.rank||0)===1
    };
    return earned;
  }

  function save(earned){
    const old=read(PROG,{unlocked:[],xp:0});
    const unlocked=ACH.filter(a=>earned[a.id]).map(a=>a.id);
    const xp=ACH.reduce((n,a)=>n+(earned[a.id]?a.xp:0),0);
    const data={unlocked,xp,updatedAt:new Date().toISOString()};
    localStorage.setItem(PROG,JSON.stringify(data));
    localStorage.setItem("maliradar_xp",String(xp));
    localStorage.setItem("maliradar_achievements",JSON.stringify(unlocked));
    return {old,data};
  }

  function level(xp){
    if(xp>=1200)return {n:12,name:"Legend",next:1500};
    if(xp>=900)return {n:11,name:"Elite",next:1200};
    if(xp>=700)return {n:10,name:"Master",next:900};
    if(xp>=550)return {n:9,name:"Expert",next:700};
    if(xp>=420)return {n:8,name:"Veteran",next:550};
    if(xp>=320)return {n:7,name:"Specialist",next:420};
    if(xp>=240)return {n:6,name:"Trader",next:320};
    if(xp>=180)return {n:5,name:"Scholar",next:240};
    if(xp>=120)return {n:4,name:"Explorer",next:180};
    if(xp>=70)return {n:3,name:"Student",next:120};
    if(xp>=30)return {n:2,name:"Rookie",next:70};
    return {n:1,name:"Newcomer",next:30};
  }

  function styles(){
    if(document.getElementById("mrp2-css"))return;
    const s=document.createElement("style");s.id="mrp2-css";
    s.textContent=
      ".mrp2-level{font-size:34px;font-weight:1000;letter-spacing:-.03em}.mrp2-xpbar{height:8px;background:#10242d;border-radius:99px;overflow:hidden}.mrp2-xpbar>i{display:block;height:100%;background:linear-gradient(90deg,#20cfa0,#38c8ff);border-radius:99px}.mrp2-ach{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-top:12px}.mrp2-achitem{display:flex;align-items:center;gap:10px;padding:11px;border:1px solid #173642;border-radius:13px;background:#09171e}.mrp2-achitem.locked{opacity:.42}.mrp2-achitem .ico{font-size:25px}.mrp2-achitem .copy{flex:1}.mrp2-achitem small{display:block;color:#91aab1;font-size:11px;margin-top:3px}.mrp2-modal{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:16px}.mrp2-modalbox{width:min(560px,100%);max-height:88vh;overflow:auto;background:#071219;border:1px solid #20404b;border-radius:22px;padding:18px;box-shadow:0 25px 90px rgba(0,0,0,.6)}.mrp2-profilehero{display:flex;align-items:center;gap:13px}.mrp2-avatar{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:#102a35;font-size:30px;border:1px solid #28505e}.mrp2-close{float:right}.mrp2-profilegrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:14px}.mrp2-profilegrid .metric{min-height:65px}.mrp2-public-ach{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.mrp2-public-ach span{padding:6px 9px;border-radius:99px;border:1px solid #21434e;background:#0b2029;font-size:11px}";
    document.head.appendChild(s);
  }

  function accountCard(){
    const accountScreen=document.getElementById("accountScreen");
    if(!accountScreen)return null;
    let card=document.getElementById("mrp2ProgressCard");
    if(card)return card;
    card=document.createElement("div");card.className="card";card.id="mrp2ProgressCard";
    const privacy=Array.from(accountScreen.querySelectorAll(".card")).find(c=>/Privacy & Data/i.test(c.textContent||""));
    if(privacy)privacy.parentElement.insertBefore(card,privacy);
    else accountScreen.appendChild(card);
    return card;
  }

  function renderAccount(){
    styles();
    const card=accountCard();if(!card)return;
    const earned=evaluate(), saved=save(earned), x=saved.data.xp, l=level(x);
    const next=l.next, prev=l.n===1?0:([30,70,120,180,240,320,420,550,700,900,1200][l.n-2]||0);
    const pct=Math.min(100,Math.max(0,Math.round((x-prev)/Math.max(1,next-prev)*100)));
    const unlocked=ACH.filter(a=>earned[a.id]).length;
    card.innerHTML=
      '<div class="row"><div><b>🏆 Player Progression 2.0</b><div class="muted">Your permanent-style progression on this device.</div></div><span class="badge">LEVEL '+l.n+'</span></div>'+
      '<div style="margin-top:14px" class="mrp2-level">'+esc(l.name)+'</div>'+
      '<div class="row" style="margin-top:4px"><span class="muted">'+x+' XP • '+unlocked+' / '+ACH.length+' achievements</span><b>'+next+' XP</b></div>'+
      '<div class="mrp2-xpbar" style="margin-top:7px"><i style="width:'+pct+'%"></i></div>'+
      '<div class="row" style="margin-top:12px"><b>🏅 Trophy Cabinet</b><span class="muted">Tap earned badges to view progress</span></div>'+
      '<div class="mrp2-ach">'+ACH.map(a=>'<div class="mrp2-achitem '+(earned[a.id]?"earned":"locked")+'"><span class="ico">'+a.icon+'</span><div class="copy"><b>'+esc(a.name)+'</b><small>'+esc(a.desc)+' • +'+a.xp+' XP</small></div><strong>'+(earned[a.id]?"✓":"🔒")+'</strong></div>').join("")+'</div>'+
      '<p class="notice" style="margin-top:12px">Progression is a game/learning system. XP, levels and badges are not evidence of trading skill or future financial performance.</p>';
  }

  function profileData(row){
    const a=account(), s=state(), own=!row||row.id===a.id;
    const p=own?portfolioReturn():{ret:Number(row.ret)||0,value:100000+(Number(row.profit)||0),priced:true};
    const t=own?tradeCount():Number(row.trades)||0;
    const xp=own?Number(read(PROG,{xp:0}).xp||0):Number(row.xp)||0;
    const ach=own?ACH.filter(x=>evaluate()[x.id]):[];
    return {id:row?.id||a.id,name:row?.name||a.name||"MaliRadar User",region:row?.region||"global",xp,ret:p.ret,profit:own?p.value-100000:Number(row.profit)||0,trades:t,achievements:own?ach.length:Number(row.achievements)||0,ach};
  }

  function showProfile(row){
    styles();
    const p=profileData(row), l=level(p.xp);
    document.getElementById("mrp2ProfileModal")?.remove();
    const m=document.createElement("div");m.id="mrp2ProfileModal";m.className="mrp2-modal";
    m.innerHTML='<div class="mrp2-modalbox">'+
      '<button class="btn alt mrp2-close">✕ Close</button>'+
      '<div class="mrp2-profilehero"><div class="mrp2-avatar">'+(p.name===account().name?(read(ACCOUNT,{}).avatar||"👤"):"👤")+'</div><div><div style="font-size:22px;font-weight:900">'+esc(p.name)+'</div><div class="muted">MaliRadar player • '+esc(p.region)+'</div><span class="badge" style="margin-top:6px">LEVEL '+l.n+' • '+esc(l.name)+'</span></div></div>'+
      '<div class="mrp2-profilegrid"><div class="metric">XP<b>'+p.xp+'</b></div><div class="metric">Return<b>'+Number(p.ret).toFixed(2)+'%</b></div><div class="metric">Paper P/L<b>KSh '+Math.round(p.profit).toLocaleString("en-KE")+'</b></div><div class="metric">Trades<b>'+p.trades+'</b></div><div class="metric">Achievements<b>'+p.achievements+'</b></div><div class="metric">Region<b>'+esc(p.region)+'</b></div></div>'+
      (p.ach.length?'<div style="margin-top:14px;font-weight:800">🏅 Earned Badges</div><div class="mrp2-public-ach">'+p.ach.map(a=>'<span>'+a.icon+' '+esc(a.name)+'</span>').join("")+'</div>':'<div class="notice" style="margin-top:12px">This player has '+p.achievements+' recorded achievement'+(p.achievements===1?"":"s")+'. Detailed badge visibility is available for your own profile.</div>')+
      '<p class="notice" style="margin-top:14px">Paper simulation statistics only. No real-money performance or financial advice is represented here.</p></div>';
    document.body.appendChild(m);
    m.querySelector(".mrp2-close").onclick=()=>m.remove();
    m.onclick=e=>{if(e.target===m)m.remove()};
  }

  function hookLeaderboard(){
    const root=document.getElementById("leaderboardView");if(!root)return;
    if(root.dataset.mrp2Hook)return;
    root.dataset.mrp2Hook="1";
    root.addEventListener("click",e=>{
      const row=e.target.closest(".lb-row");if(!row)return;
      const name=row.querySelector(".lb-name b")?.textContent?.replace(/\s+•\s+YOU$/,"").trim()||"MaliRadar User";
      const rank=(row.querySelector(".lb-rank")?.textContent||"").replace("#","");
      const id=row.dataset.playerId||"";
      const metric=document.querySelector("#lbMetricTabs button.active")?.dataset.metric||"xp";
      loadRanking(metric).then(data=>{
        const found=(data?.participants||[]).find(x=>x.id===id)||{id,name};
        showProfile(found);
      });
    });
  }

  async function loadRanking(metric){
    try{
      const scope=document.querySelector("#lbScopeTabs button.active")?.dataset.scope||"global";
      const me=account();
      const extra=scope==="friends"&&me.id?"&id="+encodeURIComponent(me.id):"";
      const r=await fetch("/api/competitive/leaderboard?metric="+encodeURIComponent(metric)+"&scope="+encodeURIComponent(scope)+extra,{cache:"no-store"});
      if(!r.ok)return null;return await r.json();
    }catch(e){return null}
  }

  function decorateRows(){
    document.querySelectorAll("#leaderboardView .lb-row").forEach(row=>{
      const b=row.querySelector(".lb-name b");if(!b)return;
      const text=b.textContent||"";
      if(row.dataset.playerId)return;
      const you=/• YOU$/.test(text);
      if(you){row.dataset.playerId=account().id;row.style.cursor="pointer";return}
      const name=text.replace(/\s+•\s+YOU$/,"").trim();
      row.dataset.playerName=name;row.style.cursor="pointer";
      // The current leaderboard renderer may not expose IDs in the DOM.
      // Match by displayed name when opened; this keeps the UI compatible with v2.x.
      row.dataset.playerId="";
    });
  }

  async function challengeRank(){
    try{
      const me=account();if(!me.id)return 0;
      const r=await fetch("/api/competitive/challenges/october-paper-2026/leaderboard",{cache:"no-store"});
      const d=await r.json();const rows=d.participants||[];const i=rows.findIndex(x=>x.id===me.id);return i<0?0:i+1;
    }catch(e){return 0}
  }

  async function refresh(){
    const rank=await challengeRank();
    const earned=evaluate({rank}), saved=save(earned);
    renderAccount();
    decorateRows();
    return saved.data;
  }

  function boot(){
    styles();
    renderAccount();
    hookLeaderboard();
    decorateRows();
    refresh();
    setInterval(()=>{if(document.visibilityState==="visible"&&(document.getElementById("accountScreen")?.classList.contains("active")||document.getElementById("leaderboardView")?.classList.contains("active"))){renderAccount();decorateRows()}},12000);
    setInterval(()=>{if(document.visibilityState==="visible"&&(document.getElementById("accountScreen")?.classList.contains("active")||document.getElementById("leaderboardView")?.classList.contains("active")))refresh()},30000);
  }

  window.MaliRadarProgression={version:"2.0",achievements:ACH,refresh,showProfile,renderAccount};
  window.addEventListener("load",()=>setTimeout(boot,1000));
})();