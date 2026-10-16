# Horizon County

An original, self-contained 3D browser driving world with 36.7 km of connected roads, a downtown grid, Pacific Beach, a coastal highway, Crestline Hills, a harbor and an airfield. Explore freely in the manually controlled H-01 Clubsport, set map waypoints, travel between districts and discover six destinations. Includes building and parked-car collisions, off-road handling, water recovery, three cameras, three lighting presets, working headlight beams and synthesized engine audio.

This is a compact arcade browser world inspired by city-and-countryside driving games. It does not include GTA V's exact map, models, missions, pedestrians, moving traffic or building interiors. All world and vehicle models are generated locally in code. No account or server is needed; discoveries are saved in this browser only.

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

Touch steering and pedals are provided on narrow screens. Physical phone controls have not been tested. The original three stunt tracks remain available through **Stunt Tracks**, or at `/stunts.html`.

## Verification

```sh
npm run check
npm test
```

The checks exercise the real game entrypoint with a stub renderer, including keyboard input, steering HUD, map, waypoint, district travel, help, pause/resume, lighting and canvas focus. Simulation checks drive the central avenue, Marina Drive, the complete 9.3 km coastal loop and 3.2 km hill pass without collisions or road gaps. They verify safe spawns, no automatic movement, W+A/W+D steering, solid buildings, water recovery, matching road/terrain heights and upward road faces. The legacy stunt-track and keyboard regression checks also run.

Scene generation is checked without a GPU. Browser inspection confirmed the WebGL world, city buildings, car and mobile menu; desktop and physical-key browser verification were limited by the browser automation's viewport/input behavior. Physical-device and broad hardware performance testing remain outstanding.

## Files

- `dist/game.js`, `dist/index.html`, `dist/world-ui.css`: open-world app, map, HUD and responsive interface.
- `dist/world-data.js`: road network, terrain, districts, building/parked-car colliders and spatial lookup.
- `dist/world-view.js`: textured roads, buildings, coast, water, vegetation and street furniture; repeated objects use instancing.
- `dist/driving.js`: fixed-step manual driving, speed-sensitive steering, collision handling and recovery.
- `dist/car.js`, `dist/controls.js`: detailed car, reflections and shared keyboard input.
- `dist/stunts.html`, `dist/stunt.js`, `dist/tracks.js`, `dist/physics.js`, `dist/style.css`: retained stunt mode.
- `scripts/check-world.mjs`, `scripts/check-world-ui.mjs`: world and entrypoint checks.
- `scripts/serve.mjs`: local static server.

All runtime resources ship under `dist/`. Three.js 0.180.0 is distributed under the MIT license; Barlow fonts use the SIL Open Font License. Their licenses are in `dist/vendor/`.
