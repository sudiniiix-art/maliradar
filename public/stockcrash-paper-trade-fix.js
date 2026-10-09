/* STOCKCRASH Paper Trade State Sync v1.1.0
 * The watchlist is optional. This file must never intercept or wrap trade actions.
 */
(function () {
  "use strict";
  if (window.__scPaperTradeStateSyncV110) return;
  window.__scPaperTradeStateSyncV110 = true;
  const STATE_KEY = "maliradar_v07_state";

  function readState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || "{}"); }
    catch (_) { return {}; }
  }

  function syncMemoryFromStorage() {
    const saved = readState();
    try {
      if (typeof window.state === "object" && window.state) {
        Object.keys(window.state).forEach(k => {
          if (!(k in saved)) delete window.state[k];
        });
        Object.assign(window.state, saved);
      }
    } catch (_) {}
    return saved;
  }

  function wrapRender() {
    if (typeof window.render !== "function" || window.render.__scLiveBalanceWrappedV110) return;
    const originalRender = window.render;
    const wrappedRender = function () {
      syncMemoryFromStorage();
      return originalRender.apply(this, arguments);
    };
    wrappedRender.__scLiveBalanceWrappedV110 = true;
    window.render = wrappedRender;
  }

  // Remove any leftover prompt created by an older cached script.
  function removeLegacyGate() {
    const gate = document.getElementById("scWatchlistFirstGate");
    if (gate) gate.remove();
    // Older builds may have wrapped the order ticket. Restore the original
    // ticket when that wrapper left a reference behind.
    const ticket = window.MaliRadarOrderTicket;
    if (ticket && ticket.__scWatchlistGateWrappedV101 && ticket.__scOriginalOpen) {
      ticket.open = ticket.__scOriginalOpen;
      delete ticket.__scWatchlistGateWrappedV101;
      delete ticket.__scOriginalOpen;
    }
  }

  window.StockCrashPaperTradeFix = {
    version: "1.1.0",
    syncBalances: syncMemoryFromStorage,
    removeWatchlistRequirement: function () { removeLegacyGate(); return true; }
  };

  function boot() {
    wrapRender();
    removeLegacyGate();
    // Retry only during startup in case the ticket/render scripts load later.
    let tries = 0;
    const retry = () => {
      wrapRender();
      removeLegacyGate();
      if (++tries < 20) setTimeout(retry, 250);
    };
    retry();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();