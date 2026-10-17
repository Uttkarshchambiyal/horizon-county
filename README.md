# Horizon County

An original, self-contained 3D browser driving world with 36.7 km of connected roads, a downtown grid, Pacific Beach, a coastal highway, Crestline Hills, a harbor and an airfield. Drive nine real cars, including the Ferrari 458 Italia, Porsche 930 Turbo, Skyline R34 GT-R and Lamborghini Aventador, then explore with fully manual WASD controls. Light two-way traffic and walking sidewalk crowds bring the city and coastal highway to life. Complete delivery jobs and checkpoint races, earn credits, tune each car, set map waypoints and discover six destinations. Includes building, parked-car and moving-car collisions, off-road handling, water recovery, four cameras, three lighting presets, headlight beams and recorded engine audio with RPM, shifts, a horn, nitro, impacts, off-road tires and nearby traffic.

This is a compact arcade browser world inspired by city-and-countryside driving games. The map is original. All nine car models are credited external assets under CC BY 4.0; sources and modifications are listed in the game credits. Photographed road/ground materials and an outdoor HDR reflection environment are included locally. This is an arcade browser game with a compact map. Building interiors, pedestrian impact/ragdoll gameplay and multiplayer are outside its scope. No account or game backend is needed; credits, completed events, personal bests, per-car upgrades, garage, paint, settings and discoveries save in this browser only. Active runs restart after a reload; earned progress remains.

## Play locally

Requires Node.js 20.11 or newer. No dependency installation is needed.

```sh
npm start
```

Open http://127.0.0.1:4173, choose a starting district, then select **Start Driving**. All three starting districts share the same map.

- **W / Up:** accelerate. **A / D** or **Left / Right:** steer while moving. Hold W+A or W+D together to turn.
- **S / Down:** brake; keep holding after stopping to reverse.
- **Shift:** rechargeable nitro. **Space:** handbrake. **H:** horn.
- **M:** full map; click land to set a waypoint or use district buttons to travel.
- **R:** return to the last safe road position. Water also recovers the car after a short delay.
- **C:** cycle four cameras, including a close front-wheel view. **L:** headlights. **V:** sound. **Esc / P:** pause.
- Use the time-of-day button for golden hour, daylight or blue hour.

- **J:** jobs and races. Choose one of three stopped-pickup deliveries or three ordered-checkpoint races. Follow the road route on the minimap and the terrain-following target ring. Stop in a delivery ring for 1.25 seconds to collect/deliver. Races require a stopped start and three-second countdown. Delivery clocks start after pickup; race clocks start at GO. Recovering adds ten seconds and forfeits the clean-delivery bonus. Fast travel is disabled during a run; returning to district selection abandons it. Opening any overlay pauses the run.
- **G:** garage. Choose Ferrari 458 Italia, BMW E36 M3, BMW X6 M Competition, Porsche 911 (930) Turbo, Nissan Skyline R34 GT-R, Toyota AE86 Trueno, Lamborghini Aventador Roadster, Toyota Corolla KE80 or Lamborghini Urus. Change paint on eight models; the Urus keeps its source factory-yellow texture. Each has different acceleration, steering, road speed and off-road performance. Changing cars stops the car without ending the drive. Spend earned credits on three levels each of engine, brakes, tires and nitro for the selected car. Levels affect real acceleration (+6%/level), brake force (+10%), grip (+6%), boost recharge (+12%) and boosted top speed (+3%). Upgrades stay with their car. All nine cars are available from the start. Rewards include the advertised base, a time bonus up to $150 and a $100 collision-free delivery bonus. Failed/abandoned runs do not pay or spend credits. Repeat runs earn rewards and can improve saved personal bests.
- **O:** settings. Cycle Smooth / Performance / Clarity graphics, turn light traffic off or on, or change time of day. **Smooth is the default**, including migration from the previous expensive Clarity default. It starts at native CSS resolution, caps the framebuffer at 2.1 million pixels, omits full-world shadow passes and preserves nearby geometry. It measures delivered frame intervals once per second, targets 60 FPS, and reduces distant detail and resolution after sustained slow delivery. Recovery is gradual after 15 stable seconds to prevent repeated quality changes. Performance has a 1.4-million-pixel budget and shorter scenery range. Clarity is opt-in, with high-DPI rendering (4.2-million-pixel cap), 1024-pixel diffuse facade atlases and 2048-pixel sun shadows. Smooth/Performance use 512-pixel facade atlases. Soft local contact decals ground the player, buildings, trees and nearby pedestrians without another world-shadow render. Daylight, golden hour and blue hour have tuned sky/ground illumination, reflection strength, fog and exposure. Dielectric masonry, smoother facade glazing and restrained road-normal relief distinguish materials. The live FPS counter is visible while driving; settings also show mean frame time and the 95th percentile. These are measured frame intervals, not a guaranteed hardware-independent 60 FPS. **Start 60 Second Drive** begins a foreground rAF capture and returns to driving. The report records average FPS, P50/P95/P99, 1% lows, maximum frame time, >33/>50 ms frames, CPU wall time, render-submission time and average draws/triangles. JSON includes viewport/device-pixel ratio, quality/tier/resolution configurations and per-district results. Overlays and hidden tabs pause recording, with the first resume interval excluded; foreground stalls count in full. GPU time is not measured. Reports are downloadable and stay in memory for the session.

