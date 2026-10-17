import * as THREE from './vendor/three.module.min.js';
import {addReflections} from './car.js?v=high-speed-steering-12';
import {createDrivingControls} from './controls.js?v=high-speed-steering-12';
import {makeOpenWorld,terrainHeight,coast,clamp} from './world-data.js?v=high-speed-steering-12';
import {buildOpenWorld} from './world-view.js?v=high-speed-steering-12';
import {newDriveState,stepDrive,recoverCar} from './driving.js?v=high-speed-steering-12';
import {VEHICLES,createVehicle,createGarageLoader} from './vehicles.js?v=high-speed-steering-12';
import {makeTraffic,stepTraffic,collideTraffic} from './traffic.js?v=high-speed-steering-12';
import {buildTrafficView} from './traffic-view.js?v=high-speed-steering-12';
import {loadWorldAssets} from './assets.js?v=high-speed-steering-12';
import {animateVehicle} from './vehicle-motion.js?v=high-speed-steering-12';
import {createEngineAudio,engineTelemetry} from './engine-audio.js?v=high-speed-steering-12';
import {createActivities,createCareer} from './career.js?v=high-speed-steering-12';
import {createRoutePlanner} from './navigation.js?v=high-speed-steering-12';
import {createCareerUI} from './career-ui.js?v=high-speed-steering-12';
import {buildActivityView} from './activity-view.js?v=high-speed-steering-12';
import {createPerformanceCapture} from './performance-capture.js?v=high-speed-steering-12';
import {createPerformanceUI} from './performance-ui.js?v=high-speed-steering-12';
import {LIGHTING_MOODS} from './lighting.js?v=high-speed-steering-12';
import {reactToHorn} from './traffic.js?v=high-speed-steering-12';
import {renderPixelRatio,createFrameBudget,stabilizeSun,surfaceDepthBias} from './render-quality.js?v=high-speed-steering-12';
const $=id=>document.getElementById(id),canvas=$('world');
let renderer;
try{const context=canvas.getContext('webgl2',{antialias:true,powerPreference:'high-performance'}),reversedDepth=!!context?.getExtension?.('EXT_clip_control');renderer=new THREE.WebGLRenderer({canvas,context,antialias:true,reversedDepthBuffer:reversedDepth,logarithmicDepthBuffer:!reversedDepth,powerPreference:'high-performance'});}catch(error){$('loading').classList.add('hidden');$('fatal-error').classList.remove('hidden');$('error-message').textContent='This world needs a browser with WebGL and hardware acceleration.';throw error;}
renderer.setPixelRatio(renderPixelRatio('auto',devicePixelRatio,innerWidth,innerHeight));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0xd9cbb3,.00048);
const camera=new THREE.PerspectiveCamera(57,innerWidth/innerHeight,.3,8500);
const ambient=new THREE.HemisphereLight(0xbcd8e9,0x77714f,2.1);scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffd1a0,3.1);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.near=1;sun.shadow.camera.far=520;
Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65});sun.shadow.bias=-.00015;sun.shadow.normalBias=.055;scene.add(sun,sun.target);
const reversedDepth=!!renderer.capabilities?.reversedDepthBuffer;
const world=makeOpenWorld(),view=buildOpenWorld(scene,world,{reversedDepth});
let careerStorage;try{careerStorage=localStorage;}catch{}
const activities=createActivities(world),career=createCareer(activities,careerStorage),planner=createRoutePlanner(world),activityView=buildActivityView(scene,world,reversedDepth),performanceCapture=createPerformanceCapture();
let careerUI,performanceUI,hornUntil=0,incidentCooldown=0,modeBeforeJobs='menu';
const car=new THREE.Group();scene.add(car);
const garage=VEHICLES.map(v=>createVehicle(car,v.id)),garageLoader=createGarageLoader(garage);
let selectedModelPromise=Promise.resolve();
let currentCar=garage[0],{bodyMat,tailMat,wheels,steerWheels,flames}=currentCar;
let preference={vehicle:'clubsport',paints:{},quality:'auto',graphicsVersion:0,traffic:true};
try{Object.assign(preference,JSON.parse(localStorage.getItem('horizon-garage-v1')||'{}'));}catch{}
if(preference.graphicsVersion!==3){preference.quality='auto';preference.graphicsVersion=3;}
if(!['auto','performance','quality'].includes(preference.quality))preference.quality='auto';
if(!preference.paints||typeof preference.paints!=='object')preference.paints={};
function savePreferences(){try{localStorage.setItem('horizon-garage-v1',JSON.stringify(preference));}catch{}}
const traffic=makeTraffic(world),trafficView=buildTrafficView(scene,world,traffic);traffic.enabled=preference.traffic!==false;
addReflections(scene,renderer);
let assetsStatus='loading';const worldAssetsPromise=loadWorldAssets(scene,renderer,view).then(result=>{assetsStatus=result.loaded===result.total?'ready':'fallback';}).catch(()=>{assetsStatus='fallback';});
const headlights=[];
for(const side of[-1,1]){const light=new THREE.SpotLight(0xe5f3ff,95,85,.48,.65,1.1);light.position.set(side*.7,.2,-2.3);light.target.position.set(side*2,-.4,-38);car.add(light,light.target);headlights.push(light);}
const controls=createDrivingControls(),touch={left:false,right:false,throttle:false,brake:false,boost:false};
let selected=0,state=newDriveState(world),previous={...state,wheelDistances:[...state.wheelDistances]},mode='menu',cameraMode=0,cameraHeading=state.heading,time=0,populationTime=0,lastTime=0,accumulator=0,hudTime=0,toastTime=0;
let muted=false,lights=false,lighting=0,waypoint=null,modeBeforeMap='menu',modeBeforeHelp='menu',modeBeforeGarage='menu',modeBeforeSettings='menu';
const frameBudget=createFrameBudget();
let cameraBack=10.5,measuredFps=0,acceleration=0,lastSpeed=0,lastIdleRender=0,renderDirty=true,wasPlaying=false,graphicsReady=false;
// A two-triangle contact shadow grounds the detailed car without rendering the
// entire county into a shadow map every frame in the smooth presets.
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
const shadowContext=shadowCanvas.getContext('2d'),shadowGradient=shadowContext.createRadialGradient(32,32,9,32,32,32);shadowGradient.addColorStop(0,'rgba(0,8,12,.5)');shadowGradient.addColorStop(1,'rgba(0,8,12,0)');shadowContext.fillStyle=shadowGradient;shadowContext.fillRect(0,0,64,64);
const contactShadow=new THREE.Mesh(new THREE.PlaneGeometry(3.3,6).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,...surfaceDepthBias(reversedDepth,2)}));scene.add(contactShadow);
const visited=new Set();try{for(const name of JSON.parse(localStorage.getItem('horizon-world-discoveries-v1')||'[]'))visited.add(name);}catch{}
const look=new THREE.Vector3(),lookGoal=new THREE.Vector3(),cameraGoal=new THREE.Vector3();
const audio=createEngineAudio();
function initAudio(){audio.start();}
function clearInput(){audio.silence();controls.clear();Object.keys(touch).forEach(k=>touch[k]=false);document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('pressed'));}
function focusGame(){canvas.focus({preventScroll:true});}
function sync(){state.tuning=career.effects(currentCar.spec.id);careerUI?.update(true);activityView.update(career,state,time);previous={...state,wheelDistances:[...state.wheelDistances]};accumulator=0;trafficView.update(1,state);view.population.update(populationTime,state,{hornUntil,trafficTime:traffic.time,signalsEnabled:traffic.enabled});positionCar(0,1);updateCamera(1,true);view.visibility.update(state.x,state.z,preference.quality,true,camera,preference.quality==='auto'?frameBudget.status.tier:0);updateHUD();renderDirty=true;if(graphicsReady)renderer.render(scene,camera);}
function toast(title,sub='',duration=2.5){$('toast').textContent=title;if(sub){const small=document.createElement('small');small.textContent=sub;$('toast').appendChild(small);}$('toast').classList.add('visible');toastTime=duration;}
function selectSpawn(index){selected=index;state=newDriveState(world,world.spawns[index],currentCar.spec.id);clearInput();sync();document.querySelectorAll('[data-spawn]').forEach(b=>{const on=+b.dataset.spawn===index;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});}
function startDrive(){initAudio();clearInput();mode='playing';state=newDriveState(world,world.spawns[selected],currentCar.spec.id);document.body.classList.add('playing');$('menu').classList.add('hidden');$('drive-hud').classList.remove('hidden');$('pause-button').classList.remove('hidden');for(const id of['pause-overlay','map-overlay','help-overlay','garage-overlay','settings-overlay','jobs-overlay'])$(id).classList.add('hidden');cameraMode=0;sync();focusGame();toast('HORIZON COUNTY','WASD TO DRIVE / M TO EXPLORE THE MAP');}
function pause(){if(mode!=='playing')return;mode='paused';clearInput();$('pause-overlay').classList.remove('hidden');$('resume-button').focus();}
function resume(){if(mode!=='paused')return;mode='playing';$('pause-overlay').classList.add('hidden');clearInput();focusGame();}
function menu(){if(career.active)career.abandon();mode='menu';clearInput();document.body.classList.remove('playing');$('menu').classList.remove('hidden');$('drive-hud').classList.add('hidden');$('pause-button').classList.add('hidden');for(const id of['pause-overlay','map-overlay','help-overlay','garage-overlay','settings-overlay','jobs-overlay'])$(id).classList.add('hidden');selectSpawn(selected);}
function recover(){career.recover();recoverCar(state,world);sync();if(!career.active)toast('BACK ON THE ROAD','RETURNED TO YOUR LAST SAFE POSITION');}
function travel(index){if(career.active){toast('FINISH YOUR RUN FIRST','J / VIEW OR ABANDON THE ACTIVE RUN');return;}selected=index;mode='playing';$('map-overlay').classList.add('hidden');$('menu').classList.add('hidden');$('drive-hud').classList.remove('hidden');$('pause-overlay').classList.add('hidden');$('pause-button').classList.remove('hidden');document.body.classList.add('playing');state=newDriveState(world,world.spawns[index],currentCar.spec.id);clearInput();sync();initAudio();focusGame();toast(world.spawns[index].name.toUpperCase(),'FREE ROAM');}
const moods=LIGHTING_MOODS;
function setLighting(index){renderDirty=true;lighting=index;const m=moods[index];view.setSky(m.top,m.bottom);scene.background=new THREE.Color(m.bottom);scene.fog.color.set(m.bottom);sun.color.set(m.sun);sun.intensity=m.power;ambient.intensity=m.ambient;ambient.color.set(m.sky);ambient.groundColor.set(m.ground);scene.fog.density=m.fog;renderer.toneMappingExposure=m.exposure;scene.environmentIntensity=m.environment;$('lighting-button').querySelector('span').textContent=m.name;$('time-value').textContent=m.name;lights=index===2;headlights.forEach(l=>l.visible=lights);trafficView.setNight(index===2);view.city.facades.setNight(index===2);}
function toggleMap(){if(mode==='map'){closeMap();return;}if(['help','garage','settings','jobs'].includes(mode))return;modeBeforeMap=mode;mode='map';clearInput();$('pause-overlay').classList.add('hidden');$('map-overlay').classList.remove('hidden');drawFullMap();$('close-map').focus();}
function closeMap(){if(mode!=='map')return;$('map-overlay').classList.add('hidden');mode=modeBeforeMap;if(mode==='paused')$('pause-overlay').classList.remove('hidden');if(mode==='playing')focusGame();}
function showHelp(){if(['map','garage','settings','help','jobs'].includes(mode))return;modeBeforeHelp=mode;mode='help';clearInput();$('pause-overlay').classList.add('hidden');$('help-overlay').classList.remove('hidden');$('close-help').focus();}
function closeHelp(){$('help-overlay').classList.add('hidden');mode=modeBeforeHelp;if(mode==='paused')$('pause-overlay').classList.remove('hidden');if(mode==='playing')focusGame();}
function syncPaintControls(){const hex='#'+bodyMat.color.getHexString();document.querySelectorAll('[data-paint]').forEach(b=>{const on=currentCar.spec.paintable!==false&&b.dataset.paint===hex;b.disabled=currentCar.spec.paintable===false;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});}
function setVehicle(id){
  currentCar=garage.find(v=>v.spec.id===id)||garage[0];
  ({bodyMat,tailMat,wheels,steerWheels,flames}=currentCar);
  garage.forEach(v=>{v.car.visible=v===currentCar;});
  headlights.forEach(l=>{l.position.y=currentCar.spec.suv?.46:.21;l.position.z=-currentCar.spec.length/2-.05;});
  const paint=preference.paints[currentCar.spec.id];if(currentCar.spec.paintable!==false&&typeof paint==='string'&&/^#[0-9a-f]{6}$/i.test(paint))bodyMat.color.set(paint);
  preference.vehicle=currentCar.spec.id;state.vehicleId=currentCar.spec.id;state.speed=0;state.steering=0;state.motionHeading=state.heading;state.steerAngle=0;state.yawRate=0;state.wheelTravel=0;state.wheelDistances=[0,0,0,0];state.verticalSpeed=0;state.reverseHold=0;state.longitudinalAcceleration=0;state.grounded=true;state.y=world.surface(state.x,state.z).height+.55;lastSpeed=0;acceleration=0;
  $('car-name').textContent=currentCar.spec.name.toUpperCase();$('car-class').textContent=currentCar.spec.className;
  $('garage-description').textContent=currentCar.spec.description;
  document.querySelectorAll('[data-vehicle]').forEach(b=>{const active=b.dataset.vehicle===currentCar.spec.id;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  selectedModelPromise=requestSelectedModel();
  state.tuning=career.effects(currentCar.spec.id);careerUI?.renderGarage();clearInput();syncPaintControls();savePreferences();sync();
}
function openGarage(){if(mode==='garage'){closeGarage();return;}if(['map','help','settings','jobs'].includes(mode))return;modeBeforeGarage=mode;mode='garage';clearInput();$('pause-overlay').classList.add('hidden');careerUI?.renderGarage();$('garage-overlay').classList.remove('hidden');$('close-garage').focus();}
function closeGarage(){if(mode!=='garage')return;mode=modeBeforeGarage;$('garage-overlay').classList.add('hidden');if(mode==='paused')$('pause-overlay').classList.remove('hidden');if(mode==='playing')focusGame();}
function applyQuality(){
  const q=preference.quality;view.city.facades.setDetail(q,innerWidth);
  const ratio=renderPixelRatio(q,devicePixelRatio,innerWidth,innerHeight,frameBudget.status.scale);if(Math.abs(renderer.getPixelRatio()-ratio)>.001)renderer.setPixelRatio(ratio);
  renderer.shadowMap.enabled=q==='quality';contactShadow.visible=q!=='quality';view.visibility.update(state.x,state.z,q,true,camera,q==='auto'?frameBudget.status.tier:0);renderDirty=true;
  $('quality-value').textContent=q==='quality'?'CLARITY':q==='auto'?'SMOOTH / 60 FPS TARGET':'PERFORMANCE';$('quality-description').textContent=q==='auto'?'Adapts scenery and resolution to the frame budget.':q==='quality'?'High-DPI detail and soft shadows. More GPU work.':'Shorter detail range and a smaller pixel budget.';
}
function updateTrafficSetting(){traffic.enabled=preference.traffic!==false;$('traffic-value').textContent=traffic.enabled?'LIGHT / 18 CARS':'OFF';$('traffic-toggle').setAttribute('aria-pressed',String(traffic.enabled));}
function openSettings(){if(mode==='settings'){closeSettings();return;}if(['map','help','garage','jobs'].includes(mode))return;modeBeforeSettings=mode;mode='settings';clearInput();$('pause-overlay').classList.add('hidden');$('settings-overlay').classList.remove('hidden');performanceUI?.update();$('close-settings').focus();}
function closeSettings(){if(mode!=='settings')return;mode=modeBeforeSettings;$('settings-overlay').classList.add('hidden');if(mode==='paused')$('pause-overlay').classList.remove('hidden');if(mode==='playing')focusGame();}
function modelStatus(){const v=currentCar;$('car-asset-status').textContent=(v.assetStatus==='ready'?'DETAILED MODEL':v.assetStatus==='loading'?'LOADING DETAIL':v.assetStatus==='error'?'DETAIL UNAVAILABLE / RESELECT TO RETRY':'ROAD MODEL')+' / '+v.spec.name.toUpperCase()+' · BY '+v.spec.author.toUpperCase()+(v.spec.paintable===false?' · FACTORY YELLOW':'');}
function requestSelectedModel(){const v=currentCar;const promise=garageLoader.select(v,()=>{if(v===currentCar)$('loading-detail').textContent='LOADING '+v.spec.name.toUpperCase();});modelStatus();return promise.then(()=>{if(v===currentCar){modelStatus();renderDirty=true;sync();}}).catch(()=>{if(v===currentCar){modelStatus();renderDirty=true;}});}
$('vehicle-options').innerHTML=VEHICLES.map((v,i)=>`<button class="vehicle-card" data-vehicle="${v.id}" aria-pressed="false"><span>0${i+1} / ${v.className}</span><img src="${v.thumbnail}" alt="${v.name} 3D model" loading="lazy" width="320" height="180"><strong>${v.name}</strong><small>${v.description}</small><div class="vehicle-metric"><span>POWER <i style="--bar:${v.accel/15*100}%"></i></span><span>OFF ROAD <i style="--bar:${v.offRoad/40*100}%"></i></span></div><b class="selected-label">SELECT CAR <span>↗</span></b></button>`).join('');
$('spawn-options').innerHTML=world.spawns.map((s,i)=>`<button class="spawn-card ${i===0?'active':''}" data-spawn="${i}" aria-pressed="${i===0}"><span>0${i+1} / ${s.tag}</span><strong>${s.name}</strong><small>${s.description}</small><i>↗</i></button>`).join('');
$('travel-options').innerHTML=world.spawns.map((s,i)=>`<button data-travel="${i}">${s.name} <span>↗</span><small>${s.tag}</small></button>`).join('');
const roadKm=view.stats.roadKm.toFixed(1);document.querySelector('.world-caption>span').textContent=roadKm+' KM OF ROADS';$('map-stats').textContent=`${roadKm} KM OF ROADS / ${view.stats.buildings} BUILDINGS / ${view.cityStats.types} STYLES`;

function openJobs(){if(mode==='jobs'){closeJobs();return;}if(['map','help','garage','settings'].includes(mode))return;modeBeforeJobs=mode;mode='jobs';clearInput();$('pause-overlay').classList.add('hidden');careerUI.renderBoard();$('jobs-overlay').classList.remove('hidden');$('close-jobs').focus();}
function closeJobs(){if(mode!=='jobs')return;$('jobs-overlay').classList.add('hidden');mode=modeBeforeJobs;if(mode==='paused')$('pause-overlay').classList.remove('hidden');if(mode==='playing')focusGame();}
function startActivity(id){if(career.active)return;if(modeBeforeJobs==='menu')startDrive();else{closeJobs();if(mode==='paused')resume();}if(career.start(id)){clearInput();sync();focusGame();}}
function purchaseUpgrade(id){const purchase=career.purchase(currentCar.spec.id,id);if(!purchase.ok){toast('UPGRADE UNAVAILABLE',purchase.reason);return;}state.tuning=career.effects(currentCar.spec.id);careerUI.renderGarage();careerUI.renderBoard();toast(purchase.name.toUpperCase(),'LEVEL '+purchase.level+' INSTALLED');audio.effect('reward',.35);}
function startBenchmark(){if(mode==='settings')closeSettings();if(mode==='menu')startDrive();else if(mode==='paused')resume();performanceCapture.start({quality:preference.quality,width:innerWidth,height:innerHeight,devicePixelRatio,vehicle:currentCar.spec.id,traffic:traffic.enabled,district:world.district(state.x,state.z)});performanceUI.update();toast('60 SECOND PERFORMANCE DRIVE','DRIVE THROUGH BUSY AREAS / MENUS PAUSE THE CAPTURE');focusGame();}
function honk(){if(mode!=='playing')return;audio.effect('horn');hornUntil=populationTime+1.1;reactToHorn(traffic,state);}
careerUI=createCareerUI({career,activities,planner,getState:()=>state,getVehicle:()=>currentCar.spec.id,startActivity,purchase:purchaseUpgrade,notify:(title,sub,effect)=>{if(title)toast(title,sub);if(effect)audio.effect(effect);}});
performanceUI=createPerformanceUI(performanceCapture,startBenchmark);

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
  atlasCtx.fillStyle='#baa788';atlasCtx.strokeStyle='#baa788';
  for(const deck of world.life.decks){if(deck.kind==='boardwalk'){atlasCtx.beginPath();for(let z=deck.minZ;z<=deck.maxZ;z+=10){const p=mapPoint(coast(z)+deck.offset,z);z===deck.minZ?atlasCtx.moveTo(...p):atlasCtx.lineTo(...p);}atlasCtx.lineWidth=Math.max(1.2,deck.width*scale);atlasCtx.stroke();}else{const p=mapPoint(deck.minX,deck.minZ);atlasCtx.fillRect(p[0],p[1],Math.max(1.2,(deck.maxX-deck.minX)*scale),Math.max(1.2,(deck.maxZ-deck.minZ)*scale));}}
  for(const p of world.life.props){if(!['court','playground','container','container-stack','tower','plane'].includes(p.kind))continue;const point=mapPoint(p.x,p.z);atlasCtx.save();atlasCtx.translate(...point);atlasCtx.rotate(-p.angle);atlasCtx.fillStyle=p.kind==='court'?'#528b8a':p.site==='port'?'#9d7b58':'#9ba69a';atlasCtx.fillRect(-p.w*scale/2,-p.d*scale/2,p.w*scale,p.d*scale);atlasCtx.restore();}
  atlasCtx.fillStyle='#e1e1cf';atlasCtx.font='600 19px sans-serif';atlasCtx.textAlign='center';
  for(const [name,x,z] of[['DOWNTOWN',220,440],['PACIFIC BEACH',-1000,40],['CRESTLINE HILLS',140,-1470],['NORTH COAST',40,-2070],['EAST GATE',1260,290],['PORTSIDE',620,1230]]){const p=mapPoint(x,z);atlasCtx.fillText(name,...p);}
}
function mapMarkers(ctx,factor=1){careerUI.drawRoute(ctx,mapPoint);
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
  const hx=-Math.sin(car.rotation.y),hz=-Math.cos(car.rotation.y),wb=currentCar.spec.wheelbase,track=currentCar.spec.track,fz=-(currentCar.spec.wheels[0][2]+currentCar.spec.wheels[1][2])/2,rz=(currentCar.spec.wheels[2][2]+currentCar.spec.wheels[3][2])/2,front=world.surface(car.position.x+hx*fz,car.position.z+hz*fz).height,back=world.surface(car.position.x-hx*rz,car.position.z-hz*rz).height;
  const right=world.surface(car.position.x+Math.cos(car.rotation.y)*track/2,car.position.z-Math.sin(car.rotation.y)*track/2).height,left=world.surface(car.position.x-Math.cos(car.rotation.y)*track/2,car.position.z+Math.sin(car.rotation.y)*track/2).height;
  const pitch=state.grounded?Math.atan2(front-back,wb):Math.atan2(state.verticalSpeed,Math.max(8,Math.abs(state.speed))),roll=state.grounded?clamp(Math.atan2(right-left,track),-.3,.3):car.rotation.z;
  car.rotation.x=forceAlpha===1?pitch:THREE.MathUtils.damp(car.rotation.x,pitch,12,dt||.016);car.rotation.z=forceAlpha===1?roll:THREE.MathUtils.damp(car.rotation.z,roll,12,dt||.016);
  animateVehicle(currentCar,{...state,steerAngle:lerp(previous.steerAngle||0,state.steerAngle||0,alpha),wheelTravel:lerp(previous.wheelTravel||0,state.wheelTravel||0,alpha)},previous,alpha);
  if(currentCar.bodyPivot){currentCar.bodyPivot.rotation.x=THREE.MathUtils.damp(currentCar.bodyPivot.rotation.x,clamp((state.longitudinalAcceleration||0)*.0015,-.025,.025),6,dt||.016);currentCar.bodyPivot.rotation.z=THREE.MathUtils.damp(currentCar.bodyPivot.rotation.z,clamp(-(state.lateralAcceleration||0)*.001,-.022,.022),7,dt||.016);}
  const input=controls.read(touch);tailMat.emissiveIntensity=input.brake?5:1.5;for(const lamp of currentCar.lampMaterials||[])lamp.emissiveIntensity=tailMat.emissiveIntensity*.4;
  for(const flame of flames){flame.visible=mode==='playing'&&input.throttle&&input.boost&&state.speed>6&&state.boost>1;flame.scale.y=.85+Math.sin(time*39)*.15;}
  stabilizeSun(sun,car.position);
  contactShadow.position.set(car.position.x,world.surface(car.position.x,car.position.z).height+.022,car.position.z);contactShadow.rotation.copy(car.rotation);contactShadow.scale.set(currentCar.spec.width/1.94,1,currentCar.spec.length/4.53);contactShadow.material.opacity=state.grounded?1:clamp(1-(car.position.y-contactShadow.position.y-.55)/3,0,1);contactShadow.visible=preference.quality!=='quality';
}
function cycleCamera(){if(mode!=='playing')return;cameraMode=(cameraMode+1)%4;sync();toast(['CHASE CAMERA','LOW CAMERA','HIGH CAMERA','FRONT WHEEL CAMERA'][cameraMode],'',1);}
function updateCamera(dt,snap=false){
  if(mode==='menu'||mode==='garage'&&modeBeforeGarage==='menu'){cameraGoal.set(state.x-8.5,state.y+4.8,state.z+10);lookGoal.set(state.x-3.2,state.y+.6,state.z-.7);if(innerWidth<700){cameraGoal.set(state.x-10.5,state.y+7.8,state.z+16);lookGoal.set(state.x-1.3,state.y+1.2,state.z-1);}}
  else{const desired=car.rotation.y;
    if(snap)cameraHeading=state.heading;else cameraHeading+=Math.atan2(Math.sin(desired-cameraHeading),Math.cos(desired-cameraHeading))*(1-Math.exp(-7.5*dt));
    let back=cameraMode===1?6.4:cameraMode===2?17:10.5,high=cameraMode===1?2.5:cameraMode===2?8:4.3;
    for(let d=1.5;d<back;d+=.5){const x=car.position.x+Math.sin(cameraHeading)*d,z=car.position.z+Math.cos(cameraHeading)*d;if(world.resolve(x,z,cameraHeading,.35,0).hit){back=Math.max(1.3,d-.6);break;}}
    cameraBack=snap?back:back<cameraBack?back:THREE.MathUtils.damp(cameraBack,back,4,dt);back=cameraBack;
    cameraGoal.set(car.position.x+Math.sin(cameraHeading)*back,car.position.y+high,car.position.z+Math.cos(cameraHeading)*back);
    if(cameraMode===3){cameraGoal.set(car.position.x-Math.sin(car.rotation.y)*3.7-Math.cos(car.rotation.y)*3,car.position.y+1.25,car.position.z-Math.cos(car.rotation.y)*3.7+Math.sin(car.rotation.y)*3);}cameraGoal.y=Math.max(cameraGoal.y,terrainHeight(cameraGoal.x,cameraGoal.z)+1.2);
    lookGoal.set(car.position.x-Math.sin(cameraHeading)*(cameraMode===3?1:10),car.position.y+(cameraMode===3?.2:.65),car.position.z-Math.cos(cameraHeading)*(cameraMode===3?1:10));
  }
  camera.position.lerp(cameraGoal,snap?1:1-Math.exp(-9*dt));look.lerp(lookGoal,snap?1:1-Math.exp(-11*dt));if(mode!=='menu'&&!(mode==='garage'&&modeBeforeGarage==='menu')){const safe=world.resolve(camera.position.x,camera.position.z,0,.3,0);camera.position.x=safe.x;camera.position.z=safe.z;}camera.lookAt(look);
  const fov=mode==='menu'?49:57,next=snap?fov:THREE.MathUtils.damp(camera.fov,fov,4,dt);if(Math.abs(next-camera.fov)>.001){camera.fov=next;camera.updateProjectionMatrix();}
}
function updateHUD(){careerUI.update();performanceUI.update();const input=controls.read(touch),surface=world.surface(state.x,state.z);
  $('district-label').textContent=surface.district;$('road-label').textContent=surface.road;$('distance-value').textContent=(state.distance/1000).toFixed(2);$('discovery-value').textContent=`${visited.size} / 6 PLACES DISCOVERED`;
  $('speed').textContent=String(Math.round(Math.abs(state.speed)*3.6)).padStart(3,'0');const engine=engineTelemetry(state,input);$('camera-view-button').textContent=['C / CHASE','C / LOW','C / HIGH','C / WHEELS'][cameraMode];$('gear').textContent=engine.gear<0?'R':engine.gear===0?'N':engine.gear;$('rpm-value').textContent=Math.round(engine.rpm/100)*100+' RPM';$('boost-fill').style.width=state.boost+'%';
  $('surface-label').textContent=(surface.water?'IN WATER / R TO RECOVER':surface.onRoad?'ASPHALT':'OFF ROAD')+' / LIGHTS '+(lights?'ON':'OFF');
  for(const [key,on] of Object.entries({throttle:input.throttle,brake:input.brake,left:input.left,right:input.right}))document.querySelectorAll(`[data-key="${key}"]`).forEach(k=>k.classList.toggle('pressed',!!on));
  const degrees=Math.round(Math.abs(state.steerAngle||0)*180/Math.PI);$('steering-label').textContent=input.steer<0?'← LEFT / '+degrees+'°':input.steer>0?'RIGHT / '+degrees+'° →':Math.abs(state.speed)<.1?'A / D WHEELS · W DRIVE':'MANUAL STEERING';$('steering-position').style.transform=`translateX(${state.steering*(innerWidth<700?25:35)}px)`;
  $('waypoint-hud').classList.toggle('hidden',!waypoint);if(waypoint){const d=Math.hypot(waypoint.x-state.x,waypoint.z-state.z);$('waypoint-distance').textContent=d>1000?(d/1000).toFixed(2)+' KM':Math.round(d)+' M';if(d<20){waypoint=null;toast('WAYPOINT REACHED');}}
  drawMinimap();
}
function physics(dt){populationTime+=dt;incidentCooldown=Math.max(0,incidentCooldown-dt);Object.assign(previous,state,{wheelDistances:[...state.wheelDistances]});const impactSpeed=Math.abs(state.speed);stepTraffic(traffic,world,state,dt,view.population.nearby);for(const event of stepDrive(state,world,controls.read(touch),dt)){if(event==='recover'){career.recover();Object.assign(previous,state,{wheelDistances:[...state.wheelDistances]});toast('RETURNED TO THE ROAD','WATER RECOVERY');}else if(event==='collision'){career.incident();audio.effect('impact',impactSpeed/30);}else if(event==='land')audio.effect('impact',.25);}
  if(collideTraffic(state,traffic)&&impactSpeed>4){audio.effect('impact',impactSpeed/30);if(incidentCooldown===0){career.incident();incidentCooldown=1;}}career.update(dt,state);if(state.grounded)state.y=Math.max(state.y,world.surface(state.x,state.z).height+.55);acceleration=(state.speed-lastSpeed)/dt;lastSpeed=state.speed;
  for(const l of world.landmarks)if(!visited.has(l.name)&&Math.hypot(state.x-l.x,state.z-l.z)<38){visited.add(l.name);toast(l.name.toUpperCase(),'NEW PLACE DISCOVERED');try{localStorage.setItem('horizon-world-discoveries-v1',JSON.stringify([...visited]));}catch{}}
}
function frame(timestamp){requestAnimationFrame(frame);if(!lastTime)lastTime=timestamp;const rawDt=(timestamp-lastTime)/1000||.016,dt=Math.min(rawDt,.1);lastTime=timestamp;if(!graphicsReady)return;if(document.hidden){wasPlaying=false;performanceCapture.interrupt();return;}
  if(mode!=='playing'){
    wasPlaying=false;performanceCapture.interrupt();
    if(!renderDirty&&(!['menu','garage'].includes(mode)||timestamp-lastIdleRender<1000/15))return;
    lastIdleRender=timestamp;
  }else if(!wasPlaying){frameBudget.reset();performanceCapture.interrupt();accumulator=0;wasPlaying=true;}
  const cpuStart=performance.now();renderDirty=false;time+=dt;hudTime+=dt;
  if(mode==='playing'){accumulator+=dt;while(accumulator>=1/120){physics(1/120);accumulator-=1/120;}}
  if(mode==='playing'||mode==='menu'||mode==='garage'){positionCar(mode==='playing'?dt:0);updateCamera(dt);}activityView.update(career,state,time);view.update(time,camera);view.population.update(populationTime,state,{hornUntil,trafficTime:traffic.time,signalsEnabled:traffic.enabled});view.visibility.update(state.x,state.z,preference.quality,false,camera,preference.quality==='auto'?frameBudget.status.tier:0);trafficView.update(mode==='playing'?clamp(accumulator*120,0,1):1,state);
  if(mode==='playing'){const sample=frameBudget.sample(rawDt);if(sample){measuredFps=sample.fps;$('fps-value').textContent=measuredFps+' FPS / '+sample.frameMs.toFixed(1)+' MS / P95 '+sample.p95.toFixed(1)+' MS';$('live-fps').textContent=measuredFps+' FPS';$('live-fps').dataset.slow=String(measuredFps<55);if(preference.quality==='auto'&&sample.changed)applyQuality();}}
  if(mode!=='menu'&&hudTime>1/10){updateHUD();hudTime=0;}
  if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('visible');}
  audio.update(state,controls.read(touch),mode==='playing',muted,dt,{offRoad:!world.surface(state.x,state.z).onRoad,nearShore:Math.abs(state.x-coast(state.z))<170,traffic:traffic.enabled?traffic.cars:[]});
  const renderStart=performance.now();renderer.render(scene,camera);const renderEnd=performance.now();
  if(mode==='playing'){const report=performanceCapture.sample({frameMs:rawDt*1000,cpuMs:renderEnd-cpuStart,renderMs:renderEnd-renderStart,calls:renderer.info.render.calls||0,triangles:renderer.info.render.triangles||0,quality:preference.quality,tier:frameBudget.status.tier,pixelRatio:renderer.getPixelRatio(),district:world.district(state.x,state.z)});if(report){performanceUI.update();toast('PERFORMANCE CAPTURE SAVED',report.fps+' FPS / P95 '+report.p95+' MS / O TO VIEW REPORT');}}
}
// Keyboard input is attached in capture phase and focuses the canvas explicitly.
window.addEventListener('keydown',event=>{
  if(controls.keydown(event,mode==='playing'))return;if(event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
  const key=(event.key||'').toLowerCase(),code=event.code;
  if(code==='KeyJ'||key==='j'){event.preventDefault();openJobs();return;}
  if(code==='KeyM'||key==='m'){event.preventDefault();toggleMap();return;}
  if(code==='Escape'||code==='KeyP'||key==='p'){event.preventDefault();if(mode==='map')closeMap();else if(mode==='help')closeHelp();else if(mode==='garage')closeGarage();else if(mode==='settings')closeSettings();else if(mode==='jobs')closeJobs();else if(mode==='playing')pause();else if(mode==='paused')resume();return;}
  if(code==='KeyG'||key==='g'){event.preventDefault();openGarage();return;}
  if(code==='KeyO'||key==='o'){event.preventDefault();openSettings();return;}
  if(code==='KeyV'||key==='v'){muted=!muted;if(muted)audio.silence();$('sound-button').style.opacity=muted?'.4':'1';return;}
  if(code==='KeyL'||key==='l'){lights=!lights;headlights.forEach(l=>l.visible=lights);return;}
  if(mode==='playing'&&(code==='KeyH'||key==='h')){event.preventDefault();honk();return;}
  if(mode==='playing'&&(code==='KeyR'||key==='r')){recover();return;}
  if(mode==='playing'&&(code==='KeyC'||key==='c')){cycleCamera();return;}
  if(mode==='menu'&&code==='Enter')startDrive();
},true);
window.addEventListener('keyup',event=>controls.keyup(event),true);window.addEventListener('blur',()=>{clearInput();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();}});
canvas.addEventListener('pointerdown',focusGame);
document.querySelectorAll('[data-spawn]').forEach(b=>b.addEventListener('click',()=>selectSpawn(+b.dataset.spawn)));document.querySelectorAll('[data-travel]').forEach(b=>b.addEventListener('click',()=>travel(+b.dataset.travel)));
document.querySelectorAll('[data-paint]').forEach(b=>b.addEventListener('click',()=>{if(currentCar.spec.paintable===false)return;bodyMat.color.set(b.dataset.paint);preference.paints[currentCar.spec.id]=b.dataset.paint;savePreferences();syncPaintControls();}));
document.querySelectorAll('[data-vehicle]').forEach(b=>b.addEventListener('click',()=>setVehicle(b.dataset.vehicle)));
$('horn-button').addEventListener('click',honk);
$('jobs-button').addEventListener('click',openJobs);$('menu-jobs-button').addEventListener('click',openJobs);$('objective-card').addEventListener('click',openJobs);$('close-jobs').addEventListener('click',closeJobs);$('resume-contract').addEventListener('click',closeJobs);$('abandon-contract').addEventListener('click',()=>{career.abandon();careerUI.update(true);careerUI.renderBoard();});
$('garage-button').addEventListener('click',openGarage);$('menu-garage-button').addEventListener('click',openGarage);$('close-garage').addEventListener('click',closeGarage);$('use-car').addEventListener('click',closeGarage);
$('settings-button').addEventListener('click',openSettings);$('close-settings').addEventListener('click',closeSettings);$('close-settings-button').addEventListener('click',closeSettings);
$('quality-toggle').addEventListener('click',()=>{preference.quality=['auto','performance','quality'][(['auto','performance','quality'].indexOf(preference.quality)+1)%3];applyQuality();savePreferences();});
$('traffic-toggle').addEventListener('click',()=>{preference.traffic=!traffic.enabled;updateTrafficSetting();trafficView.update(1,state);savePreferences();});
$('camera-view-button').addEventListener('click',cycleCamera);$('play-button').addEventListener('click',startDrive);$('pause-button').addEventListener('click',pause);$('resume-button').addEventListener('click',resume);$('exit-button').addEventListener('click',menu);$('recover-button').addEventListener('click',()=>{resume();recover();});$('brand-home').addEventListener('click',e=>{e.preventDefault();if(mode==='playing')pause();});
$('help-button').addEventListener('click',showHelp);$('close-help').addEventListener('click',closeHelp);$('close-help-button').addEventListener('click',closeHelp);$('map-button').addEventListener('click',toggleMap);$('mini-map-button').addEventListener('click',toggleMap);$('close-map').addEventListener('click',closeMap);$('clear-waypoint').addEventListener('click',()=>{waypoint=null;drawFullMap();});
$('lighting-button').addEventListener('click',()=>setLighting((lighting+1)%3));$('time-toggle').addEventListener('click',()=>setLighting((lighting+1)%3));$('sound-button').addEventListener('click',()=>{initAudio();muted=!muted;if(muted)audio.silence();$('sound-button').style.opacity=muted?'.4':'1';});
$('full-map').addEventListener('pointerdown',e=>{const r=e.currentTarget.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*1400,py=(e.clientY-r.top)/r.height*1400,x=(px-ox)/scale+b.minX,z=(py-oz)/scale+b.minZ;if(x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ||world.surface(x,z).water)return;waypoint={x,z};drawFullMap();});
document.querySelectorAll('[data-control]').forEach(button=>{const key=button.dataset.control;button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);touch[key]=true;button.classList.add('pressed');});for(const name of['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>{touch[key]=false;button.classList.remove('pressed');});});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(mode==='menu')updateCamera(1,true);applyQuality();});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();$('fatal-error').classList.remove('hidden');$('error-message').textContent='The graphics connection was interrupted. Reload to continue driving.';});
makeAtlas();setLighting(1);applyQuality();setVehicle(preference.vehicle);updateTrafficSetting();selectSpawn(0);
Promise.allSettled([selectedModelPromise,worldAssetsPromise]).then(async()=>{$('loading-detail').textContent='PREPARING SHADERS / READYING THE ROAD';let timer;try{await Promise.race([renderer.compileAsync?.(scene,camera),new Promise(resolve=>{timer=setTimeout(resolve,6000);})]);}finally{clearTimeout(timer);}}).catch(()=>{}).finally(()=>{graphicsReady=true;renderDirty=true;sync();$('loading').classList.add('hidden');});requestAnimationFrame(frame);
window.horizon={getState:()=>({...state,mode,populationTime,world:'Horizon County',district:world.district(state.x,state.z),vehicle:currentCar.spec.id,traffic:traffic.enabled,trafficTime:traffic.time,assets:assetsStatus,carModel:{id:currentCar.spec.source,level:currentCar.assetLevel,status:currentCar.assetStatus,resident:garageLoader.resident},city:view.cityStats,fps:measuredFps,frameBudget:{...frameBudget.status},quality:preference.quality,pixelRatio:renderPixelRatio(preference.quality,devicePixelRatio,innerWidth,innerHeight,frameBudget.status.scale),career:{credits:career.profile.credits,earned:career.profile.earned,completed:[...career.profile.completed],upgrades:career.levels(currentCar.spec.id),active:career.active?{id:career.active.definition.id,phase:career.active.phase,gate:career.active.gate,elapsed:career.active.elapsed}:null,result:career.result},performanceCapture:{running:performanceCapture.running,elapsed:performanceCapture.elapsed,report:performanceCapture.report},audio:audio.status,engine:audio.telemetry,rendering:{...view.visibility.stats,population:{...view.population.stats},fleet:{...trafficView.stats}}}),getInput:()=>controls.read(touch),getRendererInfo:()=>({...renderer.info.render}),getWorld:()=>world};
