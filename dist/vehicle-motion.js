// All wheel animation follows travelled distance and the physics steering angle.
import {wheelAngles} from './steering.js?v=axle-steering-11';
export {wheelAngles};
export function animateVehicle(vehicle,state,previous,alpha=1){
  const {spec}=vehicle,angles=wheelAngles(state.steerAngle||0,spec.wheelbase,spec.track||spec.width*.84);
  for(const pivot of vehicle.steerWheels)pivot.rotation.y=pivot.position.x<0?angles.left:angles.right;
  for(let i=0;i<vehicle.wheels.length;i++){
    const wheel=vehicle.wheels[i];if(wheel.userData.restRoll===undefined)wheel.userData.restRoll=wheel.rotation.x;
    const distance=state.wheelDistances?.[i]??state.wheelTravel??0,old=previous?.wheelDistances?.[i]??distance,travel=old+(distance-old)*alpha;
    const radius=vehicle.wheelRadii?.[i]||spec.radius;
    // Wrap only the displayed phase; cumulative physical travel stays continuous.
    wheel.rotation.x=wheel.userData.restRoll-((travel/radius)%(Math.PI*2));
    const blur=vehicle.wheelBlur?.[i];if(blur){blur.visible=Math.abs(state.speed||0)>9;blur.material.opacity=Math.min(.86,Math.max(0,(Math.abs(state.speed||0)/radius-25)/95));}

  }
  return angles;
}
