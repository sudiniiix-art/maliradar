/* MALIRADAR Competitive Ecosystem 6.0
   Integrates tournaments, seasons, duels, friends, achievements and competition history.
   Paper-simulation only. */
const fs=require("fs"),path=require("path");
function registerMaliRadarCompetition6(app){
  const dbFile=path.join(__dirname,"..","data","demo-db.json");
  const read=()=>JSON.parse(fs.readFileSync(dbFile,"utf8"));
  const clean=v=>String(v??"").slice(0,80);
  const user=(db,id)=>(db.users||[]).find(u=>u.id===id);
  const tournamentDefs=[
    {id:"global-sprint-7d",title:"Global 7-Day Sprint",region:"global",start:"2026-10-06T00:00:00.000Z",end:"2026-10-13T00:00:00.000Z"},
    {id:"kenya-cup-7d",title:"Kenya Paper Cup",region:"kenya",start:"2026-10-06T00:00:00.000Z",end:"2026-10-13T00:00:00.000Z"},
    {id:"global-24h",title:"24H Sprint",region:"global",start:"2026-10-10T00:00:00.000Z",end:"2026-10-11T00:00:00.000Z"}
  ];
  const state=t=>Date.now()<Date.parse(t.start)?"UPCOMING":Date.now()>Date.parse(t.end)?"ENDED":"LIVE";
  function duelStats(db,id){
    const cs=(db.socialChallenges||[]).filter(c=>(c.from===id||c.to===id)&&c.type==="HEAD_TO_HEAD");
    const completed=cs.filter(c=>c.status==="completed"&&c.winner);
    const wins=completed.filter(c=>c.winner===id).length;
    const losses=completed.filter(c=>c.winner&&c.winner!==id).length;
    let streak=0;
    [...completed].sort((a,b)=>Date.parse(b.updatedAt||b.end||b.createdAt)-Date.parse(a.updatedAt||a.end||a.createdAt)).some(c=>{if(c.winner===id){streak++;return false}return true});
    return {played:cs.filter(c=>["active","completed"].includes(c.status)).length,wins,losses,streak};
  }
  function tournamentStats(db,id){
    const es=(db.tournamentEntries||[]).filter(e=>e.id===id);
    return {
      played:es.length,
      wins:es.filter(e=>Number(e.finalRank)===1).length,
      top10:es.filter(e=>Number(e.finalRank)>0&&Number(e.finalRank)<=10).length,
      bestFinish:es.filter(e=>Number(e.finalRank)>0).reduce((m,e)=>Math.min(m,Number(e.finalRank)),Infinity),
      entries:es.map(e=>{
        const t=tournamentDefs.find(x=>x.id===e.tournamentId);
        return {id:e.tournamentId,title:t?.title||e.tournamentId,region:t?.region||e.region||"global",joinedAt:e.joinedAt,finalRank:e.finalRank||null,rewardXp:e.rewardXp||0,status:t?state(t):"UNKNOWN"};
      })
    };
  }
  function seasonSnapshot(db,id){
    const u=user(db,id);if(!u)return null;
    const d=duelStats(db,id),t=tournamentStats(db,id);
    const ret=Number(u.ret)||0,xp=Number(u.xp)||0,trades=Number(u.trades)||0,ach=Number(u.achievements)||0;
    const tournamentPoints=t.played? t.entries.reduce((sum,e)=>e.finalRank?(Number(e.finalRank)===1?250:Number(e.finalRank)===2?150:Number(e.finalRank)<=10?75:25):10,0):0;
    const points=Math.max(0,Math.round(ret*20)+Math.min(600,xp*.5)+Math.min(300,trades*3)+Math.min(200,ach*20)+d.wins*100-d.losses*30+tournamentPoints);
    const division=points>=1800?"Diamond":points>=1400?"Platinum":points>=1000?"Gold":points>=650?"Silver":"Bronze";
    return {points,division,ret,xp,trades,duels:d,tournaments:t,tournamentPoints};
  }
  function achievements(db,id,season){
    const t=season.tournaments,d=season.duels;
    const history=Array.isArray(db.seasonHistory)?db.seasonHistory.filter(x=>x.id===id):[];
    const all=(db.users||[]).map(u=>({id:u.id,points:seasonSnapshot(db,u.id)?.points||0,division:seasonSnapshot(db,u.id)?.division||"Bronze"}));
    const same=all.filter(x=>x.division===season.division).sort((a,b)=>b.points-a.points);
    const currentRank=Math.max(0,same.findIndex(x=>x.id===id)+1);
    const promotionZone=Math.max(1,Math.ceil(same.length*.2));
    const promoted=currentRank>0&&currentRank<=promotionZone&&season.division!=="Diamond";
    const items=[
      {id:"first-tournament",icon:"🌍",name:"First Tournament",desc:"Enter your first paper tournament.",earned:t.played>=1},
      {id:"tournament-winner",icon:"🏆",name:"Tournament Winner",desc:"Win a paper tournament.",earned:t.wins>=1},
      {id:"top10-tournament",icon:"🥇",name:"Tournament Top 10",desc:"Finish a paper tournament in the top 10.",earned:t.top10>=1},
      {id:"five-tournaments",icon:"🎟️",name:"Five Entries",desc:"Enter 5 paper tournaments.",earned:t.played>=5},
      {id:"ten-duel-wins",icon:"⚔️",name:"Duel Master",desc:"Win 10 paper duels.",earned:d.wins>=10},
      {id:"season-promoted",icon:"📈",name:"Season Promoted",desc:"Reach a promotion-zone position in a season.",earned:promoted},
      {id:"diamond",icon:"💎",name:"Diamond Division",desc:"Reach Diamond in the current season.",earned:season.division==="Diamond"},
      {id:"global-champion",icon:"🌐",name:"Global Champion",desc:"Win a global paper tournament.",earned:t.entries.some(e=>e.region==="global"&&Number(e.finalRank)===1)}
    ];
    return items;
  }
  function rankFor(db,id){
    const rows=(db.users||[]).map(u=>({id:u.id,score:seasonSnapshot(db,u.id)?.points||0})).sort((a,b)=>b.score-a.score);
    const i=rows.findIndex(x=>x.id===id);return i<0?null:i+1;
  }
  function notifications(db,id,season){
    const out=[],now=Date.now(),duels=(db.socialChallenges||[]).filter(c=>c.to===id&&c.status==="pending");
    duels.slice(0,5).forEach(c=>out.push({id:"duel-"+c.id,type:"DUEL",title:"⚔️ Friend challenge",message:"You have a pending paper duel invitation.",priority:"high"}));
    tournamentDefs.forEach(t=>{
      const diff=Date.parse(t.start)-now;
      const joined=(db.tournamentEntries||[]).some(e=>e.id===id&&e.tournamentId===t.id);
      if(joined&&state(t)==="LIVE")out.push({id:"live-"+t.id,type:"TOURNAMENT",title:"🌍 Tournament is live",message:t.title+" is now live.",priority:"high"});
      else if(joined&&state(t)==="UPCOMING"&&diff<=86400000&&diff>0)out.push({id:"soon-"+t.id,type:"TOURNAMENT",title:"⏱️ Tournament starts soon",message:t.title+" starts within 24 hours.",priority:"normal"});
    });
    if(season?.division!=="Diamond"&&season?.points>=650){
      const same=(db.users||[]).map(u=>seasonSnapshot(db,u.id)).filter(Boolean).filter(x=>x.division===season.division).sort((a,b)=>b.points-a.points);
      const me=same.findIndex(x=>x.points===season.points);
      const promo=Math.max(1,Math.ceil(same.length*.2));
      if(me>=0&&me<promo)out.push({id:"promotion-"+season.division,type:"SEASON",title:"📈 Promotion zone",message:"You are currently inside the promotion zone.",priority:"high"});
    }
    return out;
  }
  app.get("/api/competitive/ecosystem",(req,res)=>{
    const id=clean(req.query.id),db=read(),u=user(db,id);
    if(!u)return res.status(404).json({error:"Profile not found"});
    const season=seasonSnapshot(db,id),rank=rankFor(db,id),ach=achievements(db,id,season),notes=notifications(db,id,season);
    const friends=(db.friends||[]).filter(f=>f.a===id||f.b===id).map(f=>f.a===id?f.b:f.a);
    const history=[];
    (db.seasonHistory||[]).filter(x=>x.id===id).slice(0,20).forEach(x=>history.push({type:"SEASON",date:x.endedAt||x.createdAt||null,title:x.season+" • "+(x.division||"Season"),detail:"#"+(x.rank||"—")+" • "+(x.points||0)+" pts"}));
    season.tournaments.entries.filter(e=>e.status==="ENDED"||e.finalRank).forEach(e=>history.push({type:"TOURNAMENT",date:e.joinedAt,title:e.title,detail:e.finalRank?"Final #"+e.finalRank+(e.rewardXp?" • +"+e.rewardXp+" XP":""):"Entered"}));
    (db.socialChallenges||[]).filter(c=>(c.from===id||c.to===id)&&c.status==="completed").slice(0,20).forEach(c=>history.push({type:"DUEL",date:c.updatedAt||c.end,title:"Paper Duel",detail:c.winner===id?"Win":"Loss"}));
    history.sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0));
    res.json({version:"6.0",player:{id:u.id,name:u.name||"MaliRadar User",region:u.region||"global"},season:{points:season.points,division:season.division,rank,tournamentPoints:season.tournamentPoints},duels:season.duels,tournaments:{played:season.tournaments.played,wins:season.tournaments.wins,top10:season.tournaments.top10,bestFinish:isFinite(season.tournaments.bestFinish)?season.tournaments.bestFinish:null,entries:season.tournaments.entries.slice(-10).reverse()},achievements:ach.filter(x=>x.earned),achievementCatalog:ach,friends:{count:friends.length,ids:friends.slice(0,50)},history:history.slice(0,40),notifications:notes,disclaimer:"All competition data is simulated. Tournament, season, duel, XP and achievement metrics are game/learning metrics, not real trading skill, financial performance or investment advice."});
  });
  app.get("/api/competitive/ecosystem/notifications/:id",(req,res)=>{
    const id=clean(req.params.id),db=read(),s=seasonSnapshot(db,id);
    if(!s)return res.status(404).json({error:"Profile not found"});
    res.json({notifications:notifications(db,id,s)});
  });
}
module.exports={registerMaliRadarCompetition6};
