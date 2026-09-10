from pathlib import Path

path = Path('rpsgt-exam-prep-books.html')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    text = text.replace(old, new, 1)


replace_once(
    '<title>BRPT Exam Prep Books: RPSGT, CPSGT, CCSH & Certificates | SPG</title>',
    '<title>Sleep Technologist Store: BRPT Books, Gear & Gifts | SPG</title>',
    'title',
)
replace_once(
    '<meta name="description" content="Browse BRPT Recommended Readings, Approved ATC References, current sleep technology books, and sleep technologist bags, shirts, gifts, and gear.">',
    '<meta name="description" content="Shop BRPT Recommended Readings, Approved ATC References, sleep technologist bags, shirts, gifts, night-shift essentials, and Spanish sleep resources.">',
    'meta description',
)
replace_once(
    '<meta property="og:title" content="BRPT Exam Prep Books for RPSGT, CPSGT, CCSH & Certificates">',
    '<meta property="og:title" content="Sleep Technologist Store: BRPT Books, Gear & Gifts">',
    'og title',
)
replace_once(
    '<meta property="og:description" content="Credential-by-credential sleep technology books for RPSGT, CPSGT, CCSH, Pediatric Sleep, and Advanced Titration preparation.">',
    '<meta property="og:description" content="Books, work gear, night-shift essentials, gifts, and Spanish sleep resources curated for sleep technologists.">',
    'og description',
)
replace_once(
    '<meta name="twitter:title" content="BRPT Exam Prep Books for RPSGT, CPSGT, CCSH & Certificates">',
    '<meta name="twitter:title" content="Sleep Technologist Store: BRPT Books, Gear & Gifts">',
    'twitter title',
)
replace_once(
    '<meta name="twitter:description" content="Curated BRPT exam and certificate references for sleep technologists, with official-source links and current editions.">',
    '<meta name="twitter:description" content="Curated BRPT study books, sleep-tech work gear, night-shift essentials, gifts, and Spanish resources.">',
    'twitter description',
)
replace_once(
    '"name":"BRPT Exam Prep Books for RPSGT, CPSGT, CCSH & Certificates"',
    '"name":"Sleep Technologist Store: BRPT Books, Gear & Gifts"',
    'schema webpage name',
)
replace_once(
    '"name":"BRPT Exam Prep Books & Certificate References","item":"https://sleeppathwaysguild.com/rpsgt-exam-prep-books"',
    '"name":"Sleep Technologist Store","item":"https://sleeppathwaysguild.com/rpsgt-exam-prep-books"',
    'schema breadcrumb',
)
replace_once(
    '<a class="shop" href="#start">Browse books</a>',
    '<a class="shop" href="#storefront">Shop & study</a>',
    'header shop link',
)
replace_once(
    '<h1>Books for every BRPT pathway.</h1><p>Browse sleep technology references by RPSGT, CPSGT, CCSH, Pediatric Sleep Certificate, and Advanced Titration Certificate. BRPT reading lists are non-exclusive, so use the current exam blueprint and official standards as your guide.</p>',
    '<h1>Books, gear & resources for sleep technologists.</h1><p>Start with clearly labeled BRPT Recommended Readings and Approved ATC References, then browse practical sleep-tech work gear, night-shift essentials, gifts, featured authors, and Spanish-language resources.</p>',
    'hero copy',
)

old_jump = '<div class="jumpbar"><div class="wrap jumpchips"><a href="#credentials">Choose Pathway</a><a href="#start">Core Books</a><a href="#technical">Technical & PSG</a><a href="#pediatric">Pediatric Sleep</a><a href="#ccsh">CCSH</a><a href="#advanced-titration">Advanced Titration</a><a href="#maria-sosa">Featured Author</a><a href="#shop-gear">Shop & Gear</a><a href="#specialty">Specialty</a><a href="#official">Official Manuals</a><a href="#guide">How to choose</a></div></div>'
new_jump = '<div class="jumpbar"><div class="wrap jumpchips"><a href="#storefront">Store Home</a><a href="#credentials">BRPT Reading</a><a href="#start">Books</a><a href="#work-gear">Work Gear</a><a href="#night-shift">Night Shift</a><a href="#gifts">Gifts & Merch</a><a href="#spanish-resources">Spanish Resources</a><a href="#maria-sosa">Featured Author</a><a href="#official">Official Manuals</a><a href="#guide">How to choose</a></div></div>'
replace_once(old_jump, new_jump, 'jump navigation')

