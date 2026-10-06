const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Inject the latest client-side modules without requiring duplicate HTML entrypoints.
app.use((req,res,next)=>{
  if(req.method==="GET" && req.path==="/"){
    const file=path.join(__dirname,"public","index.html");
    let html=fs.readFileSync(file,"utf8");
    const tag='<script src="/maliradar-order-ticket.js"></script><script src="/maliradar-guided-academy.js"></script><script src="/maliradar-learning-profile.js"></script><script src="/maliradar-account-center.js"></script><script src="/maliradar-progression.js?v=5.2.1"></script><script src="/maliradar-friends-hub.js?v=5.2.1"></script><script src="/maliradar-social-competition.js?v=5.2.1"></script><script src="/maliradar-seasons.js?v=5.2.1"></script><script src="/maliradar-competitive-profile.js?v=5.2.1"></script><script src="/maliradar-tournaments.js?v=6.0"></script><script src="/maliradar-competition-6.js?v=6.0"></script><script src="/maliradar-smart-assist-2.js?v=7.0"></script><script src="/maliradar-command-center.js?v=8.0"></script><script src="/maliradar-personal-intelligence-8-2.js?v=8.2"></script><script src="/maliradar-adaptive-radar-8-3.js?v=8.3"></script><script src="/maliradar-alert-command-center-2.js?v=2.2"></script><script src="/maliradar-alert-intelligence-4.js?v=4.0"></script><script src="/maliradar-market-intelligence-9.js?v=9.4"></script><script src="/maliradar-opportunity-radar-2.js?v=2.0"></script><script src="/maliradar-stock-intelligence-3.js?v=3.2"></script><script src="/maliradar-watchlist-3.js?v=8.0"></script><script src="/maliradar-watchlist-add-fix.js?v=8.1"></script>';
    if(!html.includes(tag)) html=html.replace("</body>",tag+"</body>");
    res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma","no-cache");
    res.setHeader("Expires","0");
    res.type("html").send(html);
    return;
  }
  next();
});

const staticOptions = {
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
};

app.use(express.static(path.join(__dirname, "public"), staticOptions));

