# hx-router

An SPA routing, layout outlet, and navigation orchestration extension for **htmx** (compatible with htmx 4.x, 2.x, and 1.x).

`hx-router` brings SPA quality-of-life primitives to htmx applications while preserving hypermedia-first architecture. It handles layout outlets, active link state reflection, scroll preservation, view transitions, title syncing, fragment auto-extraction, and screen reader announcements. For resource prefetching, it composes seamlessly with the official [`preload`](https://htmx.org/extensions/preload/) extension.

---

## Features

- **`[hx-viewport]` & Named Outlets**: Automatically targets default and nested viewports (e.g. `<dialog hx-viewport="modal">` via `hx-route-to="modal"`) without requiring manual `hx-target` on every navigation link. Mutating requests (`POST`, `PUT`, `DELETE`) and non-navigation triggers are safeguarded from viewport hijacking.
- **Full-Page Fragment Auto-Extraction**: When the server responds with a full HTML page, `hx-router` automatically extracts the matching `[hx-viewport]` fragment—eliminating the need for separate partial endpoints.
- **`[hx-nav]` & `[hx-route-link]` Active Link State Sync**: Automatically toggles the active class and sets `aria-current="page"` on matching routes with strict segment and slash-boundary matching. Supports `hx-route-match="exact|prefix"` and custom per-link classes (`hx-active-class="..."`).
- **Native View Transitions**: Automatically enables `document.startViewTransition` on viewport route swaps with automatic respect for `prefers-reduced-motion`.
- **Document Title & Accessibility Sync**: Seamlessly extracts and updates `document.title` and announces route changes to assistive tech via an `aria-live="polite"` region.
- **Scroll Management & History Restoration**:
  - Resets window and viewport scroll to `(0, 0)` on fresh link navigations.
  - Automatically restores window and viewport scroll coordinates on browser **Back / Forward** (`popstate` / `htmx:historyRestore`), avoiding abrupt jumps to top.
  - Smoothly jumps to hash anchors (`#id`) when present in URLs.
  - `[hx-preserve-scroll]` preserves granular sub-element scroll positions (e.g. sidebars, table bodies) across transitions.
- **Lifecycle Events**: Dispatches semantic `hx-router:navigating` (cancellable) and `hx-router:navigated` events for telemetry or analytics.
- **Public JavaScript API**: Programmatic utilities via `window.htmx.router` (`updateActiveLinks()`, `restoreScrollContainers()`, etc.).
- **Dual Compatibility & ESM**: First-class ESM bundle (`dist/hx-router.esm.js`), TypeScript declarations (`.d.ts`), and support for htmx 4.x, 2.x, and 1.x.

---

## Installation

### ESM / Bundler (Vite, Webpack, esbuild)

```bash
npm install hx-router
```

```javascript
import 'hx-router';
```

The `package.json` entrypoint defaults to the modern ESM build with full TypeScript definitions.

### CDN

```html
<!-- CDN Script Tag (IIFE) -->
<script src="https://cdn.jsdelivr.net/npm/hx-router@latest"></script>

<!-- Or via ESM import in modern browsers -->
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/hx-router@latest/dist/hx-router.esm.js';
</script>
```

In htmx 4.x, extensions register automatically. In htmx 1.x / 2.x, enable via `hx-ext="hx-router"`.

---

## Usage

### 1. Viewport Routing & Active Links

Define a layout outlet with `hx-viewport`. Any boosted link (`hx-boost="true"`) or `hx-get` link without an explicit `hx-target` routes directly to the viewport:

```html
<body hx-ext="hx-router, preload">
  <!-- Navigation bar with active link sync and hover prefetching -->
  <nav hx-nav preload="mouseover">
    <!-- Exact match only -->
    <a href="/dashboard" hx-boost="true" hx-route-match="exact">Dashboard</a>
    <!-- Prefix match with custom styling -->
    <a href="/projects" hx-boost="true" hx-active-class="bg-blue-600 text-white">Projects</a>
    <a href="/settings" hx-boost="true">Settings</a>
  </nav>

  <!-- Persistent scrollable sidebar -->
  <aside hx-preserve-scroll="sidebar">
    ...
  </aside>

  <!-- Main Viewport Outlet -->
  <main hx-viewport>
    <!-- Content swaps here automatically -->
  </main>
</body>
```

### 2. Named Outlets (Modals / Drawers)

```html
<!-- Routes to the modal viewport instead of the default main viewport -->
<a href="/users/create" hx-route-to="modal" hx-boost="true">Create User</a>

<!-- Modal Dialog Viewport -->
<dialog hx-viewport="modal">
  <!-- Swapped here -->
</dialog>
```

### 3. Full-Page Fragment Fallback (`autoExtractFragment`)

By default (`autoExtractFragment: true`), if your backend responds with a full HTML document (including `<!DOCTYPE html>`, `<head>`, `<nav>`, `<footer>`), `hx-router` automatically parses the response, extracts only the matching `[hx-viewport]` content, and updates `document.title`. This lets you write standard multi-page templates on the server without having to maintain separate partial endpoints or manual `hx-select` attributes.

If you prefer to disable this behavior and let htmx swap the raw response directly, set:
```javascript
htmx.config.router = {
  autoExtractFragment: false
};
```

### 4. Active Route Matching & Edge Cases

`hx-router` synchronizes active states (`activeClass` and `aria-current="page"`) on route changes. Matching behavior handles common edge cases predictably:

- **Segment Boundary Safety**: Strict path segment matching prevents false positives. For example, a link to `/projects` will **not** match `/projects-archive`.
- **Parent vs. Child Paths (`/projects` vs `/projects/123`)**:
  - In default `prefix` mode: `/projects/123` activates both `<a href="/projects/123">` (exact match, receives `aria-current="page"`) and `<a href="/projects">` (parent subpath match, receives `activeClass`).
  - To restrict a link to match *only* when the URL is an exact match, set `hx-route-match="exact"` on the anchor or parent `<nav>` container.
- **Root Path (`/`)**: Root links (`href="/"`) are guarded against prefix greediness and only match when the current path is literally `/`.
- **Trailing Slashes**: Automatically handled by segment boundary matching (`/projects/` and `/projects` match symmetrically).
- **Query Strings (`?query=...`)**:
  - If a navigation link does **not** specify query parameters (e.g. `href="/projects"`), query strings in the browser URL (e.g. `/projects?sort=date&page=2`) are **ignored**, keeping the route link active.
  - If a navigation link **explicitly defines query parameters** (e.g. `href="/projects?tab=archived"`), `hx-router` verifies that those specific parameters match the current browser URL query before activating the link.
- **Hash Fragments (`#hash`)**: Anchor hashes are stripped during route path comparison and used exclusively for scroll targeting.

### 5. Swapping & Morphing (`morph: true`)

`hx-router` defaults to morphing viewport contents (`morph: true`, which sets `swapStyle = 'innerMorph'`) to eliminate layout flicker, preserve input focus, and retain scroll positions of child elements.

> **Note on Idiomorph Dependency**:
> - In **htmx 4.x**, morphing is natively supported out of the box via built-in morphing algorithms.
> - In **htmx 1.x / 2.x**, `innerMorph` relies on the official [`idiomorph`](https://github.com/bigskysoftware/idiomorph) extension (`hx-ext="idiomorph"`). `hx-router` **does not bundle** Idiomorph into its file size to keep bundle overhead under 2 KB.
> - If you are using htmx 1.x / 2.x and do not load Idiomorph, or prefer standard inner HTML replacement, set `morph: false` in your configuration (or specify `hx-swap="innerHTML"` on the link).

### 6. Lifecycle Events

```javascript
// Intercept or cancel navigation
document.addEventListener('hx-router:navigating', (e) => {
  console.log('Navigating from:', e.detail.from, 'to:', e.detail.to);
  // Call e.preventDefault() to cancel the navigation
});

// Trigger analytics or post-swap logic
document.addEventListener('hx-router:navigated', (e) => {
  console.log('Navigated to:', e.detail.url);
});
```

---

## Configuration

Options can be customized via `htmx.config.router`:

```javascript
htmx.config.router = {
  activeClass: 'active',         // Class added to matched route links
  ariaCurrent: 'page',           // aria-current value for exact route matches
  morph: true,                   // Use innerMorph for viewport swapping
  viewTransitions: true,         // Enable native View Transitions (honors prefers-reduced-motion)
  syncTitle: true,               // Extract <title> from response and update document.title
  routingClass: 'hx-routing',    // Class added to viewport during navigation
  scrollReset: true,             // Reset scroll to top on fresh page navigation
  historyScrollRestoration: true,// Restore window & viewport scroll on back/forward buttons
  scrollHash: true,              // Scroll to #hash element if present in URL
  announceTitle: true,           // Screen reader aria-live announcements on route changes
  autoExtractFragment: true      // Extract [hx-viewport] if server sends full HTML
};
```

---

## License

MIT
