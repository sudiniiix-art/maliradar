/* MaliRadar server-ledger sync v2 */
(function(){
  "use strict";
  const MARK="maliradar_server_synced_txs_v1";
  const BOOT=Date.now();
  function account(){try{return JSON.parse(localStorage.getItem("maliradar_account_v1")||"null")}catch(e){return null}}
  function state(){try{return JSON.parse(localStorage.getItem("maliradar_v07_state")||"{}")}catch(e){return {}}}
  function marks(){try{const x=JSON.parse(localStorage.getItem(MARK)||"[]");return Array.isArray(x)?x:[]}catch(e){return []}}
  function saveMarks(x){try{localStorage.setItem(MARK,JSON.stringify(x.slice(-300)))}catch(e){}}
  function signature(h){return [h.executedAt||h.time,h.sym,h.type||h.side,h.q].join("|")}
  async function send(h){
    const a=account();if(!a?.id||!a?.deletionToken||!h?.sym||!h?.q)return false;
    try{
      const r=await fetch("/api/paper-order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:a.id,deletionToken:a.deletionToken,symbol:String(h.sym),side:String(h.type||h.side).toUpperCase(),quantity:Math.floor(Number(h.q)||0)}),cache:"no-store"});
      return r.ok;
    }catch(e){return false}
  }
  async function sweep(){
    const s=state(),h=Array.isArray(s.history)?s.history:[],done=marks();
    let changed=false,used=done.length;
    for(const item of h.slice(0,20).reverse()){
      const at=item.executedAt?Date.parse(item.executedAt):NaN;
      if(!Number.isFinite(at)||at<BOOT-5000)continue;
      const sig=signature(item);if(done.includes(sig))continue;
      const ok=await send(item);if(!ok)continue;
      done.push(sig);used++;changed=true;
      if(used>=done.length+12)break;
    }
    if(changed)saveMarks(done);
  }
  window.MaliRadarServerLedger={version:"2.0",sweep};
  setTimeout(sweep,3500);
  setInterval(sweep,5000);
})();