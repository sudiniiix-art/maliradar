/* MaliRadar Account Center v1 — local identity + portable backup/restore */
(function(){
  "use strict";
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