#!/usr/bin/env python3
"""Build compact, reproducible data for the NBA salary-value GitHub Pages story."""

from __future__ import annotations

import csv
import io
import json
import math
import re
import statistics
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "data" / "story-data.json"

URLS = {
    "historical_salary": "https://raw.githubusercontent.com/aaronfrederick/B-Tier-Basketball-Career-Modeling/21147a56ac066faff5eb573be2cffb38094b4e11/nba_salaries_1990_to_2018.csv",
    "modern_salary": "https://raw.githubusercontent.com/edwinjeon/NBA-Salary-Prediction/main/data/NBA%20Player%20Salaries_2000-2025.csv",
    "draft_history": "https://raw.githubusercontent.com/cmuchina3/nba-stats-1947-present-curated/main/data/raw/Draft%20Pick%20History.csv",
    "advanced": "https://raw.githubusercontent.com/cmuchina3/nba-stats-1947-present-curated/main/data/raw/Advanced.csv",
}

MINIMUM_0_YOS = {
    1999: 287_500, 2000: 301_875, 2001: 316_969, 2002: 332_817,
    2003: 349_458, 2004: 366_931, 2005: 385_277, 2006: 398_762,
    2007: 412_718, 2008: 427_163, 2009: 442_114, 2010: 457_588,
    2011: 473_604, 2012: 473_604, 2013: 473_604, 2014: 490_180,
    2015: 507_336, 2016: 525_093, 2017: 543_471, 2018: 815_615,
    2019: 838_464, 2020: 898_310, 2021: 898_310, 2022: 925_258,
    2023: 1_017_781, 2024: 1_119_563, 2025: 1_157_153,
    2026: 1_272_870,
}

# 120% of the No. 1 rookie scale, used only if an observed salary cannot be matched.
NO1_SCALE_120_FALLBACK = {
    1999: 3_215_160,
    2000: 3_375_960,
    2025: 12_569_040,
    2026: 13_825_920,
}


def fetch_text(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "nba-salary-value-pages/1.0 (+GitHub Actions)"},
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read().decode("utf-8-sig")


def lower_row(row: dict[str, str]) -> dict[str, str]:
    return {str(k).strip().lower(): (v or "") for k, v in row.items() if k is not None}


def first(row: dict[str, str], keys: Iterable[str], default: str = "") -> str:
    for key in keys:
        if key in row and str(row[key]).strip() != "":
            return str(row[key]).strip()
    return default


def number(value: Any) -> float:
    text = re.sub(r"[$,%\s]", "", str(value or ""))
    try:
        value_float = float(text)
    except ValueError:
        return math.nan
    return value_float if math.isfinite(value_float) else math.nan


