export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

export function newCarState(course, distance=12) {
  const f=course.frame(distance);
  return {distance,offset:0,speed:0,y:f.y+.55,vy:0,heading:f.angle,grounded:true,boost:100,
    elapsed:0,checkpoint:0,resets:0,jumps:0,airtime:0,totalAir:0,maxSpeed:0,finished:false,falling:false};
}

// The car uses track-local coordinates, real gravity, and an assisted yaw model.
// Steering still controls both heading and lateral movement; gaps have no surface.
export function stepCar(state,course,input,dt) {
  if(state.finished) return [];
  const events=[],previousFrame=course.frame(state.distance);
  state.elapsed+=dt;
  const boosting=input.boost&&input.throttle>0&&state.boost>1&&state.speed>8;
  state.boost=clamp(state.boost+(boosting?-30:10)*dt,0,100);
  const top=boosting?78:57;
  const drag=1.5+state.speed*.035;
  state.speed=clamp(state.speed+((input.throttle>0?(boosting?25:15):0)-(input.brake?34:0)-drag)*dt,0,top);
  if(state.speed>top) state.speed+=(top-state.speed)*dt*2;
  state.maxSpeed=Math.max(state.maxSpeed,state.speed);
  let error=angleDelta(state.heading,previousFrame.angle);
  const steeringPower=state.grounded?1:.35;
  const yaw= -input.steer*(.28+Math.min(1,state.speed/32)*.72)*steeringPower*(input.drift?1.5:1);
  // Gentle alignment makes the courses approachable without locking the car to a lane.
  const alignment=state.grounded ? (input.drift?.35:1.8) : .8;
  state.heading+= (yaw-error*alignment)*dt;
  error=clamp(angleDelta(state.heading,previousFrame.angle),-1.25,1.25);
  const ds=state.speed*Math.cos(error)*dt;
  state.distance=clamp(state.distance+ds,0,course.length-1);
  state.offset-=Math.sin(error)*state.speed*dt;
  const f=course.frame(state.distance);
  // A small amount of track alignment retains an arcade feel on fast bends.
  const assistance=state.grounded?{skyline:.9,canyon:.86,afterdark:.82}[course.config.id]:.95;
  state.heading+=angleDelta(f.angle,previousFrame.angle)*assistance;
  const surface=!f.gap && Math.abs(state.offset)<f.width/2-.45;
  if(state.grounded && surface && !state.falling) {
    state.y=f.y+.55;
    state.vy=f.slope*state.speed;
  } else {
    if(state.grounded) {
      state.grounded=false;state.airtime=0;
      if(previousFrame.ramp) {state.vy=Math.max(state.vy,state.speed*.32);events.push('jump');}
    }
    const beforeY=state.y;
    state.vy-=18*dt;
    state.y+=state.vy*dt;
    state.airtime+=dt;state.totalAir+=dt;
    if(surface && state.vy<=0 && state.y<=f.y+.55 && beforeY>=f.y-.4 && !state.falling) {
      state.y=f.y+.55;state.vy=0;state.grounded=true;
      if(state.airtime>.35){state.jumps++;events.push('land');}
      state.airtime=0;
    }
    if(state.y<f.y-2.5)state.falling=true;
    if(state.y<f.y-30 || state.y<-20) events.push('reset');
  }
  const checkpoint=course.checkpoints.filter(s=>state.distance>=s).length;
  if(checkpoint>state.checkpoint && !state.falling) {state.checkpoint=checkpoint;events.push('checkpoint');}
  if(state.distance>=course.length-14 && state.grounded) {state.finished=true;events.push('finish');}
  return events;
}

export function resetAtCheckpoint(state,course) {
  const checkpoint=state.checkpoint;
  const fresh=newCarState(course,checkpoint?course.checkpoints[checkpoint-1]+3:12);
  Object.assign(state,fresh,{elapsed:state.elapsed+3,resets:state.resets+1,checkpoint,
    jumps:state.jumps,totalAir:state.totalAir,maxSpeed:state.maxSpeed});
}
