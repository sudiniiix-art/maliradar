/* STOCKCRASH Trade Firewall v1.3 — enforce limits at order submission, not when opening the ticket.
 * A user must always be able to tap Paper Buy/Sell and see the ticket.
 * Quantity/trade limits remain enforced by check() from the order-ticket submit handler.
 */
(function () {
  "use strict";
  const KEY = "maliradar_v07_state";
  const FREE = { maxTradesPerDay: 5, maxSharesPerOrder: 25, maxSharesPerSymbol: 100 };

  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
    catch (e) { return {}; }
  };
  const tier = () => {
    try { return String(window.MaliRadarEntitlements?.tier?.() || "free").toLowerCase(); }
    catch (e) { return "free"; }
  };
  const paid = () => {
    try {
      if (typeof window.MaliRadarEntitlements?.isPro === "function") return !!window.MaliRadarEntitlements.isPro();
      return ["pro", "premium", "founder", "founder_pro", "founderpro"].includes(tier());
    } catch (e) { return false; }
  };
  const localDate = v => {
    const d = v ? new Date(v) : new Date();
    if (!Number.isFinite(d.getTime())) return "";
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
  };
  const tradesToday = st => (Array.isArray(st.history) ? st.history : [])
    .filter(x => localDate(x.executedAt || x.time) === localDate()).length;

  function check(side, sym, qty) {
    qty = Math.floor(Number(qty) || 0);
    sym = String(sym || "").toUpperCase().split(".")[0];
    if (paid()) return { ok: true, pro: true };
    if (qty < 1) return { ok: false, code: "INVALID_QTY", message: "Enter at least 1 share." };

    const st = read();
    if (tradesToday(st) >= FREE.maxTradesPerDay) {
      return { ok: false, code: "DAILY_TRADES", message: "Free plan limit reached: all 5 stock trades for today have been used." };
    }
    if (qty > FREE.maxSharesPerOrder) {
      return { ok: false, code: "ORDER_SIZE", message: "Free plan limit: maximum 25 shares per stock order." };
    }
    if (String(side || "").toUpperCase() === "BUY" && Number(st.hold?.[sym] || 0) + qty > FREE.maxSharesPerSymbol) {
      return { ok: false, code: "POSITION_SIZE", message: "Free plan limit: maximum 100 shares held per stock." };
    }
    return { ok: true, pro: false };
  }

  function notify(result) {
    if (result?.ok) return true;
    const message = String(result?.message || "This paper order is not permitted by your current plan.");
    try {
      if (typeof window.MaliRadarOrderStatus === "function") window.MaliRadarOrderStatus(message, "limit");
      else if (typeof window.showOrderStatus === "function") window.showOrderStatus(message, "limit");
      else alert(message);
    } catch (e) { try { alert(message); } catch (_) {} }
    return false;
  }

  // Maintain the shared entitlement API. Crucially, do not wrap buy(), sell(), or ticket.open()
  // with a pre-check. Those early guards swallowed taps before the ticket could be shown.
  window.MaliRadarTradeFirewall = {
    version: "1.3.0",
    check,
    pro: paid,
    refresh: function () {},
    notify
  };
})();
