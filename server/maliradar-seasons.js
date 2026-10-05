/* MaliRadar Competitive Season System 4.0
   Persistent seasonal divisions, points, promotion/relegation projections,
   duel streaks and competitive badges. Paper simulation only. */
const fs=require("fs"),path=require("path");

function registerMaliRadarSeasons(app){
  const dbFile=path.join(__dirname,"..","data","demo-db.json");
  const read=()=>JSON.parse(fs.readFileSync(dbFile,"utf8"));
  const write=db=>fs.writeFileSync(dbFile,JSON.stringify(db,null,2));
  const now=()=>new Date().toISOString();
  const clean=v=>String(v??"").slice(0,80);
  const user=(db,id)=>(db.users||[]).find(u=>u.id===id);
  const seasonInfo=()=>{
    const d=new Date(),y=d.getUTCFullYear(),m=d.getUTCMonth();
    const q=Math.floor(m/3)+1,startMonth=(q-1)*3;
    const start=new Date(Date.UTC(y,startMonth,1)),end=new Date(Date.UTC(y,startMonth+3,0,23,59,59,999));
    return {id:"S"+q+"-"+y,name:"Season "+q+" • "+y,start:start.toISOString(),end:end.toISOString(),daysLeft:Math.max(0,Math.ceil((end-Date.now())/86400000))};
  };
  const division=(points)=>{
    const p=Number(points)||0;
    if(p>=1800)return {name:"Diamond",icon:"💎",min:1800};
    if(p>=1400)return {name:"Platinum",icon:"🏆",min:1400};
    if(p>=1000)return {name:"Gold",icon:"🥇",min:1000};
    if(p>=650)return {name:"Silver",icon:"🥈",min:650};
    return {name:"Bronze",icon:"🥉",min:0};
  };
  const profile=(db,id)=>{
    const u=user(db,id);if(!u)return null;
    const d=seasonInfo();
    const duels=(db.socialChallenges||[]).filter(c=>(c.from===id||c.to===id)&&c.type==="HEAD_TO_HEAD");
    const completed=duels.filter(c=>["completed","active"].includes(c.status));
    const wins=duels.filter(c=>c.status==="completed"&&c.winner===id).length;
    const losses=duels.filter(c=>c.status==="completed"&&c.winner&&c.winner!==id).length;
    const played=duels.filter(c=>["completed","active"].includes(c.status)).length;
    const baseReturn=Number(u.ret)||0, xp=Number(u.xp)||0,trades=Number(u.trades)||0,ach=Number(u.achievements)||0;
    const points=Math.max(0,Math.round(baseReturn*20)+Math.min(600,xp*.5)+Math.min(300,trades*3)+Math.min(200,ach*20)+wins*100-losses*30);
    let streak=0;
    const ordered=duels.filter(c=>c.status==="completed"&&c.winner).sort((a,b)=>Date.parse(b.updatedAt||b.end||b.createdAt)-Date.parse(a.updatedAt||a.end||a.createdAt));
    for(const c of ordered){if(c.winner===id)streak++;else break}
    return {id:u.id,name:u.name||"MaliRadar User",region:u.region||"global",points,division:division(points),wins,losses,played,streak,ret:baseReturn,xp,trades,achievements:ach,season:d};
  };
  function badges(p,rank,total){
    return [
      {id:"first-duel",icon:"⚔️",name:"First Duel",desc:"Complete your first paper duel.",earned:p.played>=1},
      {id:"three-wins",icon:"🔥",name:"Hot Streak",desc:"Win 3 paper duels.",earned:p.wins>=3},
      {id:"streak-five",icon:"⚡",name:"Unstoppable",desc:"Reach a 5-win streak.",earned:p.streak>=5},
      {id:"elite-ten",icon:"🏅",name:"Elite Ten",desc:"Finish inside the seasonal top 10.",earned:rank>0&&rank<=10},
      {id:"division-gold",icon:"🥇",name:"Gold Standard",desc:"Reach Gold division.",earned:["Gold","Platinum","Diamond"].includes(p.division.name)},
      {id:"veteran",icon:"🛡️",name:"Veteran",desc:"Complete 5 paper duels.",earned:p.played>=5}
    ];
  }
  function seasonReward(div,status){
    const rewards={Bronze:"Bronze Starter Badge",Silver:"Silver Division Badge",Gold:"Gold Division Badge",Platinum:"Platinum Division Badge",Diamond:"Diamond Division Badge"};
    return {division:div,status,reward:rewards[div]||"Season Reward",promotionBonus:status==="PROMOTION ZONE"?"Promotion candidate":"Keep competing"};
  }
  function rows(db){
    return (db.users||[]).map(u=>profile(db,u.id)).filter(Boolean).sort((a,b)=>b.points-a.points||b.ret-a.ret);
  }

  app.get("/api/competitive/season",(req,res)=>{
    const id=clean(req.query.id),db=read(),s=seasonInfo(),all=rows(db),me=id?profile(db,id):null;
    const rank=me?all.findIndex(x=>x.id===id)+1:0,total=all.length;
    const div=me?.division?.name||"Bronze";
    const thresholds={Bronze:{min:0,next:"Silver",nextMin:650},Silver:{min:650,next:"Gold",nextMin:1000},Gold:{min:1000,next:"Platinum",nextMin:1400},Platinum:{min:1400,next:"Diamond",nextMin:1800},Diamond:{min:1800,next:null,nextMin:null}};
    const prog=thresholds[div]||thresholds.Bronze;
    const progress=prog.next?Math.max(0,Math.min(100,Math.round(((me.points-prog.min)/(prog.nextMin-prog.min))*100))):100;
    const pointsToNext=prog.next?Math.max(0,prog.nextMin-me.points):0;
    const same=all.filter(x=>x.division.name===div);
    const divRank=me?same.findIndex(x=>x.id===id)+1:0;
    const promotion=Math.max(1,Math.ceil(same.length*.2)),relegation=Math.max(1,Math.floor(same.length*.2));
    const status=divRank&&divRank<=promotion&&div!=="Diamond"?"PROMOTION ZONE":divRank&&divRank>same.length-relegation&&div!=="Bronze"?"RELEGATION ZONE":"SAFE";
    res.json({season:s,player:me?{...me,rank,total,divisionRank:divRank,divisionSize:same.length,seasonStatus:status,badges:badges(me,rank,total),progress:{current:div,min:prog.min,next:prog.next,nextMin:prog.nextMin,percent:progress,pointsToNext},reward:seasonReward(div,status)}:null,standings:all.slice(0,50).map((x,i)=>({...x,rank:i+1,badges:badges(x,i+1,total)})),rules:{promotionTopPercent:20,relegationBottomPercent:20,points:"Return + learning/activity + competitive results",disclaimer:"Season points, divisions and badges are simulated game metrics. They are not a measure of real trading skill or future returns."}});
  });

  app.get("/api/competitive/season/history/:id",(req,res)=>{
    const db=read(),id=clean(req.params.id),history=Array.isArray(db.seasonHistory)?db.seasonHistory.filter(x=>x.id===id):[];
    res.json({history});
  });

  // Finalize the current season for a player. Admin-free and idempotent.
  app.post("/api/competitive/season/snapshot",(req,res)=>{
    const {id}=req.body||{},db=read();if(!id)return res.status(400).json({error:"MaliRadar ID required"});
    const p=profile(db,clean(id));if(!p)return res.status(404).json({error:"Profile not found"});
    if(!Array.isArray(db.seasonHistory))db.seasonHistory=[];
    const existing=db.seasonHistory.find(x=>x.season===p.season.id&&x.id===p.id);
    const all=rows(db),rank=all.findIndex(x=>x.id===p.id)+1;
    const record={season:p.season.id,name:p.name,id:p.id,division:p.division.name,points:p.points,rank,wins:p.wins,losses:p.losses,streak:p.streak,endedAt:now()};
    if(existing)Object.assign(existing,record);else db.seasonHistory.unshift(record);
    db.seasonHistory=db.seasonHistory.slice(0,500);write(db);
    res.json({ok:true,record});
  });
}

module.exports={registerMaliRadarSeasons};
