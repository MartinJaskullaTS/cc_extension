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

// Full hostname, e.g. "app.etrusted.site". Deliberately not the TLD: employees.trustedshops.com,
// employees-qa.trustedshops.com, employees-integr.trustedshops.com and app.etrusted.com all share
// the TLD "com" and would otherwise collide in one plugin-state bucket.
export type Host = string
type BasePath = string
export type PluginState = Record<BasePath, { on: boolean, port: string, path: string, basePath: string, name: string }>