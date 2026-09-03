#!/usr/bin/env python3
"""Build compact, reproducible data for the NBA salary-value GitHub Pages story."""

from __future__ import annotations

import csv
import html
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
    "supplement_salary": "https://raw.githubusercontent.com/ucb-ds/nwdse-demo/daa1398e063c34c0d065bc3f5ee1ba3302588831/nba-demo/salary_data_nba_2026.csv",
    "draft_history": "https://raw.githubusercontent.com/cmuchina3/nba-stats-1947-present-curated/main/data/raw/Draft%20Pick%20History.csv",
    "advanced": "https://raw.githubusercontent.com/cmuchina3/nba-stats-1947-present-curated/main/data/raw/Advanced.csv",
    "salary_cap_history": "https://basketball.realgm.com/nba/info/salary_cap",
    "rookie_scale_template": "https://basketball.realgm.com/nba/info/rookie_scale/{end_year}",
}

# CBA-defined 10+ years-of-service maximum salary. RealGM reports these values
# directly; retaining a local table keeps the build reproducible if the source
# site is temporarily unavailable.
MAX_10_YOS = {
    1999: 14_000_000, 2000: 14_000_000, 2001: 14_000_000,
    2002: 14_875_000, 2003: 14_094_850, 2004: 15_344_000,
    2005: 15_355_000, 2006: 16_800_000, 2007: 17_437_000,
    2008: 18_257_750, 2009: 19_261_200, 2010: 18_928_700,
    2011: 19_045_250, 2012: 18_091_071, 2013: 19_136_250,
    2014: 19_181_750, 2015: 20_644_400, 2016: 22_970_500,
    2017: 30_963_450, 2018: 34_682_550, 2019: 35_654_150,
    2020: 38_199_000, 2021: 38_199_000, 2022: 39_344_900,
    2023: 43_279_250, 2024: 47_607_350, 2025: 49_205_800,
    2026: 54_126_450,
}

# Zero-years-of-service minimum annual salary for a full-season standard deal.
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

# Complete 100% No. 1 rookie-scale table from RealGM. This is also the
# deterministic fallback because the site can serve anti-bot HTML to Actions.
ROOKIE_SCALE_100_FALLBACK = {
    1999: 2_679_300, 2000: 2_813_300, 2001: 2_947_200,
    2002: 3_081_200, 2003: 3_215_200, 2004: 3_349_100,
    2005: 3_483_100, 2006: 3_617_100, 2007: 3_751_000,
    2008: 3_885_000, 2009: 4_019_000, 2010: 4_152_900,
    2011: 4_286_900, 2012: 4_286_900, 2013: 4_286_900,
    2014: 4_436_900, 2015: 4_592_200, 2016: 4_753_000,
    2017: 4_919_300, 2018: 5_855_200, 2019: 6_804_300,
    2020: 8_131_200, 2021: 8_131_200, 2022: 8_375_100,
    2023: 9_212_600, 2024: 10_133_900, 2025: 10_474_200,
    2026: 11_521_600,
}


