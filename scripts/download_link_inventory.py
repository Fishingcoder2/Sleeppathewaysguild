#!/usr/bin/env python3
"""Inventory links on the public Sleep Pathways Guild downloads hub.

This report is intentionally verbose so broken download buttons can be matched
back to their visible card labels. It does not modify Blogger content.
"""
from __future__ import annotations

import html
import socket
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

URL = "https://blog.sleeppathwaysguild.com/downloads/"
USER_AGENT = "Mozilla/5.0 (compatible; SleepPathwaysGuild-LinkAudit/1.0; +https://sleeppathwaysguild.com/)"


class AnchorParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.anchors: list[dict[str, str]] = []
        self._current: dict[str, str] | None = None
        self._text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        attr = {str(k).lower(): (v or "") for k, v in attrs}
        href = attr.get("href", "").strip()
        if href:
            self._current = {"href": href}
            self._text = []

    def handle_data(self, data: str) -> None:
        if self._current is not None:
            self._text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "a" and self._current is not None:
            self._current["text"] = " ".join("".join(self._text).split())
            self.anchors.append(self._current)
            self._current = None
            self._text = []


def fetch(url: str) -> tuple[int | None, str, bytes, str]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.geturl(), r.read(3_000_000), r.headers.get("Content-Type", "")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.geturl() or url, b"", str(exc.reason or "HTTP error")
    except (urllib.error.URLError, TimeoutError, socket.timeout) as exc:
        return None, url, b"", str(getattr(exc, "reason", exc))


def probe(url: str) -> tuple[int | None, str]:
    headers = {"User-Agent": USER_AGENT, "Accept": "*/*"}
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(url, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                return r.status, r.geturl()
        except urllib.error.HTTPError as exc:
            if method == "HEAD" and exc.code in {400, 403, 405, 406, 501}:
                continue
            return exc.code, exc.geturl() or url
        except (urllib.error.URLError, TimeoutError, socket.timeout):
            if method == "HEAD":
                continue
            return None, url
    return None, url


def main() -> int:
    status, final_url, body, meta = fetch(URL)
    lines = ["Sleep Pathways Guild downloads hub inventory", f"Hub: {URL}", f"Hub status: {status}", ""]
    if status is None or status >= 400:
        lines.append(f"Could not inspect hub ({meta}).")
        Path("download-link-inventory.txt").write_text("\n".join(lines), encoding="utf-8")
        print("\n".join(lines))
        return 1

    parser = AnchorParser()
    parser.feed(body.decode("utf-8", errors="replace"))
    seen: set[tuple[str, str]] = set()
    failures = 0
    for anchor in parser.anchors:
        text = html.unescape(anchor.get("text", "")).strip() or "[no visible text]"
        absolute = urllib.parse.urljoin(final_url, html.unescape(anchor["href"]).strip())
        parsed = urllib.parse.urlparse(absolute)
        if parsed.scheme not in {"http", "https"}:
            continue
        absolute = urllib.parse.urldefrag(absolute)[0]
        key = (text, absolute)
        if key in seen:
            continue
        seen.add(key)
        code, dest = probe(absolute)
        marker = "OK" if code is not None and code < 400 else "CHECK"
        if code is None or code >= 400:
            failures += 1
        lines.append(f"[{marker}] {code or 'ERR'} | {text} | {absolute}")
        if dest != absolute:
            lines.append(f"    -> {dest}")

    lines.insert(3, f"Unique visible links checked: {len(seen)}")
    lines.insert(4, f"Links needing review: {failures}")
    report = "\n".join(lines) + "\n"
    Path("download-link-inventory.txt").write_text(report, encoding="utf-8")
    print(report)
    # Do not fail CI for access-controlled third-party download endpoints; the
    # inventory is for human repair and the main link audit handles hard 404/410s.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
