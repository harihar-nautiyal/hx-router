# hx-router

An SPA routing, layout outlet, and navigation orchestration extension for **htmx** (compatible with htmx 4.x, 2.x, and 1.x).

`hx-router` brings SPA quality-of-life primitives to htmx applications while preserving hypermedia-first architecture. It handles layout outlets, active link state reflection, scroll preservation, view transitions, and title syncing. For resource prefetching, it composes seamlessly with the official [`preload`](https://htmx.org/extensions/preload/) extension.

---

## Features

- **`[hx-viewport]` & Named Outlets**: Automatically targets default and nested viewports (e.g. `<dialog hx-viewport="modal">` via `hx-route-to="modal"`) without requiring manual `hx-target` on every navigation link. Mutating requests (`POST`, `PUT`, `DELETE`) and non-navigation triggers are safeguarded from viewport hijacking.
- **`[hx-nav]` & `[hx-route-link]` Active Link State Sync**: Automatically toggles the active class and sets `aria-current="page"` on matching routes with strict segment and slash-boundary matching.
- **Native View Transitions**: Automatically enables `document.startViewTransition` on viewport route swaps where supported.
- **Document Title Syncing**: Seamlessly extracts and updates `document.title` from swapped HTML responses.
- **`[hx-preserve-scroll]`**: Preserves scroll positions across route transitions and browser history navigation for sidebars, tables, and panes.
- **Loading State Indicator**: Applies `.hx-routing` to the active viewport container during transitions.
- **Dual Compatibility**: First-class support for htmx 4.x lifecycle hooks with fallback mapping for htmx 1.x / 2.x `htmx.defineExtension`.

---

## Installation

Include `htmx.js` and `hx-router.js` in your HTML. To enable link preloading on hover or mousedown, pair it with the official `preload` extension:

```html
<head>
  <!-- Core htmx -->
  <script src="https://cdn.jsdelivr.net/npm/htmx.org@4"></script>

  <!-- hx-router -->
  <script src="/path/to/hx-router.js"></script>

  <!-- (Optional) Official htmx Preload Extension -->
  <script src="https://cdn.jsdelivr.net/npm/htmx-ext-preload@2.1.2"></script>
</head>
```

In htmx 4.x, extensions register automatically. In htmx 1.x / 2.x, enable via `hx-ext="hx-router, preload"`.

---

## Usage

### 1. Viewport Routing & Active Links

Define a layout outlet with `hx-viewport`. Any boosted link (`hx-boost="true"`) or `hx-get` link without an explicit `hx-target` routes directly to the viewport using smooth morphing:

```html
<body hx-ext="hx-router, preload">
  <!-- Navigation bar with active link sync and hover prefetching -->
  <nav hx-nav preload="mouseover">
    <a href="/dashboard" hx-boost="true">Dashboard</a>
    <a href="/projects" hx-boost="true">Projects</a>
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

---

## Configuration

Options can be customized via `htmx.config.router`:

```javascript
htmx.config.router = {
  activeClass: 'active',         // Class added to matched route links
  ariaCurrent: 'page',           // aria-current value for exact route matches
  morph: true,                   // Use innerMorph for viewport swapping
  viewTransitions: true,         // Enable native View Transitions when supported
  syncTitle: true,               // Extract <title> from response and update document.title
  routingClass: 'hx-routing'     // Class added to viewport during navigation
};
```

---

## Architecture & Composition

Following the hypermedia and Unix philosophy of *"do one thing well"*, `hx-router` delegates preloading to the dedicated [`preload`](https://htmx.org/extensions/preload/) extension. This avoids redundant network caches, memory leaks, and complex IntersectionObserver teardown while ensuring compatibility with standard browser HTTP caching.

---

## AI Agents & Skills

This repository includes a [`SKILL.md`](./SKILL.md) specification designed for agentic coding assistants (e.g. OpenCode, Claude Code). It provides context on architecture, attribute mechanics, diagnostics, and integration patterns for building and troubleshooting SPA-style htmx apps.

---

## License

MIT
