import {defineConfig} from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ['@wxt-dev/module-react'],
    manifest: {
        permissions: [
            'declarativeNetRequest',
            'storage'
        ],
        host_permissions: [
            '<all_urls>',
        ],
        web_accessible_resources: [
            {
                resources: ['/cc_extension_override_plugins.js', '/cc_extension_page.js'],
                matches: ['<all_urls>'],
            },
        ],
    },
});
