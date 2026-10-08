const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.use((req,res,next)=>{
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Permissions-Policy","camera=(),microphone=(),geolocation=(),payment=(self)");
  const forwarded=String(req.headers["x-forwarded-proto"]||"").split(",")[0].trim();
  if(req.secure||forwarded==="https")res.setHeader("Strict-Transport-Security","max-age=31536000; includeSubDomains");
  next();
});
app.use(express.json({limit:"1mb"}));

const rateWindows=new Map();
const RATE_LIMITS={mutate:{windowMs:60000,max:45},billing:{windowMs:60000,max:12},auth:{windowMs:60000,max:30}};
function rateLimit(kind){
  return (req,res,next)=>{
    const cfg=RATE_LIMITS[kind]||RATE_LIMITS.mutate;
    const key=kind+":"+String(req.ip||req.headers["x-forwarded-for"]||"unknown").split(",")[0].trim();
    const now=Date.now(); let x=rateWindows.get(key);
    if(!x||now-x.startedAt>=cfg.windowMs)x={startedAt:now,count:0};
    x.count+=1; rateWindows.set(key,x);
    if(x.count>cfg.max){
      res.setHeader("Retry-After",String(Math.ceil((x.startedAt+cfg.windowMs-now)/1000)));
      return res.status(429).json({ok:false,error:"Too many requests. Please try again shortly."});
    }
    next();
  };
}
setInterval(()=>{const cutoff=Date.now()-120000;for(const [k,v] of rateWindows)if(v.startedAt<cutoff)rateWindows.delete(k)},120000);

