/* MaliRadar Runtime Hardening v1.0
 * Final UI/UX + performance safety layer.
 * Loaded before feature modules so global browser behavior can be hardened once.
 */
(function(){
  "use strict";
  if(window.__MALIRADAR_RUNTIME_HARDENED__) return;
  window.__MALIRADAR_RUNTIME_HARDENED__=true;

  // 1) Keep background tabs quiet. Long-lived UI timers continue only while visible.
  const nativeSetInterval=window.setInterval.bind(window);
  const nativeSetTimeout=window.setTimeout.bind(window);
  const nativeClearInterval=window.clearInterval.bind(window);
  const nativeFetch=window.fetch ? window.fetch.bind(window) : null;
  window.setInterval=function(fn,ms,...args){
    const delay=Number(ms)||0;
    if(typeof fn!=="function" || delay<2500) return nativeSetInterval(fn,delay,...args);
    return nativeSetInterval(function(){
      if(document.visibilityState!=="hidden") fn(...args);
    },delay);
  };

  // 2) Prevent hung network requests from leaving UI in a loading state forever.
  if(nativeFetch && !window.__MALIRADAR_FETCH_HARDENED__){
    window.__MALIRADAR_FETCH_HARDENED__=true;
    window.fetch=function(input,init){
      try{
        const opts=init ? Object.assign({},init) : {};
        if(!opts.signal && typeof AbortController!=="undefined"){
          const controller=new AbortController();
          opts.signal=controller.signal;
          const timer=nativeSetTimeout(()=>controller.abort(),15000);
          return nativeFetch(input,opts).finally(()=>nativeClearInterval(timer));
        }
      }catch(e){}
      return nativeFetch(input,init);
    };
  }

  // 3) Make scrolling/touch interaction less costly.
  const nativeAdd=document.addEventListener.bind(document);
  document.addEventListener=function(type,listener,options){
    if((type==="touchstart"||type==="touchmove"||type==="wheel") && (options==null || typeof options==="boolean")){
      options={capture:!!options,passive:true};
    }
    return nativeAdd(type,listener,options);
  };

  // 4) Accessibility + mobile interaction polish for dynamically-created content.
  function prepare(root){
    const scope=root&&root.querySelectorAll ? root : document;
    scope.querySelectorAll?.("img").forEach(img=>{
      if(!img.hasAttribute("decoding")) img.decoding="async";
      if(!img.hasAttribute("loading") && !img.closest(".avatar,.profile-avatar")) img.loading="lazy";
    });
    scope.querySelectorAll?.("button,[role='button']").forEach(el=>{
      if(el.tagName==="BUTTON" && !el.getAttribute("type")) el.setAttribute("type","button");
      if(el.hasAttribute("disabled")) el.setAttribute("aria-disabled","true");
    });
  }

  function installUX(){
    prepare(document);
    const style=document.createElement("style");
    style.id="maliradar-runtime-hardening-css";
    style.textContent=`
      html{scroll-behavior:auto;overscroll-behavior-y:none}
      body{touch-action:pan-y;-webkit-tap-highlight-color:transparent}
      button,.btn,[role="button"]{min-height:40px}
      input,select,textarea{font-size:16px}
      :focus-visible{outline:2px solid var(--a,#35e0b1);outline-offset:2px}
      .tabs{padding-bottom:env(safe-area-inset-bottom,0px)}
      .card,.news-card,.lb-card,.sa-card,.metric{contain:layout paint}
      @media (prefers-reduced-motion:reduce){
        *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}
      }
      body.mr-lowpower .news-card,body.mr-lowpower .sa-hero,body.mr-lowpower .sa-signal,body.mr-lowpower .card,body.mr-lowpower .lb-card{
        backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important
      }
    `;
    (document.head||document.documentElement).appendChild(style);

    const cores=Number(navigator.hardwareConcurrency||0);
    const mem=Number(navigator.deviceMemory||0);
    if((cores && cores<=4) || (mem && mem<=4)) document.body.classList.add("mr-lowpower");

    const mo=new MutationObserver(records=>{
      for(const rec of records) for(const node of rec.addedNodes){
        if(node.nodeType===1) prepare(node);
      }
    });
    mo.observe(document.documentElement,{childList:true,subtree:true});

    // Keep focus inside the visible app surface after major navigation.
    document.addEventListener("click",e=>{
      const tab=e.target.closest?.(".tabs button");
      if(tab){
        nativeSetTimeout(()=>{
          const active=document.querySelector(".screen.active");
          active?.querySelector("h1,h2,h3,button,input")?.focus?.({preventScroll:true});
        },120);
      }
    },{passive:true});
  }

  if(document.readyState==="loading") nativeAdd("DOMContentLoaded",installUX,{once:true});
  else installUX();

  window.MaliRadarRuntime={version:"8.5.0",hardened:true};
})();