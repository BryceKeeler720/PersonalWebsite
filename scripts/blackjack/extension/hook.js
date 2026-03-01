/**
 * Page-level WebSocket hook.
 *
 * Injected into the page context (not the extension sandbox) so it can
 * monkey-patch the real WebSocket constructor.  Captures all frames on
 * every connection opened after injection and dispatches them as
 * CustomEvents that the content script picks up.
 */
(function () {
  if (window.__bj_ws_hooked) return;
  window.__bj_ws_hooked = true;

  const OriginalWebSocket = window.WebSocket;

  class HookedWebSocket extends OriginalWebSocket {
    constructor(url, protocols) {
      super(url, protocols);
      const wsUrl = url;

      this.addEventListener("message", (event) => {
        try {
          document.dispatchEvent(
            new CustomEvent("__bj_ws_msg", {
              detail: JSON.stringify({
                url: wsUrl,
                data:
                  typeof event.data === "string"
                    ? event.data
                    : "[binary]",
                ts: Date.now(),
                dir: "recv",
              }),
            })
          );
        } catch (_) {}
      });
    }

    send(data) {
      try {
        document.dispatchEvent(
          new CustomEvent("__bj_ws_msg", {
            detail: JSON.stringify({
              url: this.url,
              data: typeof data === "string" ? data : "[binary]",
              ts: Date.now(),
              dir: "send",
            }),
          })
        );
      } catch (_) {}
      return super.send(data);
    }
  }

  window.WebSocket = HookedWebSocket;
  console.log("[BJ] WebSocket hook installed");
})();
