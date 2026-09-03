#!/usr/bin/env python3
"""Build the MVP-availability and international-player context data.

The generated JSON is intentionally small.  MVP rows are joined from a public
Basketball-Reference mirror; international-player rows are benchmark seasons
reported by the NBA in opening-night releases.
"""

from __future__ import annotations

import csv
import io
import json
import math
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "data" / "context-data.json"

URLS = {
    "award_shares": "https://raw.githubusercontent.com/cmuchina3/nba-stats-1947-present-curated/main/data/raw/Player%20Award%20Shares.csv",
    "player_totals": "https://raw.githubusercontent.com/cmuchina3/nba-stats-1947-present-curated/main/data/raw/Player_Totals.csv",
    "mvp_history": "https://www.nba.com/news/history-mvp-award-winners",
    "participation_policy": "https://www.nba.com/news/nba-board-of-governors-approves-new-player-participation-policy",
    "cba_101": "https://cms.nba.com/wp-content/uploads/sites/4/2024/11/2024-25-CBA-101.pdf",
    "international_2014": "https://pr.nba.com/nba-international-players-2014-15/",
    "international_2020": "https://www.nba.com/news/nba-rosters-feature-107-international-players-from-41-countries",
    "international_2022": "https://cdn.nba.com/manage/2022/10/2022-23-NBA-Roster-Survey.pdf",
    "international_2023": "https://www.nba.com/news/nba-international-players-2023-24",
    "international_2024": "https://www.nba.com/news/2024-25-international-players-opening-night-rosters-official-release",
    "international_2025": "https://www.nba.com/news/2025-26-international-players-opening-night",
}


def fetch_text(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; nba-value-lab/3.0)",
            "Accept": "text/plain,text/csv,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read().decode("utf-8-sig", errors="replace")


def number(value: object) -> float:
    try:
        result = float(str(value or "").replace(",", ""))
    except ValueError:
        return math.nan
    return result if math.isfinite(result) else math.nan


def schedule_games(end_year: int) -> int:
    if end_year == 1999:
        return 50
    if end_year == 2012:
        return 66
    if end_year == 2020:
        return 73  # Milwaukee played 73 games before/inside the bubble.
    if end_year == 2021:
        return 72
    return 82


def load_mvp_availability() -> list[dict[str, object]]:
    award_rows = csv.DictReader(io.StringIO(fetch_text(URLS["award_shares"])))
    winners: dict[int, tuple[str, str]] = {}
    for row in award_rows:
        award = str(row.get("award", "")).strip().casefold()
        winner = str(row.get("winner", "")).strip().casefold()
        year = int(number(row.get("season"))) if math.isfinite(number(row.get("season"))) else 0
        if award == "nba mvp" and winner in {"true", "1", "yes"} and 1999 <= year <= 2024:
            winners[year] = (str(row.get("player", "")).strip(), str(row.get("player_id", "")).strip())

    totals_rows = csv.DictReader(io.StringIO(fetch_text(URLS["player_totals"])))
    totals: dict[tuple[int, str], dict[str, object]] = {}
    for row in totals_rows:
        year_value = number(row.get("season"))
        if not math.isfinite(year_value):
            continue
        year = int(year_value)
        player_id = str(row.get("player_id", "")).strip()
        if year not in winners or player_id != winners[year][1] or str(row.get("lg", "NBA")).upper() != "NBA":
            continue
        games = number(row.get("g"))
        minutes = number(row.get("mp"))
        if not math.isfinite(games) or not math.isfinite(minutes):
            continue
        candidate = {"games": int(games), "minutes": int(minutes)}
        prior = totals.get((year, player_id))
        if prior is None or candidate["minutes"] > prior["minutes"]:
            totals[(year, player_id)] = candidate

    output: list[dict[str, object]] = []
    for year in sorted(winners):
        player, player_id = winners[year]
        row = totals.get((year, player_id))
        if not row:
            continue
        games = int(row["games"])
        minutes = int(row["minutes"])
        output.append({
            "end_year": year,
            "season": f"{year - 1}-{str(year)[-2:]}",
            "player": player,
            "games": games,
            "minutes": minutes,
            "minutes_per_game": round(minutes / games, 1),
            "schedule_games": schedule_games(year),
            "availability_share": round(games / schedule_games(year), 4),
        })

    # The public mirror's award table currently ends in 2023-24.  These two
    # official winners and their completed regular-season totals are appended.
    output.extend([
        {
            "end_year": 2025, "season": "2024-25", "player": "Shai Gilgeous-Alexander",
            "games": 76, "minutes": 2598, "minutes_per_game": 34.2,
            "schedule_games": 82, "availability_share": round(76 / 82, 4),
        },
        {
            "end_year": 2026, "season": "2025-26", "player": "Shai Gilgeous-Alexander",
            "games": 68, "minutes": 2258, "minutes_per_game": 33.2,
            "schedule_games": 82, "availability_share": round(68 / 82, 4),
        },
    ])
    return output


INTERNATIONAL_BENCHMARKS = [
    # Counts are NBA-published opening-night benchmarks.  Older releases did
    # not always use exactly the same two-way-contract convention, so these are
    # shown as official snapshots rather than a causal annual panel.
    {"end_year": 1991, "season": "1990-91", "players": 21, "countries": None, "source": "international_2014"},
    {"end_year": 2001, "season": "2000-01", "players": 45, "countries": None, "source": "international_2014"},
    {"end_year": 2011, "season": "2010-11", "players": 84, "countries": 38, "source": "international_2014"},
    {"end_year": 2014, "season": "2013-14", "players": 92, "countries": 39, "source": "international_2014"},
    {"end_year": 2015, "season": "2014-15", "players": 101, "countries": 37, "source": "international_2014"},
    {"end_year": 2017, "season": "2016-17", "players": 113, "countries": 41, "source": "international_2014"},
    {"end_year": 2021, "season": "2020-21", "players": 107, "countries": 41, "source": "international_2020"},
    {"end_year": 2023, "season": "2022-23", "players": 120, "countries": 40, "source": "international_2022"},
    {"end_year": 2024, "season": "2023-24", "players": 125, "countries": 40, "source": "international_2023"},
    {"end_year": 2025, "season": "2024-25", "players": 125, "countries": 43, "source": "international_2024"},
    {"end_year": 2026, "season": "2025-26", "players": 135, "countries": 43, "source": "international_2025"},
]


def main() -> None:
    payload = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "methodology": {
            "mvp": "Regular-season games and total minutes for each season's eventual NBA MVP; shortened seasons are marked and not treated as ordinary 82-game seasons.",
            "international": "NBA-published opening-night roster snapshots. Historical two-way-contract conventions are not fully uniform, so the series is descriptive.",
        },
        "sources": URLS,
        "mvp_availability": load_mvp_availability(),
        "international_players": INTERNATIONAL_BENCHMARKS,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size:,} bytes)")
    print(f"MVP seasons: {len(payload['mvp_availability'])}; international benchmarks: {len(INTERNATIONAL_BENCHMARKS)}")


if __name__ == "__main__":
    main()
