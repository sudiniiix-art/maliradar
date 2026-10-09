/* STOCKCRASH Paper Trade Button Bridge v1.1.1
 * Android WebView-safe stock entry and order-sheet tap handling.
 */
(function () {
  "use strict";
  if (window.__stockCrashTradeButtonBridgeV111) return;
  window.__stockCrashTradeButtonBridgeV110 = true;

  var style = document.createElement("style");
  style.id = "stockcrash-trade-button-bridge-css";
  style.textContent = [
    "button,.btn,[role='button'],a { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }",
    "#mr49OrderOverlay { position: fixed !important; inset: 0 !important; z-index: 500000 !important; pointer-events: auto !important; isolation: isolate !important; }",
    "#mr49OrderOverlay button,#mr49OrderOverlay input,#mr49OrderOverlay select,#scWatchlistFirstGate button { pointer-events: auto !important; touch-action: manipulation !important; }",
    "#scWatchlistFirstGate { z-index: 500010 !important; isolation: isolate !important; }",
    "#scTradeButtonNotice,#scPaperTradeFixNotice { z-index: 500020 !important; }"
  ].join("\n");
  (document.head || document.documentElement).appendChild(style);

  var lastTouchEntry = null;
  var lastTouchAt = 0;
  var forwardingTouchClick = null;

  function symbolFrom(button, side) {
    var raw = button.getAttribute("onclick") || "";
    var re = side === "BUY" ? /(?:buy)\s*\(\s*['"]([^'"]+)['"]/i : /(?:sell)\s*\(\s*['"]([^'"]+)['"]/i;
    var m = raw.match(re);
    if (m && m[1]) return m[1].trim().toUpperCase().split(".")[0];
    var data = button.getAttribute("data-symbol") || button.getAttribute("data-ticker") ||
      button.closest("[data-symbol]")?.getAttribute("data-symbol") ||
      button.closest("[data-ticker]")?.getAttribute("data-ticker");
    if (data) return String(data).trim().toUpperCase().split(".")[0];
    var row = button.closest(".stock");
    if (row) {
      var label = (row.querySelector("b")?.textContent || "").trim().toUpperCase();
      var found = label.match(/^([A-Z0-9]{2,12})(?:\s|•|-|$)/);
      if (found) return found[1];
    }
    return "";
  }
  function isEntry(button) {
    var text = String(button.textContent || "").replace(/\s+/g, " ").trim().toUpperCase();
    if (/^(PAPER BUY|BUY STOCKS?|BUY STOCK|BUY|PAPER BUY STOCKS?)$/.test(text) ||
        (/\bPAPER BUY\b/.test(text) && !/PAPER ORDER/.test(text))) return "BUY";
    if (/^(PAPER SELL|SELL STOCKS?|SELL STOCK|SELL|PAPER SELL STOCKS?)$/.test(text) ||
        (/\bPAPER SELL\b/.test(text) && !/PAPER ORDER/.test(text))) return "SELL";
    return null;
  }
  function stop(e) {
    try { e.preventDefault(); } catch (_) {}
    try { e.stopPropagation(); } catch (_) {}
    try { e.stopImmediatePropagation(); } catch (_) {}
  }
  function showMessage(message) {
    var n = document.getElementById("scTradeButtonNotice");
    if (!n) {
      n = document.createElement("div");
      n.id = "scTradeButtonNotice";
      n.style.cssText = "position:fixed;left:12px;right:12px;bottom:82px;z-index:500020;background:#0d1a22;color:#e9f5f7;border:1px solid #1b5962;border-radius:14px;padding:14px;box-shadow:0 10px 30px #0009;font:13px/1.5 Arial,sans-serif";
      document.body.appendChild(n);
    }
    n.textContent = message;
    clearTimeout(window.__scTradeNoticeTimer);
    window.__scTradeNoticeTimer = setTimeout(function () { if (n.parentNode) n.remove(); }, 6000);
  }

  function handle(e) {
    var button = e.target && e.target.closest ? e.target.closest("button,[role='button'],a") : null;
    if (!button) return;
    /* Let our single, programmatically forwarded touch click reach the actual control's handler. */
    if (e.type === "click" && forwardingTouchClick === button) return;
    /* Prevent a second action if WebView emits a synthetic click after touchend. */
    if (e.type === "click" && lastTouchEntry === button && Date.now() - lastTouchAt < 900) {
      stop(e);
      lastTouchEntry = null;
      return;
    }

    var side = isEntry(button);
    if (!side) return;
    var sym = symbolFrom(button, side);
    if (!sym) {
      showMessage("I detected the paper-trade button but could not read its stock symbol. Open stock details and try again.");
      return;
    }
    stop(e);
    var ticket = window.MaliRadarOrderTicket;
    if (!ticket || typeof ticket.open !== "function") {
      showMessage("The paper order ticket is still loading. Please wait a moment and tap again.");
      return;
    }
    try {
      var result = ticket.open(side, sym);
      if (result && typeof result.catch === "function") result.catch(function (err) {
        showMessage("Could not open the paper order: " + String(err && err.message || "Please try again."));
      });
    } catch (err) {
      showMessage("Could not open the paper order: " + String(err && err.message || "Please try again."));
    }
  }

  function onTouchEnd(e) {
    var button = e.target && e.target.closest ? e.target.closest("button,[role='button'],a") : null;
    if (!button) return;
    var side = isEntry(button);
    var isOrderControl = !!button.closest("#mr49OrderOverlay");
    var isGateControl = !!button.closest("#scWatchlistFirstGate");
    if (!side && !isOrderControl && !isGateControl) return;

    /* Deterministic tap path: forward one touch to click, suppressing WebView's duplicate click. */
    stop(e);
    if (side) {
      lastTouchEntry = button;
      lastTouchAt = Date.now();
      handle(e);
      return;
    }
    forwardingTouchClick = button;
    try { button.click(); }
    finally {
      setTimeout(function () { if (forwardingTouchClick === button) forwardingTouchClick = null; }, 80);
    }
  }

  document.addEventListener("click", handle, true);
  document.addEventListener("touchend", onTouchEnd, {capture: true, passive: false});
  window.StockCrashTradeButtonBridge = { version: "1.1.1", ready: true };
})();