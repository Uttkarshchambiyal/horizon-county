import * as THREE from './vendor/three.module.min.js';
import {addReflections} from './car.js';
import {createDrivingControls} from './controls.js';
import {makeOpenWorld,terrainHeight,coast,clamp} from './world-data.js';
import {buildOpenWorld} from './world-view.js';
import {newDriveState,stepDrive,recoverCar} from './driving.js';
import {VEHICLES,createVehicle} from './vehicles.js';
import {makeTraffic,stepTraffic,collideTraffic} from './traffic.js';
import {buildTrafficView} from './traffic-view.js';
import {loadWorldAssets} from './assets.js';
const $=id=>document.getElementById(id),canvas=$('world');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(error){$('loading').classList.add('hidden');$('fatal-error').classList.remove('hidden');$('error-message').textContent='This world needs a browser with WebGL and hardware acceleration.';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0xd9cbb3,.00048);
const camera=new THREE.PerspectiveCamera(57,innerWidth/innerHeight,.18,10000);
const ambient=new THREE.HemisphereLight(0xbcd8e9,0x77714f,2.1);scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffd1a0,3.1);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.near=1;sun.shadow.camera.far=520;
Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65});sun.shadow.bias=-.00035;sun.shadow.normalBias=.025;scene.add(sun,sun.target);
const world=makeOpenWorld(),view=buildOpenWorld(scene,world);
const car=new THREE.Group();scene.add(car);
const garage=VEHICLES.map(v=>createVehicle(car,v.id));
let currentCar=garage[0],{bodyMat,tailMat,wheels,steerWheels,flames}=currentCar;
let preference={vehicle:'clubsport',paints:{},quality:'auto',traffic:true};
try{Object.assign(preference,JSON.parse(localStorage.getItem('horizon-garage-v1')||'{}'));}catch{}
if(!['auto','performance','quality'].includes(preference.quality))preference.quality='auto';
if(!preference.paints||typeof preference.paints!=='object')preference.paints={};
function savePreferences(){try{localStorage.setItem('horizon-garage-v1',JSON.stringify(preference));}catch{}}
const traffic=makeTraffic(world),trafficView=buildTrafficView(scene,world,traffic);traffic.enabled=preference.traffic!==false;
addReflections(scene,renderer);
let assetsStatus='loading';loadWorldAssets(scene,renderer,view).then(result=>{assetsStatus=result.loaded===result.total?'ready':'fallback';}).catch(()=>{assetsStatus='fallback';});
const headlights=[];
for(const side of[-1,1]){const light=new THREE.SpotLight(0xe5f3ff,95,85,.48,.65,1.1);light.position.set(side*.7,.2,-2.3);light.target.position.set(side*2,-.4,-38);car.add(light,light.target);headlights.push(light);}
const controls=createDrivingControls(),touch={left:false,right:false,throttle:false,brake:false,boost:false};
let selected=0,state=newDriveState(world),previous={...state},mode='menu',cameraMode=0,cameraHeading=state.heading,time=0,lastTime=0,accumulator=0,hudTime=0,toastTime=0;
let muted=false,lights=false,lighting=0,waypoint=null,modeBeforeMap='menu',modeBeforeHelp='menu',modeBeforeGarage='menu',modeBeforeSettings='menu';
let resolutionScale=1.35,performanceTime=0,performanceFrames=0,measuredFps=0,acceleration=0,lastSpeed=0;
const visited=new Set();try{for(const name of JSON.parse(localStorage.getItem('horizon-world-discoveries-v1')||'[]'))visited.add(name);}catch{}
const look=new THREE.Vector3(),lookGoal=new THREE.Vector3(),cameraGoal=new THREE.Vector3();
const audio={ctx:null,osc:null,gain:null};
function initAudio(){try{if(audio.ctx){audio.ctx.resume();return;}const ctx=new(window.AudioContext||window.webkitAudioContext)();audio.ctx=ctx;audio.osc=ctx.createOscillator();audio.gain=ctx.createGain();const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=260;audio.osc.type='sawtooth';audio.gain.gain.value=0;audio.osc.connect(filter);filter.connect(audio.gain);audio.gain.connect(ctx.destination);audio.osc.start();}catch{}}
function clearInput(){controls.clear();Object.keys(touch).forEach(k=>touch[k]=false);document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('pressed'));}
function focusGame(){canvas.focus({preventScroll:true});}
function sync(){previous={...state};accumulator=0;positionCar(0,1);updateCamera(1,true);updateHUD();}
function toast(title,sub='',duration=2.5){$('toast').textContent=title;if(sub){const small=document.createElement('small');small.textContent=sub;$('toast').appendChild(small);}$('toast').classList.add('visible');toastTime=duration;}
function selectSpawn(index){selected=index;state=newDriveState(world,world.spawns[index],currentCar.spec.id);clearInput();sync();document.querySelectorAll('[data-spawn]').forEach(b=>{const on=+b.dataset.spawn===index;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});}
function startDrive(){initAudio();clearInput();mode='playing';state=newDriveState(world,world.spawns[selected],currentCar.spec.id);document.body.classList.add('playing');$('menu').classList.add('hidden');$('drive-hud').classList.remove('hidden');$('pause-button').classList.remove('hidden');for(const id of['pause-overlay','map-overlay','help-overlay','garage-overlay','settings-overlay'])$(id).classList.add('hidden');cameraMode=0;sync();focusGame();toast('HORIZON COUNTY','WASD TO DRIVE / M TO EXPLORE THE MAP');}
function pause(){if(mode!=='playing')return;mode='paused';clearInput();$('pause-overlay').classList.remove('hidden');$('resume-button').focus();}
function resume(){if(mode!=='paused')return;mode='playing';$('pause-overlay').classList.add('hidden');clearInput();focusGame();}
function menu(){mode='menu';clearInput();document.body.classList.remove('playing');$('menu').classList.remove('hidden');$('drive-hud').classList.add('hidden');$('pause-button').classList.add('hidden');for(const id of['pause-overlay','map-overlay','help-overlay','garage-overlay','settings-overlay'])$(id).classList.add('hidden');selectSpawn(selected);}
function recover(){recoverCar(state,world);sync();toast('BACK ON THE ROAD','RETURNED TO YOUR LAST SAFE POSITION');}
function travel(index){selected=index;mode='playing';$('map-overlay').classList.add('hidden');$('menu').classList.add('hidden');$('drive-hud').classList.remove('hidden');$('pause-overlay').classList.add('hidden');$('pause-button').classList.remove('hidden');document.body.classList.add('playing');state=newDriveState(world,world.spawns[index],currentCar.spec.id);clearInput();sync();initAudio();focusGame();toast(world.spawns[index].name.toUpperCase(),'FREE ROAM');}
const moods=[{name:'GOLDEN HOUR',top:0x80aac6,bottom:0xd9cbb3,sun:0xffd1a0,power:3.1,ambient:2.1,exposure:1.08},{name:'DAYLIGHT',top:0x6faacb,bottom:0xc9d9d6,sun:0xfff1db,power:3,ambient:2.4,exposure:1.05},{name:'BLUE HOUR',top:0x182b49,bottom:0x798899,sun:0xb8cafa,power:.65,ambient:.9,exposure:1.1}];
function setLighting(index){lighting=index;const m=moods[index];view.setSky(m.top,m.bottom);scene.background=new THREE.Color(m.bottom);scene.fog.color.set(m.bottom);sun.color.set(m.sun);sun.intensity=m.power;ambient.intensity=m.ambient;renderer.toneMappingExposure=m.exposure;scene.environmentIntensity=index===2?.28:.7;$('lighting-button').querySelector('span').textContent=m.name;$('time-value').textContent=m.name;lights=index===2;headlights.forEach(l=>l.visible=lights);trafficView.setNight(index===2);}
function toggleMap(){if(mode==='map'){closeMap();return;}if(['help','garage','settings'].includes(mode))return;modeBeforeMap=mode;mode='map';clearInput();$('pause-overlay').classList.add('hidden');$('map-overlay').classList.remove('hidden');drawFullMap();$('close-map').focus();}
function closeMap(){if(mode!=='map')return;$('map-overlay').classList.add('hidden');mode=modeBeforeMap;if(mode==='paused')$('pause-overlay').classList.remove('hidden');if(mode==='playing')focusGame();}
function showHelp(){if(['map','garage','settings','help'].includes(mode))return;modeBeforeHelp=mode;mode='help';clearInput();$('pause-overlay').classList.add('hidden');$('help-overlay').classList.remove('hidden');$('close-help').focus();}
function closeHelp(){$('help-overlay').classList.add('hidden');mode=modeBeforeHelp;if(mode==='paused')$('pause-overlay').classList.remove('hidden');if(mode==='playing')focusGame();}
function syncPaintControls(){const hex='#'+bodyMat.color.getHexString();document.querySelectorAll('[data-paint]').forEach(b=>{const on=b.dataset.paint===hex;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});}
function setVehicle(id){
  currentCar=garage.find(v=>v.spec.id===id)||garage[0];
  ({bodyMat,tailMat,wheels,steerWheels,flames}=currentCar);
  garage.forEach(v=>{v.car.visible=v===currentCar;});
  headlights.forEach(l=>{l.position.y=currentCar.spec.id==='trail'?.46:.21;l.position.z=-currentCar.spec.length/2-.05;});
  const paint=preference.paints[currentCar.spec.id];if(typeof paint==='string'&&/^#[0-9a-f]{6}$/i.test(paint))bodyMat.color.set(paint);
  preference.vehicle=currentCar.spec.id;state.vehicleId=currentCar.spec.id;state.speed=0;state.steering=0;state.motionHeading=state.heading;lastSpeed=0;acceleration=0;
  $('car-name').textContent=currentCar.spec.name.toUpperCase();$('car-class').textContent=currentCar.spec.className;
  $('garage-description').textContent=currentCar.spec.description;
  document.querySelectorAll('[data-vehicle]').forEach(b=>{const active=b.dataset.vehicle===currentCar.spec.id;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  clearInput();syncPaintControls();savePreferences();sync();
}
function openGarage(){if(mode==='garage'){closeGarage();return;}if(['map','help','settings'].includes(mode))return;modeBeforeGarage=mode;mode='garage';clearInput();$('pause-overlay').classList.add('hidden');$('garage-overlay').classList.remove('hidden');$('close-garage').focus();}
function closeGarage(){if(mode!=='garage')return;mode=modeBeforeGarage;$('garage-overlay').classList.add('hidden');if(mode==='paused')$('pause-overlay').classList.remove('hidden');if(mode==='playing')focusGame();}
function applyQuality(){
  const q=preference.quality;
  if(q!=='auto')resolutionScale=q==='quality'?1.75:1;
  renderer.setPixelRatio(Math.min(devicePixelRatio,resolutionScale));
  renderer.shadowMap.enabled=q!=='performance';
  $('quality-value').textContent=q.toUpperCase();$('quality-description').textContent=q==='auto'?'Resolution adapts to frame rate.':q==='quality'?'Higher resolution and soft sun shadows.':'Lower resolution. Sun shadows disabled.';
}
function updateTrafficSetting(){traffic.enabled=preference.traffic!==false;$('traffic-value').textContent=traffic.enabled?'LIGHT / 18 CARS':'OFF';$('traffic-toggle').setAttribute('aria-pressed',String(traffic.enabled));}
function openSettings(){if(mode==='settings'){closeSettings();return;}if(['map','help','garage'].includes(mode))return;modeBeforeSettings=mode;mode='settings';clearInput();$('pause-overlay').classList.add('hidden');$('settings-overlay').classList.remove('hidden');$('close-settings').focus();}
function closeSettings(){if(mode!=='settings')return;mode=modeBeforeSettings;$('settings-overlay').classList.add('hidden');if(mode==='paused')$('pause-overlay').classList.remove('hidden');if(mode==='playing')focusGame();}
// The card silhouettes are interface illustrations; the world uses 3D models.
$('vehicle-options').innerHTML=VEHICLES.map((v,i)=>`<button class="vehicle-card" data-vehicle="${v.id}" aria-pressed="false"><span>0${i+1} / ${v.className}</span><svg viewBox="0 0 260 100" aria-hidden="true"><path fill="currentColor" d="${i===2?'M24 65 30 42 70 37 92 17 182 17 207 44 234 49 239 73 24 73Z':i===1?'M18 62 27 49 70 44 101 24 166 24 195 45 233 52 240 73 18 73Z':'M18 63 31 53 83 46 112 27 163 27 192 48 229 53 240 72 18 72Z'}"/><path fill="#25353c" d="${i===2?'M84 38 99 23 175 23 190 40Z':'M94 44 116 31 160 31 177 45Z'}"/><g fill="#142127" stroke="#b5bdb7" stroke-width="5"><circle cx="64" cy="71" r="16"/><circle cx="201" cy="71" r="16"/></g></svg><strong>${v.name}</strong><small>${v.description}</small><div class="vehicle-metric"><span>POWER <i style="--bar:${v.accel/15*100}%"></i></span><span>OFF ROAD <i style="--bar:${v.offRoad/40*100}%"></i></span></div><b class="selected-label">SELECT CAR <span>↗</span></b></button>`).join('');
$('spawn-options').innerHTML=world.spawns.map((s,i)=>`<button class="spawn-card ${i===0?'active':''}" data-spawn="${i}" aria-pressed="${i===0}"><span>0${i+1} / ${s.tag}</span><strong>${s.name}</strong><small>${s.description}</small><i>↗</i></button>`).join('');
$('travel-options').innerHTML=world.spawns.map((s,i)=>`<button data-travel="${i}">${s.name} <span>↗</span><small>${s.tag}</small></button>`).join('');
const roadKm=view.stats.roadKm.toFixed(1);document.querySelector('.world-caption>span').textContent=roadKm+' KM OF ROADS';$('map-stats').textContent=`${roadKm} KM OF ROADS / ${view.stats.buildings} BUILDINGS`;

// The same atlas supplies the full map and rotating local minimap.
const atlas=document.createElement('canvas');atlas.width=atlas.height=1400;
const atlasCtx=atlas.getContext('2d'),b=world.bounds,span=Math.max(b.maxX-b.minX,b.maxZ-b.minZ),scale=1300/span;
const ox=(1400-(b.maxX-b.minX)*scale)/2,oz=(1400-(b.maxZ-b.minZ)*scale)/2;
const mapPoint=(x,z)=>[ox+(x-b.minX)*scale,oz+(z-b.minZ)*scale];
function makeAtlas(){
  atlasCtx.fillStyle='#365667';atlasCtx.fillRect(0,0,1400,1400);
  for(let py=0;py<1400;py+=6)for(let px=0;px<1400;px+=6){const x=(px-ox)/scale+b.minX,z=(py-oz)/scale+b.minZ,y=terrainHeight(x,z);if(x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ||y<.1)continue;atlasCtx.fillStyle=x<coast(z)+180?'#b6ad91':z<-650?`hsl(67 12% ${33+y*.10}%)`:'#7c897d';atlasCtx.fillRect(px,py,6,6);}
  atlasCtx.fillStyle='#64736e';for(const c of world.buildings){const p=mapPoint(c.x-c.w/2,c.z-c.d/2);atlasCtx.fillRect(p[0],p[1],c.w*scale,c.d*scale);}
  atlasCtx.lineCap='round';atlasCtx.lineJoin='round';
  for(const r of world.roads){atlasCtx.beginPath();r.samples.forEach((f,i)=>{const p=mapPoint(f.x,f.z);i?atlasCtx.lineTo(...p):atlasCtx.moveTo(...p);});atlasCtx.strokeStyle=r.kind==='highway'?'#c2b79c':'#bfc5bc';atlasCtx.lineWidth=(r.width+4)*scale;atlasCtx.stroke();atlasCtx.strokeStyle='#67716e';atlasCtx.lineWidth=r.width*scale;atlasCtx.stroke();}
  atlasCtx.fillStyle='#e1e1cf';atlasCtx.font='600 19px sans-serif';atlasCtx.textAlign='center';
  for(const [name,x,z] of[['DOWNTOWN',220,440],['PACIFIC BEACH',-1000,40],['CRESTLINE HILLS',140,-1470],['NORTH COAST',40,-2070],['EAST GATE',1260,290],['PORTSIDE',620,1230]]){const p=mapPoint(x,z);atlasCtx.fillText(name,...p);}
}
function mapMarkers(ctx,factor=1){
  for(const l of world.landmarks){const p=mapPoint(l.x,l.z);ctx.beginPath();ctx.fillStyle=visited.has(l.name)?'#f1f1e1':'#e5ad7c';ctx.arc(p[0],p[1],7*factor,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#152932';ctx.lineWidth=2*factor;ctx.stroke();}
  if(waypoint){const p=mapPoint(waypoint.x,waypoint.z);ctx.strokeStyle='#c8ff4a';ctx.lineWidth=3*factor;ctx.beginPath();ctx.arc(p[0],p[1],13*factor,0,Math.PI*2);ctx.moveTo(p[0]-19*factor,p[1]);ctx.lineTo(p[0]+19*factor,p[1]);ctx.moveTo(p[0],p[1]-19*factor);ctx.lineTo(p[0],p[1]+19*factor);ctx.stroke();}
}
function drawFullMap(){const ctx=$('full-map').getContext('2d');ctx.clearRect(0,0,900,900);ctx.save();ctx.scale(900/1400,900/1400);ctx.drawImage(atlas,0,0);mapMarkers(ctx,1.2);const p=mapPoint(state.x,state.z);ctx.translate(...p);ctx.rotate(-state.heading);ctx.fillStyle='#c8ff4a';ctx.strokeStyle='#17242b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(10,11);ctx.lineTo(0,6);ctx.lineTo(-10,11);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
function drawMinimap(){const ctx=$('minimap').getContext('2d'),p=mapPoint(state.x,state.z),zoom=1.05;
  ctx.fillStyle='#365667';ctx.fillRect(0,0,300,240);ctx.save();ctx.translate(150,150);ctx.rotate(state.heading);ctx.scale(zoom,zoom);ctx.translate(-p[0],-p[1]);ctx.drawImage(atlas,0,0);mapMarkers(ctx,.65);ctx.restore();
  ctx.fillStyle='#c8ff4a';ctx.strokeStyle='#17242b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(150,140);ctx.lineTo(157,159);ctx.lineTo(150,155);ctx.lineTo(143,159);ctx.closePath();ctx.fill();ctx.stroke();
  const northX=150+Math.sin(state.heading)*95,northY=150-Math.cos(state.heading)*95;ctx.fillStyle='#f2f2e5';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText('N',northX,clamp(northY,15,230));
}
function positionCar(dt,forceAlpha){const alpha=forceAlpha??(mode==='playing'?clamp(accumulator*120,0,1):1),lerp=THREE.MathUtils.lerp;
  car.position.set(lerp(previous.x,state.x,alpha),lerp(previous.y,state.y,alpha),lerp(previous.z,state.z,alpha));
  car.rotation.order='YXZ';car.rotation.y=previous.heading+Math.atan2(Math.sin(state.heading-previous.heading),Math.cos(state.heading-previous.heading))*alpha;
  const hx=-Math.sin(state.heading),hz=-Math.cos(state.heading),front=world.surface(state.x+hx*1.4,state.z+hz*1.4).height,back=world.surface(state.x-hx*1.4,state.z-hz*1.4).height;
  car.rotation.x=THREE.MathUtils.damp(car.rotation.x,Math.atan2(front-back,2.8),9,dt||.016);car.rotation.z=THREE.MathUtils.damp(car.rotation.z,-state.steering*Math.min(Math.abs(state.speed)/55,1)*.06,9,dt||.016);
  for(const w of wheels)w.rotation.x-=state.speed*dt/currentCar.spec.radius;
  currentCar.car.rotation.x=THREE.MathUtils.damp(currentCar.car.rotation.x,clamp(acceleration*.0015,-.035,.03),6,dt||.016);
  for(const pivot of steerWheels)pivot.rotation.y=-state.steering*.45/(1+Math.abs(state.speed)*.06);
  const input=controls.read(touch);tailMat.emissiveIntensity=input.brake?5:1.5;
  for(const flame of flames){flame.visible=mode==='playing'&&input.throttle&&input.boost&&state.speed>6&&state.boost>1;flame.scale.y=.85+Math.sin(time*39)*.15;}
  sun.position.set(car.position.x-130,car.position.y+190,car.position.z+110);sun.target.position.copy(car.position);
}
function updateCamera(dt,snap=false){
  if(mode==='menu'||mode==='garage'&&modeBeforeGarage==='menu'){cameraGoal.set(state.x-8.5,state.y+4.8,state.z+10);lookGoal.set(state.x-3.2,state.y+.6,state.z-.7);if(innerWidth<700){cameraGoal.set(state.x-10.5,state.y+7.8,state.z+16);lookGoal.set(state.x-1.3,state.y+1.2,state.z-1);}}
  else{const desired=car.rotation.y+state.steering*.12;
    if(snap)cameraHeading=state.heading;else cameraHeading+=Math.atan2(Math.sin(desired-cameraHeading),Math.cos(desired-cameraHeading))*(1-Math.exp(-5*dt));
    let back=cameraMode===1?6.4:cameraMode===2?17:10.5,high=cameraMode===1?2.5:cameraMode===2?8:4.3;
    for(let d=2;d<back;d+=1.5){const x=car.position.x+Math.sin(cameraHeading)*d,z=car.position.z+Math.cos(cameraHeading)*d;if(world.resolve(x,z,cameraHeading).hit){back=Math.max(2.5,d-1.5);break;}}
    cameraGoal.set(car.position.x+Math.sin(cameraHeading)*back,car.position.y+high,car.position.z+Math.cos(cameraHeading)*back);cameraGoal.y=Math.max(cameraGoal.y,terrainHeight(cameraGoal.x,cameraGoal.z)+1.2);
    lookGoal.set(car.position.x-Math.sin(cameraHeading)*10,car.position.y+.65,car.position.z-Math.cos(cameraHeading)*10);
  }
  camera.position.lerp(cameraGoal,snap?1:1-Math.exp(-9*dt));look.lerp(lookGoal,snap?1:1-Math.exp(-11*dt));camera.lookAt(look);
  const fov=mode==='menu'?49:57+Math.abs(state.speed)/75*7,next=snap?fov:THREE.MathUtils.damp(camera.fov,fov,4,dt);if(Math.abs(next-camera.fov)>.001){camera.fov=next;camera.updateProjectionMatrix();}
}
function updateHUD(){const input=controls.read(touch),surface=world.surface(state.x,state.z);
  $('district-label').textContent=surface.district;$('road-label').textContent=surface.road;$('distance-value').textContent=(state.distance/1000).toFixed(2);$('discovery-value').textContent=`${visited.size} / 6 PLACES DISCOVERED`;
  $('speed').textContent=String(Math.round(Math.abs(state.speed)*3.6)).padStart(3,'0');$('gear').textContent=state.speed<-.1?'R':state.speed<1?'N':Math.min(6,Math.floor(state.speed/10)+1);$('boost-fill').style.width=state.boost+'%';
  $('surface-label').textContent=(surface.water?'IN WATER / R TO RECOVER':surface.onRoad?'ASPHALT':'OFF ROAD')+' / LIGHTS '+(lights?'ON':'OFF');
  for(const [key,on] of Object.entries({throttle:input.throttle,brake:input.brake,left:input.left,right:input.right}))document.querySelectorAll(`[data-key="${key}"]`).forEach(k=>k.classList.toggle('pressed',!!on));
  $('steering-label').textContent=input.steer<0?'← LEFT':input.steer>0?'RIGHT →':Math.abs(state.speed)<.1?'W + A / D TO TURN':'MANUAL STEERING';$('steering-position').style.transform=`translateX(${state.steering*(innerWidth<700?25:35)}px)`;
  $('waypoint-hud').classList.toggle('hidden',!waypoint);if(waypoint){const d=Math.hypot(waypoint.x-state.x,waypoint.z-state.z);$('waypoint-distance').textContent=d>1000?(d/1000).toFixed(2)+' KM':Math.round(d)+' M';if(d<20){waypoint=null;toast('WAYPOINT REACHED');}}
  drawMinimap();
}
function physics(dt){previous={...state};stepTraffic(traffic,world,state,dt);for(const event of stepDrive(state,world,controls.read(touch),dt))if(event==='recover'){previous={...state};toast('RETURNED TO THE ROAD','WATER RECOVERY');}
  collideTraffic(state,traffic);state.y=world.surface(state.x,state.z).height+.55;acceleration=(state.speed-lastSpeed)/dt;lastSpeed=state.speed;
  for(const l of world.landmarks)if(!visited.has(l.name)&&Math.hypot(state.x-l.x,state.z-l.z)<38){visited.add(l.name);toast(l.name.toUpperCase(),'NEW PLACE DISCOVERED');try{localStorage.setItem('horizon-world-discoveries-v1',JSON.stringify([...visited]));}catch{}}
}
function frame(timestamp){requestAnimationFrame(frame);const rawDt=(timestamp-lastTime)/1000||.016,dt=Math.min(rawDt,.05);lastTime=timestamp;time+=dt;hudTime+=dt;
  if(mode==='playing'){accumulator+=dt;while(accumulator>=1/120){physics(1/120);accumulator-=1/120;}}
  if(mode==='playing'||mode==='menu'||mode==='garage'){positionCar(mode==='playing'?dt:0);updateCamera(dt);}view.update(time);trafficView.update(mode==='playing'?clamp(accumulator*120,0,1):1);
  if(mode==='playing'){performanceTime+=rawDt;performanceFrames++;if(performanceTime>=3){measuredFps=Math.round(performanceFrames/performanceTime);$('fps-value').textContent=measuredFps+' FPS';if(preference.quality==='auto'){resolutionScale=clamp(resolutionScale+(measuredFps<44?-.15:measuredFps>57?.05:0),.8,1.5);applyQuality();}performanceTime=0;performanceFrames=0;}}
  if(mode!=='menu'&&hudTime>1/15){updateHUD();hudTime=0;}
  if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('visible');}
  if(audio.ctx){const active=mode==='playing'&&!muted;audio.osc.frequency.setTargetAtTime(38+Math.abs(state.speed)*2.7+(controls.read(touch).throttle?10:0),audio.ctx.currentTime,.09);audio.gain.gain.setTargetAtTime(active?.006+Math.abs(state.speed)*.0002:0,audio.ctx.currentTime,.08);}
  renderer.render(scene,camera);
}
// Keyboard input is attached in capture phase and focuses the canvas explicitly.
window.addEventListener('keydown',event=>{
  if(controls.keydown(event,mode==='playing'))return;if(event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
  const key=(event.key||'').toLowerCase(),code=event.code;
  if(code==='KeyM'||key==='m'){event.preventDefault();toggleMap();return;}
  if(code==='Escape'||code==='KeyP'||key==='p'){event.preventDefault();if(mode==='map')closeMap();else if(mode==='help')closeHelp();else if(mode==='garage')closeGarage();else if(mode==='settings')closeSettings();else if(mode==='playing')pause();else if(mode==='paused')resume();return;}
  if(code==='KeyG'||key==='g'){event.preventDefault();openGarage();return;}
  if(code==='KeyO'||key==='o'){event.preventDefault();openSettings();return;}
  if(code==='KeyV'||key==='v'){muted=!muted;$('sound-button').style.opacity=muted?'.4':'1';return;}
  if(code==='KeyL'||key==='l'){lights=!lights;headlights.forEach(l=>l.visible=lights);return;}
  if(mode==='playing'&&(code==='KeyR'||key==='r')){recover();return;}
  if(mode==='playing'&&(code==='KeyC'||key==='c')){cameraMode=(cameraMode+1)%3;toast(['CHASE CAMERA','LOW CAMERA','HIGH CAMERA'][cameraMode],'',1);return;}
  if(mode==='menu'&&code==='Enter')startDrive();
},true);
window.addEventListener('keyup',event=>controls.keyup(event),true);window.addEventListener('blur',()=>{clearInput();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();}});
canvas.addEventListener('pointerdown',focusGame);
document.querySelectorAll('[data-spawn]').forEach(b=>b.addEventListener('click',()=>selectSpawn(+b.dataset.spawn)));document.querySelectorAll('[data-travel]').forEach(b=>b.addEventListener('click',()=>travel(+b.dataset.travel)));
document.querySelectorAll('[data-paint]').forEach(b=>b.addEventListener('click',()=>{bodyMat.color.set(b.dataset.paint);preference.paints[currentCar.spec.id]=b.dataset.paint;savePreferences();syncPaintControls();}));
document.querySelectorAll('[data-vehicle]').forEach(b=>b.addEventListener('click',()=>setVehicle(b.dataset.vehicle)));
$('garage-button').addEventListener('click',openGarage);$('menu-garage-button').addEventListener('click',openGarage);$('close-garage').addEventListener('click',closeGarage);$('use-car').addEventListener('click',closeGarage);
$('settings-button').addEventListener('click',openSettings);$('close-settings').addEventListener('click',closeSettings);$('close-settings-button').addEventListener('click',closeSettings);
$('quality-toggle').addEventListener('click',()=>{preference.quality=['auto','quality','performance'][(['auto','quality','performance'].indexOf(preference.quality)+1)%3];applyQuality();savePreferences();});
$('traffic-toggle').addEventListener('click',()=>{preference.traffic=!traffic.enabled;updateTrafficSetting();trafficView.update();savePreferences();});
$('play-button').addEventListener('click',startDrive);$('pause-button').addEventListener('click',pause);$('resume-button').addEventListener('click',resume);$('exit-button').addEventListener('click',menu);$('recover-button').addEventListener('click',()=>{resume();recover();});$('brand-home').addEventListener('click',e=>{e.preventDefault();if(mode==='playing')pause();});
$('help-button').addEventListener('click',showHelp);$('close-help').addEventListener('click',closeHelp);$('close-help-button').addEventListener('click',closeHelp);$('map-button').addEventListener('click',toggleMap);$('mini-map-button').addEventListener('click',toggleMap);$('close-map').addEventListener('click',closeMap);$('clear-waypoint').addEventListener('click',()=>{waypoint=null;drawFullMap();});
$('lighting-button').addEventListener('click',()=>setLighting((lighting+1)%3));$('time-toggle').addEventListener('click',()=>setLighting((lighting+1)%3));$('sound-button').addEventListener('click',()=>{initAudio();muted=!muted;$('sound-button').style.opacity=muted?'.4':'1';});
$('full-map').addEventListener('pointerdown',e=>{const r=e.currentTarget.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*1400,py=(e.clientY-r.top)/r.height*1400,x=(px-ox)/scale+b.minX,z=(py-oz)/scale+b.minZ;if(x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ||world.surface(x,z).water)return;waypoint={x,z};drawFullMap();});
document.querySelectorAll('[data-control]').forEach(button=>{const key=button.dataset.control;button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);touch[key]=true;button.classList.add('pressed');});for(const name of['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>{touch[key]=false;button.classList.remove('pressed');});});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);applyQuality();camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(mode==='menu')updateCamera(1,true);});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();$('fatal-error').classList.remove('hidden');$('error-message').textContent='The graphics connection was interrupted. Reload to continue driving.';});
makeAtlas();setLighting(0);setVehicle(preference.vehicle);applyQuality();updateTrafficSetting();selectSpawn(0);$('loading').classList.add('hidden');requestAnimationFrame(frame);
window.horizon={getState:()=>({...state,mode,world:'Horizon County',district:world.district(state.x,state.z),vehicle:currentCar.spec.id,traffic:traffic.enabled,trafficTime:traffic.time,assets:assetsStatus,fps:measuredFps,quality:preference.quality}),getInput:()=>controls.read(touch),getRendererInfo:()=>({...renderer.info.render}),getWorld:()=>world};
