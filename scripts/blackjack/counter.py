"""Omega II counting engine with ace side count."""

from config import OMEGA_II_VALUES


class OmegaIICounter:
    """Omega II card counting system.

    Card values: 2,3,7 = +1 | 4,5,6 = +2 | 8 = 0 | 9 = -1 | 10 = -2 | A = 0
    Ace side count tracks ace density for insurance decisions.
    """

    def __init__(self, num_decks: int = 8):
        self.num_decks = num_decks
        self.total_cards = num_decks * 52
        self.total_aces = num_decks * 4
        self.running_count: int = 0
        self.aces_seen: int = 0
        self.cards_seen: int = 0

    def count_card(self, card_value: int) -> None:
        """Process a single card. card_value: 2-10 or 11 (Ace)."""
        if card_value == 11 or card_value == 1:
            # Ace (represented as 11 in soft hands, 1 in hard)
            self.aces_seen += 1
            # Omega II assigns 0 to Aces, running_count unchanged
        elif card_value in OMEGA_II_VALUES:
            self.running_count += OMEGA_II_VALUES[card_value]
        self.cards_seen += 1

    @property
    def cards_remaining(self) -> int:
        return self.total_cards - self.cards_seen

    @property
    def decks_remaining(self) -> float:
        return max(self.cards_remaining / 52, 0.5)

    @property
    def true_count(self) -> float:
        """Running count / decks remaining."""
        return round(self.running_count / self.decks_remaining, 1)

    @property
    def true_count_int(self) -> int:
        """Floored true count for index comparison."""
        return int(self.running_count / self.decks_remaining)

    @property
    def aces_remaining(self) -> int:
        return self.total_aces - self.aces_seen

    @property
    def aces_per_deck_remaining(self) -> float:
        """Expected aces per remaining deck. Normal = 4."""
        return self.aces_remaining / self.decks_remaining

    @property
    def ace_richness(self) -> str:
        apd = self.aces_per_deck_remaining
        if apd > 4.5:
            return "ACE-RICH"
        elif apd < 3.5:
            return "ACE-POOR"
        return "NORMAL"

    def reset(self) -> None:
        """Reset for new shoe."""
        self.running_count = 0
        self.aces_seen = 0
        self.cards_seen = 0
