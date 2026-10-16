# Horizon County

An original, self-contained 3D browser driving world with 36.7 km of connected roads, a downtown grid, Pacific Beach, a coastal highway, Crestline Hills, a harbor and an airfield. Drive a detailed Ferrari 458 Italia, touring sedan or SUV, then explore with fully manual WASD controls. Light two-way traffic brings the city and coastal highway to life. Set map waypoints, travel between districts and discover six destinations. Includes building, parked-car and moving-car collisions, off-road handling, water recovery, four cameras, three lighting presets, headlight beams and recorded engine audio with RPM, shifts, a horn, nitro, impacts, off-road tires and nearby traffic.

This is a compact arcade browser world inspired by city-and-countryside driving games. The map, touring sedan and SUV designs are original; the Ferrari 458 Italia is a credited external model by vicent091036 (CC BY 4.0). Photographed road/ground materials and an outdoor HDR reflection environment are included locally. This is an arcade browser game with a compact map; missions, pedestrians and building interiors are outside its current scope. No account or game backend is needed; the garage, paint, settings and discoveries are saved in this browser only.

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

- **G:** garage. Choose Ferrari 458 Italia, T-04 Meridian or R-09 Summit and change paint. Each has different acceleration, steering, road speed and off-road performance. Changing cars stops the car without ending the drive.
- **O:** settings. Cycle Clarity / Auto / Performance graphics, turn light traffic off or on, or change time of day. Clarity is the new default: up to 2x high-DPI rendering, a 1.25x minimum on standard desktop screens, 1024-pixel diffuse facade atlases and 2048-pixel sun shadows. Extra samples are bounded by a 6.3-million-pixel framebuffer budget; no mode undersamples CSS pixels. Auto adapts between one render pixel per CSS pixel and the device limit, with 1024-pixel shadows. Performance reduces scenery distance and disables sun shadows. Auto/Performance and narrow phones use 512-pixel facade atlases to reduce texture memory. These are rendering choices, not a guarantee of 60 FPS on every device.

The city contains 489 buildings across 13 architectural types with 24 facade atlases. Brick, plaster and concrete photographs provide surface detail; four floors/bays per atlas vary frames, blinds, colour, weathering and night lighting. Separate roughness and relief masks keep window glass smoother than masonry. The city has 13 architectural types and 30 populated blocks. Street frontage includes balconies, brick lofts with fire escapes, Art Deco buildings, glass and round towers, motels, shops, warehouses, parking garages, houses and villas. Parks, a fountain plaza, parking lots, a service station, 989 street trees and bus shelters occupy the gaps. Another 515 storefront/garden details add cafe terraces, planters and bike racks at building entrances. The plaza fountain and fuel-station fixtures are solid. The coast has scattered hillside villas and low-rise hotels. Five beach recreation areas group umbrellas, loungers, towels, lifeguard towers, surfboards, surf-club kiosks, showers and volleyball courts. Four signed mountain viewpoints have gravel turnouts and footpaths; two have camping areas. Trees and rock outcrops stay beyond road shoulders and away from recreation areas. The hills have 470 regional pines, including denser groves along the pass, and textured two-cluster inland crowns. Rendered palms and city/inland trunks register matching collision shapes; vegetation placement also clears the full runway width. Gravel follows the terrain. Parked cars have marked bays. Major structures use oriented footprints, while rocks, tree trunks and fountains have circular collision shapes to avoid invisible square corners. Photographed sand and rock are blended into the ground by position/elevation. Pacific Beach now starts on the coast highway with the shore alongside.

Traffic contains 12 city cars and 6 highway cars. Cars follow rounded right-hand lanes in both directions, slow for corners and vehicles ahead, obey alternating junction signals, and brake for the player. All simulation stops in pause, map, help, garage and settings panels. A small fleet is used intentionally. The fleet has six original silhouettes: hatchback, sedan, SUV, sports coupe, pickup and panel van. Each has different proportions, glazing, trim and wheelbase. Tires roll and front wheels steer through bends. Moving and parked cars share 48 small instanced material batches, with only vehicles within 420 m / 300 m submitted. Signal colours update only when their phase changes. The main player vehicle has distance-driven tire rolling, Ackermann front-wheel angles, non-rotating brake assemblies, brake lights and subtle suspension movement. A/D steers the wheels at rest; the body only turns while moving. Wheelbase and visible steering request a yaw rate that is limited by tire grip, with a short response time and quick self-centering. This keeps keyboard steering clear without allowing unlimited lateral acceleration. Coasting uses rolling/aerodynamic resistance instead of heavy automatic braking. S brakes first, pauses 0.28 seconds at rest, then selects reverse; reverse is capped at 9 m/s. Slopes affect speed, road crests allow small gravity-driven flights, and landing restores grounded movement. Static contacts remove velocity into the obstacle while keeping tangential sliding. Asphalt, pavement and courtyard driving heights match their visible surfaces; moving and parked wheel heights also match the road and parking pads. Traffic uses oriented vehicle footprints from the shared fleet dimensions, with similar sliding and height separation.

Touch steering and pedals are provided on narrow screens. Physical phone controls have not been tested. The original three stunt tracks remain available through **Stunt Tracks**, or at `/stunts.html`.

## Verification

```sh
npm run check
npm test
```

