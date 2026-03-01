"""Main entry point: polling loop, keyboard input, wires all modules together."""

from __future__ import annotations

import sys
import select
import termios
import time
import tty

from counter import OmegaIICounter
from betting import BettingEngine
from display import BlackjackDisplay
from strategy import get_recommendation, should_take_insurance
from tracker import HandState, process_total, detect_new_round_dom


DEBUG = "--debug" in sys.argv


def check_keypress() -> str | None:
    if select.select([sys.stdin], [], [], 0.0)[0]:
        return sys.stdin.read(1).lower()
    return None


def debug_log(msg: str) -> None:
    if DEBUG:
        print(f"[DBG] {msg}")


def _parse_arg(prefix: str, default):
    """Extract --key=value from sys.argv."""
    for arg in sys.argv[1:]:
        if arg.startswith(prefix):
            return type(default)(arg.split("=", 1)[1])
    return default


def _prompt(label: str, default, cast=None):
    """Prompt for a value, returning *default* on empty input."""
    raw = input(f"  {label} [{default}]: ").strip()
    if not raw:
        return default
    try:
        return (cast or type(default))(raw)
    except ValueError:
        return default


def _interactive_setup(
    table_min: float,
    table_max: float,
    num_decks: int,
    seat_override: int,
) -> tuple[float, float, int, int, float | None]:
    """Ask the user for session settings. CLI args are used as defaults."""
    print("=== Session Setup (Enter to keep default) ===\n")
    table_min = _prompt("Table minimum bet", table_min, float)
    table_max = _prompt("Table maximum bet", table_max, float)
    num_decks = _prompt("Number of decks", num_decks, int)
    seat = _prompt("Your seat (0-6, or -1 for auto)", seat_override, int)
    bankroll_raw = input("  Starting bankroll (blank to skip) []: ").strip()
    bankroll: float | None = None
    if bankroll_raw:
        try:
            bankroll = float(bankroll_raw)
        except ValueError:
            pass
    print()
    return table_min, table_max, num_decks, seat, bankroll


