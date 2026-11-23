import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildCharacterMesh } from '../utils/characterModelBuilder';
import type { CharacterDef, CharacterCustomization } from '../utils/characters';
import { buildCampusSchool, disposeCampus } from '../utils/campusScene';
import { courtBallMaterial } from '../utils/courtBall';
import type { SoloSetup } from '../services/soloSetup';
import type { VenueId } from '../types/campaign';
import { getVenueArt } from '../utils/venueArt';

export function CharacterLineup({ characters, controlled, customization, celebration, motion, court, setup }: { characters: CharacterDef[]; controlled?: string; customization?: CharacterCustomization; celebration?: 'court' | 'dance' | 'pool'; motion?: 'idle' | 'victory'; court?: boolean; setup?: Omit<SoloSetup,'lineup'> }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({antialias:true}); } catch { return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.toneMapping=THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(celebration === 'pool' ? 0x87adbf : 0x242e2b);
    const models = new THREE.Group();
    scene.add(models, new THREE.HemisphereLight(0xfff5e1,0x888f9a,2.2));
    const lamp = new THREE.DirectionalLight(0xffdfad,3.2); lamp.position.set(2,4,4); scene.add(lamp);
    const camera = new THREE.PerspectiveCamera(37,1,.1,30);
    const performers: THREE.Group[] = [];
    const weather = setup?.weather;
    let practiceBall: THREE.Mesh | undefined;
    if (setup) {
      const art = getVenueArt(setup.venueId as VenueId);
      const dim = weather !== 'Clear' && setup.surface==='outdoor';
      lamp.intensity=dim?1.65:3.2;
      scene.background.set(dim ? weather==='Fog'?'#899893':'#52636b' : '#354b4b');
      if(dim) scene.fog=new THREE.FogExp2(scene.background,weather==='Fog'?.075:.023);
      if(setup.surface==='outdoor') {
        const school=buildCampusSchool(setup.venueId as VenueId);
        school.scale.setScalar(.35);
        school.position.z=-1.25;
        models.add(school);
      } else {
        const wall=new THREE.Mesh(new THREE.BoxGeometry(20,4,.25),new THREE.MeshStandardMaterial({color:art.facade}));
        wall.position.set(0,2,-4.4);
        const padding=new THREE.Mesh(new THREE.BoxGeometry(20,.85,.32),new THREE.MeshStandardMaterial({color:art.trim}));
        padding.position.set(0,.43,-4.25);
        models.add(wall,padding);
      }
      practiceBall=new THREE.Mesh(new THREE.SphereGeometry(.22,32,24),courtBallMaterial(setup.ball));
      practiceBall.position.y=.23;
      models.add(practiceBall);
    }
    if (court) {
      const surfaces = setup?.surface==='indoor' ? [0x8d6349,0x926d51,0x8c684c,0xa37d57] : [0x526e65,0x654d46,0x4c5d70,0x76654b];
      const line = new THREE.MeshStandardMaterial({ color: 0xe6dcc6 });
      const backing = new THREE.Mesh(new THREE.BoxGeometry(6.2,.13,6.2),line);
      backing.position.y = -.076;
      models.add(backing);
      surfaces.forEach((color,index) => {
        const tile = new THREE.Mesh(new THREE.BoxGeometry(2.96,.08,2.96),new THREE.MeshStandardMaterial({ color, roughness:.93 }));
        tile.position.set(index % 2 ? 1.52 : -1.52,-.026,index < 2 ? -1.52 : 1.52);
        models.add(tile);
      });
    }
    if (celebration) {
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: celebration === 'pool' ? 0xd1b28b : 0x39464b }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -.045;
      models.add(floor);
      if (celebration === 'pool') {
        const water = new THREE.Mesh(new THREE.BoxGeometry(7, .04, 2.4), new THREE.MeshPhysicalMaterial({ color: 0x2998ac, roughness: .15, clearcoat: 1 }));
        water.position.set(0, -.01, 2);
        models.add(water);
        const beachBall = new THREE.Mesh(new THREE.SphereGeometry(.28, 24, 16), new THREE.MeshStandardMaterial({ color: 0xe7aa54, roughness: .32 }));
        beachBall.position.set(1.4, .15, 1.95);
        models.add(beachBall);
        for (const x of [-2.1, 2.1]) {
          const stand = new THREE.Mesh(new THREE.CylinderGeometry(.044, .044, 2.2), new THREE.MeshStandardMaterial({ color: 0xcfd5be }));
          const shade = new THREE.Mesh(new THREE.ConeGeometry(.91, .37, 12), new THREE.MeshStandardMaterial({ color: x < 0 ? 0xa9524f : 0xd5a243 }));
          stand.position.set(x, 1.1, -1.3);
          shade.position.set(x, 2.11, -1.3);
          models.add(stand, shade);
        }
      }
    }
    characters.forEach((character,index) => {
      const x = court ? (index % 2 ? 2.20 : -2.20) : (index-(characters.length-1)/2)*1.1;
      const model = buildCharacterMesh(character,character.id===controlled ? customization : undefined);
      model.position.set(x,.04,court ? (index < 2 ? -1.86 : 1.34) : 0); models.add(model); performers.push(model);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(.45,.5,.08,28),new THREE.MeshStandardMaterial({color:character.id===controlled?0xb18b4c:0x3d4c48}));
      plate.position.set(x,0,0);
      if (celebration || court) { plate.geometry.dispose(); plate.material.dispose(); } else models.add(plate);
    });
    node.appendChild(renderer.domElement);
    const resize = () => {
      const w=node.clientWidth,h=node.clientHeight;
      if(!w||!h)return;
      camera.aspect=w/h;
      const fit = Math.max(1,1.15/camera.aspect);
      if (court) camera.position.set(0,9.3*fit,6.7*fit);
      else camera.position.set(0,1.45,Math.max(3.2,(characters.length*1.1+0.7)/(camera.aspect*.62)));
      camera.lookAt(0,court ? .15 : .77,0);camera.updateProjectionMatrix();renderer.setSize(w,h);renderer.render(scene,camera);
    };
    const observer=new ResizeObserver(resize);observer.observe(node);resize();
    if ((celebration || motion) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const arms = performers.map((model) => [model.getObjectByName('leftArm'), model.getObjectByName('rightArm')]);
      renderer.setAnimationLoop((time) => {
        const beat=time/1200;
        const cycle=[0,3,2,1];
        const from=cycle[Math.floor(beat)%4],to=cycle[(Math.floor(beat)+1)%4],t=beat%1;
        performers.forEach((model, index) => {
          const phase = time * .004 + index * .85;
          const cheering = motion === 'victory' || celebration === 'dance';
          model.rotation.y = Math.sin(phase * .48) * (cheering ? .5 : .19);
          model.rotation.z = Math.sin(phase * 1.6) * (cheering ? .065 : .022);
          model.position.y = .045 + Math.max(0, Math.sin(phase * 1.6)) * (cheering ? .19 : .015);
          arms[index].forEach((arm, side) => {
            if (arm) arm.rotation.x = cheering ? -1.94 - Math.sin(phase + side) * .7 : -.17 + Math.sin(phase + side * Math.PI) * .11;
          });
          if (practiceBall && performers.length===4) {
            const active=index===from || index===to;
            const effort=index===from ? Math.max(0,1-t*4) : index===to ? Math.max(0,(t-.7)/.3) : 0;
            model.rotation.y=Math.atan2(-model.position.x,-model.position.z)+Math.sin(phase)*.08;
            model.rotation.x=effort*.13;
            const arm=arms[index][1];
            if(active && arm) arm.rotation.x=-.36-effort*1.29;
          }
        });
        if(practiceBall && performers.length===4) {
          const a=performers[from].position,b=performers[to].position;
          practiceBall.position.set(THREE.MathUtils.lerp(a.x,b.x,t)*.77,.235+Math.abs(t-.53)*(t<.53?1.9:1.55),THREE.MathUtils.lerp(a.z,b.z,t)*.77);
          practiceBall.rotation.x=beat*2.8;
        }
        renderer.render(scene, camera);
      });
    }
    return ()=>{observer.disconnect();renderer.setAnimationLoop(null);disposeCampus(models);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
  },[characters,controlled,customization,celebration,motion,court,setup]);
  return <div className="relative h-full w-full bg-[#242e2b]"><div ref={host} role="img" aria-label={characters.map(({name})=>name).join(', ')} className="h-full w-full"/>
    {setup?.surface==='outdoor' && (setup.weather==='Rain'||setup.weather==='Snow') && <div aria-hidden="true" className={`weather-layer weather-${setup.weather.toLowerCase()}`}/>}
  </div>;
}
