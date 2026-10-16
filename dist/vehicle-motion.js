// All wheel animation follows travelled distance and the physics steering angle.
export function wheelAngles(steerAngle,wheelbase,track){
  if(Math.abs(steerAngle)<.00001)return {left:0,right:0};
  const radius=wheelbase/Math.tan(Math.abs(steerAngle)),sign=Math.sign(steerAngle),inner=Math.atan(wheelbase/Math.max(.5,radius-track/2)),outer=Math.atan(wheelbase/(radius+track/2));
  return steerAngle>0?{left:sign*inner,right:sign*outer}:{left:sign*outer,right:sign*inner};
}
export function animateVehicle(vehicle,state){
  const {spec}=vehicle,angles=wheelAngles(state.steerAngle||0,spec.wheelbase,spec.width*.84);
  for(const pivot of vehicle.steerWheels)pivot.rotation.y=pivot.position.x<0?angles.left:angles.right;
  for(let i=0;i<vehicle.wheels.length;i++){
    const wheel=vehicle.wheels[i];if(wheel.userData.restRoll===undefined)wheel.userData.restRoll=wheel.rotation.x;
    const side=Math.sign(vehicle.wheelCenters[i]?.position.x||0),factor=1+side*Math.tan(state.steerAngle||0)*spec.width*.42/spec.wheelbase;
    wheel.rotation.x=wheel.userData.restRoll-(state.wheelTravel||0)/spec.radius*factor;
  }
  return angles;
}
