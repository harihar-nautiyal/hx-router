// src/hx-router.js
(function() {
  let api;
  function getCfg() {
    return Object.assign({
      activeClass: "active",
      ariaCurrent: "page",
      morph: true,
      viewTransitions: true,
      syncTitle: true,
      routingClass: "hx-routing",
      scrollReset: true,
      scrollHash: true,
      announceTitle: true,
      autoExtractFragment: true
    }, window.htmx && window.htmx.config && window.htmx.config.router || {});
  }
  const scrollPositions = new Map;
  function getAttr(elt, name) {
    if (!elt)
      return null;
    if (api && typeof api.attributeValue === "function") {
      const val = api.attributeValue(elt, name);
      if (val !== undefined && val !== null)
        return val;
    }
    return elt.getAttribute ? elt.getAttribute(name) : null;
  }
  function normalizeUrl(href) {
    if (!href)
      return null;
    try {
      const u = new URL(href, window.location.href);
      return u.origin === window.location.origin ? u.pathname + u.search : null;
    } catch (_) {
      return null;
    }
  }
  function isRouteMatch(linkPath, currentPath, mode) {
    if (!linkPath || !currentPath)
      return false;
    if (linkPath === currentPath)
      return true;
    if (mode === "exact")
      return false;
    const linkBase = linkPath.split("?")[0];
    const currentBase = currentPath.split("?")[0];
    if (linkBase === "/" || linkBase === "")
      return false;
    if (linkBase === currentBase) {
      if (linkPath.includes("?")) {
        const linkUrl = new URL(linkPath, "https://hx-router.local");
        const currUrl = new URL(currentPath, "https://hx-router.local");
        let matches = true;
        linkUrl.searchParams.forEach((v, k) => {
          if (currUrl.searchParams.get(k) !== v)
            matches = false;
        });
        return matches;
      }
      return true;
    }
    if (currentBase.startsWith(linkBase.endsWith("/") ? linkBase : linkBase + "/")) {
      return true;
    }
    return false;
  }
  function updateActiveLinks() {
    const cfg = getCfg();
    const currentPath = window.location.pathname + window.location.search;
    const currentNorm = normalizeUrl(currentPath);
    const links = new Set;
    document.querySelectorAll("[hx-nav], [hx-nav\\:inherited]").forEach((nav) => {
      nav.querySelectorAll("a[href]").forEach((a) => links.add(a));
    });
    document.querySelectorAll("[hx-route-link], a[hx-route-link]").forEach((link) => {
      if (link.tagName === "A" && link.getAttribute("href"))
        links.add(link);
    });
    links.forEach((a) => {
      const href = a.getAttribute("href");
      const norm = normalizeUrl(href);
      if (!norm)
        return;
      const mode = getAttr(a, "hx-route-match") || (a.closest("[hx-nav]") ? getAttr(a.closest("[hx-nav]"), "hx-route-match") : null) || "prefix";
      const activeCls = getAttr(a, "hx-active-class") || cfg.activeClass;
      const isExact = norm === currentNorm;
      const isMatch = isRouteMatch(norm, currentNorm, mode);
      if (isMatch) {
        if (activeCls)
          a.classList.add(...activeCls.trim().split(/\s+/));
        if (isExact) {
          a.setAttribute("aria-current", cfg.ariaCurrent);
        } else {
          a.removeAttribute("aria-current");
        }
      } else {
        if (activeCls)
          a.classList.remove(...activeCls.trim().split(/\s+/));
        a.removeAttribute("aria-current");
      }
    });
  }
  function saveScrollContainers() {
    document.querySelectorAll("[hx-preserve-scroll], [hx-preserve-scroll\\:inherited]").forEach((el) => {
      const key = getAttr(el, "hx-preserve-scroll") || el.id;
      if (key && key !== "true") {
        scrollPositions.set(key, { top: el.scrollTop, left: el.scrollLeft });
      }
    });
  }
  function restoreScrollContainers() {
    document.querySelectorAll("[hx-preserve-scroll], [hx-preserve-scroll\\:inherited]").forEach((el) => {
      const key = getAttr(el, "hx-preserve-scroll") || el.id;
      if (key && scrollPositions.has(key)) {
        const pos = scrollPositions.get(key);
        el.scrollTop = pos.top;
        el.scrollLeft = pos.left;
      }
    });
  }
  function getOrCreateAnnouncer() {
    let el = document.getElementById("hx-router-announcer");
    if (!el) {
      el = document.createElement("div");
      el.id = "hx-router-announcer";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      el.setAttribute("aria-atomic", "true");
      el.style.cssText = "position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";
      document.body.appendChild(el);
    }
    return el;
  }
  function getDOMParser() {
    return typeof window !== "undefined" && window.DOMParser || DOMParser;
  }
  function syncDocumentMetadata(responseHtml) {
    if (!responseHtml || !getCfg().syncTitle)
      return;
    try {
      const ParserClass = getDOMParser();
      const doc = new ParserClass().parseFromString(responseHtml, "text/html");
      if (doc.title) {
        document.title = doc.title;
        if (getCfg().announceTitle && document.body) {
          const announcer = getOrCreateAnnouncer();
          if (announcer)
            announcer.textContent = doc.title;
        }
      }
    } catch (_) {}
  }
  function handleScrollResetAndHash(targetEl) {
    const cfg = getCfg();
    const hash = window.location.hash ? window.location.hash.slice(1) : null;
    if (cfg.scrollHash && hash) {
      const hashEl = document.getElementById(hash);
      if (hashEl) {
        hashEl.scrollIntoView();
        return;
      }
    }
    if (cfg.scrollReset) {
      if (typeof window.scrollTo === "function") {
        window.scrollTo(0, 0);
      }
      if (targetEl && targetEl.scrollTop !== undefined) {
        targetEl.scrollTop = 0;
      }
    }
  }
  function isRoutingCandidate(elt, ctx) {
    const method = (ctx && ctx.request && ctx.request.method ? ctx.request.method : elt.getAttribute("hx-get") ? "GET" : "GET").toUpperCase();
    if (method !== "GET")
      return false;
    const isAnchor = elt.tagName === "A";
    const isBoosted = !!(elt._htmx && elt._htmx.boosted) || getAttr(elt, "hx-boost") === "true";
    const hasRouteAttr = elt.hasAttribute("hx-route") || elt.hasAttribute("hx-route-to");
    return hasRouteAttr || isAnchor && (isBoosted || elt.hasAttribute("hx-get"));
  }
  function resolveViewportTarget(elt) {
    const routeTargetName = getAttr(elt, "hx-route-to");
    if (routeTargetName) {
      const named = document.querySelector(`[hx-viewport="${routeTargetName}"]`);
      if (named)
        return named;
    }
    return document.querySelector("[hx-viewport]");
  }
  function removeRoutingIndicators() {
    const cfg = getCfg();
    if (cfg.routingClass) {
      document.querySelectorAll(`.${cfg.routingClass}`).forEach((el) => {
        el.classList.remove(cfg.routingClass);
      });
    }
  }
  function extractViewportFragment(responseHtml, viewportTarget) {
    if (!responseHtml || typeof responseHtml !== "string")
      return responseHtml;
    if (!/<html[\s>]/i.test(responseHtml) && !/<body[\s>]/i.test(responseHtml)) {
      return responseHtml;
    }
    try {
      const ParserClass = getDOMParser();
      const parser = new ParserClass;
      const doc = parser.parseFromString(responseHtml, "text/html");
      const targetName = viewportTarget && typeof viewportTarget.getAttribute === "function" ? viewportTarget.getAttribute("hx-viewport") : null;
      let matchingOutlet = null;
      if (targetName) {
        matchingOutlet = doc.querySelector(`[hx-viewport="${targetName}"]`);
      }
      if (!matchingOutlet) {
        matchingOutlet = doc.querySelector("[hx-viewport]");
      }
      if (matchingOutlet) {
        if (doc.title && getCfg().syncTitle) {
          document.title = doc.title;
          if (getCfg().announceTitle && document.body) {
            const announcer = getOrCreateAnnouncer();
            if (announcer)
              announcer.textContent = doc.title;
          }
        }
        return matchingOutlet.innerHTML;
      }
    } catch (_) {}
    return responseHtml;
  }
  function prefersReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (_) {
      return false;
    }
  }
  function dispatchRouterEvent(name, detail, cancelable = false) {
    const CustomEventCtor = typeof window !== "undefined" && window.CustomEvent || CustomEvent;
    const evt = new CustomEventCtor(name, {
      bubbles: true,
      cancelable,
      detail: detail || {}
    });
    return document.dispatchEvent(evt);
  }
  const routerExtension = {
    init: (internalAPI) => {
      api = internalAPI;
      window.addEventListener("popstate", () => {
        updateActiveLinks();
        setTimeout(() => {
          restoreScrollContainers();
          dispatchRouterEvent("hx-router:navigated", {
            type: "popstate",
            url: window.location.href
          });
        }, 0);
      });
    },
    htmx_after_init: () => {
      updateActiveLinks();
      restoreScrollContainers();
    },
    htmx_before_request: (elt, detail) => {
      const ctx = detail ? detail.ctx || detail : null;
      if (!ctx)
        return;
      saveScrollContainers();
      const cfg = getCfg();
      const explicitTarget = getAttr(elt, "hx-target");
      if (!explicitTarget && isRoutingCandidate(elt, ctx)) {
        const viewport = resolveViewportTarget(elt);
        if (viewport) {
          const toUrl = elt.getAttribute("href") || elt.getAttribute("hx-get");
          const allow = dispatchRouterEvent("hx-router:navigating", {
            elt,
            viewport,
            to: toUrl,
            from: window.location.href
          }, true);
          if (!allow) {
            if (ctx.xhr && typeof ctx.xhr.abort === "function")
              ctx.xhr.abort();
            return;
          }
          ctx.target = viewport;
          ctx._hxRouterActive = true;
          ctx._hxRouterViewport = viewport;
          const explicitSwap = getAttr(elt, "hx-swap");
          if (!explicitSwap && cfg.morph) {
            ctx.swapStyle = "innerMorph";
          }
          if (cfg.viewTransitions && document.startViewTransition && !prefersReducedMotion() && ctx.transition === undefined) {
            ctx.transition = true;
          }
          if (cfg.routingClass) {
            viewport.classList.add(cfg.routingClass);
          }
        }
      }
    },
    htmx_before_swap: (elt, detail) => {
      const ctx = detail ? detail.ctx || detail : null;
      const cfg = getCfg();
      if (cfg.autoExtractFragment && ctx && (ctx._hxRouterActive || detail.target?.hasAttribute?.("hx-viewport") || ctx.target?.hasAttribute?.("hx-viewport"))) {
        const vp = ctx._hxRouterViewport || ctx.target || detail.target;
        const rawResponse = detail.xhr ? detail.xhr.responseText || detail.xhr.response : detail.serverResponse || ctx.text;
        if (typeof rawResponse === "string") {
          const extracted = extractViewportFragment(rawResponse, vp);
          if (extracted !== rawResponse) {
            if (detail.serverResponse !== undefined)
              detail.serverResponse = extracted;
            if (ctx.text !== undefined)
              ctx.text = extracted;
          }
        }
      }
    },
    htmx_after_request: (elt, detail) => {
      const ctx = detail ? detail.ctx || detail : null;
      if (!ctx)
        return;
      const cfg = getCfg();
      if (cfg.autoExtractFragment && (ctx._hxRouterActive || ctx.target?.hasAttribute?.("hx-viewport"))) {
        const vp = ctx._hxRouterViewport || ctx.target;
        if (typeof ctx.text === "string") {
          const extracted = extractViewportFragment(ctx.text, vp);
          if (extracted !== ctx.text) {
            ctx.text = extracted;
          }
        }
      }
      const responseText = ctx.text || ctx.xhr && (ctx.xhr.responseText || ctx.xhr.response);
      if (responseText && cfg.syncTitle) {
        syncDocumentMetadata(responseText);
      }
    },
    htmx_after_swap: (elt, detail) => {
      const ctx = detail ? detail.ctx || detail : null;
      const vp = ctx?._hxRouterViewport || (elt?.hasAttribute?.("hx-viewport") ? elt : null);
      removeRoutingIndicators();
      updateActiveLinks();
      restoreScrollContainers();
      handleScrollResetAndHash(vp);
      dispatchRouterEvent("hx-router:navigated", {
        elt,
        viewport: vp,
        url: window.location.href
      });
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
  const publicAPI = {
    get config() {
      return getCfg();
    },
    updateActiveLinks,
    saveScrollContainers,
    restoreScrollContainers
  };
  if (typeof window !== "undefined") {
    window.htmx = window.htmx || {};
    window.htmx.router = publicAPI;
    if (typeof window.htmx.registerExtension === "function") {
      window.htmx.registerExtension("hx-router", routerExtension);
      window.htmx.registerExtension("router", routerExtension);
    }
    if (typeof window.htmx.defineExtension === "function") {
      const defineFn = (name) => {
        window.htmx.defineExtension(name, {
          init: routerExtension.init,
          onEvent: function(name2, evt) {
            const elt = evt.target;
            const detail = evt.detail || {};
            if (name2 === "htmx:afterInit" || name2 === "htmx:afterProcessNode") {
              routerExtension.htmx_after_init(elt);
            } else if (name2 === "htmx:beforeRequest") {
              routerExtension.htmx_before_request(elt, detail);
            } else if (name2 === "htmx:beforeSwap") {
              routerExtension.htmx_before_swap(elt, detail);
            } else if (name2 === "htmx:afterRequest") {
              routerExtension.htmx_after_request(elt, detail);
            } else if (name2 === "htmx:afterSwap") {
              routerExtension.htmx_after_swap(elt, detail);
            } else if (name2 === "htmx:historyPush") {
              routerExtension.htmx_after_history_push();
            } else if (name2 === "htmx:historyRestore") {
              updateActiveLinks();
              setTimeout(() => {
                restoreScrollContainers();
                dispatchRouterEvent("hx-router:navigated", {
                  type: "historyRestore",
                  url: window.location.href
                });
              }, 0);
            }
            return true;
          }
        });
      };
      defineFn("hx-router");
      defineFn("router");
    }
  }
})();
