import assert from 'node:assert/strict';
import {newDriveState,stepDrive} from '../dist/driving.js';
import {VEHICLES} from '../dist/vehicle-data.js';
import {wheelAngles,rearAxle} from '../dist/steering.js';
import {animateVehicle} from '../dist/vehicle-motion.js';
import {createVehicle} from '../dist/vehicles.js';
import * as THREE from '../dist/vendor/three.module.min.js';
const dt=1/120,flat={spawns:[{x:0,z:0,heading:0}],surface:()=>({height:0,onRoad:true}),resolve:(x,z)=>({x,z,hit:false})};
const point=(s,x,z)=>({x:s.x+x*Math.cos(s.heading)+z*Math.sin(s.heading),z:s.z-x*Math.sin(s.heading)+z*Math.cos(s.heading)});
const ctx=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({getContext:()=>ctx})};
for(const spec of VEHICLES){
  // Independently measure tire-centre displacements against their rolling
  // directions. This catches a body-yaw/path mismatch even with correct HUDs.
  const s=newDriveState(flat,undefined,spec.id);s.speed=8;let maxSlip=0;
  for(let n=0;n<240;n++){
    const old={...s},rearBefore=point(s,0,rearAxle(spec));stepDrive(s,flat,{throttle:true,steer:-.7},dt);const rearAfter=point(s,0,rearAxle(spec)),mid=(old.heading+s.heading)/2;
    const lateral=(rearAfter.x-rearBefore.x)*Math.cos(mid)-(rearAfter.z-rearBefore.z)*Math.sin(mid);maxSlip=Math.max(maxSlip,Math.abs(lateral));
    assert.ok(Math.abs(s.speed*s.yawRate)<=spec.grip+.001);assert.ok(Math.abs(s.yawRate-s.speed/spec.wheelbase*Math.tan(s.steerAngle))<.012,'Yaw must follow the visible rack at speed');
  }
  assert.ok(maxSlip<1e-7,spec.name+' rear tires must roll along their own direction');assert.ok(s.wheelDistances[1]>s.wheelDistances[0]&&s.wheelDistances[3]>s.wheelDistances[2],'Outer wheels travel farther than inner wheels');assert.ok(s.wheelDistances[0]>s.wheelDistances[2],'Front tires follow a larger radius than rears');
  // First instant of a left turn: front moves sideways first, rear follows;
  // the rigid wheelbase never changes.
  const first=newDriveState(flat,undefined,spec.id);first.speed=6;const fz=(spec.wheels[0][2]+spec.wheels[1][2])/2,rz=rearAxle(spec),f0=point(first,0,fz),r0=point(first,0,rz);stepDrive(first,flat,{steer:-1},dt);const f1=point(first,0,fz),r1=point(first,0,rz);assert.ok(Math.abs(f1.x-f0.x)>Math.abs(r1.x-r0.x)*20);assert.ok(Math.abs(Math.hypot(f1.x-r1.x,f1.z-r1.z)-spec.wheelbase)<.001);
  const angles=wheelAngles(s.steerAngle,spec.wheelbase,spec.track);assert.ok(Math.abs(spec.wheelbase/Math.tan(angles.right)-spec.wheelbase/Math.tan(angles.left)-spec.track)<1e-8,'Front axles must share one Ackermann turning centre');
  // High speed: visible tires and body use the same grip-limited curvature.
  for(const sign of [-1,1]){const fast=newDriveState(flat,undefined,spec.id);fast.speed=45;for(let n=0;n<240;n++){stepDrive(fast,flat,{throttle:true,steer:sign},dt);assert.ok(Math.abs(fast.lateralAcceleration)<=spec.grip+.001);assert.ok(Number.isFinite(fast.x));}assert.ok(fast.heading*sign<0);assert.ok(Math.abs(fast.steerAngle)>.005&&Math.abs(fast.steerAngle)<.04);}
  // Changing the steering at rest must not recalculate any past wheel spin.
  s.speed=0;s.yawRate=0;const v=createVehicle(new THREE.Group(),spec.id);animateVehicle(v,s);const phases=v.wheels.map(w=>w.rotation.x),travel=[...s.wheelDistances];for(let n=0;n<120;n++)stepDrive(s,flat,{steer:1},dt);animateVehicle(v,s);assert.deepEqual(s.wheelDistances,travel);assert.deepEqual(v.wheels.map(w=>w.rotation.x),phases);assert.equal(v.wheelBlur[0].visible,false);
  assert.equal(v.wheelRadii.length,4);assert.ok(v.wheels.every(w=>w.getObjectByName('Continuous rubber tire')));assert.ok(v.wheelRadii.every(r=>r>.22&&r<.55));
  console.log('PASS '+spec.name+': no rear side-slip, front-first response, fixed wheelbase, Ackermann geometry, individual rolling, stable high-speed grip and no spin when steering at rest');
}
{
  const air=newDriveState(flat);air.grounded=false;air.y=10;air.speed=30;for(let n=0;n<20;n++)stepDrive(air,flat,{steer:-1},dt);assert.equal(air.heading,0,'Airborne steering cannot yaw the body from tire contact');
  const a=newDriveState(flat),b=newDriveState(flat);a.speed=b.speed=20;for(let n=0;n<600;n++)stepDrive(a,flat,{throttle:true,steer:-.3},1/120);for(let n=0;n<1200;n++)stepDrive(b,flat,{throttle:true,steer:-.3},1/240);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.2,'Steering integration should be stable across fixed-step sizes');
}
console.log('PASS No artificial air steering; consistent axle integration across step sizes');
