import assert from 'node:assert/strict';
import {newDriveState,stepDrive} from '../dist/driving.js';
import {collideTraffic} from '../dist/traffic.js';
import {renderPixelRatio,distanceFade,enableInstanceFade} from '../dist/render-quality.js';
import * as THREE from '../dist/vendor/three.module.min.js';
const dt=1/120,flat={spawns:[{x:0,z:40,heading:0}],surface:()=>({height:0,onRoad:true}),resolve:(x,z)=>({x,z,hit:false})};
for(const v of['clubsport','touring','trail']){
  const s=newDriveState(flat,flat.spawns[0],v);for(let i=0;i<120;i++)stepDrive(s,flat,{steer:-1},dt);assert.equal(s.speed,0);assert.equal(s.heading,0);assert.ok(s.steerAngle>.5);
  for(let i=0;i<240;i++)stepDrive(s,flat,{throttle:true,steer:-1},dt);assert.ok(s.heading>.6&&s.x<-5,'Keyboard turn must respond clearly for '+v);
  for(let i=0;i<80;i++)stepDrive(s,flat,{throttle:true},dt);assert.equal(s.steering,0);assert.ok(Math.abs(s.yawRate)<.04,'Release must settle without a persistent turn');
}
{
  const s=newDriveState(flat);s.speed=25;const initial=s.speed;for(let i=0;i<120;i++)stepDrive(s,flat,{},dt);assert.ok(s.speed>initial-2&&s.speed<initial,'Lifting the accelerator should coast rather than slam the brakes');
  for(let i=0;i<480&&s.speed>.01;i++)stepDrive(s,flat,{brake:true},dt);assert.equal(s.speed,0);const z=s.z;for(let i=0;i<20;i++)stepDrive(s,flat,{brake:true},dt);assert.equal(s.speed,0);assert.equal(s.z,z,'A short hold at rest should not immediately reverse');
  for(let i=0;i<120;i++)stepDrive(s,flat,{brake:true,steer:1},dt);assert.ok(s.speed<-2&&s.speed>=-9);assert.ok(s.heading>0,'Reverse must follow front wheel steering');
  const a=newDriveState(flat);a.speed=50;for(let i=0;i<600;i++){stepDrive(a,flat,{throttle:true,steer:i%240<120?-1:1},dt);assert.ok(Math.abs(a.lateralAcceleration)<=37.51);assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y));}
}
{
  const wall={...flat,resolve:(x,z)=>({x,z:Math.max(2.4,z),hit:z<2.4})};const s=newDriveState(wall);s.speed=35;for(let i=0;i<200;i++)stepDrive(s,wall,{},dt);assert.ok(s.z>=2.4&&s.speed<.1,'Head-on collision must stop without tunnelling');
  const side={...flat,resolve:(x,z)=>({x:Math.max(0,x),z,hit:x<0})},g=newDriveState(side,{x:.1,z:40,heading:.1});g.speed=15;for(let i=0;i<60;i++)stepDrive(g,side,{throttle:true},dt);assert.ok(g.x>=0&&g.z<34&&g.speed>10,'Glancing contact must slide instead of repeated speed collapse');
}
{
  const crest={...flat,surface:(x,z)=>({height:z>0?z*.15:0,onRoad:true})},s=newDriveState(crest,{x:0,z:20,heading:0});s.speed=25;let airborne=false;for(let i=0;i<300;i++){stepDrive(s,crest,{},dt);airborne ||= !s.grounded;assert.ok(s.y>=crest.surface(s.x,s.z).height+.55-.000001);}assert.ok(airborne&&s.grounded,'A road crest must allow a small flight and a stable gravity landing');
}
{
  const curb={...flat,surface:(x,z)=>({height:z<=0?.16:0,onRoad:true})},s=newDriveState(curb,{x:0,z:10,heading:0});s.speed=20;
  for(let i=0;i<240;i++){stepDrive(s,curb,{},dt);assert.equal(s.grounded,true,'A small paving step must not inject a launch velocity');}
}
{
  const traffic={enabled:true,cars:[{x:0,z:0,y:.55,heading:0,tx:0,tz:-1,type:'touring',speed:0}]},s=newDriveState(flat,{x:1.8,z:0,heading:0});s.speed=15;
  assert.equal(collideTraffic(s,traffic),true);assert.ok(s.speed>14,'A sideswipe must retain forward speed');assert.equal(collideTraffic(s,traffic),false,'One separation must clear the overlap');
  const air=newDriveState(flat,{x:0,z:0,heading:0});air.y=5;assert.equal(collideTraffic(air,traffic),false,'Airborne vehicles must not hit traffic far below');
}
for(const dpr of[1,1.5,2,3])for(const mode of['quality','auto','performance']){const ratio=renderPixelRatio(mode,dpr,1440,900,.8);assert.ok(ratio>=.8&&ratio<=2);if(mode==='quality')assert.ok(ratio>=1.25);assert.ok(ratio*ratio*1440*900<=4_200_001);}
assert.equal(distanceFade(100,550),1);assert.equal(distanceFade(550,550),0);assert.ok(distanceFade(500,550)>0&&distanceFade(500,550)<1);
const material=new THREE.MeshStandardMaterial(),a=new THREE.InstancedMesh(new THREE.BoxGeometry(),material,3),b=new THREE.InstancedMesh(a.geometry,material,3);const fade=enableInstanceFade(a);assert.notEqual(a.geometry,b.geometry,'Per-batch fade data must not overwrite other batches');assert.equal(fade.count,3);const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);assert.ok(shader.vertexShader.includes('vInstanceFade=instanceFade'));assert.ok(shader.fragmentShader.includes('discard;'));
console.log('PASS Handling: responsive WASD, steering return, coasting, brake/reverse delay, grip limits, head-on and glancing collisions, crest gravity/landing; bounded pixel budgets and gradual prop fading');
