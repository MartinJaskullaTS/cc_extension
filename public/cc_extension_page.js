window.dispatchEvent(new CustomEvent('CC_EXTENSION_PAGE_INITIAL_PLUGIN_STATE_ASK'));
window.addEventListener('CC_EXTENSION_CONTENT_PLUGIN_STATE_UPDATE', (event) => {
    window.__cc_extension_plugin_state = event.detail;
});

// Intercept and read plugins manifest
// Example: ../docs/app-api.etrusted.site_v0_plugins_b2b.json
const pluginManifestUrls = ['https://app-api.etrusted.com/v0/plugins/b2b', 'https://app-api.etrusted.site/v0/plugins/b2b', 'https://app-api.etrusted.koeln/v0/plugins/b2b']
const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open = function (...args) {
    this._url = args[1];
    originalOpen.apply(this, args);
};
XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', () => {
        if (this.readyState === 4 && this._url && pluginManifestUrls.includes(this._url)) {
            try {
                const data = JSON.parse(this.responseText);
                window.dispatchEvent(new CustomEvent('CC_EXTENSION_PAGE_PLUGINS', {detail: data}));
            } catch (e) {
            }
        }
    });
    originalSend.apply(this, args);
};
