from pathlib import Path

path = Path('rpsgt-exam-prep-books.html')
text = path.read_text(encoding='utf-8')

marker = 'id="guild-picks"'
if marker in text:
    print('Guild picks already present; nothing to do.')
    raise SystemExit(0)

nav_old = '<a href="#work-gear">Work Gear</a>'
nav_new = '<a href="#guild-picks">Guild Picks</a><a href="#work-gear">Work Gear</a>'
if nav_old not in text:
    raise SystemExit('Could not find Work Gear jump-nav anchor')
text = text.replace(nav_old, nav_new, 1)

css = '''
.curatedIntro{background:linear-gradient(145deg,#0b2741,#143b5b);color:#fff;border-radius:24px;padding:24px;margin-bottom:18px;box-shadow:var(--shadow)}
.curatedIntro h3{font-family:Georgia,serif;font-size:1.55rem;margin:0 0 8px}.curatedIntro p{color:#dfeaf2;line-height:1.58;margin:0}.curatedGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}.curatedProduct{background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:10px;box-shadow:0 6px 20px rgba(35,43,52,.07)}.curatedProduct .kind{font-size:.69rem;text-transform:uppercase;letter-spacing:.06em;font-weight:900;color:#765b0d}.curatedProduct h3{font-family:Georgia,serif;color:var(--navy);font-size:1.12rem;line-height:1.25;margin:0}.curatedProduct p{color:var(--muted);font-size:.83rem;line-height:1.5;margin:0}.curatedProduct .why{background:#f3f6f2;border-radius:12px;padding:10px 11px;color:#42575b;font-size:.78rem;line-height:1.45}.curatedProduct .btn{margin-top:auto;width:100%}.curatedProduct .sourceLine{font-size:.7rem;color:var(--muted);line-height:1.4}.curatedProduct .sourceLine a{color:var(--teal);font-weight:800}.curatedFooter{margin-top:14px;font-size:.78rem;color:var(--muted);line-height:1.5}.curatedFooter strong{color:var(--navy)}
@media(max-width:900px){.curatedGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.curatedGrid{grid-template-columns:1fr}}
'''
if '</style>' not in text:
    raise SystemExit('Could not find style close tag')
text = text.replace('</style>', css + '</style>', 1)

