# Jurassic Pixels 2.5D Runtime SPA Scaffold — Content Pack

This file provides the content-only artifacts requested in the scaffold spec. It is **IP-clean** and intended as design fodder for implementation.

## 1) Tileset spec (16 tiles)

Each tile is assumed to be 12–16px grid, rendered at 2× scale. All tiles should support 1px near-black blue outline and a 3–4 step ramp per material.

| Tile ID | Name | Visual cues | Gameplay intent | Notes |
| --- | --- | --- | --- | --- |
| T01 | Grass | Rounded tufts + lighter top highlights | Base walkable | Add subtle noise speckles for depth |
| T02 | Path | Packed earth with pebble dots | Preferred walk path | Slightly warmer ramp than grass |
| T03 | Fence | Vertical posts + 1 crossbar | Barrier | Use alternating post tops for tiling variety |
| T04 | Gate | Fence with hinge + latch | Entry/exit control | Animate 2 frames (open/closed) |
| T05 | Water | Wavy cyan bands | Hazard/decoration | Use 2-frame shimmer |
| T06 | Rock | Chunky boulder silhouette | Obstacle | Keep silhouette readable at 12px |
| T07 | Feeder | Trough + food mound | Comfort/hunger | 2-state (full/empty) |
| T08 | Power | Generator box + cable nub | Power system | Blinking pixel light overlay |
| T09 | Sand | Light tan, sparse dots | Terrain variation | Slightly lower walk speed (optional) |
| T10 | Mud | Darker brown with puddle glints | Terrain hazard | Footprint decals optional |
| T11 | Flowerbed | Low sprouts + tiny blooms | Aesthetic | Boost guest happiness if placed |
| T12 | Wood Deck | Plank lines + nails | Decorative path | Alternative to dirt path |
| T13 | Lava Lamp | Amber glow + glass tube | Warning/alert | Acts as a warning beacon tile |
| T14 | Crystal | Cyan shard cluster | Visual landmark | Minor light bloom effect |
| T15 | Switch Panel | Small console + button | Device control | Pair with fence/gate logic |
| T16 | Bubble Pad | Circular ring imprint | Bubble device base | Emits bubble when powered |

## 2) Entity roster (8–12 critters)

Each critter is original, plant-forward, and designed for silhouette readability at 16px. Use a 4-frame idle and 6-frame hop where applicable.

1. **Mosskip** — squat, mossy back, tiny antler sprouts. *Behavior:* slow grazer; idles near feeders.
2. **Pebblet** — round body with two stone-like ears. *Behavior:* rolls in short bursts, prefers paths.
3. **Dapplefin** — lizard-like with leafy tail fin. *Behavior:* seeks water tiles; splashes for comfort.
4. **Budspike** — small with budded back spikes. *Behavior:* shy, avoids crowds and fences.
5. **Puffroot** — fluffy body, root-like legs. *Behavior:* bounces when happy; calms near flowerbeds.
6. **Fernlet** — long neck, fern fronds. *Behavior:* stretches to reach feeders; provides guest joy.
7. **Glowbark** — bark-textured shell, glowing eyes. *Behavior:* night-active; boosts happiness after dusk.
8. **Springleaf** — thin legs, springy leaf crest. *Behavior:* high hop frequency, easily startled.
9. **Cinderbud** — orange accent buds, warm hue. *Behavior:* moves to power tiles; increases risk if crowded.
10. **Ripplet** — smooth body with ripple markings. *Behavior:* circles water; low hunger decay.
11. **Thornip** — tiny horned silhouette. *Behavior:* territorial in small pens; needs more space.
12. **Bloomtail** — large tail flower. *Behavior:* lingers near guests; increases guest happiness.

## 3) Plant mascot sheet (Sproutling)

Sprite sheet uses 16px tile grid at 2× scale. A simple 1px outline and 1px internal highlight on cheeks/leaf edges.

### Idle (4 frames)
1. **Idle A:** slight sway, eyes open, tiny smile.
2. **Idle B:** leaf tilt left, blink.
3. **Idle C:** leaf tilt right, cheeks brighten.
4. **Idle D:** bounce settle, eyes open.

### Hop (6 frames)
1. **Hop A:** crouch, leaf tucked.
2. **Hop B:** lift, feet off ground.
3. **Hop C:** midair, leaf flutter.
4. **Hop D:** peak, small sparkle.
5. **Hop E:** descent, shadow oval widens.
6. **Hop F:** land squash, tiny dust puff.

### Bubble Emit (6 frames)
1. **Emit A:** inhale, cheeks puff.
2. **Emit B:** leaf curls, mouth opens.
3. **Emit C:** bubble seed appears.
4. **Emit D:** bubble expands, ring glow.
5. **Emit E:** bubble drifts forward.
6. **Emit F:** mouth closes, wink.

### Pop (6 frames)
1. **Pop A:** bubble contact, ring shimmer.
2. **Pop B:** white flash pixel.
3. **Pop C:** tiny starburst.
4. **Pop D:** sparkle fragments.
5. **Pop E:** smoke puff dissipates.
6. **Pop F:** calm pose, satisfied smile.

