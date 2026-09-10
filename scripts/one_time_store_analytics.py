from pathlib import Path

path = Path('rpsgt-exam-prep-books.html')
text = path.read_text(encoding='utf-8')

if "affiliate_click" in text or "store_search" in text:
    raise SystemExit('Store analytics already appears to be installed')

anchor = '</body>'
if text.count(anchor) != 1:
    raise SystemExit(f'Expected exactly one </body> anchor, found {text.count(anchor)}')

analytics = r'''<script>
(function(){
  function sendStoreEvent(name, params){
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params);
    }
  }

  function storeSection(el){
    var section = el && el.closest ? el.closest('section') : null;
    return section && section.id ? section.id : 'storefront';
  }

  function classifyStoreSearch(value){
    var q = String(value || '').toLowerCase();
    if (/spanish|espanol|español|apnea del|sueño|sueno/.test(q)) return 'spanish_resources';
    if (/book|rpsgt|cpsgt|ccsh|brpt|aasm|scoring|polysomnography|sleep medicine|exam|study/.test(q)) return 'books_study';
    if (/shirt|mug|gift|sticker|tote|merch|notebook/.test(q)) return 'gifts_merch';
    if (/night shift|blackout|sleep mask|earplug|lunch|water bottle|tumbler|charger|reading light/.test(q)) return 'night_shift';
    if (/bag|backpack|badge|lanyard|cable|organizer|clipboard|pouch|work gear/.test(q)) return 'work_gear';
    return 'other';
  }

  document.addEventListener('click', function(event){
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;
    var href = link.getAttribute('href') || '';
    if (!/https?:\/\/(?:www\.)?amazon\.com\//i.test(href)) return;

    var label = (link.textContent || 'Amazon link').replace(/\s+/g, ' ').trim().slice(0, 100);
    var kind = link.closest('.bookCard') ? 'book' : ((link.closest('.pickCard') || link.closest('.gearCard')) ? 'merchandise' : 'store');

    sendStoreEvent('affiliate_click', {
      affiliate_program: 'amazon',
      store_section: storeSection(link),
      link_kind: kind,
      link_label: label
    });
  }, true);

  document.addEventListener('submit', function(event){
    var form = event.target;
    if (!form || !form.classList || !form.classList.contains('shopSearch')) return;
    var input = form.querySelector('input[name="k"]');
    var value = input && input.value ? input.value.trim() : '';

    sendStoreEvent('store_search', {
      store_section: storeSection(form),
      search_category: classifyStoreSearch(value),
      query_length: Math.min(value.length, 100)
    });
  }, true);
})();
</script>
'''

text = text.replace(anchor, analytics + anchor, 1)

required = [
    "gtag('event', name, params)",
    "affiliate_click",
    "store_search",
    "affiliate_program: 'amazon'",
    "search_category: classifyStoreSearch(value)",
]
for token in required:
    if token not in text:
        raise SystemExit(f'Missing analytics token: {token}')

# Privacy guard: never transmit the raw shopper query to GA4.
if "search_term: value" in text or "query_text: value" in text or "search_query: value" in text:
    raise SystemExit('Raw store search text must not be sent to analytics')

path.write_text(text, encoding='utf-8')
