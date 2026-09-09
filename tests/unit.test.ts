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
});