## 4) Incident table (triggers + resolutions)

| Incident | Trigger conditions | Player cue | Resolution steps |
| --- | --- | --- | --- |
| Power Brownout | Power tiles < 2, 3+ devices active | Amber warning light | Place power unit, route cable, reduce device load |
| Fence Overload | Fence connected to > 8 tiles | Fence flickers | Add switch panel, split fence networks |
| Crowd Panic | Guests > comfort threshold near pen | Guest emote swarm | Add flowerbeds, open alternate path |
| Critter Escape | Gate left open + low safety | Fence alarm | Close gate, deploy bubble trap, repair fence |
| Feeder Empty | Feeder used > 6 ticks without refill | Hunger icons | Refill feeder, add second feeder |
| Water Contamination | 2+ mud tiles adjacent to water | Water turns murky | Place rock barriers, replace water tile |
| Storm Surge | Random event + low safety | Darkened sky overlay | Pause building, reinforce fences, keep critters contained |
| Bubble Jam | Bubble pad used > 4 times in 10 ticks | Bubble ring flicker | Power cycle device, add switch panel |
| Guest Lost | Path disconnected from entrance | Question mark emote | Paint path, place signpost tile |
| Pen Overcrowd | Critters > pen capacity | Stress icons | Expand pen, move critter, add comfort devices |
| Firefly Swarm | Night + high bloomtail count | Sparkle overlay | Place glowbark, increase lighting |
| Sensor Fault | Switch panel unpowered | Red panel light | Restore power, reset switch panel |

## 5) MoE tip library (30 tips per expert)

Short tips should fit in a tooltip or toast. Each expert provides 30 items.

### Planner (layout efficiency)
1. Keep feeders within 6 tiles of pens to reduce hunger decay.
2. Split large pens into two zones when critter count exceeds 8.
3. Use paths to route guests away from service lanes.
4. Place bubble pads at pen corners for faster response.
5. Avoid fence loops longer than 10 tiles without a switch.
6. Put gates on the path side, not behind feeders.
7. Keep power tiles centralized to reduce cable sprawl.
8. Add a flowerbed every 12 path tiles to boost flow.
9. Use sand as a buffer between water and paths.
10. Cluster devices near power for easier maintenance.
11. Place rock tiles to break line-of-sight panics.
12. Keep pens rectangular for efficient fence use.
13. Reserve one lane for service access at all times.
14. Avoid dead ends; guests dislike backtracking.
15. Place two feeders per pen over size 5×5.
16. Put switch panels at pen entrances for quick toggles.
17. Keep water two tiles away from power tiles.
18. Gate spacing of 6 tiles reduces congestion.
19. Use wood decks for high-traffic routes.
20. Avoid placing bubble pads adjacent to gates.
21. Add a small buffer of grass between pens.
22. Align paths with entrance to reduce lost guests.
23. Keep comfort devices in the pen center.
24. Add a side loop to reduce guest crowds.
25. Place flowerbeds at corners for aesthetic balance.
26. Keep feeder visibility clear of fence posts.
27. Put warning tiles near device clusters.
28. Use rock tiles as path separators.
29. Split crowd areas with short fence segments.
30. Plan power expansion before placing new devices.

### Economist (money, ROI)
1. Early flowerbeds yield faster guest satisfaction gains.
2. Small pens cost less to secure than mega pens.
3. Repairing fences is cheaper than replacing them.
4. Paths improve guest flow, increasing earnings.
5. Avoid overbuilding devices before power is stable.
6. Place feeders near pens to lower repeat costs.
7. Stagger expansions to keep cash above the red line.
8. Use bubble pads instead of extra fences where possible.
9. Guest happiness boosts tips; invest in decor early.
10. Power tiles are expensive—cluster usage.
11. Avoid redundant gates; each gate has upkeep.
12. Keep at least one spare power unit for emergencies.
13. Replace mud tiles to avoid maintenance costs.
14. Use wood decks to increase guest linger time.
15. Add a second pen only when first reaches 70% capacity.
16. Bubble jams cost productivity; add switch panels.
17. Sell unused devices to recover budget.
18. Keep feeders stocked to avoid emergency purchases.
19. Favor multi-use paths over decorative detours.
20. Use water tiles sparingly; they have upkeep.
21. Prioritize safety upgrades to avoid incident fines.
22. Plan for one comfort device per 6 critters.
23. Keep signage near entrances to reduce guest loss.
24. Avoid overfilling pens; penalties cost more than upgrades.
25. Early power upgrades reduce later repair costs.
26. Rotate devices instead of buying duplicates.
27. Use sand buffers instead of extra fencing.
28. Invest in guest routes before expanding pens.
29. Keep a cash buffer before adopting new critters.
30. Exit low-ROI decorations when safety is stressed.

