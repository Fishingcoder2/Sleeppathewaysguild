/**
 * Sleep Pathways Guild RPSGT V3 — additive, scoped SPA navigation fallback.
 *
 * The legacy V3 site still serves real standalone HTML and JSON assets.
 * Never use a catch-all 404 -> /index.html rewrite: it would hide missing
 * question-bank modules and could silently corrupt the learner experience.
 *
 * Only /case-review/** is a React SPA at this phase of the migration.
 */
const SPA_ROOT = '/case-review';
const SPA_ENTRY = '/case-review/index.html';
const SHORTCUTS = new Map([
  ['/notebook', '/case-review/'],
  ['/notebook/', '/case-review/'],
  ['/practice', '/practice.html'],
]);

function isSpaPath(path) {
  return path === SPA_ROOT || path.startsWith(SPA_ROOT + '/');
}

function isSpaNavigation(request, path) {
  if (!['GET', 'HEAD'].includes(request.method)) return false;
  if (!isSpaPath(path)) return false;
  // Never mask missing .js, .css, .json, images, maps, fonts, etc.
  const segments = path.split('/').filter(Boolean);
  if (segments.some(segment => segment.includes('.'))) return false;
  if (segments.some(segment => segment === 'assets' || segment === 'api')) return false;
  const mode = request.headers.get('Sec-Fetch-Mode');
  const acceptsHtml = (request.headers.get('Accept') || '').toLowerCase().includes('text/html');
  return mode === 'navigate' || acceptsHtml;
}

export default {
  async fetch(request, env) {
    if (!env?.ASSETS || typeof env.ASSETS.fetch !== 'function') {
      return new Response('Static asset binding is unavailable.', { status: 503 });
    }

    const url = new URL(request.url);
    if (['GET', 'HEAD'].includes(request.method) && SHORTCUTS.has(url.pathname)) {
      url.pathname = SHORTCUTS.get(url.pathname);
      // Temporary during migration; do not cache a permanent legacy route.
      return Response.redirect(url.toString(), 307);
    }

    // Always check the exact path first: real files win over SPA routes.
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || !isSpaNavigation(request, url.pathname)) {
      return response;
    }

    const entry = new URL(SPA_ENTRY, request.url);
    const shell = await env.ASSETS.fetch(new Request(entry, {
      method: request.method,
      headers: request.headers,
    }));
    if (shell.status !== 200) return response; // fail closed on missing SPA build

    const headers = new Headers(shell.headers);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Cache-Control', 'no-cache');
    headers.set('X-SPG-Route', 'case-review-spa');
    return new Response(request.method === 'HEAD' ? null : shell.body, {
      status: 200,
      statusText: 'OK',
      headers,
    });
  },
};
