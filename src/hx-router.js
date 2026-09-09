//====================================================================
// hx-router.js
//
// An extension providing SPA-style routing, viewport outlet targeting,
// active link state reflection, viewport prefetching, and scroll
// preservation for htmx 4.x.
//====================================================================
(function () {
    let api;

    function getCfg() {
        return Object.assign({
            activeClass: 'active',
            ariaCurrent: 'page',
            prefetchObserver: true,
            prefetchThreshold: 0.1,
            cacheTTL: 60000,
            morph: true
        }, (window.htmx && window.htmx.config && window.htmx.config.router) || {});
    }

    const routeCache = new Map();
    let prefetchObserver = null;
    const scrollPositions = new Map();

    function normalizeUrl(href) {
        if (!href) return null;
        try {
            const u = new URL(href, window.location.href);
            return u.origin === window.location.origin ? u.pathname + u.search : null;
        } catch (_) {
            return null;
        }
    }

    function updateActiveLinks() {
        const cfg = getCfg();
        const navContainers = document.querySelectorAll('[hx-nav]');
        const individualLinks = document.querySelectorAll('[hx-route-link]');
        const links = new Set();

        navContainers.forEach(nav => {
            nav.querySelectorAll('a[href]').forEach(a => links.add(a));
        });
        individualLinks.forEach(link => {
            if (link.tagName === 'A' && link.getAttribute('href')) links.add(link);
        });

        const currentPath = window.location.pathname + window.location.search;

        links.forEach(a => {
            const href = a.getAttribute('href');
            const norm = normalizeUrl(href);
            if (!norm) return;

            const isExact = norm === currentPath;
            const isMatch = isExact || (norm !== '/' && currentPath.startsWith(norm));

            if (isMatch) {
                a.classList.add(cfg.activeClass);
                if (isExact) {
                    a.setAttribute('aria-current', cfg.ariaCurrent);
                } else {
                    a.removeAttribute('aria-current');
                }
            } else {
                a.classList.remove(cfg.activeClass);
                a.removeAttribute('aria-current');
            }
        });
    }

    function setupPrefetchObserver() {
        if (typeof IntersectionObserver === 'undefined') return;
        const cfg = getCfg();
        if (!cfg.prefetchObserver) return;

        if (prefetchObserver) prefetchObserver.disconnect();

        prefetchObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const elt = entry.target;
                    prefetchLink(elt);
                    prefetchObserver.unobserve(elt);
                }
            });
        }, { threshold: cfg.prefetchThreshold });

        document.querySelectorAll('a[hx-prefetch="viewport"], [hx-viewport-prefetch] a[href]').forEach(a => {
            prefetchObserver.observe(a);
        });
    }

    async function prefetchLink(elt) {
        const href = elt.getAttribute('href') || (api && api.attributeValue(elt, 'hx-get')) || elt.getAttribute('hx-get');
        const url = normalizeUrl(href);
        if (!url || routeCache.has(url)) return;

        if (navigator.connection && navigator.connection.saveData) return;

        try {
            const headers = { 'HX-Request': 'true', 'HX-Request-Type': 'partial' };
            const res = await fetch(url, { headers });
            if (res.ok) {
                const text = await res.text();
                routeCache.set(url, {
                    html: text,
                    expires: Date.now() + getCfg().cacheTTL
                });
            }
        } catch (_) {
            // Silently ignore prefetch failures
        }
    }

    function saveScrollContainers() {
        document.querySelectorAll('[hx-preserve-scroll]').forEach(el => {
            const key = (api ? api.attributeValue(el, 'hx-preserve-scroll') : el.getAttribute('hx-preserve-scroll')) || el.id;
            if (key) {
                scrollPositions.set(key, { top: el.scrollTop, left: el.scrollLeft });
            }
        });
    }

    function restoreScrollContainers() {
        document.querySelectorAll('[hx-preserve-scroll]').forEach(el => {
            const key = (api ? api.attributeValue(el, 'hx-preserve-scroll') : el.getAttribute('hx-preserve-scroll')) || el.id;
            if (key && scrollPositions.has(key)) {
                const pos = scrollPositions.get(key);
                el.scrollTop = pos.top;
                el.scrollLeft = pos.left;
            }
        });
    }

    htmx.registerExtension('hx-router', {
        init: (internalAPI) => {
            api = internalAPI;
            window.addEventListener('popstate', () => {
                updateActiveLinks();
                setTimeout(restoreScrollContainers, 0);
            });
        },

        htmx_after_init: (elt) => {
            updateActiveLinks();
            setupPrefetchObserver();
            restoreScrollContainers();
        },

        htmx_before_request: (elt, detail) => {
            const ctx = detail.ctx;
            saveScrollContainers();

            // Default route targeting to [hx-viewport] if not explicitly targeted
            const explicitTarget = api ? api.attributeValue(elt, 'hx-target') : elt.getAttribute('hx-target');
            if (!explicitTarget) {
                const viewport = document.querySelector('[hx-viewport]');
                if (viewport) {
                    ctx.target = viewport;
                    const explicitSwap = api ? api.attributeValue(elt, 'hx-swap') : elt.getAttribute('hx-swap');
                    if (!explicitSwap && getCfg().morph) {
                        ctx.swapStyle = 'innerMorph';
                    }
                }
            }

            // SWR cache resolution for GET requests
            const method = (ctx.request && ctx.request.method) || 'GET';
            if (method.toUpperCase() === 'GET') {
                const action = (ctx.request && ctx.request.action) || elt.getAttribute('href') || (api && api.attributeValue(elt, 'hx-get')) || elt.getAttribute('hx-get');
                const norm = normalizeUrl(action);
                if (norm && routeCache.has(norm)) {
                    const cached = routeCache.get(norm);
                    if (Date.now() < cached.expires) {
                        ctx.fetch = () => Promise.resolve(new Response(cached.html, {
                            status: 200,
                            headers: { 'Content-Type': 'text/html' }
                        }));
                    } else {
                        routeCache.delete(norm);
                    }
                }
            }
        },

        htmx_after_swap: (elt, detail) => {
            updateActiveLinks();
            setupPrefetchObserver();
            restoreScrollContainers();
        },

        htmx_after_history_push: (elt, detail) => {
            updateActiveLinks();
        },

        htmx_after_history_replace: (elt, detail) => {
            updateActiveLinks();
        },

        htmx_before_cleanup: (elt) => {
            if (elt.hasAttribute && (elt.hasAttribute('hx-viewport-prefetch') || elt.getAttribute('hx-prefetch') === 'viewport')) {
                if (prefetchObserver) {
                    elt.querySelectorAll('a[href]').forEach(a => prefetchObserver.unobserve(a));
                }
            }
        }
    });
})();
