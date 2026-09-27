# Roadmap

## Where the project is

The feasibility phase is closed. The engine runs in a browser with no RollerCoaster
Tycoon data of any kind, a guest completes a full ride lifecycle, parks save and reload,
and the build holds a thousand guests at 60 frames per second in 463 MB and a 9.4 MB
download. Chromium, Firefox and WebKit all run it.

| Phase | Milestones | Status |
|---|---|---|
| Feasibility | M0, M2, M3, M3b, M3c, M3d, M3e, M3f | **closed** |
| Product definition | V1 product plan | accepted; production underway |
| V1 production | V1-0 to V1-13 | V1-0–V1-7 complete; V1-8 partially complete |
| V1.1 | accounts, cloud saves, park pages, original trains, interface phase 2 | planned |
| Later | coaster sharing, challenges, themed content packs, research | planned |

## V1 in one paragraph

A browser-first theme-park management game with four coasters, five flat rides, three
shops, two facilities, two staff types, one coherent art theme and three scenarios,
saving locally with no account, playable for two to five hours, under 15 MB.

Full definition in `docs/v1-product.md`. Content in `docs/v1-content-matrix.md`.
Sequence in `docs/v1-production-plan.md`. Look in `docs/art-direction.md`. Web shape in
`docs/web-product-architecture.md`.

## Decisions taken

| Question | Decision | Where |
|---|---|---|
| Coaster set | the four open coasters | `v1-product.md` |
| Flat rides | five, ferris wheel last and cuttable | `v1-product.md` |
| Money model | free entry, paid rides, by default | `v1-product.md` |
| Progression | scenario-defined availability, no research | `v1-product.md` |
| Water | defer to V1.1 | `v1-product.md` |
| Accounts | never required; V1.1 when offered | `web-product-architecture.md` |
| Public park URLs | V1.1, with the hooks built in V1 | `web-product-architecture.md` |
| Coaster sharing | V1.1 | `v1-product.md` |
| Challenges | later | `v1-product.md` |
| Monetization | free core, paid content packs | `v1-product.md` |
| Browser configuration | 16 workers, job pools capped at 4, 512 MB, 1 MB stacks | `adr-browser-memory.md` |
| Hosting | isolated game route, non-isolated everything else | `browser-hosting.md` |

## Open questions

* Whether the four open coaster trains are acceptable for launch, or whether original
  trains must be in V1 rather than V1.1.
* Modern twister needs original replacement art for its legacy track fallback.
* Performance on a park larger than the test park. Unmeasured.
* Thirty-eight original sound effects: who makes them, and to what standard.

## Next step

**V1-8, remaining coaster work**: alpine and single rail are integrated. Modern
twister is excluded because its painter falls back to legacy track sprites. Resolve
that artwork requirement or revise the launch roster, then continue with V1-9 guest
visual diversity. V1-7 includes all five flat rides.

## V1-0 complete (2026-09-24)

The prototype is a product shell a person can use twice. A Next.js application hosts
the game on an isolated route, parks save themselves to the browser, and they are still
there after the browser is closed. No account, no file picker, no original-game files.

Verified in Chromium, Firefox and WebKit. Details in `docs/web-product-architecture.md`,
`docs/local-saves.md` and `docs/game-web-bridge.md`.

Two things V1-0 also fixed, both of which had been passing tests while broken: the
shipped track artwork, and parks that appeared to load but were the engine's empty
default. Both now have guards that fail loudly.

Next: **V1-1, interface reskin**, which needs the product name decided first.

## V1-1 complete (2026-09-24)

The game and the website share one visual identity under the working name **Ridemere**:
our own sprite font, our own window theme, 108 authored interface sprites, our own mark
in place of the upstream logo, and shipped strings that name the product. The sprite
audit is clean across eight windows.

Next: **V1-2, world art** — four terrain surfaces, a terrain edge family, three path
surfaces, one queue surface and one railing family. The map currently ends in a black
void, which reads as a bug rather than a boundary in every screenshot taken so far.

## V1-2 complete (2026-09-24)

Four terrain materials, a complete terrain edge family, three paths, a queue and a
railing family, with a shared world palette in `docs/world-art-system.md`. The black
map boundary is gone.

Next: **V1-3, shops, facilities and alerts** — food, drink, souvenir, toilets and
information, each four sprites plus a stall model, and guest thoughts surfaced as park
alerts. Alerts unblock the mechanic in V1-6.

## V1-3 complete (2026-09-24)

Three shops, two facilities, and a guest-alert layer that turns a park full of
individual complaints into one sentence a player can act on, with a panel in the shell
to read it. Thresholds, hysteresis, cooldown and severity live in the engine; see
`docs/guest-alerts.md`.

Three defects that predate this milestone were found and fixed while verifying it. The
web shell opened the camera off the map, and started the engine before telling it how
big its window was; both made the game route unusable, and neither was caught because
nothing in the suite looked at the screen. It does now.

The third is larger. **Money had never been simulated.** Every park this project has
generated carried `ParkFlag::noMoney`, so prices, stock costs, running costs and guest
spending were all inert. The economy is on now, which means V1-7 starts from a park
that actually loses money rather than from nothing.

Two things the pacing taught us, which shape the next milestones:

* **Thirst only falls when a guest sits or eats.** A park with no benches generates no
  demand for drinks. Benches move up: the drink stall is not really playable without
  them.
* **The information point only sells maps to lost guests**, so it is worth nothing in a
  park with two straight paths. It needs a scenario with a real layout to justify
  itself, which is V1-4's job.

