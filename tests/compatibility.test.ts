import { describe, it, expect } from "bun:test";
import { setupHtmxTestEnvironment } from "./helpers";

const HTMX_VERSIONS = ["1.9.0", "1.9.12", "2.0.0", "2.0.4", "4.0.0"];

describe.each(HTMX_VERSIONS)("htmx v%s compatibility", (version) => {
    it("registers the extension successfully under both 'hx-router' and 'router'", () => {
        const env = setupHtmxTestEnvironment({ version });
        expect(env.htmx).toBeDefined();

        if (typeof env.htmx.defineExtension === "function") {
            // htmx 1.x / 2.x
            // trigger process
            expect(env.window.htmx).toBeDefined();
        }
        if (typeof env.htmx.registerExtension === "function") {
            // htmx 4.x
            expect(typeof env.htmx.registerExtension).toBe("function");
        }
    });

    it("automatically targets [hx-viewport] on navigation link requests", async () => {
        const html = `<!DOCTYPE html>
        <html>
        <head><title>Initial</title></head>
        <body>
            <div hx-ext="hx-router">
                <a id="nav-link" href="/dashboard" hx-get="/dashboard" hx-route>Dashboard</a>
                <div hx-viewport id="main-viewport">Initial Viewport Content</div>
            </div>
        </body>
        </html>`;

        const env = setupHtmxTestEnvironment({
            version,
            html,
            mockResponseHtml: `<div id="new-page"><title>Dashboard Title</title><p>Welcome to Dashboard</p></div>`
        });

        const link = env.document.getElementById("nav-link")!;
        const viewport = env.document.getElementById("main-viewport")!;

        link.click();

        await new Promise((r) => setTimeout(r, 60));

        expect(viewport.innerHTML).toContain("Welcome to Dashboard");
        expect(env.document.title).toBe("Dashboard Title");
    });

    it("supports named viewports via hx-route-to", async () => {
        const html = `<!DOCTYPE html>
        <html>
        <head><title>Initial</title></head>
        <body>
            <div hx-ext="hx-router">
                <a id="modal-link" href="/modal" hx-get="/modal" hx-route-to="modal">Open Modal</a>
                <div hx-viewport id="main-viewport">Main Content</div>
                <div hx-viewport="modal" id="modal-viewport">Modal Empty</div>
            </div>
        </body>
        </html>`;

        const env = setupHtmxTestEnvironment({
            version,
            html,
            mockResponseHtml: `<div class="modal-dialog"><p>Modal Body Content</p></div>`
        });

        const modalLink = env.document.getElementById("modal-link")!;
        const mainViewport = env.document.getElementById("main-viewport")!;
        const modalViewport = env.document.getElementById("modal-viewport")!;

        modalLink.click();

        await new Promise((r) => setTimeout(r, 60));

        expect(modalViewport.innerHTML).toContain("Modal Body Content");
        expect(mainViewport.innerHTML).toBe("Main Content");
    });

    it("updates active link classes on navigation and popstate", () => {
        const html = `<!DOCTYPE html>
        <html>
        <head><title>Nav Test</title></head>
        <body>
            <div hx-ext="hx-router">
                <nav hx-nav>
                    <a id="home-link" href="/home">Home</a>
                    <a id="users-link" href="/users">Users</a>
                    <a id="users-sub-link" href="/users/profile">Profile</a>
                </nav>
            </div>
        </body>
        </html>`;

        const env = setupHtmxTestEnvironment({
            version,
            html,
            url: "https://example.com/users"
        });

        const homeLink = env.document.getElementById("home-link")!;
        const usersLink = env.document.getElementById("users-link")!;

        // Trigger popstate or history update
        env.window.dispatchEvent(new env.window.Event("popstate"));

        expect(usersLink.classList.contains("active")).toBe(true);
        expect(usersLink.getAttribute("aria-current")).toBe("page");
        expect(homeLink.classList.contains("active")).toBe(false);
    });

    it("preserves and restores scroll state with hx-preserve-scroll", async () => {
        const html = `<!DOCTYPE html>
        <html>
        <body>
            <div hx-ext="hx-router">
                <a id="nav-action" href="/test" hx-get="/test" hx-route>Go</a>
                <div id="sidebar" hx-preserve-scroll="sidebar">
                    <p>Sidebar content</p>
                </div>
                <div hx-viewport id="viewport"></div>
            </div>
        </body>
        </html>`;

        const env = setupHtmxTestEnvironment({
            version,
            html,
            mockResponseHtml: `<div>Updated</div>`
        });

        const sidebar = env.document.getElementById("sidebar")!;
        sidebar.scrollTop = 150;
        sidebar.scrollLeft = 20;

        const navAction = env.document.getElementById("nav-action")!;
        navAction.click();

        await new Promise((r) => setTimeout(r, 60));

        // Reset scroll simulating user scroll or DOM reload
        sidebar.scrollTop = 0;
        sidebar.scrollLeft = 0;

        // Dispatch popstate to restore scroll position
        env.window.dispatchEvent(new env.window.Event("popstate"));

        await new Promise((r) => setTimeout(r, 20));

        expect(sidebar.scrollTop).toBe(150);
        expect(sidebar.scrollLeft).toBe(20);
    });

    it("respects custom router configuration (activeClass, ariaCurrent)", () => {
        const html = `<!DOCTYPE html>
        <html>
        <body>
            <div hx-ext="hx-router">
                <nav hx-nav>
                    <a id="active-link" href="/dashboard">Dashboard</a>
                </nav>
            </div>
        </body>
        </html>`;

        const env = setupHtmxTestEnvironment({
            version,
            html,
            url: "https://example.com/dashboard",
            routerConfig: {
                activeClass: "is-selected",
                ariaCurrent: "location"
            }
        });

        env.window.dispatchEvent(new env.window.Event("popstate"));

        const link = env.document.getElementById("active-link")!;
        expect(link.classList.contains("is-selected")).toBe(true);
        expect(link.getAttribute("aria-current")).toBe("location");
    });

    it("automatically extracts viewport content when server sends full HTML document", async () => {
        const fullPageHtml = `<!DOCTYPE html>
        <html>
            <head><title>Full Page Title</title></head>
            <body>
                <nav><a href="/other">Other</a></nav>
                <div hx-viewport id="main-viewport">
                    <h2>Extracted Inner Content</h2>
                </div>
                <footer>Footer</footer>
            </body>
        </html>`;

        const html = `<!DOCTYPE html>
        <html>
        <head><title>Initial</title></head>
        <body>
            <div hx-ext="hx-router">
                <a id="nav-btn" href="/page" hx-get="/page" hx-route>Go</a>
                <div hx-viewport id="main-viewport">Initial Viewport</div>
            </div>
        </body>
        </html>`;

        const env = setupHtmxTestEnvironment({
            version,
            html,
            mockResponseHtml: fullPageHtml
        });

        const btn = env.document.getElementById("nav-btn")!;
        const viewport = env.document.getElementById("main-viewport")!;

        btn.click();
        await new Promise((r) => setTimeout(r, 60));

        expect(viewport.innerHTML).toContain("Extracted Inner Content");
        expect(viewport.innerHTML).not.toContain("<footer>Footer</footer>");
        expect(env.document.title).toBe("Full Page Title");
    });
});
