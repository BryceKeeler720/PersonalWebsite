"""Static configuration: Omega II values, basic strategy tables, deviation indices."""

from enum import Enum
from dataclasses import dataclass


class Action(Enum):
    HIT = "H"
    STAND = "S"
    DOUBLE = "D"       # Double if allowed, else Hit
    DOUBLE_S = "Ds"    # Double if allowed, else Stand
    SPLIT = "P"


# Omega II count values keyed by card value (2-10, 11=Ace)
OMEGA_II_VALUES: dict[int, int] = {
    2: +1,
    3: +1,
    4: +2,
    5: +2,
    6: +2,
    7: +1,
    8:  0,
    9: -1,
    10: -2,
    11:  0,  # Ace
}

# Number of decks
NUM_DECKS = 8

# Bet sizing defaults
DEFAULT_UNIT_SIZE = 25.0
DEFAULT_MAX_SPREAD = 12
HOUSE_EDGE = 0.0045       # 0.45% for 8-deck S17 DAS
EDGE_PER_TRUE_COUNT = 0.005  # 0.5% per true count
KELLY_FRACTION = 0.5      # half-Kelly

# Table limits (overridden during calibration)
DEFAULT_TABLE_MIN = 50.0
DEFAULT_TABLE_MAX = 25_000.0


# ---------------------------------------------------------------------------
# Basic strategy tables for 8-deck, S17, DAS
# Keys: [player_total][dealer_upcard]  dealer 11 = Ace
# ---------------------------------------------------------------------------

_H = Action.HIT
_S = Action.STAND
_D = Action.DOUBLE
_Ds = Action.DOUBLE_S
_P = Action.SPLIT

_ALL_UPCARDS = range(2, 12)  # 2-10, 11=Ace


def _row(mapping: dict[int, Action]) -> dict[int, Action]:
    """Fill in a strategy row, defaulting unspecified upcards to HIT."""
    return {d: mapping.get(d, _H) for d in _ALL_UPCARDS}


# Hard totals (5-21 vs dealer 2-11)
HARD_STRATEGY: dict[int, dict[int, Action]] = {
    5:  _row({}),
    6:  _row({}),
    7:  _row({}),
    8:  _row({}),
    9:  _row({3: _D, 4: _D, 5: _D, 6: _D}),
    10: _row({2: _D, 3: _D, 4: _D, 5: _D, 6: _D, 7: _D, 8: _D, 9: _D}),
    11: _row({d: _D for d in _ALL_UPCARDS}),
    12: _row({4: _S, 5: _S, 6: _S}),
    13: _row({2: _S, 3: _S, 4: _S, 5: _S, 6: _S}),
    14: _row({2: _S, 3: _S, 4: _S, 5: _S, 6: _S}),
    15: _row({2: _S, 3: _S, 4: _S, 5: _S, 6: _S}),
    16: _row({2: _S, 3: _S, 4: _S, 5: _S, 6: _S}),
    17: _row({d: _S for d in _ALL_UPCARDS}),
    18: _row({d: _S for d in _ALL_UPCARDS}),
    19: _row({d: _S for d in _ALL_UPCARDS}),
    20: _row({d: _S for d in _ALL_UPCARDS}),
    21: _row({d: _S for d in _ALL_UPCARDS}),
}

# Soft totals (13-21 vs dealer 2-11)
SOFT_STRATEGY: dict[int, dict[int, Action]] = {
    13: _row({5: _D, 6: _D}),
    14: _row({5: _D, 6: _D}),
    15: _row({4: _D, 5: _D, 6: _D}),
    16: _row({4: _D, 5: _D, 6: _D}),
    17: _row({3: _D, 4: _D, 5: _D, 6: _D}),
    18: _row({2: _Ds, 3: _Ds, 4: _Ds, 5: _Ds, 6: _Ds, 7: _S, 8: _S}),
    19: _row({2: _S, 3: _S, 4: _S, 5: _S, 6: _Ds, 7: _S, 8: _S, 9: _S, 10: _S, 11: _S}),
    20: _row({d: _S for d in _ALL_UPCARDS}),
    21: _row({d: _S for d in _ALL_UPCARDS}),
}

