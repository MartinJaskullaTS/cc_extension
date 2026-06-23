import {CSSProperties, FC, StrictMode, useState} from "react";
import {createRoot} from "react-dom/client";
import {PluginState} from "@/src/types.ts";

const root = document.getElementById('root')
const port = chrome.runtime.connect({name: 'devtools-panel-connection'});

createRoot(root!).render(
    <StrictMode>
        <App port={port}/>
    </StrictMode>,
);

port.onDisconnect.addListener(() => {
    if (root) {
        root.textContent = 'Connection to background script lost. Please reopen DevTools.';
    }
    console.error('Disconnected from the background script.');
});

function getTld(cb: (tld: string) => void) {
    chrome.devtools.inspectedWindow.eval(
        "window.location.hostname",
        function (hostname, isException) {
            if (isException) {
                console.error("Could not evaluate hostname:", isException);
                return;
            }
            cb((hostname as string).split('.').pop() as string);
        }
    );
}

// Local dev port + entry path for every plugin served by
// etrusted-review-insights-dashboard-frontend (see its package.json "start" script).
const OUR_PLUGINS: Record<string, { port: string, path: string }> = {
    'etrusted-insights-dashboard-start': {port: '5172', path: 'src/start-plugin/index.ts'},
    'etrusted-invite-conversion-dashboard-ui': {port: '5173', path: 'src/ui-plugin/plugin-configuration/invite-conversion/index.plugin.tsx'},
    'etrusted-review-insights-dashboard-ui': {port: '5174', path: 'src/ui-plugin/plugin-configuration/review-insights/index.plugin.tsx'},
    'etrusted-sentiment-analysis-dashboard-ui': {port: '5175', path: 'src/ui-plugin/plugin-configuration/sentiment-analysis/index.plugin.tsx'},
    'etrusted-sentiment-analysis-details-dashboard-ui': {port: '5176', path: 'src/ui-plugin/plugin-configuration/sentiment-analysis-details/index.plugin.tsx'},
    'etrusted-competitor-dashboard-ui': {port: '5177', path: 'src/ui-plugin/plugin-configuration/competitor/index.plugin.tsx'},
    'etrusted-smart-insights-dashboard-ui': {port: '5178', path: 'src/ui-plugin/plugin-configuration/smart-insights/index.plugin.tsx'},
}