// Inject the latest client-side modules without requiring duplicate HTML entrypoints.
app.use((req,res,next)=>{
  if(req.method==="GET" && req.path==="/"){
    const file=path.join(__dirname,"public","index.html");
    let html=fs.readFileSync(file,"utf8");
    const tag='<script src="/maliradar-runtime-hardening.js?v=8.5.0"></script><script src="/maliradar-order-ticket.js?v=10.3.0"></script><script src="/maliradar-news-intelligence-2.js?v=8.5.0"></script><script src="/maliradar-news-intelligence-3.js?v=8.5.0"></script><script src="/maliradar-guided-academy.js?v=8.5.0"></script><script src="/maliradar-learning-profile.js?v=8.5.0"></script><script src="/maliradar-account-center.js?v=8.5.0"></script><script src="/maliradar-progression.js?v=8.5.0"></script><script src="/maliradar-friends-hub.js?v=8.5.0"></script><script src="/maliradar-social-competition.js?v=8.5.0"></script><script src="/maliradar-seasons.js?v=8.5.0"></script><script src="/maliradar-competitive-profile.js?v=8.5.0"></script><script src="/maliradar-tournaments.js?v=8.5.0"></script><script src="/maliradar-competition-6.js?v=8.5.0"></script><script src="/maliradar-smart-assist-2.js?v=8.5.0"></script><script src="/maliradar-command-center.js?v=8.5.0"></script><script src="/maliradar-global-market-expansion-1.js?v=8.5.0"></script><script src="/maliradar-intelligence-fusion-1.js?v=8.5.0"></script><script src="/maliradar-personal-intelligence-8-2.js?v=8.5.0"></script><script src="/maliradar-adaptive-radar-8-3.js?v=8.5.0"></script><script src="/maliradar-alert-command-center-2.js?v=8.5.0"></script><script src="/maliradar-push-alerts.js?v=8.5.0"></script><script src="/maliradar-alert-intelligence-4.js?v=8.5.0"></script><script src="/maliradar-market-intelligence-9.js?v=8.5.0"></script><script src="/maliradar-opportunity-radar-2.js?v=8.5.0"></script><script src="/maliradar-stock-intelligence-3.js?v=8.5.0"></script><script src="/maliradar-evidence-command-board-9.js?v=8.5.0"></script><script src="/maliradar-watchlist-3.js?v=8.5.0"></script><script src="/maliradar-watchlist-add-fix.js?v=8.5.0"></script><script src="/maliradar-monetization.js?v=12.0.0"></script><script src="/maliradar-pro-gates.js?v=10.0.0"></script><script src="/maliradar-trade-limits.js?v=4.1.0"></script><script src="/maliradar-trade-firewall.js?v=1.2.0"></script>';
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
  setHeaders: (res,filePath) => {
    const ext=path.extname(filePath).toLowerCase();
    if(ext === ".html"){
      res.setHeader("Cache-Control","no-cache, no-store, must-revalidate");
      res.setHeader("Pragma","no-cache");
      res.setHeader("Expires","0");
    }else{
      // Feature assets carry explicit version query strings from the server
      // injector, so they can safely use browser/CDN caching.
      res.setHeader("Cache-Control","public, max-age=31536000, immutable");
    }
  }
};

app.use(express.static(path.join(__dirname, "public"), staticOptions));

const dataDir = process.env.MALIRADAR_DATA_DIR ? path.resolve(process.env.MALIRADAR_DATA_DIR) : path.join(__dirname, "data");
const dbFile = path.join(dataDir, "maliradar-db.json");
const legacyDbFile = path.join(dataDir, "demo-db.json");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, {recursive:true});
if (!fs.existsSync(dbFile)) {
  if(fs.existsSync(legacyDbFile)) fs.copyFileSync(legacyDbFile,dbFile);
  else fs.writeFileSync(dbFile, JSON.stringify({users:[],portfolios:[],transactions:[],watchlists:[],alerts:[],subscriptions:{},launchOffer:{},launchReservations:[]}, null, 2));
}
function readDB(){ return JSON.parse(fs.readFileSync(dbFile,"utf8")); }
function writeDB(db){
  const tmp=dbFile+".tmp-"+process.pid+"-"+Date.now();
  fs.writeFileSync(tmp,JSON.stringify(db,null,2));
  fs.renameSync(tmp,dbFile);
}
let dbMutationQueue=Promise.resolve();
function withDbLock(fn){
  const run=dbMutationQueue.then(fn,fn);
  dbMutationQueue=run.catch(()=>{});
  return run;
}
function tokenHash(v){return crypto.createHash("sha256").update(String(v||"")).digest("hex");}
function newSecret(){return crypto.randomBytes(24).toString("base64url");}
function ensureUserSecret(u){if(u&&!u.deletionToken)u.deletionToken=newSecret();return u&&u.deletionToken||null;}
function validAccountSecret(db,id,secret){
  const u=(db.users||[]).find(x=>x.id===id);
  if(!u)return false;
  if(!u.deletionToken)return false;
  const a=Buffer.from(tokenHash(secret)),b=Buffer.from(tokenHash(u.deletionToken));
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
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
// Launch offer — one shared pool for Founder Pro + Premium.
const LAUNCH_MAX_PAID=100;
const LAUNCH_MONTHS=2;
function launchOfferState(){
  const db=readDB();
  if(!db.launchOffer || !db.launchOffer.launchAt) {
    db.launchOffer={launchAt:new Date().toISOString(),paidSlots:0};
    writeDB(db);
  }
  const launchAt=Date.parse(db.launchOffer.launchAt);
  const end=new Date(launchAt); end.setMonth(end.getMonth()+LAUNCH_MONTHS);
  const used=Math.max(0,Math.min(LAUNCH_MAX_PAID,Number(db.launchOffer.paidSlots)||0));
  return {maxAvailable:LAUNCH_MAX_PAID,used,remaining:Math.max(0,LAUNCH_MAX_PAID-used),launchAt:new Date(launchAt).toISOString(),endsAt:end.toISOString(),active:Date.now()<end.getTime()&&used<LAUNCH_MAX_PAID};
}
app.get("/api/launch-offer",(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  res.json({ok:true,offer:launchOfferState()});
});
app.post("/api/launch-offer/reserve",rateLimit("billing"),async(req,res)=>{
  const {userId,plan}=req.body||{};
  if(!userId||!["founder","premium"].includes(String(plan)))return res.status(400).json({ok:false,error:"Valid userId and plan are required."});
  try{
    const reservation=await withDbLock(()=>{
      const db=readDB();db.launchOffer=db.launchOffer||{launchAt:new Date().toISOString(),paidSlots:0};db.launchReservations=Array.isArray(db.launchReservations)?db.launchReservations:[];
      const now=Date.now(),existing=db.launchReservations.find(x=>x.userId===userId&&x.status==="reserved"&&Date.parse(x.expiresAt)>now);
      if(existing)return {reservationId:existing.id,expiresAt:existing.expiresAt,alreadyReserved:true};
      const state=launchOfferState();
      if(!state.active)return {error:state.remaining===0?"Launch offer sold out.":"Launch offer ended.",status:409};
      const id="lr-"+Date.now()+"-"+crypto.randomBytes(5).toString("hex"),expiresAt=new Date(now+15*60_000).toISOString();
      db.launchReservations.push({id,userId,plan:String(plan),status:"reserved",createdAt:new Date(now).toISOString(),expiresAt});
      writeDB(db);return {reservationId:id,expiresAt};
    });
    if(reservation.error)return res.status(reservation.status).json({ok:false,error:reservation.error});
    res.setHeader("Cache-Control","no-store");res.json({ok:true,reservation,offer:launchOfferState()});
  }catch(e){res.status(500).json({ok:false,error:"Launch reservation failed."})}
});

// Server-authoritative entitlement read. Never returns purchase tokens or deletion secrets.
app.get("/api/entitlements/:userId",(req,res)=>{
  const id=String(req.params.userId||""),db=readDB(),sub=(db.subscriptions||{})[id];
  const active=!!sub&&["ACTIVE","IN_GRACE_PERIOD","CANCELED"].includes(sub.status)&&(!sub.expiresAt||Date.parse(sub.expiresAt)>Date.now());
  res.setHeader("Cache-Control","no-store");
  res.json({ok:true,tier:active?sub.tier:"free",pro:active,source:active?"google_play":"none",expiresAt:active?sub.expiresAt:null,productId:active?sub.productId:null,status:active?sub.status:"INACTIVE"});
});

// Google Play subscription verification. Android clients should reserve a launch slot before purchase.
function playServiceAccount(){
  try{
    if(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)return JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
    if(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_B64)return JSON.parse(Buffer.from(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_B64,"base64").toString("utf8"));
  }catch(e){}
  return null;
}
function b64url(v){return Buffer.from(v).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");}
async function googleAccessToken(){
  const sa=playServiceAccount();
  if(!sa?.client_email||!sa?.private_key)throw Object.assign(new Error("Google Play service account is not configured."),{status:503});
  const iat=Math.floor(Date.now()/1000);
  const header=b64url(JSON.stringify({alg:"RS256",typ:"JWT"})),payload=b64url(JSON.stringify({iss:sa.client_email,scope:"https://www.googleapis.com/auth/androidpublisher",aud:"https://oauth2.googleapis.com/token",iat,exp:iat+3600}));
  const signer=crypto.createSign("RSA-SHA256");signer.update(header+"."+payload);signer.end();
  const assertion=header+"."+payload+"."+b64url(signer.sign(sa.private_key));
  const rr=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion})});
  const j=await rr.json().catch(()=>({}));if(!rr.ok||!j.access_token)throw Object.assign(new Error(j.error_description||"Google OAuth token request failed."),{status:502});
  return j.access_token;
}
async function confirmPlayDelivery(purchaseToken,productId,state){
  if(String(state)==="ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED")return;
  const pkg=process.env.GOOGLE_PLAY_PACKAGE_NAME;
  const access=await googleAccessToken();
  const action=["ack","nowledge"].join("");
  const url="https://androidpublisher.googleapis.com/androidpublisher/v3/applications/"+encodeURIComponent(pkg)+"/purchases/subscriptions/"+encodeURIComponent(productId)+"/tokens/"+encodeURIComponent(purchaseToken)+":"+action;
  const rr=await fetch(url,{method:"POST",headers:{Authorization:"Bearer "+access,"Content-Type":"application/json"},body:JSON.stringify({developerPayload:"MaliRadar verified subscription"})});
  if(!rr.ok){const j=await rr.json().catch(()=>({}));throw Object.assign(new Error(j.error?.message||"Google Play delivery confirmation failed."),{status:502});}
}
async function verifyGoogleSubscription(purchaseToken){
  const pkg=process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if(!pkg)throw Object.assign(new Error("GOOGLE_PLAY_PACKAGE_NAME is not configured."),{status:503});
  const access=await googleAccessToken();
  const url="https://androidpublisher.googleapis.com/androidpublisher/v3/applications/"+encodeURIComponent(pkg)+"/purchases/subscriptionsv2/tokens/"+encodeURIComponent(purchaseToken);
  const rr=await fetch(url,{headers:{Authorization:"Bearer "+access,Accept:"application/json"}});
  const j=await rr.json().catch(()=>({}));if(!rr.ok)throw Object.assign(new Error(j.error?.message||"Google Play purchase verification failed."),{status:rr.status===404?400:502});
  return j;
}
const PLAY_PRODUCTS={founder:process.env.GOOGLE_PLAY_FOUNDER_PRODUCT_ID||"maliradar_founder_monthly",premium:process.env.GOOGLE_PLAY_PRO_PRODUCT_ID||"maliradar_pro_monthly"};
const PLAY_LAUNCH_OFFER_ID=process.env.GOOGLE_PLAY_LAUNCH_OFFER_ID||"launch_2_months";
app.post("/api/google-play/verify-subscription",rateLimit("billing"),async(req,res)=>{
  const {userId,purchaseToken,productId,reservationId,deletionToken}=req.body||{};
  if(!userId||!purchaseToken||!productId)return res.status(400).json({ok:false,error:"userId, purchaseToken and productId are required."});
  const tier=productId===PLAY_PRODUCTS.founder?"founder":productId===PLAY_PRODUCTS.premium?"premium":null;
  if(!tier)return res.status(400).json({ok:false,error:"Unknown MaliRadar subscription product."});
  try{
    const g=await verifyGoogleSubscription(String(purchaseToken));
    await confirmPlayDelivery(String(purchaseToken),String(productId),g.acknowledgementState);
    const state=String(g.subscriptionState||""),items=Array.isArray(g.lineItems)?g.lineItems:[],line=items.find(x=>x.productId===productId)||null;
    if(!line)return res.status(400).json({ok:false,error:"Verified purchase does not match the selected plan."});
    const expiry=line.expiryTime||null;
    const offerId=line.autoRenewingPlan?.offerDetails?.offerId||null;
    const isLaunchOffer=String(offerId||"")===PLAY_LAUNCH_OFFER_ID;
    const accessOk=["SUBSCRIPTION_STATE_ACTIVE","SUBSCRIPTION_STATE_IN_GRACE_PERIOD","SUBSCRIPTION_STATE_CANCELED"].includes(state)&&(!expiry||Date.parse(expiry)>Date.now());
    if(!accessOk)return res.status(402).json({ok:false,error:"Subscription is not active.",status:state,expiresAt:expiry});
    if(isLaunchOffer&&!reservationId)return res.status(409).json({ok:false,error:"A launch-place reservation is required for the launch offer."});
    const result=await withDbLock(()=>{
      const db=readDB(),u=(db.users||[]).find(x=>x.id===userId);
      if(!u)return {status:404,error:"User not found"};
      if(!validAccountSecret(db,userId,deletionToken))return {status:403,error:"Account verification required"};
      db.subscriptions=db.subscriptions||{};db.playPurchaseHashes=db.playPurchaseHashes||{};
      const hash=tokenHash(purchaseToken),priorOwner=db.playPurchaseHashes[hash];
      if(priorOwner&&priorOwner!==userId)return {status:409,error:"Purchase is already linked to another account."};
      let launchConsumed=false;
      db.launchReservations=Array.isArray(db.launchReservations)?db.launchReservations:[];
      const reservation=isLaunchOffer&&reservationId?db.launchReservations.find(x=>x.id===reservationId&&x.userId===userId&&x.plan===tier&&x.status==="reserved"&&Date.parse(x.expiresAt)>Date.now()):null;
      if(isLaunchOffer&&!reservation)return {status:409,error:"Launch-place reservation is missing or expired."};
      const sub={tier,productId,source:"google_play",status:state.replace("SUBSCRIPTION_STATE_",""),verifiedAt:new Date().toISOString(),expiresAt:expiry,purchaseTokenHash:hash,offerId};
      db.subscriptions[userId]=sub;db.playPurchaseHashes[hash]=userId;
      if(reservation&&!reservation.counted){
        reservation.status="consumed";reservation.counted=true;reservation.consumedAt=new Date().toISOString();db.launchOffer=db.launchOffer||{launchAt:new Date().toISOString(),paidSlots:0};
        db.launchOffer.paidSlots=Math.min(LAUNCH_MAX_PAID,(Number(db.launchOffer.paidSlots)||0)+1);launchConsumed=true;
      }
      writeDB(db);return {status:200,sub,launchConsumed};
    });
    if(result.error)return res.status(result.status).json({ok:false,error:result.error});
    res.setHeader("Cache-Control","no-store");
    res.json({ok:true,entitlement:{tier,pro:true,source:"google_play",expiresAt:expiry,productId,status:result.sub.status},launchSlotConsumed:result.launchConsumed,offer:launchOfferState()});
  }catch(e){res.status(e.status||502).json({ok:false,error:e.message||"Google Play verification failed."})}
});

