# V1 product definition

Written for the people who will decide whether to build this and then build it.

## What V1 is

A browser-first theme-park management game. You open a link, the park loads in under
ten seconds, and you are building. It is a complete small game, not a demo of an
engine, and not a way to play RollerCoaster Tycoon 2 in a tab.

The simulation underneath is OpenRCT2-derived, which is a strength we do not advertise
as the product: it means guest behaviour, ride physics, queues, breakdowns and park
economics are deep from day one, at a level a new simulation would take years to reach.
Everything a player sees is ours.

## The smallest version worth releasing

> Someone finds a link, plays for an afternoon across three scenarios, understands it
> as its own game, saves without signing up, comes back the next evening, and has
> something they want to show someone.

That sentence is the scope test. Every item below either serves it or is deferred.

## Target player experience

```
land on the site
  ↓  one click, no account
the game loads (9-18 MB, under 10 seconds on a normal connection)
  ↓
Scenario 1 opens with a short objective and a park that is already legible
  ↓
build a path, build a ride, set entrance and exit, open it
  ↓
guests arrive and use it; some complain
  ↓
read the complaint, add a drink stall, hire a handyman
  ↓
money comes in; build something bigger
  ↓
objective met; scenario 2 unlocks
  ↓
save happens automatically; the tab can be closed
  ↓
come back tomorrow, the park is there
```

A first-time player who has never played a park game must be able to get a working ride
with guests on it **within five minutes**, without reading anything longer than a
sentence at a time.

## Core loop

```
build  →  attract guests  →  observe problems  →  improve  →  earn  →  expand
```

The loop is already implemented by the engine. V1's job is to make each arrow legible:

| Arrow | What makes it legible in V1 |
|---|---|
| build | a toolbar a newcomer can read, and rides that look like what they are |
| attract | guests visibly walking in and queuing |
| observe | guest thoughts surfaced as park alerts, not buried in windows |
| improve | every complaint has an answer that exists in V1 |
| earn | one money model, shown in one place |
| expand | a scenario objective that names the next thing to do |

## Content decisions

The suggested starting hypothesis was 4 coasters, 5 flat rides, 3 shops, 2 facilities,
2 staff, 4 terrain, 3 paths, ~25 scenery, ~15 vegetation, 3 scenarios, 3 music tracks.
It survives almost intact. The changes, with reasons:

| Item | Hypothesis | Recommendation | Why |
|---|---|---|---|
| Coasters | 4 | **4** | four open objects exist with complete open track art, verified |
| Flat rides | 5 | **5, in a specific order** | the ferris wheel costs four times a carousel; it goes last and is cuttable |
| Shops | 3 | **3** | food, drink, souvenir; four sprites each |
| Facilities | 2 | **2** | toilets and information; first aid deferred |
| Staff | 2 | **2** | handyman and mechanic |
| Terrain | 4 | **4 plus an edge family** | the map currently ends in a black void, which looks broken |
| Water | open question | **defer to V1.1** | see below |
| Paths | 3 | **3 plus 1 queue plus 1 railing** | as proposed |
| Scenery | ~25 | **20** | a coherent 20 beats a thin 25 |
| Vegetation | ~15 | **15** | as proposed |
| Scenarios | 3 | **3** | as proposed |
| Music | 3 | **3 from OpenMusic** | already open, no production cost |
| Sound | not specified | **38 original effects** | the real gap; see the matrix |

### Coasters

All four open coasters, because they are the only ride objects in existence that we can
legally ship, their track art is complete and open, and one of them is already proven
end to end in our own park.

| Ride | Role | Beginner friendly | Advanced layouts |
|---|---|---|---|
| Alpine coaster | first coaster a player builds; slow, cheap, forgiving | **yes** | no |
| Hybrid coaster | the signature ride; full piece set including inversions | no | **yes** |
| Single rail coaster | distinctive silhouette, high intensity, small footprint | no | yes |
| Modern twister (LSM launched) | launched, dramatic, teaches intensity and nausea | no | yes |

This satisfies both constraints: alpine is the beginner ride, hybrid and single rail
support advanced custom layouts.

**What is missing and why we accept it:** there is no classic wooden coaster and no
junior coaster. Their open track art is partial (268 and 32 sprites), so either would
mean authoring a complete track set, which is hundreds of sprites across every piece,
slope, bank and diagonal. That is a V1.1 or V2 project, not a launch item. Alpine covers
the family-friendly role in the meantime.

**Identity risk:** shipping the four open trains unmodified makes our coasters look like
OpenRCT2's. Track colour is player-chosen and remapped at runtime, so the rails already
adapt. The recommendation is to ship V1 with the open trains and schedule original train
art for V1.1, once the art direction has proven itself on flat rides and scenery. That
keeps the launch honest about what it is without blocking it on a large art job.