section = '''
<section class="shelf" id="guild-picks"><div class="wrap"><div class="shelfHead"><div><span class="eyebrow" style="color:#8a6910">Guild-curated product picks</span><h2>Specific gear worth comparing</h2><p>These are named products selected for organization, hydration, meals, and everyday shift logistics. They are optional convenience items—not required equipment, clinical recommendations, or BRPT/AASM endorsements.</p></div></div>
<div class="curatedIntro"><h3>Why name specific products?</h3><p>Category searches are still available below, but these picks give sleep technologists a practical starting point. Product names and core features were checked against current manufacturer information on September 10, 2026. Amazon availability, variants, and prices can change, so each gold button runs an exact-product Amazon search with the Sleep Pathways Guild affiliate tag instead of displaying a fixed price.</p></div>
<div class="shelfNote"><strong>Affiliate disclosure:</strong> Gold Amazon buttons are paid affiliate links. As an Amazon Associate I earn from qualifying purchases at no additional cost to you.</div>
<div class="curatedGrid">
<article class="curatedProduct"><span class="kind">Work bag · Paid link</span><h3>BAGSMART Paz 23L Backpack</h3><p>A lightweight work-style backpack with a 15.6-inch laptop compartment, multiple organizer compartments, and bottle pockets.</p><div class="why"><strong>Why it may fit:</strong> A useful one-bag option for a laptop, study materials, chargers, lunch-day extras, and personal shift supplies.</div><div class="sourceLine">Manufacturer details: <a href="https://www.bagsmart.com/products/paz-backpack" target="_blank" rel="noopener noreferrer">BAGSMART</a></div><a class="btn gold" href="https://www.amazon.com/s?k=BAGSMART+Paz+23L+Backpack&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Find on Amazon</a></article>
<article class="curatedProduct"><span class="kind">Organizer · Paid link</span><h3>BAGSMART Athena Electronic Organizer</h3><p>A padded electronics organizer with dedicated spaces for cables, portable chargers, USB accessories, and other small tech.</p><div class="why"><strong>Why it may fit:</strong> Keeps personal chargers, adapters, flash drives, and study-tech accessories from disappearing inside a larger work bag.</div><div class="sourceLine">Manufacturer details: <a href="https://www.bagsmart.com/products/pomona-electronic-organizer-pink-1" target="_blank" rel="noopener noreferrer">BAGSMART</a></div><a class="btn gold" href="https://www.amazon.com/s?k=BAGSMART+Athena+Electronic+Organizer&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Find on Amazon</a></article>
<article class="curatedProduct"><span class="kind">Organizer · Paid link</span><h3>Peak Design Tech Pouch</h3><p>A structured pouch with internal organization, elastic accessory loops, and a cable pass-through pocket for charging.</p><div class="why"><strong>Why it may fit:</strong> A more structured choice for people carrying several personal electronics, adapters, pens, or study accessories between locations.</div><div class="sourceLine">Manufacturer details: <a href="https://www.peakdesign.com/products/tech-pouch-black" target="_blank" rel="noopener noreferrer">Peak Design</a></div><a class="btn gold" href="https://www.amazon.com/s?k=Peak+Design+Tech+Pouch&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Find on Amazon</a></article>
<article class="curatedProduct"><span class="kind">Drinkware · Paid link</span><h3>YETI Rambler 30 oz Tumbler with MagSlider Lid</h3><p>Stainless-steel, double-wall vacuum-insulated drinkware that is dishwasher-safe and designed to fit most cupholders.</p><div class="why"><strong>Why it may fit:</strong> A durable shift tumbler for hot or cold drinks. The MagSlider lid adds splash resistance, but YETI states it is not leakproof.</div><div class="sourceLine">Manufacturer details: <a href="https://www.yeti.com/drinkware/tumblers/21071503808.html" target="_blank" rel="noopener noreferrer">YETI</a></div><a class="btn gold" href="https://www.amazon.com/s?k=YETI+Rambler+30+oz+Tumbler+MagSlider+Lid&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Find on Amazon</a></article>
<article class="curatedProduct"><span class="kind">Drinkware · Paid link</span><h3>Stanley Quencher H2.0 FlowState 30 oz Tumbler</h3><p>A handled, double-wall vacuum-insulated tumbler with a reusable straw and three-position lid that fits most car cupholders.</p><div class="why"><strong>Why it may fit:</strong> A convenient handled option for people who prefer a straw-style tumbler through a long shift or commute.</div><div class="sourceLine">Manufacturer details: <a href="https://www.stanley1913.com/products/adventure-quencher-travel-tumbler-30-oz" target="_blank" rel="noopener noreferrer">Stanley 1913</a></div><a class="btn gold" href="https://www.amazon.com/s?k=Stanley+Quencher+H2.0+FlowState+30+oz+Tumbler&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Find on Amazon</a></article>
<article class="curatedProduct"><span class="kind">Meal gear · Paid link</span><h3>Carhartt Insulated 12 Can Two Compartment Lunch Cooler</h3><p>An insulated work cooler with a separate top compartment, adjustable shoulder strap, top handle, and water-repellent outer fabric.</p><div class="why"><strong>Why it may fit:</strong> The two-compartment design can separate a main meal from snacks or smaller items during overnight shifts.</div><div class="sourceLine">Manufacturer details: <a href="https://www.carhartt.com/product/803138" target="_blank" rel="noopener noreferrer">Carhartt</a></div><a class="btn gold" href="https://www.amazon.com/s?k=Carhartt+Insulated+12+Can+Two+Compartment+Lunch+Cooler&tag=spg_rpsgt-20" target="_blank" rel="sponsored noopener noreferrer">Find on Amazon</a></article>
</div><p class="curatedFooter"><strong>Store policy:</strong> Sleep Pathways Guild does not claim these products are required for sleep-lab work or superior for every user. Facility infection-control, electrical, dress-code, and privacy policies always take priority. Manufacturer links are provided for product-detail verification; Amazon buttons are the affiliate links.</p></div></section>
'''

anchor = '<section class="shelf" id="work-gear">'
if anchor not in text:
    raise SystemExit('Could not find work-gear section anchor')
text = text.replace(anchor, section + '\n' + anchor, 1)

# Strengthen store tile so visitors see the named picks from the storefront home.
tile_old = '<a class="storeTile" href="#work-gear"><strong>Sleep Tech Work Gear</strong><span>Bags, organizers, badge accessories, cable cases, and practical items for lab work.</span><b>Browse work gear →</b></a>'
tile_new = '<a class="storeTile" href="#guild-picks"><strong>Curated Sleep Tech Picks</strong><span>Named bags, organizers, drinkware, and meal gear with manufacturer-verified product details.</span><b>See Guild picks →</b></a>'
if tile_old in text:
    text = text.replace(tile_old, tile_new, 1)

path.write_text(text, encoding='utf-8')
print('Completed curated storefront patch.')