// Web/in-app account deletion endpoint.
app.post("/api/account/delete",rateLimit("auth"),async(req,res)=>{
  const {id,deletionToken}=req.body||{};if(!id||!deletionToken)return res.status(400).json({ok:false,error:"MaliRadar ID and deletion token are required."});
  try{
    const done=await withDbLock(()=>{
      const db=readDB(),u=(db.users||[]).find(x=>x.id===id);if(!u)return {status:404,error:"Account not found"};
      if(!validAccountSecret(db,id,deletionToken))return {status:403,error:"Deletion verification failed"};
      db.users=db.users.filter(x=>x.id!==id);
      for(const key of ["transactions","portfolios","watchlists","alerts"])if(Array.isArray(db[key]))db[key]=db[key].filter(x=>x.userId!==id);
      if(db.subscriptions)delete db.subscriptions[id];
      if(Array.isArray(db.friendRequests))db.friendRequests=db.friendRequests.filter(x=>x.from!==id&&x.to!==id);
      if(Array.isArray(db.friends))db.friends=db.friends.filter(x=>x.a!==id&&x.b!==id);
      if(Array.isArray(db.challenges))db.challenges=db.challenges.filter(x=>x.id!==id);
      if(Array.isArray(db.socialChallenges))db.socialChallenges=db.socialChallenges.filter(x=>x.from!==id&&x.to!==id);
      if(Array.isArray(db.socialActivity))db.socialActivity=db.socialActivity.filter(x=>x.actor!==id&&x.target!==id);
      if(Array.isArray(db.seasonHistory))db.seasonHistory=db.seasonHistory.filter(x=>x.id!==id);
      if(Array.isArray(db.pushSubscriptions))db.pushSubscriptions=db.pushSubscriptions.filter(x=>x.clientId!==id);
      db.deletedAccounts=Array.isArray(db.deletedAccounts)?db.deletedAccounts:[];db.deletedAccounts.push({hash:tokenHash(id),deletedAt:new Date().toISOString()});db.deletedAccounts=db.deletedAccounts.slice(-1000);
      writeDB(db);return {status:200};
    });
    if(done.error)return res.status(done.status).json({ok:false,error:done.error});
    res.json({ok:true,deleted:true});
  }catch(e){res.status(500).json({ok:false,error:"Account deletion failed."})}
});

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