### Flat rides

Five, in this order, because the order is the cut line:

1. **Carousel** — the icon of the genre, ~160 sprites, low intensity, every park needs one
2. **Dodgems** — different shape, different gameplay slot, cheap
3. **Drop tower** — high intensity, tall silhouette, teaches nausea
4. **Swinging ship** — mid intensity, ~150 sprites, strong readability
5. **Ferris wheel** — ~544 sprites for gentle gameplay already covered by the carousel

If production slips, the ferris wheel is the item to cut, and four excellent flat rides
is an acceptable V1. The brief said exactly this: four excellent flat rides beat six
mediocre ones.

### Shops, facilities and guest needs

The engine already tracks hunger, thirst, toilet, nausea, happiness, energy, nausea
tolerance, ride preferences and queue tolerance. V1 exposes the five that have an
answer in the park:

| Need | Answer in V1 | Facility |
|---|---|---|
| hunger | food stall | shop |
| thirst | drink stall | shop |
| toilet | toilets | facility |
| nausea | ride intensity choices, and not building the drop tower next to the exit | none needed |
| happiness | everything above, plus queue times and litter | handyman |

Souvenir stall exists for revenue and for the "I want to spend money" thought.
Information kiosk exists because it sells maps and answers lost guests, which is a
visible service.

First aid is deferred: it answers nausea, and nausea is better answered in V1 by ride
choice than by a building. Security and entertainer are deferred: vandalism and queue
boredom are second-order problems that a three-scenario game does not have time to
teach.

### Staff

Handyman and mechanic. Handyman works today. The mechanic needs breakdowns to be
visible, which means V1 must surface "ride has broken down" as an alert a player
notices. Without that the mechanic is a wage with no story.

Security and entertainer are LATER.

### Terrain, paths, scenery

Four terrain surfaces (grass, dirt, sand, stone) plus a terrain **edge** family. The
edge matters more than it sounds: the map currently ends in a black void, which reads as
a bug rather than a boundary in every screenshot we have taken.

Three path surfaces (asphalt, stone, wood), one queue surface, one railing family.

Twenty scenery pieces and fifteen vegetation pieces, in one coherent theme rather than
several themed lands. Benches, bins and lamps are not decoration: benches and bins are
gameplay (tired guests, litter), so they are in the must-have set while decorative
planters are not.

### Water

**Defer to V1.1.** The engine has a water object type, but the water surface art and
the palette animation are an unverified cost, and water's gameplay value in a
three-scenario launch is scenic rather than mechanical. The difficult-terrain scenario
that would justify it is itself optional. Revisit when a hills-and-lakes scenario is on
the table.

## Economy

Use what the engine has: starting cash, construction cost, operating cost, staff wages,
shop revenue, guest spending, loans, park entrance fee. Do not redesign it.

**Recommendation: Model A, free park entry with paid rides, as the default.**

| | Model A: free entry, paid rides | Model B: paid entry, free rides |
|---|---|---|
| Teaches the loop | yes, each ride is a visible revenue decision | weakly, one number set once |
| Feedback speed | immediate: build a ride, money moves | slow: money moves with guest count |
| Failure mode | over-pricing a ride empties its queue, which is visible | over-pricing the gate empties the park, which looks like nothing happening |
| Newcomer legibility | high | high |

Model A gives a new player a decision per ride and an obvious cause for every
consequence, which is what the first hour needs. Scenario 3 can flip to paid entry to
teach the contrast, so Model C is the shape at the scenario level with A as the default.

## Research and progression

**Recommendation: option C, scenario-defined content, with no research in V1.**

Research adds a second progression system on top of scenario objectives, and in a
2-to-5-hour game the two compete. Scenario-defined availability gives the same benefit,
that scenario 1 is not overwhelming, with none of the UI or tuning cost, and it lets
each scenario teach a specific thing by controlling exactly what is on the menu.

Scenario 1 offers the alpine coaster, carousel, food, drink, toilets and paths. Scenario
3 offers everything. Research becomes interesting when there are thirty rides to unlock,
which is V2.

## Scenarios

Three at launch. Each teaches one thing and takes roughly an hour.

**1. First Park** — flat, generous land, generous cash, a low guest target. Teaches
camera, paths, one ride, entrance and exit, queue, opening a ride, hiring a handyman.
Contextual objectives carry the tutorial; there is no separate tutorial mode.

**2. Small Footprint** — a third of the land, a higher guest target. Teaches queue
efficiency, path layout, and that a park is a shape not a list. The land limit is the
lesson.

