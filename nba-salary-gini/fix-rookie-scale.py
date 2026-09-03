#!/usr/bin/env python3
"""One-time patch: make the complete No. 1 rookie-scale series deterministic."""

from pathlib import Path
import re

path = Path("nba-salary-gini/build-story-data.py")
text = path.read_text(encoding="utf-8")

replacement = '''# Complete 100% No. 1 rookie-scale table from RealGM. This is also the
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
}'''

pattern = re.compile(
    r"# Fallback 100% No\. 1 rookie-scale values.*?"
    r"ROOKIE_SCALE_100_FALLBACK\s*=\s*\{.*?\n\}",
    flags=re.S,
)
updated, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f"Expected one rookie-scale fallback block; replaced {count}")

path.write_text(updated, encoding="utf-8")
print("Patched complete 1998-99 through 2025-26 No. 1 rookie-scale series.")
