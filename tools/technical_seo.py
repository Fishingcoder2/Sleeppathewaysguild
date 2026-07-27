#!/usr/bin/env python3
"""Apply technical SEO and GA4 coverage to the public Sleep Pathways Guild pages."""

from __future__ import annotations

import html
import json
import re
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://sleeppathwaysguild.com/"
GA_ID = "G-MZTRYT67VG"
AHREFS_KEY = "/s9HvK+nlfPasBLtcJ6y3A"
IMAGE = BASE + "assets/branding/spg-guild-badge.png"
AUTHOR = "Tracy Frazier, RHIT, RPSGT, CCS-P"
START = "<!-- SPG TECHNICAL SEO START -->"
END = "<!-- SPG TECHNICAL SEO END -->"
TODAY = date.today().isoformat()

PAGES = {
    "index.html": {
        "url": BASE,
        "title": "Sleep Pathways Guild | Free Learning Support for Sleep Technologists",
        "description": "Sleep Pathways Guild, founded by Tracy Frazier, RHIT, RPSGT, CCS-P, provides free public sleep-technology learning tools, RPSGT preparation, EKG practice, articles, and downloads.",
        "type": "WebSite",
        "priority": "1.0",
    },
    "RPSGTv2.2026.html": {
        "url": BASE + "RPSGTv2.2026.html",
        "title": "Free RPSGT Exam Prep Webapp | Sleep Pathways Guild",
        "description": "Free RPSGT exam preparation webapp with guided study paths, original practice questions, readiness checks, skill labs, and progress reports for sleep technologists.",
        "type": "WebApplication",
        "priority": "0.9",
    },
    "ekg.2026.html": {
        "url": BASE + "ekg.2026.html",
        "title": "EKG Skills Lab for Sleep Technologists | Sleep Pathways Guild",
        "description": "Free EKG and ECG rhythm-recognition practice for sleep technologists and RPSGT learners, including rate, intervals, artifact awareness, and sleep-lab cardiac review.",
        "type": "WebApplication",
        "priority": "0.8",
    },
    "flashcards.2026.html": {
        "url": BASE + "flashcards.2026.html",
        "title": "Free EKG Flashcards for Sleep Technologists | Sleep Pathways Guild",
        "description": "Free EKG and ECG flashcards for sleep technologists and RPSGT learners to review rhythm recognition, cardiac terminology, intervals, rate, and artifact awareness.",
        "type": "WebApplication",
        "priority": "0.7",
    },
}


def attr(value: str) -> str:
    return html.escape(value, quote=True)


def remove_existing(text: str) -> str:
    text = re.sub(re.escape(START) + r".*?" + re.escape(END) + r"\s*", "", text, flags=re.S)
    patterns = [
        r'<meta\s+name=["\']robots["\'][^>]*>\s*',
        r'<meta\s+name=["\']author["\'][^>]*>\s*',
        r'<link\s+rel=["\']canonical["\'][^>]*>\s*',
        r'<meta\s+property=["\']og:[^"\']+["\'][^>]*>\s*',
        r'<meta\s+name=["\']twitter:[^"\']+["\'][^>]*>\s*',
        r'<script\s+async\s+src=["\']https://www\.googletagmanager\.com/gtag/js\?id=G-MZTRYT67VG["\']\s*></script>\s*',
        r'<script[^>]*>\s*window\.dataLayer\s*=.*?gtag\(["\']config["\']\s*,\s*["\']G-MZTRYT67VG["\']\s*\);?\s*</script>\s*',
        r'<script\s+src=["\']https://analytics\.ahrefs\.com/analytics\.js["\'][^>]*></script>\s*',
    ]
    for pattern in patterns:
        text = re.sub(pattern, "", text, flags=re.I | re.S)
    return text


def schema_for(config: dict) -> dict | list[dict]:
    organization = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": BASE + "#organization",
        "name": "Sleep Pathways Guild",
        "url": BASE,
        "founder": {"@type": "Person", "name": AUTHOR},
        "logo": {"@type": "ImageObject", "url": IMAGE},
        "sameAs": ["https://blog.sleeppathwaysguild.com/"],
    }
    if config["type"] == "WebSite":
        website = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": BASE + "#website",
            "url": BASE,
            "name": "Sleep Pathways Guild",
            "description": config["description"],
            "publisher": {"@id": BASE + "#organization"},
        }
        return [organization, website]
    return {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": config["title"],
        "description": config["description"],
        "url": config["url"],
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "Any modern web browser",
        "isAccessibleForFree": True,
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
        "publisher": organization,
    }


