# Web product architecture

Written for whoever builds the website around the game. The findings in
`docs/browser-hosting.md` are authoritative and this document applies them.

## The constraint that shapes everything

The game uses pthreads, which need `SharedArrayBuffer`, which browsers only provide to a
**cross-origin isolated** document. That requires two response headers, and without them
the engine does not start at all. It is not a degraded mode; it is a hard failure.

```
Cross-Origin-Opener-Policy:   same-origin
Cross-Origin-Embedder-Policy: require-corp
```

On an isolated document, all of the following break: third-party scripts including
analytics, cross-origin images and fonts that do not opt in, cross-origin iframes,
`window.opener` and therefore popup-based sign-in, embeds, and advertising.

**So the site is split, and the split is a routing decision made now rather than a
migration made later.**

## Routing

```
example.com                     marketing, blog, park gallery, account pages
                                normal document, analytics allowed, no isolation

example.com/play                the game
                                isolated, same-origin assets only, no third-party anything
```

A subdomain (`play.example.com`) works equally well and isolates the headers more
cleanly at the CDN. The deciding factor is cookies: a subdomain needs deliberate
cookie-scope work for the account session, while a path keeps one origin. **Recommend
the path**, `example.com/play`, with the headers scoped to it.

On Vercel:

```json
{
  "headers": [
    {
      "source": "/play/:path*",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
        { "key": "Cross-Origin-Resource-Policy", "value": "same-origin" }
      ]
    }
  ]
}
```

Vercel Analytics and Speed Insights load a script from another origin and **will be
blocked on the game route**. Keep them on the marketing routes. Do not "fix" this by
switching the whole site to `credentialless`, which would also drop Safari support;
measure the game route with first-party events sent through the bridge instead.

Assert `crossOriginIsolated` at startup and fail with a readable message rather than an
opaque `SharedArrayBuffer is not defined`.

## Authentication

`COOP: same-origin` severs `window.opener`, so a popup sign-in cannot post its result
back to the game document.

**Use redirect-based flows, and run sign-in on the non-isolated side.** The sequence
that works:

```
player clicks "Save to cloud" in the game
  ↓ game posts SAVE_READY to the host page, which stores it locally
  ↓ host navigates to example.com/account/signin  (not isolated)
  ↓ redirect flow completes, session cookie set on example.com
  ↓ redirect back to example.com/play
  ↓ game reloads, host uploads the pending save with the session
```

Better Auth when account work begins. The session cookie is first-party to
`example.com`, which is why the path split beats the subdomain split.

## Game and web bridge

Narrow and explicit. The game never exposes arbitrary engine state, and the host never
reaches into the engine.

**Game to host:**

| Message | Payload | When |
|---|---|---|
| `GAME_READY` | engine version, content version | the engine is running and can accept commands |
| `SAVE_READY` | save bytes, slot id, park metadata | autosave or manual save completed |
| `SCREENSHOT_READY` | image bytes, dimensions | requested capture completed |
| `PARK_METADATA` | name, guests, rating, rides, date, cash | on change, throttled |
| `EXIT_GAME` | reason | player left the park |

**Host to game:**

| Message | Payload | When |
|---|---|---|
| `NEW_GAME` | scenario id | player starts a scenario |
| `LOAD_SAVE` | save bytes, slot id | player opens a park |
| `REQUEST_SAVE` | slot id | host wants a save now |
| `REQUEST_SCREENSHOT` | dimensions | host wants a thumbnail |

Deferred: `ACHIEVEMENT`, `CHALLENGE_RESULT`.

Three of these exist as engine exports already in some form: park loading, park saving
and park statistics. `SCREENSHOT_READY` and `PARK_METADATA` are the two that need
engine work, and both are cheap.

**Build `PARK_METADATA` and `SCREENSHOT_READY` in V1 even though public park URLs are
V1.1.** They are what a park page needs, they are small, and adding them later means
touching the engine again for a feature the plan already intends.

## Storage

| Layer | V1 | Later |
|---|---|---|
| Saves | Origin Private File System, falling back to IndexedDB | unchanged |
| Slot index | IndexedDB, holding metadata and thumbnails | unchanged |
| Cloud saves | none | object storage for the save, Postgres for metadata |
| Park pages | none | Postgres row plus a stored screenshot |

