export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

export function newCarState(course,distance=12) {
  const f=course.frame(distance);
  return {distance,offset:0,x:f.x,z:f.z,speed:0,y:f.y+.55,vy:0,heading:f.angle,steering:0,
    grounded:true,boost:100,elapsed:0,checkpoint:0,resets:0,jumps:0,airtime:0,totalAir:0,
    maxSpeed:0,finished:false,falling:false};
}

// Manual bicycle steering in world space. The road is only a surface: there
// is no automatic throttle, yaw alignment, lane centering, or corner following.
export function stepCar(state,course,input,dt) {
  if(state.finished)return [];
  const events=[],previousFrame=course.frame(state.distance);
  state.elapsed+=dt;
  const gas=input.throttle>0,brake=!!input.brake;
  const boosting=!!input.boost&&gas&&!brake&&state.boost>1&&state.speed>8&&state.grounded;
  state.boost=clamp(state.boost+(boosting?-30:10)*dt,0,100);
  const top=boosting?78:57;
  if(gas&&!brake) {
    state.speed+=(state.speed<0?34:boosting?26:16)*dt;
  } else if(brake&&!gas) {
    // S brakes first. Keep holding it after stopping to reverse.
    if(state.speed>0)state.speed=Math.max(0,state.speed-34*dt);
    else state.speed=Math.max(-14,state.speed-10*dt);
  } else {
    const resistance=(gas&&brake?40:4.5)+Math.abs(state.speed)*.075;
    state.speed=Math.sign(state.speed)*Math.max(0,Math.abs(state.speed)-resistance*dt);
  }
  if(state.speed>top)state.speed=Math.max(top,state.speed-22*dt);
  state.speed=clamp(state.speed,-14,78);
  if(Math.abs(state.speed)<.025&&!gas&&!brake)state.speed=0;
  state.maxSpeed=Math.max(state.maxSpeed,Math.abs(state.speed));
  state.steering+=(clamp(input.steer||0,-1,1)-state.steering)*(1-Math.exp(-9*dt));
  const wheelAngle=state.steering*.5/(1+Math.abs(state.speed)*.035)*(input.drift?1.25:1);
  const yawRate=-state.speed/2.7*Math.tan(wheelAngle)*(state.grounded?1:.6);
  state.heading+=yawRate*dt;
  state.x-=Math.sin(state.heading)*state.speed*dt;
  state.z-=Math.cos(state.heading)*state.speed*dt;
  const f=course.project(state.x,state.z,state.distance);
  state.distance=f.s;state.offset=f.offset;
  const forwardSpeed=state.speed*Math.cos(angleDelta(state.heading,f.angle));
  const surface=!f.gap&&Math.abs(state.offset)<f.width/2-.65&&Math.abs(f.longitudinal)<2;
  if(state.grounded&&surface&&!state.falling) {
    state.y=f.y+.55;state.vy=f.slope*forwardSpeed;
  } else {
    if(state.grounded) {
      state.grounded=false;state.airtime=0;
      if(previousFrame.ramp&&forwardSpeed>0){state.vy=Math.max(state.vy,forwardSpeed*.32);events.push('jump');}
    }
    const beforeY=state.y;
    state.vy-=18*dt;state.y+=state.vy*dt;
    state.airtime+=dt;state.totalAir+=dt;
    if(surface&&state.vy<=0&&state.y<=f.y+.55&&beforeY>=f.y-.4&&!state.falling) {
      state.y=f.y+.55;state.vy=0;state.grounded=true;
      if(state.airtime>.35){state.jumps++;events.push('land');}
      state.airtime=0;
    }
    if(state.y<f.y-2.5)state.falling=true;
    if(state.y<f.y-30||state.y<-20)events.push('reset');
  }
  const nextCheckpoint=course.checkpoints[state.checkpoint];
  if(nextCheckpoint!==undefined&&state.distance>=nextCheckpoint&&state.grounded&&!state.falling) {
    state.checkpoint++;events.push('checkpoint');
  }
  if(state.distance>=course.length-14&&state.grounded&&state.checkpoint===course.checkpoints.length) {
    state.finished=true;events.push('finish');
  }
  return events;
}

export function resetAtCheckpoint(state,course) {
  const checkpoint=state.checkpoint;
  const fresh=newCarState(course,checkpoint?course.checkpoints[checkpoint-1]+3:12);
  Object.assign(state,fresh,{elapsed:state.elapsed+3,resets:state.resets+1,checkpoint,
    jumps:state.jumps,totalAir:state.totalAir,maxSpeed:state.maxSpeed});
}
