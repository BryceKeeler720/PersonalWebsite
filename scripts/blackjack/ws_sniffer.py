"""DOM sniffer: log game state received from browser console snippet.

Usage:
  1. Run: ./run.sh sniff
  2. Switch to the lobby frame in browser DevTools console
  3. Paste the snippet into the console
  4. Play a hand -- game state updates will be logged
  5. Ctrl+C to stop
"""

from __future__ import annotations

import json
import sys

from ws_bridge import GameBridge

# Main snippet: lobby frame -- reads all seat totals including dealer (seat -1)
# Uses MutationObserver for instant change detection (catches bust transitions)
# with 500ms fallback polling. Handles soft "X/Y" format for dealer.
CONSOLE_SNIPPET = (
    "(function(){"
    "if(window.__bj_active)return;"
    "window.__bj_active=true;"
    "var ms=null,last='',pending=false;"
    "function parseNum(t){"
    "if(t.indexOf('/')!==-1){var p=t.split('/');var n=Math.max.apply(null,p.map(Number));return isNaN(n)?null:n;}"
    "var n=+t;return isNaN(n)?null:n;}"
    "function getText(b){"
    "var t='';"
    "for(var k=0;k<b.childNodes.length;k++){"
    "if(b.childNodes[k].nodeType===3)t+=b.childNodes[k].textContent.trim();}"
    "if(!t){var ft=b.textContent.trim();"
    "var nm=ft.match(/(\\d+\\/\\d+|\\d+)/);if(nm)t=nm[1];}"
    "return t;}"
    "function scan(){"
    "var badges=document.querySelectorAll('.score-badge');"
    "if(!badges.length)return;"
    "if(ms===null){"
    "var u=document.querySelector('.current-user-seat');"
    "if(u){var w=u.closest('[class*=PLACE_]');"
    "if(w){var pm=w.className.match(/PLACE_(\\d+)/);if(pm)ms=+pm[1]}}"
    "}"
    "var seats={},active=null,dt=null;"
    "for(var i=0;i<badges.length;i++){"
    "var b=badges[i];"
    "var m=b.className.match(/n-score-seat-(-?\\d+)-hand-(\\d+)/);"
    "if(!m)continue;"
    "var t=getText(b);"
    "if(!t)continue;"
    "var sn=+m[1];"
    "if(sn===-1){dt=parseNum(t);continue;}"
    "var key='seat_'+m[1]+'_hand_'+m[2];"
    "seats[key]={seat:sn,hand:+m[2],total:t,"
    "isDecisionTime:b.className.includes('decision-time')};"
    "if(b.className.includes('decision-time'))active=sn;"
    "}"
    "var cmp=JSON.stringify({s:seats,a:active,m:ms,d:dt});"
    "if(cmp!==last){last=cmp;"
    "fetch('http://localhost:9876/game-state',"
    "{method:'POST',headers:{'Content-Type':'application/json'},"
    "body:JSON.stringify({seats:seats,activeSeat:active,mySeat:ms,dealerTotal:dt,ts:Date.now()})"
    "}).catch(function(){});}}"
    "new MutationObserver(function(){"
    "if(!pending){pending=true;requestAnimationFrame(function(){pending=false;scan();});}}"
    ").observe(document.body,{childList:true,subtree:true,characterData:true});"
    "setInterval(scan,500);"
    "console.log('[BJ] Scraper active (observer + polling)');"
    "})()"
)

# Fallback snippet for bee7.io frame if dealer badge is not in lobby frame
DEALER_SNIPPET = (
    "(function(){"
    "if(window.__bj_dealer)return;"
    "window.__bj_dealer=true;"
    "var last='';"
    "function parseNum(t){"
    "if(t.indexOf('/')!==-1){var p=t.split('/');var n=Math.max.apply(null,p.map(Number));return isNaN(n)?null:n;}"
    "var n=+t;return isNaN(n)?null:n;}"
    "function getText(b){"
    "var t='';"
    "for(var k=0;k<b.childNodes.length;k++){"
    "if(b.childNodes[k].nodeType===3)t+=b.childNodes[k].textContent.trim();}"
    "if(!t){var ft=b.textContent.trim();"
    "var nm=ft.match(/(\\d+\\/\\d+|\\d+)/);if(nm)t=nm[1];}"
    "return t;}"
    "function scan(){"
    "var dt=null;"
    "var b=document.querySelector('[class*=\"n-score-seat--1\"]');"
    "if(!b){var bs=document.querySelectorAll('.score-badge');"
    "for(var i=0;i<bs.length;i++){if(bs[i].className.match(/n-score-seat--1/)){b=bs[i];break;}}}"
    "if(b){var t=getText(b);"
    "if(t)dt=parseNum(t);}"
    "if(dt!==null){var cmp='d:'+dt;"
    "if(cmp!==last){last=cmp;"
    "fetch('http://localhost:9876/game-state',"
    "{method:'POST',headers:{'Content-Type':'application/json'},"
    "body:JSON.stringify({dealerTotal:dt,ts:Date.now()})"
    "}).catch(function(){});}}}"
    "new MutationObserver(function(){scan();}).observe(document.body,{childList:true,subtree:true,characterData:true});"
    "setInterval(scan,500);"
    "console.log('[BJ] Dealer scraper active');"
    "})()"
)

def main() -> None:
    bridge = GameBridge(port=9876)
    try:
        bridge.start()
    except OSError as e:
        print(f"ERROR: Cannot start bridge server on port 9876: {e}")
        print("Is another instance already running?")
        sys.exit(1)

    print("Bridge server listening on http://localhost:9876")
    print()
    print("=== SNIPPET 1: Paste in LOBBY frame ===")
    print()
    print(CONSOLE_SNIPPET)
    print()
    print("=== SNIPPET 2: Paste in BEE7.IO frame (if dealer not showing) ===")
    print()
    print(DEALER_SNIPPET)
    print()
    print("=" * 60)
    print("Waiting for game state updates... (Ctrl+C to stop)")
    print("=" * 60)

    update_count = 0

    try:
        while True:
            if bridge.wait_for_update(timeout=2.0):
                state = bridge.get_game_state()
                if state:
                    update_count += 1
                    print(f"\n[Update #{update_count}]")
                    print(json.dumps(state, indent=2))

    except KeyboardInterrupt:
        print(f"\n\nSniffer stopped. {update_count} updates received.")
    finally:
        bridge.stop()


if __name__ == "__main__":
    main()