def run_dom_counter() -> None:
    """Main counter loop using DOM bridge data from browser."""
    from ws_bridge import GameBridge
    from ws_sniffer import CONSOLE_SNIPPET, DEALER_SNIPPET

    table_min = _parse_arg("--table-min=", 25.0)
    table_max = _parse_arg("--table-max=", 500.0)
    num_decks = _parse_arg("--decks=", 8)
    seat_override = _parse_arg("--seat=", -1)

    table_min, table_max, num_decks, seat_override, bankroll = _interactive_setup(
        table_min, table_max, num_decks, seat_override,
    )

    bridge = GameBridge(port=9876)
    try:
        bridge.start()
    except OSError as e:
        print(f"Cannot start bridge on port 9876: {e}")
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
    print("Waiting for game data... (q to quit)")
    print("=" * 60)

    counter = OmegaIICounter(num_decks=num_decks)
    betting = BettingEngine(table_min=table_min, table_max=table_max)
    display = BlackjackDisplay()

    hand_states: dict[str, HandState] = {}
    previous_totals: dict[str, int | None] = {}
    round_number = 0
    my_seat: int | None = seat_override if seat_override >= 0 else None

    old_settings = termios.tcgetattr(sys.stdin)
    tty.setcbreak(sys.stdin.fileno())

    # Wait for first data before starting display
    print("Waiting for browser data...")
    try:
        while True:
            key = check_keypress()
            if key == "q":
                termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)
                bridge.stop()
                return
            if bridge.wait_for_update(timeout=0.5):
                state = bridge.get_game_state()
                if state and state.get("seats"):
                    print("Data received, starting counter.")
                    break
    except KeyboardInterrupt:
        termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)
        bridge.stop()
        return

    display.start()

    try:
        while True:
            # Poll for updates (non-blocking with short timeout)
            bridge.wait_for_update(timeout=0.5)
            state = bridge.get_game_state()

            current_totals: dict[str, int] = {}
            seat_display: dict[str, str] = {}

            if state:
                seats_data = state.get("seats", {})
                active_seat = state.get("activeSeat")
                dom_my_seat = state.get("mySeat")

                # Auto-detect user's seat from DOM
                if dom_my_seat is not None and seat_override < 0:
                    my_seat = dom_my_seat

                # Fallback: use activeSeat when it's decision time
                if my_seat is None and active_seat is not None:
                    for data in seats_data.values():
                        if data.get("seat") == active_seat and data.get("isDecisionTime"):
                            my_seat = active_seat
                            break

                # Convert DOM seats to totals
                for key, data in seats_data.items():
                    total_str = data.get("total", "")
                    seat_idx = data["seat"]
                    name = f"player_{seat_idx}"

                    # Store raw display text
                    seat_display[name] = total_str

                    # Parse numeric total for counting
                    total: int | None = None
                    if "/" in total_str:
                        # Soft hand: "2/12" -> take higher value
                        parts = total_str.split("/")
                        try:
                            total = max(int(p) for p in parts)
                        except ValueError:
                            pass
                    elif total_str.upper() == "BJ":
                        total = 21
                    else:
                        try:
                            total = int(total_str)
                        except ValueError:
                            pass

                    if total is not None:
                        current_totals[name] = total

            if current_totals:
                # Detect new round
                if detect_new_round_dom(current_totals, previous_totals):
                    round_number += 1
                    for hs in hand_states.values():
                        hs.reset()
                    if DEBUG:
                        debug_log(f"=== New round #{round_number} ===")

                # Process each seat
                for name, total in current_totals.items():
                    if name not in hand_states:
                        hand_states[name] = HandState()

                    new_cards = process_total(hand_states[name], total)
                    for card in new_cards:
                        counter.count_card(card)
                    if DEBUG and new_cards:
                        debug_log(f"  COUNTED {name}: cards={new_cards} RC={counter.running_count:+d}")
            else:
                previous_totals = {}

            # Strategy recommendation
            my_seat_key = f"player_{my_seat}" if my_seat is not None else None
            my_state = hand_states.get(my_seat_key) if my_seat_key else None
            my_total = current_totals.get(my_seat_key) if my_seat_key else None

            # Dealer total from bee7.io frame snippet
            dealer_total: int | None = None
            if state:
                dt = state.get("dealerTotal")
                if dt is not None:
                    try:
                        dealer_total = int(dt)
                        # Also count dealer cards
                        if "dealer" not in hand_states:
                            hand_states["dealer"] = HandState()
                        new_cards = process_total(hand_states["dealer"], dealer_total)
                        for card in new_cards:
                            counter.count_card(card)
                        if DEBUG and new_cards:
                            debug_log(f"  COUNTED dealer: cards={new_cards} RC={counter.running_count:+d}")
                        current_totals["dealer"] = dealer_total
                    except (ValueError, TypeError):
                        pass

            recommendation = None
            if my_total and dealer_total and my_state and my_state.deal_complete:
                recommendation = get_recommendation(
                    player_total=my_total,
                    dealer_upcard=dealer_total,
                    is_soft=my_state.is_soft,
                    is_pair=my_state.is_pair,
                    pair_value=my_state.pair_value,
                    true_count=counter.true_count,
                    num_cards=len(my_state.cards_inferred),
                )

            bet_rec = betting.get_bet(counter.true_count, bankroll=bankroll)
            insurance = should_take_insurance(counter.true_count)

            # Build display -- use raw text from DOM where available
            all_seat_totals: dict[str, str | None] = {}
            for name, text in seat_display.items():
                all_seat_totals[name] = text
            if dealer_total is not None:
                all_seat_totals["dealer"] = str(dealer_total)

            display.update(
                running_count=counter.running_count,
                true_count=counter.true_count,
                decks_remaining=counter.decks_remaining,
                cards_seen=counter.cards_seen,
                aces_seen=counter.aces_seen,
                aces_remaining=counter.aces_remaining,
                ace_richness=counter.ace_richness,
                dealer_total=dealer_total,
                player_total=my_total,
                player_is_soft=my_state.is_soft if my_state else False,
                player_is_pair=my_state.is_pair if my_state else False,
                recommendation=recommendation,
                bet_recommendation=bet_rec,
                insurance_recommended=insurance,
                round_number=round_number,
                all_seat_totals=all_seat_totals,
                bankroll=bankroll,
                table_min=table_min,
                table_max=table_max,
            )

            previous_totals = dict(current_totals)

            # Keyboard
            key = check_keypress()
            if key == "q":
                break
            elif key == "r":
                counter.reset()
                round_number = 0
                hand_states.clear()
                previous_totals.clear()
            elif key == "+":
                counter.running_count += 1
            elif key == "-":
                counter.running_count -= 1

    finally:
        display.stop()
        termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)
        bridge.stop()
        print(f"\nSession: {round_number} rounds, RC={counter.running_count:+d}, "
              f"TC={counter.true_count:+.1f}, {counter.cards_seen} cards seen")


