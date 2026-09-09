/**
 * TypeScript declarations for hx-router (hx-ext-router)
 */

export interface HxRouterConfig {
  /** CSS class added to matched route links (default: 'active') */
  activeClass?: string;
  /** Value for aria-current on exact route matches (default: 'page') */
  ariaCurrent?: string;
  /** Whether to swap using innerMorph when targeting a viewport (default: true) */
  morph?: boolean;
  /** Whether to use document.startViewTransition on viewport navigations (default: true) */
  viewTransitions?: boolean;
  /** Automatically extract <title> from responses and synchronize document.title (default: true) */
  syncTitle?: boolean;
  /** Class added to the active viewport container during transitions (default: 'hx-routing') */
  routingClass?: string;
  /** Automatically reset window/viewport scroll to top on fresh navigations (default: true) */
  scrollReset?: boolean;
  /** Automatically save and restore window and viewport scroll positions on back/forward (popstate) navigation (default: true) */
  historyScrollRestoration?: boolean;
  /** Automatically scroll to targeted hash (#id) element after navigation (default: true) */
  scrollHash?: boolean;
  /** Announce new page title to assistive tech via an aria-live region (default: true) */
  announceTitle?: boolean;
  /** Automatically extract [hx-viewport] fragment if response is a full HTML page (default: true) */
  autoExtractFragment?: boolean;
}

export interface HxRouterAPI {
  config: HxRouterConfig;
  updateActiveLinks(): void;
  saveScrollContainers(): void;
  restoreScrollContainers(): void;
}

declare global {
  interface Window {
    htmx?: {
      config?: {
        router?: HxRouterConfig;
        [key: string]: any;
      };
      router?: HxRouterAPI;
      defineExtension?: (name: string, ext: any) => void;
      registerExtension?: (name: string, ext: any) => void;
      [key: string]: any;
    };
  }
}

export {};
