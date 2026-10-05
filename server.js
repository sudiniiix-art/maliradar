const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Inject the latest client-side order ticket without requiring a duplicate HTML entrypoint.
app.use((req,res,next)=>{
  if(req.method==="GET" && req.path==="/"){
    const file=path.join(__dirname,"public","index.html");
    let html=fs.readFileSync(file,"utf8");
    const tag='<script src="/maliradar-order-ticket.js"></script><script src="/maliradar-guided-academy.js"></script><script src="/maliradar-learning-profile.js"></script><script src="/maliradar-account-center.js"></script><script src="/maliradar-competitive.js"></script>';
    if(!html.includes(tag)) html=html.replace("</body>",tag+"</body>");
    res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma","no-cache");
    res.setHeader("Expires","0");
    res.type("html").send(html);
    return;
  }
  next();
});

// Prevent phones/browsers/proxies from keeping an older MaliRadar frontend.
// The app is updated frequently, so the HTML must always be revalidated.
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
  fs.writeFileSync(dbFile, JSON.stringify({
    users: [],
    portfolios: [],
    transactions: [],
    watchlists: [],
    alerts: []
  }, null, 2));
}
function readDB(){ return JSON.parse(fs.readFileSync(dbFile,"utf8")); }
function writeDB(db){ fs.writeFileSync(dbFile, JSON.stringify(db,null,2)); }

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
  const db=readDB();
  if(!db.users.some(u=>u.id===id)||!db.users.some(u=>u.id===friendId))return res.status(404).json({error:"Profile not found"});
  if(!Array.isArray(db.friends))db.friends=[];
  const exists=db.friends.some(f=>(f.a===id&&f.b===friendId)||(f.a===friendId&&f.b===id));
  if(!exists)db.friends.push({a:id,b:friendId,createdAt:new Date().toISOString()});
  writeDB(db); res.json({ok:true,friend:true});
});
app.get("/api/competitive/leaderboard",(req,res)=>{
  const metric=["xp","profit","ret","trades"].includes(req.query.metric)?req.query.metric:"xp";
  const requestedScope=String(req.query.scope||"global").toLowerCase();
  const scope=["global","kenya","friends"].includes(requestedScope)?requestedScope:"global";
  const db=readDB();
  let rows=(db.users||[]).filter(u=>u.xp!==undefined);
  if(scope==="kenya")rows=rows.filter(u=>String(u.region).toLowerCase()==="kenya");
  // Friends is intentionally conservative in beta: until friend connections exist,
  // never leak unrelated users or demo participants into a user's Friends ranking.
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
// Competitive challenge beta. Server records enrollment; it does not execute real-money trades.
app.get("/api/competitive/challenges",(req,res)=>{
  const now=new Date();
  const challenges=[{
    id:"october-paper-2026",
    title:"October Paper Challenge",
    start:"2026-10-01T00:00:00.000Z",
    end:"2026-10-31T23:59:59.999Z",
    startingCapital:100000,
    metric:"ret",
    mode:"Paper only"
  }];
  const db=readDB();
  const joined=Array.isArray(db.challenges)?db.challenges:[];
  res.json({source:"MaliRadar competitive beta",challenges:challenges.map(x=>({
    ...x,
    status:now.getTime()<Date.parse(x.start)?"UPCOMING":now.getTime()>Date.parse(x.end)?"ENDED":"ACTIVE",
    joined:joined.some(j=>j.challengeId===x.id)
  }))});
});
app.post("/api/competitive/challenges/:challengeId/join",(req,res)=>{
  const {id}=req.body||{};
  if(!id||typeof id!=="string")return res.status(400).json({error:"MaliRadar ID required"});
  const allowed=["october-paper-2026"];
  if(!allowed.includes(req.params.challengeId))return res.status(404).json({error:"Challenge not found"});
  const db=readDB(); if(!Array.isArray(db.challenges))db.challenges=[];
  const user=db.users.find(u=>u.id===id);
  if(!user)return res.status(404).json({error:"Profile not found"});
  const exists=db.challenges.some(x=>x.challengeId===req.params.challengeId&&x.id===id);
  if(!exists)db.challenges.push({
    challengeId:req.params.challengeId,
    id,
    joinedAt:new Date().toISOString(),
    baselineRet:Number(user.ret)||0,
    baselineProfit:Number(user.profit)||0,
    baselineTrades:Number(user.trades)||0
  });
  writeDB(db); res.json({ok:true,joined:true});
});
app.get("/api/competitive/challenges/:challengeId/leaderboard",(req,res)=>{
  const db=readDB();
  const entries=(db.challenges||[]).filter(x=>x.challengeId===req.params.challengeId);
  const users=new Map((db.users||[]).map(u=>[u.id,u]));
  const rows=entries.map(e=>{
    const u=users.get(e.id); if(!u)return null;
    return {
      id:u.id,name:u.name,region:u.region,
      ret:(Number(u.ret)||0)-(Number(e.baselineRet)||0),
      profit:(Number(u.profit)||0)-(Number(e.baselineProfit)||0),
      trades:Math.max(0,(Number(u.trades)||0)-(Number(e.baselineTrades)||0))
    };
  }).filter(Boolean).sort((a,b)=>(Number(b.ret)||0)-(Number(a.ret)||0));
  res.json({source:"MaliRadar competitive beta",challengeId:req.params.challengeId,metric:"return since join",participants:rows.slice(0,100)});
});
app.get("/api/health",(req,res)=>res.json({ok:true,service:"MaliRadar API",version:"0.5"}));

app.get("/api/stocks",(req,res)=>{
  res.json({source:"demo", warning:"Illustrative data only", stocks:[
    {symbol:"SCOM",name:"Safaricom",price:35.95},
    {symbol:"KCB",name:"KCB Group",price:92.50},
    {symbol:"EQTY",name:"Equity Group",price:105.00},
    {symbol:"EABL",name:"EABL",price:286.75}
  ]});
});

app.post("/api/demo-user",(req,res)=>{
  const db=readDB();
  const id="demo-"+Date.now();
  const user={id,name:req.body.name||"Demo User",createdAt:new Date().toISOString()};
  db.users.push(user); writeDB(db); res.status(201).json(user);
});

app.get("/api/demo-user/:id",(req,res)=>{
  const db=readDB(); const user=db.users.find(u=>u.id===req.params.id);
  if(!user) return res.status(404).json({error:"User not found"});
  res.json(user);
});

app.post("/api/paper-order",(req,res)=>{
  const {userId,symbol,side,quantity,price}=req.body;
  if(!userId||!symbol||!["BUY","SELL"].includes(side)||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(price)||price<=0)
    return res.status(400).json({error:"Invalid paper order"});
  const db=readDB();
  if(!db.users.some(u=>u.id===userId)) return res.status(404).json({error:"User not found"});
  const tx={id:"tx-"+Date.now(),userId,symbol,side,quantity,price,createdAt:new Date().toISOString()};
  db.transactions.push(tx); writeDB(db); res.status(201).json(tx);
});

app.get("/api/transactions/:userId",(req,res)=>{
  const db=readDB();
  res.json(db.transactions.filter(t=>t.userId===req.params.userId));
});

app.post("/api/alerts",(req,res)=>{
  const {userId,symbol,targetPrice}=req.body;
  if(!userId||!symbol||!Number.isFinite(targetPrice)||targetPrice<=0)
    return res.status(400).json({error:"Invalid alert"});
  const db=readDB();
  const alert={id:"alert-"+Date.now(),userId,symbol,targetPrice,active:true,createdAt:new Date().toISOString()};
  db.alerts.push(alert); writeDB(db); res.status(201).json(alert);
});

app.get("/api/alerts/:userId",(req,res)=>{
  const db=readDB(); res.json(db.alerts.filter(a=>a.userId===req.params.userId));
});const { registerMaliRadarMarketDataRoutes } = require('./server/mystocks-market-data');
registerMaliRadarMarketDataRoutes(app);

app.get("/",(req,res)=>{
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma","no-cache");
  res.setHeader("Expires","0");
  res.sendFile(path.join(__dirname,"public","index.html"));
});

app.get("*",(req,res)=>{
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma","no-cache");
  res.setHeader("Expires","0");
  res.sendFile(path.join(__dirname,"public","index.html"));
});

app.listen(PORT,()=>console.log(`MaliRadar API listening on ${PORT}`));

  
