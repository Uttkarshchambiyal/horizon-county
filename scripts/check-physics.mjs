import assert from 'node:assert/strict';
import { TRACKS, makeCourse } from '../dist/tracks.js';
import { newCarState, stepCar, resetAtCheckpoint, angleDelta, clamp } from '../dist/physics.js';

const dt=1/120;
const input={throttle:1,brake:false,steer:0,boost:false,drift:false};
for(const config of TRACKS){
  const course=makeCourse(config),state=newCarState(course);
  let launches=0,checkpoints=0;
  // Test-only driver supplies explicit steering. The runtime has no controller.
  for(let tick=0;tick<120*180&&!state.finished;tick++){
    const target=course.frame(state.distance+Math.max(6,state.speed*.22));
    const desired=Math.atan2(-(target.x-state.x),-(target.z-state.z));
    const steer=clamp(-angleDelta(desired,state.heading)*3.3,-1,1);
    const events=stepCar(state,course,{...input,steer},dt);
    if(events.includes('jump')){launches++;assert.equal(state.grounded,false);}
    if(events.includes('checkpoint'))checkpoints++;
    assert.ok(!events.includes('reset'),`${config.id}: a centered, full-speed car must land the jumps`);
    assert.ok(Number.isFinite(state.y)&&Number.isFinite(state.heading));
  }
  assert.equal(state.finished,true,`${config.id}: course must be completable`);
  assert.equal(launches,config.jumps.length);
  assert.equal(state.jumps,config.jumps.length);
  assert.equal(checkpoints,3);
  assert.ok(state.totalAir>2);
  for(let checkpoint=1;checkpoint<=3;checkpoint++){
    const recovery=newCarState(course);recovery.checkpoint=checkpoint;resetAtCheckpoint(recovery,course);
    assert.equal(course.frame(recovery.distance).gap,false,'Every checkpoint must respawn on solid track');
    for(let tick=0;tick<60;tick++)assert.ok(!stepCar(recovery,course,{...input,throttle:0},dt).includes('reset'));
    assert.equal(recovery.grounded,true,'Checkpoint spawn must remain grounded without input');
  }
  console.log(`PASS ${config.name}: ${launches} jumps, 3 checkpoints, finish in ${state.elapsed.toFixed(2)}s`);
}

const course=makeCourse(TRACKS[0]);
{
  const state=newCarState(course);state.speed=20;
  for(let i=0;i<60;i++)stepCar(state,course,{...input,steer:1},dt);
  assert.ok(state.offset>1,'Right steering must move right');
  assert.ok(angleDelta(state.heading,course.frame(state.distance).angle)<0,'Car must point in the direction of steering');
  console.log('PASS Steering direction and visual yaw agree');
}
{
  const state=newCarState(course);state.speed=40;
  for(let i=0;i<120;i++)stepCar(state,course,{...input,boost:true},dt);
  assert.ok(state.speed>57,'Boost must exceed the regular speed cap');assert.ok(state.boost<75);
  const energy=state.boost;
  for(let i=0;i<120;i++)stepCar(state,course,{...input},dt);
  assert.ok(state.boost>energy,'Nitro must recharge');
  for(let i=0;i<120;i++)stepCar(state,course,{...input,throttle:0,brake:true},dt);
  assert.ok(state.speed<25,'Braking must slow the car');
  console.log('PASS Acceleration, braking, nitro depletion and recharge');
}
{
  const state=newCarState(course,course.jumps[0].start-2);state.speed=5;
  let fell=false;
  for(let i=0;i<120*8;i++)if(stepCar(state,course,{...input,throttle:0},dt).includes('reset')){fell=true;break;}
  assert.ok(fell,'Insufficient speed must miss the gap');
  state.checkpoint=2;state.elapsed=40;resetAtCheckpoint(state,course);
  assert.equal(state.elapsed,43);assert.equal(state.resets,1);assert.equal(state.speed,0);
  assert.ok(state.distance>course.length/2);assert.equal(state.grounded,true);
  console.log('PASS Failed jump, checkpoint recovery and time penalty');
}

{
  const state=newCarState(course),initial={...state};
  for(let i=0;i<120*15;i++)stepCar(state,course,{throttle:0,steer:0,brake:false,boost:true},dt);
  assert.equal(state.speed,0,'No input must never accelerate, including boost alone');
  assert.equal(state.x,initial.x);assert.equal(state.z,initial.z);assert.equal(state.heading,initial.heading);
  for(let i=0;i<120;i++)stepCar(state,course,{steer:1},dt);
  assert.equal(state.heading,initial.heading,'Steering at rest must not rotate the car');
  console.log('PASS No idle creep, automatic throttle, or stationary rotation');
}
{
  const bend=course.length*.23,state=newCarState(course,bend),heading=state.heading;
  state.speed=20;
  for(let i=0;i<120;i++)stepCar(state,course,{throttle:1,steer:0},dt);
  assert.equal(state.heading,heading,'The road must not steer the car around a bend');
  assert.ok(Math.abs(state.offset)>1,'A straight car must leave the center of a curved road');
  console.log('PASS No automatic corner following or lane centering');
}
{
  const state=newCarState(course);
  for(let i=0;i<120;i++)stepCar(state,course,{throttle:1},dt);
  assert.ok(state.speed>15,'W must accelerate from rest');
  for(let i=0;i<120*8;i++)stepCar(state,course,{},dt);
  assert.equal(state.speed,0,'Releasing the throttle must coast to a complete stop');
  const stopped={x:state.x,z:state.z,distance:state.distance};
  for(let i=0;i<120;i++)stepCar(state,course,{},dt);
  assert.equal(state.x,stopped.x);assert.equal(state.z,stopped.z);
  for(let i=0;i<120;i++)stepCar(state,course,{brake:true},dt);
  assert.ok(state.speed<-9,'S from rest must reverse');
  assert.ok(state.distance<stopped.distance-4,'Reverse must move backward');
  const heading=state.heading;
  for(let i=0;i<30;i++)stepCar(state,course,{brake:true,steer:1},dt);
  assert.ok(state.heading>heading,'Steering direction must invert correctly in reverse');
  resetAtCheckpoint(state,course);
  assert.equal(state.speed,0);assert.equal(state.steering,0);
  console.log('PASS W acceleration, release to stop, S reverse, reverse steering and reset');
}
{
  const s=newCarState(course),f=course.frame(100);
  s.distance=100;s.x=f.x;s.z=f.z;s.y=f.y+.55;s.heading=f.angle;s.speed=15;
  stepCar(s,course,{steer:1},dt);
  assert.ok(s.steering>0&&s.steering<.1,'Steering must build smoothly instead of snapping');
  const deflection=s.steering;
  stepCar(s,course,{steer:0},dt);
  assert.ok(s.steering<deflection,'Releasing steering must smoothly return the wheels');
  const a=course.frame(300),b=course.frame(300.01);
  assert.ok(Math.abs(angleDelta(a.angle,b.angle))<.01,'Road frame angles must interpolate continuously');
  console.log('PASS Smooth steering response and continuous track frames');
}
