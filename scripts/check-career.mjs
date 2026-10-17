import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {makeOpenWorld} from '../dist/world-data.js';
import {buildOpenWorld} from '../dist/world-view.js';
import {createActivities,createCareer,upgradeEffects} from '../dist/career.js';
import {createRoutePlanner} from '../dist/navigation.js';
import {newDriveState,stepDrive,recoverCar} from '../dist/driving.js';
import {buildActivityView} from '../dist/activity-view.js';
const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const world=makeOpenWorld();buildOpenWorld(new THREE.Scene(),world);const activities=createActivities(world),planner=createRoutePlanner(world),saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},career=createCareer(activities,storage);
const marker=buildActivityView(new THREE.Scene(),world,true),hillTarget=activities[5].gates[4];marker.update({target:()=>hillTarget,active:{definition:activities[5]}},hillTarget,1);const ring=marker.group.children[0];for(let i=0;i<ring.geometry.attributes.position.count;i++){const p=ring.geometry.attributes.position;assert.ok(Math.abs(p.getY(i)-world.surface(p.getX(i),p.getZ(i)).height-.045)<.001,'Checkpoint rings must follow sloped terrain');}assert.ok(ring.material.polygonOffsetFactor>0,'Checkpoint decals need the correct reversed-depth bias');
assert.equal(activities.length,6);assert.equal(career.profile.credits,0);assert.equal(career.start('unknown'),false);
for(const a of activities){
  const points=a.kind==='delivery'?[a.pickup,a.drop]:[a.start,...a.gates];
  for(const p of points){assert.ok(world.surface(p.x,p.z).onRoad,a.id+' target must be on a road');assert.equal(world.resolve(p.x,p.z,p.heading).hit,false,a.id+' target must clear every scenery collider');}
  for(let i=0;i<points.length-1;i++){const route=planner.route(points[i],points[i+1]);assert.ok(route.distance>0&&route.distance<5000,a.id+' must have a reachable road route');for(const p of route.points)assert.ok(world.surface(p.x,p.z).onRoad,a.id+' guidance must remain on roads');}
}
const dt=1/120,still=p=>({...p,speed:0,grounded:true}),wait=(model,p,t)=>{for(let i=0;i<Math.ceil(t/dt);i++)model.update(dt,p);};
const job=activities[0];assert.equal(career.start(job.id),true);assert.equal(career.start(activities[1].id),false);wait(career,still(job.pickup),1);assert.equal(career.active.phase,'approach','Pickup must require a complete stop');wait(career,{...job.pickup,speed:10},2);assert.equal(career.active.hold,0);wait(career,still(job.pickup),1.3);assert.equal(career.active.phase,'delivery');
wait(career,still(job.drop),1.3);assert.equal(career.active,null);assert.equal(career.result.success,true);assert.equal(career.profile.deliveries,1);assert.ok(career.result.cleanBonus===100&&career.result.timeBonus>0);const award=career.profile.credits;wait(career,still(job.drop),4);assert.equal(career.profile.credits,award,'A completed job must never award twice');
assert.equal(career.purchase('clubsport','engine').ok,true);assert.equal(career.levels('clubsport').engine,1);assert.equal(career.profile.credits,award-450);assert.equal(career.levels('trail').engine,undefined,'Parts must stay with their car');assert.equal(career.purchase('clubsport','engine').ok,false,'Insufficient funds must not install parts');assert.equal(career.purchase('unknown','engine').ok,false);
const restored=createCareer(activities,storage);assert.equal(restored.profile.credits,career.profile.credits);assert.equal(restored.levels('clubsport').engine,1);assert.equal(restored.active,null,'Unfinished runs must not resume in an invalid location');assert.equal(restored.profile.bests[job.id],career.profile.bests[job.id]);
const race=activities[3];career.start(race.id);wait(career,still(race.start),1.3);assert.equal(career.active.phase,'countdown');wait(career,{...race.start,speed:5},.1);assert.equal(career.active.phase,'approach');wait(career,still(race.start),4.5);assert.equal(career.active.phase,'race');
wait(career,still(race.gates[3]),.1);assert.equal(career.active.gate,0,'Out-of-order checkpoints must not count');
// Traverse each leg with small steps, including a swept pass through each ring.
let pos=still(race.start);for(const target of race.gates){const route=planner.route(pos,target);for(const p of route.points){const steps=Math.max(1,Math.ceil(Math.hypot(p.x-pos.x,p.z-pos.z)/.15)),from={...pos};for(let i=1;i<=steps;i++){pos={x:from.x+(p.x-from.x)*i/steps,z:from.z+(p.z-from.z)*i/steps,speed:18,grounded:true};career.update(dt,pos);}}}
assert.equal(career.result.success,true);assert.equal(career.result.kind,'race');assert.equal(career.profile.races,1);assert.ok(career.profile.bests[race.id]>0);
career.start(job.id);wait(career,still(job.pickup),1.3);career.recover();assert.ok(career.active.elapsed>=10);assert.equal(career.active.incidents,1);wait(career,still(job.drop),1.3);assert.equal(career.result.cleanBonus,0);
career.start(job.id);wait(career,still(job.pickup),1.3);career.update(job.limit+1,still(job.pickup));assert.equal(career.result.success,false);const credits=career.profile.credits;career.abandon();assert.equal(career.profile.credits,credits);
career.start(job.id);career.abandon();assert.equal(career.profile.credits,credits,'Abandoning must not pay or spend credits');
const corrupt=createCareer(activities,{getItem:()=>'{bad json',setItem(){throw Error('blocked');}});assert.equal(corrupt.profile.credits,0);corrupt.start(job.id);wait(corrupt,still(job.pickup),1.3);wait(corrupt,still(job.drop),1.3);assert.ok(corrupt.profile.credits>0);assert.equal(corrupt.saveAvailable,false,'Storage failure must leave the game playable and be reported');
// Complete every activity using the real integrator and only throttle, brake
// and steering inputs. This test driver is never shipped with the game.
const driveTimes=[];
for(const definition of activities){
  const run=createCareer(activities),driver=newDriveState(world,definition.pickup||definition.start);run.start(definition.id);let path=[],pathIndex=0,lastPhase='',collisions=0,ticks=0;
  while(run.active&&ticks++<120*300){
    const target=run.target(),phase=run.active.phase+':'+run.active.gate;if(phase!==lastPhase){lastPhase=phase;path=planner.route(driver,target).points;pathIndex=1;}
    while(pathIndex<path.length-1&&Math.hypot(path[pathIndex].x-driver.x,path[pathIndex].z-driver.z)<12)pathIndex++;
    const destination=path[pathIndex]||target,distance=Math.hypot(target.x-driver.x,target.z-driver.z),bearing=Math.atan2(-(destination.x-driver.x),-(destination.z-driver.z)),error=Math.atan2(Math.sin(bearing-driver.heading),Math.cos(bearing-driver.heading)),racing=run.active.phase==='race',desired=Math.min(racing?17:12,racing?17:Math.sqrt(Math.max(0,12*(distance-2))),Math.abs(error)>.7?6:racing?17:12),input={steer:Math.max(-1,Math.min(1,-error*1.8+driver.yawRate*.2)),throttle:driver.speed<desired-.35,brake:driver.speed>desired+.35};
    const events=stepDrive(driver,world,input,dt);collisions+=events.filter(e=>e==='collision').length;run.update(dt,driver);
  }
  assert.equal(run.result?.success,true,'A real manual-input run must be completable: '+JSON.stringify({id:definition.id,x:driver.x,z:driver.z,phase:run.active?.phase,elapsed:run.active?.elapsed,result:run.result}));assert.equal(collisions,0,definition.id+' guidance must not force the car into scenery');driveTimes.push(definition.name+' '+(ticks/120).toFixed(1)+'s');
}
const clampSave=createCareer(activities,{getItem:()=>JSON.stringify({version:1,credits:-400,upgrades:{clubsport:{engine:99,tires:-8}},completed:['invented'],bests:{'avenue-circuit':-2}})});assert.equal(clampSave.profile.credits,0);assert.equal(clampSave.levels('clubsport').engine,3);assert.equal(clampSave.levels('clubsport').tires,0);assert.equal(clampSave.profile.completed.length,0);
// Upgrades alter the actual driving integrator, including after recovery.
const flat={spawns:[{x:0,z:0,heading:0}],surface:()=>({height:0,onRoad:true,water:false}),resolve:(x,z)=>({x,z,hit:false})},stock=newDriveState(flat),tuned=newDriveState(flat);tuned.tuning=upgradeEffects({engine:3,brakes:3,tires:3,nitro:3});
for(let i=0;i<360;i++){stepDrive(stock,flat,{throttle:1},dt);stepDrive(tuned,flat,{throttle:1},dt);}assert.ok(tuned.speed>stock.speed*1.1);stock.speed=tuned.speed=25;for(let i=0;i<120;i++){stepDrive(stock,flat,{brake:true},dt);stepDrive(tuned,flat,{brake:true},dt);}assert.ok(tuned.speed<stock.speed-2);stock.boost=tuned.boost=10;for(let i=0;i<120;i++){stepDrive(stock,flat,{},dt);stepDrive(tuned,flat,{},dt);}assert.ok(tuned.boost>stock.boost);recoverCar(tuned,flat);assert.equal(tuned.tuning.grip,1.18);assert.equal(tuned.speed,0);
console.log('PASS Six reachable activities, safe targets/road guidance, stopped pickups/deliveries, ordered swept checkpoints, countdown restart, rewards/bests, penalties/failure, per-car upgrades and storage recovery');
console.log('PASS Engine, brake and nitro upgrades affect real physics; tuning persists through manual recovery without idle movement');
console.log('PASS Real-physics activity drives without scenery collisions: '+driveTimes.join(', '));
