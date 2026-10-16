import * as THREE from './vendor/three.module.min.js';
import { TRACKS, makeCourse } from './tracks.js';
import { createCar, addReflections } from './car.js';
import { newCarState, stepCar, resetAtCheckpoint, clamp, angleDelta } from './physics.js';

const $=id=>document.getElementById(id);
const canvas=$('world');
let renderer;
try {
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
} catch(error) {
  $('loading').classList.add('hidden');$('fatal-error').classList.remove('hidden');
  $('error-message').textContent='This game needs WebGL. Try opening it in a browser with hardware acceleration enabled.';
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(56,innerWidth/innerHeight,.2,4500);
const ambient=new THREE.HemisphereLight(0xebfaff,0x536a54,2.6);scene.add(ambient);
const sun=new THREE.DirectionalLight(0xfff1d4,3.2);sun.position.set(-120,220,130);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.near=1;sun.shadow.camera.far=400;
Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45});sun.shadow.bias=-.0005;scene.add(sun);scene.add(sun.target);
let world=new THREE.Group();scene.add(world);
const rayGround=new THREE.Vector3(),lookTarget=new THREE.Vector3(),cameraTarget=new THREE.Vector3();
const mat=(color,roughness=.65,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const black=mat(0x142229,.5,.35),rubber=mat(0x151a1b,.95),silver=mat(0xb2babe,.3,.8);
const {car,bodyMat,tailMat,wheels,steerWheels,flames}=createCar(scene);
addReflections(scene,renderer);
const unitBox=new THREE.BoxGeometry(1,1,1);
function box(w,h,d,material,x=0,y=0,z=0,parent=world) {
  const m=new THREE.Mesh(unitBox,material);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
let course,selected=0,state,mode='menu',cameraMode=0,steerVisual=0,countTime=0,toastTime=0,clockTime=0;
const keys=new Set(),touch={left:false,right:false,throttle:false,brake:false,boost:false};
let isMuted=false,helpWasPlaying=false,previousTimestamp=0,accumulator=0,drawnMap=null;
let previousState,renderState,cameraHeading=0,hudTime=0;
function syncCar(){previousState={...state};renderState={...state};steerVisual=0;positionCar(0);}
let bests={};try{bests=JSON.parse(localStorage.getItem('horizon-track-bests-manual-v2')||'{}');}catch{}
const audio={ctx:null,osc:null,gain:null,noise:null};
function initAudio(){
  if(audio.ctx){audio.ctx.resume();return;}
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();audio.ctx=ctx;
    const osc=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    osc.type='sawtooth';osc.frequency.value=45;filter.type='lowpass';filter.frequency.value=320;
    gain.gain.value=0;osc.connect(filter);filter.connect(gain);gain.connect(ctx.destination);osc.start();audio.osc=osc;audio.gain=gain;
  }catch{}
}
function beep(frequency=440,duration=.15,volume=.06,type='sine'){
  if(!audio.ctx||isMuted)return;const t=audio.ctx.currentTime,o=audio.ctx.createOscillator(),g=audio.ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(frequency*.75,t+duration);
  g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(audio.ctx.destination);o.start();o.stop(t+duration);
}
function soundToggle(){isMuted=!isMuted;initAudio();$('sound-button').style.opacity=isMuted?'.4':'1';$('sound-button').setAttribute('aria-label',isMuted?'Enable sound':'Mute sound');$('sound-button').setAttribute('aria-pressed',String(!isMuted));}
function seeded(seed=1){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function disposeWorld(){
  const geometries=new Set(),materials=new Set(),textures=new Set();
  world.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&o.geometry!==unitBox)geometries.add(o.geometry);if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material])){materials.add(m);if(m.map)textures.add(m.map);}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>{if(![black,rubber,silver].includes(m))m.dispose();});textures.forEach(t=>t.dispose());scene.remove(world);world=new THREE.Group();scene.add(world);
}
// Repeated scenery shares a single cube geometry and one draw per material.
function batchScenery(){
  world.updateMatrixWorld(true);
  const batches=new Map();
  world.traverse(o=>{if(o.isMesh&&o.geometry===unitBox){
    if(!batches.has(o.material))batches.set(o.material,[]);
    batches.get(o.material).push(o);
  }});
  for(const [material,objects] of batches){
    if(objects.length<3)continue;
    const batch=new THREE.InstancedMesh(unitBox,material,objects.length);
    objects.forEach((o,i)=>{batch.setMatrixAt(i,o.matrixWorld);o.parent.remove(o);});
    batch.castShadow=true;batch.receiveShadow=true;batch.computeBoundingSphere();world.add(batch);
  }
}
function makeStrip(offsetA,offsetB,height,material,skip=()=>false) {
  const positions=[],indices=[],uvs=[];
  for(let i=0;i<course.samples.length;i++){
    const f=course.samples[i];for(const offset of[offsetA,offsetB]){positions.push(f.x+f.nx*offset,f.y+height,f.z+f.nz*offset);uvs.push(offset/16,f.s/14);}
    if(i>0 && !f.gap && !course.samples[i-1].gap && !skip(f)) {
      const a=(i-1)*2;
      if(offsetA<offsetB)indices.push(a,a+1,a+2,a+1,a+3,a+2);
      else indices.push(a,a+2,a+1,a+1,a+2,a+3);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;world.add(mesh);return mesh;
}
function roadSurface(){
  const random=seeded(42),c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');
  const image=ctx.createImageData(128,128);for(let i=0;i<image.data.length;i+=4){const n=120+random()*50;image.data[i]=n;image.data[i+1]=n;image.data[i+2]=n;image.data[i+3]=255;}ctx.putImageData(image,0,0);
  const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({color:course.config.palette.road,map:texture,roughness:.92,side:THREE.DoubleSide});
}
function placeOnTrack(mesh,s,lateral=0,height=0) {
  const f=course.frame(s);mesh.position.set(f.x+f.nx*lateral,f.y+height,f.z+f.nz*lateral);mesh.rotation.y=f.angle;return mesh;
}
function signTexture(text,sub='',background='#17292b',foreground='#c8ff4a',width=1024){
  const c=document.createElement('canvas');c.width=width;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,width,256);
  ctx.fillStyle=foreground;ctx.font='italic 900 100px Arial';ctx.textAlign='center';ctx.fillText(text,width/2,sub?135:165);
  if(sub){ctx.font='bold 24px Arial';ctx.fillText(sub,width/2,204);}
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
const arches=[];
function arch(s,label,sub,color) {
  const g=new THREE.Group(),w=course.config.width+1;
  const m=mat(color,.4,.25);for(const x of[-w/2,w/2])box(.5,7,.7,m,x,3.5,0,g);
  box(w+.6,1.7,.8,black,0,7,0,g);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(w,2.25),new THREE.MeshBasicMaterial({map:signTexture(label,sub,'#17292b',color),side:THREE.DoubleSide}));board.position.set(0,7,.42);g.add(board);
  box(w+.8,.13,.9,m,0,8.02,0,g);
  placeOnTrack(g,s);world.add(g);arches.push({mesh:g,s});return g;
}
function buildTrack(){
  const w=course.config.width/2,c=course.config.palette;
  const surface=roadSurface(),edgeMat=mat(c.edge,.6,.2),white=mat(0xe7ece2),deck=mat(0x283b3e,.8,.1);
  makeStrip(-w,w,0,surface);
  makeStrip(-w-.15,w+.15,-1.25,deck);
  for(const side of[-1,1]){
    makeStrip(side*(w-.65),side*w,.035,edgeMat);
    makeStrip(side*(w-.64),side*(w-.06),.042,white,f=>Math.floor(f.s/6)%2===0);
    makeStrip(side*(w-.95),side*(w-.83),.045,white);
    // Track deck walls leave the edges open: missing the line means falling.
    const positions=[],indices=[];
    for(let i=0;i<course.samples.length;i++){
      const f=course.samples[i];positions.push(f.x+f.nx*w*side,f.y,f.z+f.nz*w*side,f.x+f.nx*w*side,f.y-1.3,f.z+f.nz*w*side);
      if(i>0&&!f.gap&&!course.samples[i-1].gap){const a=(i-1)*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
    world.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x304346,side:THREE.DoubleSide,roughness:.8})));
  }
  makeStrip(-.065,.065,.05,mat(0xb7c9c4),f=>Math.floor(f.s/9)%3!==0 || f.ramp);
  const rampMat=new THREE.MeshStandardMaterial({color:c.edge,emissive:c.edge,emissiveIntensity:.13,roughness:.75,side:THREE.DoubleSide});
  for(const jump of course.jumps){
    for(let s=jump.start-28;s<jump.start-3;s+=6){
      const f=course.frame(s);
      // Three directional chevrons on each take-off ramp.
      const shape=new THREE.Shape();shape.moveTo(-3,0);shape.lineTo(0,2);shape.lineTo(3,0);shape.lineTo(3,1.15);shape.lineTo(0,3.15);shape.lineTo(-3,1.15);shape.closePath();
      const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),rampMat);mesh.rotation.x=-Math.PI/2;
      const group=new THREE.Group();group.add(mesh);placeOnTrack(group,s,0,.08);group.rotation.x=-Math.atan(f.slope);world.add(group);
    }
    for(const side of[-1,1]){
      const board=new THREE.Mesh(new THREE.PlaneGeometry(4,2),new THREE.MeshBasicMaterial({map:signTexture('JUMP','COMMIT TO IT','#17292b','#c8ff4a',512),side:THREE.DoubleSide}));
      placeOnTrack(board,jump.start-45,side*(w+2),2.7);world.add(board);
      const post=box(.12,3,.12,silver);placeOnTrack(post,jump.start-45,side*(w+2),1.3);
    }
    // Lit take-off and landing lips make every actual gap easy to read.
    for(const s of[jump.start-1.5,jump.end+2]){const stripe=box(w*2,.09,.4,edgeMat);placeOnTrack(stripe,s,0,.08);stripe.rotation.x=-Math.atan(course.frame(s).slope);}
  }
  for(let s=22;s<course.length-10;s+=43){
    const f=course.frame(s);if(f.gap||f.ramp)continue;
    const height=f.y+42;
    const support=box(1.4,height,1.6,deck);placeOnTrack(support,s,0,-height/2-1);
    const beam=box(w*1.8,.65,1.5,deck);placeOnTrack(beam,s,0,-1.5);
    for(const side of[-1,1]){
      const marker=box(.1,1.3,.1,silver);placeOnTrack(marker,s,side*(w+.15),.5);
      const cap=box(.18,.25,.18,edgeMat);placeOnTrack(cap,s,side*(w+.15),1.2);
    }
  }
  arches.length=0;
  arch(70,'HORIZON','TRACK CLUB / SEND IT',course.config.color);
  for(let i=1;i<=3;i++)arch(course.checkpoints[i-1],'0'+i,'CHECKPOINT',course.config.color);
  arch(course.length-22,'FINISH','MAKE IT A GOOD ONE',course.config.color);
  for(const s of[10,course.length-21])for(let i=0;i<16;i++){
    const tile=box(w/8,.025,.7,(i%2?white:deck));placeOnTrack(tile,s,-w+(i+.5)*w/8,.07);
    const tile2=box(w/8,.025,.7,(i%2?deck:white));placeOnTrack(tile2,s+.7,-w+(i+.5)*w/8,.07);
  }
  // Outside turn boards reinforce the direction of the next corner.
  for(let s=100;s<course.length-60;s+=95){
    const f=course.frame(s),next=course.frame(s+30),turn=angleDelta(next.angle,f.angle);
    if(Math.abs(turn)<.055||f.ramp||f.gap)continue;
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(3,1.5),new THREE.MeshBasicMaterial({map:signTexture(turn>0?'›››':'‹‹‹','','#17292b','#e7ece2',512),side:THREE.DoubleSide}));
    placeOnTrack(sign,s,-Math.sign(turn)*(w+1.8),2);world.add(sign);
    const post=box(.12,2,.12,silver);placeOnTrack(post,s,-Math.sign(turn)*(w+1.8),.8);
  }
}
function buildEnvironment(){
  const c=course.config.palette,random=seeded(selected*137+320),night=selected===2;
  scene.background=new THREE.Color(c.sky);scene.fog=new THREE.FogExp2(c.fog,night?.00165:.0014);
  ambient.color.set(night?0x9caeff:0xebfaff);ambient.groundColor.set(c.ground);ambient.intensity=night?1.7:2.3;
  sun.color.set(night?0xb9baff:(selected===1?0xffb879:0xfff0d7));sun.intensity=night?1.2:3.2;
  renderer.toneMappingExposure=night?1.3:1.15;scene.environmentIntensity=night?.3:.7;
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(25000,25000),mat(c.water,.65,.15));ground.rotation.x=-Math.PI/2;ground.position.y=-43;world.add(ground);
  const mountainGeo=selected===1?new THREE.CylinderGeometry(.5,1,1,7,3):new THREE.ConeGeometry(1,1,7,3);
  const mountainMat=mat(c.mountain,.94);
  const mountains=new THREE.InstancedMesh(mountainGeo,mountainMat,210);mountains.castShadow=true;mountains.receiveShadow=true;
  const dummy=new THREE.Object3D(),color=new THREE.Color();
  for(let i=0;i<210;i++){
    let x,z;let distance=0;
    for(let attempt=0;attempt<50;attempt++){
      x=(random()-.5)*2500;z=(random()-.5)*2300-450;
      distance=Math.min(...course.samples.filter((_,i)=>i%30===0).map(p=>Math.hypot(p.x-x,p.z-z)));
      if(distance>235)break;
    }
    const h=35+random()*160;
    dummy.position.set(x,-44+h/2,z);dummy.scale.set(65+random()*110,h,60+random()*115);dummy.rotation.y=random()*6.28;dummy.updateMatrix();mountains.setMatrixAt(i,dummy.matrix);
    color.set(c.mountain).multiplyScalar(.75+random()*.5);mountains.setColorAt(i,color);
  }
  world.add(mountains);
  if(night){
    const windows=document.createElement('canvas');windows.width=64;windows.height=128;const ctx=windows.getContext('2d');ctx.fillStyle='#1e3044';ctx.fillRect(0,0,64,128);
    for(let y=4;y<128;y+=9)for(let x=4;x<64;x+=9){ctx.fillStyle=random()>.42?'#88a7a0':'#243c4a';ctx.fillRect(x,y,3,5);}
    const texture=new THREE.CanvasTexture(windows);texture.colorSpace=THREE.SRGBColorSpace;
    const buildingMat=new THREE.MeshStandardMaterial({color:0x5d7894,map:texture,emissive:0x83a3b1,emissiveMap:texture,emissiveIntensity:.55,roughness:.7});
    const city=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),buildingMat,240);
    for(let i=0;i<240;i++){
      const x=(random()-.5)*1800,z=(random()-.5)*1900-500,h=10+random()*65;
      dummy.position.set(x,-43+h/2,z);dummy.scale.set(12+random()*20,h,12+random()*20);dummy.rotation.y=0;dummy.updateMatrix();city.setMatrixAt(i,dummy.matrix);
    }world.add(city);
  }else{
    const treeCount=700,treeGeo=new THREE.ConeGeometry(1,1,5),treeMat=mat(selected===1?0x65765b:0x355f50);
    const trees=new THREE.InstancedMesh(treeGeo,treeMat,treeCount);
    for(let i=0;i<treeCount;i++){
      const f=course.frame(random()*course.length),side=random()>.5?1:-1,offset=22+random()*80;
      const h=5+random()*10;dummy.position.set(f.x+f.nx*offset*side,-40+h/2,f.z+f.nz*offset*side);dummy.scale.set(h*.3,h,h*.3);dummy.rotation.y=random()*6;dummy.updateMatrix();trees.setMatrixAt(i,dummy.matrix);
    }world.add(trees);
    // Soft cloud banks sit below the elevated road.
    const clouds=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:0xf3f5e8,roughness:1,transparent:true,opacity:.63,depthWrite:false}),100);
    for(let i=0;i<100;i++){dummy.position.set((random()-.5)*2300,random()*8-26,(random()-.5)*2200-500);dummy.scale.set(40+random()*70,7+random()*8,18+random()*35);dummy.updateMatrix();clouds.setMatrixAt(i,dummy.matrix);}world.add(clouds);
  }
  const orb=new THREE.Mesh(new THREE.SphereGeometry(night?35:45,24,16),new THREE.MeshBasicMaterial({color:c.sun,fog:false}));orb.position.set(-700,420,-1600);world.add(orb);
  // Simple pennants and trackside flags create a small starting paddock.
  const flagMat=mat(c.edge,.65);
  for(let i=0;i<6;i++)for(const side of[-1,1]){
    const pole=box(.08,7,.08,silver);placeOnTrack(pole,20+i*13,side*(course.config.width/2+2),3.5);
    const flag=box(1.8,3,.04,flagMat);placeOnTrack(flag,20+i*13,side*(course.config.width/2+2)+.9,5.5);
  }
}
function trackSvg(config){
  const pts=config.points,minX=Math.min(...pts.map(p=>p[0])),maxX=Math.max(...pts.map(p=>p[0])),minZ=Math.min(...pts.map(p=>p[2])),maxZ=Math.max(...pts.map(p=>p[2]));
  const scale=60/Math.max(maxX-minX,maxZ-minZ);
  const path=pts.map((p,i)=>`${i?'L':'M'}${((p[0]-minX)*scale+5).toFixed(1)},${((p[2]-minZ)*scale+5).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 75 75" aria-hidden="true"><path d="${path}" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${((pts[0][0]-minX)*scale+5).toFixed(1)}" cy="${((pts[0][2]-minZ)*scale+5).toFixed(1)}" r="2.5" fill="currentColor" stroke="none"/></svg>`;
}
$('track-options').innerHTML=TRACKS.map((t,i)=>`<button class="track-card ${i===0?'active':''}" data-track="${i}" aria-pressed="${i===0}"><span class="track-num">${t.number}</span><span class="track-card-copy"><strong>${t.name}</strong><span class="track-meta"><span>${t.difficulty}</span><i></i><span>${t.jumps.length} JUMPS</span></span></span>${trackSvg(t)}<span class="track-check">↗</span></button>`).join('');
for(let i=0;i<22;i++)$('speed-ticks').appendChild(document.createElement('i'));
const tickElements=[...$('speed-ticks').children];

function selectTrack(index){
  selected=index;disposeWorld();course=makeCourse(TRACKS[index]);state=newCarState(course);drawnMap=null;
  buildTrack();buildEnvironment();batchScenery();syncCar();
  document.body.classList.toggle('night',index===2);
  $('environment').textContent=course.config.environment;
  document.querySelectorAll('[data-track]').forEach(b=>{const on=Number(b.dataset.track)===index;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  positionCar(0);updateMap();updateCamera(1,true);
}
function formatTime(t){const m=Math.floor(t/60),s=Math.floor(t%60),h=Math.floor((t%1)*100);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(h).padStart(2,'0')}`;}
function toast(text,sub='',duration=2){$('toast').innerHTML=text+(sub?`<small>${sub}</small>`:'');$('toast').classList.add('visible');toastTime=duration;}
function clearInputs(){keys.clear();Object.keys(touch).forEach(k=>touch[k]=false);document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('pressed'));}
function startRace(){
  initAudio();clearInputs();state=newCarState(course);mode='countdown';countTime=3.4;accumulator=0;syncCar();
  document.body.classList.add('racing');$('menu').classList.add('hidden');$('race-hud').classList.remove('hidden');$('pause-button').classList.remove('hidden');
  for(const id of['pause-overlay','finish-overlay','help-overlay'])$(id).classList.add('hidden');
  $('countdown').classList.remove('hidden');$('countdown').textContent='3';
  $('race-track-name').textContent=course.config.name.toUpperCase();$('map-track').textContent=course.config.number+' / '+course.config.name.split(' ')[0].toUpperCase();
  $('best-time').textContent=bests[course.config.id]?`PERSONAL BEST ${formatTime(bests[course.config.id])}`:'SET YOUR FIRST RECORD';
  cameraMode=0;updateCamera(1,true);updateHUD();beep(420);
}
function showMenu(){mode='menu';clearInputs();document.body.classList.remove('racing');$('menu').classList.remove('hidden');$('race-hud').classList.add('hidden');$('pause-button').classList.add('hidden');for(const id of['pause-overlay','finish-overlay','help-overlay'])$(id).classList.add('hidden');state=newCarState(course);syncCar();updateCamera(1,true);}
function pause(){if(mode!=='playing'&&mode!=='countdown')return;mode=mode==='countdown'?'paused-countdown':'paused';$('pause-overlay').classList.remove('hidden');clearInputs();$('resume-button').focus();}
function resume(){if(mode!=='paused'&&mode!=='paused-countdown')return;mode=mode==='paused-countdown'?'countdown':'playing';$('pause-overlay').classList.add('hidden');clearInputs();}
function reset(){if(mode!=='playing')return;resetAtCheckpoint(state,course);syncCar();toast('CHECKPOINT RESET','+3 SECONDS');beep(160,.2,.035);updateCamera(1,true);}
function finish(){
  mode='finished';clearInputs();$('finish-overlay').classList.remove('hidden');
  const prior=bests[course.config.id]||Infinity,isBest=state.elapsed<prior;
  if(isBest){bests[course.config.id]=state.elapsed;try{localStorage.setItem('horizon-track-bests-manual-v2',JSON.stringify(bests));}catch{}}
  const medal=state.elapsed<course.config.par[0]?'GOLD':state.elapsed<course.config.par[1]?'SILVER':state.elapsed<course.config.par[2]?'BRONZE':'FINISHER';
  $('finish-eyebrow').textContent=medal+' RUN / '+course.config.name.toUpperCase();$('finish-time').textContent=formatTime(state.elapsed);$('new-record').classList.toggle('hidden',!isBest);
  $('finish-speed').innerHTML=Math.round(state.maxSpeed*3.6)+' <small>KM/H</small>';$('finish-jumps').textContent=state.jumps;$('finish-air').innerHTML=state.totalAir.toFixed(1)+' <small>SEC</small>';
  $('medal').style.background={GOLD:'#e8ce71',SILVER:'#c4d0d3',BRONZE:'#c99475',FINISHER:'#c8ff4a'}[medal];
  beep(660,.25);setTimeout(()=>beep(880,.4),200);$('again-button').focus();
}
function getInput(){return{throttle:keys.has('KeyW')||keys.has('ArrowUp')||touch.throttle?1:0,brake:keys.has('KeyS')||keys.has('ArrowDown')||touch.brake,
  steer:((keys.has('KeyD')||keys.has('ArrowRight')||touch.right)?1:0)-((keys.has('KeyA')||keys.has('ArrowLeft')||touch.left)?1:0),
  boost:keys.has('ShiftLeft')||keys.has('ShiftRight')||touch.boost,drift:keys.has('Space')};}
function updatePhysics(dt){
  previousState={...state};
  const events=stepCar(state,course,getInput(),dt);
  for(const event of events){
    if(event==='jump'){toast('AIRBORNE','STEER TO ALIGN YOUR LANDING',1);beep(240,.25,.018);}
    if(event==='land'){toast('LANDING',`JUMP ${state.jumps} / ${course.jumps.length}`,1.8);beep(560,.15,.03);}
    if(event==='checkpoint'){toast('CHECKPOINT '+state.checkpoint,'CHECKPOINT SAVED',1.7);beep(740,.15,.035);}
    if(event==='reset')reset();
    if(event==='finish')finish();
  }
}
function positionCar(dt){
  const alpha=mode==='playing'?clamp(accumulator*120,0,1):1;
  const a=previousState||state;
  renderState={...state,x:THREE.MathUtils.lerp(a.x,state.x,alpha),y:THREE.MathUtils.lerp(a.y,state.y,alpha),
    z:THREE.MathUtils.lerp(a.z,state.z,alpha),heading:a.heading+angleDelta(state.heading,a.heading)*alpha};
  const f=course.frame(state.distance);car.position.set(renderState.x,renderState.y,renderState.z);
  car.rotation.order='YXZ';car.rotation.y=renderState.heading;
  const pitch=state.grounded?Math.atan(f.slope)*Math.cos(angleDelta(state.heading,f.angle)):clamp(state.vy/Math.max(15,Math.abs(state.speed)),-.4,.5);
  car.rotation.x=THREE.MathUtils.damp(car.rotation.x,pitch,8,dt||.016);
  steerVisual=THREE.MathUtils.damp(steerVisual,state.steering,14,dt||.016);
  car.rotation.z=THREE.MathUtils.damp(car.rotation.z,-steerVisual*Math.min(Math.abs(state.speed)/60,1)*.055,8,dt||.016);
  for(const pivot of steerWheels)pivot.rotation.y=-steerVisual*.5/(1+Math.abs(state.speed)*.035);
  for(const wheel of wheels)wheel.rotation.x-=state.speed*(dt||0)/.449;
  const input=getInput();
  for(const flame of flames){flame.visible=mode==='playing'&&input.boost&&input.throttle&&!input.brake&&state.boost>1&&state.speed>8&&state.grounded;flame.scale.y=.85+Math.sin(clockTime*43)*.15;}
  tailMat.emissiveIntensity=input.brake?5:1.5;
  sun.position.set(car.position.x-80,car.position.y+140,car.position.z+75);sun.target.position.copy(car.position);
}
function updateCamera(dt,snap=false){
  const f=course.frame(state.distance),menu=mode==='menu';
  if(menu){
    cameraTarget.set(f.x-7.8,f.y+4.3,f.z+9);
    lookTarget.set(f.x-3.3,f.y+.65,f.z);
    if(innerWidth<700){cameraTarget.set(f.x-10.5,f.y+8,f.z+17);lookTarget.set(f.x-5,f.y+2,f.z-5);}
  }else{
    if(snap)cameraHeading=state.heading;
    else cameraHeading+=angleDelta(renderState.heading,cameraHeading)*(1-Math.exp(-dt*8));
    const back=cameraMode===1?6:cameraMode===2?17:10;
    const high=cameraMode===1?2.4:cameraMode===2?8:4.2;
    cameraTarget.set(car.position.x+Math.sin(cameraHeading)*back,car.position.y+high,car.position.z+Math.cos(cameraHeading)*back);
    lookTarget.set(car.position.x-Math.sin(cameraHeading)*12,car.position.y+.65,car.position.z-Math.cos(cameraHeading)*12);
  }
  const smoothing=snap?1:1-Math.exp(-dt*10);
  camera.position.lerp(cameraTarget,smoothing);rayGround.lerp(lookTarget,snap?1:1-Math.exp(-dt*12));camera.lookAt(rayGround);
  const input=getInput(),fov=menu?50:56+Math.min(Math.abs(state.speed)/78,1)*8+(input.boost&&input.throttle&&state.speed>8&&state.boost>1?3:0);
  const nextFov=snap?fov:THREE.MathUtils.damp(camera.fov,fov,4,dt);
  if(Math.abs(nextFov-camera.fov)>.001){camera.fov=nextFov;camera.updateProjectionMatrix();}
}
function updateMap(){
  const ctx=$('map').getContext('2d'),size=220;
  if(!drawnMap){
    const minX=Math.min(...course.samples.map(p=>p.x)),maxX=Math.max(...course.samples.map(p=>p.x)),minZ=Math.min(...course.samples.map(p=>p.z)),maxZ=Math.max(...course.samples.map(p=>p.z));
    drawnMap={minX,minZ,scale:175/Math.max(maxX-minX,maxZ-minZ),offsetX:(220-(maxX-minX)*175/Math.max(maxX-minX,maxZ-minZ))/2,offsetZ:(220-(maxZ-minZ)*175/Math.max(maxX-minX,maxZ-minZ))/2};
  }
  const m=drawnMap,xy=f=>[(f.x-m.minX)*m.scale+m.offsetX,(f.z-m.minZ)*m.scale+m.offsetZ];ctx.clearRect(0,0,size,size);ctx.lineWidth=2.5;ctx.strokeStyle='#ffffff65';ctx.lineCap='round';ctx.beginPath();
  course.samples.forEach((f,i)=>{if(i%5!==0)return;const[x,y]=xy(f);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});ctx.stroke();
  for(const jump of course.jumps){ctx.strokeStyle=course.config.color;ctx.lineWidth=4;ctx.beginPath();const a=xy(course.frame(jump.start-25)),b=xy(course.frame(jump.end));ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}
  for(let i=1;i<=3;i++){const p=xy(course.frame(course.checkpoints[i-1]));ctx.fillStyle=i<=state.checkpoint?course.config.color:'#fff';ctx.fillRect(p[0]-2,p[1]-2,4,4);}
  const end=xy(course.frame(course.length-1));ctx.fillStyle='#fff';ctx.fillRect(end[0]-3,end[1]-3,6,6);
  const p=xy(state);ctx.beginPath();ctx.fillStyle=course.config.color;ctx.arc(...p,5,0,6.28);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
}
function updateHUD(){
  $('race-time').textContent=formatTime(state.elapsed);$('speed').textContent=String(Math.round(Math.abs(state.speed)*3.6)).padStart(3,'0');
  $('gear').textContent=state.speed<-.1?'R':state.speed<1?'N':Math.min(6,Math.floor(state.speed/11)+1);
  const progress=Math.min(100,Math.round(state.distance/course.length*100));$('progress-value').textContent=progress;$('progress-fill').style.width=progress+'%';
  $('checkpoint-label').textContent=`CHECKPOINT ${state.checkpoint} / 3`;
  $('boost-fill').style.width=state.boost+'%';$('boost-value').textContent=Math.round(state.boost);
  $('air-status').textContent=state.falling?'MISSED IT? PRESS R':!state.grounded?'AIR TIME '+state.airtime.toFixed(1)+' S':getInput().boost&&state.speed>8&&state.boost>1?'FULL SEND / NITRO':state.speed<-.1?'REVERSE':state.speed>42?'KEEP THE FLOW':state.speed<.1?'W TO DRIVE / S TO REVERSE':'MANUAL CONTROL';
  tickElements.forEach((t,i)=>t.classList.toggle('on',i/22<Math.abs(state.speed)/78));updateMap();
}
function frame(timestamp){
  requestAnimationFrame(frame);
  const dt=Math.min((timestamp-previousTimestamp)/1000||.016,.05);previousTimestamp=timestamp;clockTime+=dt;hudTime+=dt;
  if(mode==='countdown'){
    const prev=Math.ceil(countTime);countTime-=dt;const n=Math.ceil(countTime);
    $('countdown').textContent=n>0?String(Math.min(n,3)):'GO!';
    if(n!==prev)beep(n>0?420:840,.18,.05);
    if(countTime<-.55){mode='playing';$('countdown').classList.add('hidden');toast('READY TO DRIVE','WASD / SHIFT TO BOOST',2.5);}
  }
  if(mode==='playing'){
    accumulator+=dt;
    while(accumulator>=1/120 && mode==='playing'){updatePhysics(1/120);accumulator-=1/120;}
  }
  if(mode==='playing'||mode==='countdown'||mode==='menu'||mode==='finished'){positionCar(dt);updateCamera(dt);}
  if(mode!=='menu'&&hudTime>=1/30){updateHUD();hudTime=0;}
  if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('visible');}
  if(audio.ctx&&audio.osc){
    const active=mode==='playing'&&!isMuted;audio.osc.frequency.setTargetAtTime(37+state.speed*2.8+(getInput().throttle?12:0),audio.ctx.currentTime,.1);
    audio.gain.gain.setTargetAtTime(active?.008+state.speed*.0003:0,audio.ctx.currentTime,.08);
  }
  renderer.render(scene,camera);
}

document.querySelectorAll('[data-track]').forEach(b=>b.addEventListener('click',()=>{if(mode==='menu')selectTrack(Number(b.dataset.track));}));
document.querySelectorAll('[data-paint]').forEach(b=>b.addEventListener('click',()=>{bodyMat.color.set(b.dataset.paint);document.querySelectorAll('[data-paint]').forEach(p=>p.classList.toggle('active',p===b));}));
$('play-button').addEventListener('click',startRace);$('resume-button').addEventListener('click',resume);$('pause-button').addEventListener('click',()=>mode.startsWith('paused')?resume():pause());
$('restart-button').addEventListener('click',startRace);$('again-button').addEventListener('click',startRace);
for(const id of['exit-button','finish-exit-button'])$(id).addEventListener('click',showMenu);
$('next-button').addEventListener('click',()=>{selectTrack((selected+1)%3);startRace();});
$('brand-home').addEventListener('click',event=>{event.preventDefault();if(mode==='playing'||mode==='countdown')pause();else if(mode==='menu')selectTrack(selected);});
$('sound-button').addEventListener('click',soundToggle);
$('fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('FULLSCREEN UNAVAILABLE','YOUR BROWSER MAY LIMIT THIS FEATURE');}});
$('help-button').addEventListener('click',()=>{helpWasPlaying=mode==='playing'||mode==='countdown';if(helpWasPlaying)pause();$('pause-overlay').classList.add('hidden');$('help-overlay').classList.remove('hidden');$('close-help').focus();});
function closeHelp(){$('help-overlay').classList.add('hidden');if(helpWasPlaying){resume();helpWasPlaying=false;}}
$('close-help').addEventListener('click',closeHelp);$('got-it-button').addEventListener('click',closeHelp);
window.addEventListener('keydown',event=>{
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code))event.preventDefault();
  if(event.repeat)return;
  if(event.code==='Escape'||event.code==='KeyP'){
    if(!$('help-overlay').classList.contains('hidden'))closeHelp();else if(mode==='playing'||mode==='countdown')pause();else resume();return;
  }
  if(event.code==='KeyM'){soundToggle();return;}
  if(event.code==='KeyR'){reset();return;}
  if(event.code==='KeyC'){if(mode==='playing'){cameraMode=(cameraMode+1)%3;toast(['CHASE CAMERA','LOW CAMERA','HIGH CAMERA'][cameraMode],'',1);}return;}
  if(mode==='menu'&&event.code==='Enter'){startRace();return;}
  if(mode==='playing'||mode==='countdown')keys.add(event.code);
});
window.addEventListener('keyup',event=>keys.delete(event.code));
window.addEventListener('blur',()=>{clearInputs();pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInputs();pause();}});
document.querySelectorAll('[data-control]').forEach(button=>{
  const control=button.dataset.control;
  button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);touch[control]=true;button.classList.add('pressed');});
  for(const name of['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>{touch[control]=false;button.classList.remove('pressed');});
});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(mode==='menu')updateCamera(1,true);});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();pause();$('fatal-error').classList.remove('hidden');$('error-message').textContent='The graphics connection was interrupted. Reload to get back on the grid.';});
selectTrack(0);$('loading').classList.add('hidden');requestAnimationFrame(frame);

// Read-only diagnostics for repeatable physics and browser verification.
window.horizon={getState:()=>({...state,mode,track:course.config.id,length:course.length}),getRendererInfo:()=>({...renderer.info.render}),getCourse:()=>course};
