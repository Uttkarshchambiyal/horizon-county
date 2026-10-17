import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.min.js';
import {GLTFLoader} from '../dist/vendor/GLTFLoader.js';
import {mountSportsCar} from '../dist/sports-car.js';
import {createVehicle} from '../dist/vehicles.js';
import {newDriveState,stepDrive} from '../dist/driving.js';
import {wheelAngles,animateVehicle} from '../dist/vehicle-motion.js';
import {engineTelemetry} from '../dist/engine-audio.js';
import {makeOpenWorld} from '../dist/world-data.js';
import {createFacadeLibrary} from '../dist/facade-materials.js';
const flat={spawns:[{x:0,z:0,heading:0}],surface:()=>({height:0,onRoad:true}),resolve:(x,z)=>({x,z,hit:false})},dt=1/120;
const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const data=fs.readFileSync(new URL('../dist/assets/cars/ferrari-458.glb',import.meta.url)),gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
const car=createVehicle(new THREE.Group(),'clubsport');mountSportsCar(car,gltf);
{
  const s=newDriveState(flat);
  for(let i=0;i<120;i++)stepDrive(s,flat,{steer:-1},dt);
  animateVehicle(car,s);assert.equal(s.heading,0);assert.equal(s.x,0);assert.equal(s.z,0);assert.equal(s.speed,0);
  const [left,right]=car.steerWheels;assert.ok(left.rotation.y>right.rotation.y&&right.rotation.y>.4,'Inside wheel must steer further at rest');
  assert.ok(car.wheelCenters.slice(2).every(p=>p.rotation.y===0),'Rear wheels must stay aligned');
  const before=car.wheels.map(w=>w.rotation.x);animateVehicle(car,s);assert.deepEqual(car.wheels.map(w=>w.rotation.x),before,'No tire roll at rest');
  for(let i=0;i<240;i++)stepDrive(s,flat,{throttle:true,steer:-1},dt);
  assert.ok(s.x<-2&&s.heading>0,'Car must follow its steered front wheels');animateVehicle(car,s);assert.ok(car.wheels.every((w,i)=>Math.abs(w.rotation.x-before[i])>1));
  const front=car.steerWheels[0],brake=front.children.find(c=>c.name.startsWith('brake')),q=brake.quaternion.clone();
  s.wheelTravel+=10;animateVehicle(car,s);assert.ok(brake.quaternion.equals(q),'Brake assembly must not spin with rims');
  assert.ok(car.bodyMat.metalness<.4);assert.ok(gltf.scene.getObjectByName('glass').material.opacity>.7);
  console.log('PASS Actual Ferrari: wheels steer first at rest, inside/outside geometry, rear alignment, distance-driven tire roll, fixed brake assemblies and car follows front steering');
}
{
  const s=newDriveState(flat);s.speed=10;let error=0;
  for(let i=0;i<120;i++){
    const heading=s.heading;stepDrive(s,flat,{steer:.5,throttle:true},dt);
    error=Math.max(error,Math.abs((s.heading-heading)/dt-s.yawRate));
  }
  assert.ok(error<.00001,'Body yaw must integrate the tire response without frame jitter');assert.ok(Math.abs(s.lateralAcceleration)<=15.1,'Asphalt grip must bound lateral acceleration');assert.ok(s.heading<0);
  const reverse=newDriveState(flat);for(let i=0;i<240;i++)stepDrive(reverse,flat,{brake:true,steer:.7},dt);assert.ok(reverse.speed<0&&reverse.heading>0);
  const a=wheelAngles(-.45,2.65,1.63);assert.ok(a.right<a.left&&a.left<0);
  console.log('PASS Tire response: smooth integrated yaw, bounded lateral grip and correct reverse steering');
}
{
  const idle=engineTelemetry({speed:0},{}),loaded=engineTelemetry({speed:10},{throttle:true}),coast=engineTelemetry({speed:10},{}),before=engineTelemetry({speed:14.9},{throttle:true}),after=engineTelemetry({speed:15.1},{throttle:true});
  assert.equal(idle.gear,0);assert.ok(loaded.rpm>idle.rpm&&loaded.rpm>coast.rpm);assert.ok(after.gear>before.gear&&after.rpm<before.rpm,'Upshift should lower engine pitch');assert.equal(engineTelemetry({speed:-3},{}).gear,-1);
  const wav=fs.readFileSync(new URL('../dist/assets/audio/engine-loop.wav',import.meta.url));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');assert.ok(wav.length>50000);
  console.log('PASS Recorded engine asset, throttle/rev response, pitch drop at shifts, reverse gear and idle telemetry');
}
{
  const w=makeOpenWorld(),items=w.regionItems,counts=items.reduce((o,i)=>(o[i.type]=(o[i.type]||0)+1,o),{});
  assert.ok(counts.umbrella>=20&&counts.lifeguard>=3&&counts.volleyball>=2);assert.ok(counts.pine>=200&&counts.rock>=60&&counts.lookout>=3&&counts.cabin>=2);
  for(const item of items){const r=w.nearestRoad(item.x,item.z);assert.ok(!r||r.distance>r.road.width/2+item.r+4,'Regional objects must clear roads');}
  for(const type of ['rock','pine','cabin']){const item=items.find(i=>i.type===type);assert.equal(w.resolve(item.x,item.z,0).hit,true,type+' must be solid');}
  const f=createFacadeLibrary();assert.equal(f.count,24);assert.equal(new Set(f.materials.map(m=>m.map)).size,24);f.setNight(true);assert.ok(f.materials.every(m=>m.emissiveIntensity>0));
  for(const name of['brick','plaster','concrete','sand','rock'])assert.ok(fs.statSync(new URL('../dist/assets/materials/'+name+'.jpg',import.meta.url)).size>10000);
  console.log('PASS Populated beach/mountains, clear roads, 24 facade atlases with separate roughness/relief/night maps, local wall/sand/rock photographs');
}
