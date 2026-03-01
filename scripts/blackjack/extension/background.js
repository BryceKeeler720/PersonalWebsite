/**
 * Background script -- programmatically injects the content script
 * into ALL frames (including cross-origin iframes) when a Stake tab loads.
 *
 * This is more forceful than declarative content_scripts and works
 * for dynamically created iframes.
 */

function inject(tabId) {
  browser.tabs.executeScript(tabId, {
    file: "content.js",
    allFrames: true,
    matchAboutBlank: true,
    runAt: "document_idle",
  }).then(() => {
    console.log("[BJ BG] Injected into tab", tabId);
  }).catch((e) => {
    console.log("[BJ BG] Inject failed:", e.message);
  });
}

// Inject when a Stake page finishes loading
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    if (tab.url.includes("stake.com") || tab.url.includes("stake.us") ||
        tab.url.includes("stake.bet")) {
      // Small delay to ensure iframes are loaded
      setTimeout(() => inject(tabId), 2000);
    }
  }
});

// Also inject into already-open Stake tabs on extension load
browser.tabs.query({ url: ["*://*.stake.com/*", "*://*.stake.us/*", "*://*.stake.bet/*"] })
  .then((tabs) => {
    for (const tab of tabs) {
      inject(tab.id);
    }
  });
