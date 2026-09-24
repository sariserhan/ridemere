/*
 * Project Sunrise standalone launcher.
 *
 * Differs from the upstream OpenRCT2 browser launcher in one way that matters: it
 * never looks for, prompts for, or imports RollerCoaster Tycoon 2 data. The engine
 * runs in standalone content mode (src/openrct2/standalone/StandaloneContent.h),
 * which supplies the base sprite archive and scenarios from the bundled pack.
 *
 * Derived from OpenRCT2's emscripten/static/index.js (GPL-3.0).
 */
(async () => {
    await new Promise((resolve) => {
        if (document.readyState !== "loading") resolve();
        else window.addEventListener("DOMContentLoaded", resolve);
    });

    const boot = document.getElementById("boot");
    const statusEl = document.getElementById("status");
    const barEl = document.querySelector("#bar > div");

    const setStatus = (text) => { statusEl.textContent = text; };
    const setProgress = (fraction) => { barEl.style.width = `${Math.round(fraction * 100)}%`; };
    const fail = (title, detail) => {
        document.body.classList.add("failed");
        statusEl.textContent = detail ? `${title} ${detail}` : title;
        console.error(title, detail || "");
    };

    if (!window.WebAssembly) {
        fail("This browser cannot run Project Sunrise.", "WebAssembly support is required.");
        return;
    }
    if (!window.SharedArrayBuffer) {
        fail(
            "This page was served without cross-origin isolation.",
            "The game needs the Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers.",
        );
        return;
    }

    async function fetchWithProgress(url, label, from, to) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
        const total = Number(response.headers.get("content-length")) || 0;
        if (!response.body || !total) {
            setStatus(label);
            return new Uint8Array(await response.arrayBuffer());
        }
        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            setStatus(`${label} ${(received / 1e6).toFixed(1)} MB`);
            setProgress(from + (to - from) * (received / total));
        }
        const out = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
        return out;
    }

    let moduleSources = null;
    try {
        setStatus("Downloading engine…");
        const data = await fetchWithProgress("openrct2.zip", "Downloading engine", 0, 0.25);
        const zip = await new JSZip().loadAsync(data);
        moduleSources = {
            js: URL.createObjectURL(new Blob([await zip.file("openrct2.js").async("uint8array")],
                { type: "text/javascript" })),
            wasm: URL.createObjectURL(new Blob([await zip.file("openrct2.wasm").async("uint8array")],
                { type: "application/wasm" })),
        };
    } catch (error) {
        console.warn("Falling back to uncompressed engine files.", error);
        moduleSources = null;
    }

    setStatus("Starting engine…");
    await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = moduleSources === null ? "openrct2.js" : moduleSources.js;
        script.addEventListener("load", resolve);
        script.addEventListener("error", () => reject(new Error("could not load openrct2.js")));
        document.body.appendChild(script);
    }).catch((error) => fail("The engine failed to load.", error.message));

    const canvas = document.getElementById("canvas");
    window.Module = await window.OPENRCT2_WEB({
        noInitialRun: true,
        arguments: [],
        canvas,
        print: (text) => console.log(text),
        printErr: (text) => console.log(text),
        monitorRunDependencies: () => {},
        locateFile: (name) =>
            (moduleSources !== null && name === "openrct2.wasm") ? moduleSources.wasm : name,
    });
    setProgress(0.3);

    // Persistent browser storage: configuration, saves and screenshots survive a
    // reload; the bundled content is re-extracted whenever the build changes.
    for (const dir of ["/persistent", "/OpenRCT2"]) {
        Module.FS.mkdir(dir);
        Module.FS.mount(Module.FS.filesystems.IDBFS, { autoPersist: true }, dir);
    }
    await new Promise((resolve) => Module.FS.syncfs(true, resolve));

    const readVersionFile = () => {
        try { return Module.FS.readFile("/OpenRCT2/version", { encoding: "utf8" }); }
        catch { return ""; }
    };
    const buildVersion = (() => {
        try { return Module.ccall("GetVersion", "string"); } catch { return "unknown"; }
    })();

    if (readVersionFile() !== buildVersion || buildVersion.includes("DEBUG")) {
        setStatus("Downloading game content…");
        const clearTree = (dir) => {
            let entries = [];
            try { entries = Module.FS.readdir(dir); } catch { return; }
            for (const entry of entries) {
                if (entry === "." || entry === "..") continue;
                const path = `${dir}${entry}`;
                try { Module.FS.readFile(path); Module.FS.unlink(path); }
                catch { clearTree(`${path}/`); try { Module.FS.rmdir(path); } catch {} }
            }
        };
        await new Promise((resolve) => Module.FS.syncfs(false, resolve));
        clearTree("/OpenRCT2/");

        try {
            const data = await fetchWithProgress("assets.zip", "Downloading game content", 0.3, 0.9);
            const zip = await new JSZip().loadAsync(data);
            setStatus("Installing game content…");
            const names = Object.keys(zip.files);
            let done = 0;
            for (const name of names) {
                const entry = zip.files[name];
                const target = `/OpenRCT2/${name}`;
                if (entry.dir) {
                    try { Module.FS.mkdir(target.replace(/\/$/, "")); } catch {}
                } else {
                    const parts = target.split("/");
                    parts.pop();
                    let built = "";
                    for (const part of parts) {
                        if (!part) continue;
                        built += `/${part}`;
                        try { Module.FS.mkdir(built); } catch {}
                    }
                    Module.FS.writeFile(target, await entry.async("uint8array"));
                }
                if (++done % 64 === 0) setProgress(0.9 + 0.08 * (done / names.length));
            }
            Module.FS.writeFile("/OpenRCT2/version", buildVersion);
            await new Promise((resolve) => Module.FS.syncfs(false, resolve));
        } catch (error) {
            fail("The game content could not be installed.", error.message);
            return;
        }
    }

    // Install the content pack's window theme into the player's theme directory.
    // Themes are read from the user directory, not from the content, so whoever starts
    // the engine has to put it there. A theme the player has edited is left alone.
    try {
        try { Module.FS.mkdir("/persistent/themes"); } catch {}
        let present = false;
        try { Module.FS.stat("/persistent/themes/Ridemere.json"); present = true; } catch {}
        if (!present) {
            Module.FS.writeFile("/persistent/themes/Ridemere.json",
                Module.FS.readFile("/OpenRCT2/themes/Ridemere.json"));
        }
    } catch (error) {
        console.warn("could not install the window theme", error);
    }

    setProgress(1);
    setStatus("Entering the park…");
    boot.remove();
    canvas.style.display = "";
    canvas.focus();
    // A park may be named in the query string, which opens it directly instead of
    // the title scene. Used by the automated tests and for deep links.
    // The engine requires any positional path before the options.
    const requested = new URLSearchParams(location.search).get("park");
    const args = [];
    if (requested) {
        // A bare name is a release scenario. Development scenes are shipped in their
        // own directory so they cannot reach the player-facing list, and a harness
        // names one by including that directory: "DevScenarios/needs-test.park".
        const absolute = requested.startsWith("/")
            ? requested
            : `/OpenRCT2/standalone/${requested.includes("/") ? requested : `Scenarios/${requested}`}`;
        args.push(absolute);
    }
    args.push("--user-data-path=/persistent/", "--openrct2-data-path=/OpenRCT2/");
    Module.callMain(args);
})();