The city contains 489 buildings across 13 architectural types with 24 facade atlases. Brick, plaster and concrete photographs provide surface detail; four floors/bays per atlas vary frames, blinds, colour, weathering and night lighting. Separate roughness and relief masks keep window glass smoother than masonry. The city has 13 architectural types and 30 populated blocks. Street frontage includes balconies, brick lofts with fire escapes, Art Deco buildings, glass and round towers, motels, shops, warehouses, parking garages, houses and villas. Parks, a fountain plaza, parking lots, a service station, 989 street trees and bus shelters occupy the gaps. Another 515 storefront/garden details add cafe terraces, planters and bike racks at building entrances. The plaza fountain and fuel-station fixtures are solid. The coast has scattered hillside villas and low-rise hotels. Five beach recreation areas group umbrellas, loungers, towels, lifeguard towers, surfboards, surf-club kiosks, showers and volleyball courts. Four signed mountain viewpoints have gravel turnouts and footpaths; two have camping areas. Trees and rock outcrops stay beyond road shoulders and away from recreation areas. The hills have 830 regional pines and 130 birches, including denser groves along the pass, and textured two-cluster inland crowns. Rendered palms and city/inland trunks register matching collision shapes; vegetation placement also clears the full runway width. Gravel follows the terrain. Parked cars have marked bays. Major structures use oriented footprints, while rocks, tree trunks and fountains have circular collision shapes to avoid invisible square corners. Photographed sand and rock are blended into the ground by position/elevation. Pacific Beach now starts on the coast highway with the shore alongside.

Traffic contains 12 city cars and 6 highway cars. Cars follow rounded right-hand lanes in both directions, slow for corners and vehicles ahead, obey alternating junction signals, and brake for the player. All simulation stops in pause, map, help, garage, jobs and settings panels. A small fleet is used intentionally. The fleet has six original silhouettes: hatchback, sedan, SUV, sports coupe, pickup and panel van. Each has different proportions, glazing, trim and wheelbase. Tires roll and front wheels steer through bends. Moving and parked cars use 48 close-detail material batches plus six cheaper silhouette batches. Full detail blends into the cheaper model over 120–160 m; moving vehicles remain visible to 420 m and parked vehicles to 220 m. Unchanged parked matrices remain cached. Signal colours update only when their phase changes. The main player vehicle has distance-driven tire rolling, Ackermann front-wheel angles, non-rotating brake assemblies, brake lights and subtle suspension movement. A/D steers the wheels at rest; the body only turns while moving. Wheelbase and visible steering request a yaw rate that is limited by tire grip, with a short response time and quick self-centering. This keeps keyboard steering clear without allowing unlimited lateral acceleration. Coasting uses rolling/aerodynamic resistance instead of heavy automatic braking. S brakes first, pauses 0.28 seconds at rest, then selects reverse; reverse is capped at 9 m/s. Slopes affect speed, road crests allow small gravity-driven flights, and landing restores grounded movement. Static contacts remove velocity into the obstacle while keeping tangential sliding. Asphalt, pavement and courtyard driving heights match their visible surfaces; moving and parked wheel heights also match the road and parking pads. Traffic uses oriented vehicle footprints from the shared fleet dimensions, with similar sliding and height separation.

