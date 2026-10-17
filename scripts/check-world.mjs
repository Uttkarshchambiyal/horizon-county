import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {makeOpenWorld,clamp,terrainHeight} from '../dist/world-data.js';
import {newDriveState,stepDrive,recoverCar} from '../dist/driving.js';
import {createDrivingControls} from '../dist/controls.js';
import {buildOpenWorld} from '../dist/world-view.js';
const w=makeOpenWorld(),dt=1/120;
assert.ok(w.roads.length>=18);assert.ok(w.buildings.length>=150);
for(const spawn of w.spawns){
  const s=newDriveState(w,spawn),initial={...s};
  assert.equal(w.surface(s.x,s.z).onRoad,true,spawn.name+' must start on a road');
  assert.equal(w.resolve(s.x,s.z,s.heading).hit,false);
  for(let tick=0;tick<120;tick++)stepDrive(s,w,{},dt);
  assert.equal(s.x,initial.x);assert.equal(s.z,initial.z);assert.equal(s.speed,0);
}
for(const [letter,sign] of [['a',-1],['d',1]]){
  const keys=createDrivingControls(),s=newDriveState(w),x=s.x;
  keys.keydown({code:'KeyW',key:'w',preventDefault(){}});keys.keydown({code:'Key'+letter.toUpperCase(),key:letter,preventDefault(){}});
  for(let tick=0;tick<120;tick++)stepDrive(s,w,keys.read(),dt);
  assert.ok((s.x-x)*sign>1,'W + '+letter+' must turn in the open world');
}
console.log('PASS Safe district spawns, no idle creep, W+A and W+D in the open world');
for(const road of w.roads.filter(r=>['coast','ridge','avenue0','street320'].includes(r.id))){
  const f=road.frame(8),s=newDriveState(w,{...f,heading:f.angle});let progress=8;
  for(let tick=0;tick<120*650&&progress<road.length-12;tick++){
    let best=Infinity,near=progress;
    for(let d=Math.max(0,progress-4);d<Math.min(road.length,progress+30);d+=2){const p=road.frame(d),dist=Math.hypot(p.x-s.x,p.z-s.z);if(dist<best){best=dist;near=d;}}
    progress=near;const target=road.frame(progress+Math.max(8,s.speed*.4));
    const desired=Math.atan2(-(target.x-s.x),-(target.z-s.z)),error=Math.atan2(Math.sin(desired-s.heading),Math.cos(desired-s.heading));
    const nearFrame=road.frame(progress+5),far=road.frame(progress+30),curvature=Math.abs(Math.atan2(Math.sin(far.angle-nearFrame.angle),Math.cos(far.angle-nearFrame.angle)))/25;
    const speed=Math.min(road.id==='coast'?26:19,Math.sqrt(7.5/Math.max(.001,curvature))); // Slow for hairpins, as a driver would.
    const events=stepDrive(s,w,{throttle:s.speed<speed?1:0,brake:s.speed>speed+1,steer:clamp(-error*3,-1,1)},dt);
    assert.ok(!events.includes('collision')&&!events.includes('recover'),road.name+' must be clear and connected');
    assert.equal(w.surface(s.x,s.z).onRoad,true,road.name+' must not have hidden gaps');
    assert.ok(Number.isFinite(s.y));
  }
  assert.ok(progress>=road.length-12,road.name+' must be drivable end to end');
  console.log(`PASS ${road.name}: ${(road.length/1000).toFixed(2)} km, connected road and matching terrain`);
}
{
  const c=w.colliders[0],x=(c.minX+c.maxX)/2,z=(c.minZ+c.maxZ)/2,result=w.resolve(x,z,0);
  assert.equal(result.hit,true);assert.ok(result.x<c.minX||result.x>c.maxX||result.z<c.minZ||result.z>c.maxZ,'Building collision must push the car outside');
  const s=newDriveState(w);s.lastSafe={x:6,z:485,heading:0};s.x=-1400;s.z=300;
  for(let tick=0;tick<120*3;tick++)stepDrive(s,w,{},dt);
  assert.ok(Math.abs(s.x-6)<.1);assert.equal(s.speed,0);assert.equal(w.surface(s.x,s.z).water,false);
  s.x=120;s.speed=30;recoverCar(s,w);assert.equal(s.x,6);assert.equal(s.speed,0);
  const offRoad=w.surface(100,480);assert.equal(offRoad.onRoad,false);assert.ok(terrainHeight(0,-1400)>50);
  console.log('PASS Solid buildings, water recovery, off-road terrain and manual recovery');
}
// Exercise scene generation without a GPU, and check all road faces point up.
const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createImageData:(x,y)=>({data:new Uint8ClampedArray(x*y*4)})},{get:(o,k)=>k in o?o[k]:(()=>{})});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const scene=new THREE.Scene(),view=buildOpenWorld(scene,w);let roadMeshes=0;const asphaltVertices=new Set();
scene.traverse(m=>{if(m.material?.color?.getHex()===0x55585a){roadMeshes++;const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)asphaltVertices.add(Math.round(p.getX(i)*1000)+','+Math.round(p.getZ(i)*1000));const normals=m.geometry.attributes.normal;for(let i=0;i<normals.count;i++)assert.ok(normals.getY(i)>=0,'Road face points below ground: '+m.name);}});
assert.ok(roadMeshes>0);for(const road of w.roads)for(const f of road.samples)for(const side of[-1,1])assert.ok(asphaltVertices.has(Math.round(Math.fround(f.x+f.nx*road.width/2*side)*1000)+','+Math.round(Math.fround(f.z+f.nz*road.width/2*side)*1000)),'Rendered asphalt must retain every road sample: '+road.id);assert.equal(view.stats.buildings,w.buildings.length);view.setSky(0x86abcd,0xded5bb);view.update(2);
console.log('PASS Complete terrain, roads, buildings, vegetation and water scene generation');