def run_ocr_counter() -> None:
    """Legacy OCR-based counter (requires calibration)."""
    from calibration import load_calibration, run_calibration, CALIBRATION_FILE
    from capture import capture_region
    from ocr import scan_game_area, assign_seats, read_balance
    from tracker import process_reading, detect_new_round

    try:
        cal = load_calibration()
    except FileNotFoundError:
        print(f"No calibration found at {CALIBRATION_FILE}")
        print("Run: ./run.sh calibrate")
        sys.exit(1)

    game_area = cal.game_area
    balance_region = cal.balance_region
    my_seat_index = cal.my_seat_index

    counter = OmegaIICounter(num_decks=8)
    betting_eng = BettingEngine(
        table_min=cal.table_min,
        table_max=cal.table_max,
    )
    display = BlackjackDisplay()

    bankroll: float | None = None
    starting_bankroll: float | None = cal.starting_bankroll
    session_high: float | None = None
    session_low: float | None = None
    if starting_bankroll is not None:
        bankroll = starting_bankroll
        session_high = starting_bankroll
        session_low = starting_bankroll

    hand_states: dict[str, HandState] = {}
    previous_totals: dict[str, int | None] = {}
    round_number = 0

    old_settings = termios.tcgetattr(sys.stdin)
    tty.setcbreak(sys.stdin.fileno())

    display.start()

    try:
        while True:
            try:
                game_img = capture_region(game_area)
                readings, you_positions = scan_game_area(game_img)
                scan = assign_seats(
                    readings, game_area.height, game_area.width, you_positions
                )
            except Exception:
                time.sleep(1.0)
                continue

            current_seats = scan.seats
            my_seat_key = f"player_{my_seat_index}"

            if balance_region is not None:
                try:
                    bal_img = capture_region(balance_region)
                    bal_val = read_balance(bal_img)
                    if bal_val is not None:
                        bankroll = bal_val
                        if starting_bankroll is None:
                            starting_bankroll = bal_val
                        if session_high is None or bal_val > session_high:
                            session_high = bal_val
                        if session_low is None or bal_val < session_low:
                            session_low = bal_val
                except Exception:
                    pass

            if current_seats:
                if detect_new_round(current_seats, previous_totals):
                    round_number += 1
                    for hs in hand_states.values():
                        hs.reset()

                for name, reading in current_seats.items():
                    if name not in hand_states:
                        hand_states[name] = HandState()
                    new_cards = process_reading(hand_states[name], reading)
                    for card in new_cards:
                        counter.count_card(card)
            else:
                previous_totals = {}

            my_state = hand_states.get(my_seat_key)
            my_reading = current_seats.get(my_seat_key)
            dealer_reading = current_seats.get("dealer")

            recommendation = None
            player_total = my_reading.total if my_reading else None
            dealer_total = dealer_reading.total if dealer_reading else None

            if player_total and dealer_total and my_state and my_state.deal_complete:
                recommendation = get_recommendation(
                    player_total=player_total,
                    dealer_upcard=dealer_total,
                    is_soft=my_state.is_soft,
                    is_pair=my_state.is_pair,
                    pair_value=my_state.pair_value,
                    true_count=counter.true_count,
                    num_cards=len(my_state.cards_inferred),
                )

            bet_rec = betting_eng.get_bet(counter.true_count, bankroll=bankroll)
            insurance = should_take_insurance(counter.true_count)

            all_seat_totals: dict[str, int | None] = {}
            for name, reading in current_seats.items():
                all_seat_totals[name] = reading.total

            display.update(
                running_count=counter.running_count,
                true_count=counter.true_count,
                decks_remaining=counter.decks_remaining,
                cards_seen=counter.cards_seen,
                aces_seen=counter.aces_seen,
                aces_remaining=counter.aces_remaining,
                ace_richness=counter.ace_richness,
                dealer_total=dealer_total,
                player_total=player_total,
                player_is_soft=my_state.is_soft if my_state else False,
                player_is_pair=my_state.is_pair if my_state else False,
                recommendation=recommendation,
                bet_recommendation=bet_rec,
                insurance_recommended=insurance,
                round_number=round_number,
                all_seat_totals=all_seat_totals,
                bankroll=bankroll,
                starting_bankroll=starting_bankroll,
                session_high=session_high,
                session_low=session_low,
                table_min=cal.table_min,
                table_max=cal.table_max,
            )

            key = check_keypress()
            if key == "q":
                break
            elif key == "r":
                counter.reset()
                round_number = 0
                hand_states.clear()
                previous_totals.clear()
            elif key == "c":
                display.stop()
                termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)
                from calibration import run_calibration as recal
                recal()
                cal = load_calibration()
                game_area = cal.game_area
                balance_region = cal.balance_region
                my_seat_index = cal.my_seat_index
                betting_eng = BettingEngine(
                    table_min=cal.table_min,
                    table_max=cal.table_max,
                )
                hand_states.clear()
                previous_totals.clear()
                tty.setcbreak(sys.stdin.fileno())
                display = BlackjackDisplay()
                display.start()
            elif key == "+":
                counter.running_count += 1
            elif key == "-":
                counter.running_count -= 1

            previous_totals = {
                name: reading.total for name, reading in current_seats.items()
            }

            time.sleep(1.0)

    finally:
        display.stop()
        termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if args and args[0] == "calibrate":
        from calibration import run_calibration
        run_calibration()
    elif args and args[0] == "sniff":
        sys.argv = [sys.argv[0]] + args[1:] + [a for a in sys.argv[1:] if a.startswith("--")]
        from ws_sniffer import main as sniff_main
        sniff_main()
    elif args and args[0] == "ocr":
        run_ocr_counter()
    else:
        # Default: DOM mode
        if DEBUG:
            print("Debug mode ON")
        run_dom_counter()


if __name__ == "__main__":
    main()