The population update adds 441 grouped neighbourhood, waterfront, airport and landscape details. All 30 block interiors now have activities or planting: courts, playgrounds, market stalls, garden beds, pergolas, bike shelters and service details. There are 214 parked cars in total (136 additional marked curb/lot spaces), while the moving fleet remains at 18. Two existing coastal vehicles start within sight of the beach approach. Curb bays reject crossing lanes. A pool of 618 pedestrian paths covers sidewalks, the coastal promenade, markets, pergolas and marina; only nearby people are drawn, using three instanced batches for bodies, heads and soft foot contacts. Eight additional crosswalk walkers bring the pool to 626. Crosswalk walkers wait for a sufficiently long red phase and use separate walking lanes. Nearby people turn their heads toward horns, gesture and take validated steps away from a predicted car approach, then return to their routes. Traffic anticipates crossing-player conflicts, yields to people still crossing and slows with a brief hazard-lamp response to a nearby horn. Their walking clock pauses with the driving simulation. Pedestrian impact gameplay is not implemented.

Shore-aligned planked decking replaces buried waterfront slabs. Eleven deck/access areas include the boardwalk, pier, marina spine/fingers and beach access paths. Visible deck heights agree with the driving surface, water recovery is suppressed on decking, railing junctions remain open, and boats sit on actual water. Promenade lamps/benches, planted dunes, coastal sidewalks/palms, freight containers/gantries, airport apron planes and a control tower give destinations their own use. The pass has continuous woodland edges: 830 regional pines and 130 birches in total, in addition to other inland/street vegetation. Trees clear buildings, viewpoint areas, boardwalks and road shoulders. Road junction detection also suppresses curb/guardrail strips across connecting roads. Small pavement steps no longer inject extreme launch velocities. Shader preparation has a six-second wait bound, and the first ready scene draws explicitly so background-tab animation suspension cannot leave a blank canvas.

Touch steering and pedals are provided on narrow screens. Physical phone controls have not been tested. The original three stunt tracks remain available through **Stunt Tracks**, or at `/stunts.html`.

## Verification

```sh
npm run check
npm test
```

The checks exercise the real game entrypoint with a stub renderer, including keyboard input, steering HUD, map, waypoint, district travel, help, pause/resume, lighting, garage, graphics settings, traffic toggle and canvas focus. A three-minute mixed traffic simulation checks all 18 vehicles stay on roads, clear static scenery and maintain separation, while the idle player remains stationary. Dedicated cases verify red/green stops, following, player braking, disabled collisions and car selection/recovery. Simulation checks drive the central avenue, Marina Drive, the complete 9.3 km coastal loop and 3.2 km hill pass without collisions or road gaps, using lower speeds for tight hairpins. They verify safe spawns, no automatic movement, W+A/W+D steering, solid buildings, water recovery, matching road/terrain heights and upward road faces. The legacy stunt-track and keyboard regression checks also run.

New checks verify wheel-first stationary steering, inside/outside wheel geometry, rear alignment, rolling distance, fixed brake assemblies, yaw/wheelbase consistency, reverse steering, engine RPM/gear changes, facade variants and regional road clearance. The actual Ferrari GLB is parsed in tests: 100,199 triangles plus a 242-triangle coupe roof/rear-glass addition, four live rolling wheels, two steering pivots, correct ground alignment, shared paint/brake materials and attribution metadata. The expanded GLB loads locally without a runtime Draco decoder. It was simplified offline from 358,788 triangles / 15.2 MB to 100,199 triangles / 4.1 MB using meshoptimizer v1.0; nodes, UVs, normals and wheel assemblies are retained. Normals influence the simplification, with a 0.006 relative error cap. It remains a self-contained asset; the loading screen reports progress and a fallback made from the same real-car geometry remains visible if the detailed download fails. Reselect the car to retry.

Static objects use a 240 m spatial index. Full nearby foliage and columns blend into simpler distant geometry; smaller street details have shorter visibility ranges while large architecture keeps its skyline range. Conservative camera-frustum culling omits instances behind the camera, with a 35 m margin for quick turns. Visibility buffers refresh after 8 m of travel, a camera turn, or an explicit spawn/quality change. Uploads cover only active buffer ranges, and bounding spheres are reused. Terrain remains tiled and cheap road/facade geometry remains merged by material. The actual 100,441-triangle player car retains its existing model, working wheels and material detail.

Parked traffic occupies cached prefixes in the close and distant fleet batches. Ordinary frames only update and upload nearby moving vehicles. Parked transforms are rebuilt after 8 m of movement or a night-lighting change. Traffic simulation reuses following targets and previous poses instead of allocating new arrays and objects every physics tick. Signal lamps use small circular faces instead of hundreds of tiny spheres. Road colour textures retain up to 8x anisotropic filtering; normal/roughness masks use up to 2x. Shaders are precompiled after local assets finish loading and before the loading screen closes. Driving remains a fixed 120 Hz simulation with interpolated rendering. Menus render at 15 Hz; paused/map/help/settings screens stop continuous scene rendering, and hidden tabs skip rendering.

