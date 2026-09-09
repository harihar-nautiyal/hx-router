---
name: hx-router
description: Use when implementing, configuring, or debugging SPA routing, viewport outlets, active link state reflection, View Transitions, scroll preservation, and fragment extraction using the hx-router extension in htmx applications.
argument-hint: "[routing task or issue description]"
---

# `hx-router` Extension Guide

`hx-router` provides SPA routing, viewport outlet targeting, active link synchronization, View Transitions, scroll restoration, screen-reader announcements, and full-page fragment extraction for htmx applications while preserving hypermedia-first architecture.

## Installation & Setup

Include `hx-router.js` (or import the ESM module) after `htmx.js`:

```html
<head>
  <script src="https://cdn.jsdelivr.net/npm/htmx.org@4"></script>
  <script src="/path/to/dist/hx-router.js"></script>
  <!-- Recommended: Pair with official preload extension for mouseover/mousedown prefetching -->
  <script src="https://cdn.jsdelivr.net/npm/htmx-ext-preload@2.1.2"></script>
</head>
```

- **htmx 4.x**: Automatically registers as `hx-router` and `router`.
- **htmx 1.x / 2.x**: Enable via `hx-ext="hx-router"`.

---

## Core Attributes & Capabilities

### 1. `[hx-viewport]` (Layout Outlet)
Designates the primary swap container for SPA transitions.
- Any navigation link (`a[href]` with `hx-boost="true"` or `hx-get`) omitting an explicit `hx-target` routes directly into `[hx-viewport]`.
- Defaults to `innerMorph` swapping to eliminate layout flicker and preserve input state.
- **Full-Page Fragment Extraction**: If the server returns a complete HTML page with `<head>`, `<nav>`, and `<main hx-viewport>`, `hx-router` automatically extracts the matching viewport content and keeps `document.title` synced without requiring separate partial endpoints.
- **Safety**: Forms and mutating HTTP requests (`POST`, `PUT`, `DELETE`, `PATCH`) are never hijacked.

### 2. Named Viewports (`hx-route-to="name"`)
Routes specific links into secondary outlets (e.g., modals, slide-out drawers, detail panes):

```html
<!-- Triggers swap into [hx-viewport="modal"] -->
<a href="/users/create" hx-route-to="modal" hx-boost="true">New User</a>

<!-- Modal outlet -->
<dialog hx-viewport="modal">
  <!-- Content swaps here -->
</dialog>
```

### 3. Active Link State Sync (`[hx-nav]` & `[hx-route-link]`)
Automatically synchronizes the active CSS class and `aria-current="page"` on route navigation, browser back/forward buttons, and initial load.

- Put `hx-nav` on `<nav>` containers or `hx-route-link` on individual anchor elements.
- Strict segment/slash boundary matching.
- **`hx-route-match="exact|prefix"`**: Force exact path matching or hierarchical prefix matching.
- **`hx-active-class="classes..."`**: Customize active classes per link or per nav.
- Exact matches receive `aria-current="page"`. Parent subpath matches receive the active class.

### 4. Native View Transitions
If supported by the browser (`document.startViewTransition`) and reduced motion is not preferred (`prefers-reduced-motion`), `hx-router` automatically enables animated transitions on viewport swaps.

### 5. Document Title Synchronization & a11y Announcer
When `syncTitle: true` (default), `hx-router` parses `<title>` tags from server partials or pages, updates `document.title`, and updates an offscreen `aria-live="polite"` region for assistive technology.

### 6. Scroll Management & History Restoration
- Automatically resets scroll to top on fresh navigations when `scrollReset: true`.
- Automatically restores window & viewport scroll position on browser back/forward buttons (`popstate`) when `historyScrollRestoration: true`.
- Automatically jumps to anchor targets (`#heading`) when `scrollHash: true`.
- Use `[hx-preserve-scroll]` to preserve `scrollTop` and `scrollLeft` for sub-containers (like sidebars).

### 7. Lifecycle Events

```javascript
document.addEventListener('hx-router:navigating', (e) => {
  // e.detail: { elt, viewport, to, from }
  // Can call e.preventDefault() to cancel navigation
});

document.addEventListener('hx-router:navigated', (e) => {
  // e.detail: { elt, viewport, url, type }
});
```

---

## Global Configuration

Configure via `htmx.config.router`:

```javascript
htmx.config.router = {
  activeClass: 'active',         // Class added to active links (default: 'active')
  ariaCurrent: 'page',           // aria-current value on exact match (default: 'page')
  morph: true,                   // Use innerMorph swap for viewports (default: true)
  viewTransitions: true,         // Enable document.startViewTransition (default: true)
  syncTitle: true,               // Extract and update document.title (default: true)
  routingClass: 'hx-routing',    // Class added to viewport during navigation
  scrollReset: true,             // Reset window/viewport scroll to top on navigation
  historyScrollRestoration: true,// Restore window & viewport scroll on back/forward
  scrollHash: true,              // Scroll to #hash element if present
  announceTitle: true,           // Screen reader aria-live announcements on route change
  autoExtractFragment: true      // Extract [hx-viewport] if server sends full HTML
};
```
