import assert from 'node:assert/strict';
import { createDrivingControls } from '../dist/controls.js';
import { TRACKS,makeCourse } from '../dist/tracks.js';
import { newCarState,stepCar } from '../dist/physics.js';
const event=(code,key='',extra={})=>({code,key,preventDefault(){this.prevented=true;},...extra});

for(const [letter,direction] of [['a',-1],['d',1]]){
  const controls=createDrivingControls(),course=makeCourse(TRACKS[0]),car=newCarState(course),start=car.x;
  // Hold two physical keys simultaneously; the game reads the same controller.
  controls.keydown(event('KeyW','w'));
  controls.keydown(event('Key'+letter.toUpperCase(),letter));
  for(let tick=0;tick<90;tick++)stepCar(car,course,controls.read(),1/120);
  assert.equal(controls.read().throttle,1);
  assert.equal(controls.read().steer,direction);
  assert.ok((car.x-start)*direction>.5,`W + ${letter.toUpperCase()} must move ${direction<0?'left':'right'}`);
  controls.keyup(event('Key'+letter.toUpperCase(),letter));
  assert.equal(controls.read().steer,0,'Releasing A/D must leave W held');
  assert.equal(controls.read().throttle,1);
  controls.keyup(event('KeyW','w'));
  assert.equal(controls.read().throttle,0);
  console.log(`PASS W + ${letter.toUpperCase()}: keyboard input turns the moving car ${direction<0?'left':'right'}`);
}
{
  const controls=createDrivingControls();
  for(const code of ['', 'Unidentified']){
    controls.clear();controls.keydown(event(code,'W'));controls.keydown(event(code,'A'));
    assert.equal(controls.read().throttle,1);assert.equal(controls.read().steer,-1);
    controls.keyup(event(code,'a'));assert.equal(controls.read().steer,0);
    controls.keydown(event(code,'D'));assert.equal(controls.read().steer,1);
  }
  console.log('PASS WASD key fallback when a browser omits physical key codes');
}
{
  const controls=createDrivingControls();
  controls.keydown(event('KeyW','w'));controls.keydown(event('KeyA','a'));
  controls.clear(); // Same clearing path as a blur or pause.
  assert.equal(controls.read().throttle,0);assert.equal(controls.read().steer,0);
  controls.keydown(event('KeyW','w',{repeat:true}));
  controls.keydown(event('KeyA','a',{repeat:true}));
  assert.equal(controls.read().throttle,1);assert.equal(controls.read().steer,-1);
  controls.clear();assert.equal(controls.keydown(event('KeyD','d',{repeat:true}),false),false);
  assert.equal(controls.read().steer,0);
  console.log('PASS Held keys recover on repeat after focus returns; paused controls stay inactive');
}
{
  const controls=createDrivingControls(),a=event('KeyA','a');
  controls.keydown(a);assert.equal(a.prevented,true);
  controls.keydown(event('KeyD','d'));assert.equal(controls.read().steer,0);
  controls.keyup(event('KeyA','a'));assert.equal(controls.read().steer,1);
  controls.clear();controls.keydown(event('KeyW','w',{metaKey:true}));assert.equal(controls.read().throttle,0);
  controls.keydown(event('KeyA','a',{ctrlKey:true}));assert.equal(controls.read().steer,0);
  controls.keydown(event('ArrowLeft','ArrowLeft'));assert.equal(controls.read().steer,-1);
  controls.clear();assert.equal(controls.read({throttle:true,right:true}).steer,1);
  assert.equal(controls.read({throttle:true,right:true}).throttle,1);
  console.log('PASS Opposing directions, key releases, browser shortcuts, arrow keys and touch steering');
}
