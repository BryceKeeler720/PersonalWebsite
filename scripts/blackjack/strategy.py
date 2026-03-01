"""Basic strategy engine with Omega II count-based deviations."""

from __future__ import annotations

from dataclasses import dataclass

from config import (
    Action,
    HARD_STRATEGY,
    SOFT_STRATEGY,
    PAIR_STRATEGY,
    OMEGA_II_DEVIATIONS,
)


@dataclass
class Recommendation:
    """A play recommendation with reasoning."""
    action: Action
    is_deviation: bool
    deviation_desc: str | None
    basic_strategy_action: Action
    true_count: float


def get_recommendation(
    player_total: int,
    dealer_upcard: int,
    is_soft: bool,
    is_pair: bool,
    pair_value: int | None,
    true_count: float,
    can_double: bool = True,
    can_split: bool = True,
    num_cards: int = 2,
) -> Recommendation:
    """Get the recommended play considering basic strategy and count deviations."""
    tc_int = int(true_count)

    # 1. Basic strategy lookup
    if is_pair and can_split and pair_value is not None:
        basic_action = PAIR_STRATEGY.get(pair_value, {}).get(dealer_upcard, Action.HIT)
    elif is_soft:
        basic_action = SOFT_STRATEGY.get(player_total, {}).get(dealer_upcard, Action.HIT)
    else:
        basic_action = HARD_STRATEGY.get(player_total, {}).get(dealer_upcard, Action.HIT)

    # 2. Check count-based deviations
    best_deviation = None
    for dev in OMEGA_II_DEVIATIONS:
        if dev.hand_type == "insurance":
            continue

        if dev.player_total != player_total or dev.dealer_upcard != dealer_upcard:
            continue

        # Check hand type match
        if dev.hand_type == "pair" and not (is_pair and can_split):
            continue
        if dev.hand_type == "soft" and not is_soft:
            continue
        if dev.hand_type == "hard" and is_soft:
            continue

        # Check threshold
        if dev.direction == "gte" and tc_int >= dev.threshold:
            best_deviation = dev
        elif dev.direction == "lte" and tc_int <= dev.threshold:
            best_deviation = dev

    # 3. Apply deviation or basic strategy
    final_action = best_deviation.action if best_deviation else basic_action

    # 4. Resolve conditional actions
    if final_action == Action.DOUBLE and (not can_double or num_cards > 2):
        final_action = Action.HIT
    elif final_action == Action.DOUBLE_S and (not can_double or num_cards > 2):
        final_action = Action.STAND
    elif final_action == Action.SPLIT and not can_split:
        final_action = Action.HIT

    return Recommendation(
        action=final_action,
        is_deviation=best_deviation is not None,
        deviation_desc=best_deviation.description if best_deviation else None,
        basic_strategy_action=basic_action,
        true_count=true_count,
    )


def should_take_insurance(true_count: float) -> bool:
    """Insurance is profitable when Omega II TC >= 6."""
    return int(true_count) >= 6
