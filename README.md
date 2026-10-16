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
- **O:** settings. Cycle Smooth / Performance / Clarity graphics, turn light traffic off or on, or change time of day. **Smooth is the default**, including migration from the previous expensive Clarity default. It starts at native CSS resolution, caps the framebuffer at 2.1 million pixels, omits full-world shadow passes and preserves nearby geometry. It measures delivered frame intervals once per second, targets 60 FPS, and reduces distant detail and resolution after sustained slow delivery. Recovery is gradual after 15 stable seconds to prevent repeated quality changes. Performance has a 1.4-million-pixel budget and shorter scenery range. Clarity is opt-in, with high-DPI rendering (4.2-million-pixel cap), 1024-pixel diffuse facade atlases and 2048-pixel sun shadows. Smooth/Performance use 512-pixel facade atlases. A soft contact shadow grounds the player car in the smooth presets. The live FPS counter is visible while driving; settings also show mean frame time and the 95th percentile. These are measured frame intervals, not a guaranteed hardware-independent 60 FPS.

The city contains 489 buildings across 13 architectural types with 24 facade atlases. Brick, plaster and concrete photographs provide surface detail; four floors/bays per atlas vary frames, blinds, colour, weathering and night lighting. Separate roughness and relief masks keep window glass smoother than masonry. The city has 13 architectural types and 30 populated blocks. Street frontage includes balconies, brick lofts with fire escapes, Art Deco buildings, glass and round towers, motels, shops, warehouses, parking garages, houses and villas. Parks, a fountain plaza, parking lots, a service station, 989 street trees and bus shelters occupy the gaps. Another 515 storefront/garden details add cafe terraces, planters and bike racks at building entrances. The plaza fountain and fuel-station fixtures are solid. The coast has scattered hillside villas and low-rise hotels. Five beach recreation areas group umbrellas, loungers, towels, lifeguard towers, surfboards, surf-club kiosks, showers and volleyball courts. Four signed mountain viewpoints have gravel turnouts and footpaths; two have camping areas. Trees and rock outcrops stay beyond road shoulders and away from recreation areas. The hills have 470 regional pines, including denser groves along the pass, and textured two-cluster inland crowns. Rendered palms and city/inland trunks register matching collision shapes; vegetation placement also clears the full runway width. Gravel follows the terrain. Parked cars have marked bays. Major structures use oriented footprints, while rocks, tree trunks and fountains have circular collision shapes to avoid invisible square corners. Photographed sand and rock are blended into the ground by position/elevation. Pacific Beach now starts on the coast highway with the shore alongside.

Traffic contains 12 city cars and 6 highway cars. Cars follow rounded right-hand lanes in both directions, slow for corners and vehicles ahead, obey alternating junction signals, and brake for the player. All simulation stops in pause, map, help, garage and settings panels. A small fleet is used intentionally. The fleet has six original silhouettes: hatchback, sedan, SUV, sports coupe, pickup and panel van. Each has different proportions, glazing, trim and wheelbase. Tires roll and front wheels steer through bends. Moving and parked cars share 48 small instanced material batches, with only vehicles within 420 m / 300 m submitted; unchanged parked matrices remain cached. Signal colours update only when their phase changes. The main player vehicle has distance-driven tire rolling, Ackermann front-wheel angles, non-rotating brake assemblies, brake lights and subtle suspension movement. A/D steers the wheels at rest; the body only turns while moving. Wheelbase and visible steering request a yaw rate that is limited by tire grip, with a short response time and quick self-centering. This keeps keyboard steering clear without allowing unlimited lateral acceleration. Coasting uses rolling/aerodynamic resistance instead of heavy automatic braking. S brakes first, pauses 0.28 seconds at rest, then selects reverse; reverse is capped at 9 m/s. Slopes affect speed, road crests allow small gravity-driven flights, and landing restores grounded movement. Static contacts remove velocity into the obstacle while keeping tangential sliding. Asphalt, pavement and courtyard driving heights match their visible surfaces; moving and parked wheel heights also match the road and parking pads. Traffic uses oriented vehicle footprints from the shared fleet dimensions, with similar sliding and height separation.

Touch steering and pedals are provided on narrow screens. Physical phone controls have not been tested. The original three stunt tracks remain available through **Stunt Tracks**, or at `/stunts.html`.

## Verification

```sh
npm run check
npm test
```

