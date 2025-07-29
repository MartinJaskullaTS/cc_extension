import {Plugins, PluginState, Tld} from "@/src/types.ts";

const STORAGE_KEY = 'cc_plugin_state-';

export default defineBackground(async () => {
    listenForDevToolsPanel();
    overwriteNetwork();
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'CC_EXTENSION_CONTENT_INITIAL_PLUGIN_STATE_ASK') {
            const tabId = sender.tab?.id
            if (!tabId) throw new Error('No tabId');
            tabIdTlds[tabId] = message.data.tld
            const tld = message.data.tld
            getPluginState(tld).then(pluginState => {
                sendResponse(pluginState)
            })
            return true
        } else if (message.type === 'CC_EXTENSION_CONTENT_PLUGINS') {
            const tld = message.data.tld

            getPluginState(tld).then(async currentPluginState => {
                const nextPluginState: PluginState = {}
                const networkPlugins: Plugins = message.data.plugins;

                for (const networkPlugin of networkPlugins) {
                    if (networkPlugin.basePath in currentPluginState) {
                        nextPluginState[networkPlugin.basePath] = currentPluginState[networkPlugin.basePath]!;
                    } else {
                        nextPluginState[networkPlugin.basePath] = {
                            basePath: networkPlugin.basePath,
                            on: false,
                            port: '',
                            path: '',
                            name: networkPlugin.name
                        };
                    }
                }

                await setPluginState(nextPluginState, tld);

                const tabIdsWithSameTld = Object.entries(tabIdTlds).filter(([_, t]) => t === tld).map(([tabId]) => Number(tabId))

                tabIdsWithSameTld.forEach((tabId) => {
                    browser.tabs.sendMessage(tabId, {
                        type: 'CC_EXTENSION_BACKGROUND_PLUGIN_STATE_UPDATE',
                        data: nextPluginState
                    });
                })

                const devtoolPorts = tabIdsWithSameTld
                    .map(tabId => tabIdDevtoolPorts[tabId]!)
                    // Might not be open
                    .filter(Boolean);
                devtoolPorts.forEach(p => {
                    p.postMessage({
                        type: 'CC_EXTENSION_BACKGROUND_PLUGIN_STATE',
                        data: nextPluginState
                    });
                })
            });
            return true
        }
    })
});

async function getPluginState(tld: Tld): Promise<PluginState> {
    const key = STORAGE_KEY + tld
    const result = await browser.storage.local.get(key);
    return result[key] || {};
}

async function setPluginState(newState: PluginState, tld: Tld) {
    return browser.storage.local.set({[STORAGE_KEY + tld]: newState});
}

const tabIdTlds: Record<string, Tld> = {}
const tabIdDevtoolPorts: Record<string, Browser.runtime.Port> = {};

async function listenForDevToolsPanel() {
    browser.runtime.onConnect.addListener(async (port) => {
        if (port.name !== 'devtools-panel-connection') return

        async function handleDevToolsMessage(message: any) {
            if (message.type === 'CC_EXTENSION_DEVTOOLS_INIT') {
                tabIdDevtoolPorts[message.tabId] = port
                port.onDisconnect.addListener(() => {
                    if (port) {
                        port.onMessage.removeListener(handleDevToolsMessage);
                        delete tabIdDevtoolPorts[message.tabId];
                    }
                })

                const tld = message.tld
                const pluginState = await getPluginState(tld);
                port.postMessage({
                    type: 'CC_EXTENSION_BACKGROUND_PLUGIN_STATE',
                    data: pluginState,
                });
                return
            }
            if (message.type === 'CC_EXTENSION_DEVTOOLS_PLUGIN_STATE_UPDATE') {
                const tld = message.tld
                await setPluginState(message.pluginState, tld);
                try {
                    // TODO Duplicate code
                    const tabIdsWithSameTld = Object.entries(tabIdTlds).filter(([_, t]) => t === tld).map(([tabId]) => Number(tabId))

                    tabIdsWithSameTld.forEach((tabId) => {
                        browser.tabs.sendMessage(tabId, {
                            type: 'CC_EXTENSION_BACKGROUND_PLUGIN_STATE_UPDATE',
                            data: message.pluginState
                        });
                    })

                    const devtoolPorts = tabIdsWithSameTld
                        .map(tabId => tabIdDevtoolPorts[tabId]!)
                        // Might not be open
                        .filter(Boolean);
                    devtoolPorts.forEach(p => {
                        p.postMessage({
                            type: 'CC_EXTENSION_BACKGROUND_PLUGIN_STATE',
                            data: message.pluginState
                        });
                    })
                } catch (error) {
                    console.log(`Could not send message to tab ${message.tabId}. It may have been closed.`, error);
                }
                return
            }
        }

        port.onMessage.addListener(handleDevToolsMessage);
    });
}

function overwriteNetwork() {
    const rules: Browser.declarativeNetRequest.Rule[] = [
        {
            id: 1,
            priority: 1,
            action: {
                type: 'modifyHeaders',
                responseHeaders: [
                    {
                        header: 'Access-Control-Allow-Origin',
                        operation: 'set',
                        value: '*',
                    },
                    {
                        header: 'Access-Control-Allow-Methods',
                        operation: 'set',
                        value: 'GET, POST, PUT, DELETE, HEAD, OPTIONS',
                    },
                    {
                        header: 'Access-Control-Allow-Headers',
                        operation: 'set',
                        value: 'Content-Type, Authorization, X-Requested-With',
                    },
                ],
            },
            condition: {
                requestDomains: ['localhost'],
                resourceTypes: [
                    'xmlhttprequest',
                    'script'
                ],
            },
        },
        {
            id: 2,
            priority: 1,
            action: {
                type: 'redirect',
                redirect: {
                    extensionPath: '/cc_extension_override_plugins.js',
                },
            },
            condition: {
                // $ makes sure we let scripts with query parameter through.
                regexFilter: '^https:\\/\\/app\\.etrusted\\.(?:com|site|koeln)/plugins/.*\\.js$',
                resourceTypes: ['script'],
            },
        },
    ];

    // Remove existing rules and then add the new ones
    browser.declarativeNetRequest.getDynamicRules().then((existingRules) => {
        const ruleIdsToRemove = existingRules.map(rule => rule.id);
        browser.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: ruleIdsToRemove,
            addRules: rules,
        });
    });
}