/* MaliRadar Competitive Tournaments 5.2
   Brackets, seeded matchmaking, personal standings, history and one-time rewards.
   Paper simulation only. */
const fs=require("fs"),path=require("path");
function registerMaliRadarTournaments(app){
  const f=path.join(__dirname,"..","data","demo-db.json");
  const read=()=>JSON.parse(fs.readFileSync(f,"utf8"));
  const write=x=>fs.writeFileSync(f,JSON.stringify(x,null,2));
  const list=[
    {id:"global-sprint-7d",title:"Global 7-Day Sprint",region:"global",start:"2026-10-06T00:00:00.000Z",end:"2026-10-13T00:00:00.000Z",rewards:["🏆 Champion • 500 XP","🥈 Runner-up • 300 XP","🥉 Top 10 • 100 XP"]},
    {id:"kenya-cup-7d",title:"Kenya Paper Cup",region:"kenya",start:"2026-10-06T00:00:00.000Z",end:"2026-10-13T00:00:00.000Z",rewards:["🏆 Champion • 500 XP","🥈 Runner-up • 300 XP","🥉 Top 10 • 100 XP"]},
    {id:"global-24h",title:"24H Sprint",region:"global",start:"2026-10-10T00:00:00.000Z",end:"2026-10-11T00:00:00.000Z",rewards:["🏆 Champion • 250 XP","🥈 Runner-up • 150 XP","🥉 Top 10 • 50 XP"]}
  ];
  const state=t=>Date.now()<Date.parse(t.start)?"UPCOMING":Date.now()>Date.parse(t.end)?"ENDED":"LIVE";
  const event=id=>list.find(x=>x.id===id);
  const entries=(db,id,t)=> (db.tournamentEntries||[]).filter(x=>x.tournamentId===t.id&&(!id||x.id===id));
  const users=db=>new Map((db.users||[]).map(u=>[u.id,u]));
  const score=(u,e)=>Number(u?.ret||0)-Number(e?.base||0);
  const stableSeed=id=>{let n=2166136261;for(const c of String(id)){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0};
  function eligible(db,t){
    const us=users(db),arr=entries(db,"",t).map(e=>{const u=us.get(e.id);return u?{id:u.id,name:u.name||"MaliRadar User",region:u.region||"global",score:score(u,e),entry:e}:null}).filter(Boolean);
    return t.region==="global"?arr:arr.filter(x=>String(x.region).toLowerCase()===t.region);
  }
  function seed(arr){return [...arr].sort((a,b)=>stableSeed(a.id)-stableSeed(b.id));}
  function roundsFor(n){if(n<=1)return 0;return Math.ceil(Math.log2(n));}
  function roundWindow(t,r,total){
    const start=Date.parse(t.start),end=Date.parse(t.end),span=(end-start)/Math.max(1,total);
    return {start:start+span*r,end:r===total-1?end:start+span*(r+1)};
  }
  function buildBracket(t,arr){
    const seeded=seed(arr),size=Math.pow(2,roundsFor(seeded.length)),slots=seeded.slice(0,size);
    while(slots.length<size)slots.push(null);
    const total=roundsFor(seeded.length),out=[];
    let pairs=[];
    for(let i=0;i<size;i+=2)pairs.push([slots[i],slots[i+1]]);
    for(let r=0;r<total;r++){
      const w=roundWindow(t,r,total);
      out.push({round:r+1,name:r===total-1?"Final":r===total-2?"Semifinal":"Round "+(r+1),window:w,matches:[]});
      const next=[];
      pairs.forEach((pair,i)=>{
        const a=pair[0],b=pair[1],match={id:t.id+"-r"+(r+1)+"-"+(i+1),seedA:a?.id||null,seedB:b?.id||null};
        const active=Date.now()>=w.start,closed=Date.now()>=w.end;
        let winner=null,status="UPCOMING";
        if(!a&&!b)status="BYE";
        else if(a&&!b){winner=a.id;status=closed?"COMPLETED":"BYE";}
        else if(!a&&b){winner=b.id;status=closed?"COMPLETED":"BYE";}
        else if(closed){winner=a.score===b.score?null:(a.score>b.score?a.id:b.id);status=winner?"COMPLETED":"TIED";}
        else if(active)status="LIVE";
        match.winner=winner;match.status=status;match.scoreA=a?.score??null;match.scoreB=b?.score??null;
        out[r].matches.push(match);
        next.push(winner?arr.find(x=>x.id===winner)||null:null);
      });
      pairs=[];for(let i=0;i<next.length;i+=2)pairs.push([next[i],next[i+1]]);
    }
    return {size,rounds:out,seeded:seeded.map((x,i)=>({seed:i+1,id:x.id,name:x.name}))};
  }
  function finalize(db,t){
    if(Date.now()<=Date.parse(t.end))return false;
    const arr=eligible(db,t).sort((a,b)=>b.score-a.score);
    let changed=false;
    db.tournamentEntries=db.tournamentEntries||[];
    arr.forEach((x,i)=>{
      const e=x.entry;
      if(e.rewarded)return;
      let xp=0;if(i===0)xp=t.rewards?.[0]?Number(String(t.rewards[0]).match(/(\d+)\s*XP/)?.[1]||0):0;
      else if(i===1)xp=t.rewards?.[1]?Number(String(t.rewards[1]).match(/(\d+)\s*XP/)?.[1]||0):0;
      else if(i<10)xp=t.rewards?.[2]?Number(String(t.rewards[2]).match(/(\d+)\s*XP/)?.[1]||0):0;
      const u=(db.users||[]).find(z=>z.id===e.id);if(u&&xp){u.xp=(Number(u.xp)||0)+xp;e.rewardXp=xp;}
      e.rewarded=true;e.rewardedAt=new Date().toISOString();e.finalRank=i+1;changed=true;
    });
    return changed;
  }
  app.get("/api/competitive/tournaments",(q,r)=>{
    const d=read(),id=String(q.query.id||"");
    r.json({tournaments:list.map(t=>({...t,status:state(t),count:eligible(d,t).length,joined:(d.tournamentEntries||[]).some(e=>e.tournamentId===t.id&&e.id===id)}))});
  });
  app.post("/api/competitive/tournaments/:id/join",(q,r)=>{
    const id=String(q.body?.id||""),t=event(q.params.id);
    if(!t)return r.status(404).json({error:"Tournament not found"});
    if(state(t)!=="UPCOMING")return r.status(400).json({error:"Registration is closed"});
    const d=read(),u=(d.users||[]).find(x=>x.id===id);
    if(!u)return r.status(404).json({error:"Profile not found"});
    d.tournamentEntries=d.tournamentEntries||[];
    if(!d.tournamentEntries.some(x=>x.tournamentId===t.id&&x.id===id)){
      d.tournamentEntries.push({tournamentId:t.id,id,region:u.region||"global",joinedAt:new Date().toISOString(),base:Number(u.ret)||0});
      write(d);
    }
    r.json({ok:true,joined:true});
  });
  app.get("/api/competitive/tournaments/:id/leaderboard",(q,r)=>{
    const t=event(q.params.id);if(!t)return r.status(404).json({error:"Tournament not found"});
    const d=read();if(finalize(d,t))write(d);
    const arr=eligible(d,t).sort((a,b)=>b.score-a.score),ranked=arr.slice(0,100).map((x,i)=>({id:x.id,name:x.name,region:x.region,score:x.score,rank:i+1,finalRank:x.entry.finalRank||null,rewardXp:x.entry.rewardXp||0}));
    const me=ranked.find(x=>x.id===String(q.query.userId||""))||null;
    r.json({tournament:t,status:state(t),participants:ranked,user:me,rewards:t.rewards||[]});
  });
  app.get("/api/competitive/tournaments/:id/bracket",(q,r)=>{
    const t=event(q.params.id);if(!t)return r.status(404).json({error:"Tournament not found"});
    const d=read();if(finalize(d,t))write(d);
    const arr=eligible(d,t),b=buildBracket(t,arr),uid=String(q.query.userId||"");
    r.json({tournament:t,status:state(t),participantCount:arr.length,userId:uid,bracket:b,disclaimer:"Bracket results use paper-simulation return versus a locked entry baseline. They are game metrics, not financial advice."});
  });
  app.get("/api/competitive/tournaments/history",(q,r)=>{
    const d=read(),ended=list.filter(t=>state(t)==="ENDED").map(t=>({id:t.id,title:t.title,region:t.region,end:t.end,rewards:t.rewards,count:eligible(d,t).length}));
    r.json({history:ended});
  });
}
module.exports={registerMaliRadarTournaments};
