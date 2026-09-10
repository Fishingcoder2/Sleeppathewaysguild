from pathlib import Path
import json, re

path = Path('rpsgt-exam-prep-books.html')
text = path.read_text(encoding='utf-8')

if 'id="maria-sosa"' in text:
    raise SystemExit('Maria Sosa feature already present')

# Add a jump link near Shop & Gear.
old_jump = '<a href="#advanced-titration">Advanced Titration</a><a href="#shop-gear">Shop & Gear</a>'
new_jump = '<a href="#advanced-titration">Advanced Titration</a><a href="#maria-sosa">Featured Author</a><a href="#shop-gear">Shop & Gear</a>'
if old_jump not in text:
    raise SystemExit('Jump navigation anchor not found')
text = text.replace(old_jump, new_jump, 1)

# Keep structured data current and include the four verified sleep-focused titles.
m = re.search(r'<script type="application/ld\+json">\n(.*?)\n</script>', text, re.S)
if not m:
    raise SystemExit('JSON-LD block not found')
schema = json.loads(m.group(1))
new_titles = [
    'RPSGT Exam Prep 2025 — Illustrated Sleep Study Manual',
    'Mastering Polysomnography Scoring',
    'Sleep Apnea: A Guide to Better Sleep & Better Health',
    'Apnea del Sueño: Entenderla para Vivir Mejor',
]
for node in schema.get('@graph', []):
    if node.get('@type') == 'WebPage':
        node['dateModified'] = '2026-09-10'
        desc = node.get('description', '')
        if 'independent-author' not in desc.lower():
            node['description'] = desc.rstrip('.') + ', plus independent-author sleep and RPSGT study titles.'
    elif node.get('@type') == 'ItemList':
        items = node.setdefault('itemListElement', [])
        existing = {i.get('name') for i in items if isinstance(i, dict)}
        for title in new_titles:
            if title not in existing:
                items.append({'@type': 'ListItem', 'position': len(items)+1, 'name': title})
        node['numberOfItems'] = len(items)
new_schema = json.dumps(schema, ensure_ascii=False, separators=(',', ':'))
text = text[:m.start(1)] + new_schema + text[m.end(1):]

# Insert the independent-author feature before Shop & Gear.
anchor = '<section class="shelf" id="shop-gear">'
if text.count(anchor) != 1:
    raise SystemExit(f'Shop & Gear anchor count: {text.count(anchor)}')