def normalize_name(value: str) -> str:
    text = value.casefold()
    text = text.replace("’", "'").replace("‐", "-").replace("–", "-")
    text = re.sub(r"\*+$", "", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def season_end(value: Any) -> int | None:
    text = str(value or "").strip()
    if not text:
        return None
    if re.fullmatch(r"\d{4}(?:\.0+)?", text):
        year = int(float(text))
        return year if 1947 <= year <= 2100 else None
    match = re.search(r"(19|20)\d{2}\s*[-–/]\s*(\d{2}|\d{4})", text)
    if match:
        start = int(match.group(0)[:4])
        return start + 1
    match = re.search(r"(19|20)\d{2}", text)
    if match:
        year = int(match.group(0))
        return year if 1947 <= year <= 2100 else None
    return None


def quantile(values: list[float], p: float) -> float:
    if not values:
        return math.nan
    x = sorted(values)
    if len(x) == 1:
        return x[0]
    pos = (len(x) - 1) * p
    lo = math.floor(pos)
    hi = math.ceil(pos)
    if lo == hi:
        return x[lo]
    weight = pos - lo
    return x[lo] * (1 - weight) + x[hi] * weight


def adjusted_skewness(values: list[float]) -> float:
    """Adjusted Fisher-Pearson sample skewness."""
    n = len(values)
    if n < 3:
        return math.nan
    mean = statistics.fmean(values)
    variance = sum((x - mean) ** 2 for x in values) / (n - 1)
    if variance <= 0:
        return 0.0
    s = math.sqrt(variance)
    return n / ((n - 1) * (n - 2)) * sum(((x - mean) / s) ** 3 for x in values)


def load_salary_records() -> dict[int, dict[str, dict[str, Any]]]:
    by_season: dict[int, dict[str, dict[str, Any]]] = defaultdict(dict)
    for source, start, end in (
        ("historical_salary", 1999, 2018),
        ("modern_salary", 2019, 2025),
    ):
        rows = csv.DictReader(io.StringIO(fetch_text(URLS[source])))
        for raw in rows:
            row = lower_row(raw)
            player = first(row, ("player", "name", "player_name"))
            salary = number(first(row, ("salary", "amount", "salary_nominal_usd")))
            year = season_end(first(row, ("season_end", "season", "year")))
            if not player or year is None or not start <= year <= end or not math.isfinite(salary) or salary <= 0:
                continue
            key = normalize_name(player)
            prior = by_season[year].get(key)
            if prior is None or salary > prior["salary"]:
                by_season[year][key] = {"player": player, "salary": round(salary), "source": source}
    return by_season


def load_first_picks() -> dict[int, str]:
    mapping: dict[int, str] = {}
    rows = csv.DictReader(io.StringIO(fetch_text(URLS["draft_history"])))
    for raw in rows:
        row = lower_row(raw)
        league = first(row, ("lg", "league"), "NBA").upper()
        pick = number(first(row, ("overall_pick", "overall", "pick")))
        draft_year = season_end(first(row, ("season", "year", "draft_year")))
        player = first(row, ("player", "name"))
        if league == "NBA" and pick == 1 and draft_year and player:
            mapping[draft_year + 1] = player
    return mapping


def build_value_contract_data(
    salaries: dict[int, dict[str, dict[str, Any]]],
    first_picks: dict[int, str],
) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for year in range(1999, 2026):
        season_records = list(salaries.get(year, {}).values())
        if not season_records:
            continue
        max_record = max(season_records, key=lambda item: item["salary"])
        pick_name = first_picks.get(year, "")
        pick_record = salaries[year].get(normalize_name(pick_name)) if pick_name else None
        pick_salary = pick_record["salary"] if pick_record else NO1_SCALE_120_FALLBACK.get(year)
        pick_source = "observed_salary" if pick_record else ("rookie_scale_120" if pick_salary else "missing")
        minimum = MINIMUM_0_YOS.get(year)
        output.append({
            "end_year": year,
            "season": f"{year - 1}-{str(year)[-2:]}",
            "max_player": max_record["player"],
            "max_salary": max_record["salary"],
            "first_pick": pick_name,
            "first_pick_salary": pick_salary,
            "first_pick_salary_source": pick_source,
            "minimum_0_yos": minimum,
            "first_pick_to_max": (pick_salary / max_record["salary"]) if pick_salary else None,
            "minimum_to_max": (minimum / max_record["salary"]) if minimum else None,
            "max_to_first_pick": (max_record["salary"] / pick_salary) if pick_salary else None,
            "max_to_minimum": (max_record["salary"] / minimum) if minimum else None,
        })
    return output


def load_bpm_player_seasons() -> dict[int, list[dict[str, Any]]]:
    rows = csv.DictReader(io.StringIO(fetch_text(URLS["advanced"])))
    if not rows.fieldnames:
        raise RuntimeError("Advanced.csv has no header")

    grouped: dict[tuple[int, str], list[dict[str, Any]]] = defaultdict(list)
    for raw in rows:
        row = lower_row(raw)
        league = first(row, ("lg", "league"), "NBA").upper()
        if league and league != "NBA":
            continue
        player = first(row, ("player", "name", "player_name"))
        year = season_end(first(row, ("season", "season_end", "year")))
        bpm = number(first(row, ("bpm", "box_plus_minus", "box plus/minus", "box plus-minus")))
        minutes = number(first(row, ("mp", "minutes", "min", "minutes_played")))
        team = first(row, ("tm", "team", "team_abbreviation")).upper()
        if not player or year is None or not 1999 <= year <= 2025:
            continue
        if not math.isfinite(bpm) or not math.isfinite(minutes) or minutes <= 0:
            continue
        grouped[(year, normalize_name(player))].append({
            "player": player.rstrip("*"),
            "bpm": bpm,
            "mp": minutes,
            "team": team,
        })

    by_season: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for (year, _), entries in grouped.items():
        aggregate = [e for e in entries if e["team"] == "TOT" or re.fullmatch(r"\d+TM", e["team"])]
        if aggregate:
            chosen = max(aggregate, key=lambda item: item["mp"])
            bpm = chosen["bpm"]
            minutes = chosen["mp"]
            player = chosen["player"]
        else:
            total_minutes = sum(e["mp"] for e in entries)
            bpm = sum(e["bpm"] * e["mp"] for e in entries) / total_minutes
            minutes = total_minutes
            player = max(entries, key=lambda item: item["mp"])["player"]
        by_season[year].append({"player": player, "bpm": round(bpm, 3), "mp": round(minutes, 1)})

    for year in by_season:
        by_season[year].sort(key=lambda item: item["mp"], reverse=True)
    return by_season


def performance_metrics(players: list[dict[str, Any]], n: int) -> dict[str, Any]:
    selected = players[: min(n, len(players))]
    values = [float(p["bpm"]) for p in selected]
    result: dict[str, Any] = {
        "n": len(values),
        "mean": statistics.fmean(values) if values else None,
        "median": quantile(values, 0.50),
        "p65": quantile(values, 0.65),
        "p75": quantile(values, 0.75),
        "p90": quantile(values, 0.90),
        "p95": quantile(values, 0.95),
        "skewness": adjusted_skewness(values),
    }
    result["p95_p65_gap"] = result["p95"] - result["p65"] if values else None
    result["thresholds"] = {
        str(threshold): {
            "count": sum(v >= threshold for v in values),
            "share": (sum(v >= threshold for v in values) / len(values)) if values else None,
        }
        for threshold in (0, 1, 2)
    }
    return result


def build_performance_data(by_season: dict[int, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for year in sorted(by_season):
        players = by_season[year]
        if len(players) < 180:
            continue
        output.append({
            "end_year": year,
            "season": f"{year - 1}-{str(year)[-2:]}",
            "available_players": len(players),
            "players_by_minutes": players[:300],
            "top240": performance_metrics(players, 240),
            "top300": performance_metrics(players, 300),
        })
    return output


def main() -> None:
    print("Downloading salary data...")
    salaries = load_salary_records()
    print("Downloading draft history...")
    first_picks = load_first_picks()
    value_contracts = build_value_contract_data(salaries, first_picks)

    print("Downloading advanced stats and calculating BPM distributions...")
    bpm_by_season = load_bpm_player_seasons()
    performance = build_performance_data(bpm_by_season)
    if not performance:
        raise RuntimeError("No usable BPM seasons were produced")

    payload = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "methodology": {
            "salary_max": "Maximum observed player salary in each season after player-season deduplication.",
            "first_pick": "Observed first-season salary of that draft's No. 1 pick; fallback is 120% of the rookie scale where noted.",
            "minimum": "0-years-of-service minimum annual salary for a full-season standard NBA contract.",
            "performance": "Basketball-Reference BPM; players are ranked by total minutes and evaluated in fixed top-240/top-300 samples.",
            "skewness": "Adjusted Fisher-Pearson sample skewness; positive values indicate a longer high-BPM tail, not necessarily more above-average players.",
            "depth_gap": "95th percentile BPM minus 65th percentile BPM; lower values indicate a compressed star-to-good-rotation gap.",
        },
        "sources": URLS,
        "minimum_sources": [
            "https://basketball.realgm.com/nba/info/minimum_scale/1998",
            "https://basketball.realgm.com/nba/info/minimum_scale/2005",
            "https://basketball.realgm.com/nba/info/minimum_scale/2011",
            "https://basketball.realgm.com/nba/info/minimum_scale/2017",
            "https://basketball.realgm.com/nba/info/minimum_scale/2023",
        ],
        "value_contracts": value_contracts,
        "performance": performance,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size:,} bytes)")
    print(f"Value seasons: {len(value_contracts)}; performance seasons: {len(performance)}")
    missing_picks = [d["season"] for d in value_contracts if d["first_pick_salary"] is None]
    if missing_picks:
        print("Warning: missing first-pick salaries:", ", ".join(missing_picks))


if __name__ == "__main__":
    main()