Where EXT_clip_control is available, reverse depth preserves depth precision while allowing early depth rejection. Other devices retain logarithmic depth. Asphalt, lane paint and the player contact shadow choose polygon-offset direction from the active depth mode. Reversed depth uses a positive offset; forward/logarithmic depth uses a negative offset. This corrects the road turning into a pale concrete underlay in the distance after the Smooth update. A projection/depth regression reproduces the old cutoff around 40 m and checks visible surface ordering at 8–800 m in both modes, without adding geometry or draw calls. World-aligned asphalt UVs, raised/offset road markings, stabilized optional shadows, the fixed-FOV chase camera and interpolated steering/wheel roll remain in place.

The deterministic submission check (57-degree camera, 1.6 aspect, Smooth, initial traffic positions, active race marker 40 m ahead) reports scenery, traffic, nearby pedestrians and activity marker, without the player car or extra Clarity shadow passes:

| Camera | Activities update triangles / calls | Real-car update triangles / calls |
| --- | --- | --- |
| Downtown | 292,874 / 162 | 298,689 / 144 |
| Pacific Beach | 258,232 / 150 | 262,842 / 136 |
| Crestline Hills | 181,104 / 66 | 181,104 / 66 |

These are geometry submission counts, not measured GPU frame rates. All three checked views remain below the existing 320,000-triangle / 165-call scenery budgets. The framebuffer budgets and Smooth default remain in place. Distant vehicle batching offsets the cost of the added scenery and people. `check-district-life.mjs` checks all block scenes, clear pedestrian paths, safe curb bays, matching deck/render heights, marina openings, pier driving, floating boats, vegetation clearance and cached frozen pedestrian poses. The depth, frame-budget, handling, actual-model, audio, traffic, world and UI regressions also run. UI checks verify that the first ready scene renders without waiting for a foreground animation frame, and that both pedestrian and traffic clocks pause in overlays.

The activity suite also completes all six events through the real car integrator with only test-generated throttle/brake/steering inputs and no scenery collisions: Downtown dispatch 51.9 s, Coast courier 37.1 s, East Gate express 133.9 s, Avenue circuit 110.3 s, Pacific sprint 112.0 s and Crestline climb 109.0 s. These are deterministic simulation runs without live traffic, not human playtests or measured hardware FPS. Checks cover credits awarded once, ordered swept checkpoints, countdown restarts, stop requirements, penalties, timeouts, storage failure/corruption, per-car purchases and actual upgrade physics. The UI harness exercises accepting/abandoning jobs, pause/travel restrictions, purchasing a part, and a complete synthetic 60-second capture. Reaction tests cover signal waits, completed crossings, horn looks, path-safe avoidance and traffic yields.

Fresh live browser QA is unverified for this activities release: native Safari/Brave selection returned `cgWindowNotFound`, no browser provider was available and the in-app browser was unavailable. The local preview served HTTP 200. Previous static city/coast/hill inspection is historical and does not validate this UI/material pass. Physical phones, subjective handling/sound, GPU time and sustained device FPS remain unverified. Use the in-game 60-second capture on actual hardware; the automated checks and submission budgets do not establish a glitch-free or production-readiness guarantee.

## Files