section = '''<section class="shelf" id="maria-sosa"><div class="wrap"><div class="shelfHead"><div><span class="eyebrow" style="color:#8a6910">Featured sleep technologist author</span><h2>Maria I. Sosa / Maria I. Sosa Torres, RPSGT</h2><p>Independent sleep-technology and patient-education titles by an RPSGT author. These books are featured as additional Guild resources and are <strong>not labeled as BRPT Recommended Reading</strong> unless BRPT independently lists them on an official reference page. Always verify current AASM and BRPT requirements for version-sensitive exam content.</p></div></div><div class="bookGrid">
<article class="bookCard"><div class="coverWrap"><div class="coverFallback">RPSGT Exam Prep 2025<br>Illustrated Sleep Study Manual</div></div><h3 class="bookTitle">RPSGT Exam Prep 2025 — Illustrated Sleep Study Manual</h3><div class="bookAuthor">Maria I. Sosa · independent exam-prep title</div><div class="badges"><span class="badge gold">RPSGT author</span><span class="badge">Guild featured resource</span></div><p class="best"><strong>Best for:</strong> Broad exam-oriented review across sleep staging, instrumentation, respiratory scoring, PAP, pediatrics, troubleshooting, MSLT/MWT, and mock-exam practice.</p><details><summary>Important study note</summary><div class="detail">The publisher listing describes this as an independently published RPSGT exam-prep manual. Because exam rules and scoring standards change, compare any version-sensitive material with the current BRPT blueprint and current AASM Scoring Manual.</div></details><a class="btn gold" href="https://www.amazon.com/s?k=RPSGT+Exam+Prep+2025+Illustrated+Sleep+Study+Manual+Maria+I+Sosa&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Find on Amazon</a></article>
<article class="bookCard"><div class="coverWrap"><div class="coverFallback">Mastering Polysomnography Scoring</div></div><h3 class="bookTitle">Mastering Polysomnography Scoring</h3><div class="bookAuthor">Maria I. Sosa Torres · RPSGT scoring review</div><div class="badges"><span class="badge gold">RPSGT author</span><span class="badge">Scoring-focused</span></div><p class="best"><strong>Best for:</strong> Focused review of sleep staging, respiratory events, scoring decisions, terminology, and board-style practice.</p><details><summary>Important study note</summary><div class="detail">The publisher listing describes this title as AASM 3.0-focused. It is a supplemental study guide, not a replacement for the official AASM Scoring Manual or BRPT exam materials.</div></details><a class="btn gold" href="https://www.amazon.com/s?k=Mastering+Polysomnography+Scoring+Maria+I+Sosa+Torres&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Find on Amazon</a></article>
<article class="bookCard"><div class="coverWrap"><div class="coverFallback">Sleep Apnea<br>A Guide to Better Sleep & Better Health</div></div><h3 class="bookTitle">Sleep Apnea: A Guide to Better Sleep & Better Health</h3><div class="bookAuthor">Maria Sosa Torres · patient & family guide</div><div class="badges"><span class="badge gold">RPSGT author</span><span class="badge">Patient education</span></div><p class="best"><strong>Best for:</strong> Plain-language sleep apnea education for patients, families, and sleep professionals who teach them.</p><details><summary>Why it is here</summary><div class="detail">This English-language guide is described as explaining sleep apnea, symptoms, health effects, diagnosis, treatment, and practical next steps from a sleep-technologist perspective.</div></details><a class="btn gold" href="https://www.amazon.com/s?k=Sleep+Apnea+A+Guide+to+Better+Sleep+Better+Health+Maria+Sosa+Torres&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Find on Amazon</a></article>
<article class="bookCard"><div class="coverWrap"><div class="coverFallback">Apnea del Sueño<br>Entenderla para Vivir Mejor</div></div><h3 class="bookTitle">Apnea del Sueño: Entenderla para Vivir Mejor</h3><div class="bookAuthor">Maria I. Sosa, RPSGT · guía en español</div><div class="badges"><span class="badge gold">RPSGT author</span><span class="badge">Spanish patient education</span></div><p class="best"><strong>Best for:</strong> Spanish-language sleep apnea education for patients and families.</p><details><summary>Why it is here</summary><div class="detail">A Spanish-language clinical and practical patient guide covering what sleep apnea is, diagnosis, sleep-study results, and treatment concepts in accessible language.</div></details><a class="btn gold" href="https://www.amazon.com/s?k=Apnea+del+Sueno+Entenderla+para+Vivir+Mejor+Maria+I+Sosa&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Find on Amazon</a></article>
</div><div class="affiliateNote"><strong>Affiliate disclosure:</strong> As an Amazon Associate I earn from qualifying purchases. The Amazon buttons in this featured-author section use the Sleep Pathways Guild affiliate tracking ID at no additional cost to the shopper.</div></div></section>\n\n'''
text = text.replace(anchor, section + anchor, 1)

# Update the footer review date.
text = text.replace('Last reviewed September 9, 2026', 'Last reviewed September 10, 2026')

required = ['id="maria-sosa"', 'Maria I. Sosa', 'Maria I. Sosa Torres', 'tag=spg_rpsgt-20', 'not labeled as BRPT Recommended Reading']
missing = [x for x in required if x not in text]
if missing:
    raise SystemExit(f'Missing required content: {missing}')

path.write_text(text, encoding='utf-8')
print('Maria Sosa featured-author shelf added successfully')
