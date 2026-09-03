// Local dev port + entry path for every plugin served by
// etrusted-review-insights-dashboard-frontend (see its package.json "start" script).
export const OUR_PLUGINS: Record<string, { port: string, path: string }> = {
    'etrusted-insights-dashboard-start': {port: '5172', path: 'src/start-plugin/index.ts'},
    'etrusted-invite-conversion-dashboard-ui': {port: '5173', path: 'src/ui-plugin/plugin-configuration/invite-conversion/index.plugin.tsx'},
    'etrusted-review-insights-dashboard-ui': {port: '5174', path: 'src/ui-plugin/plugin-configuration/review-insights/index.plugin.tsx'},
    'etrusted-sentiment-analysis-dashboard-ui': {port: '5175', path: 'src/ui-plugin/plugin-configuration/sentiment-analysis/index.plugin.tsx'},
    'etrusted-sentiment-analysis-details-dashboard-ui': {port: '5176', path: 'src/ui-plugin/plugin-configuration/sentiment-analysis-details/index.plugin.tsx'},
    'etrusted-competitor-dashboard-ui': {port: '5177', path: 'src/ui-plugin/plugin-configuration/competitor/index.plugin.tsx'},
    'etrusted-smart-insights-dashboard-ui': {port: '5178', path: 'src/ui-plugin/plugin-configuration/smart-insights/index.plugin.tsx'},
}
