export default defineContentScript({
    matches: [
        "*://app.etrusted.com/*",
    ],
    runAt: 'document_start',
    main() {
        injectPageScript();
    },
});

const getTld = () => location.hostname.split('.').pop()

function injectPageScript() {
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('/cc_extension_page.js');
    (document.head || document.documentElement).appendChild(script);

    window.addEventListener('CC_EXTENSION_PAGE_INITIAL_PLUGIN_STATE_ASK', () => {
        sendToBackground('CC_EXTENSION_CONTENT_INITIAL_PLUGIN_STATE_ASK', {tld: getTld()}, pluginState => {
            sendToPage('CC_EXTENSION_CONTENT_PLUGIN_STATE_UPDATE', pluginState)
        })
    });

    browser.runtime.onMessage.addListener((message) => {
        if (message.type === 'CC_EXTENSION_BACKGROUND_PLUGIN_STATE_UPDATE') {
            sendToPage('CC_EXTENSION_CONTENT_PLUGIN_STATE_UPDATE', message.data)
        }
    })

    // @ts-expect-error
    window.addEventListener('CC_EXTENSION_PAGE_PLUGINS', (event: CustomEvent) => {
        sendToBackground('CC_EXTENSION_CONTENT_PLUGINS', {tld: getTld(), plugins: event.detail})
    });
}

function sendToBackground(type: string, data: any, cb?: (...args: any[]) => void) {
    if (cb) {
        browser.runtime.sendMessage({
            type,
            data
        }, cb);
    } else {
        browser.runtime.sendMessage({
            type,
            data
        })
    }
}

function sendToPage(type: string, data: any) {
    window.dispatchEvent(new CustomEvent(type, {detail: data}));
}