The checks exercise the real game entrypoint with a stub renderer, including keyboard input, steering HUD, map, waypoint, district travel, help, pause/resume, lighting, garage, graphics settings, traffic toggle and canvas focus. A three-minute mixed traffic simulation checks all 18 vehicles stay on roads, clear static scenery and maintain separation, while the idle player remains stationary. Dedicated cases verify red/green stops, following, player braking, disabled collisions and car selection/recovery. Simulation checks drive the central avenue, Marina Drive, the complete 9.3 km coastal loop and 3.2 km hill pass without collisions or road gaps, using lower speeds for tight hairpins. They verify safe spawns, no automatic movement, W+A/W+D steering, solid buildings, water recovery, matching road/terrain heights and upward road faces. The legacy stunt-track and keyboard regression checks also run.

New checks verify wheel-first stationary steering, inside/outside wheel geometry, rear alignment, rolling distance, fixed brake assemblies, yaw/wheelbase consistency, reverse steering, engine RPM/gear changes, facade variants and regional road clearance. The actual Ferrari GLB is parsed in tests: 100,199 triangles plus a 242-triangle coupe roof/rear-glass addition, four live rolling wheels, two steering pivots, correct ground alignment, shared paint/brake materials and attribution metadata. The expanded GLB loads locally without a runtime Draco decoder. It was simplified offline from 358,788 triangles / 15.2 MB to 100,199 triangles / 4.1 MB using meshoptimizer v1.0; nodes, UVs, normals and wheel assemblies are retained. Normals influence the simplification, with a 0.006 relative error cap. It remains a self-contained asset; the loading screen reports progress and a procedural fallback remains available if loading fails.

Static objects use a 240 m spatial index. Only local instances are compacted into each shared GPU batch, with smaller scenery at 550–900 m and large architecture at 1900 m. Terrain is tiled; cheap road and facade geometry is merged by material. Visibility uploads happen after 2 m of travel or a forced quality/spawn change. Per-instance dither fading removes hard distance cutoffs. Logarithmic depth, world-aligned asphalt UVs, raised/offset markings and a texel-stabilized sun projection address surface and shadow shimmer. The chase camera follows chassis heading without steering-input sway, keeps a fixed driving field of view and uses a smaller collision probe. Wheel angle and tire roll interpolate with the body pose. This keeps draw calls low while reducing distant foliage and trim. The directional shadow pass is limited to batches with nearby instances, and hidden tabs skip rendering.

The deterministic submission check (57-degree camera, 1.6 aspect, Auto, initial traffic positions) reports scenery and traffic only, without the player car or extra shadow passes:

| Camera | Before triangles / calls | After triangles / calls |
| --- | --- | --- |
| Downtown | 1,755,432 / 240 | 644,608 / 146 |
| Pacific Beach | 1,745,684 / 219 | 472,146 / 140 |
| Crestline Hills | 1,598,644 / 95 | 272,340 / 48 |

These are geometry submission counts, not measured GPU frame rates. `check-performance.mjs` enforces scene/fleet budgets, finite vertices/transforms, distant fleet culling, beach seating groups, shoulder clearance and circular fountain corners. `check-handling.mjs` checks steering return, coasting, delayed reverse, grip limits, static/traffic sideswipes, crest gravity/landing, pixel-density floors and fading. `check-audio.mjs` checks the audio graph, effect cooldowns, passing-car pan/pitch, mute/pause and sample-loading fallback. All effects share a limiter and mute bus, and at most six transient effects plus two nearby traffic voices can run. Engine voices differ for the three garage cars; the sedan and SUV also have clearcoat paint and tread bump maps.

Safari visual inspection confirmed the closed-roof Ferrari, sharper downtown surfaces, mountain road grounding and the driving UI. The final mountain capture returned a small thumbnail, so dense-forest detail was also checked through scene generation and placement assertions. Native background key holds and animation sampling did not provide a reliable frame-rate or subjective listening audit. Physical phones and broad hardware testing remain unverified. This is a compact arcade browser world; a production-readiness or glitch-free guarantee requires broader hands-on testing.

## Files

- `dist/game.js`, `dist/index.html`, `dist/world-ui.css`: open-world app, map, HUD and responsive interface.
- `dist/world-data.js`: road network, terrain, districts, building/parked-car colliders and spatial lookup.
- `dist/world-view.js`, `dist/city-view.js`: roads, coast, water, varied architecture, populated blocks and street furniture; static facades are merged and repeated pieces use instancing.
- `dist/driving.js`: fixed-step manual driving, speed-sensitive steering, collision handling and recovery.
- `dist/vehicle-motion.js`, `dist/driving.js`: coherent steering, Ackermann wheel angles, distance-driven rolling, grip limits and manual control.
- `dist/engine-audio.js`: recorded engine loop, different vehicle voices, bounded effects, spatial passing traffic, surface noise and immediate pause/mute behavior.
- `dist/region-data.js`, `dist/region-view.js`: beach/mountain destinations and road-clear regional placements.
- `dist/facade-materials.js`: photographic facade atlases, roughness, relief and night window maps.
- `dist/vehicles.js`, `dist/sports-car.js`: original sedan/SUV and fallback models, handling specifications, and the detailed Ferrari loader with animated wheel pivots.
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

All runtime resources ship under `dist/`. Three.js 0.180.0 is distributed under the MIT license; Barlow fonts use the SIL Open Font License. Their licenses are in `dist/vendor/`. Poly Haven environment assets are CC0; see `dist/assets/CREDITS.md`. Ferrari attribution and modifications are in `dist/assets/cars/ATTRIBUTION.md` and `/credits.html`.
