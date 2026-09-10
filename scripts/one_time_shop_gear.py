from pathlib import Path

path = Path('rpsgt-exam-prep-books.html')
text = path.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    text = text.replace(old, new, 1)


replace_once(
    'Browse BRPT Recommended Readings, Approved ATC References, and current sleep technology books for RPSGT, CPSGT, CCSH, and certificate preparation.',
    'Browse BRPT Recommended Readings, Approved ATC References, current sleep technology books, and sleep technologist bags, shirts, gifts, and gear.',
    'meta description',
)

replace_once(
    '<a href="#advanced-titration">Advanced Titration</a><a href="#specialty">Specialty</a>',
    '<a href="#advanced-titration">Advanced Titration</a><a href="#shop-gear">Shop & Gear</a><a href="#specialty">Specialty</a>',
    'jump navigation',
)

css_anchor = '.authority{margin:30px auto;background:var(--navy);color:#fff;border-radius:24px;padding:28px}'
css_new = css_anchor + '.gearPanel{background:linear-gradient(145deg,#fffdf8,#eef5f2);border:1px solid var(--line);border-radius:24px;padding:24px;margin-bottom:18px}.gearPanel h3{font-family:Georgia,serif;color:var(--navy);font-size:1.45rem;margin:0 0 8px}.gearPanel p{color:var(--muted);line-height:1.55}.shopSearch{margin-top:16px}.searchRow{display:flex;gap:10px;align-items:stretch}.searchRow input[type="search"]{flex:1;min-width:0;border:1px solid #bdb6aa;border-radius:999px;padding:0 16px;min-height:46px;background:#fff;color:var(--ink);font:inherit}.searchRow button{border:0;cursor:pointer}.affiliateNote{font-size:.78rem;color:var(--muted);line-height:1.45;margin-top:9px}.gearGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.gearCard{display:flex;flex-direction:column;gap:8px;background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:18px;text-decoration:none;box-shadow:0 5px 18px rgba(35,43,52,.06)}.gearCard strong{font-family:Georgia,serif;color:var(--navy);font-size:1.05rem}.gearCard span{color:var(--muted);font-size:.82rem;line-height:1.4}.gearCard em{font-style:normal;color:#765b0d;font-size:.7rem;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.gearCard:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(35,43,52,.1)}'
replace_once(css_anchor, css_new, 'shop CSS')

replace_once(
    '@media(max-width:1000px){.bookGrid{grid-template-columns:repeat(3,minmax(0,1fr))}',
    '@media(max-width:1000px){.bookGrid{grid-template-columns:repeat(3,minmax(0,1fr))}.gearGrid{grid-template-columns:repeat(2,minmax(0,1fr))}',
    'tablet gear CSS',
)
replace_once(
    '@media(max-width:740px){.topbar{position:static}',
    '@media(max-width:740px){.gearGrid{grid-template-columns:1fr}.searchRow{flex-direction:column}.searchRow .btn{width:100%}.topbar{position:static}',
    'mobile gear CSS',
)

guide_anchor = '<section class="seoBlock wrap" id="guide">'
if text.count(guide_anchor) != 1:
    raise SystemExit(f'guide anchor: expected 1 match, found {text.count(guide_anchor)}')

gear_section = '''<section class="shelf" id="shop-gear"><div class="wrap"><div class="shelfHead"><div><span class="eyebrow" style="color:#2a6761">Shop & gear</span><h2>Sleep technologist bags, shirts, gifts & work essentials</h2><p>Use the curated categories below or search Amazon directly. These are convenience links for sleep technologists and night-shift professionals, separate from BRPT Recommended Readings and certificate references.</p></div></div>
<div class="gearPanel"><h3>Search Amazon with Guild affiliate tracking</h3><p>Search for any sleep-tech item, book, bag, shirt, accessory, or work essential. Your search opens on Amazon with the Sleep Pathways Guild tracking ID attached.</p><form class="shopSearch" action="https://www.amazon.com/s" method="get" target="_blank"><div class="searchRow"><input type="search" name="k" aria-label="Search Amazon for sleep technologist gear" placeholder="Try: sleep technologist bag, PSG shirt, badge reel..." required><input type="hidden" name="tag" value="spg_rpsgt-20"><button class="btn gold" type="submit">Search Amazon</button></div></form><div class="affiliateNote"><strong>Affiliate disclosure:</strong> As an Amazon Associate I earn from qualifying purchases. Search results and category buttons below are paid affiliate links; qualifying purchases may generate commission at no additional cost to you.</div></div>
<div class="gearGrid">
<a class="gearCard" href="https://www.amazon.com/s?k=sleep+technologist+bag&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer"><em>Paid link</em><strong>Sleep Technologist Bags</strong><span>Organizers, work bags, backpacks, and cases for sensors, study materials, and overnight-shift essentials.</span></a>
<a class="gearCard" href="https://www.amazon.com/s?k=sleep+technologist+shirt&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer"><em>Paid link</em><strong>Sleep Tech Shirts</strong><span>Polysomnography, sleep-lab, night-shift, and sleep-technologist themed shirts and apparel.</span></a>
<a class="gearCard" href="https://www.amazon.com/s?k=sleep+technologist+gifts&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer"><em>Paid link</em><strong>Sleep Tech Gifts & Merchandise</strong><span>Mugs, gifts, desk items, novelty merchandise, and appreciation ideas for sleep professionals.</span></a>
<a class="gearCard" href="https://www.amazon.com/s?k=medical+badge+reel+lanyard&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer"><em>Paid link</em><strong>Badge Reels & Lanyards</strong><span>ID holders and badge accessories suitable for clinical and sleep-lab environments.</span></a>
<a class="gearCard" href="https://www.amazon.com/s?k=medical+cable+organizer+bag&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer"><em>Paid link</em><strong>Cable & Accessory Organizers</strong><span>Pouches, cases, and organizers for small accessories, leads, chargers, and work gear.</span></a>
<a class="gearCard" href="https://www.amazon.com/s?k=night+shift+work+essentials&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer"><em>Paid link</em><strong>Night-Shift Work Essentials</strong><span>Practical comfort, meal, hydration, organization, and desk items for overnight professionals.</span></a>
</div></div></section>\n\n'''

text = text.replace(guide_anchor, gear_section + guide_anchor, 1)

if 'name="tag" value="spg_rpsgt-20"' not in text:
    raise SystemExit('Affiliate tag missing from search form')
if text.count('tag=spg_rpsgt-20') < 6:
    raise SystemExit('Expected tagged category links were not added')
if 'As an Amazon Associate I earn from qualifying purchases.' not in text:
    raise SystemExit('Required Amazon Associate disclosure missing')
if 'id="shop-gear"' not in text:
    raise SystemExit('Shop & Gear section missing')

path.write_text(text, encoding='utf-8')
print('Shop & Gear patch applied successfully.')
