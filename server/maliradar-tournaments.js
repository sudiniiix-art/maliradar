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
 const state=x=>Date.now()<Date.parse(x.start)?"UPCOMING":Date.now()>Date.parse(x.end)?"ENDED":"LIVE";
 app.get("/api/competitive/tournaments",(q,r)=>{const d=read(),id=String(q.query.id||""),e=d.tournamentEntries||[];r.json({tournaments:list.map(x=>({...x,status:state(x),joined:e.some(z=>z.tournamentId===x.id&&z.id===id)}))})});
 app.post("/api/competitive/tournaments/:id/join",(q,r)=>{const id=String(q.body?.id||""),t=list.find(x=>x.id===q.params.id);if(!t)return r.status(404).json({error:"Not found"});if(state(t)!=="UPCOMING")return r.status(400).json({error:"Closed"});const d=read(),u=(d.users||[]).find(x=>x.id===id);if(!u)return r.status(404).json({error:"Profile not found"});d.tournamentEntries=d.tournamentEntries||[];if(!d.tournamentEntries.some(x=>x.tournamentId===t.id&&x.id===id)){d.tournamentEntries.push({tournamentId:t.id,id,region:u.region||"global",joinedAt:new Date().toISOString(),base:Number(u.ret)||0});write(d)}r.json({ok:true})});
 app.get("/api/competitive/tournaments/:id/leaderboard",(q,r)=>{const t=list.find(x=>x.id===q.params.id);if(!t)return r.status(404).json({error:"Not found"});const d=read(),m=new Map((d.users||[]).map(x=>[x.id,x]));let a=(d.tournamentEntries||[]).filter(x=>x.tournamentId===t.id).map(x=>{const u=m.get(x.id);return u?{id:u.id,name:u.name||"MaliRadar User",region:u.region||"global",score:Number(u.ret||0)-Number(x.base||0)}:null}).filter(Boolean);if(t.region!=="global")a=a.filter(x=>String(x.region).toLowerCase()===t.region);a.sort((x,y)=>y.score-x.score);const ranked=a.slice(0,100).map((x,i)=>({...x,rank:i+1}));
const meId=String(q.query.userId||"");
const me=ranked.find(x=>x.id===meId)||null;
r.json({tournament:t,participants:ranked,user:me,rewards:t.rewards||[]})});
}
module.exports={registerMaliRadarTournaments};