# Pair splits: PAIR_STRATEGY[pair_card_value][dealer_upcard]
# pair_card_value is the value of one card (2-10, 11=Ace)
PAIR_STRATEGY: dict[int, dict[int, Action]] = {
    2:  _row({2: _P, 3: _P, 4: _P, 5: _P, 6: _P, 7: _P}),
    3:  _row({2: _P, 3: _P, 4: _P, 5: _P, 6: _P, 7: _P}),
    4:  _row({5: _P, 6: _P}),
    5:  _row({2: _D, 3: _D, 4: _D, 5: _D, 6: _D, 7: _D, 8: _D, 9: _D}),  # Never split 5s
    6:  _row({2: _P, 3: _P, 4: _P, 5: _P, 6: _P}),
    7:  _row({2: _P, 3: _P, 4: _P, 5: _P, 6: _P, 7: _P}),
    8:  _row({d: _P for d in _ALL_UPCARDS}),  # Always split 8s
    9:  _row({2: _P, 3: _P, 4: _P, 5: _P, 6: _P, 7: _S, 8: _P, 9: _P, 10: _S, 11: _S}),
    10: _row({d: _S for d in _ALL_UPCARDS}),  # Never split 10s (basic)
    11: _row({d: _P for d in _ALL_UPCARDS}),  # Always split Aces
}


# ---------------------------------------------------------------------------
# Count-based deviations (Omega II indices, 8-deck S17 DAS)
# Approximate indices -- these are derived from published Omega II data.
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Deviation:
    player_total: int
    dealer_upcard: int
    hand_type: str        # "hard", "soft", "pair", "insurance"
    threshold: int        # True count threshold
    direction: str        # "gte" (>=) or "lte" (<=)
    action: Action
    description: str


OMEGA_II_DEVIATIONS: list[Deviation] = [
    # Insurance (special: player_total/dealer_upcard ignored)
    Deviation(0, 0, "insurance", 6, "gte", _S, "Take Insurance"),

    # Stand deviations (normally hit -> stand at high count)
    Deviation(16, 10, "hard", 0,  "gte", _S, "Stand 16 vs 10"),
    Deviation(16,  9, "hard", 7,  "gte", _S, "Stand 16 vs 9"),
    Deviation(15, 10, "hard", 6,  "gte", _S, "Stand 15 vs 10"),
    Deviation(12,  2, "hard", 5,  "gte", _S, "Stand 12 vs 2"),
    Deviation(12,  3, "hard", 2,  "gte", _S, "Stand 12 vs 3"),

    # Hit deviations (normally stand -> hit at low count)
    Deviation(13,  2, "hard", -1, "lte", _H, "Hit 13 vs 2"),
    Deviation(13,  3, "hard", -3, "lte", _H, "Hit 13 vs 3"),
    Deviation(12,  4, "hard",  0, "lte", _H, "Hit 12 vs 4"),
    Deviation(12,  5, "hard", -2, "lte", _H, "Hit 12 vs 5"),
    Deviation(12,  6, "hard", -5, "lte", _H, "Hit 12 vs 6"),

    # Double deviations
    Deviation(10, 10, "hard", 9, "gte", _D, "Double 10 vs 10"),
    Deviation(10, 11, "hard", 8, "gte", _D, "Double 10 vs A"),
    Deviation( 9,  2, "hard", 4, "gte", _D, "Double 9 vs 2"),
    Deviation( 9,  7, "hard", 7, "gte", _D, "Double 9 vs 7"),

    # Split deviations
    Deviation(20,  5, "pair", 9, "gte", _P, "Split 10s vs 5"),
    Deviation(20,  6, "pair", 8, "gte", _P, "Split 10s vs 6"),
]
