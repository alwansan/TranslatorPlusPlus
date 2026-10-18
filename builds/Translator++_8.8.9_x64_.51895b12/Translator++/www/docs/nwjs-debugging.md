# NW.js remote debugging notes

This document records how to inspect a running NW.js window through Chromium remote debugging and execute JavaScript in the app context.

## Scope

This method works for the **renderer / window context** of an NW.js application when Chromium remote debugging is enabled.

Translator++ uses **mixed context** mode.

That means the renderer can access both browser-side JavaScript APIs and Node.js APIs in the same page context.

In practice, this usually means you can use things like:

- browser globals such as `window`, `document`, and DOM APIs
- app globals such as `trans`
- Node.js features such as `require()`, `process`, and built-in modules

If you need to include a module during remote evaluation, using `require()` typically works well.

Another useful reference is [/.eslintrc.json](../../.eslintrc.json).

Its `globals` section contains some of the known global variables available in the Translator++ codebase, so it can help identify names that are expected to exist in the renderer context.

Examples listed there include `trans`, `ui`, `sys`, `nw`, `common`, `php`, `addons`, `jQuery`, `Prism`, and others.

This is not necessarily a complete runtime inventory, but it is a practical place to look when deciding which globals may be safe to inspect during remote debugging.

It does **not** automatically debug the **Node / main process** from `main.js`. For that, a separate Node inspector port such as `--inspect` or `--inspect-brk` is required.

## Current app setup

The app already enables remote debugging through the Chromium args in [package.json](../../package.json#L10):

- `--remote-debugging-port=9222`

Example value:

```json
"chromium-args": "--mixed-context --enable-spell-checking --disable-web-security --memory-pressure-off --unlimited-storage --disable-gpu --remote-debugging-port=9222"
```

## How to detect active debug targets

When the app is running, Chromium exposes targets at:

- `http://127.0.0.1:9222/json`

This endpoint returns debuggable pages and their `webSocketDebuggerUrl` values.

Typical flow:

1. Request `http://127.0.0.1:9222/json`
2. Pick the target with `type: "page"`
3. Connect to its `webSocketDebuggerUrl`
4. Use the Chrome DevTools Protocol method `Runtime.evaluate`

## Common target URLs in this app

When browsing the remote debugging target list, you may see URLs such as:

- `chrome-extension://omiagpcjcimbichlbnloibnjbfknmcab/_generated_background_page.html`
- `chrome-extension://omiagpcjcimbichlbnloibnjbfknmcab/www/trans.html`
- `chrome-extension://omiagpcjcimbichlbnloibnjbfknmcab/www/options.html`

Target selection matters.

### `_generated_background_page.html`

`_generated_background_page.html` is the NW.js-generated background page.

Typically, this is **not** the window you want to debug for normal application UI behavior.

Use it only when you specifically need background-page behavior.

### `trans.html`

`trans.html` is the main page of the application.

Typically, this is the preferred target for debugging the main app behavior, app state, and globals such as `trans`.

For example, if you want to inspect `trans.project.files`, this is usually the correct target.

### `options.html`

If you are debugging a different window, select the matching page instead.

For example, when debugging the options UI, you may want to connect to `options.html` rather than `trans.html`.

## What was verified

A runtime evaluation was executed against the running Translator++ window target:

- target title: `translator++`
- target URL: `chrome-extension://.../www/trans.html`

The following expression was evaluated:

```js
(() => {
  const value = trans.project.files;
  const count = Array.isArray(value)
    ? value.length
    : value && typeof value.length === 'number'
      ? value.length
      : value && typeof value === 'object'
        ? Object.keys(value).length
        : -1;
  console.log('trans.project.files count:', count);
  return count;
})()
```

Observed result:

- `trans.project.files` count = `66`

## Minimal Node script for remote evaluation

This script connects to the first available NW.js page target and evaluates code in the renderer:

```js
const http = require('http');
const WebSocket = require('ws');

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

(async () => {
  const targets = await getJson('http://127.0.0.1:9222/json');
  const target = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl)
    || targets.find(t => t.webSocketDebuggerUrl);

  if (!target) {
    throw new Error('No debuggable target found.');
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);

  ws.on('open', () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `console.log(trans.project.files); trans.project.files?.length`,
        returnByValue: true,
        awaitPromise: true,
        includeCommandLineAPI: true
      }
    }));
  });

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id === 1) {
      console.log(msg);
      ws.close();
    }
  });
})();
```

## Useful CDP methods

For AI-agent automation, these methods are the most useful:

- `Runtime.evaluate` — execute expressions and return values
- `Runtime.getProperties` — inspect objects by remote object ID
- `Console.enable` — receive console events
- `Debugger.enable` — enable debugger domain
- `Debugger.setBreakpointByUrl` — set JS breakpoints by file URL
- `Debugger.pause` — pause execution
- `Debugger.resume` — resume execution

## Good practices for agent-driven inspection

- Prefer the page target with `type: "page"`.
- Use `returnByValue: true` for simple values.
- If the result is not JSON-serializable, inspect it with `Runtime.getProperties`.
- Wrap expressions in an IIFE to avoid leaking temporary variables.
- Log a unique prefix with `console.log()` when you need to confirm execution.
- Be defensive when reading app globals, for example check whether `trans`, `trans.project`, or `trans.project.files` exists.
- In Translator++, remember that mixed context is enabled, so `require()` is often available directly in the evaluated renderer expression.

## Caveats

- NW.js may expose extension-style URLs such as `chrome-extension://.../www/trans.html`; that is expected.
- Mixed Node/browser globals may exist in the renderer because Translator++ runs with mixed context enabled.
- If multiple windows are open, target selection matters.
- Renderer debugging does not imply main-process debugging.

## Recommended agent workflow

1. Confirm the app is running.
2. Query `http://127.0.0.1:9222/json`.
3. Select the desired page target.
4. Connect to the target's WebSocket debugger URL.
5. Run `Runtime.evaluate` with a guarded expression.
6. Read the returned value and, if useful, also emit `console.log()` for visible confirmation.
7. If deeper inspection is required, enable `Debugger` and `Console` domains.
