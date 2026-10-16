# Horizon County

An original, self-contained 3D browser driving world with 36.7 km of connected roads, a downtown grid, Pacific Beach, a coastal highway, Crestline Hills, a harbor and an airfield. Choose a sports coupe, touring sedan or SUV, then explore with fully manual WASD controls. Light two-way traffic brings the city and coastal highway to life. Set map waypoints, travel between districts and discover six destinations. Includes building, parked-car and moving-car collisions, off-road handling, water recovery, three cameras, three lighting presets, headlight beams and synthesized engine audio.

This is a compact arcade browser world inspired by city-and-countryside driving games. The map and vehicle designs are original. Photographed road/ground materials and an outdoor HDR reflection environment are included locally. This is an arcade browser game with a compact map; missions, pedestrians and building interiors are outside its current scope. No account or game backend is needed; the garage, paint, settings and discoveries are saved in this browser only.

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
- **C:** cycle three cameras. **L:** headlights. **V:** sound. **Esc / P:** pause.
- Use the time-of-day button for golden hour, daylight or blue hour.

- **G:** garage. Choose H-01 Clubsport, T-04 Meridian or R-09 Summit and change paint. Each has different acceleration, steering, road speed and off-road performance. Changing cars stops the car without ending the drive.
- **O:** settings. Cycle Auto / Quality / Performance graphics, turn light traffic off or on, or change time of day. Auto adjusts render resolution from measured frame rate; Performance disables sun shadows. These are rendering choices, not a guarantee of 60 FPS on every device.

Traffic contains 12 city cars and 6 highway cars. Cars follow rounded right-hand lanes in both directions, slow for corners and vehicles ahead, obey alternating junction signals, and brake for the player. All simulation stops in pause, map, help, garage and settings panels. A small fleet is used intentionally. Traffic uses 21 instanced vehicle material batches plus two signal batches; parked vehicles share those batches. The main player vehicle has animated wheels, steering pivots, brake lights and body lean.

Touch steering and pedals are provided on narrow screens. Physical phone controls have not been tested. The original three stunt tracks remain available through **Stunt Tracks**, or at `/stunts.html`.

## Verification

```sh
npm run check
npm test
```

The checks exercise the real game entrypoint with a stub renderer, including keyboard input, steering HUD, map, waypoint, district travel, help, pause/resume, lighting, garage, graphics settings, traffic toggle and canvas focus. A three-minute mixed traffic simulation checks all 18 vehicles stay on roads, clear static scenery and maintain separation, while the idle player remains stationary. Dedicated cases verify red/green stops, following, player braking, disabled collisions and car selection/recovery. Simulation checks drive the central avenue, Marina Drive, the complete 9.3 km coastal loop and 3.2 km hill pass without collisions or road gaps. They verify safe spawns, no automatic movement, W+A/W+D steering, solid buildings, water recovery, matching road/terrain heights and upward road faces. The legacy stunt-track and keyboard regression checks also run.

Scene generation and model geometry are checked without a GPU. The local preview returns HTTP 200. Visual verification of this traffic/garage update was blocked by the native browser capture service failing with a ScreenCaptureKit audio/video stream error. Automated checks do not establish GPU shader correctness, physical phone controls, broad browser support or hardware frame rates. Those runtime checks remain outstanding; this work should not be described as a fully production-certified game.

## Files

- `dist/game.js`, `dist/index.html`, `dist/world-ui.css`: open-world app, map, HUD and responsive interface.
- `dist/world-data.js`: road network, terrain, districts, building/parked-car colliders and spatial lookup.
- `dist/world-view.js`: textured roads, buildings, coast, water, vegetation and street furniture; repeated objects use instancing.
- `dist/driving.js`: fixed-step manual driving, speed-sensitive steering, collision handling and recovery.
- `dist/vehicles.js`: three original vehicle models, wheel/detail construction and handling specifications.
- `dist/traffic.js`, `dist/traffic-view.js`: fixed-step lane/signal/following simulation, moving-car collisions and instanced fleet rendering.
- `dist/assets.js`, `dist/assets/`: local PBR texture and HDR loading with startup fallbacks; source/license information in `dist/assets/CREDITS.md` and `/credits.html`.
- `dist/car.js`, `dist/controls.js`: retained stunt car, fallback reflections and shared keyboard input.
- `dist/stunts.html`, `dist/stunt.js`, `dist/tracks.js`, `dist/physics.js`, `dist/style.css`: retained stunt mode.
- `scripts/check-traffic.mjs`, `scripts/check-world.mjs`, `scripts/check-world-ui.mjs`: world and entrypoint checks.
- `scripts/serve.mjs`: local static server.

All runtime resources ship under `dist/`. Three.js 0.180.0 is distributed under the MIT license; Barlow fonts use the SIL Open Font License. Their licenses are in `dist/vendor/`. Poly Haven environment assets are CC0; see `dist/assets/CREDITS.md`.
