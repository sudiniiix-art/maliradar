/* MaliRadar Social Competition 3.0 — server layer
   Paper-simulation social features only. */
const fs=require("fs");
const path=require("path");

function registerMaliRadarSocialCompetition(app){
  const dbFile=path.join(__dirname,"..","data","demo-db.json");
  const read=()=>JSON.parse(fs.readFileSync(dbFile,"utf8"));
  const write=db=>fs.writeFileSync(dbFile,JSON.stringify(db,null,2));
  const now=()=>new Date().toISOString();
  const users=db=>new Map((db.users||[]).map(u=>[u.id,u]));
  const pairKey=(a,b)=>[a,b].sort().join("::");
  const clean=v=>String(v??"").slice(0,80);

  function ensure(db){
    if(!Array.isArray(db.socialChallenges))db.socialChallenges=[];
    if(!Array.isArray(db.socialActivity))db.socialActivity=[];
  }
  function user(db,id){return (db.users||[]).find(u=>u.id===id)}
  function addActivity(db,type,actor,target,meta={}){
    ensure(db);
    db.socialActivity.unshift({id:"sa-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),type,actor,target,meta,createdAt:now()});
    db.socialActivity=db.socialActivity.slice(0,500);
  }
  function snapshot(u){
    return {id:u.id,name:u.name||"MaliRadar User",region:u.region||"global",xp:Number(u.xp)||0,profit:Number(u.profit)||0,ret:Number(u.ret)||0,trades:Number(u.trades)||0,achievements:Number(u.achievements)||0};
  }
  function challengeRow(db,c){
    const u=user(db,c.id);
    if(!u)return null;
    return {
      id:u.id,name:u.name||"MaliRadar User",region:u.region||"global",
      ret:(Number(u.ret)||0)-(Number(c.baselineRet)||0),
      profit:(Number(u.profit)||0)-(Number(c.baselineProfit)||0),
      trades:Math.max(0,(Number(u.trades)||0)-(Number(c.baselineTrades)||0))
    };
  }

  // Friend activity feed: requests, friendships and social challenges.
  app.get("/api/competitive/social/activity/:id",(req,res)=>{
    const id=clean(req.params.id), db=read(); ensure(db);
    const friendIds=new Set((db.friends||[]).filter(f=>f.a===id||f.b===id).flatMap(f=>[f.a,f.b]).filter(x=>x!==id));
    const relevant=(db.socialActivity||[]).filter(a=>a.actor===id||a.target===id||friendIds.has(a.actor)||friendIds.has(a.target)).slice(0,30);
    const us=users(db);
    res.json({activities:relevant.map(a=>({...a,actorProfile:us.has(a.actor)?snapshot(us.get(a.actor)):null,targetProfile:us.has(a.target)?snapshot(us.get(a.target)):null}))});
  });

  // Friend-vs-friend comparison.
  app.get("/api/competitive/social/compare/:id/:friendId",(req,res)=>{
    const id=clean(req.params.id), friendId=clean(req.params.friendId), db=read();
    if(id===friendId)return res.status(400).json({error:"Choose two different players"});
    const linked=(db.friends||[]).some(f=>(f.a===id&&f.b===friendId)||(f.a===friendId&&f.b===id));
    if(!linked)return res.status(403).json({error:"Players must be friends first"});
    const a=user(db,id),b=user(db,friendId);
    if(!a||!b)return res.status(404).json({error:"Profile not found"});
    const score=u=>(Number(u.ret)||0)*10+(Number(u.xp)||0)*.01+(Number(u.trades)||0)*.1;
    res.json({a:snapshot(a),b:snapshot(b),edge:score(a)===score(b)?"TIED":score(a)>score(b)?a.id:b.id,disclaimer:"Paper-simulation comparison only; not a measure of real trading skill."});
  });

  // 1v1 paper duel invitations.
  app.post("/api/competitive/social/duels/invite",(req,res)=>{
    const {from,to,durationDays}=req.body||{},db=read(); ensure(db);
    if(!from||!to||from===to)return res.status(400).json({error:"Two different player IDs are required"});
    const a=user(db,from),b=user(db,to);
    if(!a||!b)return res.status(404).json({error:"Profile not found"});
    const linked=(db.friends||[]).some(f=>(f.a===from&&f.b===to)||(f.a===to&&f.b===from));
    if(!linked)return res.status(403).json({error:"Add this player as a friend first"});
    const days=Math.min(14,Math.max(1,Number(durationDays)||7));
    const existing=db.socialChallenges.find(x=>x.status==="pending"&&x.from===from&&x.to===to);
    if(existing)return res.json({ok:true,status:"pending",challenge:existing});
    const c={id:"duel-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),type:"HEAD_TO_HEAD",from,to,status:"pending",durationDays:days,createdAt:now(),updatedAt:now(),start:null,end:null};
    db.socialChallenges.push(c); addActivity(db,"DUEL_INVITE",from,to,{challengeId:c.id,durationDays:days}); write(db);
    res.json({ok:true,status:"pending",challenge:c});
  });

  app.get("/api/competitive/social/duels/:id",(req,res)=>{
    const id=clean(req.params.id),db=read();ensure(db);const us=users(db);
    const incoming=db.socialChallenges.filter(c=>c.to===id&&c.status==="pending").map(c=>({...c,fromProfile:us.has(c.from)?snapshot(us.get(c.from)):null}));
    const outgoing=db.socialChallenges.filter(c=>c.from===id&&c.status==="pending").map(c=>({...c,toProfile:us.has(c.to)?snapshot(us.get(c.to)):null}));
    const active=db.socialChallenges.filter(c=>(c.from===id||c.to===id)&&c.status==="active").map(c=>({...c,fromProfile:us.has(c.from)?snapshot(us.get(c.from)):null,toProfile:us.has(c.to)?snapshot(us.get(c.to)):null}));
    res.json({incoming,outgoing,active});
  });

  app.post("/api/competitive/social/duels/respond",(req,res)=>{
    const {id,challengeId,action}=req.body||{},db=read();ensure(db);
    const c=db.socialChallenges.find(x=>x.id===challengeId&&x.to===id&&x.status==="pending");
    if(!c)return res.status(404).json({error:"Challenge invitation not found"});
    if(action==="decline"){c.status="declined";c.updatedAt=now();addActivity(db,"DUEL_DECLINED",id,c.from,{challengeId});write(db);return res.json({ok:true,status:c.status});}
    if(action!=="accept")return res.status(400).json({error:"Invalid action"});
    const from=user(db,c.from),to=user(db,c.to); if(!from||!to)return res.status(404).json({error:"Profile not found"});
    c.status="active";c.start=now();c.end=new Date(Date.now()+c.durationDays*86400000).toISOString();
    c.baselines={
      [c.from]:{ret:Number(from.ret)||0,profit:Number(from.profit)||0,trades:Number(from.trades)||0},
      [c.to]:{ret:Number(to.ret)||0,profit:Number(to.profit)||0,trades:Number(to.trades)||0}
    };
    c.updatedAt=now();addActivity(db,"DUEL_ACCEPTED",id,c.from,{challengeId});write(db);
    res.json({ok:true,status:c.status,challenge:c});
  });

  app.get("/api/competitive/social/duels/:challengeId/leaderboard",(req,res)=>{
    const db=read();ensure(db);const c=db.socialChallenges.find(x=>x.id===req.params.challengeId);
    if(!c)return res.status(404).json({error:"Challenge not found"});
    const rows=[c.from,c.to].map(id=>{
      const u=user(db,id),base=c.baselines?.[id]||{};
      if(!u)return null;
      return {id:u.id,name:u.name||"MaliRadar User",region:u.region||"global",ret:(Number(u.ret)||0)-(Number(base.ret)||0),profit:(Number(u.profit)||0)-(Number(base.profit)||0),trades:Math.max(0,(Number(u.trades)||0)-(Number(base.trades)||0))};
    }).filter(Boolean).sort((a,b)=>b.ret-a.ret);
    if(c.status==="active"&&c.end&&Date.now()>Date.parse(c.end)){\n      c.status="completed";\n      const sorted=[...rows].sort((a,b)=>b.ret-a.ret);\n      c.winner=sorted.length===2?(sorted[0].ret===sorted[1].ret?null:sorted[0].id):null;\n      c.updatedAt=now();\n      write(db);\n    }
    res.json({challenge:{id:c.id,status:c.status,start:c.start,end:c.end,durationDays:c.durationDays},participants:rows});
  });

  // Friend-only leaderboard shortcut, with explicit rank and rank movement baseline.
  app.get("/api/competitive/social/friends-summary/:id",(req,res)=>{
    const id=clean(req.params.id),db=read(),me=user(db,id);
    if(!me)return res.status(404).json({error:"Profile not found"});
    const ids=new Set([id]);
    (db.friends||[]).forEach(f=>{if(f.a===id)ids.add(f.b);if(f.b===id)ids.add(f.a)});
    const rows=[...(db.users||[])].filter(u=>ids.has(u.id)).sort((a,b)=>(Number(b.ret)||0)-(Number(a.ret)||0));
    const rank=rows.findIndex(u=>u.id===id)+1;
    res.json({rank,total:rows.length,top:rows.slice(0,5).map((u,i)=>({...snapshot(u),rank:i+1}))});
  });
}

module.exports={registerMaliRadarSocialCompetition};
