import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {makeOpenWorld,terrainHeight,coast} from '../dist/world-data.js';
import {buildOpenWorld} from '../dist/world-view.js';
import {newDriveState,stepDrive} from '../dist/driving.js';
const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const world=makeOpenWorld(),scene=new THREE.Scene(),view=buildOpenWorld(scene,world),{life}=world;
assert.ok(life.props.length>=400);assert.ok(life.walkers.length>=500);assert.ok(life.parking.length>=120);
for(const block of world.blocks)assert.ok(life.props.some(p=>p.site==='block-'+block.id),'Every block needs an authored interior scene');
for(const kind of['court','playground','garden','market','pergola','carwash','container','gantry','plane','tower','boat','dune','scrub'])assert.ok(life.props.some(p=>p.kind===kind),'Missing district feature '+kind);
for(const p of life.props.filter(p=>p.kind==='boat'))assert.ok(terrainHeight(p.x,p.z)<.05,'Marina boats must float in water');
for(const p of life.parking){assert.equal(world.resolve(p.x,p.z,p.heading).hit,true,'Parked cars need matching collision shapes');if(p.site==='curb'){const road=world.nearestRoad(p.x,p.z);assert.ok(road&&road.distance<road.road.width/2&&road.distance>6,'Curb bays must stay outside moving traffic lanes');}}
for(const p of life.walkers)for(const t of[0,.5,1]){
  const x=THREE.MathUtils.lerp(p.x1,p.x2,t),z=THREE.MathUtils.lerp(p.z1,p.z2,t);
  assert.equal(world.resolve(x,z,0,.24,0).hit,false,'Pedestrian paths must clear physical scenery: '+p.site);assert.equal(world.surface(x,z).water,false,'Pedestrians must stand on pavement or decks');
}
scene.updateMatrixWorld(true);const decking=[];scene.traverse(m=>{if(m.isMesh&&m.name.startsWith('Grounded '))decking.push(m);});assert.ok(decking.length);
const ray=new THREE.Raycaster(),samples=[...[-250,-20,460,740,1000].map(z=>[coast(z)+92,z]),[-1120,320],[-1080,320],[-1000,320],[692,1210],[692,1290],[692,1320],[692,1370]];
for(const [x,z] of samples){ray.set(new THREE.Vector3(x,500,z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObjects(decking)[0];assert.ok(hit,'Deck geometry must cover its driving surface');const surface=world.surface(x,z);assert.ok(Math.abs(hit.point.y-surface.height)<.08,'Visible decks and driving heights must agree');assert.equal(surface.water,false);}
for(const z of[1250,1290,1320,1350])assert.equal(world.resolve(692,z,0).hit,false,'Marina centre and finger junctions must stay passable');
const car=newDriveState(world,{x:-999,z:320,heading:Math.PI/2});car.speed=5;for(let i=0;i<480;i++){const events=stepDrive(car,world,{throttle:true},1/120);assert.ok(!events.includes('recover')&&!events.includes('collision'),'The pier must connect to its access road');assert.equal(world.surface(car.x,car.z).water,false);}
view.population.update(10,world.spawns[0]);assert.ok(view.population.stats.visible>0&&view.population.stats.visible<50);const versions=view.population.group.children.map(m=>m.instanceMatrix.version);view.population.update(10,world.spawns[0]);assert.deepEqual(view.population.group.children.map(m=>m.instanceMatrix.version),versions,'Frozen pedestrian clocks should reuse uploaded poses');
for(const c of world.colliders.filter(c=>c.type==='palm'))assert.notEqual(world.surface(c.cx,c.cz).road,'Waterfront promenade','Palms must not block the boardwalk');
console.log(`PASS ${life.props.length} district scenes, ${life.parking.length} additional parked cars, ${life.walkers.length} clear pedestrian paths; grounded/passable waterfront, floating boats, safe curb bays and frozen pose reuse`);
