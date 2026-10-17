import * as THREE from './vendor/three.module.min.js';
import {HDRLoader} from './vendor/HDRLoader.js';

// All files are local. Procedural materials remain usable while photographs
// load, and a missing optional texture never prevents starting a drive.
export async function loadWorldAssets(scene,renderer,view){
  const loader=new THREE.TextureLoader(),anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const texture=async(file,repeat,srgb=false)=>{
    const t=await loader.loadAsync('./assets/'+file);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=srgb?anisotropy:Math.min(2,anisotropy);if(srgb)t.colorSpace=THREE.SRGBColorSpace;return t;
  };
  const road=async()=>{
    const maps=await Promise.all([texture('asphalt_02_diff_1k.jpg',[3,3],true),texture('asphalt_02_nor_gl_1k.jpg',[3,3]),texture('asphalt_02_rough_1k.jpg',[3,3])]);
    const m=view.surfaces.asphalt;m.map.dispose();[m.map,m.normalMap,m.roughnessMap]=maps;m.color.set(0xf0f0ed);m.normalScale.set(.15,.15);m.roughness=.88;m.needsUpdate=true;
  };
  const ground=async()=>{
    const repeat=[view.surfaces.sizeX/8,view.surfaces.sizeZ/8],maps=await Promise.all([texture('brown_mud_leaves_01_diff_1k.jpg',repeat,true),texture('brown_mud_leaves_01_nor_gl_1k.jpg',repeat)]);
    const m=view.surfaces.terrain;[m.map,m.normalMap]=maps;m.normalScale.set(.28,.28);m.needsUpdate=true;
  };
  const environment=async()=>{
    const hdr=await new HDRLoader().loadAsync('./assets/kloppenheim_06_puresky_1k.hdr'),generator=new THREE.PMREMGenerator(renderer),environment=generator.fromEquirectangular(hdr),old=scene.environment;
    scene.environment=environment.texture;hdr.dispose();generator.dispose();if(old)old.dispose();
  };
  const facades=async()=>{
    const names=['brick','plaster','concrete'],images=await Promise.all(names.map(name=>new THREE.ImageLoader().loadAsync('./assets/materials/'+name+'.jpg')));
    view.city.facades.applyPhotos(Object.fromEntries(names.map((name,i)=>[name,images[i]])));
  };
  const regions=async()=>{
    const [sand,rock]=await Promise.all([texture('materials/sand.jpg',[1,1],true),texture('materials/rock.jpg',[1,1],true)]);
    view.regions.groundMaterial.map=sand;view.regions.groundMaterial.needsUpdate=true;
    view.regions.rockMaterial.map=rock;view.regions.rockMaterial.needsUpdate=true;
    // Blend by world position so the whole shoreline receives sand rather
    // than stretching a city-ground photograph across beach and mountains.
    const m=view.surfaces.terrain;
    m.onBeforeCompile=shader=>{
      shader.uniforms.shoreSand={value:sand};shader.uniforms.ridgeRock={value:rock};
      shader.vertexShader='varying vec3 vRegionPosition;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','vRegionPosition=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>');
      shader.fragmentShader='varying vec3 vRegionPosition;uniform sampler2D shoreSand;uniform sampler2D ridgeRock;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        float shoreline=-1110.+65.*sin(vRegionPosition.z*.002)+28.*sin(vRegionPosition.z*.006);
        float beach=1.-smoothstep(115.,190.,vRegionPosition.x-shoreline);
        float ridge=smoothstep(45.,110.,vRegionPosition.y)*(1.-beach)*(.55+.22*sin(vRegionPosition.x*.025)*sin(vRegionPosition.z*.019));
        diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(shoreSand,vRegionPosition.xz*.16).rgb,beach);
        diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(ridgeRock,vRegionPosition.xz*.12).rgb,ridge);`);
    };m.customProgramCacheKey=()=> 'horizon-regional-ground-v1';m.needsUpdate=true;
  };
  const results=await Promise.allSettled([road(),ground(),environment(),facades(),regions()]);
  return {loaded:results.filter(r=>r.status==='fulfilled').length,total:results.length};
}
