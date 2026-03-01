"""Rich terminal UI for the card counting tool."""

from __future__ import annotations

from typing import TYPE_CHECKING

from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

if TYPE_CHECKING:
    from betting import BetRecommendation
    from strategy import Recommendation

console = Console()

ACTION_COLORS = {
    "H": "red",
    "S": "green",
    "D": "yellow",
    "Ds": "yellow",
    "P": "cyan",
}

ACTION_LABELS = {
    "H": "HIT",
    "S": "STAND",
    "D": "DOUBLE",
    "Ds": "DOUBLE/STAND",
    "P": "SPLIT",
}


class BlackjackDisplay:
    def __init__(self) -> None:
        self.live = Live(console=console, refresh_per_second=2)

    def build_layout(
        self,
        running_count: int,
        true_count: float,
        decks_remaining: float,
        cards_seen: int,
        aces_seen: int,
        aces_remaining: int,
        ace_richness: str,
        dealer_total: int | None,
        player_total: int | None,
        player_is_soft: bool,
        player_is_pair: bool,
        recommendation: Recommendation | None,
        bet_recommendation: BetRecommendation | None,
        insurance_recommended: bool,
        round_number: int,
        all_seat_totals: dict[str, str | None],
        bankroll: float | None = None,
        starting_bankroll: float | None = None,
        session_high: float | None = None,
        session_low: float | None = None,
        table_min: float = 0,
        table_max: float = 0,
    ) -> Panel:
        """Build the full dashboard panel."""
        tc_color = "green" if true_count > 1 else ("red" if true_count < -1 else "yellow")

        # Count panel
        count_tbl = Table(show_header=False, box=None, padding=(0, 1))
        count_tbl.add_column(style="dim", width=20)
        count_tbl.add_column()
        count_tbl.add_row("Running Count", f"[bold]{running_count:+d}[/bold]")
        count_tbl.add_row("True Count", f"[bold {tc_color}]{true_count:+.1f}[/bold {tc_color}]")
        count_tbl.add_row("Decks Remaining", f"{decks_remaining:.1f}")
        count_tbl.add_row("Cards Seen", str(cards_seen))
        count_tbl.add_row("Aces Seen/Left", f"{aces_seen} / {aces_remaining}")
        count_tbl.add_row("Ace Density", ace_richness)
        count_panel = Panel(count_tbl, title="Omega II Count", border_style=tc_color)

        # Hand panel
        hand_tbl = Table(show_header=False, box=None, padding=(0, 1))
        hand_tbl.add_column(style="dim", width=20)
        hand_tbl.add_column()
        hand_tbl.add_row("Dealer Shows", str(dealer_total) if dealer_total else "---")

        player_str = str(player_total) if player_total else "---"
        if player_total:
            if player_is_soft:
                player_str += " (soft)"
            if player_is_pair:
                player_str += " [PAIR]"
        hand_tbl.add_row("Your Hand", player_str)
        hand_panel = Panel(hand_tbl, title=f"Round #{round_number}")

        # Recommendation panel
        if recommendation:
            action_val = recommendation.action.value
            color = ACTION_COLORS.get(action_val, "white")
            label = ACTION_LABELS.get(action_val, recommendation.action.name)
            rec_text = Text()
            rec_text.append("PLAY: ", style="bold")
            rec_text.append(label, style=f"bold {color}")
            if recommendation.is_deviation:
                rec_text.append(f"\n  DEV: {recommendation.deviation_desc}", style="bold yellow")
                bs_label = ACTION_LABELS.get(
                    recommendation.basic_strategy_action.value,
                    recommendation.basic_strategy_action.name,
                )
                rec_text.append(f"\n  (Basic strategy: {bs_label})", style="dim")
        else:
            rec_text = Text("Waiting for hand...", style="dim")
        rec_panel = Panel(rec_text, title="Recommendation", border_style="blue")

        # Bet panel
        if bet_recommendation:
            bet_text = Text()
            bet_text.append(f"Bet: {bet_recommendation.units:.0f} units", style="bold")
            bet_text.append(f"  (${bet_recommendation.amount:.0f})")
            bet_text.append(f"\nEdge: {bet_recommendation.edge_estimate:+.2f}%")
            bet_text.append(f"\n{bet_recommendation.reasoning}", style="dim")
            if insurance_recommended:
                bet_text.append("\nINSURANCE: YES", style="bold green")
        else:
            bet_text = Text("---")
        bet_panel = Panel(bet_text, title="Bet Sizing")

        # Bankroll panel
        bank_tbl = Table(show_header=False, box=None, padding=(0, 1))
        bank_tbl.add_column(style="dim", width=20)
        bank_tbl.add_column()
        if bankroll is not None:
            bank_tbl.add_row("Bankroll", f"${bankroll:,.0f}")
            if starting_bankroll is not None and starting_bankroll > 0:
                pnl = bankroll - starting_bankroll
                pnl_color = "green" if pnl >= 0 else "red"
                pnl_pct = (pnl / starting_bankroll) * 100
                bank_tbl.add_row(
                    "Session P&L",
                    f"[{pnl_color}]{pnl:+,.0f} ({pnl_pct:+.1f}%)[/{pnl_color}]",
                )
            if session_high is not None:
                bank_tbl.add_row("Session High", f"${session_high:,.0f}")
            if session_low is not None:
                bank_tbl.add_row("Session Low", f"${session_low:,.0f}")
        else:
            bank_tbl.add_row("Bankroll", "[dim]Not tracked[/dim]")
        if table_min > 0:
            bank_tbl.add_row("Table Range", f"${table_min:,.0f} - ${table_max:,.0f}")
        bankroll_panel = Panel(bank_tbl, title="Bankroll")

        # Seats table -- always show Dealer + all Players 1-7
        seats_tbl = Table(title="Table", show_edge=False)
        seats_tbl.add_column("Seat", style="dim")
        seats_tbl.add_column("Total")

        # Dealer row
        dealer_disp = all_seat_totals.get("dealer")
        seats_tbl.add_row("Dealer", dealer_disp if dealer_disp else "---")

        # Player rows -- always show all 7 seats
        for i in range(7):
            key = f"player_{i}"
            disp = all_seat_totals.get(key)
            seats_tbl.add_row(f"Player {i + 1}", disp if disp else "---")

        # Compose grid
        grid = Table.grid(expand=True, padding=1)
        grid.add_row(count_panel, hand_panel)
        grid.add_row(rec_panel, bet_panel)
        grid.add_row(bankroll_panel, seats_tbl)

        status = Text(
            "[R] Reset shoe  [Q] Quit  [C] Re-calibrate  [+/-] Adjust count",
            style="dim",
        )

        return Panel(grid, title="[bold]Blackjack Counter[/bold]", subtitle=status)

    def update(self, **kwargs) -> None:
        """Build and push a new frame to the live display."""
        panel = self.build_layout(**kwargs)
        self.live.update(panel)

    def start(self) -> None:
        self.live.__enter__()

    def stop(self) -> None:
        self.live.__exit__(None, None, None)
