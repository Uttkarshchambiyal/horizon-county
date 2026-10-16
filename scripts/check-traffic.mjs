import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.min.js';
import {makeOpenWorld} from '../dist/world-data.js';
import {makeTraffic,stepTraffic,signalState,collideTraffic} from '../dist/traffic.js';
import {buildTrafficView} from '../dist/traffic-view.js';
import {VEHICLES,createVehicle} from '../dist/vehicles.js';
import {newDriveState,stepDrive,recoverCar} from '../dist/driving.js';
const world=makeOpenWorld(),dt=1/60;
function place(traffic,x,z){const car=traffic.cars[0],route=traffic.routes[car.route];let best=Infinity;for(let s=0;s<route.length;s+=.25){const f=route.frame(s),d=Math.hypot(f.x-x,f.z-z);if(d<best){best=d;car.s=s;}}Object.assign(car,route.frame(car.s));return car;}
for(let time=0;time<320;time+=.25)assert.ok(!(signalState(time,'ns')==='green'&&signalState(time,'ew')==='green'));
{
  const traffic=makeTraffic(world),car=place(traffic,3.4,400);traffic.cars=[car];traffic.time=16;car.speed=14;
  for(let i=0;i<dt**-1*10;i++)stepTraffic(traffic,world,null,dt);
  assert.ok(car.z>=343.9&&car.z<345,'Red light must stop before the crossing: '+car.z);assert.ok(car.speed<.15);
  for(let i=0;i<dt**-1*14;i++)stepTraffic(traffic,world,null,dt);
  assert.ok(car.z<320,'Green light must release traffic');
  console.log('PASS Signals never conflict; traffic brakes at a red stop line and continues on green');
}
{
  const traffic=makeTraffic(world),car=place(traffic,3.4,510);traffic.cars=[car];traffic.time=0;car.speed=14;
  const player={x:3.4,z:470,speed:0};
  for(let i=0;i<dt**-1*9;i++)stepTraffic(traffic,world,player,dt);
  assert.ok(car.z-player.z>=6,'Traffic must not run into a stopped player');assert.ok(car.speed<.2);
  const snapshot={s:car.s,time:traffic.time};traffic.enabled=false;stepTraffic(traffic,world,player,1);assert.equal(car.s,snapshot.s);assert.equal(traffic.time,snapshot.time);
  const state=newDriveState(world);Object.assign(state,{x:car.x,z:car.z,heading:car.heading,speed:25});assert.equal(collideTraffic(state,traffic),false);
  traffic.enabled=true;assert.equal(collideTraffic(state,traffic),true);assert.ok(state.speed<10);assert.ok(Math.hypot(state.x-car.x,state.z-car.z)>2);
  console.log('PASS Traffic follows and brakes for the player; disabled traffic freezes and has no ghost collisions; active cars are solid');
}
{
  const traffic=makeTraffic(world),player=newDriveState(world),start={x:player.x,z:player.z};let closest=Infinity;
  assert.equal(traffic.cars.length,18);assert.equal(new Set(traffic.cars.map(c=>c.type)).size,6);
  // Three full signal cycles and many turns, sampled at simulation resolution.
  for(let tick=0;tick<60*180;tick++){
    stepTraffic(traffic,world,player,dt);stepDrive(player,world,{},dt);collideTraffic(player,traffic);
    for(const c of traffic.cars){assert.ok(Number.isFinite(c.x)&&Number.isFinite(c.z));assert.equal(world.surface(c.x,c.z).onRoad,true,'Traffic must stay on roads');assert.equal(world.resolve(c.x,c.z,c.heading).hit,false,'Traffic must clear static scenery');}
    if(tick%5===0)for(let a=0;a<traffic.cars.length;a++)for(let b=a+1;b<traffic.cars.length;b++){const c=traffic.cars[a],d=traffic.cars[b];closest=Math.min(closest,Math.hypot(c.x-d.x,c.z-d.z));}
  }
  assert.ok(closest>4.8,'Traffic must keep separation at junctions and on shared lanes: '+closest);
  assert.equal(player.x,start.x);assert.equal(player.z,start.z);assert.equal(player.speed,0,'No automatic player movement around traffic');
  console.log('PASS 180-second mixed city/highway simulation: all 18 cars stay on roads, clear buildings and keep separation ('+closest.toFixed(1)+' m minimum)');
}
const ctx=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({getContext:()=>ctx})};
{
  const specs=[];
  for(const v of VEHICLES){
    const model=createVehicle(new THREE.Group(),v.id),bounds=new THREE.Box3().setFromObject(model.car),size=bounds.getSize(new THREE.Vector3());assert.equal(model.wheels.length,4);assert.equal(model.steerWheels.length,2);assert.ok(size.x>2&&size.z>4);specs.push(size.y);
    const state=newDriveState(world,world.spawns[0],v.id);for(let i=0;i<60;i++)stepDrive(state,world,{throttle:true,steer:-1},dt);assert.ok(state.x<world.spawns[0].x-.5&&state.heading>.25,'Each car must turn left');recoverCar(state,world);assert.equal(state.vehicleId,v.id);assert.equal(state.speed,0);
  }
  assert.ok(specs[2]>specs[0]+.4,'SUV must have a distinct raised silhouette');
  const scene=new THREE.Scene(),traffic=makeTraffic(world),view=buildTrafficView(scene,world,traffic);view.update(.5);view.setNight(true);assert.ok(view.stats.drawCalls<=50,'Fleet should batch repeated models');
  for(const name of ['asphalt_02_diff_1k.jpg','asphalt_02_nor_gl_1k.jpg','asphalt_02_rough_1k.jpg','brown_mud_leaves_01_diff_1k.jpg','brown_mud_leaves_01_nor_gl_1k.jpg','kloppenheim_06_puresky_1k.hdr'])assert.ok(fs.statSync(new URL('../dist/assets/'+name,import.meta.url)).size>10000);
  console.log('PASS Three player models and handling specs; six distinct traffic models, recovery preserves car, fleet instancing ('+view.stats.drawCalls+' material batches), local PBR/HDR assets');
}