css_anchor = '.gearCard:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(35,43,52,.1)}'
css_extra = css_anchor + '.storeHub{margin:8px auto 26px;background:var(--paper);border:1px solid var(--line);border-radius:26px;padding:26px;box-shadow:var(--shadow)}.storeHubHead{display:flex;justify-content:space-between;gap:18px;align-items:end;margin-bottom:18px}.storeHubHead h2{font-family:Georgia,serif;color:var(--navy);font-size:clamp(1.85rem,3vw,2.65rem);margin:0}.storeHubHead p{color:var(--muted);line-height:1.55;max-width:65ch;margin:7px 0 0}.storeNav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.storeTile{display:flex;flex-direction:column;gap:6px;text-decoration:none;background:#fbf8f1;border:1px solid var(--line);border-radius:16px;padding:18px;min-height:126px}.storeTile strong{font-family:Georgia,serif;color:var(--navy);font-size:1.08rem}.storeTile span{color:var(--muted);font-size:.82rem;line-height:1.45}.storeTile b{margin-top:auto;color:var(--teal);font-size:.75rem}.pickGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.pickCard{display:flex;flex-direction:column;gap:8px;background:var(--paper);border:1px solid var(--line);border-radius:17px;padding:18px;box-shadow:0 5px 18px rgba(35,43,52,.06)}.pickCard h3{font-family:Georgia,serif;color:var(--navy);font-size:1.05rem;margin:0}.pickCard p{color:var(--muted);font-size:.82rem;line-height:1.48;margin:0 0 4px}.pickCard .btn{margin-top:auto;width:100%}.paidLink{display:inline-block;width:max-content;font-size:.66rem;font-weight:900;text-transform:uppercase;letter-spacing:.05em;color:#765b0d;background:#f8edc8;border-radius:999px;padding:4px 7px}.shelfNote{background:#eef5f2;border-left:4px solid var(--teal);border-radius:10px;padding:12px 14px;color:#42575b;font-size:.8rem;line-height:1.5;margin:0 0 16px}'
replace_once(css_anchor, css_extra, 'storefront CSS')
replace_once(
    '@media(max-width:1000px){.bookGrid{grid-template-columns:repeat(3,minmax(0,1fr))}.gearGrid{grid-template-columns:repeat(2,minmax(0,1fr))}',
    '@media(max-width:1000px){.bookGrid{grid-template-columns:repeat(3,minmax(0,1fr))}.gearGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.storeNav,.pickGrid{grid-template-columns:repeat(2,minmax(0,1fr))}',
    'tablet CSS',
)
replace_once(
    '@media(max-width:740px){.gearGrid{grid-template-columns:1fr}.searchRow{flex-direction:column}',
    '@media(max-width:740px){.gearGrid,.storeNav,.pickGrid{grid-template-columns:1fr}.storeHub{padding:20px}.storeHubHead{align-items:flex-start;flex-direction:column}.searchRow{flex-direction:column}',
    'mobile CSS',
)

credentials_anchor = '<section class="seoBlock wrap" id="credentials">'
store_hub = '''<section class="storeHub wrap" id="storefront"><div class="storeHubHead"><div><span class="eyebrow" style="color:#8a6910">Sleep Pathways Guild Store</span><h2>Choose what you need today</h2><p>The store keeps exam references, independent study resources, work gear, and merchandise clearly separated. Gold BRPT labels are reserved for titles that match an official BRPT reading/reference source.</p></div><a class="btn outline" href="#shop-gear">Search the whole shop</a></div><div class="storeNav">
<a class="storeTile" href="#credentials"><strong>BRPT Reading & Exam Books</strong><span>Recommended Readings, Approved ATC References, official manuals, and broader exam-prep books.</span><b>Browse study resources →</b></a>
<a class="storeTile" href="#work-gear"><strong>Sleep Tech Work Gear</strong><span>Bags, organizers, badge accessories, cable cases, and practical items for lab work.</span><b>Browse work gear →</b></a>
<a class="storeTile" href="#night-shift"><strong>Night-Shift Essentials</strong><span>Hydration, meals, daytime-sleep comfort, charging, and organization for overnight professionals.</span><b>Browse night-shift picks →</b></a>
<a class="storeTile" href="#gifts"><strong>Shirts, Gifts & Merchandise</strong><span>Sleep-tech shirts, mugs, stickers, totes, notebooks, and appreciation gifts.</span><b>Browse gifts →</b></a>
<a class="storeTile" href="#spanish-resources"><strong>Spanish Sleep Resources</strong><span>Spanish-language sleep education and patient-friendly resources, including Maria Sosa's apnea guide.</span><b>Browse Spanish resources →</b></a>
<a class="storeTile" href="#maria-sosa"><strong>Featured Sleep Authors</strong><span>Independent books by working sleep professionals, clearly separated from official BRPT reading lists.</span><b>Meet the featured author →</b></a>
</div></section>\n'''
if text.count(credentials_anchor) != 1:
    raise SystemExit('credentials anchor not unique')
