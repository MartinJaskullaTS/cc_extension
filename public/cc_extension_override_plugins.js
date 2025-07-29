(function () {
    const originalUrl = document.currentScript?.src
    const basePath = new URL(originalUrl).pathname.split('/').slice(2, 4).join('/')

    const pluginState = __cc_extension_plugin_state
    const plugin = pluginState[Object.keys(pluginState).find(b => b === basePath)]

    if (!plugin?.on) {
        const passthroughUrl = new URL(originalUrl);
        passthroughUrl.searchParams.set('x-ext-passthrough', 'true');
        const originalScript = document.createElement('script');
        originalScript.src = passthroughUrl.toString();
        document.head.appendChild(originalScript);
        return
    }

    const {path, port} = plugin

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

    import(`http://localhost:${port}/@vite/client`);
    // import(`http://localhost:5174/src/ui-plugin/plugin-configuration/review-insights/index.plugin.tsx`);
    import(`http://localhost:${port}/${path}`);
})();