**The save file is the source of truth.** Never decompose park simulation state into
database rows. The database stores what a web page needs to render a card: name,
creator, thumbnail, guest count, rating, ride count, updated date, and a pointer to the
save.

Storage is per-origin and per-browser. A player who clears site data loses local parks,
which is the reason export and import are must-have at launch rather than nice to have.

## Content delivery

Content ships as separately fetchable packs so expansion does not mean re-downloading
the game:

```
core/            engine, base archive, interface, terrain, paths, guests, staff
rides-basic/     the launch rides
scenario-01/     per-scenario content and description
scenario-02/
scenario-03/
theme-*/         future packs
```

The launcher already fetches and unpacks a content archive into the virtual filesystem,
so this is a manifest change rather than new machinery. Fetch `core` and the selected
scenario first, and everything else in the background.

Cache with immutable filenames and long lifetimes; the repeat visit should download
nothing but the engine, which the browser already has.

## Distribution loop

The loop the architecture exists to serve:

```
someone shares a park link
  ↓ the page renders server-side: name, creator, screenshot, stats
  ↓ visitor clicks Visit Park
  ↓ the game route loads and opens that park read-only
  ↓ visitor clicks Make My Own
  ↓ a scenario starts, saved locally, no account
  ↓ later they publish, and share a link
```

The park page must be a real server-rendered page with an image, because that is what
gets an unfurl in a chat app. That page is not isolated and does not run the engine; it
links to the isolated route. This is the strongest argument for the path split being
decided before any of it is built.

## What exists now (V1-0, built)

The shell is a Next.js application in `web/`, TypeScript, Tailwind and shadcn/ui.

| Route | Isolated | What it is |
|---|---|---|
| `/` | no | product shell; Play, or Continue when local parks exist |
| `/parks` | no | local park manager: play, rename, export, delete, import |
| `/play` | **yes** | the game runtime |
| `/game/*` | **yes** | the engine archive and the content archive |

Isolation is applied by `next.config.ts` to `/play` and `/game` only. Verified in
Chromium, Firefox and WebKit: `crossOriginIsolated` is true inside `/play` and false on
the product shell, and `SharedArrayBuffer` is available where the engine needs it.

No third-party script is loaded on the isolated routes, and none may be. Analytics, if
added, goes on the marketing routes.

The game runs in the `/play` **document**, not in a frame, so the bridge is an
in-process typed channel with postMessage-safe payloads. Details in
`docs/game-web-bridge.md`; saves in `docs/local-saves.md`.

### Authentication boundary, for later

Not implemented, and the architecture already avoids the trap. `COOP: same-origin`
severs `window.opener`, so **popup sign-in cannot work from the game route**. Sign-in
must be a redirect flow on the non-isolated side, with the session cookie first-party
to the same origin. That is why the split is a path, `/play`, rather than a subdomain.

## Still to build

1. The pack manifest extended to per-scenario packs; today the content is one archive.
2. Accounts, redirect-based, on the non-isolated side.
3. Cloud storage, with the park file as the source of truth.
4. Public park pages, server-rendered, using the metadata and thumbnail the bridge
   already produces.

Not in V1: blueprints, challenges, payments.


## Onboarding (V1-4)

The first scenario is taught by nine steps in `web/src/lib/game/onboarding.ts`, shown
one at a time in a small card opposite the alert panel.

Two decisions are worth keeping:

**Every step is a pure function of scenario state.** A step says when it is *ready* and
when it is *complete*, and both read a summary the engine sends over the bridge. Nothing
advances because a menu was opened: "open the coaster" completes when a coaster is open.

**Nothing about onboarding is stored.** Progress is recomputed on every update, so
closing the tab and coming back lands on the same step, and importing somebody else's
park lands on the step that park is at. The only thing kept on the save record is
whether the player has hidden the tips, which is a preference and cannot be derived.

That is also why the park file is untouched. The alternative — writing tutorial UI state
into a save format we share with upstream — would fork the format for something the
park already answers.

### Where the two panels sit

| | |
|---|---|
| bottom left | the current instruction, and the objective under it |
| bottom right | park alerts |

They are allowed to be about the same subject at the same time: the needs steps are
deliberately triggered by the matching alert. The alert says what is wrong; the
instruction says how to fix it. Neither repeats the other.

The instruction stops once the guided opening is finished. The objective stays.