const dataDir = path.join(__dirname, "data");
const dbFile = path.join(dataDir, "demo-db.json");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, {recursive:true});
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify({users:[],portfolios:[],transactions:[],watchlists:[],alerts:[]}, null, 2));
}
function readDB(){ return JSON.parse(fs.readFileSync(dbFile,"utf8")); }
function writeDB(db){ fs.writeFileSync(dbFile, JSON.stringify(db,null,2)); }
function pushReady(){
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}
let webPush=null;
try{ webPush=require("web-push"); }catch(e){ console.warn("Web Push package unavailable; push notifications disabled until dependency is installed."); }
if(webPush && pushReady()){
  webPush.setVapidDetails(process.env.VAPID_SUBJECT||"mailto:admin@maliradar.app",process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
}
function pushDB(){
  const db=readDB();
  if(!Array.isArray(db.pushSubscriptions))db.pushSubscriptions=[];
  return db;
}
app.get("/api/push/config",(req,res)=>{
  res.json({enabled:!!(webPush&&pushReady()),publicKey:process.env.VAPID_PUBLIC_KEY||null});
});
app.post("/api/push/subscribe",(req,res)=>{
  if(!(webPush&&pushReady()))return res.status(503).json({ok:false,error:"Push notifications are not configured on the server yet."});
  const {clientId,subscription,alerts,enabled}=req.body||{};
  if(!clientId||typeof clientId!=="string"||clientId.length>120||!subscription?.endpoint)return res.status(400).json({ok:false,error:"Invalid push subscription."});
  const db=pushDB(), i=db.pushSubscriptions.findIndex(x=>x.clientId===clientId);
  const item={clientId,subscription,alerts:Array.isArray(alerts)?alerts.filter(a=>a&&a.active).slice(0,100):[],enabled:enabled!==false,updatedAt:new Date().toISOString()};
  if(i>=0)db.pushSubscriptions[i]=item;else db.pushSubscriptions.push(item);
  writeDB(db);res.json({ok:true});
});
app.post("/api/push/unsubscribe",(req,res)=>{
  const {clientId}=req.body||{}; if(!clientId)return res.status(400).json({ok:false});
  const db=pushDB();db.pushSubscriptions=db.pushSubscriptions.filter(x=>x.clientId!==clientId);writeDB(db);res.json({ok:true});
});
app.post("/api/push/sync",(req,res)=>{
  const {clientId,alerts,enabled}=req.body||{};
  if(!clientId)return res.status(400).json({ok:false});
  const db=pushDB(),x=db.pushSubscriptions.find(x=>x.clientId===clientId);
  if(!x)return res.status(404).json({ok:false,error:"Push subscription not found."});
  x.alerts=Array.isArray(alerts)?alerts.filter(a=>a&&a.active).slice(0,100):[];
  x.enabled=enabled!==false;x.updatedAt=new Date().toISOString();writeDB(db);res.json({ok:true});
});
async function pushAlertSweep(){
  if(!(webPush&&pushReady()))return;
  const db=pushDB(); let changed=false;
  for(const item of db.pushSubscriptions){
    if(!item.enabled||!item.subscription||!Array.isArray(item.alerts)||!item.alerts.length)continue;
    const alerts=item.alerts, symbols=[...new Set(alerts.filter(a=>a.type!=="market"&&a.type!=="data"&&a.type!=="smart"&&a.symbol).map(a=>String(a.symbol).toUpperCase().split(".")[0]))];
    if(!symbols.length)continue;
    try{
      const u="http://127.0.0.1:"+PORT+"/api/market-data/quotes?market=NSE&symbols="+encodeURIComponent(symbols.join(","))+"&_push="+Date.now();
      const rr=await fetch(u); if(!rr.ok)continue;
      const body=await rr.json(); const qs=Array.isArray(body?.quotes)?body.quotes:[];
      const map=new Map(qs.map(q=>[String(q.localSymbol||q.symbol||"").toUpperCase().split(".")[0],q]));
      const nowMs=Date.now();
      for(const a of alerts){
        if(!a.active||!a.symbol)continue;
        const q=map.get(String(a.symbol).toUpperCase().split(".")[0]); if(!q)continue;
        const price=Number(q.price),move=Number(q.changePct??q.change??q.percentChange);
        if(!Number.isFinite(price))continue;
        let hit=false,reason="";
        if(a.type==="price")hit=a.operator==="below"?price<=Number(a.value):price>=Number(a.value),reason="Price reached KSh "+price.toFixed(2);
        else if(a.type==="move")hit=Number.isFinite(move)&&(a.operator==="down"?move<=-Math.abs(Number(a.value)):move>=Math.abs(Number(a.value))),reason="Observed move "+move.toFixed(2)+"%";
        if(!hit)continue;
        const last=Date.parse(a.lastPushAt||""); const cooldown=Math.max(5,Number(a.cooldownMinutes)||30)*60000;
        if(Number.isFinite(last)&&nowMs-last<cooldown)continue;
        a.lastPushAt=new Date().toISOString();a.lastPushPrice=price;
        const payload={title:"MaliRadar Alert • "+a.symbol,body:reason+" • "+String(a.priority||"WATCH").toUpperCase(),tag:"maliradar-"+a.id,url:"/"};
        try{await webPush.sendNotification(item.subscription,JSON.stringify(payload),{TTL:300});}
        catch(err){if(err?.statusCode===404||err?.statusCode===410){item.enabled=false;item.pushError="subscription expired";}else item.pushError=String(err?.message||err).slice(0,180);}
        changed=true;
      }
    }catch(e){ item.pushError=String(e?.message||e).slice(0,180); }
  }
  if(changed)writeDB(db);
}
setInterval(()=>{pushAlertSweep().catch(()=>{})},60000);


// Competitive profile + leaderboard beta. Uses the existing demo DB; no real-money data.
app.post("/api/competitive/profile",(req,res)=>{
  const {id,name,region,xp,profit,ret,trades,achievements}=req.body||{};
  if(!id||typeof id!=="string"||id.length>80) return res.status(400).json({error:"Invalid MaliRadar ID"});
  const db=readDB(); if(!Array.isArray(db.users)) db.users=[];
  let u=db.users.find(x=>x.id===id);
  if(!u){u={id,createdAt:new Date().toISOString()};db.users.push(u);}
  u.name=String(name||"MaliRadar User").slice(0,24);
  u.region=String(region||"global").slice(0,32);
  u.xp=Number.isFinite(Number(xp))?Number(xp):0;
  u.profit=Number.isFinite(Number(profit))?Number(profit):0;
  u.ret=Number.isFinite(Number(ret))?Number(ret):0;
  u.trades=Number.isFinite(Number(trades))?Number(trades):0;
  u.achievements=Number.isFinite(Number(achievements))?Number(achievements):0;
  u.updatedAt=new Date().toISOString();
  writeDB(db); res.json({ok:true,profile:u});
});
app.get("/api/competitive/profile/search",(req,res)=>{
  const q=String(req.query.q||"").trim().toLowerCase();
  if(q.length<2)return res.json({profiles:[]});
  const db=readDB();
  const profiles=(db.users||[]).filter(u=>String(u.id).toLowerCase().includes(q)||String(u.name||"").toLowerCase().includes(q)).slice(0,10)
    .map(u=>({id:u.id,name:u.name,region:u.region}));
  res.json({profiles});
});
app.post("/api/competitive/friends/add",(req,res)=>{
  const {id,friendId}=req.body||{};
  if(!id||!friendId||id===friendId)return res.status(400).json({error:"Two different MaliRadar IDs are required"});
  const db=readDB(); if(!Array.isArray(db.users))db.users=[];
  if(!db.users.some(u=>u.id===id)||!db.users.some(u=>u.id===friendId))return res.status(404).json({error:"Profile not found"});
  if(!Array.isArray(db.friendRequests))db.friendRequests=[];
  if(!Array.isArray(db.friends))db.friends=[];
  const accepted=db.friends.some(f=>(f.a===id&&f.b===friendId)||(f.a===friendId&&f.b===id));
  if(accepted)return res.json({ok:true,status:"friend"});
  const incoming=db.friendRequests.find(r=>r.from===friendId&&r.to===id&&r.status==="pending");
  if(incoming){incoming.status="accepted";incoming.updatedAt=new Date().toISOString();db.friends.push({a:id,b:friendId,createdAt:new Date().toISOString()});writeDB(db);return res.json({ok:true,status:"friend"});}
  const existing=db.friendRequests.find(r=>r.from===id&&r.to===friendId&&r.status==="pending");
  if(existing)return res.json({ok:true,status:"pending"});
  db.friendRequests.push({id:"fr-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),from:id,to:friendId,status:"pending",createdAt:new Date().toISOString()});
  writeDB(db); res.json({ok:true,status:"pending"});
});
app.get("/api/competitive/friends/:id",(req,res)=>{
  const id=String(req.params.id||"");
  const db=readDB(); if(!Array.isArray(db.friendRequests))db.friendRequests=[];
  if(!Array.isArray(db.friends))db.friends=[];
  const users=new Map((db.users||[]).map(u=>[u.id,u]));
  const incoming=db.friendRequests.filter(r=>r.to===id&&r.status==="pending").map(r=>{const u=users.get(r.from);return u?{id:u.id,name:u.name,region:u.region}:null}).filter(Boolean);
  const outgoing=db.friendRequests.filter(r=>r.from===id&&r.status==="pending").map(r=>r.to);
  const friends=db.friends.filter(f=>f.a===id||f.b===id).map(f=>users.get(f.a===id?f.b:f.a)).filter(Boolean).map(u=>({id:u.id,name:u.name,region:u.region}));
  res.json({friends,incoming,outgoing});
});
app.post("/api/competitive/friends/respond",(req,res)=>{
  const {id,friendId,action}=req.body||{};
  if(!id||!friendId||!["accept","decline"].includes(action))return res.status(400).json({error:"Invalid friend response"});
  const db=readDB(); if(!Array.isArray(db.friendRequests))db.friendRequests=[]; if(!Array.isArray(db.friends))db.friends=[];
  const r=db.friendRequests.find(x=>x.from===friendId&&x.to===id&&x.status==="pending");
  if(!r)return res.status(404).json({error:"Friend request not found"});
  r.status=action==="accept"?"accepted":"declined";r.updatedAt=new Date().toISOString();
  if(action==="accept"&&!db.friends.some(f=>(f.a===id&&f.b===friendId)||(f.a===friendId&&f.b===id)))db.friends.push({a:id,b:friendId,createdAt:new Date().toISOString()});
  writeDB(db);res.json({ok:true,status:r.status});
});
app.delete("/api/competitive/friends/:id/:friendId",(req,res)=>{
  const {id,friendId}=req.params;const db=readDB();if(!Array.isArray(db.friends))db.friends=[];
  db.friends=db.friends.filter(f=>!((f.a===id&&f.b===friendId)||(f.a===friendId&&f.b===id)));
  writeDB(db);res.json({ok:true,removed:true});
});
app.get("/api/competitive/leaderboard",(req,res)=>{
  const metric=["xp","profit","ret","trades"].includes(req.query.metric)?req.query.metric:"xp";
  const requestedScope=String(req.query.scope||"global").toLowerCase();
  const scope=["global","kenya","friends"].includes(requestedScope)?requestedScope:"global";
  const db=readDB();
  let rows=(db.users||[]).filter(u=>u.xp!==undefined);
  if(scope==="kenya")rows=rows.filter(u=>String(u.region).toLowerCase()==="kenya");
  if(scope==="friends"){
    const id=String(req.query.id||"");
    const links=(db.friends||[]).filter(f=>f.a===id||f.b===id);
    const ids=new Set([id]);
    links.forEach(f=>{if(f.a===id)ids.add(f.b);if(f.b===id)ids.add(f.a);});
    rows=id?rows.filter(u=>ids.has(u.id)):[];
  }
  rows.sort((a,b)=>(Number(b[metric])||0)-(Number(a[metric])||0));
  res.json({source:"MaliRadar competitive beta",metric,scope,participants:rows.slice(0,100).map(u=>({id:u.id,name:u.name,region:u.region,xp:u.xp,profit:u.profit,ret:u.ret,trades:u.trades,achievements:u.achievements}))});
});
app.get("/api/competitive/challenges",(req,res)=>{
  const now=new Date();
  const challenges=[{id:"october-paper-2026",title:"October Paper Challenge",start:"2026-10-01T00:00:00.000Z",end:"2026-10-31T23:59:59.999Z",startingCapital:100000,metric:"ret",mode:"Paper only",prizes:{first:50000,second:25000,third:15000,top10:5000,participant:1000},prizeCurrency:"KSh virtual credits"}];
  const db=readDB(),joined=Array.isArray(db.challenges)?db.challenges:[];
  res.json({source:"MaliRadar competitive beta",challenges:challenges.map(x=>({...x,status:now.getTime()<Date.parse(x.start)?"UPCOMING":now.getTime()>Date.parse(x.end)?"ENDED":"ACTIVE",joined:joined.some(j=>j.challengeId===x.id)}))});
});
app.post("/api/competitive/challenges/:challengeId/join",(req,res)=>{
  const {id}=req.body||{};
  if(!id||typeof id!=="string")return res.status(400).json({error:"MaliRadar ID required"});
  if(!["october-paper-2026"].includes(req.params.challengeId))return res.status(404).json({error:"Challenge not found"});
  const db=readDB(); if(!Array.isArray(db.challenges))db.challenges=[];
  const user=db.users.find(u=>u.id===id); if(!user)return res.status(404).json({error:"Profile not found"});
  const existing=db.challenges.find(x=>x.challengeId===req.params.challengeId&&x.id===id);
  if(!existing)db.challenges.push({challengeId:req.params.challengeId,id,joinedAt:new Date().toISOString(),baselineRet:Number(user.ret)||0,baselineProfit:Number(user.profit)||0,baselineTrades:Number(user.trades)||0,baselineVersion:2});
  else if(Number(existing.baselineVersion||0)<2){existing.joinedAt=new Date().toISOString();existing.baselineRet=Number(user.ret)||0;existing.baselineProfit=Number(user.profit)||0;existing.baselineTrades=Number(user.trades)||0;existing.baselineVersion=2;}
  writeDB(db); res.json({ok:true,joined:true});
});
app.get("/api/competitive/challenges/:challengeId/leaderboard",(req,res)=>{
  const db=readDB(),entries=(db.challenges||[]).filter(x=>x.challengeId===req.params.challengeId),users=new Map((db.users||[]).map(u=>[u.id,u]));
  let repaired=false;
  const rows=entries.map(e=>{const u=users.get(e.id);if(!u)return null;if(Number(e.baselineVersion||0)<2){e.joinedAt=new Date().toISOString();e.baselineRet=Number(u.ret)||0;e.baselineProfit=Number(u.profit)||0;e.baselineTrades=Number(u.trades)||0;e.baselineVersion=2;repaired=true}return{id:u.id,name:u.name,region:u.region,ret:(Number(u.ret)||0)-(Number(e.baselineRet)||0),profit:(Number(u.profit)||0)-(Number(e.baselineProfit)||0),trades:Math.max(0,(Number(u.trades)||0)-(Number(e.baselineTrades)||0))}}).filter(Boolean).sort((a,b)=>(Number(b.ret)||0)-(Number(a.ret)||0));
  if(repaired)writeDB(db);
  res.json({source:"MaliRadar competitive beta",challengeId:req.params.challengeId,metric:"return since join",participants:rows.slice(0,100)});
});
app.get("/api/health",(req,res)=>res.json({ok:true,service:"MaliRadar API",version:"8.4"}));

app.get("/api/stocks",(req,res)=>res.json({source:"demo",warning:"Illustrative data only",stocks:[{symbol:"SCOM",name:"Safaricom",price:35.95},{symbol:"KCB",name:"KCB Group",price:92.50},{symbol:"EQTY",name:"Equity Group",price:105.00},{symbol:"EABL",name:"EABL",price:286.75}]}));
app.post("/api/demo-user",(req,res)=>{const db=readDB(),id="demo-"+Date.now(),user={id,name:req.body.name||"Demo User",createdAt:new Date().toISOString()};db.users.push(user);writeDB(db);res.status(201).json(user)});
app.get("/api/demo-user/:id",(req,res)=>{const db=readDB(),user=db.users.find(u=>u.id===req.params.id);if(!user)return res.status(404).json({error:"User not found"});res.json(user)});
app.post("/api/paper-order",(req,res)=>{const {userId,symbol,side,quantity,price}=req.body;if(!userId||!symbol||!["BUY","SELL"].includes(side)||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(price)||price<=0)return res.status(400).json({error:"Invalid paper order"});const db=readDB();if(!db.users.some(u=>u.id===userId))return res.status(404).json({error:"User not found"});const tx={id:"tx-"+Date.now(),userId,symbol,side,quantity,price,createdAt:new Date().toISOString()};db.transactions.push(tx);writeDB(db);res.status(201).json(tx)});
app.get("/api/transactions/:userId",(req,res)=>{const db=readDB();res.json(db.transactions.filter(t=>t.userId===req.params.userId))});
app.post("/api/alerts",(req,res)=>{const {userId,symbol,targetPrice}=req.body;if(!userId||!symbol||!Number.isFinite(targetPrice)||targetPrice<=0)return res.status(400).json({error:"Invalid alert"});const db=readDB();const alert={id:"alert-"+Date.now(),userId,symbol,targetPrice,active:true,createdAt:new Date().toISOString()};db.alerts.push(alert);writeDB(db);res.status(201).json(alert)});
app.get("/api/alerts/:userId",(req,res)=>{const db=readDB();res.json(db.alerts.filter(a=>a.userId===req.params.userId))});

const { registerMaliRadarSocialCompetition } = require('./server/maliradar-social-competition');
registerMaliRadarSocialCompetition(app);
const { registerMaliRadarSeasons } = require('./server/maliradar-seasons');
registerMaliRadarSeasons(app);
const { registerMaliRadarTournaments } = require('./server/maliradar-tournaments');
registerMaliRadarTournaments(app);
const { registerMaliRadarCompetition6 } = require('./server/maliradar-competition-6');
registerMaliRadarCompetition6(app);

const { registerMaliRadarMarketDataRoutes } = require('./server/mystocks-market-data');
registerMaliRadarMarketDataRoutes(app);

app.get("/",(req,res)=>{res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");res.setHeader("Pragma","no-cache");res.setHeader("Expires","0");res.sendFile(path.join(__dirname,"public","index.html"))});
app.get("*",(req,res)=>{res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");res.setHeader("Pragma","no-cache");res.setHeader("Expires","0");res.sendFile(path.join(__dirname,"public","index.html"))});
app.listen(PORT,()=>console.log(`MaliRadar API listening on ${PORT}`));