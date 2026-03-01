"""Local HTTP server that receives game state from browser console snippets.

Accepts POSTs from two sources:
  - Lobby frame snippet: sends {seats, activeSeat, mySeat}
  - bee7.io frame snippet: sends {dealerTotal}
Data is merged so get_game_state() returns the combined view.
"""

from __future__ import annotations

import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler


class _BridgeHandler(BaseHTTPRequestHandler):
    """HTTP handler that receives POSTed game state from the extension."""

    # Shared state (class-level)
    _lock = threading.Lock()
    _latest_state: dict | None = None
    _on_update = threading.Event()

    def do_POST(self) -> None:
        if self.path == "/game-state":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                incoming = json.loads(body)
                with _BridgeHandler._lock:
                    if _BridgeHandler._latest_state is None:
                        _BridgeHandler._latest_state = incoming
                    else:
                        # Merge: each snippet updates only its fields
                        for key in ("seats", "activeSeat", "mySeat", "dealerTotal"):
                            if key in incoming:
                                _BridgeHandler._latest_state[key] = incoming[key]
                        _BridgeHandler._latest_state["ts"] = incoming.get("ts", 0)
                _BridgeHandler._on_update.set()
            except (json.JSONDecodeError, KeyError):
                pass

            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self) -> None:
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args) -> None:
        pass  # Suppress HTTP request logs


class GameBridge:
    """Manages the local bridge server and provides access to game state."""

    def __init__(self, port: int = 9876) -> None:
        self.port = port
        self._server: HTTPServer | None = None
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        """Start the bridge server in a background thread."""
        self._server = HTTPServer(("localhost", self.port), _BridgeHandler)
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        if self._server:
            self._server.shutdown()

    def get_game_state(self) -> dict | None:
        """Return the latest game state, or None if no data received yet."""
        with _BridgeHandler._lock:
            return _BridgeHandler._latest_state

    def wait_for_update(self, timeout: float = 2.0) -> bool:
        """Block until game state is updated. Returns True if updated."""
        _BridgeHandler._on_update.clear()
        return _BridgeHandler._on_update.wait(timeout=timeout)
