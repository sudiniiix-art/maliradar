(function(){
const steps=[
{id:'markets',nav:'Markets',title:'Go to Markets',text:'Tap Markets below. I will guide you from there.',target:function(){return tab('Markets')}},
{id:'search',title:'Find a stock',text:'Tap the market search box. Search for a company or symbol, such as SCOM.',target:function(){return document.querySelector('#marketDirectorySearch')||document.querySelector('#markets input[placeholder*="Search"]')}},
{id:'stock',title:'Open a stock',text:'Tap a stock row/card to open its full market details.',target:function(){return document.querySelector('#markets .stock')||document.querySelector('#markets [onclick*="details"]')}},
{id:'portfolio',nav:'Portfolio',title:'Open your Portfolio',text:'Tap Portfolio below. This is your paper-trading control room.',target:function(){return tab('Portfolio')}},
{id:'holdings',title:'Open a holding',text:'If you have a paper holding, tap it to open its stock details. If you have none, continue to the next mission.',target:function(){return document.querySelector('#portfolio .stock[role="button"]')||document.querySelector('#portfolio .stock')||document.querySelector('#portfolio')}},
{id:'learn',nav:'Learn',title:'Return to Learn',text:'Tap Learn below to come back to your training center.',target:function(){return tab('Learn')}},
{id:'alerts',nav:'Alerts',title:'Find Alerts',text:'Tap Alerts below. This is where your monitoring conditions live.',target:function(){return tab('Alerts')}},
{id:'assist',nav:'Assist',title:'Open Smart Assist',text:'Tap Assist below. Smart Assist explains observed market evidence; it does not predict the future.',target:function(){return tab('Assist')}},
{id:'finish',title:'Academy complete',text:'You now know how to move between the key areas of MaliRadar. Next, use the practice missions to perform real paper-trading actions.',target:function(){return document.querySelector('#mr52Academy')}}
];
let i=0,active=false,spot=null,handler=null,observer=null;
function $(id){return document.getElementById(id)}
function tab(label){return Array.from(document.querySelectorAll('.tabs button')).find(function(b){return b.textContent.trim().toLowerCase().includes(label.toLowerCase())})}
function navTo(label){var b=tab(label);if(b){b.click();return true}return false}
function makeUI(){
if($('mrGuidedOverlay'))return;
var style=document.createElement('style');style.id='mr-guided-css';style.textContent='#mrGuidedOverlay{position:fixed;inset:0;z-index:100000;display:none;pointer-events:none}#mrGuidedOverlay.on{display:block}#mrGuidedPanel{position:fixed;left:12px;right:12px;bottom:78px;max-width:456px;margin:auto;background:#09151c;border:1px solid #35e0b1;border-radius:18px;padding:15px;box-shadow:0 15px 55px #000b;pointer-events:auto}#mrGuidedPanel .g-top{display:flex;justify-content:space-between;gap:10px;align-items:center}#mrGuidedPanel .g-step{font-size:10px;color:#35e0b1;letter-spacing:1px;font-weight:900}#mrGuidedPanel h3{margin:7px 0 5px;font-size:18px}#mrGuidedPanel p{margin:0;color:#a9c0c5;font-size:13px;line-height:1.5}#mrGuidedPanel .g-actions{display:flex;gap:7px;margin-top:12px}#mrGuidedPanel button{flex:1;border:0;border-radius:10px;padding:10px;font-weight:900;background:linear-gradient(90deg,#20cfa0,#38c8ff);color:#041015}#mrGuidedPanel button.alt{background:#10232c;color:#e9f5f7;border:1px solid #1b3944}.mr-guided-spot{position:relative!important;z-index:100001!important;box-shadow:0 0 0 5px #071016,0 0 0 9px #35e0b1,0 0 35px 12px #35e0b155!important;border-radius:12px!important;animation:mrGuidePulse 1.2s infinite}@keyframes mrGuidePulse{50%{filter:brightness(1.25)}}';document.head.appendChild(style);
var o=document.createElement('div');o.id='mrGuidedOverlay';o.innerHTML='<div id="mrGuidedPanel"><div class="g-top"><span class="g-step" id="mrGuidedStep"></span><button id="mrGuidedClose" class="alt" style="flex:0;padding:7px 10px">✕</button></div><h3 id="mrGuidedTitle"></h3><p id="mrGuidedText"></p><div class="g-actions"><button id="mrGuidedBack" class="alt">← Back</button><button id="mrGuidedNext">Next →</button></div></div>';document.body.appendChild(o);
$('mrGuidedClose').onclick=stop;$('mrGuidedBack').onclick=back;$('mrGuidedNext').onclick=next;
}
function clearSpot(){if(spot){spot.classList.remove('mr-guided-spot');spot=null}if(handler&&handler.el)handler.el.removeEventListener('click',handler.fn,true);handler=null}
function resolve(s){try{return s.target?s.target():null}catch(e){return null}}
function show(){
if(!active)return;makeUI();clearSpot();var s=steps[i];if(s.nav)navTo(s.nav);
setTimeout(function(){var el=resolve(s);$('mrGuidedStep').textContent=(i+1)+' / '+steps.length;$('mrGuidedTitle').textContent=s.title;$('mrGuidedText').textContent=s.text;$('mrGuidedNext').textContent=i===steps.length-1?'Finish':'I found it →';$('mrGuidedBack').style.display=i?'block':'none';$('mrGuidedOverlay').classList.add('on');if(el&&el!==$('mr52Academy')){spot=el;spot.classList.add('mr-guided-spot');el.scrollIntoView({behavior:'smooth',block:'center'});var fn=function(){setTimeout(function(){next()},120)};handler={el:el,fn:fn};el.addEventListener('click',fn,true)}},350);
}
function start(){if(active)return;active=true;i=0;show()}
function next(){if(!active)return;if(i<steps.length-1){i++;show()}else stop()}
function back(){if(i>0){i--;show()}}
function stop(){if(active && i===steps.length-1)localStorage.setItem('maliradar_guided_academy_completed','1');active=false;clearSpot();if(observer)observer.disconnect();observer=null;var o=$('mrGuidedOverlay');if(o)o.classList.remove('on')}
function addLauncher(){var academy=$('mr52Academy');if(!academy||$('mrGuidedStart'))return false;var box=document.createElement('div');box.className='actions';box.innerHTML='<button class="btn" id="mrGuidedStart">🧭 Guided Navigation</button><button class="btn alt" id="mrGuidedReset">↻ Restart Guide</button>';academy.appendChild(box);$('mrGuidedStart').onclick=start;$('mrGuidedReset').onclick=function(){stop();i=0;start()};return true}
function boot(){makeUI();if(addLauncher()){if(!localStorage.getItem('maliradar_guided_academy_completed'))setTimeout(start,900);return;}observer=new MutationObserver(function(){if(addLauncher()){observer.disconnect();observer=null}});observer.observe(document.body,{childList:true,subtree:true})}
window.MaliRadarGuidedAcademy={version:'2.0',start:start,stop:stop,next:next,back:back};
window.addEventListener('load',function(){setTimeout(boot,800)});
})();