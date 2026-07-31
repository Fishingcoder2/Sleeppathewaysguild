#!/usr/bin/env python3
"""Fail CI when public release or contact copy becomes stale."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOME = (ROOT / "index.html").read_text(encoding="utf-8", errors="replace")
SITEMAP = (ROOT / "sitemap.xml").read_text(encoding="utf-8", errors="replace")

required_home = {
    "released CPSGT name": "CPSGT Study Launchpad",
    "released CPSGT status": "New release",
    "CPSGT launch URL": "https://sleeppathwaysguild.com/cpsgt-study-app.html",
    "current contact email": "admin@sleeppathwaysguild.com",
    "CPSGT release article": "https://blog.sleeppathwaysguild.com/2026/07/free-cpsgt-study-app-released.html",
}
forbidden_home = {
    "stale release status": "Nearing release",
    "stale development claim": "in final development",
    "stale upcoming wording": "upcoming CPSGT webapp",
    "obsolete contact email": "admin@sleeppathsguild.com",
}
required_sitemap = {
    "homepage": "https://sleeppathwaysguild.com/",
    "CPSGT app": "https://sleeppathwaysguild.com/cpsgt-study-app.html",
    "RPSGT app": "https://sleeppathwaysguild.com/RPSGTv2.2026.html",
}

errors: list[str] = []
for label, value in required_home.items():
    if value not in HOME:
        errors.append(f"index.html is missing {label}: {value}")
for label, value in forbidden_home.items():
    if value.casefold() in HOME.casefold():
        errors.append(f"index.html still contains {label}: {value}")
for label, value in required_sitemap.items():
    if value not in SITEMAP:
        errors.append(f"sitemap.xml is missing {label}: {value}")

if errors:
    print("Content-integrity check failed:")
    for error in errors:
        print(f"- {error}")
    raise SystemExit(1)

print("Content-integrity check passed: CPSGT release, contact, and sitemap copy are current.")
