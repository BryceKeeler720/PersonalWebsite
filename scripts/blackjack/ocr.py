"""OCR pipeline: full-area scanning, hand display parsing, balance reading."""

from __future__ import annotations

import re
from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image
import pytesseract


@dataclass
class HandReading:
    """A detected hand total on screen."""
    total: int              # Optimal hand total (soft value when applicable)
    is_soft: bool           # Whether display showed "X/Y" soft format
    is_blackjack: bool      # Whether display showed "BJ"
    raw_text: str           # Original OCR text
    x: int                  # Center X in the image
    y: int                  # Center Y in the image
    confidence: int = 0     # OCR confidence (0-100)


# Patterns: "BJ", "21", "7/17", etc.
_SOFT_PATTERN = re.compile(r"^(\d{1,2})[/|](\d{1,2})$")
_NUMBER_PATTERN = re.compile(r"^\d{1,2}$")

# Minimum text height (in 2x-scaled pixels) for a hand total detection.
# Stake displays hand totals in large ~16-20px font (32-40px scaled).
# Small card-value indicators in colored circles are ~8-12px (16-24px scaled).
# This threshold filters out the small card-value circles while keeping totals.
_MIN_TEXT_HEIGHT_SCALED = 24

# Balance number extraction -- finds decimal or integer numbers in OCR text
_BALANCE_NUMBER = re.compile(r"[\d,]+\.?\d*")


def parse_hand_text(text: str) -> tuple[int, bool, bool] | None:
    """Parse a hand display string.

    Returns (total, is_soft, is_blackjack) or None if not a valid hand.

    Handles:
      "BJ"   -> (21, False, True)
      "7/17" -> (17, True, False)
      "2/12" -> (12, True, False)
      "14"   -> (14, False, False)
    """
    text = text.strip().upper()

    if text == "BJ":
        return (21, False, True)

    # Soft hand: "7/17", "2/12", etc.
    m = _SOFT_PATTERN.match(text)
    if m:
        hard = int(m.group(1))
        soft = int(m.group(2))
        # Validate: soft - hard should be 10 (the ace swing)
        if soft - hard == 10 and 2 <= soft <= 21:
            return (soft, True, False)

    # Plain number
    if _NUMBER_PATTERN.match(text):
        val = int(text)
        if 2 <= val <= 21:
            return (val, False, False)

    return None


def preprocess_for_scan(img: Image.Image) -> list[np.ndarray]:
    """Preprocess a game-area image for text detection.

    Returns multiple binary images to try -- the Stake game uses bright text
    on dark/semi-transparent backgrounds, so we try several approaches:
    1. Adaptive threshold for varying backgrounds
    2. High threshold for bright white text on dark badges
    3. CLAHE + Otsu for mid-contrast colored text
    """
    gray = np.array(img.convert("L"))
    gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

    results: list[np.ndarray] = []

    # Pass 1: Adaptive threshold (good for varying backgrounds)
    adaptive = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 10
    )
    results.append(adaptive)

    # Pass 2: Bright text isolation (Stake's white text on dark badges)
    _, bright = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)
    results.append(bright)

    # Pass 3: CLAHE contrast enhancement + Otsu (catches colored text on
    # semi-transparent backgrounds that the other passes might miss)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    _, otsu = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    results.append(otsu)

    return results


def _is_chip_amount(text: str, all_words: list[str], idx: int) -> bool:
    """Check if a detected number is a chip amount (e.g. '100K', '260K').

    Chip amounts in Stake have a K/M suffix or are near such text.
    """
    # Direct suffix: "100K", "250k", "1M"
    if text[-1:].upper() in ("K", "M"):
        return True
    # Next word is K/M (Tesseract split)
    if idx + 1 < len(all_words):
        nxt = all_words[idx + 1].strip().upper()
        if nxt in ("K", "M", "K.", "M."):
            return True
    return False


