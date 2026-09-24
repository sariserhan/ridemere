# The game and web bridge

Written for whoever works on either side of it.

This is the entire surface between the simulation and the product around it. It is
small on purpose. The alternative, letting the web side reach into engine state, is how
a narrow boundary becomes an accidental API that can never be changed.

Schemas live in `web/src/lib/bridge/messages.ts`; the game side is
`web/src/lib/game/runtime.ts`.

## Transport

The game currently runs in the **same document** as the page hosting it, `/play`, so
messages travel over an in-process typed event channel rather than `postMessage`.

Every payload is nonetheless structured-cloneable. Moving the runtime into a worker or
a frame later is then a transport change rather than a redesign. Nothing in the message
shapes depends on shared memory, closures or live object references.

## Direction

Direction is part of the type, so nothing can send a message the wrong way.

### Web to game

| Message | Payload | Meaning |
|---|---|---|
| `NEW_GAME` | `scenarioId`, `saveId` | start the named scenario |
| `LOAD_SAVE` | `saveId`, `park: Uint8Array` | open these park bytes |
| `REQUEST_SAVE` | `saveId`, `reason: manual \| autosave \| exit` | serialise the park now |
| `REQUEST_SCREENSHOT` | `width`, `height` | capture a thumbnail |
| `REQUEST_PARK_METADATA` | none | describe the current park |
| `REQUEST_GUEST_ALERTS` | none | what is the park telling the player |

### Game to web

| Message | Payload | Meaning |
|---|---|---|
| `GAME_READY` | `gameVersion`, `contentVersion` | the engine is running **and simulating** |
| `SAVE_READY` | `saveId`, `park`, `reason`, `parkMetadata` | here are the bytes and a snapshot |
| `SCREENSHOT_READY` | `png`, `width`, `height` | here is a thumbnail |
| `PARK_METADATA` | `metadata` | here is a snapshot |
| `GUEST_ALERTS` | `alerts` | here is the active alert list, most severe first |
| `EXIT_GAME` | `reason: player \| error` | the player has left the park |
| `ERROR` | `stage`, `message`, `detail?` | something failed, in words a player can read |

`ERROR` carries a `stage` (`engine-download`, `engine-start`, `content-install`,
`park-load`, `park-save`, `screenshot`, `runtime`) so the shell can react differently
to "the download failed" and "this park is unreadable". `message` is for the player;
`detail` is for a console or a bug report and is never shown unless asked for.

## Park metadata

The only simulation data that crosses the boundary:

```
parkName  guestCount  parkRating  cash  rideCount  year  month  day  ticks  parkOpen
```

That is a deliberate list, not a convenience. It is what a save card needs today and
what a public park page will need later, which is why it was built in V1-0 even though
park pages are a V1.1 feature: adding it later would mean reopening the engine for a
decision already taken.

**The park file is authoritative.** This metadata is a read-only snapshot for display.
Nothing reconstructs a park from it, and no web-side store keeps guests, rides,
finances, paths or entities.

## Guest alerts

The second, and so far only other, piece of simulation data that crosses the boundary.
Each alert carries:

```
kind  severity  guests  perMille  hasFacility  raisedAtTick  lastChangedTick
title  advice
```

The shell polls for these every five seconds and renders them; it does not decide when
something is worth saying. Thresholds, hysteresis and cooldown all live in the engine,
because they depend on guest state the bridge does not carry and should not start to.
See `docs/guest-alerts.md`.

`kind` is a string rather than a closed union on purpose: a new alert added in the
engine appears in the panel without a matching change on the web side.

## Engine entry points behind it

Six exported functions, all prefixed `Sunrise`:

| Export | Used by |
|---|---|
| `SunriseLoadPark(path)` | `NEW_GAME`, `LOAD_SAVE` |
| `SunriseSavePark(path)` | `REQUEST_SAVE` |
| `SunriseParkMetadataJson()` | `PARK_METADATA`, and attached to every `SAVE_READY` |
| `SunriseCaptureThumbnail(name, w, h)` | `REQUEST_SCREENSHOT` |
| `SunriseGuestAlertsJson()` | `GUEST_ALERTS` |
| `SunriseParkStatsJson()` | readiness detection, see below |

Park bytes move through the Emscripten virtual filesystem: the shell writes them to a
fixed path and asks the engine to load it, or asks the engine to save and reads the
path back. Thumbnails are captured by the engine off-screen, not by reading the canvas,
so the image does not depend on window size, device pixel ratio or where the camera
happens to be pointing.

## Readiness is measured, not assumed

`Module.callMain` hands control to the browser event loop and returns immediately. The
engine is **not** ready at that moment, and a park loaded too early is silently undone
by the rest of start-up: the result is the engine's own empty default park, with a
ticking clock, a plausible date and no error anywhere.

That failure shipped briefly during V1-0 and was invisible to assertions that only
checked "a park loaded" and "time is passing". `GAME_READY` is therefore emitted only
after the engine's tick counter has been observed to advance, and the acceptance test
asserts the park's **name and ride count**, not merely that something opened.

## What is deliberately not here

`ACHIEVEMENT` and `CHALLENGE_RESULT` are named in the product plan and are not
implemented, because nothing produces them yet.

There is no message for arbitrary engine state, no scripting channel, and no way for
the web side to call into the simulation other than the six functions above. Keep it
that way: every addition is a promise that becomes expensive to break.
