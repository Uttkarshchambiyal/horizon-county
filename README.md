# Horizon Track Club

A self-contained 3D arcade stunt racer. Three distinct elevated courses, real jump gaps and gravity, checkpoint recovery, rechargeable nitro, three chase cameras, synthesized engine audio, and locally saved personal-best times. No traffic.

## Play locally

Requires Node.js 20.11 or newer. No dependency installation is needed.

```sh
npm start
```

Open http://127.0.0.1:4173 and select a course. Hold W or Up to accelerate, A/D or Left/Right to steer, S or Down to brake, Shift for nitro, Space for tighter steering, R to reset at the last checkpoint (+3 seconds), C to switch cameras, and Esc or P to pause. M toggles audio. Phones have on-screen steering and pedals.

Carry speed onto the striped jump ramps and steer to line up the landing. Pass the three checkpoints and cross the finish line. Personal bests are stored in the current browser only.

## Courses

- **Skyline Circuit:** wide alpine track; 3 jumps; rookie steering assistance.
- **Canyon Launch:** red-rock scenery and elevation changes; 4 jumps.
- **Neon Heights:** a narrower city track at night; 5 jumps and tighter corners.

The handling is arcade style: track-local motion with assisted yaw and ballistic vertical motion. It is a single-player game, with no server, account, or leaderboard service.

## Verification

```sh
npm run check
npm test
```

The physics checks complete each course using the same simulation as the game, land all 12 jumps, verify all checkpoints, and test steering direction, braking, boost recharge, failed jumps, and checkpoint penalties. Browser inspection verified the WebGL scene, menu, car, race display, and live gameplay in Comet on macOS. Touch controls are implemented; physical phone testing was not performed.

## Files

- `dist/index.html`, `dist/style.css`: interface and responsive layouts.
- `dist/game.js`: 3D renderer, procedural car and scenery, audio, controls, and race flow.
- `dist/tracks.js`: editable courses, jump locations, palettes, and checkpoints.
- `dist/physics.js`: deterministic driving and jump simulation.
- `scripts/serve.mjs`: local static server.
- `scripts/check-physics.mjs`: physics verification.

All runtime resources are included under `dist/`. Three.js 0.180.0 is distributed under the MIT license; Barlow fonts use the SIL Open Font License. Their license files are in `dist/vendor/`. All car, course, and environment models are generated in code.
