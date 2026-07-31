#!/usr/bin/env python3
"""Audit sitemap-listed HTML pages for essential technical SEO signals."""
from __future__ import annotations

import argparse
import json
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse


@dataclass
class PageSEO:
    title: str = ""
    descriptions: list[str] = field(default_factory=list)
    canonicals: list[str] = field(default_factory=list)
    h1_count: int = 0
    lang: str = ""
    viewport: bool = False
    robots: str = ""
    og: set[str] = field(default_factory=set)
    twitter_card: bool = False
    jsonld_blocks: list[str] = field(default_factory=list)


class SEOHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.data = PageSEO()
        self._in_title = False
        self._title_parts: list[str] = []
        self._in_jsonld = False
        self._jsonld_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        attr = {str(k).lower(): (v or "") for k, v in attrs}
        if tag == "html":
            self.data.lang = attr.get("lang", "").strip()
        elif tag == "title":
            self._in_title = True
        elif tag == "h1":
            self.data.h1_count += 1
        elif tag == "meta":
            name = attr.get("name", "").lower().strip()
            prop = attr.get("property", "").lower().strip()
            content = attr.get("content", "").strip()
            if name == "description" and content:
                self.data.descriptions.append(content)
            elif name == "viewport":
                self.data.viewport = True
            elif name == "robots":
                self.data.robots = content.lower()
            elif name == "twitter:card" and content:
                self.data.twitter_card = True
            if prop.startswith("og:") and content:
                self.data.og.add(prop)
        elif tag == "link":
            rel = {x.lower() for x in attr.get("rel", "").split()}
            if "canonical" in rel and attr.get("href", "").strip():
                self.data.canonicals.append(attr["href"].strip())
        elif tag == "script" and attr.get("type", "").lower() == "application/ld+json":
            self._in_jsonld = True
            self._jsonld_parts = []

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "title":
            self._in_title = False
            self.data.title = " ".join("".join(self._title_parts).split())
        elif tag == "script" and self._in_jsonld:
            self._in_jsonld = False
            block = "".join(self._jsonld_parts).strip()
            if block:
                self.data.jsonld_blocks.append(block)

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self._title_parts.append(data)
        if self._in_jsonld:
            self._jsonld_parts.append(data)


def load_sitemap(path: Path) -> list[str]:
    root = ET.parse(path).getroot()
    return [e.text.strip() for e in root.iter() if e.tag.rsplit("}", 1)[-1] == "loc" and e.text]


def url_to_file(root: Path, url: str) -> Path | None:
    path = unquote(urlparse(url).path)
    if path.endswith("/"):
        path += "index.html"
    elif not Path(path).suffix:
        path += "/index.html"
    if Path(path).suffix.lower() not in {".html", ".htm"}:
        return None
    return root / path.lstrip("/")


def normalized_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path or "/"
    if path != "/":
        path = path.rstrip("/")
    return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}{path}"


def audit(root: Path, site_url: str) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    sitemap = root / "sitemap.xml"
    robots = root / "robots.txt"
    expected_host = urlparse(site_url).netloc.lower()

    if not sitemap.exists():
        return ["Missing sitemap.xml"], warnings
    if not robots.exists():
        errors.append("Missing robots.txt")
    else:
        expected_sitemap = site_url.rstrip("/") + "/sitemap.xml"
        if expected_sitemap not in robots.read_text(encoding="utf-8", errors="replace"):
            errors.append(f"robots.txt does not reference {expected_sitemap}")

    try:
        urls = load_sitemap(sitemap)
    except (ET.ParseError, OSError) as exc:
        return [f"Could not parse sitemap.xml: {exc}"], warnings

    if not urls:
        errors.append("sitemap.xml contains no URLs")

    titles: dict[str, list[str]] = defaultdict(list)
    descriptions: dict[str, list[str]] = defaultdict(list)
    canonicals_seen: dict[str, list[str]] = defaultdict(list)

    for url in urls:
        parsed = urlparse(url)
        if parsed.netloc.lower() != expected_host:
            errors.append(f"Sitemap URL uses unexpected host: {url}")
            continue
        file_path = url_to_file(root, url)
        if file_path is None:
            continue
        rel = file_path.relative_to(root).as_posix()
        if not file_path.exists():
            errors.append(f"Sitemap URL has no matching file: {url} -> {rel}")
            continue

        parser = SEOHTMLParser()
        parser.feed(file_path.read_text(encoding="utf-8", errors="replace"))
        page = parser.data

        if not page.lang:
            errors.append(f"{rel}: missing <html lang>")
        if not page.viewport:
            errors.append(f"{rel}: missing viewport meta tag")
        if not page.title:
            errors.append(f"{rel}: missing <title>")
        else:
            titles[page.title.casefold()].append(rel)
            if not 20 <= len(page.title) <= 65:
                warnings.append(f"{rel}: title length is {len(page.title)} characters")
        if len(page.descriptions) != 1:
            errors.append(f"{rel}: expected one meta description, found {len(page.descriptions)}")
        else:
            desc = page.descriptions[0]
            descriptions[desc.casefold()].append(rel)
            if not 70 <= len(desc) <= 170:
                warnings.append(f"{rel}: meta description length is {len(desc)} characters")
        if len(page.canonicals) != 1:
            errors.append(f"{rel}: expected one canonical URL, found {len(page.canonicals)}")
        else:
            canonical = page.canonicals[0]
            canonicals_seen[normalized_url(canonical)].append(rel)
            if normalized_url(canonical) != normalized_url(url):
                errors.append(f"{rel}: canonical does not match sitemap URL ({canonical} != {url})")
        if page.h1_count != 1:
            warnings.append(f"{rel}: expected one H1, found {page.h1_count}")
        if "noindex" in page.robots:
            errors.append(f"{rel}: sitemap-listed page contains noindex")

        required_og = {"og:title", "og:description", "og:url", "og:image"}
        missing_og = sorted(required_og - page.og)
        if missing_og:
            warnings.append(f"{rel}: missing Open Graph fields: {', '.join(missing_og)}")
        if not page.twitter_card:
            warnings.append(f"{rel}: missing twitter:card")
        if not page.jsonld_blocks:
            warnings.append(f"{rel}: no JSON-LD structured data")
        else:
            for i, block in enumerate(page.jsonld_blocks, start=1):
                try:
                    json.loads(block)
                except json.JSONDecodeError as exc:
                    errors.append(f"{rel}: invalid JSON-LD block {i}: {exc.msg}")

    for title, pages in titles.items():
        if len(pages) > 1:
            warnings.append(f"Duplicate title on {len(pages)} pages: {', '.join(pages)}")
    for desc, pages in descriptions.items():
        if len(pages) > 1:
            warnings.append(f"Duplicate meta description on {len(pages)} pages: {', '.join(pages)}")
    for canonical, pages in canonicals_seen.items():
        if len(pages) > 1:
            errors.append(f"Duplicate canonical {canonical}: {', '.join(pages)}")
    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--site-url", required=True)
    parser.add_argument("--report", default="seo-audit-report.txt")
    args = parser.parse_args()

    errors, warnings = audit(Path(args.root).resolve(), args.site_url.rstrip("/"))
    lines = [
        "SEO audit",
        f"Site: {args.site_url.rstrip('/')}",
        f"Errors: {len(errors)}",
        f"Warnings: {len(warnings)}",
        "",
        "ERRORS",
        *(f"- {item}" for item in errors),
        "",
        "WARNINGS",
        *(f"- {item}" for item in warnings),
        "",
    ]
    report = "\n".join(lines)
    Path(args.report).write_text(report, encoding="utf-8")
    print(report)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
