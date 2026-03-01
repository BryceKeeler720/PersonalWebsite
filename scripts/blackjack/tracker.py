"""Hand state machine: tracks totals per seat and infers individual card values.

Includes debouncing to filter OCR noise -- a reading must be stable across
multiple consecutive scans before being accepted as a genuine card.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ocr import HandReading

# A reading must appear identically in this many consecutive scans
# before it's accepted as real. At 1-second polling this adds 1 second
# of latency, which is fine for live dealer pace.
CONFIRM_SCANS = 2


@dataclass
class HandState:
    """Tracks a single hand at a seat.

    Two layers of protection against OCR noise:
    1. Debouncing: a total must be seen CONFIRM_SCANS times consecutively
       before being accepted.
    2. Deal buffering: the first confirmed card is buffered until the second
       card arrives, so the count only updates when both initial cards are dealt.
    """
    totals_history: list[int] = field(default_factory=list)
    cards_inferred: list[int] = field(default_factory=list)
    _pending_cards: list[int] = field(default_factory=list)
    is_soft: bool = False
    is_blackjack: bool = False

    # Debounce state
    _candidate_total: int | None = None
    _candidate_soft: bool = False
    _candidate_bj: bool = False
    _candidate_count: int = 0

    def reset(self) -> None:
        self.totals_history.clear()
        self.cards_inferred.clear()
        self._pending_cards.clear()
        self.is_soft = False
        self.is_blackjack = False
        self._candidate_total = None
        self._candidate_soft = False
        self._candidate_bj = False
        self._candidate_count = 0

    @property
    def last_total(self) -> int | None:
        return self.totals_history[-1] if self.totals_history else None

    @property
    def deal_complete(self) -> bool:
        """Whether both initial cards have been observed (total changed at least once)."""
        return len(self.totals_history) >= 2 or self.is_blackjack

    @property
    def is_pair(self) -> bool:
        return (
            len(self.cards_inferred) == 2
            and self.cards_inferred[0] == self.cards_inferred[1]
        )

    @property
    def pair_value(self) -> int | None:
        return self.cards_inferred[0] if self.is_pair else None


def infer_card_from_total_change(
    previous_total: int | None,
    new_total: int,
    was_soft: bool,
) -> tuple[int, bool]:
    """Infer the card dealt based on the hand total transition.

    Returns (card_value, is_now_soft).
    card_value: 2-10 for pip cards, 11 for ace.
    """
    if previous_total is None:
        if new_total == 11:
            return (11, True)  # Ace
        return (new_total, False)

    diff = new_total - previous_total

    if not was_soft:
        if diff == 11:
            return (11, True)
        if 1 <= diff <= 10:
            return (diff, False)
        return (diff, False)
    else:
        if diff > 0:
            if diff == 11:
                return (11, True)
            return (diff, True)
        else:
            real_card = diff + 10
            if real_card == 11:
                return (11, False)
            return (real_card, False)


def is_valid_transition(prev: int | None, curr: int, is_soft: bool) -> bool:
    """Check if a total transition is plausible."""
    if prev is None:
        return 2 <= curr <= 21
    diff = curr - prev
    if not is_soft:
        return 1 <= diff <= 11
    else:
        return -9 <= diff <= 11


def process_reading(hand: HandState, reading: HandReading) -> list[int]:
    """Process a new HandReading for a seat, returning newly inferred card values.

    Readings are debounced: a total must appear identically in CONFIRM_SCANS
    consecutive calls before being accepted. This filters OCR flicker where
    Tesseract misreads a number for one frame then corrects it.

    After debouncing, cards are further buffered until the deal is complete
    (both initial cards seen) before being returned for counting.

    Returns the list of card values to count:
      - Empty list if no new card, still debouncing, or waiting for second card
      - [card1, card2] when the second card arrives (flushes buffer)
      - [card] for subsequent hits after the deal
      - [11, 10] for blackjack (immediate after debounce)
    """
    total = reading.total
    is_soft = reading.is_soft
    is_bj = reading.is_blackjack

    # Same as last confirmed total -- no change, reset candidate
    if total == hand.last_total and is_soft == hand.is_soft:
        hand._candidate_total = None
        hand._candidate_count = 0
        return []

    # Check if this matches the current candidate (debounce)
    if (total == hand._candidate_total
            and is_soft == hand._candidate_soft
            and is_bj == hand._candidate_bj):
        hand._candidate_count += 1
    else:
        # New candidate -- start counting
        hand._candidate_total = total
        hand._candidate_soft = is_soft
        hand._candidate_bj = is_bj
        hand._candidate_count = 1

    # Not yet confirmed
    if hand._candidate_count < CONFIRM_SCANS:
        return []

    # Confirmed! Clear candidate state
    hand._candidate_total = None
    hand._candidate_count = 0

    # --- From here, the reading is confirmed stable ---

    # BJ = ace + 10-value, always exactly 2 cards
    if is_bj and not hand.cards_inferred:
        hand.cards_inferred = [11, 10]
        hand.totals_history = [total]
        hand.is_soft = False
        hand.is_blackjack = True
        return [11, 10]

    prev_total = hand.last_total

    # Validate transition
    if prev_total is not None and not is_valid_transition(prev_total, total, hand.is_soft):
        return []

    # Infer the new card
    card_val, _ = infer_card_from_total_change(prev_total, total, hand.is_soft)

    if 1 <= card_val <= 11:
        hand.cards_inferred.append(card_val)
        hand.totals_history.append(total)
        hand.is_soft = is_soft

        if not hand.deal_complete:
            # First card seen -- buffer it, wait for second card
            hand._pending_cards.append(card_val)
            return []
        elif hand._pending_cards:
            # Second card just arrived -- flush buffered + new card together
            all_cards = hand._pending_cards + [card_val]
            hand._pending_cards.clear()
            return all_cards
        else:
            # Normal hit after deal is complete
            return [card_val]

    return []


def process_total(hand: HandState, total: int) -> list[int]:
    """Process a raw total from DOM data, returning newly inferred card values.

    Unlike process_reading, this doesn't debounce (DOM data is reliable)
    and infers softness internally from card transitions.
    """
    if total == hand.last_total:
        return []

    # Blackjack: first reading is 21
    if total == 21 and not hand.cards_inferred and not hand.totals_history:
        hand.cards_inferred = [11, 10]
        hand.totals_history = [total]
        hand.is_soft = False
        hand.is_blackjack = True
        return [11, 10]

    prev_total = hand.last_total

    if prev_total is not None and not is_valid_transition(prev_total, total, hand.is_soft):
        return []

    card_val, new_soft = infer_card_from_total_change(prev_total, total, hand.is_soft)

    if 1 <= card_val <= 11:
        hand.cards_inferred.append(card_val)
        hand.totals_history.append(total)
        hand.is_soft = new_soft

        if not hand.deal_complete:
            hand._pending_cards.append(card_val)
            return []
        elif hand._pending_cards:
            all_cards = hand._pending_cards + [card_val]
            hand._pending_cards.clear()
            return all_cards
        else:
            return [card_val]

    return []


def detect_new_round(
    current: dict[str, HandReading],
    previous: dict[str, int | None],
) -> bool:
    """Detect when a new round has started (OCR mode)."""
    prev_vals = [v for v in previous.values() if v is not None]
    curr_vals = [r.total for r in current.values()]

    if not prev_vals and curr_vals:
        return True

    d_prev = previous.get("dealer")
    d_curr = current.get("dealer")
    if d_prev is not None and d_curr is not None:
        if d_prev > 11 and 2 <= d_curr.total <= 11:
            return True

    return False


def detect_new_round_dom(
    current: dict[str, int],
    previous: dict[str, int | None],
) -> bool:
    """Detect when a new round has started (DOM mode)."""
    prev_vals = [v for v in previous.values() if v is not None]
    curr_vals = list(current.values())

    if not prev_vals and curr_vals:
        return True

    # Any seat dropped from resolved (>11) back to initial deal range (<=11)
    for key in current:
        prev = previous.get(key)
        curr = current[key]
        if prev is not None and prev > 11 and curr <= 11:
            return True

    # All previous seats gone and new ones appeared
    if prev_vals and curr_vals:
        old_keys = {k for k, v in previous.items() if v is not None}
        new_keys = set(current.keys())
        if not old_keys & new_keys:
            return True

    return False