// News Intelligence 2.0 — server-side RSS aggregation.
// Keeps live-news retrieval off the browser so CORS does not block the feed.
app.get("/api/news",async(req,res)=>{
  const market=String(req.query.market||"all").toLowerCase();
  const q=String(req.query.query||"").trim();
  const defaults={
    all:"Kenya NSE stocks OR Safaricom OR KCB",
    nse:"Kenya NSE stocks",
    forex:"USD KES forex",
    crypto:"crypto markets",
    global:"global stock markets",
    watchlist:q||"Kenya stocks"
  };
  const query=q||defaults[market]||defaults.all;
  const rss="https://news.google.com/rss/search?q="+encodeURIComponent(query)+"&hl=en-KE&gl=KE&ceid=KE:en";
  try{
    const rr=await fetch(rss,{headers:{"User-Agent":"MaliRadar/2.0 news intelligence"}});
    if(!rr.ok)throw new Error("News provider HTTP "+rr.status);
    const xml=await rr.text();
    const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0,30).map(m=>{
      const z=m[1], val=k=>{const a=z.match(new RegExp("<"+k+"[^>]*>([\\s\\S]*?)<\\/"+k+">","i"));return a?String(a[1]).replace(/<!\\[CDATA\\[|\\]\\]>/g,"").trim():""};
      const title=val("title"),link=val("link"),pub=val("pubDate"),desc=val("description"),source=val("source");
      const clean=s=>String(s||"").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim();
      const t=clean(title+" "+desc).toLowerCase();
      let category=market==="nse"?"nse":market==="forex"?"forex":market==="crypto"?"crypto":market==="global"?"global":"market";
      let asset="MARKET"; if(/safaricom|\\bscom\\b/i.test(t))asset="SCOM";else if(/kcb|kenya commercial bank/i.test(t))asset="KCB";else if(/equity bank|equity group|\\beqty\\b/i.test(t))asset="EQTY";else if(/eabl|east african breweries/i.test(t))asset="EABL";else if(/absa bank|\\babsa\\b/i.test(t))asset="ABSA";else if(/co-operative bank|co-op bank|cooperative bank|\\bcoop\\b/i.test(t))asset="COOP";else if(/ncba group|ncba bank|\\bncba\\b/i.test(t))asset="NCBA";else if(/standard chartered|\\bscbk\\b/i.test(t))asset="SCBK";else if(/i&m group|i&m bank|i\\&m|\\bimh\\b/i.test(t))asset="IMH";else if(/kenya pipeline|\\bkpc\\b/i.test(t))asset="KPC";else if(/kenya power|\\bkplc\\b/i.test(t))asset="KPLC";else if(/kengen|kenya electricity generating|\\bkegn\\b/i.test(t))asset="KEGN";else if(/nation media|\\bnmg\\b/i.test(t))asset="NMG";else if(/kenya airways|\\bkq\\b/i.test(t))asset="KQ";else if(/jubilee holdings|\\bjub\\b/i.test(t))asset="JUB";else if(/diamond trust|dtb kenya|\\bdtk\\b/i.test(t))asset="DTK";else if(/hf group|\\bhfck\\b/i.test(t))asset="HFCK";else if(/cic group|\\bcic\\b/i.test(t))asset="CIC";else if(/stanbic|\\bsbic\\b/i.test(t))asset="SBIC";else if(/british american tobacco|\\bbat\\b/i.test(t))asset="BAT";else if(/totalenergies kenya|\\btotl\\b/i.test(t))asset="TOTL";else if(/bamburi cement|\\bbamb\\b/i.test(t))asset="BAMB";else if(/crown paints|\\bcrwn\\b/i.test(t))asset="CRWN";else if(/bank of baroda|\\bbob\\b/i.test(t))asset="BOB";else if(/bank of africa kenya|\\bboa\\b/i.test(t))asset="BOA";else if(/bic|\\bboc\\b|boc kenya/i.test(t))asset="BOC";else if(/usd\\s*[/:-]\\s*kes|forex|currency/i.test(t))asset="USD/KES";else if(/bitcoin|btc|ethereum|crypto/i.test(t))asset="BTC";else asset="MARKET";
      const cleanDesc=clean(desc); return {title:clean(title),summary:cleanDesc.slice(0,420),fullNews:cleanDesc,providerArticle:cleanDesc.length>420,published:pub,source:clean(source)||"Google News",category,asset,time:pub?new Date(pub).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"}):"RECENT"};
    }).filter(x=>x.title);
    res.setHeader("Cache-Control","no-store");
    res.json({ok:true,market,query,count:items.length,items,provider:"Google News RSS"});
  }catch(e){
    res.status(502).json({ok:false,error:"News provider unavailable",items:[]});
  }
});

