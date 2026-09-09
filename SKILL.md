---
name: hx-router
description: Use when implementing, configuring, or debugging SPA routing, viewport outlets, active link state reflection, View Transitions, and scroll preservation using the hx-router extension in htmx applications.
argument-hint: "[routing task or issue description]"
---

# `hx-router` Extension Guide

`hx-router` provides SPA routing, viewport outlet targeting, active link synchronization, View Transitions, and scroll restoration for htmx applications while preserving hypermedia-first architecture.

## Installation & Setup

Include `hx-router.js` after `htmx.js`:

```html
<head>
  <script src="https://cdn.jsdelivr.net/npm/htmx.org@4"></script>
  <script src="/path/to/hx-router.js"></script>
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
- **Safety**: Forms and mutating HTTP requests (`POST`, `PUT`, `DELETE`, `PATCH`) are never hijacked.

```html
<main hx-viewport>
  <!-- Active page partial swaps here -->
</main>
```

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
- Implements strict segment/slash boundary matching (`/users` will not erroneously match `/user`).
- Exact matches receive `aria-current="page"`. Parent subpath matches receive the active class.

```html
<nav hx-nav>
  <a href="/dashboard" hx-boost="true">Dashboard</a>
  <a href="/projects" hx-boost="true">Projects</a>
  <a href="/settings" hx-boost="true">Settings</a>
</nav>
```

### 4. Native View Transitions
If supported by the browser (`document.startViewTransition`), `hx-router` automatically enables animated transitions on viewport swaps without manual CSS classes or configuration.

Customize transition animations in CSS:
```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.2s;
}
```

### 5. Document Title Synchronization
When `syncTitle: true` (default), `hx-router` automatically parses `<title>` tags from server partials or pages and updates `document.title`.

```html
<!-- Response fragment from server -->
<title>Projects - My App</title>
<div class="projects-list">
  ...
</div>
```

### 6. Scroll Position Preservation (`[hx-preserve-scroll]`)
Preserves `scrollTop` and `scrollLeft` for sub-containers across route swaps and browser history navigation:

```html
<aside hx-preserve-scroll="sidebar-nav">
  <!-- Scroll offset retained on route navigation -->
</aside>
```

### 7. Composing with `preload`
`hx-router` intentionally leaves resource preloading to the official `preload` extension:

```html
<body hx-ext="hx-router, preload">
  <!-- Active nav links managed by hx-router, hover prefetch managed by preload -->
  <nav hx-nav preload="mouseover">
    <a href="/dashboard" hx-boost="true">Dashboard</a>
    <a href="/reports" hx-boost="true">Reports</a>
  </nav>

  <main hx-viewport></main>
</body>
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
  routingClass: 'hx-routing'     // Class added to viewport during navigation
};
```

---

## Agent Troubleshooting & Checklist

1. **Link not swapping into viewport?**
   - Ensure the link is either boosted (`hx-boost="true"`) or has `hx-get`.
   - Ensure there is an element with `hx-viewport` in the DOM.
   - Verify there is no explicit `hx-target` overriding the viewport.

2. **Active link class not appearing?**
   - Ensure the `<nav>` has `hx-nav` (or `hx-nav:inherited` in htmx 4), or the anchor has `hx-route-link`.
   - Verify the anchor's `href` matches the window `pathname`.

3. **Form submission replacing the whole viewport?**
   - Forms and mutating requests (`POST`, `PUT`, `DELETE`) are intentionally ignored by `hx-router`. Ensure form target behavior is specified via explicit `hx-target` on the form or submit button.
