/* STOCKCRASH Paper Trade Button Bridge v1.0
 * Routes the visible stock Buy/Sell taps straight to the authoritative order ticket.
 * This avoids stale inline handlers and immediate stock-modal closure races in Android WebView.
 */
(function () {
  "use strict";
  if (window.__stockCrashTradeButtonBridge) return;
  window.__stockCrashTradeButtonBridge = true;

  var STYLE_ID = "stockcrash-trade-button-bridge-css";
  var style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = [
    "button, .btn, [role='button'] { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }",
    "#mr49OrderOverlay { position: fixed !important; inset: 0 !important; z-index: 2147483000 !important; pointer-events: auto !important; }",
    "#mr49OrderOverlay button, #mr49OrderOverlay input, #mr49OrderOverlay select { pointer-events: auto !important; touch-action: manipulation !important; }"
  ].join("\n");
  (document.head || document.documentElement).appendChild(style);

  function symbolFrom(button, side) {
    var raw = button.getAttribute("onclick") || "";
    var re = side === "BUY" ? /(?:buy)\s*\(\s*['"]([^'"]+)['"]/i : /(?:sell)\s*\(\s*['"]([^'"]+)['"]/i;
    var m = raw.match(re);
    if (m && m[1]) return m[1].trim().toUpperCase().split(".")[0];

    var data = button.getAttribute("data-symbol") || button.getAttribute("data-ticker") ||
      button.closest("[data-symbol]")?.getAttribute("data-symbol") ||
      button.closest("[data-ticker]")?.getAttribute("data-ticker");
    if (data) return String(data).trim().toUpperCase().split(".")[0];

    var stockRow = button.closest(".stock");
    if (stockRow) {
      var text = (stockRow.querySelector("b")?.textContent || "").trim().toUpperCase();
      var maybe = text.match(/^([A-Z0-9]{2,12})(?:\s|•|-|$)/);
      if (maybe) return maybe[1];
    }
    return "";
  }

  function showMessage(message) {
    var old = document.getElementById("scTradeButtonNotice");
    if (!old) {
      old = document.createElement("div");
      old.id = "scTradeButtonNotice";
      old.style.cssText = "position:fixed;left:12px;right:12px;bottom:82px;z-index:2147483001;background:#0d1a22;color:#e9f5f7;border:1px solid #1b5962;border-radius:14px;padding:14px;box-shadow:0 10px 30px #0009;font:13px/1.5 Arial,sans-serif";
      document.body.appendChild(old);
    }
    old.textContent = message;
    clearTimeout(window.__scTradeNoticeTimer);
    window.__scTradeNoticeTimer = setTimeout(function () {
      if (old && old.parentNode) old.parentNode.removeChild(old);
    }, 5000);
  }

  function handle(e) {
    var button = e.target && e.target.closest
      ? e.target.closest("button, [role='button'], a")
      : null;
    if (!button) return;
    var text = String(button.textContent || "").replace(/\s+/g, " ").trim().toUpperCase();

    // Only intercept entry points, never the BUY/SELL PAPER ORDER submit button.
    var side = null;
    if (/^(PAPER BUY|BUY STOCKS?|BUY STOCK|BUY|PAPER BUY STOCKS?)$/.test(text)) side = "BUY";
    else if (/^(PAPER SELL|SELL STOCKS?|SELL STOCK|SELL|PAPER SELL STOCKS?)$/.test(text)) side = "SELL";
    else if (/\bPAPER BUY\b/.test(text) && !/PAPER ORDER/.test(text)) side = "BUY";
    else if (/\bPAPER SELL\b/.test(text) && !/PAPER ORDER/.test(text)) side = "SELL";
    if (!side) return;

    var sym = symbolFrom(button, side);
    if (!sym) return;

    // Stop stale inline buy()/sell() and closeM() handlers from swallowing the tap.
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();

    var ticket = window.MaliRadarOrderTicket;
    if (!ticket || typeof ticket.open !== "function") {
      showMessage("The paper order ticket is still loading. Please wait a moment and tap again.");
      return;
    }
    try {
      var result = ticket.open(side, sym);
      if (result && typeof result.catch === "function") {
        result.catch(function (err) {
          showMessage("Could not open the paper order: " + String(err && err.message || "Please try again."));
        });
      }
    } catch (err) {
      showMessage("Could not open the paper order: " + String(err && err.message || "Please try again."));
    }
  }

  // Capture phase wins over brittle inline onclick attributes; delegated for dynamic stock cards.
  document.addEventListener("click", handle, true);
  window.StockCrashTradeButtonBridge = { version: "1.0.0", ready: true };
})();
