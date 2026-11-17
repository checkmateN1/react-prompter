react-prompter

## Release 9.54

Version 9.54 replaces post-render grid measurement with precomputed scales for 4/6/9/12/15 tables. `src/prompterLayout.js` owns geometry shared with CSS via custom properties. Every managed render includes its selected scale in the same React commit as the table grid, including initial mount and server-driven changes; no animation-frame fit is scheduled. Resize recalculates all five scales synchronously before rendering. Invalid/zero viewport dimensions keep the grid hidden until a valid size is available.

The optional localStorage cache `startpro.layout-scales.v1` records all five scales with a key covering geometry, viewport, browser DPI, screen/work-area metadata and StartPro's display fingerprint. Persisted values are checked against the formula before use. Changed or corrupt caches are replaced; unavailable storage does not prevent fitting. StartPro checks monitor bounds, working areas and DPI at startup and again before connecting, and passes its fingerprint in the URL/bridge before the managed render. The actual page viewport remains authoritative for usable size.

Verification (2026-10-19): 60 React tests and 154 Chrome integration checks passed against the production build, including immediate count changes in the same JavaScript task, fitting all grids at 900x800, 1500x800 and 1500x500 window sizes, app mode, window reuse and loopback reconnection. Source tests also cover first-render scale, viewport/display cache invalidation and corrupt/unavailable cache recovery. The production build retains existing lint and sharedWS Node-module warnings. Release artifacts: `prompter_v9.54/` and `prompter_v9.54.zip`; both contain version 9.54.0 metadata.

## StartPro integration (9.49+)

`public/VERSION.json` is the release version source. `npm run build` embeds its version in the application and copies the file to the build root beside `index.html`. Change the version before producing the next release; `startProProtocol: 1` declares the current launcher interface. Do not edit only the already-built VERSION.json: StartPro checks it against the running JavaScript version.

To build a versioned folder in PowerShell:

```powershell
$env:BUILD_PATH = 'prompter_v9.54'
npm run build
```

Copy the complete build contents into `ext\prompter` beside StartPro.exe (`index.html`, `VERSION.json` and `static` directly inside `prompter`). StartPro uses this fixed location; no folder selection is required. It opens Google Chrome in app mode using a dedicated profile, passes the selected WebSocket server in `?server=...&startpro=1`, and delivers the token through the local Chrome control connection. The token is never added to the URL. `window.startProConnect({ server, token })` closes the previous connection, clears old prompts and starts the new connection if a token is present. Opening index.html manually still supports the existing connect button and saved settings; a valid URL server takes precedence over the saved server.

Starting with 9.50, managed windows take the token only from StartPro's saved `user_config.json`. They ignore the browser's cached token, display the supplied token in a disabled password field, and lock the server field to StartPro's selection. A blank config token cannot fall back to an older credential. After a manual page reload, the page waits for StartPro's open/reconnect action to supply fresh settings. Standalone windows retain manual token/server editing.

Starting with 9.53, managed windows fit every supported table grid (4/6/9/12/15) to both the available width and height. The layout measures the rendered tables and their gaps and chooses the smaller of the width/height scale factors, capped at 100%. A matching bottom margin keeps the last row's lower edge visible. Browser zoom remains 100% and Windows display scaling is respected. Resizing/moving between displays and manual or server-driven table-count changes recalculate the fit without cumulative shrinking. Saved table-count choices remain available. Standalone windows keep their existing layout. This replaces the width-only fitting introduced in 9.51.

`npm test -- --watchAll=false --runInBand` includes launcher URL validation, server priority, credential delivery, and reconnection tests. The Windows launcher repository also contains an isolated Chrome integration harness.

Starting with 9.52, the backend can select the table grid with the socket event
`tableCount` and payload `{ "tableCount": 9 }`. The UI accepts only counts available
in its selector (4/6/9/12/15), updates the selected radio and saves the choice.
The backend currently sends 9/12/15 from incoming frame layout metadata, with the
slot-array length as fallback for legacy frames. Updates from replaced or
disconnected sockets and unsupported counts are ignored. This works in both
standalone and StartPro windows; managed windows also recalculate the grid fit.