The checks exercise the real game entrypoint with a stub renderer, including keyboard input, steering HUD, map, waypoint, district travel, help, pause/resume, lighting, garage, graphics settings, traffic toggle and canvas focus. A three-minute mixed traffic simulation checks all 18 vehicles stay on roads, clear static scenery and maintain separation, while the idle player remains stationary. Dedicated cases verify red/green stops, following, player braking, disabled collisions and car selection/recovery. Simulation checks drive the central avenue, Marina Drive, the complete 9.3 km coastal loop and 3.2 km hill pass without collisions or road gaps, using lower speeds for tight hairpins. They verify safe spawns, no automatic movement, W+A/W+D steering, solid buildings, water recovery, matching road/terrain heights and upward road faces. The legacy stunt-track and keyboard regression checks also run.

New checks verify wheel-first stationary steering, inside/outside wheel geometry, rear alignment, rolling distance, fixed brake assemblies, yaw/wheelbase consistency, reverse steering, engine RPM/gear changes, facade variants and regional road clearance. The actual Ferrari GLB is parsed in tests: 100,199 triangles plus a 242-triangle coupe roof/rear-glass addition, four live rolling wheels, two steering pivots, correct ground alignment, shared paint/brake materials and attribution metadata. The expanded GLB loads locally without a runtime Draco decoder. It was simplified offline from 358,788 triangles / 15.2 MB to 100,199 triangles / 4.1 MB using meshoptimizer v1.0; nodes, UVs, normals and wheel assemblies are retained. Normals influence the simplification, with a 0.006 relative error cap. It remains a self-contained asset; the loading screen reports progress and a procedural fallback remains available if loading fails.

Static objects use a 240 m spatial index. Full nearby foliage and columns blend into simpler distant geometry; smaller street details have shorter visibility ranges while large architecture keeps its skyline range. Conservative camera-frustum culling omits instances behind the camera, with a 35 m margin for quick turns. Visibility buffers refresh after 8 m of travel, a camera turn, or an explicit spawn/quality change. Uploads cover only active buffer ranges, and bounding spheres are reused. Terrain remains tiled and cheap road/facade geometry remains merged by material. The actual 100,441-triangle player car retains its existing model, working wheels and material detail. No world assets or collision shapes were deleted.

Parked traffic occupies a cached prefix in the existing 48 fleet batches. Ordinary frames only update and upload nearby moving vehicles. Parked transforms are rebuilt after 8 m of movement or a night-lighting change. Traffic simulation reuses following targets and previous poses instead of allocating new arrays and objects every physics tick. Signal lamps use small circular faces instead of hundreds of tiny spheres. Road colour textures retain up to 8x anisotropic filtering; normal/roughness masks use up to 2x. Shaders are precompiled after local assets finish loading and before the loading screen closes. Driving remains a fixed 120 Hz simulation with interpolated rendering. Menus render at 15 Hz; paused/map/help/settings screens stop continuous scene rendering, and hidden tabs skip rendering.

Where EXT_clip_control is available, reverse depth preserves depth precision while allowing early depth rejection. Other devices retain logarithmic depth. World-aligned asphalt UVs, raised/offset road markings, stabilized optional shadows, the fixed-FOV chase camera and interpolated steering/wheel roll remain in place.

The deterministic submission check (57-degree camera, 1.6 aspect, Smooth, initial traffic positions) reports scenery and traffic only, without the player car or extra Clarity shadow passes:

| Camera | Previous release triangles / calls | Smooth update triangles / calls |
| --- | --- | --- |
| Downtown | 644,608 / 146 | 284,568 / 155 |
| Pacific Beach | 472,146 / 140 | 238,794 / 142 |
| Crestline Hills | 272,340 / 48 | 143,948 / 52 |

These are geometry submission counts, not measured GPU frame rates. Downtown scenery submits 56% fewer triangles. On a 1440 x 900 Retina display, the default framebuffer drops from 5,184,000 to 1,296,000 pixels (75% fewer), and Smooth removes the additional sun-shadow pass. A few additional foliage LOD batches trade draw calls for lower geometry work. `check-performance.mjs` enforces scene/fleet budgets, finite vertices/transforms, cached parked buffers, distant fleet culling, beach grouping and road clearance. `check-frame-budget.mjs` uses synthetic frame traces to verify slowdown response, conservative recovery, FPS/stall accounting, pixel caps, camera-turn/reverse-depth culling, buffer reuse and full nearby geometry. Synthetic 60 Hz timing inputs do not establish that a GPU runs this game at 60 FPS. Existing handling, audio, actual-model, traffic, world and UI regressions still run. The UI integration check also verifies stopped rendering in settings and live FPS output from its synthetic clock.

Live browser verification of this update was blocked by a macOS ScreenCaptureKit capture failure (-3811). The local HTTP preview returned 200; syntax, scene-generation and simulation tests cover the implementation, but actual GPU FPS, visual transitions and physical phones remain unverified in this run. Use the visible in-game counter for the frame rate on your device. A broad production-readiness or glitch-free guarantee would require hands-on testing across hardware.

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
