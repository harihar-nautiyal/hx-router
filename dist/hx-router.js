//====================================================================
// hx-router.js
//
// An SPA routing and navigation orchestration extension for htmx.
// Provides automatic viewport outlet targeting, active link state reflection,
// View Transitions, document title syncing, and scroll preservation.
// Pair with official 'preload' extension for resource preloading.
//====================================================================
(function () {
    let api;

    function getCfg() {
        return Object.assign({
            activeClass: 'active',
            ariaCurrent: 'page',
            morph: true,
            viewTransitions: true,
            syncTitle: true,
            routingClass: 'hx-routing'
        }, (window.htmx && window.htmx.config && window.htmx.config.router) || {});
    }

    const scrollPositions = new Map();

    function getAttr(elt, name) {
        if (!elt) return null;
        if (api && typeof api.attributeValue === 'function') {
            const val = api.attributeValue(elt, name);
            if (val !== undefined && val !== null) return val;
        }
        return elt.getAttribute ? elt.getAttribute(name) : null;
    }

    function normalizeUrl(href) {
        if (!href) return null;
        try {
            const u = new URL(href, window.location.href);
            return u.origin === window.location.origin ? u.pathname + u.search : null;
        } catch (_) {
            return null;
        }
    }

    function isRouteMatch(linkPath, currentPath) {
        if (!linkPath || !currentPath) return false;
        if (linkPath === currentPath) return true;

        // Path hierarchy matching without query parameters
        const linkBase = linkPath.split('?')[0];
        const currentBase = currentPath.split('?')[0];

        if (linkBase === '/' || linkBase === '') return false;

        if (linkBase === currentBase) return true;
        if (currentBase.startsWith(linkBase.endsWith('/') ? linkBase : linkBase + '/')) {
            return true;
        }

        return false;
    }

    function updateActiveLinks() {
        const cfg = getCfg();
        const currentPath = window.location.pathname + window.location.search;
        const currentNorm = normalizeUrl(currentPath);

        const links = new Set();
        document.querySelectorAll('[hx-nav], [hx-nav\\:inherited]').forEach(nav => {
            nav.querySelectorAll('a[href]').forEach(a => links.add(a));
        });
        document.querySelectorAll('[hx-route-link], a[hx-route-link]').forEach(link => {
            if (link.tagName === 'A' && link.getAttribute('href')) links.add(link);
        });

        links.forEach(a => {
            const href = a.getAttribute('href');
            const norm = normalizeUrl(href);
            if (!norm) return;

            const isExact = norm === currentNorm;
            const isMatch = isRouteMatch(norm, currentNorm);

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

    function saveScrollContainers() {
        document.querySelectorAll('[hx-preserve-scroll], [hx-preserve-scroll\\:inherited]').forEach(el => {
            const key = getAttr(el, 'hx-preserve-scroll') || el.id;
            if (key && key !== 'true') {
                scrollPositions.set(key, { top: el.scrollTop, left: el.scrollLeft });
            }
        });
    }

    function restoreScrollContainers() {
        document.querySelectorAll('[hx-preserve-scroll], [hx-preserve-scroll\\:inherited]').forEach(el => {
            const key = getAttr(el, 'hx-preserve-scroll') || el.id;
            if (key && scrollPositions.has(key)) {
                const pos = scrollPositions.get(key);
                el.scrollTop = pos.top;
                el.scrollLeft = pos.left;
            }
        });
    }

    function syncDocumentMetadata(responseHtml) {
        if (!responseHtml || !getCfg().syncTitle) return;
        try {
            const doc = new DOMParser().parseFromString(responseHtml, 'text/html');
            if (doc.title) {
                document.title = doc.title;
            }
        } catch (_) {}
    }

    function isRoutingCandidate(elt, ctx) {
        const method = (ctx && ctx.request && ctx.request.method ? ctx.request.method : (elt.getAttribute('hx-get') ? 'GET' : 'GET')).toUpperCase();
        if (method !== 'GET') return false;

        const isAnchor = elt.tagName === 'A';
        const isBoosted = !!(elt._htmx && elt._htmx.boosted) || getAttr(elt, 'hx-boost') === 'true';
        const hasRouteAttr = elt.hasAttribute('hx-route') || elt.hasAttribute('hx-route-to');

        return hasRouteAttr || (isAnchor && (isBoosted || elt.hasAttribute('hx-get')));
    }

    function resolveViewportTarget(elt) {
        const routeTargetName = getAttr(elt, 'hx-route-to');
        if (routeTargetName) {
            const named = document.querySelector(`[hx-viewport="${routeTargetName}"]`);
            if (named) return named;
        }
        return document.querySelector('[hx-viewport]');
    }

    function removeRoutingIndicators() {
        const cfg = getCfg();
        if (cfg.routingClass) {
            document.querySelectorAll(`.${cfg.routingClass}`).forEach(el => {
                el.classList.remove(cfg.routingClass);
            });
        }
    }

    const routerExtension = {
        init: (internalAPI) => {
            api = internalAPI;
            window.addEventListener('popstate', () => {
                updateActiveLinks();
                setTimeout(restoreScrollContainers, 0);
            });
        },

        htmx_after_init: () => {
            updateActiveLinks();
            restoreScrollContainers();
        },

        htmx_before_request: (elt, detail) => {
            const ctx = detail ? (detail.ctx || detail) : null;
            if (!ctx) return;
            saveScrollContainers();

            const cfg = getCfg();
            const explicitTarget = getAttr(elt, 'hx-target');

            if (!explicitTarget && isRoutingCandidate(elt, ctx)) {
                const viewport = resolveViewportTarget(elt);
                if (viewport) {
                    ctx.target = viewport;

                    const explicitSwap = getAttr(elt, 'hx-swap');
                    if (!explicitSwap && cfg.morph) {
                        ctx.swapStyle = 'innerMorph';
                    }

                    if (cfg.viewTransitions && document.startViewTransition && ctx.transition === undefined) {
                        ctx.transition = true;
                    }

                    if (cfg.routingClass) {
                        viewport.classList.add(cfg.routingClass);
                    }
                }
            }
        },

        htmx_after_request: (elt, detail) => {
            const ctx = detail ? (detail.ctx || detail) : null;
            if (!ctx) return;

            // Extract and synchronize document title from response
            const responseText = ctx.text || (ctx.xhr && (ctx.xhr.responseText || ctx.xhr.response));
            if (responseText && getCfg().syncTitle) {
                syncDocumentMetadata(responseText);
            }
        },

        htmx_after_swap: (elt, detail) => {
            removeRoutingIndicators();
            updateActiveLinks();
            restoreScrollContainers();
        },

        htmx_finally_request: () => {
            removeRoutingIndicators();
        },

        htmx_after_history_push: () => {
            updateActiveLinks();
        },

        htmx_after_history_replace: () => {
            updateActiveLinks();
        }
    };

    // Register for htmx 4.x as well as backward-compatibility fallback for 1.x / 2.x
    if (typeof window !== 'undefined' && window.htmx) {
        if (typeof window.htmx.registerExtension === 'function') {
            window.htmx.registerExtension('hx-router', routerExtension);
            window.htmx.registerExtension('router', routerExtension);
        }
        if (typeof window.htmx.defineExtension === 'function') {
            window.htmx.defineExtension('hx-router', {
                init: routerExtension.init,
                onEvent: function (name, evt) {
                    const elt = evt.target;
                    const detail = evt.detail || {};
                    if (name === 'htmx:afterInit' || name === 'htmx:afterProcessNode') {
                        routerExtension.htmx_after_init(elt);
                    } else if (name === 'htmx:beforeRequest') {
                        routerExtension.htmx_before_request(elt, detail);
                    } else if (name === 'htmx:afterRequest') {
                        routerExtension.htmx_after_request(elt, detail);
                    } else if (name === 'htmx:afterSwap') {
                        routerExtension.htmx_after_swap(elt, detail);
                    } else if (name === 'htmx:historyPush') {
                        routerExtension.htmx_after_history_push();
                    } else if (name === 'htmx:historyRestore') {
                        updateActiveLinks();
                        setTimeout(restoreScrollContainers, 0);
                    }
                    return true;
                }
            });
            window.htmx.defineExtension('router', {
                init: routerExtension.init,
                onEvent: function (name, evt) {
                    const elt = evt.target;
                    const detail = evt.detail || {};
                    if (name === 'htmx:afterInit' || name === 'htmx:afterProcessNode') {
                        routerExtension.htmx_after_init(elt);
                    } else if (name === 'htmx:beforeRequest') {
                        routerExtension.htmx_before_request(elt, detail);
                    } else if (name === 'htmx:afterRequest') {
                        routerExtension.htmx_after_request(elt, detail);
                    } else if (name === 'htmx:afterSwap') {
                        routerExtension.htmx_after_swap(elt, detail);
                    } else if (name === 'htmx:historyPush') {
                        routerExtension.htmx_after_history_push();
                    } else if (name === 'htmx:historyRestore') {
                        updateActiveLinks();
                        setTimeout(restoreScrollContainers, 0);
                    }
                    return true;
                }
            });
        }
    }
})();
