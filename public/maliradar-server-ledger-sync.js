/* MaliRadar server-ledger sync v1 */
(function(){
  "use strict";
  function account(){
    try{return JSON.parse(localStorage.getItem("maliradar_account_v1")||"null")}catch(e){return null}
  }
  async function sync(detail){
    const a=account();if(!a?.id||!a?.deletionToken||!detail?.symbol||!detail?.quantity)return;
    try{
      await fetch("/api/paper-order",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          userId:a.id,
          deletionToken:a.deletionToken,
          symbol:String(detail.symbol),
          side:String(detail.side).toUpperCase(),
          quantity:Math.floor(Number(detail.quantity)||0)
        }),
        cache:"no-store"
      });
    }catch(e){}
  }
  window.MaliRadarServerLedger={version:"1.0",sync};
  window.addEventListener("maliRadar:paperTrade",e=>sync(e.detail));
})();