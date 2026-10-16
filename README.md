# Horizon Track Club

A self-contained 3D arcade stunt racer. Three distinct elevated courses, real jump gaps and gravity, checkpoint recovery, rechargeable nitro, three chase cameras, synthesized engine audio, and locally saved personal-best times. No traffic.

## Play locally

Requires Node.js 20.11 or newer. No dependency installation is needed.

```sh
npm start
```

Open http://127.0.0.1:4173 and select a course. Hold W or Up to accelerate, hold W+A / W+D (or Up+Left / Up+Right) to drive and steer, S or Down to brake (keep holding to reverse), Shift for nitro, Space for a tighter turn, R to reset at the last checkpoint (+3 seconds), C to switch cameras, and Esc or P to pause. M toggles audio. Phones have on-screen steering and pedals.

Carry speed onto the striped jump ramps and steer to line up the landing. Pass the three checkpoints and cross the finish line. Personal bests are stored in the current browser only.

## Courses

- **Skyline Circuit:** wide alpine track; 3 jumps; wide corners for learning manual steering.
- **Canyon Launch:** red-rock scenery and elevation changes; 4 jumps.
- **Neon Heights:** a narrower city track at night; 5 jumps and tighter corners.

The handling is fully manual arcade driving in world space, with speed-sensitive steering and ballistic vertical motion. There is no automatic acceleration, lane centering, or corner following. A/D steers the wheels and changes direction while the car is moving. The car stays still until you accelerate; releasing the throttle coasts to a stop. Limited driver-controlled air steering helps line up jumps. It is a single-player game, with no server, account, or leaderboard service.

## Verification

```sh
npm run check
npm test
```

Keyboard regression checks hold W+A and W+D through the actual input controller and driving simulation, verify missing key-code fallbacks, and restore held keys after focus changes. The game focuses its canvas on start/resume; pressed keys and steering direction appear on the HUD.

The physics checks use a test-only driver to complete each course with explicit steering, land all 12 jumps, and verify all checkpoints. They also check no idle creep, no automatic turning, throttle release, reverse and reverse steering, smooth steering response, braking, boost recharge, failed jumps, and checkpoint penalties. Browser inspection verifies the WebGL scene, menu, new car, race display, W acceleration, S reverse, and D steering in Comet on macOS. The latest keyboard focus repair is verified by the shared-controller regression checks; live browser key presses could not be reverified because the browser automation stopped accepting input. Touch controls are implemented; physical phone testing was not performed.

## Files

- `dist/index.html`, `dist/style.css`: interface and responsive layouts.
- `dist/game.js`: renderer, scenery, audio, controls, race flow, and interpolated rendering at a fixed 120 Hz physics step. Repeated scenery is instanced and HUD updates run at 30 Hz.
- `dist/controls.js`: shared keyboard mapping, simultaneous held-key state, and key-code fallbacks.
- `dist/car.js`: curved body panels, clearcoat paint and environment reflections, detailed wheels and brake calipers, LED lights, glass, trim, and animated steering.
- `dist/tracks.js`: editable courses, jump locations, palettes, and checkpoints.
- `dist/physics.js`: deterministic driving and jump simulation.
- `scripts/serve.mjs`: local static server.
- `scripts/check-physics.mjs`: physics verification.

All runtime resources are included under `dist/`. Three.js 0.180.0 is distributed under the MIT license; Barlow fonts use the SIL Open Font License. Their license files are in `dist/vendor/`. All car, course, and environment models are generated in code.
