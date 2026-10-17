# Ferrari 458 Italia

**Creator:** vicent091036

**Original model:** https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6

**Distributed source:** https://github.com/mrdoob/three.js/blob/r180/examples/models/gltf/ferrari.glb

**Credit in the official Three.js example:** https://threejs.org/examples/webgl_materials_car.html

**License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
https://creativecommons.org/licenses/by/4.0/

Three.js's media license inventory identifies this model as CC BY 4.0:
https://github.com/mrdoob/three.js/issues/23089

The original geometry has been expanded from Draco-compressed data into an
uncompressed, self-contained GLB. No external decoder or network service is
needed at runtime. The game adjusts body paint, glazing, lamps, placement and
wheel pivots, and adds arcade driving behavior. These adaptations are not an
endorsement by the model creator or vehicle manufacturer.

The geometry was also simplified offline using meshoptimizer v1.0 with normals as attributes, reducing it from 358,788 to 100,199 triangles. Nodes, materials, UVs and independent wheel assemblies are retained.

The expanded file retains attribution in its glTF asset extras. The world layout is an original code-generated design.

The current game also adds a lightweight painted coupe roof and rear glazing to close the open roof area. These are game-created additions and are not geometry supplied or endorsed by the original model creator. The game renders 100,441 triangles including these additions; the optimized GLB itself remains 100,199 triangles.

# Additional real-car models and traffic adaptations

All models below are Creative Commons Attribution 4.0 International (CC BY 4.0):
https://creativecommons.org/licenses/by/4.0/

## 1975 Porsche 911 (930) Turbo

Creator: [Lexyc16](https://sketchfab.com/Lexyc16)

Original: https://sketchfab.com/3d-models/porsche-911-930-turbo-1975-de1ffd344c41481892511f7fd332c136

Distributed source: https://raw.githubusercontent.com/pedrosoandre/carros/0a56de377f02f2574d781f6920fed08d6423ec2f/assets/porsche-911.glb

## Nissan Skyline R34 GT-R

Creator: [Lexyc16](https://sketchfab.com/Lexyc16)

Original: https://sketchfab.com/3d-models/nissan-skyline-r34-gt-r-ff8fb2251dfa4bb9979e7022c5a6666c

Distributed source: https://raw.githubusercontent.com/pedrosoandre/carros/0a56de377f02f2574d781f6920fed08d6423ec2f/assets/nissan-gt-r.glb

## Toyota Corolla AE86 Sprinter Trueno

Creator: [Lexyc16](https://sketchfab.com/Lexyc16)

Original: https://sketchfab.com/3d-models/toyota-corolla-ae86-trueno-fe02fba6302e450ea8424591493341ea

Distributed source: https://raw.githubusercontent.com/pedrosoandre/carros/0a56de377f02f2574d781f6920fed08d6423ec2f/assets/toyota-ae86.glb

## BMW E36 M3 Coupe

Creator: [Martin Trafas](https://sketchfab.com/TinoD2)

Original: https://sketchfab.com/3d-models/bmw-e36-m3-762b90efd3dc413cb61c3e3c8097b8ac

Distributed source: https://raw.githubusercontent.com/pedrosoandre/carros/0a56de377f02f2574d781f6920fed08d6423ec2f/assets/bmw-e36-m3.glb

## 2013 Lamborghini Aventador LP700-4 Roadster

Creator: [_shobh19](https://sketchfab.com/s0h1o9b)

Original: https://sketchfab.com/3d-models/2013-lamborghini-aventador-lp700-4-roadster-dbd3e2ccdc2748af957c34310163d848

Distributed source: https://raw.githubusercontent.com/pedrosoandre/carros/0a56de377f02f2574d781f6920fed08d6423ec2f/assets/lamborghini-aventador-lp700-4.glb

## 2020 BMW X6 M Competition

Creator: [SharkyStudios](https://sketchfab.com/sharkycat109)

Original: https://sketchfab.com/3d-models/low-poly-bmw-x6m-competition-dbc45a151624413aac9a378b570ddd02

Distributed source: https://raw.githubusercontent.com/pedrosoandre/carros/0a56de377f02f2574d781f6920fed08d6423ec2f/assets/bmw-x6.glb

## 1983-1987 Toyota Corolla KE80 Sedan

Creator: [PHAC](https://sketchfab.com/phac)

Original: https://sketchfab.com/3d-models/toyota-corolla-ke80-2b30faa611e64177a94a69098d27d1fb

Distributed source: https://raw.githubusercontent.com/pedrosoandre/carros/0a56de377f02f2574d781f6920fed08d6423ec2f/assets/toyota-corolla.glb

## 2018 Lamborghini Urus

Creator: [Kai Xiang](https://sketchfab.com/kirikom9000)

Original: https://sketchfab.com/3d-models/lamborghini-urus-2018-32964087f5d24c3e90482724ddfc2fef

Distributed source: https://raw.githubusercontent.com/pedrosoandre/carros/0a56de377f02f2574d781f6920fed08d6423ec2f/assets/lamborghini-urus.glb

The source catalogue is Carros by André Pedroso, pinned to commit
0a56de377f02f2574d781f6920fed08d6423ec2f. The original model licenses
were checked against their creators' public model metadata on 2026-10-17.
Original author links, source hashes and license provenance are in sources.json.
The catalogue already welds, simplifies and compresses selected models.

Game modifications: meshopt data decoded offline; scale, grounding and forward
orientation normalized; unrelated floors, detached roof panels and one door
decal removed; independent steering and rolling wheel pivots added; selected
brake assemblies separated; player materials adjusted to a single-pass glass
render; texture images retained in detailed models. The eight added traffic and parked car models
use colour-baked, topology-simplified versions of the same meshes, with
separate body, glazing, trim, lamps and authentic wheel geometry. Distant
versions use simplified colour-aware meshes. The Urus retains its textured
factory-yellow finish. The Ferrari is player-only; its loading fallback retains exterior geometry without aggressive simplification and omits the game-added coupe roof until the detailed model loads.

The eight added preview images are original model thumbnails, resized for garage cards. The Ferrari preview is a game-rendered derivative of its credited model. All previews
are credited to the respective model creators under the same licenses.
Model names and manufacturers identify the depicted vehicles. Neither the
creators nor manufacturers endorse this game. Vehicle performance values are
arcade game tuning, not manufacturer specifications.

Offline optimization uses meshoptimizer v1.0 by Arseny Kapoulkine (MIT):
https://github.com/zeux/meshoptimizer/tree/v1.0
No meshopt decoder, model marketplace, or external service is used at runtime.

## Runtime wheel finish and steering adaptation

The current game also replaces fragile outer rubber fragments with generated
round tire shells and a tread bump, retaining authored rim centres and spokes.
Player rim surfaces blend with a generated radial surface at speed to reduce
strobing. Close traffic wheel LODs are replaced by game-generated concentric
tires, rim lips, hubs and model-specific spoke patterns; body LODs still use the
credited source meshes. Wheel travel, individual steering angles and vehicle
paths follow an axle-based kinematic driving model. These adaptations are not
manufacturer-certified vehicle behaviour or an endorsement by any creator.
