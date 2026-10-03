const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

app.listen(PORT,()=>console.log(`MaliRadar API listening on ${PORT}`));
const { registerMaliRadarMarketDataRoutes } = require('./server/mystocks-market-data');
registerMaliRadarMarketDataRoutes(app);
