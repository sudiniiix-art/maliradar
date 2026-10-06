/* MaliRadar Account Center v1 — local identity + portable backup/restore */
(function(){
  "use strict";
  const injectFixStyle=()=>{if(document.getElementById("mr54FixCss"))return;const s=document.createElement("style");s.id="mr54FixCss";s.textContent="#mr54AccountCard #mr54Backup,#mr54AccountCard #mr54NewId,#mr54AccountCard #mr54Restore{font-weight:900;min-height:42px}#mr54AccountCard #mr54NewId{color:var(--text)!important;min-width:92px;display:inline-flex;align-items:center;justify-content:center}";document.head.appendChild(s)};
  const KEY="maliradar_account_v1";
  const STATE_KEYS=[
    "maliradar_v07_state",
    "maliradar_academy_v1",
    "maliradar_guided_academy_completed",
    "maliradar_provider_watchlist_v2",
    "maliradar_smart_assist_history",
    "maliradar_profile_v1",
    "maliradar_region_v1"
  ];
  const uid=()=> "MR-"+cryptoRandom().slice(0,4)+"-"+cryptoRandom().slice(0,4);
  function cryptoRandom(){
    try{
      const a=new Uint32Array(2); crypto.getRandomValues(a);
      return Array.from(a).map(x=>x.toString(36)).join("").toUpperCase();
    }catch(e){return Math.random().toString(36).slice(2).toUpperCase();}
  }
  function getAccount(){
    try{
      const x=JSON.parse(localStorage.getItem(KEY)||"null");
      if(x&&x.id)return x;
    }catch(e){}
    const a={id:uid(),createdAt:new Date().toISOString(),name:"MaliRadar User"};
    localStorage.setItem(KEY,JSON.stringify(a)); return a;
  }
  function safeGet(k){
    try{return localStorage.getItem(k)}catch(e){return null}
  }
  function collect(){
    const data={};
    STATE_KEYS.forEach(k=>{const v=safeGet(k);if(v!==null)data[k]=v});
    return {
      format:"MALIRADAR_BACKUP",
      version:1,
      account:getAccount(),
      exportedAt:new Date().toISOString(),
      data
    };
  }
  function encode(obj){
    const raw=JSON.stringify(obj);
    return btoa(unescape(encodeURIComponent(raw)));
  }
  function decode(s){
    const raw=decodeURIComponent(escape(atob(s.trim())));
    const x=JSON.parse(raw);
    if(!x||x.format!=="MALIRADAR_BACKUP"||x.version!==1||!x.data)throw new Error("Invalid backup");
    return x;
  }
  function render(){
    const a=getAccount();
    const id=document.getElementById("mr54AccountId");
    const nm=document.getElementById("mr54AccountName");
    if(id)id.textContent=a.id;
    if(nm)nm.textContent=a.name||"MaliRadar User";
  }
  function toast(msg,kind){
    let el=document.getElementById("mr54Toast");
    if(!el){el=document.createElement("div");el.id="mr54Toast";document.body.appendChild(el)}
    el.textContent=msg; el.dataset.kind=kind||"info"; el.style.display="block";
    clearTimeout(el._t); el._t=setTimeout(()=>el.style.display="none",3200);
  }
  function backup(){
    const code=encode(collect());
    const box=document.getElementById("mr54BackupCode");
    if(box){box.value=code;box.select()}
    navigator.clipboard?.writeText(code).then(()=>toast("✓ Backup created and copied","ok")).catch(()=>toast("✓ Backup created — copy the code below","ok"));
  }
  function restore(){
    const box=document.getElementById("mr54BackupCode");
    const code=(box?.value||"").trim();
    if(!code)return toast("Paste a backup code first","warn");
    try{
      const x=decode(code);
      if(!confirm("Restore this MaliRadar backup? Current local progress will be replaced for the included data."))return;
      Object.entries(x.data).forEach(([k,v])=>localStorage.setItem(k,v));
      localStorage.setItem(KEY,JSON.stringify({...x.account,restoredAt:new Date().toISOString()}));
      toast("✓ Backup restored. Reloading…","ok");
      setTimeout(()=>location.reload(),900);
    }catch(e){toast("Backup code is invalid or damaged","warn")}
  }
  function newId(){
    const a=getAccount();
    if(!confirm("Generate a new MaliRadar ID? Your current local progress stays on this device."))return;
    a.id=uid(); a.createdAt=a.createdAt||new Date().toISOString(); localStorage.setItem(KEY,JSON.stringify(a)); render(); toast("✓ New MaliRadar ID created","ok");
  }
  function mount(){
    const screen=document.getElementById("accountScreen");
    if(!screen||document.getElementById("mr54AccountCard"))return;
    injectFixStyle();
    const card=document.createElement("div");
    card.className="card"; card.id="mr54AccountCard";
    card.innerHTML='<div class="row"><div><b>☁️ MaliRadar Account Center</b><div class="muted">Portable progress & device identity</div></div><span class="demo-badge">V1</span></div>'+
      '<div class="metric" style="margin-top:10px"><span class="muted">Your MaliRadar ID</span><b id="mr54AccountId">—</b></div>'+
      '<div class="notice" style="margin-top:10px">This free V1 keeps your identity and progress on this device. Use a backup code to move your progress to another phone. No password or real-money account is involved.</div>'+
      '<div class="actions"><button class="btn" id="mr54Backup">Create Backup</button><button class="btn alt" id="mr54NewId">New ID</button></div>'+
      '<label style="display:block;margin-top:10px">Backup code</label><textarea id="mr54BackupCode" rows="4" placeholder="Create a backup or paste one here" style="width:100%;resize:vertical;padding:10px;border-radius:10px;border:1px solid var(--line);background:#09151c;color:inherit"></textarea>'+
      '<button class="btn" id="mr54Restore" style="width:100%;margin-top:8px">Restore Backup</button>'+
      '<div class="muted" id="mr54AccountName" style="margin-top:8px">MaliRadar User</div>';
    const progress=Array.from(screen.children).find(x=>x.textContent.includes("🎓 Progress"));
    screen.insertBefore(card,progress||screen.children[1]);
    document.getElementById("mr54Backup").onclick=backup;
    document.getElementById("mr54Restore").onclick=restore;
    document.getElementById("mr54NewId").onclick=newId;
    render();
  }
  window.MaliRadarAccount={version:"1.0",backup,restore,newId,render,mount};
  const boot=()=>{mount();};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  setTimeout(mount,1000);
})();
// Account/Profile 2.0 foundation bridge
(function(){
"use strict";
const KEY="maliradar_account_v1";
const state=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}};
const save=x=>localStorage.setItem(KEY,JSON.stringify(x));
function profileStats(){
 try{
  const s=JSON.parse(localStorage.getItem("maliradar_v07_state")||"{}");
  const h=Array.isArray(s.history)?s.history:[];
  const q=window.maliRadarProviderQuotes||{},hold=s.hold||{};
  let value=Number(s.cash??100000);
  Object.keys(hold).forEach(k=>{const p=Number(q[String(k).toUpperCase()]?.price);if(Number.isFinite(p))value+=Number(hold[k]||0)*p});
  return {trades:h.length,value,profit:value-100000,returnPct:(value-100000)/100000*100};
 }catch(e){return {trades:0,value:100000,profit:0,returnPct:0}}
}
function sync(){
 const a=state(), p=profileStats();
 const rank=document.getElementById("profileRank"), name=document.getElementById("profileName"), av=document.getElementById("profileAvatar");
 const input=document.getElementById("profileUsername"), ai=document.getElementById("profileAvatarInput");
 if(name)name.textContent=a.name||"MaliRadar User";
 if(input&&document.activeElement!==input)input.value=a.name&&a.name!=="MaliRadar User"?a.name:"";
 if(ai&&document.activeElement!==ai)ai.value=a.avatar||"👤";
 if(av)av.textContent=a.avatar||"👤";
 const xp=Number(a.xp||0);
 if(rank)rank.textContent=(xp>=1000?"Market Strategist":xp>=500?"Market Analyst":xp>=200?"Market Learner":"Market Rookie")+" • "+xp+" XP";
 const x=document.getElementById("accountXP");if(x)x.textContent=xp+" XP";
 const ach=document.getElementById("accountAchievements");if(ach)ach.textContent=String(Number(a.achievements||0));
 return {a,p};
}
window.saveProfile=function(){
 const a=state(),n=String(document.getElementById("profileUsername")?.value||"").trim(),av=String(document.getElementById("profileAvatarInput")?.value||"👤").trim().slice(0,2);
 if(n)a.name=n;a.avatar=av||"👤";save(a);sync();
 if(window.MaliRadarLeaderboardFriends7?.refresh)window.MaliRadarLeaderboardFriends7.refresh();
 if(window.MaliRadarCompetitiveProfile?.refresh)window.MaliRadarCompetitiveProfile.refresh();
};
window.MaliRadarAccountProfile={
 version:"2.0",
 get:state,
 save:sync,
 stats:profileStats,
 update:function(p){const a=state();Object.assign(a,p||{});save(a);sync()}
};
const boot=()=>sync();
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
setInterval(sync,3000);
})();
(function(){
"use strict";
const PROFILE_KEY="maliradar_account_v1";
const PHOTO_KEY="maliradar_profile_photo_v1";
function read(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||"{}")}catch(e){return {}}}
function save(a){localStorage.setItem(PROFILE_KEY,JSON.stringify(a))}
function renderPhoto(){
 const a=read(), src=a.profilePhoto||localStorage.getItem(PHOTO_KEY)||"";
 const av=document.getElementById("profileAvatar");
 if(av) av.innerHTML=src ? '<img src="'+String(src).replace(/"/g,"&quot;")+'" alt="Profile photo">' : (a.avatar||"👤");
 let preview=document.getElementById("mrProfilePhotoPreview");
 if(preview)preview.src=src||"";
}
function addPhotoUI(){
 const form=document.querySelector("#accountScreen .profile-form");
 if(!form||document.getElementById("mrProfilePhotoInput"))return;
 const wrap=document.createElement("div");
 wrap.style.margin="8px 0 12px";
 wrap.innerHTML='<label>Profile photo</label><input id="mrProfilePhotoInput" type="file" accept="image/*" capture="user" style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--line);background:#071016;color:var(--text);margin:6px 0 8px"><div id="mrProfilePhotoBox" style="display:none"><img id="mrProfilePhotoPreview" style="width:76px;height:76px;object-fit:cover;border-radius:50%;border:1px solid var(--line)"><button type="button" class="btn alt" id="mrRemoveProfilePhoto" style="margin-left:8px">Remove Photo</button></div><div class="muted">Choose a photo from your phone gallery. Your photo is stored locally on this device.</div>';
 form.insertBefore(wrap,form.querySelector("button"));
 const input=wrap.querySelector("#mrProfilePhotoInput"), box=wrap.querySelector("#mrProfilePhotoBox"), preview=wrap.querySelector("#mrProfilePhotoPreview");
 input.onchange=()=>{
  const file=input.files&&input.files[0]; if(!file)return;
  if(!file.type.startsWith("image/"))return;
  if(file.size>5*1024*1024){alert("Please choose an image under 5 MB.");input.value="";return}
  const rd=new FileReader();
  rd.onload=()=>{
   const src=String(rd.result||""); localStorage.setItem(PHOTO_KEY,src);
   const a=read();a.profilePhoto=src;save(a);preview.src=src;box.style.display="flex";renderPhoto();
  };
  rd.readAsDataURL(file);
 };
 wrap.querySelector("#mrRemoveProfilePhoto").onclick=()=>{
  const a=read();delete a.profilePhoto;save(a);localStorage.removeItem(PHOTO_KEY);input.value="";box.style.display="none";renderPhoto();
 };
 const src=read().profilePhoto||localStorage.getItem(PHOTO_KEY)||"";
 if(src){preview.src=src;box.style.display="flex"}
}
function boot(){addPhotoUI();renderPhoto()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
setTimeout(boot,800);
setInterval(()=>{if(document.getElementById("accountScreen"))boot()},2500);
})();
