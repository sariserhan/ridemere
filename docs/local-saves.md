# Local saves

Written for whoever maintains the save system.

A player must be able to open the site, build a park, close the browser, come back
tomorrow and continue, without an account, a file picker or a download. That is the
whole requirement, and everything below exists to make it true rather than
approximately true.

Code: `web/src/lib/saves/`. The interface layer talks only to `GameSaveStore` and never
touches storage APIs directly.

## The park file is authoritative

The park file the engine writes is the only record of a park. The web side stores
metadata for display and nothing else: no guests, no rides, no finances, no paths, no
entities. If the metadata and the park file ever disagree, the park file is right.

## Where bytes live

| Layer | Storage | Why |
|---|---|---|
| Park binaries and thumbnails | Origin Private File System, falling back to IndexedDB | designed for large binaries; the fallback is not hypothetical |
| Save records, the index | IndexedDB, always | small, queryable, available everywhere |

The backend is chosen at runtime by probing: the Origin Private File System is used
only if the directory can be opened **and** a test file can actually be written, since
a browser may expose the directory without a usable writer. Measured:

| Browser | Backend used |
|---|---|
| Chromium 151 | Origin Private File System |
| Firefox 153 | Origin Private File System |
| WebKit 26.5 (Playwright image) | IndexedDB |

The parks screen shows which is in use. That is deliberate: the browsers genuinely
differ and hiding it would make a real difference invisible.

## The record

```
id                 stable generated identifier, never the park name
displayName        what the player calls it
createdAt          first created
updatedAt          last written
scenarioId         which scenario it started from
hasScreenshot      whether a thumbnail exists
parkMetadata       read-only snapshot for the card
sizeBytes          park file size
lastSaveKind       manual | autosave | import
schemaVersion      bumped when this shape changes
gameVersion        the engine build that wrote it
parkFormat         the park file marker, read from the file
```

Names are not identifiers. They are not unique, they change, and a player renaming a
park must not be able to collide with another one.

`schemaVersion`, `gameVersion` and `parkFormat` exist so a future migration can tell
what it is looking at. **No migration is implemented**, because none is needed yet.
Establishing the boundary now is cheap; guessing at migrations is not.

## Writing a park safely

A failed save must never destroy the last good park. Every write is:

```
write   <id>.park.pending
verify  read it back: right length, still starts with PARK
promote copy current to <id>.park.previous, then pending becomes current
```

On IndexedDB the promotion is a single transaction, so it either happens completely or
not at all. On the Origin Private File System it is a sequence that never removes the
previous generation before the new one has been verified.

The result is that **two generations always exist** once a park has been saved twice.

## Recovery

If the current generation cannot be read, or does not start with `PARK`, the store
falls back to the previous generation and reports that it did. The player sees a banner
that stays until dismissed, because it is telling them the last few minutes of play
were lost, which is not a transient status message.

One generation is all V1 offers. That is enough to survive a save that went wrong and
is not a version history.

Tested by deliberately overwriting the current generation with junk and requiring the
park to open anyway, in every browser, through whichever backend that browser uses.

## Autosave

Every **60 seconds**, plus once about four seconds after a park opens so that a park
exists even if the tab dies early, plus on Save & exit.

The interval is a judgement: often enough that a crash costs a minute of play, rare
enough that a browser is not writing megabytes continuously. Saves never overlap; a
save requested while one is in flight is skipped rather than queued, because the next
one is only a minute away and a queue would make a slow save worse.

Autosaving does not stall the game: the engine serialises the park synchronously, which
takes milliseconds for a park this size, and the storage write happens off the
simulation path.

**Unload protection is a backstop, not the mechanism.** Browsers cancel asynchronous
storage work during unload, so `beforeunload` is used only to warn when there is
unsaved progress. The real protection is that a save is never more than a minute old.

## A race worth remembering

Saving and renaming can collide. Save & exit writes the record after the park has been
serialised; if the player renames the park on the next screen before that write lands,
the save reverts the name. It was reproducible in Firefox and invisible in Chromium.

Two fixes, both kept:

1. Save & exit waits for the write to finish before navigating.
2. `write()` re-reads the record after the bytes are stored, so the player's name wins
   over a snapshot taken before they typed it.

## Export and import

Export downloads the park file under a filename made from the park's name, for example
`Sunrise-Grove.park`. The internal representation is unchanged; this is the same bytes.

Export matters at launch even though cloud saves do not. Browser storage is per-origin
and per-device, and a player who clears site data loses everything. Export is how they
rescue a park.

Import validates before storing: non-empty, at most 64 MB, and beginning with the four
bytes `PARK`. Anything else is refused with a sentence the player can act on. Broader
historical park files are **not** promised, because compatibility with the standalone
content set has not been tested.

## Quota

Storage failures are detected and reported as something a player can act on:

> We couldn't save this park locally. Export a copy before closing the game.

Where the browser exposes an estimate, the parks screen shows usage against quota.
There is no storage management beyond that, and none is planned for V1.