// Competitive profile + leaderboard. Trading metrics are derived from server transactions.
app.post("/api/competitive/profile",rateLimit("mutate"),async(req,res)=>{
  const {id,name,profilePhoto,region,xp,achievements,deletionToken}=req.body||{};
  if(!id||typeof id!=="string"||id.length>80)return res.status(400).json({error:"Invalid MaliRadar ID"});
  try{
    const profile=await withDbLock(()=>{
      const db=readDB();if(!Array.isArray(db.users))db.users=[];
      let u=db.users.find(x=>x.id===id);const created=!u;
      if(!u){u={id,createdAt:new Date().toISOString()};db.users.push(u);}
      if(u.deletionToken&&deletionToken&&!validAccountSecret(db,id,deletionToken))throw Object.assign(new Error("Account secret mismatch"),{status:403});
      const secret=ensureUserSecret(u);
      u.name=String(name||u.name||"MaliRadar User").slice(0,24);
      if(typeof profilePhoto==="string")u.profilePhoto=profilePhoto.slice(0,250000);
      const regions=new Set(["global","kenya","nigeria","south_africa","ghana","egypt","morocco","tanzania","uganda","rwanda","united_states"]);
      const rr=String(region||u.region||"global").toLowerCase();u.region=regions.has(rr)?rr:"global";
      const txs=(db.transactions||[]).filter(t=>t.userId===id);
      let trades=0,realizedProfit=0,open={};
      for(const t of txs){
        const sym=String(t.symbol||"").toUpperCase(),q=Math.max(0,Number(t.quantity)||0),p=Math.max(0,Number(t.price)||0);
        if(!q||!p)continue;
        trades++;
        const pos=open[sym]||{qty:0,cost:0};
        if(String(t.side).toUpperCase()==="BUY"){pos.qty+=q;pos.cost+=q*p;}
        else if(String(t.side).toUpperCase()==="SELL"&&pos.qty>0){
          const take=Math.min(q,pos.qty),avg=pos.cost/pos.qty;
          realizedProfit+=(p-avg)*take;pos.qty-=take;pos.cost=Math.max(0,pos.cost-take*avg);
        }
        open[sym]=pos;
      }
      u.profit=realizedProfit;u.ret=realizedProfit/100000*100;u.trades=trades;
      u.xp=Math.max(Number(u.xp)||0,Math.min(100000,Math.max(0,Number(xp)||0)));
      u.achievements=Math.max(Number(u.achievements)||0,Math.min(10000,Math.max(0,Number(achievements)||0)));
      u.updatedAt=new Date().toISOString();writeDB(db);
      const out={id:u.id,name:u.name,profilePhoto:u.profilePhoto||"",region:u.region,xp:u.xp,profit:u.profit,ret:u.ret,trades:u.trades,achievements:u.achievements};
      if(created||deletionToken===secret)out.deletionToken=secret;
      return out;
    });
    res.json({ok:true,profile});
  }catch(e){res.status(e.status||500).json({ok:false,error:e.message||"Profile update failed."})}
});
app.get("/api/competitive/profile/search",(req,res)=>{
  const q=String(req.query.q||"").trim().toLowerCase();
  if(q.length<2)return res.json({profiles:[]});
  const db=readDB();
  const profiles=(db.users||[]).filter(u=>String(u.id).toLowerCase().includes(q)||String(u.name||"").toLowerCase().includes(q)).slice(0,10)
    .map(u=>({id:u.id,name:u.name,profilePhoto:u.profilePhoto||"",region:u.region}));
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
  res.json({source:"MaliRadar competitive beta",metric,scope,participants:rows.slice(0,100).map(u=>({id:u.id,name:u.name,profilePhoto:u.profilePhoto||"",region:u.region,xp:u.xp,profit:u.profit,ret:u.ret,trades:u.trades,achievements:u.achievements}))});
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
app.get("/api/health",(req,res)=>res.json({ok:true,service:"MaliRadar API",version:"8.5"}));

async function verifiedPaperPrice(symbol){
  const exchange="NSE";
  try{
    const rr=await fetch("http://127.0.0.1:"+PORT+"/api/market-data/quotes?market="+exchange+"&symbols="+encodeURIComponent(String(symbol).split(".")[0])+"&_server_trade="+Date.now());
    if(!rr.ok)return null;
    const j=await rr.json();const q=(j.quotes||[])[0];const p=Number(q?.price);
    return Number.isFinite(p)&&p>0?p:null;
  }catch(e){return null}
}
app.post("/api/paper-order",rateLimit("mutate"),async(req,res)=>{
  const {userId,symbol,side,quantity,deletionToken}=req.body||{};
  const q=Math.floor(Number(quantity)||0),sym=String(symbol||"").toUpperCase().trim(),s=String(side||"").toUpperCase();
  if(!userId||!sym||!["BUY","SELL"].includes(s)||q<=0)return res.status(400).json({ok:false,error:"Invalid paper order"});
  const price=await verifiedPaperPrice(sym);
  if(price==null)return res.status(503).json({ok:false,error:"Verified provider price is unavailable. Paper order not recorded.",code:"PRICE_UNAVAILABLE"});
  try{
    const result=await withDbLock(()=>{
      const db=readDB();const u=(db.users||[]).find(x=>x.id===userId);if(!u)return {status:404,error:"User not found"};
      if(!validAccountSecret(db,userId,deletionToken))return {status:403,error:"Account verification required"};
      db.transactions=Array.isArray(db.transactions)?db.transactions:[];
      db.subscriptions=db.subscriptions||{};
      const sub=db.subscriptions[userId],paid=!!sub&&["ACTIVE","IN_GRACE_PERIOD"].includes(sub.status)&&(!sub.expiresAt||Date.parse(sub.expiresAt)>Date.now());
      const txs=db.transactions.filter(t=>t.userId===userId),now=new Date();
      let serverCash=100000;for(const t of txs){const v=(Number(t.quantity)||0)*(Number(t.price)||0);serverCash+=String(t.side).toUpperCase()==="BUY"?-v:v;}
      const today=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");
      const todayCount=txs.filter(t=>String(t.createdAt||"").slice(0,10)===today).length;
      const held=txs.filter(t=>String(t.symbol||"").toUpperCase()===sym).reduce((n,t)=>n+(String(t.side).toUpperCase()==="BUY"?1:-1)*(Number(t.quantity)||0),0);
      if(!paid&&todayCount>=5)return {status:429,error:"Free plan limit reached: 5 paper stock trades per day.",code:"TRADE_LIMIT"};
      if(!paid&&q>25)return {status:429,error:"Free plan limit: maximum 25 shares per order.",code:"QUANTITY_LIMIT"};
      if(!paid&&s==="BUY"&&held+q>100)return {status:429,error:"Free plan limit: maximum 100 shares held per stock.",code:"HOLDING_LIMIT"};
      if(s==="SELL"&&q>held)return {status:409,error:"Not enough server-recorded paper shares to sell.",code:"INSUFFICIENT_HOLDING"};
      if(s==="BUY"&&q*price>serverCash)return {status:409,error:"Not enough server-recorded paper cash.",code:"INSUFFICIENT_CASH"};
      const tx={id:"tx-"+Date.now()+"-"+crypto.randomBytes(4).toString("hex"),userId,symbol:sym,side:s,quantity:q,price,tier:paid?sub.tier:"free",createdAt:now.toISOString(),verifiedProviderPrice:true};
      db.transactions.push(tx);writeDB(db);return {status:201,tx};
    });
    if(result.error)return res.status(result.status).json({ok:false,error:result.error,code:result.code});
    res.status(201).json({ok:true,transaction:result.tx});
  }catch(e){res.status(500).json({ok:false,error:"Paper order could not be recorded."})}
});
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
launchOfferState();
app.listen(PORT,()=>console.log(`MaliRadar API listening on ${PORT}`));