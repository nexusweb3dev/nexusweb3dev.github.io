/**
 * NexusBridge — Optional live VPS integration for static GitHub Pages site.
 * Provides AI lead scoring via the NexusWeb3 VPS when available.
 * All errors are caught silently — the page works fine without this.
 */
(function () {
  "use strict";

  const VPS_BASE = "http://76.13.76.70:8890";
  const HEALTH_TIMEOUT_MS = 3000;
  const REQUEST_TIMEOUT_MS = 5000;

  const bridge = {
    status: "checking",
    requestCount: 0,
    maxRequests: 3,

    async checkHealth() {
      const controller = new AbortController();
      const timer = setTimeout(function () {
        controller.abort();
      }, HEALTH_TIMEOUT_MS);

      try {
        const res = await fetch(VPS_BASE + "/health", {
          signal: controller.signal,
        });
        clearTimeout(timer);
        bridge.status = res.ok ? "online" : "offline";
      } catch (_err) {
        clearTimeout(timer);
        bridge.status = "offline";
      }

      updateStatusIndicator();
    },

    async scoreLead(data) {
      if (bridge.requestCount >= bridge.maxRequests) {
        return null;
      }

      const controller = new AbortController();
      const timer = setTimeout(function () {
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      try {
        bridge.requestCount += 1;
        const res = await fetch(VPS_BASE + "/webhook/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) {
          return null;
        }
        return await res.json();
      } catch (_err) {
        clearTimeout(timer);
        return null;
      }
    },

    isAvailable() {
      return bridge.status === "online" && bridge.requestCount < bridge.maxRequests;
    },
  };

  function updateStatusIndicator() {
    var dot = document.getElementById("vps-status-dot");
    if (dot) {
      dot.style.backgroundColor = bridge.status === "online" ? "#22c55e" : "#9ca3af";
      dot.title = "VPS: " + bridge.status;
    }

    var liveElements = document.querySelectorAll(".live-only");
    for (var i = 0; i < liveElements.length; i++) {
      liveElements[i].style.display = bridge.status === "online" ? "" : "none";
    }
  }

  window.NexusBridge = bridge;

  document.addEventListener("DOMContentLoaded", function () {
    bridge.checkHealth();
  });
})();
