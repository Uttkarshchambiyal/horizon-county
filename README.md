# Horizon County

An original, self-contained 3D browser driving world with 36.7 km of connected roads, a downtown grid, Pacific Beach, a coastal highway, Crestline Hills, a harbor and an airfield. Drive a detailed Ferrari 458 Italia, touring sedan or SUV, then explore with fully manual WASD controls. Light two-way traffic brings the city and coastal highway to life. Set map waypoints, travel between districts and discover six destinations. Includes building, parked-car and moving-car collisions, off-road handling, water recovery, three cameras, three lighting presets, headlight beams and recorded engine audio with RPM, shifts, wind and tire effects.

This is a compact arcade browser world inspired by city-and-countryside driving games. The map, touring sedan and SUV designs are original; the Ferrari 458 Italia is a credited external model by vicent091036 (CC BY 4.0). Photographed road/ground materials and an outdoor HDR reflection environment are included locally. This is an arcade browser game with a compact map; missions, pedestrians and building interiors are outside its current scope. No account or game backend is needed; the garage, paint, settings and discoveries are saved in this browser only.

## Play locally

Requires Node.js 20.11 or newer. No dependency installation is needed.

```sh
npm start
```

Open http://127.0.0.1:4173, choose a starting district, then select **Start Driving**. All three starting districts share the same map.

- **W / Up:** accelerate. **A / D** or **Left / Right:** steer while moving. Hold W+A or W+D together to turn.
- **S / Down:** brake; keep holding after stopping to reverse.
- **Shift:** rechargeable nitro. **Space:** handbrake.
- **M:** full map; click land to set a waypoint or use district buttons to travel.
- **R:** return to the last safe road position. Water also recovers the car after a short delay.
- **C:** cycle four cameras, including a close front-wheel view. **L:** headlights. **V:** sound. **Esc / P:** pause.
- Use the time-of-day button for golden hour, daylight or blue hour.

- **G:** garage. Choose Ferrari 458 Italia, T-04 Meridian or R-09 Summit and change paint. Each has different acceleration, steering, road speed and off-road performance. Changing cars stops the car without ending the drive.
- **O:** settings. Cycle Auto / Quality / Performance graphics, turn light traffic off or on, or change time of day. Auto adjusts render resolution from measured frame rate; Performance disables sun shadows. These are rendering choices, not a guarantee of 60 FPS on every device.

The city contains 489 buildings across 13 architectural types with 24 facade atlases. Brick, plaster and concrete photographs provide surface detail; four floors/bays per atlas vary frames, blinds, colour, weathering and night lighting. Separate roughness and relief masks keep window glass smoother than masonry. The city has 13 architectural types and 30 populated blocks. Street frontage includes balconies, brick lofts with fire escapes, Art Deco buildings, glass and round towers, motels, shops, warehouses, parking garages, houses and villas. Parks, a fountain plaza, parking lots, a service station, 989 street trees and bus shelters occupy the gaps. The plaza fountain and fuel-station fixtures are solid. The coast has scattered hillside villas and low-rise hotels. Beach details include umbrellas, loungers, towels, lifeguard towers, surfboards, a kiosk, showers and volleyball courts. The ridge has lookouts, cabins, tents, picnic areas, trail signs, 288 pines and 88 rock outcrops. Regional placements clear road lanes, and major structures are solid. Photographed sand and rock are blended into the ground by position/elevation. Pacific Beach now starts on the coast highway with the shore alongside.

Traffic contains 12 city cars and 6 highway cars. Cars follow rounded right-hand lanes in both directions, slow for corners and vehicles ahead, obey alternating junction signals, and brake for the player. All simulation stops in pause, map, help, garage and settings panels. A small fleet is used intentionally. Traffic uses 21 instanced vehicle material batches plus two signal batches; parked vehicles share those batches. The main player vehicle has distance-driven tire rolling, Ackermann front-wheel angles, non-rotating brake assemblies, brake lights and subtle suspension movement. A/D steers the wheels at rest; the body only turns while moving. A bicycle model derives yaw from speed, steering angle and wheelbase, with a lateral-grip limit at speed. Acceleration is more progressive, and reverse steering follows the same geometry.

Touch steering and pedals are provided on narrow screens. Physical phone controls have not been tested. The original three stunt tracks remain available through **Stunt Tracks**, or at `/stunts.html`.

## Verification

```sh
npm run check
npm test
```