- `dist/career.js`, `dist/career-ui.js`, `dist/career.css`, `dist/activity-view.js`: activity catalogue, deterministic job/race state, rewards, saved per-car tuning, board/HUD and ground-following markers.
- `dist/navigation.js`: connected sampled-road graph and shortest-road guidance.
- `dist/pedestrian-motion.js`: signal-controlled crossings, nearby reactions and validated avoidance.
- `dist/lighting.js`: lighting profiles and a single instanced building/tree contact pass.
- `dist/performance-capture.js`, `dist/performance-ui.js`: foreground frame capture, metrics, chart and report download.
- `scripts/check-career.mjs`, `scripts/check-reactions.mjs`, `scripts/check-capture.mjs`: activity/upgrade, reaction and capture checks.
- `dist/game.js`, `dist/index.html`, `dist/world-ui.css`: open-world app, map, HUD and responsive interface.
- `dist/world-data.js`: road network, terrain, districts, building/parked-car colliders, deck surfaces and spatial lookup.
- `dist/district-life.js`, `dist/pedestrians.js`: authored district scenes, parking, clear walking paths, waterfront layout and nearby animated pedestrian batches.
- `dist/world-view.js`, `dist/city-view.js`: roads, coast, water, varied architecture, populated blocks and street furniture; static facades are merged and repeated pieces use instancing.
- `dist/driving.js`: fixed-step manual driving, speed-sensitive steering, collision handling and recovery.
- `dist/vehicle-motion.js`, `dist/driving.js`: coherent steering, Ackermann wheel angles, distance-driven rolling, grip limits and manual control.
- `dist/engine-audio.js`: recorded engine loop, different vehicle voices, bounded effects, spatial passing traffic, surface noise and immediate pause/mute behavior.
- `dist/region-data.js`, `dist/region-view.js`: beach/mountain destinations and road-clear regional placements.
- `dist/facade-materials.js`: photographic facade atlases, roughness, relief and night window maps.
- `dist/vehicles.js`, `dist/sports-car.js`: nine actual model loaders, bounded detailed-car residency, and independent steering/rolling pivots. `vehicle-data.js` contains arcade handling profiles and source identities; `real-car-specs.js` stores measured mesh dimensions.
- `dist/traffic.js`, `dist/traffic-view.js`, `dist/fleet-data.js`, `dist/traffic-models.js`: fixed-step traffic simulation and six lightweight animated fleet models.
- `dist/world-streaming.js`, `dist/render-quality.js`: spatial instance visibility, material batching, distance fading, terrain sectors, pixel budgets and stable shadows.
- `dist/street-details.js`: shared visual/collision layout for storefront and garden details.
- `scripts/stamp-release.mjs`: gives the complete local ESM graph one release key to prevent stale modules from mixing; run with a new release ID before a new update.
- `scripts/optimize-car.mjs`: offline GLB preparation; pass the official meshoptimizer v1.0 `meshopt_simplifier.js` module path. This is not needed to run the game.
- `dist/assets.js`, `dist/assets/`: local PBR texture and HDR loading with startup fallbacks; source/license information in `dist/assets/CREDITS.md` and `/credits.html`.
- `dist/car.js`, `dist/controls.js`: retained stunt car, fallback reflections and shared keyboard input.
- `dist/stunts.html`, `dist/stunt.js`, `dist/tracks.js`, `dist/physics.js`, `dist/style.css`: retained stunt mode.
- `scripts/check-realism.mjs`, `scripts/check-city.mjs`, `scripts/check-traffic.mjs`, `scripts/check-world.mjs`, `scripts/check-world-ui.mjs`: world and entrypoint checks.
- `scripts/serve.mjs`: local static server.

Engine audio by domasx2 is CC0; see `dist/assets/audio/CREDITS.md`.

All runtime resources ship under `dist/`. Three.js 0.180.0 is distributed under the MIT license; Barlow fonts use the SIL Open Font License. Their licenses are in `dist/vendor/`. Poly Haven environment assets are CC0; see `dist/assets/CREDITS.md`. Car-model attribution, creator links, thumbnail credits and modifications are in `dist/assets/cars/ATTRIBUTION.md` and `/credits.html`.

## Real-car collection

The nine-car garage uses self-contained local GLBs. Only the selected detailed
model downloads, and at most three detailed cars stay resident. Rapid selection
changes cancel the old fetch; inactive cars can return to their matching real
mesh fallback without disposing shared traffic geometry. Existing `touring`
and `trail` save IDs now select the BMW M3 and X6, preserving paints/upgrades.
Every car supports the same four upgrade types. Handling and engine pitch are
balanced arcade profiles, not manufacturer performance specifications.

All 18 moving vehicles and 214 parked vehicles use the eight added licensed
models. The heavier Ferrari stays in the playable collection. NPC bodies are
baked and instanced by model/material; tires roll by travel distance and front
wheels steer independently. Their close meshes are 2,064–3,362 triangles per
car. Seven distant meshes use 599–719 triangles; the BMW keeps its 3,362-triangle
close mesh in a single distant draw to preserve its roof and trim. Paint-mask
attributes keep rubber and glazing from inheriting the body paint colour.
The Ferrari loading fallback retains unsimplified exterior panels and real
wheel geometry rather than using the damaged aggressive LOD.