def fetch_text(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; nba-salary-value-pages/2.0; +https://github.com/SiriYu-2001/SiriYu-2001.github.io)",
            "Accept": "text/html,text/plain,application/json;q=0.9,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read().decode("utf-8-sig", errors="replace")


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
        return int(match.group(0)[:4]) + 1
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
    lo, hi = math.floor(pos), math.ceil(pos)
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
    std = math.sqrt(variance)
    return n / ((n - 1) * (n - 2)) * sum(((x - mean) / std) ** 3 for x in values)


def html_table_rows(source: str) -> list[list[str]]:
    rows: list[list[str]] = []
    for row_html in re.findall(r"<tr\b[^>]*>(.*?)</tr>", source, flags=re.I | re.S):
        cells: list[str] = []
        for cell_html in re.findall(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", row_html, flags=re.I | re.S):
            text = re.sub(r"<[^>]+>", " ", cell_html)
            text = html.unescape(text)
            cells.append(" ".join(text.split()))
        if cells:
            rows.append(cells)
    return rows


def fetch_rookie_scale_100(end_year: int) -> tuple[int | None, str]:
    url = URLS["rookie_scale_template"].format(end_year=end_year)
    try:
        source = fetch_text(url)
        for cells in html_table_rows(source):
            if cells and cells[0].strip() == "1" and len(cells) >= 2:
                value = number(cells[1])
                if math.isfinite(value) and value > 100_000:
                    return round(value), "realgm_rookie_scale"
    except Exception as exc:  # noqa: BLE001 - continue with transparent fallback
        print(f"Warning: rookie-scale fetch failed for {end_year}: {exc}")
    fallback = ROOKIE_SCALE_100_FALLBACK.get(end_year)
    return fallback, "fallback" if fallback else "missing"


def load_salary_records() -> dict[int, dict[str, dict[str, Any]]]:
    by_season: dict[int, dict[str, dict[str, Any]]] = defaultdict(dict)
    source_specs = (
        ("historical_salary", 1999, 2018, None),
        ("modern_salary", 2019, 2025, None),
        ("supplement_salary", 2026, 2026, 2026),
    )
    for source, start, end, fixed_end_year in source_specs:
        rows = csv.DictReader(io.StringIO(fetch_text(URLS[source])))
        for raw in rows:
            row = lower_row(raw)
            player = first(row, ("player", "name", "player_name"))
            salary = number(first(row, ("salary", "amount", "salary_nominal_usd")))
            year = fixed_end_year or season_end(first(row, ("season_end", "season", "year")))
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
    for year in range(1999, 2027):
        rookie_scale_100, rookie_source = fetch_rookie_scale_100(year)
        no1_salary_120 = round(rookie_scale_100 * 1.2) if rookie_scale_100 else None
        maximum = MAX_10_YOS.get(year)
        minimum = MINIMUM_0_YOS.get(year)
        season_records = list(salaries.get(year, {}).values())
        max_record = max(season_records, key=lambda item: item["salary"]) if season_records else None
        output.append({
            "end_year": year,
            "season": f"{year - 1}-{str(year)[-2:]}",
            "first_pick": first_picks.get(year, ""),
            "rookie_scale_100": rookie_scale_100,
            "no1_salary_120": no1_salary_120,
            "rookie_scale_source": rookie_source,
            "minimum_0_yos": minimum,
            "maximum_10_yos": maximum,
            "no1_to_maximum": (no1_salary_120 / maximum) if no1_salary_120 and maximum else None,
            "minimum_to_maximum": (minimum / maximum) if minimum and maximum else None,
            "maximum_to_no1": (maximum / no1_salary_120) if no1_salary_120 and maximum else None,
            "maximum_to_minimum": (maximum / minimum) if minimum and maximum else None,
            "observed_highest_player": max_record["player"] if max_record else None,
            "observed_highest_salary": max_record["salary"] if max_record else None,
            "observed_salary_source": max_record["source"] if max_record else None,
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
            "player": player.rstrip("*"), "bpm": bpm, "mp": minutes, "team": team,
        })

    by_season: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for (year, _), entries in grouped.items():
        aggregate = [e for e in entries if e["team"] == "TOT" or re.fullmatch(r"\d+TM", e["team"])]
        if aggregate:
            chosen = max(aggregate, key=lambda item: item["mp"])
            bpm, minutes, player = chosen["bpm"], chosen["mp"], chosen["player"]
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
    values = [float(player["bpm"]) for player in selected]
    result: dict[str, Any] = {
        "n": len(values),
        "mean": statistics.fmean(values) if values else None,
        "median": quantile(values, 0.50),
        "p35": quantile(values, 0.35),
        "p65": quantile(values, 0.65),
        "p75": quantile(values, 0.75),
        "p90": quantile(values, 0.90),
        "p95": quantile(values, 0.95),
        "skewness": adjusted_skewness(values),
    }
    result["p95_p65_gap"] = result["p95"] - result["p65"] if values else None
    result["p90_median_gap"] = result["p90"] - result["median"] if values else None
    result["thresholds"] = {
        str(threshold): {
            "count": sum(value >= threshold for value in values),
            "share": (sum(value >= threshold for value in values) / len(values)) if values else None,
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
    print("Downloading rookie scales and building contract ratios...")
    value_contracts = build_value_contract_data(salaries, first_picks)

    print("Downloading advanced stats and calculating BPM distributions...")
    bpm_by_season = load_bpm_player_seasons()
    performance = build_performance_data(bpm_by_season)
    if not performance:
        raise RuntimeError("No usable BPM seasons were produced")

    payload = {
        "schema_version": 2,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "methodology": {
            "salary_denominator": "CBA-defined maximum salary for a player with 10+ years of service, not the highest legacy contract actually paid that season.",
            "first_pick": "Standard No. 1 pick first-year salary at 120% of the rookie scale. First-round picks may sign from 80% to 120%; 120% is the usual benchmark.",
            "minimum": "0-years-of-service minimum annual salary for a full-season standard NBA contract.",
            "performance": "Basketball-Reference BPM; players are ranked by total minutes and evaluated in fixed top-240/top-300 samples.",
            "skewness": "Adjusted Fisher-Pearson sample skewness. Positive skew means a longer high-BPM tail; it does not by itself mean that more players are above average.",
            "depth_gap": "95th percentile BPM minus 65th percentile BPM. Lower values indicate a compressed star-to-good-rotation gap; higher values indicate a longer elite tail.",
        },
        "sources": URLS,
        "value_contracts": value_contracts,
        "performance": performance,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size:,} bytes)")
    print(f"Contract seasons: {len(value_contracts)}; performance seasons: {len(performance)}")
    missing = [row["season"] for row in value_contracts if row["no1_salary_120"] is None]
    if missing:
        print("Warning: missing No. 1 rookie-scale values:", ", ".join(missing))


if __name__ == "__main__":
    main()
