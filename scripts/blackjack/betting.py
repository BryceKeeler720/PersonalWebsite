"""Bet sizing with half-Kelly spread and table limits."""

from __future__ import annotations

from dataclasses import dataclass

from config import (
    DEFAULT_UNIT_SIZE,
    DEFAULT_MAX_SPREAD,
    DEFAULT_TABLE_MIN,
    DEFAULT_TABLE_MAX,
    HOUSE_EDGE,
    EDGE_PER_TRUE_COUNT,
    KELLY_FRACTION,
)


@dataclass
class BetRecommendation:
    units: float
    amount: float
    edge_estimate: float  # player edge as percentage
    reasoning: str


class BettingEngine:
    """Bet sizing using a modified Kelly approach with table limits.

    Player edge ~ EDGE_PER_TC * TC - HOUSE_EDGE
    Bet is clamped to [table_min, table_max].
    When bankroll is known, uses half-Kelly optimal sizing.
    """

    def __init__(
        self,
        unit_size: float = DEFAULT_UNIT_SIZE,
        max_spread: int = DEFAULT_MAX_SPREAD,
        kelly_fraction: float = KELLY_FRACTION,
        house_edge: float = HOUSE_EDGE,
        edge_per_tc: float = EDGE_PER_TRUE_COUNT,
        table_min: float = DEFAULT_TABLE_MIN,
        table_max: float = DEFAULT_TABLE_MAX,
    ):
        self.unit_size = unit_size
        self.max_spread = max_spread
        self.kelly_fraction = kelly_fraction
        self.house_edge = house_edge
        self.edge_per_tc = edge_per_tc
        self.table_min = table_min
        self.table_max = table_max

    def get_bet(self, true_count: float, bankroll: float | None = None) -> BetRecommendation:
        tc_int = int(true_count)
        edge = (tc_int * self.edge_per_tc) - self.house_edge

        if edge <= 0:
            return BetRecommendation(
                units=1,
                amount=self.table_min,
                edge_estimate=round(edge * 100, 2),
                reasoning=f"TC {tc_int}: No edge, bet table min",
            )

        if bankroll is not None and bankroll > 0:
            # Half-Kelly: optimal_fraction = (edge / variance) * kelly_fraction
            variance = 1.32
            optimal_fraction = (edge / variance) * self.kelly_fraction
            kelly_bet = bankroll * optimal_fraction
            # Clamp to table limits
            amount = max(self.table_min, min(self.table_max, kelly_bet))
            units = round(amount / self.unit_size, 1)
            reasoning = (
                f"TC {tc_int}: {edge*100:.2f}% edge | "
                f"Kelly ${kelly_bet:.0f} -> ${amount:.0f}"
            )
        else:
            # Spread: TC units when edge exists, capped at max spread
            units = max(1, min(self.max_spread, tc_int))
            amount = units * self.unit_size
            # Clamp to table limits
            amount = max(self.table_min, min(self.table_max, amount))
            units = round(amount / self.unit_size, 1)
            reasoning = f"TC {tc_int}: {edge*100:.2f}% edge -> {units:.1f} units"

        return BetRecommendation(
            units=units,
            amount=round(amount, 2),
            edge_estimate=round(edge * 100, 2),
            reasoning=reasoning,
        )
