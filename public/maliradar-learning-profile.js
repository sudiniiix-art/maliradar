(function(){
  const KEY='maliradar_v07_state';
  const AKEY='maliradar_academy_v1';
  function $(id){return document.getElementById(id)}
  function readState(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}}
  function readAcademy(){try{return JSON.parse(localStorage.getItem(AKEY)||'{}')}catch(e){return {}}}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
  function stats(){
    const s=readState(), a=readAcademy(), h=Array.isArray(s.history)?s.history:[];
    const trades=h.length, completed=trades>0, guided=!!localStorage.getItem('maliradar_guided_academy_completed');
    const started=!!a.started, step=Math.max(0,Number(a.step)||0), missions=started?Math.min(5,step+1):0;
    const five=missions>=5, ten=trades>=10;
    const xp=(guided?100:0)+(started?50:0)+(missions*50)+(completed?50:0)+(trades>=5?100:0)+(ten?150:0);
    return {trades,guided,started,missions,five,ten,xp};
  }
  function render(){
    const card=$('mr53LearningProfile'), host=$('mr52Academy')?.parentElement;
    if(!card||!host)return;
    const x=stats();
    const badges=[
      ['🧭','Navigator','Complete the guided navigation tutorial',x.guided],
      ['🎯','First Practice','Start the interactive academy',x.started],
      ['🏅','Academy Graduate','Complete all 5 practice missions',x.five],
      ['📄','First Trade','Complete your first paper trade',x.trades>0],
      ['🔥','Active Trader','Complete 5 paper trades',x.trades>=5],
      ['⚡','Dedicated Trader','Complete 10 paper trades',x.ten]
    ];
    const earned=badges.filter(b=>b[3]).length;
    card.innerHTML='<div class="row"><div><b>🏆 Learning Profile</b><div class="muted">Build skill through practice — not real money.</div></div><span class="badge">XP '+x.xp+'</span></div>'+
      '<div class="grid" style="margin-top:10px"><div class="metric">Badges<b>'+earned+' / '+badges.length+'</b></div><div class="metric">Academy<b>'+x.missions+' / 5</b></div><div class="metric">Paper trades<b>'+x.trades+'</b></div></div>'+
      '<div class="mr53-progress"><div style="width:'+Math.min(100,Math.round((earned/badges.length)*100))+'%"></div></div>'+
      '<div class="mr53-badges">'+badges.map(function(b){return '<div class="mr53-badge '+(b[3]?'earned':'locked')+'"><span>'+b[0]+'</span><div><b>'+esc(b[1])+'</b><small>'+esc(b[2])+'</small></div><strong>'+(b[3]?'✓':'🔒')+'</strong></div>'}).join('')+'</div>'+
      '<p class="notice">XP and badges are educational progress markers only. They do not measure investment skill, profitability, or future performance.</p>';
  }
  function boot(){
    if($('mr53LearningProfile')){render();return true}
    const academy=$('mr52Academy'); if(!academy)return false;
    const style=document.createElement('style');style.id='mr53-learning-css';style.textContent='.mr53-progress{height:7px;background:#10242d;border-radius:99px;overflow:hidden;margin:12px 0}.mr53-progress>div{height:100%;background:linear-gradient(90deg,#20cfa0,#38c8ff);transition:width .3s}.mr53-badges{display:grid;gap:7px}.mr53-badge{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #173642;border-radius:12px;background:#09171e}.mr53-badge>span{font-size:22px}.mr53-badge>div{flex:1}.mr53-badge small{display:block;color:#91aab1;font-size:11px;margin-top:2px}.mr53-badge.locked{opacity:.48}.mr53-badge strong{font-size:13px}';
    document.head.appendChild(style);
    const card=document.createElement('div');card.className='card';card.id='mr53LearningProfile';
    academy.parentElement.insertBefore(card,academy);
    render();return true;
  }
  window.MaliRadarLearningProfile={version:'1.0',render:render};
  window.addEventListener('load',function(){
    if(!boot()){
      const ob=new MutationObserver(function(){if(boot())ob.disconnect()});
      ob.observe(document.body,{childList:true,subtree:true});
    }
    setInterval(render,3000);
  });
})();