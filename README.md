# Control Center Dev Tools

This extension allows you to develop on prod, qa and integr (app.etrusted.com etc.) just like on localhost.

This works by intercepting your plugin bundle and replacing it with your locally served plugin.

# Start locally

```
npm run dev
```

# How to use

- Open dev tools
- Go to new "Control Center" tab
- Search for the plugin you want to replace
- Set the localhost port your local plugin is running at e.g. `5173`
- Set the path to your plugin entry point e.g. `src/ui-plugin/plugin-configuration/review-insights/index.plugin.tsx`

# Troubleshoot
Make sure your local plugin is reachable by opening e.g. `http://localhost:5173/src/ui-plugin/plugin-configuration/review-insights/index.plugin.tsx` in your browser.

# How overriding plugins works without this extension:
- You need to start Google Chrome with CORS checks disabled
```
open -n -a /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --args --user-data-dir="/tmp/chrome_dev_test" --disable-web-security
```
- In the network tab and search for "app-api.etrusted", look for a plugin in the response e.g. "etrusted-review-insights-dashboard-ui" and copy "key": "assets/main-l2izams8.js"
- In the network tab search for the assets/main-l2izams8.js request. Right-click and override its contents with the localhost code (`import RefreshRuntime from 'http://localhost` etc.)

# How to debug the service worker (background.ts)
Debug background.ts (service worker):
- chrome://extensions/
- Click on the "Inspect views" link
