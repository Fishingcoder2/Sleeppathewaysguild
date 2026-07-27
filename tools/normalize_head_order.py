#!/usr/bin/env python3
"""Keep encoding declarations before generated SEO and analytics metadata."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
START = "<!-- SPG TECHNICAL SEO START -->"
END = "<!-- SPG TECHNICAL SEO END -->"
PAGES = ("index.html", "RPSGTv2.2026.html", "ekg.2026.html", "flashcards.2026.html")


def normalize(path: Path) -> None:
    original = path.read_text(encoding="utf-8", errors="replace")
    match = re.search(re.escape(START) + r".*?" + re.escape(END), original, re.S)
    if not match:
        raise SystemExit(f"Missing generated SEO block: {path.name}")
    block = match.group(0)
    text = original[:match.start()] + original[match.end():]
    text = re.sub(r"\s*<!--\s*Google tag \(gtag\.js\)\s*-->\s*", "\n", text, flags=re.I)
    text = text.replace("upgrade-insecure-requests ;", "upgrade-insecure-requests;")
    head = re.search(r"<head\b[^>]*>", text, re.I)
    if not head:
        raise SystemExit(f"Missing head: {path.name}")
    head_end = re.search(r"</head\s*>", text[head.end():], re.I)
    boundary = head.end() + (head_end.start() if head_end else 4096)
    position = head.end()
    for pattern in (
        r'<meta\s+charset=["\'][^"\']+["\'][^>]*>',
        r'<meta\s+name=["\']viewport["\'][^>]*>',
    ):
        item = re.search(pattern, text[head.end():boundary], re.I)
        if item:
            position = max(position, head.end() + item.end())
    text = text[:position] + "\n" + block + "\n" + text[position:]
    if text != original:
        path.write_text(text, encoding="utf-8")
        print(f"NORMALIZED {path.name}")


def main() -> None:
    for filename in PAGES:
        normalize(ROOT / filename)


if __name__ == "__main__":
    main()