### Safety Chief (incidents, risk)
1. Close gates after every transfer.
2. Keep safety above 70% before expanding pens.
3. Add a switch panel to every long fence line.
4. Never stack power tiles adjacent to water.
5. Place bubble pads at pen exits.
6. Watch for flickering fences—split the network.
7. Move skittish critters away from crowds.
8. Keep pens under capacity to avoid panic triggers.
9. Avoid mud near water to prevent contamination.
10. Add lighting tiles for night-time safety.
11. Repair broken fences before resuming guest flow.
12. Keep a clear route for caretakers.
13. Use warning tiles near device clusters.
14. Avoid placing gates on corners.
15. Rotate feeders to reduce crowd pressure.
16. Power cycle devices after a bubble jam.
17. Move guests away during storm surges.
18. Keep emergency bubble pads powered.
19. Reduce device load during brownouts.
20. Keep safety nets between pens.
21. Confirm fence networks before adding new critters.
22. Keep a spare power unit ready.
23. Avoid overcrowding near water tiles.
24. Split crowded pens with temporary fences.
25. Place rock tiles as buffer barriers.
26. Keep lost guests out of service lanes.
27. Use switch panels as quick lockdown.
28. Monitor critters with high escape risk.
29. Do a safety sweep after every expansion.
30. Close pens during incidents to stabilize stats.

### Creature Keeper (hunger/comfort)
1. Keep feeders stocked before hunger hits 50%.
2. Add flowerbeds for comfort boosts.
3. Provide water access within 4 tiles.
4. Move shy critters away from gates.
5. Keep pens spacious for territorial species.
6. Rotate critters to reduce stress build-up.
7. Use bubble pads sparingly to avoid stress.
8. Add soft terrain like grass or sand.
9. Avoid stacking feeders in one corner.
10. Keep light levels soft for nocturnal critters.
11. Place comfort devices near rest areas.
12. Avoid loud device clusters near pens.
13. Use wood decks for caretaker patrols.
14. Track hunger spikes after guest surges.
15. Add a second feeder for each 6 critters.
16. Keep water tiles clean and isolated.
17. Don’t mix territorial critters in tight pens.
18. Place decorative tiles to reduce boredom.
19. Move critters away from storm surge zones.
20. Keep pen edges clear for pacing routes.
21. Add shade tiles near feeders.
22. Rotate in glowbark at night for calm.
23. Avoid fencing too close to water edges.
24. Use gates for controlled transfers.
25. Give springleaf extra hopping space.
26. Keep mosskip near flowerbeds.
27. Reduce pen traffic during feeding.
28. Keep comfort above 60% to prevent escape.
29. Add a bubble pad only with nearby power.
30. Use soft lighting to soothe anxious critters.

### Vibe Director (guest happiness, aesthetics)
1. Keep paths wide and looped for easy strolling.
2. Add flowerbeds at path corners for pop.
3. Use water tiles as scenic highlights.
4. Place glowbark near evening walkways.
5. Avoid blocking sightlines with tall fences.
6. Add signposts to reduce guest confusion.
7. Use wood decks for photo spots.
8. Keep pens visible from main paths.
9. Add crystal tiles to sparkle up dull zones.
10. Balance green ramps with warm accents.
11. Place bubble pads where guests can watch safely.
12. Add small rock clusters as scenery.
13. Keep décor evenly spaced for rhythm.
14. Use amber warning lights sparingly.
15. Make path loops around pens for viewing.
16. Place feeders where guests can peek in.
17. Add a flowerbed for every two pens.
18. Keep entrance area bright and welcoming.
19. Reduce mud tiles near guest paths.
20. Use cyan accents for wayfinding.
21. Add a scenic bench tile near water.
22. Keep devices hidden behind décor.
23. Make pen corners rounded with rock tiles.
24. Add gentle motion with water shimmer.
25. Place signposts at every intersection.
26. Spread lights to avoid dark pockets.
27. Keep entrances clear of device clutter.
28. Add a focal point tile in each zone.
29. Use alternating tile patterns for texture.
30. Keep guest routes free of sharp turns.

## 6) Quest/tutorial script (10–12 steps)

Sproutling acts as guide; each step produces a short tooltip and a task.

1. **Welcome:** “Hi! Let’s build our first pen.” → Paint 6 grass tiles.
2. **Fence Time:** “Fences keep critters comfy.” → Place 8 fence tiles.
3. **Gate Setup:** “Let’s add a gate for access.” → Place a gate tile.
4. **Power On:** “Devices need power.” → Place one power tile.
5. **Feeding:** “Critters get hungry.” → Place a feeder tile.
6. **Add a Critter:** “Meet your first friend!” → Add 1 critter to pen.
7. **Bubble Safety:** “Bubbles are gentle.” → Place a bubble pad.
8. **Path Painting:** “Guests need paths.” → Paint a 6-tile path to pen.
9. **Comfort Boost:** “Let’s make it cozy.” → Place a flowerbed tile.
10. **First Tip:** “Listen to the experts.” → Open MoE tips panel.
11. **Incident Drill:** “Test the bubble trap.” → Trigger a mock incident.
12. **Replay Check:** “Time travel!” → Scrub replay to step 4.
