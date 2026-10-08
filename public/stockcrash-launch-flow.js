(function(){
  'use strict';

  var AUTH_KEY = 'stockcrash_auth_v1';
  var ACCOUNT_KEY = 'maliradar_account_v1';
  var GUIDE_KEY = 'stockcrash_navigation_guide_v1';
  var LEGAL_KEY = 'maliradar_legal_acceptance_v2';

  // Permanently neutralize the legacy two-tour system before its load handlers run.
  try{ localStorage.setItem('maliradar_onboarding_v161','done'); }catch(e){}
  try{
    if(window.MaliRadarLegal){
      window.MaliRadarLegal.ensure=function(next){ if(next)next(); return true; };
      window.MaliRadarLegal.show=function(){};
    }
  }catch(e){}

  function $(id){return document.getElementById(id)}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
  function readJSON(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
  function writeJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
  function account(){return readJSON(ACCOUNT_KEY)}
  function auth(){return readJSON(AUTH_KEY)}
  function setConsent(){writeJSON(LEGAL_KEY,{accepted:true,version:'2.0',acceptedAt:new Date().toISOString()})}
  function hideLegacy(){
    ['legalGate','tourOverlay','mrGuidedOverlay'].forEach(function(id){
      var x=$(id);if(x)x.style.display='none';
    });
    document.body.classList.remove('tour-open','legal-open');
  }

  var style=document.createElement('style');
  style.id='stockcrash-launch-flow-css';
  style.textContent=
    '#scLaunchRoot{position:fixed;inset:0;z-index:210000;display:flex;align-items:center;justify-content:center;background:#03080d;color:#e9f5f7;font-family:Arial,sans-serif;overflow:hidden;opacity:1;transition:opacity .7s ease}' +
    '#scLaunchRoot.sc-out{opacity:0;pointer-events:none}' +
    '.sc-stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(1.012);transition:opacity .8s ease,transform .9s ease;pointer-events:none}' +
    '.sc-stage.on{opacity:1;transform:scale(1);pointer-events:auto}' +
    '.sc-noise{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0,rgba(255,255,255,.018) 1px,transparent 1px,transparent 4px);opacity:.22;pointer-events:none}' +
    '.sc-vignette{position:absolute;inset:0;background:radial-gradient(circle at center,transparent 20%,rgba(0,0,0,.72) 100%);pointer-events:none}' +
    '.sc-intro-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(56,200,255,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(56,200,255,.055) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(to bottom,transparent,black 20%,black 80%,transparent)}' +
    '.sc-intro-content{width:min(760px,92vw);position:relative;text-align:center;padding:20px}' +
    '.sc-kicker{font-size:10px;letter-spacing:3.4px;color:#54e6c0;font-weight:900;text-transform:uppercase}' +
    '.sc-title{font-size:clamp(48px,12vw,94px);font-weight:1000;letter-spacing:-4px;margin:18px 0 4px;line-height:.9;text-shadow:0 0 26px rgba(53,224,177,.18)}' +
    '.sc-title span{color:#35e0b1}' +
    '.sc-subtitle{font-size:12px;color:#86a2aa;letter-spacing:1.5px}' +
    '.sc-blueprint{margin:24px auto 0;max-width:720px;height:220px;border:1px solid rgba(56,200,255,.24);border-radius:22px;background:linear-gradient(180deg,rgba(5,17,26,.72),rgba(2,8,13,.58));box-shadow:0 0 55px rgba(56,200,255,.08),inset 0 0 50px rgba(56,200,255,.035);overflow:hidden;position:relative}' +
    '.sc-blueprint svg{width:100%;height:100%;display:block}' +
    '.sc-graph{fill:none;stroke:#35e0b1;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1500;stroke-dashoffset:1500;filter:drop-shadow(0 0 7px rgba(53,224,177,.7))}' +
    '.sc-graph-draw{animation:scGraphDraw 3.1s cubic-bezier(.2,.7,.2,1) forwards}' +
    '.sc-graph-glow{fill:none;stroke:#38c8ff;stroke-width:1.5;opacity:.45;stroke-dasharray:1500;stroke-dashoffset:1500}' +
    '.sc-graph-glow.sc-graph-draw{animation:scGraphDraw 3.1s cubic-bezier(.2,.7,.2,1) forwards}' +
    '@keyframes scGraphDraw{to{stroke-dashoffset:0}}' +
    '.sc-scan{position:absolute;left:0;right:0;top:-8%;height:18%;background:linear-gradient(180deg,transparent,rgba(56,200,255,.15),transparent);animation:scScan 2.8s linear infinite}' +
    '@keyframes scScan{to{transform:translateY(620%)}}' +
    '.sc-logo{opacity:0;transform:translateY(10px);transition:opacity .8s ease,transform .8s ease}.sc-logo.show{opacity:1;transform:none}' +
    '.sc-logo-mark{width:min(300px,76vw);height:auto;margin:0 auto 10px;display:block}.sc-logo-mark img{display:block;width:100%;height:auto;filter:drop-shadow(0 0 18px rgba(255,24,37,.15))}' +
    '.sc-auth-wrap{width:min(480px,92vw);max-height:90vh;overflow:auto;padding:8px}' +
    '.sc-auth-card{border:1px solid rgba(53,224,177,.27);border-radius:26px;background:linear-gradient(145deg,rgba(11,29,40,.98),rgba(4,12,18,.98));box-shadow:0 30px 100px rgba(0,0,0,.5),0 0 50px rgba(53,224,177,.07);padding:22px}' +
    '.sc-auth-head{text-align:left}.sc-auth-head .sc-title{font-size:38px;letter-spacing:-1.8px;margin:10px 0 4px}.sc-auth-copy{font-size:12px;line-height:1.6;color:#9cb5bc}' +
    '.sc-auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:18px 0 12px;padding:4px;border:1px solid #18323c;border-radius:13px;background:#07121a}.sc-auth-tab{border:0;border-radius:10px;padding:10px;background:transparent;color:#8ea8af;font-weight:900}.sc-auth-tab.on{background:#102b35;color:#e9f5f7;box-shadow:0 0 16px rgba(53,224,177,.08)}' +
    '.sc-google{width:100%;border:1px solid #48656d;background:#f7fafb;color:#102029;border-radius:12px;padding:11px 13px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:9px}.sc-google-icon{width:18px;height:18px;display:grid;place-items:center;font-weight:1000}' +
    '.sc-divider{display:flex;align-items:center;gap:8px;margin:14px 0;color:#728d96;font-size:10px;letter-spacing:1px}.sc-divider:before,.sc-divider:after{content:"";height:1px;flex:1;background:#1b3944}' +
    '.sc-field{margin-top:10px}.sc-field label{display:block;font-size:10px;color:#8ea8af;margin-bottom:5px;text-transform:uppercase;letter-spacing:.8px;font-weight:900}.sc-field input{width:100%;border:1px solid #1b3944;border-radius:11px;padding:11px;background:#07131b;color:#e9f5f7;outline:none}.sc-field input:focus{border-color:#35e0b1;box-shadow:0 0 0 3px rgba(53,224,177,.08)}' +
    '.sc-auth-submit{width:100%;margin-top:13px}.sc-auth-note{font-size:10px;color:#819aa2;margin-top:10px;line-height:1.5}.sc-auth-note a{color:#62dcbf}.sc-error{display:none;margin-top:10px;padding:10px;border-radius:10px;background:rgba(255,80,100,.06);border:1px solid rgba(255,100,120,.28);color:#ffabb5;font-size:11px;line-height:1.45}.sc-error.on{display:block}.sc-success{display:none;margin-top:10px;padding:10px;border-radius:10px;background:rgba(53,224,177,.06);border:1px solid rgba(53,224,177,.28);color:#83f3d3;font-size:11px}.sc-success.on{display:block}.sc-consent{display:flex;gap:9px;align-items:flex-start;margin-top:12px;padding:10px;border:1px solid #1b3944;border-radius:11px;background:#07131b}.sc-consent input{margin-top:2px;accent-color:#35e0b1}.sc-consent label{font-size:10px;line-height:1.45;color:#a8bec4}.sc-consent a{color:#61dcc0}.sc-saved{display:none;margin-top:10px;padding:9px 10px;border-radius:10px;background:#07131b;border:1px solid #18323c;font-size:10px;color:#8ea8af}.sc-saved.on{display:block}.sc-config-note{margin-top:8px;font-size:9px;color:#728d96}' +
    '.sc-orb-wrap{width:min(560px,92vw);text-align:center;position:relative}.sc-orb{width:165px;height:165px;margin:0 auto;border-radius:50%;background:radial-gradient(circle at 38% 30%,#fff 0,#9df8e2 3%,#35e0b1 16%,#12606a 48%,#031016 74%,transparent 75%);box-shadow:0 0 22px rgba(53,224,177,.6),0 0 80px rgba(56,200,255,.22),inset 0 0 45px rgba(255,255,255,.11);animation:scOrbPulse 1.25s ease-in-out infinite}.sc-orb-ring{position:absolute;left:50%;top:82px;transform:translateX(-50%);width:220px;height:220px;border-radius:50%;border:1px solid rgba(56,200,255,.35);animation:scRing 2s linear infinite}.sc-orb-ring.r2{width:280px;height:280px;border-color:rgba(53,224,177,.13);animation-duration:3s}.sc-orb-particle{position:absolute;width:5px;height:5px;border-radius:50%;background:#71ffe0;box-shadow:0 0 11px #71ffe0;animation:scFloat 2s ease-in-out infinite}.sc-orb-copy{margin-top:30px}.sc-orb-copy h2{font-size:25px;margin:0 0 7px}.sc-orb-copy p{margin:0;color:#7f9aa2;font-size:11px;letter-spacing:1.3px;text-transform:uppercase}.sc-orb-line{width:180px;height:1px;margin:17px auto 0;background:linear-gradient(90deg,transparent,#35e0b1,transparent);box-shadow:0 0 12px rgba(53,224,177,.4)}' +
    '@keyframes scOrbPulse{50%{transform:scale(1.06)}}@keyframes scRing{to{transform:translateX(-50%) rotate(360deg)}}@keyframes scFloat{50%{transform:translate3d(0,-18px,0);opacity:.45}}' +
    '.sc-guide{position:fixed;inset:0;z-index:220000;display:none;pointer-events:none}.sc-guide.on{display:block}.sc-guide-shade{position:absolute;inset:0;background:rgba(0,0,0,.3);backdrop-filter:blur(1.2px)}.sc-guide-panel{position:fixed;left:12px;right:12px;bottom:78px;max-width:456px;margin:auto;border:1px solid #35e0b1;border-radius:20px;padding:16px;background:linear-gradient(145deg,#0b1d25,#071018);box-shadow:0 20px 70px rgba(0,0,0,.58),0 0 30px rgba(53,224,177,.09);pointer-events:auto}.sc-guide-top{display:flex;justify-content:space-between;align-items:center;gap:8px}.sc-guide-step{font-size:9px;letter-spacing:1.4px;color:#35e0b1;font-weight:1000}.sc-guide-panel h3{font-size:19px;margin:8px 0 5px}.sc-guide-panel p{font-size:12px;line-height:1.55;color:#abc0c5;margin:0}.sc-guide-actions{display:grid;grid-template-columns:1fr 1.5fr;gap:7px;margin-top:12px}.sc-guide-actions button{border:0;border-radius:11px;padding:10px;font-weight:900;background:linear-gradient(90deg,#20cfa0,#38c8ff);color:#041015}.sc-guide-actions button.alt{background:#10232c;color:#e9f5f7;border:1px solid #1b3944}.sc-guide-close{border:1px solid #1b3944;background:#0b1921;color:#e9f5f7;border-radius:9px;padding:6px 9px}.sc-guide-spot{position:relative!important;z-index:220001!important;box-shadow:0 0 0 4px #071016,0 0 0 7px #35e0b1,0 0 35px 9px rgba(53,224,177,.28)!important;border-radius:11px!important}' +
    '.sc-account-tools{border:1px solid rgba(53,224,177,.22);border-radius:15px;padding:13px;background:rgba(8,20,27,.6);margin-bottom:12px}.sc-account-tools .sc-id{font-size:10px;color:#7e999f;margin-top:4px;word-break:break-all}' +
    '@media(max-width:380px){.sc-auth-card{padding:17px}.sc-auth-wrap{width:96vw}.sc-guide-panel{bottom:72px;padding:13px}.sc-guide-panel h3{font-size:17px}}';
  document.head.appendChild(style);

  var root=document.createElement('div');
  root.id='scLaunchRoot';
  root.innerHTML=
    '<div id="scIntroStage" class="sc-stage on"><div class="sc-intro-grid"></div><div class="sc-noise"></div><div class="sc-vignette"></div><div class="sc-intro-content"><div class="sc-kicker">Market intelligence system</div><div class="sc-title">STOCK<span>CRASH</span></div><div class="sc-subtitle">REAL DATA • PAPER TRADING • MARKET LEARNING</div><div class="sc-blueprint"><div class="sc-scan"></div><svg viewBox="0 0 720 220" preserveAspectRatio="none" aria-hidden="true"><g opacity=".22" stroke="#38c8ff" stroke-width="1"><path d="M0 45H720M0 90H720M0 135H720M0 180H720"/><path d="M72 0V220M144 0V220M216 0V220M288 0V220M360 0V220M432 0V220M504 0V220M576 0V220M648 0V220"/></g><polyline class="sc-graph sc-graph-glow" points="0,175 45,170 76,151 113,158 149,135 184,148 225,116 265,132 299,105 330,118 369,76 408,95 445,70 488,82 525,47 558,62 603,32 642,43 680,20 720,26"/><polyline id="scGraphMain" class="sc-graph" points="0,175 45,170 76,151 113,158 149,135 184,148 225,116 265,132 299,105 330,118 369,76 408,95 445,70 488,82 525,47 558,62 603,32 642,43 680,20 720,26"/></svg></div><div id="scIntroLogo" class="sc-logo" style="margin-top:18px"><div class="sc-logo-mark"><img src="/stockcrash-logo.svg" alt="STOCKCRASH — Learn • Simulate • Grow"></div><div class="sc-kicker" style="letter-spacing:2px">SYSTEM INITIALIZING</div></div></div></div>' +
    '<div id="scAuthStage" class="sc-stage"><div class="sc-auth-wrap"><div class="sc-auth-card"><div class="sc-auth-head"><div class="sc-kicker">Secure account access</div><div class="sc-title">Sign <span>in.</span></div><div class="sc-auth-copy">Your account keeps your StockCrash identity, profile, paper-trading records, alerts and learning progress tied to you. Your password is never saved in the app.</div></div><div id="scSaved" class="sc-saved"></div><div class="sc-auth-tabs"><button id="scSignInTab" class="sc-auth-tab on">Sign In</button><button id="scCreateTab" class="sc-auth-tab">Create Account</button></div><button id="scGoogle" class="sc-google"><span class="sc-google-icon">G</span><span>Continue with Google</span></button><div id="scGoogleNote" class="sc-config-note"></div><div class="sc-divider">OR USE EMAIL</div><form id="scAuthForm" autocomplete="on"><div class="sc-field"><label>Email</label><input id="scEmail" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required></div><div id="scNameField" class="sc-field" style="display:none"><label>Name</label><input id="scName" maxlength="24" autocomplete="name" placeholder="Your display name"></div><div class="sc-field"><label>Password</label><input id="scPassword" type="password" minlength="8" maxlength="128" autocomplete="current-password" placeholder="At least 8 characters" required></div><div id="scConfirmField" class="sc-field" style="display:none"><label>Confirm password</label><input id="scConfirm" type="password" minlength="8" maxlength="128" autocomplete="new-password" placeholder="Repeat password"></div><div class="sc-consent"><input id="scConsent" type="checkbox"><label for="scConsent">I agree to the <a href="/privacy-policy.html" target="_blank" rel="noopener">Privacy Policy</a> and <a href="/terms-of-use.html" target="_blank" rel="noopener">Terms of Use</a>. StockCrash is a paper-trading and market-learning simulator, not a real-money brokerage.</label></div><button id="scAuthSubmit" class="btn sc-auth-submit" type="submit">Sign In Securely</button></form><div id="scAuthError" class="sc-error"></div><div id="scAuthSuccess" class="sc-success"></div><div class="sc-auth-note">Never enter a brokerage password, bank password, card number or real-money trading credential here.</div></div></div></div>' +
    '<div id="scOrbStage" class="sc-stage"><div class="sc-orb-wrap"><div class="sc-orb-ring"></div><div class="sc-orb-ring r2"></div><div class="sc-orb"></div><div class="sc-orb-particle" style="left:28%;top:30%"></div><div class="sc-orb-particle" style="left:70%;top:38%;animation-delay:.35s"></div><div class="sc-orb-particle" style="left:35%;top:67%;animation-delay:.7s"></div><div class="sc-orb-particle" style="left:64%;top:66%;animation-delay:1s"></div><div class="sc-orb-copy"><h2>STOCKCRASH CORE ONLINE</h2><p>Loading your market workspace</p><div class="sc-orb-line"></div></div></div></div>';
  document.body.appendChild(root);

  var guide=document.createElement('div');
  guide.id='scNavigationGuide';
  guide.className='sc-guide';
  guide.innerHTML='<div class="sc-guide-shade"></div><div id="scGuidePanel" class="sc-guide-panel"><div class="sc-guide-top"><span id="scGuideStep" class="sc-guide-step"></span><button id="scGuideClose" class="sc-guide-close">✕</button></div><h3 id="scGuideTitle"></h3><p id="scGuideText"></p><div class="sc-guide-actions"><button id="scGuideBack" class="alt">← Back</button><button id="scGuideNext">Next →</button></div></div>';
  document.body.appendChild(guide);

  var mode='signin', working=false, currentGuide=0, guideSpot=null, guideActive=false;

  function stage(id){document.querySelectorAll('.sc-stage').forEach(function(x){x.classList.remove('on')});var x=$(id);if(x)x.classList.add('on')}
  function setBusy(v){working=v;var b=$('scAuthSubmit'),g=$('scGoogle');if(b){b.disabled=v;b.textContent=v?'Securing account…':(mode==='signup'?'Create Account Securely':'Sign In Securely')}if(g)g.disabled=v}
  function msg(id,text,on){var x=$(id);if(!x)return;x.textContent=text||'';x.classList.toggle('on',!!on)}
  function showAuthMode(nextMode){
    mode=nextMode;$('scSignInTab').classList.toggle('on',mode==='signin');$('scCreateTab').classList.toggle('on',mode==='signup');
    $('scNameField').style.display=mode==='signup'?'block':'none';$('scConfirmField').style.display=mode==='signup'?'block':'none';
    $('scPassword').setAttribute('autocomplete',mode==='signup'?'new-password':'current-password');$('scAuthSubmit').textContent=mode==='signup'?'Create Account Securely':'Sign In Securely';msg('scAuthError','',false);msg('scAuthSuccess','',false);
  }
  function populateSaved(){var a=auth(),s=$('scSaved'),local=account();if(a&&a.email&&s){$('scEmail').value=a.email;s.innerHTML='Saved account found: <b>'+esc(a.email)+'</b> • '+esc(a.provider||'email')+'. Enter your password to sign in.';s.classList.add('on')}else if(local&&local.name&&s){s.innerHTML='Local profile found: <b>'+esc(local.name)+'</b>. Sign in to link this device to your saved account.';s.classList.add('on')}}
  function validateConsent(){if(!$('scConsent').checked){msg('scAuthError','Please accept the Privacy Policy and Terms of Use before continuing.',true);return false}return true}
  async function postJSON(url,data){var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),cache:'no-store'});var j=await r.json().catch(function(){return{}});if(!r.ok)throw new Error(j.error||'The request could not be completed.');return j}
  async function handleEmail(){
    if(working||!validateConsent())return;
    var email=String($('scEmail').value||'').trim().toLowerCase(),password=String($('scPassword').value||'');
    if(password.length<8){msg('scAuthError','Use a password with at least 8 characters.',true);return}
    if(mode==='signup'&&password!==String($('scConfirm').value||'')){msg('scAuthError','The two passwords do not match.',true);return}
    setBusy(true);msg('scAuthError','',false);msg('scAuthSuccess','',false);
    try{var local=account();var j=await postJSON('/api/auth/email',{mode:mode,email:email,password:password,name:mode==='signup'?String($('scName').value||'').trim():'',existingAccountId:local?.id||'',deletionToken:local?.deletionToken||''});setConsent();await finishAuthentication(j.account)}
    catch(e){msg('scAuthError',e.message||'Email sign-in failed.',true)}finally{setBusy(false)}
  }
  function handleGoogleResult(raw){try{var r=typeof raw==='string'?JSON.parse(raw):raw;if(!r||!r.ok||!r.idToken){msg('scAuthError',r?.error||'Google sign-in was cancelled.',true);setBusy(false);return}finishGoogleToken(r.idToken,r.nonce||'')}catch(e){msg('scAuthError','Google sign-in response could not be read.',true);setBusy(false)}}
  async function finishGoogleToken(idToken,nonce){
    try{var local=account();var j=await postJSON('/api/auth/google/token',{idToken:idToken,nonce:nonce,existingAccountId:local?.id||'',deletionToken:local?.deletionToken||''});setConsent();await finishAuthentication(j.account)}
    catch(e){msg('scAuthError',e.message||'Google sign-in could not be completed.',true);setBusy(false)}
  }
  async function handleGoogle(){
    if(working||!validateConsent())return;
    setBusy(true);msg('scAuthError','',false);msg('scAuthSuccess','',false);
    if(window.StockCrashNativeAuth&&typeof window.StockCrashNativeAuth.signInWithGoogle==='function'){try{window.StockCrashNativeAuth.signInWithGoogle()}catch(e){setBusy(false);msg('scAuthError','Google sign-in could not start. Please use email sign-in.',true)}return}
    setBusy(false);msg('scAuthError','Google sign-in is prepared for the Android build. This browser session has no Google credential bridge; use email sign-in here.',true)
  }
  async function finishAuthentication(acct){
    writeJSON(ACCOUNT_KEY,acct);writeJSON(AUTH_KEY,{id:acct.id,email:acct.email||'',provider:acct.provider||'email',authenticatedAt:new Date().toISOString()});
    msg('scAuthSuccess','Account secured. Loading your private market workspace…',true);
    setTimeout(function(){stage('scOrbStage');setTimeout(function(){root.classList.add('sc-out');setTimeout(function(){hideLegacy();document.documentElement.classList.remove('sc-launch-lock');root.remove();try{var hb=document.querySelector('.tabs button');if(typeof window.nav==='function')window.nav('home',hb);else hb?.click()}catch(e){}injectAccountTools();setTimeout(startGuideOnce,650)},650)},2000)},350);
  }
  function googleConfiguredNote(){var n=$('scGoogleNote');if(!n)return;if(window.StockCrashNativeAuth&&typeof window.StockCrashNativeAuth.isConfigured==='function'&&window.StockCrashNativeAuth.isConfigured())n.textContent='Google credential sign-in is available on this Android build.';else n.textContent='Android Google sign-in is wired into the app; the Google web client ID must be configured for the build and server.'}

  var guideSteps=[
    {tab:'Home',title:'Home — command center',text:'Your starting workspace: portfolio snapshot, market status, intelligence summaries and upgrade access. Nothing here is presented as guaranteed future performance.',target:function(){return tabButton('Home')}},
    {tab:'Markets',title:'Markets — search and stock intelligence',text:'Search the market directory, open a stock, inspect provider freshness, evidence, trend information, charts and the paper-trading actions. Verified market data only; unavailable history stays unavailable.',target:function(){return tabButton('Markets')}},
    {tab:'Portfolio',title:'Portfolio — paper trading control room',text:'Track virtual cash, holdings, transactions and simulated performance. Buy and sell here use verified provider prices and server-backed account records.',target:function(){return tabButton('Portfolio')}},
    {tab:'Alerts',title:'Alerts — monitor conditions',text:'Create price/market conditions you care about. Alerts are monitoring tools; push delivery depends on device permission and production notification configuration.',target:function(){return tabButton('Alerts')}},
    {tab:'Learn',title:'Learn — lessons, quizzes and practice',text:'Choose Beginner, Intermediate or Expert learning. Complete lessons and quizzes, then use the Interactive Trading Academy and Market Lab for practice without real money.',target:function(){return tabButton('Learn')}},
    {tab:'Rank',title:'Rank — leaderboard, friends and challenges',text:'See simulated XP, returns and trades, plus Friends, competitive seasons, tournaments and paper challenges. These are learning/game metrics, not proof of investment skill.',target:function(){return tabButton('Rank')}},
    {tab:'News',title:'News — events and market radar',text:'Read market news and event intelligence, filter the feed and open stock-linked stories. Provider news may be delayed, incomplete or temporarily unavailable.',target:function(){return tabButton('News')}},
    {tab:'Assist',title:'Assist — Smart Assist',text:'Use Smart Assist to organize observed market evidence, educational signals and signal history. It is designed to explain data, not promise what the market will do.',target:function(){return tabButton('Assist')}},
    {tab:'Account',title:'Account — identity, profile and trust',text:'Manage your StockCrash profile, region, appearance, data controls, Trust Center and account access. Your authenticated account gives your server-backed identity a stable home.',target:function(){return tabButton('Account')}},
    {tab:'Account',title:'Pro — premium learning and global expansion',text:'Explore Free, Founder and Pro access here. Pro adds the deepest intelligence and premium learning, including forex and crypto learning sessions, subject to the configured billing setup. Nothing premium should display invented market data.',target:function(){return findTextTarget('Explore Pro')||findTextTarget('Pro')||tabButton('Account')}},
    {tab:'Home',title:'You are ready',text:'That is the full StockCrash navigation map. You can replay this guide any time from Account. Now start exploring, practice safely and build your knowledge.',target:function(){return tabButton('Home')}}
  ];
  function tabButton(label){var bs=Array.from(document.querySelectorAll('.tabs button'));return bs.find(function(b){return String(b.textContent||'').trim().toLowerCase().includes(label.toLowerCase())})||null}
  function findTextTarget(text){var nodes=Array.from(document.querySelectorAll('button,.card,.metric,.section-head,h2,h3,b,strong'));return nodes.find(function(x){return String(x.textContent||'').toLowerCase().includes(String(text).toLowerCase())})||null}
  function clearGuideSpot(){if(guideSpot){guideSpot.classList.remove('sc-guide-spot');guideSpot=null}}
  function showGuideStep(){
    if(!guideActive)return;clearGuideSpot();var s=guideSteps[currentGuide],b=tabButton(s.tab);if(b){try{b.click()}catch(e){}}
    setTimeout(function(){if(!guideActive)return;var el=s.target?s.target():b;$('scGuideStep').textContent=(currentGuide+1)+' / '+guideSteps.length;$('scGuideTitle').textContent=s.title;$('scGuideText').textContent=s.text;$('scGuideBack').style.visibility=currentGuide?'visible':'hidden';$('scGuideNext').textContent=currentGuide===guideSteps.length-1?'Finish':'Next →';if(el){guideSpot=el;el.classList.add('sc-guide-spot');try{el.scrollIntoView({behavior:'smooth',block:'center'})}catch(e){}}guide.classList.add('on')},260)
  }
  function openGuide(){if(root&&document.body.contains(root))return;guideActive=true;currentGuide=0;showGuideStep()}
  function closeGuide(mark){guideActive=false;clearGuideSpot();guide.classList.remove('on');if(mark)try{localStorage.setItem(GUIDE_KEY,'done')}catch(e){}}
  function startGuideOnce(){if(auth()&&localStorage.getItem(GUIDE_KEY)!=='done')openGuide()}

  function injectAccountTools(){
    var screen=$('accountScreen');if(!screen||$('scAccountTools'))return;
    var a=auth(),box=document.createElement('div');box.id='scAccountTools';box.className='sc-account-tools';
    box.innerHTML='<div class="row"><div><b>🔐 STOCKCRASH ACCOUNT</b><div class="muted">Authenticated identity</div></div><span class="badge">SECURE</span></div><div class="sc-id">'+esc(a?.email||'Email account')+' • '+esc(a?.provider||'email')+'</div><div class="actions"><button class="btn alt" id="scReplayGuide">🧭 Navigation Guide</button><button class="btn alt" id="scSignOut">Sign Out</button></div>';
    screen.insertBefore(box,screen.firstChild||null);$('scReplayGuide').onclick=openGuide;$('scSignOut').onclick=function(){if(!confirm('Sign out of your StockCrash account on this device?'))return;localStorage.removeItem(AUTH_KEY);localStorage.removeItem(ACCOUNT_KEY);alert('Signed out. Your local paper simulator data remains on this device.');location.reload()};
    document.querySelectorAll('button').forEach(function(b){if(String(b.textContent||'').toLowerCase().includes('replay tour')){b.textContent='🧭 Navigation Guide';b.onclick=openGuide}})
  }

  $('scSignInTab').onclick=function(){showAuthMode('signin')};$('scCreateTab').onclick=function(){showAuthMode('signup')};$('scAuthForm').addEventListener('submit',function(e){e.preventDefault();handleEmail()});$('scGoogle').onclick=handleGoogle;
  $('scGuideClose').onclick=function(){closeGuide(true)};$('scGuideBack').onclick=function(){if(!guideActive)return;if(currentGuide>0){currentGuide--;showGuideStep()}};
  $('scGuideNext').onclick=function(){if(!guideActive)return;if(currentGuide<guideSteps.length-1){currentGuide++;showGuideStep()}else closeGuide(true)};
  window.StockCrashGoogleAuthResult=handleGoogleResult;window.startMaliRadarTour=openGuide;window.restartMaliRadarTour=openGuide;window.stockCrashNavigationGuide=openGuide;
  window.stockCrashSignOut=function(){localStorage.removeItem(AUTH_KEY);localStorage.removeItem(ACCOUNT_KEY);location.reload()};

  function boot(){
    hideLegacy();document.documentElement.classList.add('sc-launch-lock');populateSaved();googleConfiguredNote();showAuthMode('signin');
    var mainGraph=$('scGraphMain'),glows=document.querySelectorAll('.sc-graph-glow');if(mainGraph)mainGraph.classList.add('sc-graph-draw');glows.forEach(function(x){x.classList.add('sc-graph-draw')});
    setTimeout(function(){var logo=$('scIntroLogo');if(logo)logo.classList.add('show')},3100);
    setTimeout(function(){stage('scAuthStage')},4500);
  }
  // The script is injected at the end of <body>; boot immediately so the intro is the first visible app surface.
  if(document.body)setTimeout(boot,0);else document.addEventListener('DOMContentLoaded',boot,{once:true});
})();