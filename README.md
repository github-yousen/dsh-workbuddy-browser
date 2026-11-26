# dsh-workbuddy-browser

WorkBuddy Browser Use as an MCP server for DeepSeek Harness.

`browser-mcp.exe` ships inside WorkBuddy and speaks MCP over stdio. It does not
drive a browser itself: it talks to the WorkBuddy browser extension over Native
Messaging and drives the tabs you already have open in your own Chrome or Edge,
with your real login state. This bundle inserts that server into a DSH profile so
its 32 tools appear to the agent as `mcp__workbuddy__*`.

## Requirements

1. WorkBuddy installed and running.
2. The WorkBuddy browser extension installed and enabled in the browser you want
   to drive — WorkBuddy → **Settings → Agent → Browser control** → press
   **Install** beside that browser.
3. At least one open tab in that browser.

Store pages, if the button opens one instead of installing directly:

| Browser | Address |
|---|---|
| Chrome | <https://chromewebstore.google.com/detail/workbuddy/ajnnogdfpilbhkeggdjlcokgglijmdde> |
| Edge | <https://microsoftedge.microsoft.com/addons/detail/workbuddy/ndbfelmlimfjklodckmbalfioaehegpc> |

## Install

```sh
dsh plugin --profile web add dsh-workbuddy-browser
```

Or install it from the DSH plugin market / Plugin Manager, which runs the same
command. Restart the session afterwards so the bundle's patch layer is composed.

Windows only: `dsh.bundle.platforms` is `["win32"]`, because the extension
reaches `browser-mcp.exe` through Windows Native Messaging registry keys. DSH
reports `unsupported-platform` instead of installing on other systems.

Installing from a local checkout also works — point `add` at the directory — and
is how this bundle was verified before publishing:

```sh
dsh plugin --profile web add /path/to/dsh-workbuddy-browser
```

## What a fresh install gives you

A stock MCP row would hand an agent 32 tools and no guidance. This bundle also
registers a `workbuddy-browser` skill, so the same knowledge that makes the
WorkBuddy app's browser control usable travels with the tools:

- which tool to reach for, and why `tabs_new` beats claiming an existing tab
- that `provider invocation timed out` is the exe's own 120-second deadline, not
  a DSH timeout — and that it is not retryable forever
- that `tabs_finalize` closes tabs even when marked `handoff`, so it must never
  be used to tidy up
- how to tell an empty DOM snapshot caused by a heavy SPA from a broken tool

The skill is registered only when the profile has a skill registry; without one
the browser tools still work.

## Configuration

`cordis.patch.yml` ships `command: auto` and
`env.BROWSER_NATIVE_HOST_NAME: auto`. At activation `workbuddy/index.js`
rewrites both from the current user profile, so the bundle is not pinned to one
account name or one WorkBuddy build:

- **`command`** — the first existing path among
  `%USERPROFILE%\.workbuddy\native-runtimes\browser-use\browser-use\bin\browser-mcp.exe`,
  then the plugin-cache copy under `%USERPROFILE%\.workbuddy\plugins\cache\`.
  An explicit absolute path is used as-is when it exists.
- **`env.BROWSER_NATIVE_HOST_NAME`** — the host manifest that actually exists in
  `%USERPROFILE%\.workbuddy\browser-runtime\native-host\`:
  `com.workbuddy.extension` (domestic build) or `com.workbuddy_ai.extension`
  (international build). An explicit name is used as-is.

Set either value to override detection. When nothing is found, activation fails
with a diagnostic that lists every path it tried and the click path to install
the extension, so the failure appears on the plugin row instead of as silently
missing tools.

## What activation does and does not catch

`failOnStartupError: true` rejects activation when `browser-mcp.exe` is missing
or the server cannot start. It does **not** catch a missing extension: a working
`browser-mcp.exe` with no extension attached starts normally and returns an empty
`browsers_list`. That case is described in the row description and in the detail
page rather than surfaced as an activation error.

## Timeouts

`toolCallTimeoutMs` is 150000, above the 120000 ms deadline `browser-mcp.exe`
applies to its own provider calls. At equal values the deadlines raced, so the
same stall could surface either as the exe's structured
`provider invocation timed out` (`code: "unavailable"`, `retryable: true`) or as
DSH's opaque `tool call timed out after 120000ms`.

## Known limitations

- **Both `tabs_finalize` and `tabs_close` close tabs.** `tabs_finalize` closes
  them even when marked `handoff` on some browsers. Never use it to tidy up. To
  keep a page, call neither; call `tabs_close` only on tabs the agent opened with
  `tabs_new`. A tab taken over with `tabs_claim` is the user's own and must never
  be passed to `tabs_finalize`.
- **`tab_id` values are process-local** and change as tabs open and close. Call
  `user_open_tabs` again rather than reusing an id.
- **Long-lived tabs can stall.** `tabs_claim`, `dom_cua_get_visible_dom`,
  `dom_cua_click` and `tab_screenshot` can hit the exe's 120-second deadline on
  heavy SPAs that have been open a long time. `browsers_list` and
  `user_open_tabs` still answer in milliseconds, which proves the extension is
  fine. Refresh the page or reopen the URL with `tabs_new`.
- **Heavily client-rendered pages** such as iWiki can return an empty visible-DOM
  snapshot; fall back to `tab_screenshot` with coordinate actions.
- **QQ Browser is advertised but unverified on Windows.** WorkBuddy's native
  host registration writes only the Chrome, Edge and Chromium registry keys on
  win32, so QQ Browser may not connect there even with the extension installed.

## Tools

32 tools under `mcp__workbuddy__*`: `browsers_list`, `browser_info`, tab
lifecycle (`tabs_list`, `tabs_selected`, `tabs_get`, `tabs_new`, `tabs_claim`,
`tabs_close`, `tabs_finalize`, `user_open_tabs`), navigation (`tab_url`,
`tab_title`, `tab_goto`, `tab_back`, `tab_forward`, `tab_reload`, `tab_focus`),
capture (`tab_screenshot`), coordinate actions (`cua_click`,
`cua_double_click`, `cua_move`, `cua_drag`, `cua_scroll`, `cua_keypress`,
`cua_type`, `cua_execute`), and DOM actions (`dom_cua_get_visible_dom`,
`dom_cua_click`, `dom_cua_double_click`, `dom_cua_scroll`, `dom_cua_keypress`,
`dom_cua_type`).

Start every browser task with `browsers_list` to get a `browser_id`, then read
the DOM before falling back to coordinates.

## License

MIT. See [LICENSE](LICENSE).