def block(config: dict) -> str:
    schema = schema_for(config)
    lines = [
        START,
        '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">',
        f'<meta name="author" content="{attr(AUTHOR)}">',
        f'<link rel="canonical" href="{attr(config["url"])}">',
        f'<meta property="og:site_name" content="Sleep Pathways Guild">',
        '<meta property="og:type" content="website">',
        f'<meta property="og:title" content="{attr(config["title"])}">',
        f'<meta property="og:description" content="{attr(config["description"])}">',
        f'<meta property="og:url" content="{attr(config["url"])}">',
        f'<meta property="og:image" content="{IMAGE}">',
        '<meta property="og:image:alt" content="Sleep Pathways Guild badge">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{attr(config["title"])}">',
        f'<meta name="twitter:description" content="{attr(config["description"])}">',
        f'<meta name="twitter:image" content="{IMAGE}">',
        '<script async src="https://www.googletagmanager.com/gtag/js?id=G-MZTRYT67VG"></script>',
        '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","G-MZTRYT67VG");</script>',
        f'<script src="https://analytics.ahrefs.com/analytics.js" data-key="{AHREFS_KEY}" async></script>',
        '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False, separators=(",", ":")) + '</script>',
        END,
    ]
    return "\n".join(lines) + "\n"


def update_csp(text: str) -> str:
    match = re.search(r'<meta\s+http-equiv=["\']Content-Security-Policy["\']\s+content=["\'](.*?)["\']\s*/?>', text, re.I | re.S)
    if not match:
        return text
    policy = match.group(1)
    requirements = {
        "script-src": ["https://analytics.ahrefs.com", "https://*.googletagmanager.com"],
        "connect-src": ["https://analytics.ahrefs.com", "https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googletagmanager.com"],
        "img-src": ["https://analytics.ahrefs.com", "https://*.google-analytics.com", "https://*.googletagmanager.com"],
    }
    directives = [part.strip() for part in policy.split(";") if part.strip()]
    parsed: dict[str, list[str]] = {}
    order: list[str] = []
    for directive in directives:
        bits = directive.split()
        if not bits:
            continue
        key, values = bits[0], bits[1:]
        parsed[key] = values
        order.append(key)
    for key, values in requirements.items():
        if key not in parsed:
            parsed[key] = ["'self'"]
            order.append(key)
        for value in values:
            if value not in parsed[key]:
                parsed[key].append(value)
    new_policy = "; ".join(key + " " + " ".join(parsed[key]) for key in order) + ";"
    replacement = match.group(0).replace(match.group(1), new_policy)
    return text[:match.start()] + replacement + text[match.end():]


def update_page(filename: str, config: dict) -> None:
    path = ROOT / filename
    if not path.exists():
        raise SystemExit(f"Required public page is missing: {filename}")
    original = path.read_text(encoding="utf-8", errors="replace")
    text = remove_existing(original)
    text = update_csp(text)
    text = re.sub(r"<title\b[^>]*>.*?</title>", f"<title>{html.escape(config['title'])}</title>", text, count=1, flags=re.I | re.S)
    description = f'<meta name="description" content="{attr(config["description"])}" />'
    if re.search(r'<meta\s+name=["\']description["\'][^>]*>', text, re.I):
        text = re.sub(r'<meta\s+name=["\']description["\'][^>]*>', description, text, count=1, flags=re.I)
    else:
        viewport = re.search(r'<meta\s+name=["\']viewport["\'][^>]*>', text, re.I)
        position = viewport.end() if viewport else re.search(r"<head\b[^>]*>", text, re.I).end()
        text = text[:position] + "\n" + description + text[position:]
    head = re.search(r"<head\b[^>]*>", text, re.I)
    if not head:
        raise SystemExit(f"No head element in {filename}")
    text = text[:head.end()] + "\n" + block(config) + text[head.end():]
    if text != original:
        path.write_text(text, encoding="utf-8")
        print(f"UPDATED {filename}")


def write_support_files() -> None:
    robots = "User-agent: *\nAllow: /\nSitemap: https://sleeppathwaysguild.com/sitemap.xml\n"
    (ROOT / "robots.txt").write_text(robots, encoding="utf-8")
    rows = []
    for config in PAGES.values():
        rows.append(
            "  <url><loc>" + xml_escape(config["url"]) + "</loc><lastmod>" + TODAY + "</lastmod><priority>" + config["priority"] + "</priority></url>"
        )
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(rows) + "\n</urlset>\n"
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    (ROOT / "404.html").write_text(
        """<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Page Not Found | Sleep Pathways Guild</title><meta name=\"description\" content=\"The requested Sleep Pathways Guild page could not be found.\"><meta name=\"robots\" content=\"noindex,nofollow\"><link rel=\"canonical\" href=\"https://sleeppathwaysguild.com/404.html\"></head><body style=\"font-family:system-ui,sans-serif;max-width:760px;margin:4rem auto;padding:1.5rem\"><main><h1>That trail ends here.</h1><p>The page may have moved while the Guild’s learning tools were being improved.</p><p><a href=\"/\">Return to Sleep Pathways Guild</a> · <a href=\"/RPSGTv2.2026.html\">Open the RPSGT Webapp</a> · <a href=\"https://blog.sleeppathwaysguild.com/\">Read the Blog</a></p></main></body></html>\n""",
        encoding="utf-8",
    )


def main() -> None:
    for filename, config in PAGES.items():
        update_page(filename, config)
    write_support_files()
    print(f"Optimized {len(PAGES)} public pages.")


if __name__ == "__main__":
    main()
