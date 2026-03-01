"""Calibration: select game area, auto-detect seats, configure table settings."""

from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path

from capture import ScreenRegion, capture_region
from ocr import scan_game_area, assign_seats, read_balance, ScanResult

CALIBRATION_FILE = Path(__file__).parent / "calibration_data.json"


def select_region_with_slurp(prompt: str) -> ScreenRegion:
    """Use slurp to let the user draw a rectangle."""
    print(f"\n>>> {prompt}")
    print("    Draw a rectangle around the region, then release.")
    result = subprocess.run(
        ["slurp", "-f", "%x %y %w %h"],
        capture_output=True,
        text=True,
        check=True,
    )
    parts = result.stdout.strip().split()
    return ScreenRegion(
        x=int(parts[0]),
        y=int(parts[1]),
        width=int(parts[2]),
        height=int(parts[3]),
    )


def run_calibration() -> dict:
    """Interactive calibration workflow."""
    print("=== Blackjack Counter Calibration ===")
    print("Make sure the game is visible on screen.\n")

    config: dict = {}

    # 1. Game area -- one big region around the entire game
    game_region = select_region_with_slurp(
        "Select the ENTIRE GAME AREA (the whole blackjack table, including dealer and all players)"
    )
    config["game_area"] = {
        "x": game_region.x,
        "y": game_region.y,
        "width": game_region.width,
        "height": game_region.height,
    }

    # 2. Which seat are you?
    print("\nWhich seat are you? (1-7, where 1 = rightmost, 7 = leftmost)")
    while True:
        try:
            seat_num = int(input("> ").strip())
            if 1 <= seat_num <= 7:
                break
        except ValueError:
            pass
        print("Enter a number 1-7 (1 = rightmost, 7 = leftmost).")
    config["my_seat_index"] = seat_num - 1  # 0-indexed internally

    # 4. Balance region (optional)
    print("\nDo you want to track your balance automatically via OCR? (y/n)")
    if input("> ").strip().lower() in ("y", "yes"):
        bal_region = select_region_with_slurp(
            "Select the BALANCE display region (just the number, not the label)"
        )
        config["balance"] = {
            "x": bal_region.x,
            "y": bal_region.y,
            "width": bal_region.width,
            "height": bal_region.height,
        }
        # Verify
        try:
            bal_img = capture_region(bal_region)
            bal_val = read_balance(bal_img)
            print(f"  Balance read: {bal_val}")
        except Exception as e:
            print(f"  Balance read failed: {e}")

    # 5. Table limits
    print("\nTable minimum bet?")
    while True:
        try:
            table_min = float(input("> ").strip())
            if table_min > 0:
                break
        except ValueError:
            pass
        print("Enter a positive number.")
    config["table_min"] = table_min

    print("Table maximum bet?")
    while True:
        try:
            table_max = float(input("> ").strip())
            if table_max >= table_min:
                break
        except ValueError:
            pass
        print(f"Enter a number >= {table_min}.")
    config["table_max"] = table_max

    # 6. Starting bankroll
    print("\nStarting bankroll? (enter 0 to skip)")
    while True:
        try:
            bankroll = float(input("> ").strip())
            if bankroll >= 0:
                break
        except ValueError:
            pass
        print("Enter a non-negative number.")
    if bankroll > 0:
        config["starting_bankroll"] = bankroll

    # Save
    with open(CALIBRATION_FILE, "w") as f:
        json.dump(config, f, indent=2)

    print(f"\nCalibration saved to {CALIBRATION_FILE}")
    return config


@dataclass
class CalibrationData:
    game_area: ScreenRegion
    balance_region: ScreenRegion | None
    my_seat_index: int
    table_min: float
    table_max: float
    starting_bankroll: float | None


def load_calibration() -> CalibrationData:
    """Load saved calibration data."""
    with open(CALIBRATION_FILE) as f:
        data = json.load(f)

    game_area = ScreenRegion(**data["game_area"])
    balance_region = ScreenRegion(**data["balance"]) if "balance" in data else None
    my_seat_index = data.get("my_seat_index", 0)
    table_min = float(data.get("table_min", 50.0))
    table_max = float(data.get("table_max", 25_000.0))
    starting_bankroll = float(data["starting_bankroll"]) if "starting_bankroll" in data else None

    return CalibrationData(
        game_area=game_area,
        balance_region=balance_region,
        my_seat_index=my_seat_index,
        table_min=table_min,
        table_max=table_max,
        starting_bankroll=starting_bankroll,
    )
