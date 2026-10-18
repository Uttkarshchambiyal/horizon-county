# Horizon County public beta

Release: `launch-beta-13`. Prepared 18 October 2026.

Playable URL: https://horizon-drive-coast.uttkarshchambiyal.chatgpt.site

## Included in this release

- Responsive high-speed steering with visible front-wheel angles, tire compliance, quick reversal and gradual tight-turn speed scrub. Existing low-speed geometry is retained.
- Ferrari exterior panels, glass and rims restored from the original expanded model; a lightweight cabin and brake geometry keep the player model below the existing rendering budget.
- A daily featured event with an extra $300 reward once per UTC day and browser profile.
- Persistent personal-best medals, result-copy text and an optional three-step first-drive guide.
- Bounded optional-asset startup, download timeout/fallback, recoverable loading errors, dialog keyboard focus and public-beta metadata.

## Honest launch scope

This is an original single-player browser driving beta. It has nine selectable cars, six events, local upgrades, light traffic and exploration. It has no accounts, cloud saves, multiplayer or online ranking. Progress and daily claims are browser-local and depend on the device clock. Clearing browser data removes progress. The game is not affiliated with car manufacturers or GTA V.

The render presets target smoother delivery, but hardware-independent 60 FPS and glitch-free play are not established. Physical phone controls, broad browser compatibility and sustained full-map GPU performance require real-device testing. The shipping automated suite exercises simulation, assets and a stub-renderer UI harness; it is not a substitute for those checks.

## Verification recorded

`npm run check`, `npm test` and `git diff --check` pass for this release. Native Comet inspection verified the restored exterior panels and high-speed D input in the isolated driving scene. Later Comet capture failed, so final launch-screen visual inspection is incomplete. Automated entrypoint checks cover the daily board and tutorial; they do not prove final layout or full-map FPS.

## Release procedure

Run `npm run check`, `npm test` and `git diff --check`. Inspect the rendered menu, jobs board, tutorial and high-speed A/D handling in Comet. Retain source asset credits. Package the exact tested source through the Sites source helper and publish it to the existing site without changing its public audience. Remove the temporary handling-preview page before packaging.

For a wider announcement, collect one 60-second in-game performance report through downtown and one through the beach/hills on representative devices. Add actual build screenshots to `MEDIUM_DRAFT.md`, review its wording, then publish the article manually. The draft has not been sent or posted.

## Useful next additions

After feedback on this beta: a ghost of your best race, extra delivery routes, and photo mode would build on the existing driving loop. Prioritize whichever improves repeat play without increasing the world-rendering load substantially. These are roadmap ideas, not shipped features.
