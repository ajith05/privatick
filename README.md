# Countdown Timer

Make a shareable countdown to any moment — a launch, a deadline, a birthday —
where the entire timer is encoded in the link itself. Whoever opens the link
sees a live countdown; no account, no database, and no server ever learns what
you're counting down to. Good for when you want to share a countdown without
handing the details to some third-party timer site.

It's a single self-contained HTML file (`index.html`) that works as both a
timer **builder** and a **viewer**, with zero server, zero build step, and
zero external network requests. Open it directly via `file://` or host it as a
static file anywhere.

## How it works

- **No hash in the URL** → builder mode: fill out a form (title, target
  date/time, which units to show, zero-behavior) and generate a shareable
  link.
- **Hash present in the URL** → viewer mode: the page parses the hash,
  validates it, and renders a live countdown. No form is shown. A "Create a
  new countdown timer" link at the bottom goes back to builder mode (a plain
  link to the page with no hash, so it opens in a new tab like any other
  link if the viewer ctrl/cmd/middle-clicks it).
- **Invalid or missing hash data** → falls back to builder mode with an
  inline error message instead of a blank page or crash.

All state — the entire configuration of a given countdown — lives in the
link itself. The page never talks to a server.

## URL parameter schema

Parameters live in the **hash fragment** (after `#`), not the query string:

```
index.html#t=<title>&ts=<epochMs>&u=<units>&z=<zeroBehavior>
```

| Param | Type    | Meaning                                                                 |
|-------|---------|--------------------------------------------------------------------------|
| `t`   | string  | Event title, `encodeURIComponent`-escaped. Optional, defaults to "Countdown". |
| `ts`  | integer | Target moment as an absolute **UTC epoch millisecond** timestamp. Required. |
| `u`   | string  | Units to display, any subset of the letters `d`, `h`, `m`, `s` (order in the URL doesn't matter — display order is always days→hours→minutes→seconds). Required, non-empty. |
| `z`   | enum    | Zero behavior: `stop` (freeze at 00, show completed state) or `up` (count elapsed time upward past the target). Required. |

Example:

```
index.html#t=Launch%20Day&ts=1799000000000&u=dhms&z=up
```

## Privacy design choices

- **Hash fragment, not query string.** Browsers never include the fragment
  in the actual HTTP request, so if this file is hosted on a server, that
  server's access logs never see the event title, date, or any other
  configured detail — only ever `GET /index.html`.
- **No storage of any kind.** No `localStorage`, `sessionStorage`, cookies,
  or IndexedDB. Nothing configured through the builder, and nothing the
  viewer does at runtime, is written to disk.
- **No network calls at runtime.** No CDN scripts, web fonts, analytics, or
  remote images/favicons — only the system font stack and inline CSS/JS.
  The page works fully offline and when opened directly via `file://`.
- **Inline data-URI favicon.** Without an explicit `<link rel="icon">`, most
  browsers silently request `/favicon.ico` from the host on every load when
  the page is served over http(s). The favicon is an hourglass emoji (⏳)
  drawn as an inline SVG `data:` URI — a real, visible icon that still
  never triggers a network request.
- **Content-Security-Policy meta tag.** `default-src 'none'` (plus narrow
  allowances for the page's own inline `<style>`/`<script>` and
  `'self'`/`data:` images) makes "no network egress" a browser-enforced rule
  rather than just "the code doesn't currently call fetch." If a future edit ever
  introduced a remote request by accident, the browser blocks it outright
  instead of silently sending it.
- **`Referrer-Policy: no-referrer`.** The URL fragment is never sent in a
  `Referer` header regardless (that's stripped by browsers per spec), but
  this meta tag additionally suppresses the scheme+host+path from being
  sent too, in case an outbound link is ever added to the page later.
- **Session-only theme toggle.** Every link renders in `auto`. The small
  toggle in the top-right lets a viewer cycle
  `auto → light → dark` for their own convenience, but since no storage is
  allowed, that choice is held only in a JS variable and resets to `auto`
  the moment the page is reloaded — a deliberate tradeoff to avoid persisting
  anything to the viewer's device.
- **Absolute timestamp, not local date/time.** The target is stored as UTC
  epoch milliseconds, so the same link resolves to the exact same instant
  for every viewer regardless of their timezone, and recomputation always
  happens from `Date.now()` on each tick (never by decrementing a counter),
  so the countdown self-corrects across system sleep/wake and
  background-tab timer throttling.

## Known limitations (not fixable in code)

These are inherent to how browsers and OSes handle URLs and clipboards —
no amount of code in this file can close them, so they're disclosed here
instead:

- **Browser history and sync.** The full countdown URL — including the
  title and timestamp in the hash — is written to local browser history
  like any other URL. If the browser has sync enabled (Chrome Sync, Firefox
  Sync, etc.), that history entry syncs to the vendor's servers and to the
  user's other signed-in devices. It's also visible to anyone with
  address-bar autocomplete access on a shared machine.
- **Clipboard managers.** The "Copy link" button writes the link as plain
  text to the OS clipboard, the same as copying any other text. Any
  clipboard-history tool (Windows Clipboard History, third-party clipboard
  managers) will retain it just like it would any other copied string.
- **Server access logs still see that *a* request happened.** If this file
  is hosted rather than opened via `file://`, the host's access log still
  records the `GET /index.html` request itself — IP address, timestamp,
  user agent — same as it would for any static file. It never sees the
  event title, date, or any other configured detail (those stay in the
  fragment), only the fact that someone loaded the app.

## License

MIT — see [LICENSE](LICENSE).
