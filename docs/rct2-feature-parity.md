# RCT2 feature comparison and expansion

Reference: [OpenRCT2 main interface](https://docs.openrct2.io/en/latest/playing/main_interface/), [shops and facilities](https://docs.openrct2.io/en/latest/playing/shops_and_stalls/), and the native ride/entity implementations in this repository. This is a working parity inventory, not a claim that the complete RCT2 feature set is available in the 3D game.

| System | Current 3D implementation | Work still needed |
| --- | --- | --- |
| Coasters | Three vehicle families, twelve premade layouts, placement previews, entrances/exits | More actual coaster types, inversions, custom track editor, station/queue blueprints |
| Water rides | Three native log-flume presets (36, 48, 60 pieces), original boats, water channels, lift and drop | River rapids, splash boats, boat hire, dinghy slides; multiple presets per type |
| Gentle/thrill rides | Carousel, dodgems, ferris wheel, swinging ship, drop tower | More actual ride types with native-compatible art and premade structures |
| Shops | Burger, drink, gift, pizza, ice cream, fries, popcorn, coffee, balloon shops | Remaining food/drink/souvenir types, themed building sets, price editing |
| Facilities | Toilets, information, first aid, cash machine | Complete guest usage/throughput regression coverage; additional building styles |
| Guest needs | Native hunger/thirst/toilet/nausea; live happiness and nausea counts | Individual guest inspector, thoughts and needs overlays |
| Vomit and litter | Native litter positions rendered in 3D, nausea/vomit counts, native vomiting pose | Richer sweeping tools/animation and full cycle visual coverage |
| Staff | Hire cleaners/mechanics from 3D; live task and cleaned/bin counts; distinct uniform colors | Security/entertainers, patrol areas, orders editor, dismissal and staffing finance view |
| Ride management | Open/close, native breakdown indication, customers, queue, price and total profit display | Test controls, inspection interval, dispatch settings, prices, ratings/graphs |
| Landscaping | Trees, planting, paths, furniture, fences and garden features | 3D terrain/water editing, larger themed sets, scenery blueprints |
| Transport | Native engine capability | Original trains/boats/cable cars, routes, stations and premade layouts |
| Finance | Native construction charges, wages, shop/ride income; cash HUD | 3D finance ledger, loans, admission prices, marketing |
| Research | Native engine capability | 3D research funding/priorities and unlock presentation |
| Park systems | Native weather, goals and rating; four released scenarios; local saving | 3D weather presentation, park policies, awards, more objectives/scenarios |

## Content rules

Every exposed tracked ride must have at least one complete native preset, a picture card, a matching 3D model, construction validation and a save/load check. A different layout is counted as a layout, not as a new ride type. Premade tracks still need an entrance, exit and connected queue/path. Original or appropriately licensed art must be used; commercial RCT graphics are not bundled.

The log boats use original procedural sprite art in `tools/art-pipeline/build_water_rides.py`. Shops use original Ridemere stall art, differentiated by product labels, color and selected props; they are not thirteen independently modeled architectural styles. Native simulation determines sickness, litter and cleaning; the renderer does not create fake random vomit.
