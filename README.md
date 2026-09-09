# hx-router

An SPA routing and navigation extension for **htmx 4.x**.

`hx-router` brings SPA quality-of-life primitives into htmx applications while keeping hypermedia-first architecture intact.

## Features

- **`[hx-viewport]` Automatic Layout Routing**: Target viewport outlets without manually adding `hx-target` to every single navigation link. Defaults to `innerMorph` swapping to keep UI states flicker-free.
- **`[hx-nav]` & `[hx-route-link]` Active Link State Sync**: Automatically toggles `active` class and sets `aria-current="page"` on matching routes across pushState, replaceState, and browser popstate navigation.
- **`hx-prefetch="viewport"` & `[hx-viewport-prefetch]`**: Preloads linked HTML fragments using `IntersectionObserver` when elements enter the screen, respecting `navigator.connection.saveData`.
- **`[hx-preserve-scroll]`**: Maintains scroll positions for sub-containers (drawers, sidebars, panes) across route transitions.
- **In-Memory SWR (Stale-While-Revalidate) Cache**: Resolves visited GET routes immediately from memory.

---

## Installation

Include `htmx.js` and `hx-router.js` in your HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/htmx.org@4"></script>
<script src="/path/to/hx-router.js"></script>
```

In htmx 4.x, loading the script registers the extension automatically.

---

## Usage

### 1. Layout & Viewport Navigation

Define a container with `hx-viewport`. Any boosted link (`hx-boost="true"`) or `hx-get` without an explicit `hx-target` will automatically route to the viewport:

```html
<!-- Navigation bar with active link tracking and visibility-based prefetching -->
<nav hx-nav hx-viewport-prefetch>
  <a href="/dashboard" hx-boost="true">Dashboard</a>
  <a href="/projects" hx-boost="true">Projects</a>
  <a href="/settings" hx-boost="true">Settings</a>
</nav>

<!-- Persistent scrollable panel -->
<aside hx-preserve-scroll="panel">
  ...
</aside>

<!-- Active Viewport Outlet -->
<main hx-viewport>
  <!-- Content swaps here automatically -->
</main>
```

---

## Configuration

Options can be customized via `htmx.config.router`:

```javascript
htmx.config.router = {
  activeClass: 'active',         // Class added to matched route links
  ariaCurrent: 'page',           // aria-current value for exact route matches
  prefetchObserver: true,        // Enable IntersectionObserver prefetching
  prefetchThreshold: 0.1,        // Viewport visibility threshold to trigger prefetch
  cacheTTL: 60000,               // SWR cache lifetime in ms (default: 60s)
  morph: true                    // Use innerMorph for viewport swapping
};
```

---

## License

MIT
