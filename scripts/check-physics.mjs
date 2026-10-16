import assert from 'node:assert/strict';
import { TRACKS, makeCourse } from '../dist/tracks.js';
import { newCarState, stepCar, resetAtCheckpoint, angleDelta, clamp } from '../dist/physics.js';

const dt=1/120;
const input={throttle:1,brake:false,steer:0,boost:false,drift:false};
for(const config of TRACKS){
  const course=makeCourse(config),state=newCarState(course);
  let launches=0,checkpoints=0;
  // A center-line controller drives the same physics used by human players.
  for(let tick=0;tick<120*180&&!state.finished;tick++){
    const f=course.frame(state.distance),next=course.frame(state.distance+4);
    const curvature=angleDelta(next.angle,f.angle)/4;
    const steer=clamp(-curvature*state.speed*.3-state.offset*.12+angleDelta(state.heading,f.angle)*2,-1,1);
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
