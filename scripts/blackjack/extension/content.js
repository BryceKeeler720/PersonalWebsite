/**
 * Content script -- reads hand totals from Stake page DOM.
 * Searches current document AND all accessible iframes recursively,
 * so it works regardless of which frame it runs in.
 */

const BRIDGE_URL = "http://localhost:9876/game-state";

function findAllBadges() {
  const badges = [];
  function search(doc) {
    try {
      for (const b of doc.querySelectorAll(".score-badge")) {
        badges.push(b);
      }
      for (const frame of doc.querySelectorAll("iframe")) {
        try {
          if (frame.contentDocument) search(frame.contentDocument);
        } catch (e) {} // cross-origin
      }
    } catch (e) {}
  }
  search(document);
  return badges;
}

function readGameState() {
  const badges = findAllBadges();
  if (!badges.length) return null;

  const seats = {};
  let activeSeat = null;

  for (const badge of badges) {
    const classStr = badge.className;
    const seatMatch = classStr.match(/n-score-seat-(\d+)-hand-(\d+)/);
    if (!seatMatch) continue;

    const seatIdx = parseInt(seatMatch[1], 10);
    const handIdx = parseInt(seatMatch[2], 10);

    let totalText = "";
    for (const node of badge.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        totalText += node.textContent.trim();
      }
    }

    if (!totalText) continue;

    const key = "seat_" + seatIdx + "_hand_" + handIdx;
    seats[key] = {
      seat: seatIdx,
      hand: handIdx,
      total: totalText,
      isDecisionTime: classStr.includes("decision-time"),
    };

    if (classStr.includes("decision-time")) {
      activeSeat = seatIdx;
    }
  }

  return Object.keys(seats).length > 0
    ? { seats: seats, activeSeat: activeSeat, ts: Date.now() }
    : null;
}

let lastJson = "";

function sendUpdate() {
  const state = readGameState();
  if (!state) return;
  const json = JSON.stringify(state);
  if (json === lastJson) return;
  lastJson = json;
  fetch(BRIDGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: json,
  }).catch(function () {});
}

// Use polling instead of MutationObserver since badges may be in iframes
setInterval(sendUpdate, 500);
console.log("[BJ] Content script active (searching all frames)");
