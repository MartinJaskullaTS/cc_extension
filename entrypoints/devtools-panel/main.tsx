import {CSSProperties, FC, StrictMode, useState} from "react";
import {createRoot} from "react-dom/client";
import {PluginState} from "@/src/types.ts";
import {OUR_PLUGINS} from "@/src/ourPlugins.ts";

const root = document.getElementById('root')
const port = chrome.runtime.connect({name: 'devtools-panel-connection'});

createRoot(root!).render(
    <StrictMode>
        <App port={port}/>
    </StrictMode>,
);

// Sends a message to the background service worker, tolerating it having been
// unloaded (MV3 kills idle service workers, which disconnects this port even
// while the panel stays open). Without this guard, postMessage on a dead port
// throws synchronously and crashes whatever handler called it.
function safePostMessage(port: Browser.runtime.Port, message: unknown, onDisconnected: () => void) {
    try {
        port.postMessage(message);
    } catch (error) {
        console.error('Could not reach background script. It may have been unloaded — reopen DevTools.', error);
        onDisconnected();
    }
}

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

function App (props: {port: Browser.runtime.Port}) {
    const [search, setSearch] = useState('')
    const [pluginState, setPluginState] = useState<PluginState>({})
    const [disconnected, setDisconnected] = useState(false)
    const plugins = Object.values(pluginState).filter(plugin => plugin.name.includes(search))

    const ourPlugins = Object.values(pluginState).filter(plugin => OUR_PLUGINS[plugin.name])
    const allOverridden = ourPlugins.length > 0 && ourPlugins.every(plugin => plugin.on)

    function pushPluginState(newPluginState: PluginState) {
        setPluginState(newPluginState)
        getTld(tld => {
            safePostMessage(port, {
                type: 'CC_EXTENSION_DEVTOOLS_PLUGIN_STATE_UPDATE',
                tabId: chrome.devtools.inspectedWindow.tabId,
                pluginState: newPluginState,
                tld,
            }, () => setDisconnected(true));
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
        function handleMessage(message: any) {
            if (message.type === 'CC_EXTENSION_BACKGROUND_PLUGIN_STATE') {
                if (message.data) {
                    setPluginState(message.data);
                }
            }
        }

        function handleDisconnect() {
            console.error('Disconnected from the background script.');
            setDisconnected(true);
        }

        port.onMessage.addListener(handleMessage);
        port.onDisconnect.addListener(handleDisconnect);
        getTld(tld => {
            // background will send CC_EXTENSION_BACKGROUND_PLUGIN_STATE after it knows the tld.
            safePostMessage(port, {
                type: 'CC_EXTENSION_DEVTOOLS_INIT',
                tld,
                tabId: chrome.devtools.inspectedWindow.tabId
            }, () => setDisconnected(true));
        });

        return () => {
            port.onMessage.removeListener(handleMessage);
            port.onDisconnect.removeListener(handleDisconnect);
        }
    }, [])

    if (disconnected) {
        return <p>Connection to background script lost. Please reopen DevTools.</p>
    }

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
                                    pushPluginState({
                                        ...pluginState,
                                        [plugin.basePath]: {
                                            ...pluginState[plugin.basePath]!,
                                            on: e.target.checked
                                        }
                                    } satisfies PluginState)
                                }}/>
                            </td>
                            <td style={style}>
                                <span>{plugin.name}</span>
                            </td>
                            <td style={style}>
                                <input type="text" value={pluginState[plugin.basePath]!.port} onChange={e => {
                                    pushPluginState({
                                        ...pluginState, [plugin.basePath]: {
                                            ...pluginState[plugin.basePath]!,
                                            port: e.target.value
                                        }
                                    } satisfies PluginState)
                                }}/>
                            </td>
                            <td style={style}>
                                <input type="text" value={pluginState[plugin.basePath]!.path} onChange={e => {
                                    let path = e.target.value
                                    if (path.startsWith("/")) {
                                        path = path.slice(1);
                                    }
                                    pushPluginState({
                                        ...pluginState, [plugin.basePath]: {
                                            ...pluginState[plugin.basePath]!,
                                            path
                                        }
                                    } satisfies PluginState)
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