`scripts/prepare-real-cars.mjs` builds the new standard GLBs, measured specs,
colour-baked traffic meshes and `assets/cars/preparation.json` offline. Supply
an original-source directory (filenames from `assets/cars/sources.json`) and
official meshoptimizer v1.0 decoder/simplifier modules as its three arguments.
Python 3 + Pillow decode source base-colour images during preparation only.
`CAR_FILTER=<garage-id>` optionally regenerates one cached entry. The shipped
player models retain original embedded images/UVs and require no runtime
meshopt decoder. Negative-determinant node transforms reverse triangle winding
when flattened. Floors and detached props are removed and all four wheel
assemblies are independently rigged. License provenance includes source hashes.

`check-real-fleet.mjs` parses all nine shipping models, validates embedded
texture bytes, dimensions, four wheel pivots, stationary steering, rolling,
shared-resource safety, failed fetches, cancellation, cache eviction and
legacy/new save upgrades. It strips texture references for Node geometry tests;
those tests do not measure browser texture decoding or GPU frame rates.

Live checks for the real-car update used the native browser connection, moving
to Comet at the user's request. The garage's nine-card layout, textured BMW M3,
Urus and Skyline, steering pivots, and the BMW distant mesh were inspected.
Further GPU checks, physical phone input and a sustained 60 FPS driving capture
are not established by the isolated model viewer or automated tests.

## Axle steering and wheel finish

Normal driving now integrates a rear-axle bicycle model using each model's
measured wheelbase and axle offsets. The front axle sweeps into a turn while
the rear axle follows its own tighter arc; there is no independently filtered
travel heading that can slide the body away from the tire direction. Left and
right front tires use Ackermann angles with one instantaneous turning centre.
Keyboard rack response is smoothed, and the actual rack angle is limited by
speed, road grip and tire upgrades. That same angle drives physics and visible
steering. Steering airborne tires does not add a ground-contact yaw force.
Road handling adds a smooth game-tuned cornering allowance above 72 km/h,
reaching at most 60% extra allowance at 198 km/h. This prevents the previous
inverse-square steering clamp from leaving A/D ineffective at high speed.
High-speed keyboard engagement, opposite-lock response and self-centering are
quicker; low-speed turning and off-road grip keep their existing limits.
This allowance is arcade balancing, not measured manufacturer tire/downforce
data. The car and visible wheels still share one bounded axle trajectory.
This remains a browser kinematic/arcade model, not a complete tire-force or
suspension simulator. Background: [MathWorks Ackermann and bicycle kinematics](https://www.mathworks.com/help/robotics/ug/mobile-robot-kinematics-equations.html).

Each wheel accumulates its own signed travel from its contact-centre motion.
Changing the steering angle no longer rescales all previously travelled
kilometres into a different wheel-spin phase. Rendered spin uses the proper
wheel radius, wraps only its visible phase, interpolates between physics
steps, and reverses with the car. Traffic uses its actual route curvature,
independent inside/outside steering angles and four rolling histories too.

Player wheels retain their authored rim centres/spokes. Fragile source rubber
and outer fragments are replaced by round, grounded annular rubber shells,
with subdued tread bump and roughness. A radial rim blend reduces the visible
spoke strobing at road speed; this is a lightweight visual approximation.
Its opacity is capped at 52% so source spokes remain visible while rotating,
instead of becoming an almost opaque, apparently stationary disc at speed.
Traffic gets concentric round tires, rim lips, hubs and model-specific spoke
counts in its existing one-batch wheel geometry. Preparation JSON describes
the original baked assets; these wheel changes happen at runtime. Original
GLB files and creator credits are retained.

`check-axle-steering.mjs` tests all nine cars' rear contact-path alignment,
front-first displacement, fixed wheelbase, common Ackermann turn centre,
individual rolling distances, zero spin during stationary steering, high-speed
grip in both directions, airborne steering and integration step consistency.
It also requires useful heading changes at 160 km/h and near each car's boost
top speed, reversal within 200 ms, centering, visible rim detail, and bounded
road/off-road forces with stock and upgraded tires for all nine profiles.
The existing real entrypoint, three-minute traffic, all-six-activity, world,
collision, audio and source-model regressions also pass. Comet inspection used
an isolated test scene for stationary steering, a low-speed left turn and a
160 km/h right turn with actual physics and wheel metrics. Native W acceleration
followed by physical KeyA and KeyD input produced the correct opposite
inside/outside rolling histories. It is not a full-map
FPS benchmark or proof of full simulator fidelity.
High-speed follow-up inspection in Comet verified a right turn near 160 km/h,
then physical KeyA/KeyD input from 160/240 km/h starting speeds. The correct
outer wheels accumulated longer distances, the body followed the turn and
the wheels centered after release. The speed blend left the authored spokes
visible. These isolated checks do not measure full-map FPS.
