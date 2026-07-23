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

**Live demo:** [zerotick.dev](https://zerotick.dev/)

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
  instead of silently sending it. The same policy (plus `frame-ancestors
  'none'`, which a `<meta>` tag can't express) is *additionally* sent as a real
  HTTP header via the [`_headers`](_headers) file when the app is served by a
  host that supports it (Cloudflare Pages, Netlify). The meta tags remain the
  single source of truth for the `file://` case; the header is defense-in-depth
  for the hosted case and closes clickjacking (iframe embedding), which meta
  CSP cannot. The `_headers` file also sends `Strict-Transport-Security`
  (`max-age=31536000; includeSubDomains`), which — like `frame-ancestors` —
  only works as a real HTTP header (browsers ignore HSTS in a `<meta>` tag per
  spec) and so applies to the hosted case only.
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

## FAQ

### Getting started

**What is this?**
A countdown timer where the whole timer lives in the link. You fill out a
short form, get a URL, and share it. Anyone who opens it sees a live
countdown. No account, no sign-up, no database.

**Why is it called zerotick?**
The *tick* is the countdown itself — the seconds ticking down to your moment.
The *zero* is everything the page deliberately does without:
- **Zero servers.** Nothing runs on a backend; the whole timer *is* the link.
- **Zero storage.** No cookies, localStorage, or anything else written to your
  device.
- **Zero network requests.** No scripts, fonts, analytics, or images are
  fetched at runtime.
- **Zero build step.** One self-contained HTML file — nothing to compile or
  install.
- **Zero knowledge on our end.** Settings live after the `#` in the URL, which
  browsers never send to a server, so no host ever learns what you're counting
  down to.

And the countdown, of course, runs down to zero.

**How do I make one?**
Open the page with no `#` in the URL and you get the builder: an event title,
a target date and time, which units to show (days/hours/minutes/seconds), and
what happens at zero. Hit **Generate link**, then **Copy link**.

**How do I share it?**
Paste the copied link anywhere — chat, email, a calendar invite. Opening the
link *is* the timer; there's nothing to install.

**What happens if I open a broken or half-copied link?**
You get the builder back with an inline message explaining what was wrong
(bad timestamp, bad units, bad zero-behavior) rather than a blank page or an
error. Nothing crashes.

### Behavior

**What are the "At zero" options?**
- **Stop at zero** — freezes at 00 and shows a "✓ *Title* has arrived." banner.
- **Count up** — past the target it keeps going, showing elapsed time in red.

**Does the timer work across timezones?**
Yes. Your date and time are entered in *your* local timezone, but the link
stores an absolute UTC instant. Everyone who opens it counts down to the exact
same moment, whatever their timezone.

**Will it drift if I leave the tab open, or if my laptop sleeps?**
No. Every tick recomputes from the current wall clock rather than subtracting
one second from a counter, so it self-corrects after sleep/wake and after
browsers throttle background tabs.

**Why does the browser tab title show the time only sometimes?**
When the tab is in the background, the tab title shows the running clock
(e.g. `02d:14h — Launch Day`, or `+00m:42s` when counting up) so you can watch
it from another tab. Focus the tab and the title goes back to just the event
name.

**Can I edit a countdown after sharing it?**
Not in place — the link *is* the timer. Make a new one and share the new link.
The old link keeps working until people stop using it.

### Privacy

**Does the site know what I'm counting down to?**
No. Settings go after the `#` in the URL, and browsers never send that
fragment to the server. A host serving this file sees only `GET /index.html` —
never your title or date.

**Does it store anything on my device?**
No cookies, no localStorage, no sessionStorage, no IndexedDB.

**Does it make any network requests?**
None at runtime. No CDN scripts, web fonts, analytics, or remote images — even
the hourglass favicon is inlined. A Content-Security-Policy blocks outbound
requests at the browser level, so it's enforced, not just promised.

**Is there any tracking or analytics?**
No.

**Can I use it offline?**
Yes. Save `index.html` and open it via `file://` — builder and viewer both
work with no internet.

**So the link is completely private?**
Almost — three things are outside the page's control and worth knowing:
- **Browser history.** The full URL, title and all, lands in local history
  like any URL. If browser sync is on, it syncs to the vendor and your other
  devices, and it shows up in address-bar autocomplete on shared machines.
- **Clipboard managers.** "Copy link" writes plain text to the OS clipboard;
  any clipboard-history tool retains it.
- **Access logs.** If hosted, the host logs that *a* request happened (IP,
  time, user agent) — never what the countdown is about.

**Is the link secret or encrypted?**
No. It's readable by anyone who has it — treat it like an unlisted link, not a
password-protected one.

### Appearance

**Why doesn't my light/dark choice stick?**
The toggle in the top-right cycles auto → light → dark for the current session
only. Persisting it would require storage, which the page deliberately never
uses, so it resets to auto on reload. Auto follows your OS setting.

**Can I show only days, or only minutes and seconds?**
Yes — pick any combination under "Units to display." Whatever you leave out
gets rolled into the largest unit shown (turn days off and hours accumulate
past 24, and so on). Display order is always days → hours → minutes → seconds
regardless of how you check them.

**Does it work on phones?**
Yes — the layout scales fluidly and the number boxes wrap on narrow screens.

**Can I self-host it?**
Yes. It's one self-contained HTML file, MIT-licensed, with no build step. Drop
it on any static host. Include the [`_headers`](_headers) file on Cloudflare
Pages or Netlify to also get the CSP, HSTS, and anti-clickjacking headers, and
[`404.html`](404.html) if you want unknown paths to return a real 404 instead of
the homepage. Both are optional — the app itself is still just `index.html`.

## License

MIT — see [LICENSE](LICENSE).
