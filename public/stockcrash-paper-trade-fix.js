/* STOCKCRASH Paper Trade UX + Live Balance Sync v1.0.1 */
(function () {
  "use strict";
  if (window.__scPaperTradeFixV101) return;
  window.__scPaperTradeFixV101 = true;
  const STATE_KEY = "maliradar_v07_state";
  const WATCH_KEY = "maliradar_provider_watchlist_v2";
  const norm = s => String(s || "").toUpperCase().split(".")[0].trim();
  function readState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || "{}"); }
    catch (_) { return {}; }
  }
  function writeState(s) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); return true; }
    catch (_) { return false; }
  }
  function readWatchlist() {
    let list = [];
    try {
      const x = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
      if (Array.isArray(x)) list = x;
    } catch (_) {}
    const s = readState();
    if (Array.isArray(s.watch)) list = list.concat(s.watch.map(x => x && (x.symbol || x)));
    return [...new Set(list.map(norm).filter(Boolean))];
  }
  function addWatchlist(sym) {
    const symbol = norm(sym);
    const list = readWatchlist();
    if (!list.includes(symbol)) list.push(symbol);
    try { localStorage.setItem(WATCH_KEY, JSON.stringify(list)); } catch (_) {}
    const saved = readState();
    saved.watch = Array.isArray(saved.watch) ? saved.watch : [];
    if (!saved.watch.some(x => norm(x && (x.symbol || x)) === symbol)) saved.watch.push(symbol);
    if (!writeState(saved)) throw new Error("This device could not save the watchlist. Check available app storage and retry.");
    try {
      if (typeof state !== "undefined" && state && typeof state === "object") Object.assign(state, saved);
    } catch (_) {}
    /* Defer market-card rendering until after the order sheet opens; avoids WebView hit-test races. */
    return true;
  }
  function syncMemoryFromStorage() {
    const saved = readState();
    try {
      if (typeof state !== "undefined" && state && typeof state === "object") {
        Object.keys(state).forEach(k => { if (!(k in saved)) delete state[k]; });
        Object.assign(state, saved);
      }
    } catch (_) {}
  }
  if (typeof window.render === "function" && !window.render.__scLiveBalanceWrapped) {
    const originalRender = window.render;
    const wrappedRender = function () {
      syncMemoryFromStorage();
      return originalRender.apply(this, arguments);
    };
    wrappedRender.__scLiveBalanceWrapped = true;
    window.render = wrappedRender;
  }
  function showMessage(message) {
    let n = document.getElementById("scPaperTradeFixNotice");
    if (!n) {
      n = document.createElement("div");
      n.id = "scPaperTradeFixNotice";
      n.style.cssText = "position:fixed;left:12px;right:12px;bottom:82px;z-index:500020;background:#0d1a22;color:#e9f5f7;border:1px solid #1b5962;border-radius:14px;padding:14px;box-shadow:0 10px 30px #0009;font:13px/1.5 Arial,sans-serif";
      document.body.appendChild(n);
    }
    n.textContent = message;
    clearTimeout(window.__scPaperTradeFixNoticeTimer);
    window.__scPaperTradeFixNoticeTimer = setTimeout(() => { if (n.parentNode) n.remove(); }, 7000);
  }
  function showWatchlistGate(side, symbol, continueTrade) {
    const sym = norm(symbol);
    const old = document.getElementById("scWatchlistFirstGate");
    if (old) old.remove();
    const overlay = document.createElement("div");
    overlay.id = "scWatchlistFirstGate";
    overlay.style.cssText = "position:fixed;inset:0;z-index:500010;background:#000c;display:flex;align-items:flex-end;justify-content:center;padding:12px;font-family:Arial,sans-serif;pointer-events:auto;isolation:isolate";
    overlay.innerHTML =
      '<section style="width:100%;max-width:480px;background:#0c1820;color:#e9f5f7;border:1px solid #1b5962;border-radius:20px;padding:20px;box-shadow:0 20px 60px #0009">' +
      '<div style="font-size:10px;letter-spacing:1.5px;color:#35e0b1;font-weight:800">BUILD YOUR WATCHLIST</div>' +
      '<h2 style="margin:8px 0;font-size:22px">Track ' + sym + ' first</h2>' +
      '<p style="font-size:13px;line-height:1.55;color:#b5c8ce">Add this stock to your watchlist before opening a paper order. Your trade will not be placed until you review and confirm it in the order ticket.</p>' +
      '<button type="button" id="scWatchAddContinue" style="width:100%;padding:13px;border:0;border-radius:11px;background:linear-gradient(90deg,#20cfa0,#38c8ff);font-weight:900;color:#041015">ADD TO WATCHLIST & CONTINUE</button>' +
      '<button type="button" id="scWatchCancel" style="width:100%;margin-top:8px;padding:11px;border:1px solid #29434b;border-radius:11px;background:#10232c;color:#e9f5f7">Not now</button>' +
      '</section>';
    document.body.appendChild(overlay);
    const addButton = overlay.querySelector("#scWatchAddContinue");
    const closeGate = () => { if (overlay.parentNode) overlay.remove(); };
    let busy = false;
    const activate = () => {
      if (busy) return;
      busy = true;
      addButton.disabled = true;
      addButton.textContent = "OPENING PAPER ORDER…";
      try { addWatchlist(sym); }
      catch (err) {
        busy = false;
        addButton.disabled = false;
        addButton.textContent = "ADD TO WATCHLIST & CONTINUE";
        showMessage(err && err.message || "Could not save this stock to your watchlist.");
        return;
      }
      closeGate();
      /* Yield for Android WebView to repaint and discard the old full-screen hit-test layer. */
      setTimeout(() => {
        try {
          Promise.resolve(continueTrade()).then(() => {
            setTimeout(() => {
              try { window.MaliRadarWatch?.render?.(); } catch (_) {}
              try { window.renderMarkets?.(); } catch (_) {}
              try { syncMemoryFromStorage(); if (typeof window.render === "function") window.render(); } catch (_) {}
            }, 600);
          }).catch(err => showMessage("Paper order could not open: " + String(err && err.message || "Please tap Buy again.")));
        } catch (err) {
          showMessage("Paper order could not open: " + String(err && err.message || "Please tap Buy again."));
        }
      }, 120);
    };
    addButton.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); activate(); });
    overlay.querySelector("#scWatchCancel").addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); closeGate(); });
    overlay.addEventListener("click", e => { if (e.target === overlay) closeGate(); });
  }
  const ticket = window.MaliRadarOrderTicket;
  if (ticket && typeof ticket.open === "function" && !ticket.__scWatchlistGateWrappedV101) {
    const originalOpen = ticket.open;
    ticket.open = function (side, symbol) {
      const sym = norm(symbol);
      if (String(side).toUpperCase() !== "BUY" || readWatchlist().includes(sym)) return originalOpen.apply(this, arguments);
      return new Promise((resolve, reject) => {
        showWatchlistGate(side, sym, () => {
          try {
            Promise.resolve(originalOpen.call(ticket, side, sym)).then(resolve, reject);
          } catch (err) { reject(err); }
        });
      });
    };
    ticket.__scWatchlistGateWrappedV101 = true;
  }
  window.StockCrashPaperTradeFix = { version: "1.0.1", syncBalances: syncMemoryFromStorage, addToWatchlist: addWatchlist };
})();