text = text.replace(credentials_anchor, store_hub + credentials_anchor, 1)

shop_anchor = '<section class="seoBlock wrap" id="guide">'
curated_sections = '''<section class="shelf" id="work-gear"><div class="wrap"><div class="shelfHead"><div><span class="eyebrow" style="color:#2a6761">Curated work gear</span><h2>Practical organization for the sleep lab</h2><p>These links open focused Amazon searches rather than locking you into one brand or model. Choose items that fit your facility policies, infection-control requirements, and personal workflow.</p></div></div><div class="shelfNote"><strong>Affiliate note:</strong> Every gold button in these merchandise shelves is a paid affiliate link and includes the Sleep Pathways Guild tag. As an Amazon Associate I earn from qualifying purchases.</div><div class="pickGrid">
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Structured work bag or backpack</h3><p>Useful when you want separate compartments for notebooks, chargers, small personal items, and shift supplies without mixing everything together.</p><a class="btn gold" href="https://www.amazon.com/s?k=medical+work+bag+organizer+backpack&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse work bags</a></article>
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Cable & electronics organizer</h3><p>A compact case can keep charging cords, adapters, flash drives, pens, and other small accessories from disappearing in a larger work bag.</p><a class="btn gold" href="https://www.amazon.com/s?k=electronics+cable+organizer+case&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse organizers</a></article>
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Retractable badge reel</h3><p>A practical option for frequently scanned IDs or keys. Verify that any badge accessory meets your employer's dress and safety policies.</p><a class="btn gold" href="https://www.amazon.com/s?k=medical+retractable+badge+reel&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse badge reels</a></article>
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Small zippered supply pouches</h3><p>Color-coded or labeled pouches can separate personal gear, office supplies, chargers, and study materials inside a larger bag.</p><a class="btn gold" href="https://www.amazon.com/s?k=zippered+organizer+pouches+set&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse pouches</a></article>
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Clipboard with storage</h3><p>Useful for paper notes and forms when permitted by the facility. Keep protected health information within approved workflows and storage rules.</p><a class="btn gold" href="https://www.amazon.com/s?k=clipboard+with+storage+medical&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse clipboards</a></article>
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Compact desk organizer</h3><p>For pens, sticky notes, charging cords, and other nonclinical workstation items that tend to accumulate during long shifts.</p><a class="btn gold" href="https://www.amazon.com/s?k=compact+desk+organizer&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse desk organizers</a></article>
</div></div></section>

<section class="shelf" id="night-shift"><div class="wrap"><div class="shelfHead"><div><span class="eyebrow" style="color:#8a6910">Night-shift essentials</span><h2>Comfort and organization for overnight work</h2><p>These are convenience items for shift routines—not medical treatments or sleep-disorder therapies. Choose what fits your personal needs and workplace rules.</p></div></div><div class="pickGrid">
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Insulated water bottle or tumbler</h3><p>A reusable insulated container can make it easier to keep a preferred drink at your workstation through a long overnight shift.</p><a class="btn gold" href="https://www.amazon.com/s?k=insulated+water+bottle+tumbler+work&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse drinkware</a></article>
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Insulated lunch bag</h3><p>A compact cooler-style bag gives night-shift workers a dedicated place for meals and snacks when cafeteria options are limited.</p><a class="btn gold" href="https://www.amazon.com/s?k=insulated+lunch+bag+night+shift&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse lunch bags</a></article>
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Blackout sleep mask</h3><p>A simple daytime-sleep accessory for people who prefer additional light blocking. It is a comfort item, not a substitute for evaluation of sleep problems.</p><a class="btn gold" href="https://www.amazon.com/s?k=blackout+sleep+mask+daytime+sleep&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse sleep masks</a></article>
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Reusable earplugs</h3><p>For people who want to reduce ordinary environmental noise during off-hours. Follow product instructions and any safety requirements relevant to your setting.</p><a class="btn gold" href="https://www.amazon.com/s?k=reusable+earplugs+sleep+noise&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse earplugs</a></article>
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Charging station or cable hub</h3><p>Keeping personal devices and accessories in one charging area can reduce cord clutter at home or at a nonclinical workstation.</p><a class="btn gold" href="https://www.amazon.com/s?k=desktop+charging+station+cable+organizer&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse charging gear</a></article>
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Dimmable reading light</h3><p>A small adjustable light can be useful for reading or studying without turning on a bright room light during quiet hours.</p><a class="btn gold" href="https://www.amazon.com/s?k=dimmable+book+light+reading&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse reading lights</a></article>
</div></div></section>

<section class="shelf" id="gifts"><div class="wrap"><div class="shelfHead"><div><span class="eyebrow" style="color:#2a6761">Gifts & merchandise</span><h2>Sleep-tech shirts, mugs and appreciation gifts</h2><p>Fun items for coworkers, graduates, Sleep Technologist Appreciation Week, credential milestones, or your own night-shift personality.</p></div></div><div class="pickGrid">
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Sleep technologist shirts</h3><p>Browse polysomnography, sleep-lab, RPSGT, and night-shift themed apparel in multiple styles.</p><a class="btn gold" href="https://www.amazon.com/s?k=sleep+technologist+RPSGT+shirt&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse shirts</a></article>
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Sleep-tech mugs & tumblers</h3><p>Useful graduation or coworker gifts with sleep-lab, coffee, and night-shift themes.</p><a class="btn gold" href="https://www.amazon.com/s?k=sleep+technologist+mug+tumbler&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse mugs</a></article>
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Sleep-themed stickers</h3><p>Low-cost add-ons for notebooks, personal water bottles, laptops, or gift bags.</p><a class="btn gold" href="https://www.amazon.com/s?k=sleep+technologist+stickers+sleep+lab&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse stickers</a></article>
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Sleep-tech tote bags</h3><p>A casual alternative to a structured work bag for books, study materials, or everyday personal items.</p><a class="btn gold" href="https://www.amazon.com/s?k=sleep+technologist+tote+bag&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse totes</a></article>
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Sleep-themed notebooks</h3><p>Good for study notes, exam planning, continuing-education notes, or a small credentialing gift.</p><a class="btn gold" href="https://www.amazon.com/s?k=sleep+technologist+notebook+sleep+lab&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse notebooks</a></article>
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Night-shift gift ideas</h3><p>Browse broader appreciation gifts for overnight healthcare and laboratory professionals when a sleep-specific design is not necessary.</p><a class="btn gold" href="https://www.amazon.com/s?k=night+shift+healthcare+worker+gifts&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Browse gift ideas</a></article>
</div></div></section>

<section class="shelf" id="spanish-resources"><div class="wrap"><div class="shelfHead"><div><span class="eyebrow" style="color:#8a6910">Recursos en español</span><h2>Spanish-language sleep resources</h2><p>A small starting shelf for Spanish-speaking patients, families, learners, and sleep professionals seeking patient-friendly education.</p></div></div><div class="pickGrid">
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Apnea del Sueño: Entenderla para Vivir Mejor</h3><p>Maria I. Sosa's Spanish-language sleep-apnea guide is already featured in the author section and can also be found directly through this tagged search.</p><a class="btn gold" href="https://www.amazon.com/s?k=Apnea+del+Sueno+Entenderla+para+Vivir+Mejor+Maria+I+Sosa&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Find Maria Sosa's guide</a></article>
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Libros sobre apnea del sueño</h3><p>Browse additional Spanish-language books about sleep apnea. Check author credentials, publication date, and clinical sources before relying on health information.</p><a class="btn gold" href="https://www.amazon.com/s?k=apnea+del+sueno+libro+espanol&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Buscar libros en español</a></article>
<article class="pickCard"><span class="paidLink">Paid link</span><h3>Educación del sueño en español</h3><p>Browse general Spanish-language sleep and patient-education books. These are discovery links, not BRPT recommendations or clinical endorsements.</p><a class="btn gold" href="https://www.amazon.com/s?k=sueno+salud+libro+espanol&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Buscar recursos</a></article>
</div></div></section>\n\n'''
if text.count(shop_anchor) != 1:
    raise SystemExit('guide anchor not unique')
text = text.replace(shop_anchor, curated_sections + shop_anchor, 1)

required = [
    'id="storefront"', 'id="work-gear"', 'id="night-shift"', 'id="gifts"', 'id="spanish-resources"',
    'spg_rpsgt-20', 'Paid link', 'As an Amazon Associate I earn from qualifying purchases.',
    'Sleep Technologist Store: BRPT Books, Gear & Gifts',
]
missing = [item for item in required if item not in text]
if missing:
    raise SystemExit(f'Missing required storefront content: {missing}')

if text.count('tag=spg_rpsgt-20') < 25:
    raise SystemExit(f'Expected at least 25 tagged affiliate links, found {text.count("tag=spg_rpsgt-20")}')

path.write_text(text, encoding='utf-8')
