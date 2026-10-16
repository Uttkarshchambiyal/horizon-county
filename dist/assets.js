import * as THREE from './vendor/three.module.min.js';
import {HDRLoader} from './vendor/HDRLoader.js';

// All files are local. Procedural materials remain usable while photographs
// load, and a missing optional texture never prevents starting a drive.
export async function loadWorldAssets(scene,renderer,view){
  const loader=new THREE.TextureLoader(),anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const texture=async(file,repeat,srgb=false)=>{
    const t=await loader.loadAsync('./assets/'+file);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=anisotropy;if(srgb)t.colorSpace=THREE.SRGBColorSpace;return t;
  };
  const road=async()=>{
    const maps=await Promise.all([texture('asphalt_02_diff_1k.jpg',[3,3],true),texture('asphalt_02_nor_gl_1k.jpg',[3,3]),texture('asphalt_02_rough_1k.jpg',[3,3])]);
    const m=view.surfaces.asphalt;m.map.dispose();[m.map,m.normalMap,m.roughnessMap]=maps;m.color.set(0xffffff);m.normalScale.set(.5,.5);m.needsUpdate=true;
  };
  const ground=async()=>{
    const repeat=[view.surfaces.sizeX/8,view.surfaces.sizeZ/8],maps=await Promise.all([texture('brown_mud_leaves_01_diff_1k.jpg',repeat,true),texture('brown_mud_leaves_01_nor_gl_1k.jpg',repeat)]);
    const m=view.surfaces.terrain;[m.map,m.normalMap]=maps;m.normalScale.set(.45,.45);m.needsUpdate=true;
  };
  const environment=async()=>{
    const hdr=await new HDRLoader().loadAsync('./assets/kloppenheim_06_puresky_1k.hdr'),generator=new THREE.PMREMGenerator(renderer),environment=generator.fromEquirectangular(hdr),old=scene.environment;
    scene.environment=environment.texture;hdr.dispose();generator.dispose();if(old)old.dispose();
  };
  const results=await Promise.allSettled([road(),ground(),environment()]);
  return {loaded:results.filter(r=>r.status==='fulfilled').length,total:3};
}
