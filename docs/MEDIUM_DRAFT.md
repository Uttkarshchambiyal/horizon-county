# Horizon County: a small open world, built for the browser

*An original driving-game public beta with nine cars, short jobs and a reason to take the long way home.*

I’m sharing **Horizon County**, a 3D driving game you can open in your browser. Choose a car, take a delivery, chase a checkpoint time, or leave the jobs behind and explore the coast.

[Play Horizon County](https://horizon-drive-coast.uttkarshchambiyal.chatgpt.site)

The aim is a compact driving playground that gives each short session a direction. A connected road network links downtown streets, Pacific Beach, a coastal highway, mountain switchbacks, a harbor and an airfield. The map is original, with roughly 36.7 km of roads.

## A reason to drive

Free roaming is part of the appeal, but a map becomes more interesting when there is something to do in it. The game has three delivery jobs and three checkpoint races. Deliveries ask you to stop inside pickup and drop-off rings. Races ask you to pass every checkpoint in order and improve your personal best.

Completing events earns credits for engine, brake, tire and nitro upgrades. Parts stay with the selected car. There are nine cars to try, including the Ferrari 458 Italia, Porsche 911 (930) Turbo, Nissan Skyline R34 GT-R and Lamborghini Aventador Roadster.

The beta adds **Today’s Drive**: one featured event rotates at midnight UTC, with an extra $300 reward for the first successful completion that day. Bronze, silver and gold medals make repeat runs worthwhile. Results include a copyable time and play link, so you can invite someone else to try the same event.

These are personal, browser-local results. There is no online leaderboard, account system or cloud save.

## Making the car respond

Steering has been one of the most important parts to improve. At low speed, the front wheels lead the turn and the rear follows a tighter axle path. At high speed, the earlier steering clamp made the front tires look almost straight and made direction changes feel weak.

The revised handling keeps visible front-wheel movement, responds more quickly to A/D, and lets sustained tight turns scrub speed. Each tire has its own rolling distance, and the inside and outside front wheels steer at different angles. This is deliberately an arcade driving model, with tire slip and bounded turning response; it is not a manufacturer-accurate vehicle simulator.

## Building for a browser

The game uses Three.js, local model and material assets, a fixed-step driving simulation, and batched scenery and traffic. Smooth graphics adapts distant detail and resolution to the frame budget. Performance and Clarity presets offer different tradeoffs.

An in-game 60-second performance capture reports measured frame times on the device running the game. A 60 FPS target is useful, but it is not a guarantee across every browser, phone or laptop.

The car models are credited external assets. The world layout, driving systems, activities and interface are part of this project. [The game credits](https://horizon-drive-coast.uttkarshchambiyal.chatgpt.site/credits.html) list the creators, sources and adaptations.

## Try the beta

For a first session, use a desktop browser with hardware acceleration:

1. Pick a district and select **Start Driving**.
2. Hold **W** to accelerate and **A/D** to steer. Hold **S** to brake, then reverse.
3. Open **J** for jobs and races, or **G** for the garage.
4. Try Today’s Drive, earn your first medal, and use the reward for an upgrade.

The optional driving guide walks through acceleration, turning and braking. Touch controls are included, but physical phone testing is still pending. Progress saves in the current browser; clearing site data removes it.

This is a public beta. The next improvements should come from actual driving feedback: which turns feel wrong, which event is worth replaying, and where performance drops. If you try it, include your browser, device, district and a short description of what happened when you share feedback.

[Take the open road →](https://horizon-drive-coast.uttkarshchambiyal.chatgpt.site)

---

Editorial note for the owner: this is an editable draft, not a published Medium post. Add real screenshots from the final build and your own account of the development process before publishing. Do not add a universal 60 FPS, glitch-free, multiplayer or GTA V map claim.
