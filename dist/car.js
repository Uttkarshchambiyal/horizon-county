import * as THREE from './vendor/three.module.min.js';

import {createVehicle,createGarageLoader} from './vehicles.js?v=launch-beta-13';
export function createCar(scene){const vehicle=createVehicle(scene,'clubsport');createGarageLoader([vehicle]).select(vehicle).catch(()=>{});return vehicle;}

export function addReflections(scene,renderer) {
  const c=document.createElement('canvas');c.width=1024;c.height=512;
  const ctx=c.getContext('2d'),sky=ctx.createLinearGradient(0,0,0,512);
  sky.addColorStop(0,'#eff6fc');sky.addColorStop(.42,'#8cabc0');sky.addColorStop(.5,'#d6e3dd');sky.addColorStop(.54,'#3e5155');sky.addColorStop(1,'#142228');ctx.fillStyle=sky;ctx.fillRect(0,0,1024,512);
  const glow=ctx.createLinearGradient(0,80,0,200);glow.addColorStop(0,'rgba(255,255,255,0)');glow.addColorStop(.5,'rgba(255,255,255,1)');glow.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=glow;ctx.fillRect(80,80,430,120);ctx.fillRect(780,100,180,90);
  const texture=new THREE.CanvasTexture(c);texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;
  const generator=new THREE.PMREMGenerator(renderer),environment=generator.fromEquirectangular(texture);
  scene.environment=environment.texture;scene.environmentIntensity=.7;texture.dispose();generator.dispose();
}