def scan_game_area(img: Image.Image) -> tuple[list[HandReading], list[tuple[int, int]]]:
    """Scan a full game-area image for hand totals and "You" labels.

    Returns (hand_readings, you_positions).
    Runs multiple preprocessing passes to handle Stake's bright-on-dark text.
    Uses text height filtering to ignore small card-value indicators in circles.
    """
    binaries = preprocess_for_scan(img)

    all_readings: list[HandReading] = []
    all_you: list[tuple[int, int]] = []

    for binary in binaries:
        pil_binary = Image.fromarray(binary)
        config = r"--psm 11 --oem 3"
        data = pytesseract.image_to_data(
            pil_binary, config=config, output_type=pytesseract.Output.DICT
        )

        n = len(data["text"])
        words = data["text"]

        for i in range(n):
            text = words[i].strip()
            conf = int(data["conf"][i])
            if not text or conf < 30:
                continue

            text_height = int(data["height"][i])

            # Detect "You" label (no height filter -- can be small)
            if text.lower() in ("you", "vou", "ycu", "y0u", "yo0"):
                cx = (data["left"][i] + data["width"][i] // 2) // 2
                cy = (data["top"][i] + data["height"][i] // 2) // 2
                all_you.append((cx, cy))
                continue

            # Height filter: skip small text (card-value indicators in circles,
            # chat text, chip multipliers like "x3", etc.)
            if text_height < _MIN_TEXT_HEIGHT_SCALED:
                continue

            # Skip chip amounts (100K, 260K, etc.)
            if _is_chip_amount(text, words, i):
                continue

            # Try direct parse
            parsed = parse_hand_text(text)
            if parsed:
                total, is_soft, is_bj = parsed
                cx = (data["left"][i] + data["width"][i] // 2) // 2
                cy = (data["top"][i] + data["height"][i] // 2) // 2
                all_readings.append(HandReading(
                    total=total, is_soft=is_soft, is_blackjack=is_bj,
                    raw_text=text, x=cx, y=cy, confidence=conf,
                ))
                continue

            # Merge split "X / Y" soft hand display
            if i + 2 < n and _NUMBER_PATTERN.match(text):
                next1 = words[i + 1].strip()
                next2 = words[i + 2].strip()
                if next1 in ("/", "|", "I", "l", "1") and _NUMBER_PATTERN.match(next2):
                    merged = f"{text}/{next2}"
                    parsed = parse_hand_text(merged)
                    if parsed:
                        total, is_soft, is_bj = parsed
                        cx = (data["left"][i] + data["width"][i] // 2) // 2
                        cy = (data["top"][i] + data["height"][i] // 2) // 2
                        all_readings.append(HandReading(
                            total=total, is_soft=is_soft, is_blackjack=is_bj,
                            raw_text=merged, x=cx, y=cy, confidence=conf,
                        ))

    # Deduplicate across all preprocessing passes
    return _deduplicate(all_readings, threshold=30), all_you


def _deduplicate(readings: list[HandReading], threshold: int) -> list[HandReading]:
    """Remove duplicate detections that are spatially close.

    When two detections overlap, keeps the one with higher confidence.
    """
    if not readings:
        return readings

    # Sort by confidence descending so we keep best detections first
    indexed = sorted(enumerate(readings), key=lambda x: x[1].confidence, reverse=True)
    used = [False] * len(readings)
    kept: list[HandReading] = []

    for orig_idx, r in indexed:
        if used[orig_idx]:
            continue
        used[orig_idx] = True
        # Mark any nearby lower-confidence detections as used
        for other_idx, other in indexed:
            if used[other_idx]:
                continue
            dx = abs(r.x - other.x)
            dy = abs(r.y - other.y)
            if dx < threshold and dy < threshold:
                used[other_idx] = True
        kept.append(r)

    # Sort by x position for consistent left-to-right ordering
    kept.sort(key=lambda r: r.x)
    return kept


@dataclass
class ScanResult:
    """Full result from scanning the game area."""
    seats: dict[str, HandReading]  # "dealer", "player_0", "player_1", ...
    my_seat_index: int | None      # Auto-detected from "You" label, or None


def assign_seats(
    readings: list[HandReading],
    game_height: int,
    game_width: int,
    you_positions: list[tuple[int, int]],
    dealer_y_fraction: float = 0.40,
    player_y_fraction: float = 0.68,
) -> ScanResult:
    """Assign detected readings to dealer/player seats by position.

    The game area is split into three vertical zones:
      - Dealer zone:  y < dealer_y_fraction  (top ~40%)
      - Dead zone:    dealer_y_fraction <= y < player_y_fraction  (middle ~28%)
      - Player zone:  y >= player_y_fraction  (bottom ~32%)

    The dead zone covers the table felt where chip/bet amounts, table text
    ("BLACKJACK RETURNS 3 TO 2"), and other non-hand-total numbers appear.
    Any detections in this zone are discarded.

    Dealer = topmost reading in the dealer zone.
    Players = readings in the player zone, sorted right-to-left
    (Stake numbers seats 1-7 from right to left).
    my_seat_index = the player seat closest to a "You" label.
    """
    seats: dict[str, HandReading] = {}
    dealer_cutoff = game_height * dealer_y_fraction
    player_cutoff = game_height * player_y_fraction

    dealer_candidates: list[HandReading] = []
    player_candidates: list[HandReading] = []

    for r in readings:
        if r.y < dealer_cutoff:
            dealer_candidates.append(r)
        elif r.y >= player_cutoff:
            player_candidates.append(r)
        # else: dead zone -- discard (chips, table text, etc.)

    # Dealer: topmost detection in the upper zone
    if dealer_candidates:
        dealer_candidates.sort(key=lambda r: r.y)
        seats["dealer"] = dealer_candidates[0]

    # Players: sort right to left (Stake seats 1-7 go right to left)
    player_candidates.sort(key=lambda r: r.x, reverse=True)
    for i, r in enumerate(player_candidates):
        seats[f"player_{i}"] = r

    # Auto-detect user's seat from "You" labels
    my_seat_index: int | None = None
    if you_positions and player_candidates:
        # Find which player seat is closest to any "You" label
        best_dist = float("inf")
        for yx, yy in you_positions:
            for i, r in enumerate(player_candidates):
                dist = abs(r.x - yx) + abs(r.y - yy)
                if dist < best_dist:
                    best_dist = dist
                    my_seat_index = i

    return ScanResult(seats=seats, my_seat_index=my_seat_index)


# --- Balance reading (unchanged, uses small-region approach) ---

def preprocess_for_ocr(img: Image.Image) -> Image.Image:
    """Preprocess a small region for Tesseract (used for balance only)."""
    gray = np.array(img.convert("L"))
    gray = cv2.resize(gray, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    if np.mean(binary) < 128:
        binary = cv2.bitwise_not(binary)
    padded = cv2.copyMakeBorder(
        binary, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=255
    )
    return Image.fromarray(padded)


def read_balance(img: Image.Image) -> float | None:
    """OCR a balance region.

    Handles formats like 'STAKESC 71.05', '660,000.00', '100000', etc.
    Extracts the numeric portion from whatever text Tesseract reads.
    """
    processed = preprocess_for_ocr(img)
    config = r"--psm 7 --oem 3"
    text = pytesseract.image_to_string(processed, lang="eng", config=config).strip()
    if not text:
        return None
    # Find all number-like sequences and take the last one
    # (handles "STAKESC 71.05" -> "71.05", "Balance: $1,234.56" -> "1,234.56")
    matches = _BALANCE_NUMBER.findall(text)
    if not matches:
        return None
    # Use the last match (the actual balance number, after any label prefix)
    cleaned = matches[-1].replace(",", "")
    try:
        val = float(cleaned)
        return val if val > 0 else None
    except ValueError:
        return None