The checks exercise the real game entrypoint with a stub renderer, including keyboard input, steering HUD, map, waypoint, district travel, help, pause/resume, lighting, garage, graphics settings, traffic toggle and canvas focus. A three-minute mixed traffic simulation checks all 18 vehicles stay on roads, clear static scenery and maintain separation, while the idle player remains stationary. Dedicated cases verify red/green stops, following, player braking, disabled collisions and car selection/recovery. Simulation checks drive the central avenue, Marina Drive, the complete 9.3 km coastal loop and 3.2 km hill pass without collisions or road gaps, using lower speeds for tight hairpins. They verify safe spawns, no automatic movement, W+A/W+D steering, solid buildings, water recovery, matching road/terrain heights and upward road faces. The legacy stunt-track and keyboard regression checks also run.

New checks verify wheel-first stationary steering, inside/outside wheel geometry, rear alignment, rolling distance, fixed brake assemblies, yaw/wheelbase consistency, reverse steering, engine RPM/gear changes, facade variants and regional road clearance. The actual Ferrari GLB is parsed in tests: 358,788 triangles, four live rolling wheels, two steering pivots, correct ground alignment, shared paint/brake materials and attribution metadata. The expanded GLB loads locally without a runtime Draco decoder. It is approximately 15 MB; the loading screen reports progress and a procedural fallback remains available if loading fails.

Safari preview inspection in the previous pass confirmed the rendered Ferrari, denser downtown street frontage, traffic, road surfaces and menu/driving HUD. A first frame is rendered explicitly during scene synchronization so background-tab animation throttling does not leave the canvas blank. This pass also reached a live Safari drive with RPM telemetry and an active audio context; capture/input synchronization prevented a complete final visual/audio-quality audit. Later native captures intermittently failed with a ScreenCaptureKit stream error. Native background keyboard input, physical phones and broad hardware frame-rate testing remain unverified. This is a compact arcade browser world with a Los Angeles-inspired urban/coastal character, rather than a claim to reproduce GTA V's complete map or production systems.

## Files

- `dist/game.js`, `dist/index.html`, `dist/world-ui.css`: open-world app, map, HUD and responsive interface.
- `dist/world-data.js`: road network, terrain, districts, building/parked-car colliders and spatial lookup.
- `dist/world-view.js`, `dist/city-view.js`: roads, coast, water, varied architecture, populated blocks and street furniture; static facades are merged and repeated pieces use instancing.
- `dist/driving.js`: fixed-step manual driving, speed-sensitive steering, collision handling and recovery.
- `dist/vehicle-motion.js`, `dist/driving.js`: coherent steering, Ackermann wheel angles, distance-driven rolling, grip limits and manual control.
- `dist/engine-audio.js`: local recorded engine loop, rev/shift response, different vehicle voices, wind, tire noise and immediate pause/mute behavior.
- `dist/region-data.js`, `dist/region-view.js`: beach/mountain destinations and road-clear regional placements.
- `dist/facade-materials.js`: photographic facade atlases, roughness, relief and night window maps.
- `dist/vehicles.js`, `dist/sports-car.js`: original sedan/SUV and fallback models, handling specifications, and the detailed Ferrari loader with animated wheel pivots.
- `dist/traffic.js`, `dist/traffic-view.js`: fixed-step lane/signal/following simulation, moving-car collisions and instanced fleet rendering.
- `dist/assets.js`, `dist/assets/`: local PBR texture and HDR loading with startup fallbacks; source/license information in `dist/assets/CREDITS.md` and `/credits.html`.
- `dist/car.js`, `dist/controls.js`: retained stunt car, fallback reflections and shared keyboard input.
- `dist/stunts.html`, `dist/stunt.js`, `dist/tracks.js`, `dist/physics.js`, `dist/style.css`: retained stunt mode.
- `scripts/check-realism.mjs`, `scripts/check-city.mjs`, `scripts/check-traffic.mjs`, `scripts/check-world.mjs`, `scripts/check-world-ui.mjs`: world and entrypoint checks.
- `scripts/serve.mjs`: local static server.

Engine audio by domasx2 is CC0; see `dist/assets/audio/CREDITS.md`.

All runtime resources ship under `dist/`. Three.js 0.180.0 is distributed under the MIT license; Barlow fonts use the SIL Open Font License. Their licenses are in `dist/vendor/`. Poly Haven environment assets are CC0; see `dist/assets/CREDITS.md`. Ferrari attribution and modifications are in `dist/assets/cars/ATTRIBUTION.md` and `/credits.html`.
