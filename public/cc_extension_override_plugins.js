(function () {
    const originalUrl = document.currentScript?.src
    const basePath = new URL(originalUrl).pathname.split('/').slice(2, 4).join('/')

    function loadRealPlugin() {
        const passthroughUrl = new URL(originalUrl);
        passthroughUrl.searchParams.set('x-ext-passthrough', 'true');
        const originalScript = document.createElement('script');
        originalScript.src = passthroughUrl.toString();
        document.head.appendChild(originalScript);
    }

    function applyOverride(pluginState) {
        const plugin = pluginState[basePath]

        if (!plugin?.on) {
            loadRealPlugin();
            return
        }

        const {path, port} = plugin

        // No local dev server on that port (e.g. `npm start` isn't running) — behave
        // as if the extension weren't installed instead of leaving the page broken.
        fetch(`http://localhost:${port}/@vite/client`).then(() => {
            const reactRefreshScript = document.createElement("script");
            reactRefreshScript.type = "module";
            reactRefreshScript.innerHTML = `
        import RefreshRuntime from 'http://localhost:${port}/@react-refresh'
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
    `;
            document.body.append(reactRefreshScript);

            return Promise.all([
                import(`http://localhost:${port}/@vite/client`),
                import(`http://localhost:${port}/${path}`),
            ]);
        }).catch(() => {
            loadRealPlugin();
        });
    }

    if (window.__cc_extension_plugin_state) {
        applyOverride(window.__cc_extension_plugin_state);
        return;
    }

    const TIMEOUT_MS = 5000;
    const timeoutId = setTimeout(() => {
        window.removeEventListener('CC_EXTENSION_CONTENT_PLUGIN_STATE_UPDATE', onState);
        throw new Error(`[CC Extension] Timed out after ${TIMEOUT_MS}ms waiting for plugin state while loading "${basePath}". The background script may not be responding — try reloading the page or reloading the extension.`);
    }, TIMEOUT_MS);

    function onState(event) {
        clearTimeout(timeoutId);
        window.removeEventListener('CC_EXTENSION_CONTENT_PLUGIN_STATE_UPDATE', onState);
        applyOverride(event.detail);
    }

    window.addEventListener('CC_EXTENSION_CONTENT_PLUGIN_STATE_UPDATE', onState);
})();
