from pathlib import Path
import re

ROOT = Path('rpsgt-v3')
STYLE = '<link rel="stylesheet" href="assets/v3-polish.css">\n<link rel="stylesheet" href="assets/focus-flow.css">'
SCRIPT = '<script src="core/focus-flow.js"></script>'


def wire_page(path: Path):
    text = path.read_text(encoding='utf-8')
    original = text
    if 'assets/rpsgt-v3.css' not in text:
        return False

    # The polish layer must load LAST so module-specific styles cannot make
    # modal sheets oversized again. Normalize any earlier staging position.
    text = re.sub(r'\s*<link rel="stylesheet" href="assets/v3-polish\.css">', '', text)
    text = re.sub(r'\s*<link rel="stylesheet" href="assets/focus-flow\.css">', '', text)
    if '</head>' not in text:
        raise RuntimeError(f'Missing </head>: {path}')
    text = text.replace('</head>', STYLE + '\n</head>', 1)

    # focus-flow is presentation-only and intentionally loads after page engines.
    text = text.replace(SCRIPT, '')
    if '</body>' not in text:
        raise RuntimeError(f'Missing </body>: {path}')
    text = text.replace('</body>', SCRIPT + '\n</body>', 1)

    if text != original:
        path.write_text(text, encoding='utf-8')
        return True
    return False


def take_section(text: str, marker: str, extra_class: str):
    marker_at = text.find(marker)
    if marker_at < 0:
        return text, None
    start = text.rfind('<section', 0, marker_at)
    end = text.find('</section>', marker_at)
    if start < 0 or end < 0:
        raise RuntimeError(f'Could not isolate section: {marker}')
    end += len('</section>')
    block = text[start:end]
    block = re.sub(
        r'<section class="section(?![^\"]*\b' + re.escape(extra_class) + r'\b)([^\"]*)">',
        r'<section class="section ' + extra_class + r'\1">',
        block,
        count=1,
    )
    return text[:start] + text[end:], block


def reorder_home(path: Path):
    text = path.read_text(encoding='utf-8')
    original = text
    text, destinations = take_section(text, '<div class="eyebrow">Choose your next move</div>', 'front-door-destinations')
    text, progress = take_section(text, '<div class="eyebrow">Progress snapshot</div>', 'progress-snapshot')
    if not destinations or not progress:
        raise RuntimeError('Home quick-action sections were not found')
    hero_at = text.find('<section class="hero')
    hero_end = text.find('</section>', hero_at)
    if hero_at < 0 or hero_end < 0:
        raise RuntimeError('Home hero was not found')
    hero_end += len('</section>')
    text = text[:hero_end] + '\n\n' + destinations + '\n\n' + progress + text[hero_end:]
    if text != original:
        path.write_text(text, encoding='utf-8')


changed = []
for page in sorted(ROOT.glob('*.html')):
    if wire_page(page):
        changed.append(str(page))

reorder_home(ROOT / 'index.html')
if str(ROOT / 'index.html') not in changed:
    changed.append(str(ROOT / 'index.html'))

print(f'Wired visual polish into {len(changed)} RPSGT V3 pages')
for item in changed:
    print(' -', item)