**3. Growing Destination** — large map, large guest target, full ride list, paid entry,
ride breakdowns switched on. Teaches staff, intensity mix, and money at scale.

Difficult Terrain and Financial Challenge are LATER, and Difficult Terrain depends on
water.

## UI and onboarding

Two phases, as proposed.

**Phase 1, in V1:** keep the engine's window system, replace what is seen. Original
icons, our palette, our fonts, a toolbar arranged for someone who has never played this
genre. We already author base interface sprites procedurally; that pipeline extends to
the whole toolbar.

**Phase 2, V1.1:** a browser-oriented HUD with a top status strip (money, guests,
rating, date, speed), a left build rail (rides, paths, scenery, facilities, staff), and
a right detail panel. This is a layer over the existing windows, not an engine UI
rewrite.

**Onboarding** is contextual objectives plus a small dismissible tips panel in scenario
1. No tutorial engine. The sequence to teach is: camera, path, build ride, entrance and
exit, queue, open, staff, money. Eight tips, one at a time, each triggered by the player
being ready for it.

Speed controls stay pause, 1×, 2×, 4×. Faster is not recommended: at 4× the simulation
already runs at the engine's tick ceiling and the browser is doing the work.

## Saves

Local browser save slots, no account, no file picker. Autosave plus manual save,
multiple parks, rename, delete, export to a file, import from a file.

Storage is the Origin Private File System where available, falling back to IndexedDB.
The engine already persists to IndexedDB through Emscripten's filesystem layer, so the
work is a slot manager and UI rather than new storage plumbing.

Export and import matter at launch even though cloud saves do not: they are how a player
rescues a park, and how the first park gets shared before sharing exists.

## Accounts, cloud and sharing

No account required, ever, to play. Account creation is offered only when a player wants
something an account is for.

| Feature | Decision | Reason |
|---|---|---|
| Local saves | **V1** | the game is not a product without them |
| Accounts | **V1.1** | nothing in V1 needs identity |
| Cloud saves | **V1.1** | follows accounts; the save file is the source of truth, not the database |
| Public park URLs | **V1.1, built in V1** | see below |
| Coaster sharing | **V1.1** | needs blueprints, previews and an import path |
| Challenges | **LATER** | needs server-side validation |

**Public park URLs are the distribution mechanism, so V1 must not make them hard.**
The recommendation is to defer the feature but build V1 so it costs little later:
screenshots capturable from the engine, park metadata extractable without loading a
park, and save files portable. That is a handful of exports in the game-to-web bridge,
decided now rather than retrofitted.

## Brand

"Project Sunrise" is a working title and should not ship. Name criteria: short,
memorable, no RollerCoaster Tycoon vocabulary, family-friendly, works
internationally, and describes a park builder for a decade rather than one launch.

Twenty candidates, grouped by what they lean on:

*Place and park:* Parkway, Loopline, Thrillwood, Brightpark, Funfields, Midway,
Parkcraft, Coasterway

*Feel and light:* Sunspire, Daybreak Parks, Highlight, Glimmer Park, Skyline Parks

*Motion:* Loop, Airtime, Zipline, Corkscrew, Freewheel

*Invented and short:* Parkio, Thrillo, Wondr

The strongest for a long-lived product are **Airtime**, **Parkway**, **Thrillwood** and
**Sunspire**: short, pronounceable internationally, and none depends on genre jargon.
Domain and trademark work comes later; no renaming of code yet.

## Monetization

**Recommendation: C, a free core game with paid content and theme packs, plus a
subscription only for cloud and community features later.**

Free core is what makes the distribution loop work: a shared park link must open into a
playable game, not a paywall. Content packs suit the architecture, since the content
system is already built around separately loadable packs. A subscription is defensible
for hosting parks and running challenges because those cost money per user per month;
charging for the game itself does not scale with cost.

Rejected: one-time purchase, which breaks the share-link loop at the exact moment it
should convert. Explicitly excluded: pay-to-win, energy timers, loot boxes, and anything
that reaches into the simulation.

No implementation in V1. V1 shows no price anywhere.

## Performance and download budgets

Production defaults, adopted from M3f and treated as fixed until larger parks say
otherwise: 16 workers, job pools capped at 4, 512 MB initial heap, 1 MB pthread stacks.

Targets: 60 frames per second on a typical desktop, about 40 simulation ticks per
second, 1,000 or more guests. All three are met today at 463 MB of committed memory.

Download: 9.39 MB now, a V1 target under 15 MB, and a hard ceiling of 25 MB. Scenario
and theme packs load separately after the core.

**Untested:** larger maps and denser parks than Sunrise Test Park. Scenario 3 is the
first design that will push this, and it should be measured before its guest target is
finalised.
