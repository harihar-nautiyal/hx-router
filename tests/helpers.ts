import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { resolve } from "path";

export interface SetupEnvironmentOptions {
    version: string;
    html?: string;
    url?: string;
    routerConfig?: Record<string, any>;
    mockResponseHtml?: string;
}

export function setupHtmxTestEnvironment(options: SetupEnvironmentOptions) {
    const {
        version,
        html = `<!DOCTYPE html><html><head><title>Initial Title</title></head><body><div hx-ext="hx-router"></div></body></html>`,
        url = "https://example.com/app",
        routerConfig,
        mockResponseHtml = "<div><title>Updated Page</title><p>New Content</p></div>"
    } = options;

    const dom = new JSDOM(html, {
        runScripts: "dangerously",
        url
    });

    const win = dom.window as any;
    win.scrollTo = () => {};
    win.document.adoptedStyleSheets = [];
    win.CSSStyleSheet = class CSSStyleSheet {
        replaceSync() {}
    };

    const origEval = win.XPathExpression.prototype.evaluate;
    win.XPathExpression.prototype.evaluate = function(contextNode: any, type = 0, result = null) {
        return origEval.call(this, contextNode, type ?? 0, result);
    };

    // XMLHttpRequest mock for htmx 1.x / 2.x
    win.XMLHttpRequest = class MockXHR {
        status = 200;
        response = mockResponseHtml;
        responseText = mockResponseHtml;
        responseURL = url;
        readyState = 4;
        headers: Record<string, string> = {};
        upload = {
            addEventListener() {},
            removeEventListener() {}
        };
        listeners: Record<string, Function> = {};
        addEventListener(evt: string, fn: Function) {
            this.listeners[evt] = fn;
        }
        removeEventListener() {}
        open() {}
        setRequestHeader(k: string, v: string) {
            this.headers[k] = v;
        }
        overrideMimeType() {}
        getResponseHeader(h: string) {
            return this.headers[h.toLowerCase()] ?? "";
        }
        getAllResponseHeaders() {
            return Object.entries(this.headers).map(([k, v]) => `${k}: ${v}`).join("\r\n");
        }
        send() {
            setTimeout(() => {
                if (typeof (this as any).onload === "function") {
                    try {
                        (this as any).onload();
                    } catch (err) {
                        console.error("XHR onload error:", err);
                    }
                }
            }, 5);
        }
    };

    // fetch mock for htmx 4.x
    win.fetch = async (reqUrl: string) => {
        return new Response(mockResponseHtml, {
            status: 200,
            headers: { "Content-Type": "text/html" }
        });
    };

    const htmxFilePath = resolve(import.meta.dir, `fixtures/htmx-${version}.js`);
    const htmxCode = readFileSync(htmxFilePath, "utf-8");

    if (version.startsWith("1.")) {
        win.eval(htmxCode);
    } else {
        win.eval(`window.htmx = ${htmxCode.replace(/^var htmx=/, "")}`);
    }

    if (routerConfig && win.htmx) {
        win.htmx.config = win.htmx.config || {};
        win.htmx.config.router = routerConfig;
    }

    const routerCode = readFileSync(resolve(import.meta.dir, "../src/hx-router.js"), "utf-8");
    win.eval(routerCode);

    win.htmx.process(win.document.body);

    return {
        dom,
        window: win,
        document: win.document as Document,
        htmx: win.htmx
    };
}
