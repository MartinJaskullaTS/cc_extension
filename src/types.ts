export type Plugins = Array<{
    basePath: string
    active: boolean
    autostart: boolean
    dependencies: Array<string>
    name: string
    resources: Array<{
        options: {
            nomodule?: boolean
        }
        type: string
        key: string
    }>
    autostartUnverifiedAccount?: boolean
}>

export type Tld = string
type BasePath = string
export type PluginState = Record<BasePath, { on: boolean, port: string, path: string, basePath: string, name: string }>