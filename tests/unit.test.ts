import { describe, it, expect, beforeEach } from "bun:test";
import { Window } from "happy-dom";
import { readFileSync } from "fs";
import { resolve } from "path";

const routerScript = readFileSync(resolve(import.meta.dir, "../src/hx-router.js"), "utf-8");

describe("hx-router unit tests", () => {
    let window: Window;
    let document: Document;

    beforeEach(() => {
        window = new Window({ url: "https://example.com/app/dashboard" });
        document = window.document;
        (globalThis as any).window = window;
        (globalThis as any).document = document;
    });

    it("registers extension when htmx.defineExtension is present", () => {
        const definedExts: Record<string, any> = {};
        (window as any).htmx = {
            defineExtension: (name: string, ext: any) => {
                definedExts[name] = ext;
            }
        };

        const runScript = new Function("window", "document", routerScript);
        runScript(window, document);

        expect(definedExts["hx-router"]).toBeDefined();
        expect(definedExts["router"]).toBeDefined();
        expect(typeof definedExts["hx-router"].init).toBe("function");
        expect(typeof definedExts["hx-router"].onEvent).toBe("function");
    });

    it("registers extension when htmx.registerExtension is present", () => {
        const registered: Record<string, any> = {};
        (window as any).htmx = {
            registerExtension: (name: string, ext: any) => {
                registered[name] = ext;
            }
        };

        const runScript = new Function("window", "document", routerScript);
        runScript(window, document);

        expect(registered["hx-router"]).toBeDefined();
        expect(registered["router"]).toBeDefined();
        expect(typeof registered["hx-router"].init).toBe("function");
        expect(typeof registered["hx-router"].htmx_before_request).toBe("function");
    });

    it("updates active links based on URL hierarchy and exact match", () => {
        const registered: Record<string, any> = {};
        (window as any).htmx = {
            registerExtension: (name: string, ext: any) => {
                registered[name] = ext;
            }
        };

        document.body.innerHTML = `
            <nav hx-nav>
                <a id="link-exact" href="/app/dashboard">Dashboard</a>
                <a id="link-sub" href="/app">App Home</a>
                <a id="link-other" href="/app/settings">Settings</a>
            </nav>
        `;

        const runScript = new Function("window", "document", routerScript);
        runScript(window, document);

        const router = registered["hx-router"];
        router.htmx_after_init();

        const exact = document.getElementById("link-exact")!;
        const sub = document.getElementById("link-sub")!;
        const other = document.getElementById("link-other")!;

        expect(exact.classList.contains("active")).toBe(true);
        expect(exact.getAttribute("aria-current")).toBe("page");

        expect(sub.classList.contains("active")).toBe(true);
        expect(sub.getAttribute("aria-current")).toBeNull();

        expect(other.classList.contains("active")).toBe(false);
    });

    it("restores scroll positions on demand", () => {
        const registered: Record<string, any> = {};
        (window as any).htmx = {
            registerExtension: (name: string, ext: any) => {
                registered[name] = ext;
            }
        };

        document.body.innerHTML = `
            <div id="scroll-box" hx-preserve-scroll="box"></div>
        `;

        const runScript = new Function("window", "document", routerScript);
        runScript(window, document);

        const router = registered["hx-router"];
        const box = document.getElementById("scroll-box")!;
        box.scrollTop = 250;
        box.scrollLeft = 80;

        // Save on before_request
        router.htmx_before_request(box, { ctx: {} });

        box.scrollTop = 0;
        box.scrollLeft = 0;

        // Restore on after_swap
        router.htmx_after_swap();

        expect(box.scrollTop).toBe(250);
        expect(box.scrollLeft).toBe(80);
    });

    it("sets innerMorph and transition on routing candidates when supported", () => {
        const registered: Record<string, any> = {};
        (window as any).htmx = {
            registerExtension: (name: string, ext: any) => {
                registered[name] = ext;
            }
        };

        (document as any).startViewTransition = () => {};

        document.body.innerHTML = `
            <a id="route-link" href="/target" hx-route>Target</a>
            <div hx-viewport id="vp"></div>
        `;

        const runScript = new Function("window", "document", routerScript);
        runScript(window, document);

        const router = registered["hx-router"];
        const link = document.getElementById("route-link")!;
        const vp = document.getElementById("vp")!;

        const ctx: any = { request: { method: "GET" } };
        router.htmx_before_request(link, { ctx });

        expect(ctx.target).toBe(vp);
        expect(ctx.swapStyle).toBe("innerMorph");
        expect(ctx.transition).toBe(true);
        expect(vp.classList.contains("hx-routing")).toBe(true);

        // Finally request removes indicator
        router.htmx_finally_request();
        expect(vp.classList.contains("hx-routing")).toBe(false);
    });

    it("respects hx-route-match='exact' and custom hx-active-class", () => {
        const registered: Record<string, any> = {};
        (window as any).htmx = {
            registerExtension: (name: string, ext: any) => {
                registered[name] = ext;
            }
        };

        document.body.innerHTML = `
            <nav hx-nav>
                <a id="link-parent" href="/app" hx-route-match="exact" hx-active-class="exact-active">Parent</a>
                <a id="link-curr" href="/app/dashboard" hx-active-class="custom-active text-bold">Dashboard</a>
            </nav>
        `;

        const runScript = new Function("window", "document", routerScript);
        runScript(window, document);

        const router = registered["hx-router"];
        router.htmx_after_init();

        const parent = document.getElementById("link-parent")!;
        const curr = document.getElementById("link-curr")!;

        // /app should NOT match /app/dashboard because mode='exact'
        expect(parent.classList.contains("exact-active")).toBe(false);
        expect(parent.classList.contains("active")).toBe(false);

        // /app/dashboard should receive custom classes
        expect(curr.classList.contains("custom-active")).toBe(true);
        expect(curr.classList.contains("text-bold")).toBe(true);
        expect(curr.getAttribute("aria-current")).toBe("page");
    });

    it("extracts viewport fragment from full HTML response", () => {
        const registered: Record<string, any> = {};
        (window as any).htmx = {
            registerExtension: (name: string, ext: any) => {
                registered[name] = ext;
            }
        };

        document.body.innerHTML = `
            <div hx-viewport id="main-outlet">Old Inner</div>
        `;

        const runScript = new Function("window", "document", routerScript);
        runScript(window, document);

        const router = registered["hx-router"];
        const vp = document.getElementById("main-outlet")!;

        const fullHtml = `<!DOCTYPE html><html><head><title>Full Doc Page</title></head><body><header>Nav</header><main hx-viewport><h1>Fragment Content</h1></main><footer>Foot</footer></body></html>`;

        const detail: any = {
            target: vp,
            serverResponse: fullHtml
        };
        const ctx: any = { _hxRouterActive: true, _hxRouterViewport: vp };

        router.htmx_before_swap(vp, Object.assign(detail, { ctx }));

        expect(detail.serverResponse).toBe("<h1>Fragment Content</h1>");
        expect(document.title).toBe("Full Doc Page");
    });

    it("announces title to screen readers via #hx-router-announcer", () => {
        const registered: Record<string, any> = {};
        (window as any).htmx = {
            registerExtension: (name: string, ext: any) => {
                registered[name] = ext;
            }
        };

        const runScript = new Function("window", "document", routerScript);
        runScript(window, document);

        const router = registered["hx-router"];
        router.htmx_after_request(document.body, { ctx: { text: "<title>Accessible Page Title</title>" } });

        const announcer = document.getElementById("hx-router-announcer");
        expect(announcer).not.toBeNull();
        expect(announcer?.getAttribute("aria-live")).toBe("polite");
        expect(announcer?.textContent).toBe("Accessible Page Title");
    });

    it("dispatches semantic hx-router:navigating and hx-router:navigated events", () => {
        const registered: Record<string, any> = {};
        (window as any).htmx = {
            registerExtension: (name: string, ext: any) => {
                registered[name] = ext;
            }
        };

        document.body.innerHTML = `
            <a id="nav-btn" href="/new-page" hx-route>Go</a>
            <div hx-viewport id="vp"></div>
        `;

        const runScript = new Function("window", "document", routerScript);
        runScript(window, document);

        const router = registered["hx-router"];
        const btn = document.getElementById("nav-btn")!;
        const vp = document.getElementById("vp")!;

        let navigatingDetail: any = null;
        let navigatedDetail: any = null;

        document.addEventListener("hx-router:navigating", ((e: CustomEvent) => {
            navigatingDetail = e.detail;
        }) as EventListener);

        document.addEventListener("hx-router:navigated", ((e: CustomEvent) => {
            navigatedDetail = e.detail;
        }) as EventListener);

        const ctx: any = { request: { method: "GET" } };
        router.htmx_before_request(btn, { ctx });

        expect(navigatingDetail).not.toBeNull();
        expect(navigatingDetail.to).toBe("/new-page");
        expect(navigatingDetail.viewport).toBe(vp);

        router.htmx_after_swap(btn, { ctx });
        expect(navigatedDetail).not.toBeNull();
        expect(navigatedDetail.viewport).toBe(vp);
    });
});

