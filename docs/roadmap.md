# Roadmap

## Where the project is

The feasibility phase is closed. The engine runs in a browser with no RollerCoaster
Tycoon data of any kind, a guest completes a full ride lifecycle, parks save and reload,
and the build holds a thousand guests at 60 frames per second in 463 MB and a 9.4 MB
download. Chromium, Firefox and WebKit all run it.

| Phase | Milestones | Status |
|---|---|---|
| Feasibility | M0, M2, M3, M3b, M3c, M3d, M3e, M3f | **closed** |
| Product definition | V1 product plan | this document set, under review |
| V1 production | V1-0 to V1-13 | not started |
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

* The product name. Twenty candidates are listed; none is chosen. This blocks the
  interface milestone.
* Whether the four open coaster trains are acceptable for launch, or whether original
  trains must be in V1 rather than V1.1.
* Whether the ferris wheel earns its 544 sprites.
* Performance on a park larger than the test park. Unmeasured.
* Thirty-eight original sound effects: who makes them, and to what standard.

## Next step

Review the V1 plan. If it is accepted, the first implementation milestone is **V1-0,
product shell and saves**.

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