function App (props: {port: Browser.runtime.Port}) {
    const [search, setSearch] = useState('')
    const [pluginState, setPluginState] = useState<PluginState>({})
    const plugins = Object.values(pluginState).filter(plugin => plugin.name.includes(search))

    const ourPlugins = Object.values(pluginState).filter(plugin => OUR_PLUGINS[plugin.name])
    const allOverridden = ourPlugins.length > 0 && ourPlugins.every(plugin => plugin.on)

    function pushPluginState(newPluginState: PluginState) {
        setPluginState(newPluginState)
        getTld(tld => {
            port.postMessage({
                type: 'CC_EXTENSION_DEVTOOLS_PLUGIN_STATE_UPDATE',
                tabId: chrome.devtools.inspectedWindow.tabId,
                pluginState: newPluginState,
                tld,
            });
        })
    }

    function overrideAll(on: boolean) {
        const newPluginState: PluginState = {...pluginState}
        for (const basePath of Object.keys(newPluginState)) {
            const plugin = newPluginState[basePath]!
            const override = OUR_PLUGINS[plugin.name]
            if (!override) continue
            newPluginState[basePath] = on
                ? {...plugin, on: true, port: override.port, path: override.path}
                : {...plugin, on: false}
        }
        pushPluginState(newPluginState)
    }

    useEffect(() => {
        port.onMessage.addListener((message) => {
            if (message.type === 'CC_EXTENSION_BACKGROUND_PLUGIN_STATE' && root) {
                if (message.data) {
                    setPluginState(message.data);
                }
            }
        });
        getTld(tld => {
            // background will send CC_EXTENSION_BACKGROUND_PLUGIN_STATE after it knows the tld.
            console.log('send init')
            port.postMessage({
                type: 'CC_EXTENSION_DEVTOOLS_INIT',
                tld,
                tabId: chrome.devtools.inspectedWindow.tabId
            });
        });
    }, [])


    const style: CSSProperties = {
        border: '1px solid #dddddd',
        textAlign: 'left',
        padding: '8px'
    }
    return (
        <>
            <label style={{display: 'block', marginBottom: '8px'}}>
                <input
                    type="checkbox"
                    checked={allOverridden}
                    onChange={e => overrideAll(e.target.checked)}
                />
                {' '}Override all Insights plugins (etrusted-review-insights-dashboard-frontend)
            </label>
            <input type={'text'} placeholder={'Search plugins'} onChange={e => {
                setSearch(e.target.value)
            }}/>
            <table style={{borderCollapse: 'collapse', marginTop: '5px'}}>
                <thead>
                <tr>
                    <th style={style}></th>
                    <th style={style}>Plugin</th>
                    <th style={style}>Port</th>
                    <th style={style}>Path</th>
                </tr>
                </thead>
                <tbody>

                {plugins.map(plugin => {
                    return (
                        <tr
                            key={plugin.basePath}
                            style={{
                                border: '1px solid #dddddd',
                                textAlign: 'left',
                                padding: '8px'
                            }}>
                            <td style={style}>
                                <input type="checkbox" checked={pluginState[plugin.basePath]!.on} onChange={e => {
                                    const newPluginState = {
                                        ...pluginState,
                                        [plugin.basePath]: {
                                            ...pluginState[plugin.basePath]!,
                                            on: e.target.checked
                                        }
                                    } satisfies PluginState
                                    setPluginState(newPluginState)
                                    getTld(
                                        tld => {
                                            port.postMessage({
                                                type: 'CC_EXTENSION_DEVTOOLS_PLUGIN_STATE_UPDATE',
                                                tabId: chrome.devtools.inspectedWindow.tabId,
                                                pluginState: newPluginState,
                                                tld,
                                            });
                                        }
                                    )
                                }}/>
                            </td>
                            <td style={style}>
                                <span>{plugin.name}</span>
                            </td>
                            <td style={style}>
                                <input type="text" value={pluginState[plugin.basePath]!.port} onChange={e => {
                                    const newPluginState = {
                                        ...pluginState, [plugin.basePath]: {
                                            ...pluginState[plugin.basePath]!,
                                            port: e.target.value
                                        }
                                    } satisfies PluginState
                                    setPluginState(newPluginState)
                                    getTld(
                                        tld => {
                                            port.postMessage({
                                                type: 'CC_EXTENSION_DEVTOOLS_PLUGIN_STATE_UPDATE',
                                                tabId: chrome.devtools.inspectedWindow.tabId,
                                                pluginState: newPluginState,
                                                tld,
                                            });
                                        }
                                    )

                                }}/>
                            </td>
                            <td style={style}>
                                <input type="text" value={pluginState[plugin.basePath]!.path} onChange={e => {
                                    let path = e.target.value
                                    if (path.startsWith("/")) {
                                        path = path.slice(1);
                                    }
                                    const newPluginState = {
                                        ...pluginState, [plugin.basePath]: {
                                            ...pluginState[plugin.basePath]!,
                                            path
                                        }
                                    } satisfies PluginState
                                    setPluginState(newPluginState)
                                    getTld(
                                        tld => {
                                            port.postMessage({
                                                type: 'CC_EXTENSION_DEVTOOLS_PLUGIN_STATE_UPDATE',
                                                tabId: chrome.devtools.inspectedWindow.tabId,
                                                pluginState: newPluginState,
                                                tld,
                                            });
                                        }
                                    )
                                }}/>
                            </td>
                        </tr>
                    )
                })}
                </tbody>
            </table>
        </>
    )
}