Next: **V1-4, scenario 1, first pass** — the tutorial scenario with contextual
objectives and a tips panel, using only what exists. Benches and bins come with it,
because the guest-need loop is incomplete without somewhere to sit and somewhere to put
litter, and because alerts now name both.

## V1-4 complete (2026-09-24)

**First Park** is the scenario a player starts: a coaster waiting to open, a plaza with
benches and bins, an objective of 180 guests at a park rating of 700, and ten
onboarding steps that read the park rather than the menus. `sunrise-test` moved to the
development scenes it always belonged with. See `docs/first-park.md`.

Four things that had never worked were found by playing it, and all four are the same
shape — a system that looked like it was running and was not:

* **The handyman had never cleaned anything**, for two independent reasons: he was
  hired with no duties, and his sweep animation was too short to reach the frame at
  which the engine picks litter up.
* **Nested game actions never charge money**, so nothing the park builder places has
  ever cost anything.
* **A scenario's saved camera was always discarded** before it was written.
* **A scenario could break a ride the player has no mechanic to fix**, and the first
  play-through lost the park to exactly that.

Next: **V1-5, the scenery and vegetation set** — trees, bushes, flowers, lamps, signs
and fences, using the props generator the bench and bin now share. First Park is the
park that will show them off, and the one that proves they do not cost a frame rate.

Two things V1-4 learned that shape it:

* A park at 150 guests runs at 60 fps with the alert layer and the onboarding poll
  running, so the budget for scenery is real rather than hoped for.
* The information point still has no scenario that needs it. Scenario 2, **Small
  Footprint**, is where a layout finally loses somebody.

## V1-5 complete (2026-09-24)

**Scenery and vegetation**: thirty-nine objects in one theme — sixteen vegetation,
sixteen park pieces, three walls, four build-menu groups — built out of shared Blender
components rather than modelled one at a time. First Park is decorated rather than
filled: nine pieces and a short railing, with the rest of the ground left for the
player. See the scenery section of `docs/world-art-system.md`.

Three defects, all the same shape again — something that looked like it was working:

* **The build menu had no tabs at all.** A scenario with no research leaves every
  scenery group uninvented, because `ResearchResetCurrentItem` marks scenery *items*
  invented and scenery *groups* not. Setting the invented bits in the builder was not
  enough either: they are not in the save. A park file carries the research *lists*,
  and the load path rebuilds the bits from them.
* **The scenery window opened and closed itself a frame later**, because it is a tool
  window and nothing had activated the tool. A sprite audit of the build menus
  therefore passed by drawing nothing, and three of the window's own buttons had never
  been authored. The audit now asks where the window is, not whether it opened.
* **A group's tab icon carried its world offsets into a widget.** A tree is anchored
  at the foot of its trunk, so the Nature tab drew its tree forty-eight pixels above
  the tab, off the top of the screen. Six objects had the mirror-image problem: they
  claimed less clearance than their art occupied, and drew outside their own bounding
  box.

Next: **V1-6, staff** — the mechanic, and the handyman revisited for the current art
direction. It is the milestone that lets First Park turn breakdowns back on, which is
the one thing the scenario is still lying about.

What V1-5 learned that shapes it:

* Decoration does almost nothing to the simulation as the engine stands: forty scenery
  elements within five tiles buy a guest one thought and 45 happiness, and the park
  rating has no scenery term. Making decoration pay is a deliberate decision for a
  later milestone, not a side effect of shipping the art.
* A park with a thousand scenery objects on it costs nothing measurable. At 1280x800
  every scene runs at 60 fps and 40 ticks a second — First Park decorated, First Park
  bare, First Park at 250 guests, and the density scene with 1,070 objects on it. What
  costs frames is the window size and the guest count, not the scenery.


## V1-6 complete (2026-09-26)

First Park now ships with breakdowns enabled, an 80%-reliable coaster and ten-minute
inspections. Its maintenance lesson follows the real breakdown, hiring and repair
states, including after saving and resuming. The mechanic repairs every supported
failure and guests return afterwards. The handyman's cleaning and animation checks
continue to pass.

The release also updates cached content independently of the engine revision and
stops simulation, workers and audio when the player leaves the game. First download
is 9.96 MB. Breakdown timing remains random; broader pacing and economic balance
belong to V1-10. See [the status](status.md) for acceptance evidence.

Next: **V1-7, flat rides**.

## V1-7 complete; V1-8 partially complete (2026-09-26)

All five flat rides are integrated, including the ferris wheel. Each has original
models, animation, riders, build previews and shared structure art. Real guest
sessions, save/load, four camera angles and paid player construction pass for all
five. Alpine and single rail also pass those checks and join the existing hybrid.
New First Parks expose the expanded catalog; older parks keep their saved objects.

Modern twister remains excluded: its alternate painter delegates ordinary rail
pieces to legacy artwork. The ride worked mechanically but failed the sprite audit,
so V1-8 is explicitly partial. Details: [expanded ride catalog](flat-rides.md).


## V1 content integrated; acceptance remains (2026-09-26)

All three scenarios, 36 guest appearances, 64 base effects, three additional ride
sounds and three music tracks are integrated. Players can choose any scenario,
see objective completion and retain a rescue download when saving fails. The larger
park has been measured and saved with 1,000 guests. The first download is 20.93 MB.

Next work is acceptance: modern-twister artwork, sustained economic/playtime tuning,
audio listening and mixing, extra sound events and broader device/long-session QA.
See [the latest status](status.md) for the precise completed and pending work.
