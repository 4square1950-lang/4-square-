import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { VenueId } from '../types/campaign';
import { getVenueArt } from '../utils/venueArt';
import { worldLand } from '../utils/worldLand';

const radius = 2.2;
function point(id: VenueId, r: number) {
  const { longitude, latitude } = getVenueArt(id);
  const phi = THREE.MathUtils.degToRad(longitude + 180);
  const lat = THREE.MathUtils.degToRad(latitude);
  return new THREE.Vector3(-r * Math.cos(phi) * Math.cos(lat), r * Math.sin(lat), r * Math.sin(phi) * Math.cos(lat));
}

interface Props { ids: VenueId[]; active: VenueId; angle: { x: number; y: number } }
export function WorldGlobe({ ids, active, angle }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const state = useRef({active,angle});
  const [fallback, setFallback] = useState(false);
  state.current = { active,angle };
  useEffect(() => {
    const node = mount.current;
    if (!node) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1800;
    canvas.height = 900;
    const context = canvas.getContext('2d');
    if (!context) { setFallback(true); return; }
    context.fillStyle = '#1e3237';
    context.fillRect(0,0,canvas.width,canvas.height);
    context.scale(2,2);
    context.translate(0,12.5);
    context.fillStyle = '#809783';
    context.strokeStyle = '#acb8a0';
    context.lineWidth = .4;
    for (const land of worldLand) {
      const coast = new Path2D(land);
      context.fill(coast); context.stroke(coast);
    }
    context.strokeStyle = '#a9bfa54a';
    for(let x=0;x<900;x+=75) { context.beginPath(); context.moveTo(x,-12.5); context.lineTo(x,437.5); context.stroke(); }
    for(let y=0;y<450;y+=75) { context.beginPath(); context.moveTo(0,y); context.lineTo(900,y); context.stroke(); }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
    catch { map.dispose(); setFallback(true); return; }
    const scene = new THREE.Scene();
    const globe = new THREE.Group();
    scene.add(globe, new THREE.HemisphereLight(0xe3efe7,0x4e5758,2.15));
    const key = new THREE.DirectionalLight(0xffedc2,2);
    key.position.set(-3,5,6); scene.add(key);
    globe.add(new THREE.Mesh(new THREE.SphereGeometry(radius,64,48), new THREE.MeshStandardMaterial({ map, roughness: .93 })));
    const dots = ids.map((id) => {
      const marker = new THREE.Mesh(new THREE.SphereGeometry(.03,10,8), new THREE.MeshBasicMaterial({color: 0xe3ca86}));
      marker.position.copy(point(id,radius+.018)); globe.add(marker); return marker;
    });
    for (let i=1;i<ids.length;i++) {
      const start = point(ids[i-1],1), end = point(ids[i],1);
      const distance = start.angleTo(end);
      const route = [];
      for(let step=0;step<=30;step++) {
        const t=step/30;
        const position = distance > .00001 ? start.clone().multiplyScalar(Math.sin((1-t)*distance)/Math.sin(distance))
          .addScaledVector(end,Math.sin(t*distance)/Math.sin(distance)) : start.clone();
        route.push(position.multiplyScalar(radius+.025+Math.sin(Math.PI*t)*distance*.075));
      }
      globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(route),new THREE.LineBasicMaterial({color:0xd4b574, transparent:true,opacity:.8})));
    }
    const camera = new THREE.PerspectiveCamera(38,1,.1,40);
    const resize = () => {
      const width = node.clientWidth, height = node.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.position.set(0,0,Math.max(6.75,6.75/camera.aspect));
      camera.updateProjectionMatrix();
      renderer.setSize(width,height);
    };
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
    node.appendChild(renderer.domElement);
    const observer = new ResizeObserver(resize);
    observer.observe(node); resize();
    const turn = new THREE.Quaternion();
    const yaw = new THREE.Quaternion();
    const pitch = new THREE.Quaternion();
    const xAxis = new THREE.Vector3(1,0,0), yAxis = new THREE.Vector3(0,1,0);
    let frame = 0;
    let previous: VenueId | undefined;
    function draw() {
      frame = requestAnimationFrame(draw);
      const {active,angle} = state.current;
      if (previous !== active) {
        dots.forEach((dot,i) => {
          const selected = ids[i] === active;
          dot.scale.setScalar(selected ? 2.2 : 1);
          dot.material.color.set(selected ? 0xfff4cf : 0xd5b979);
        });
        previous = active;
      }
      const target = point(active,1);
      yaw.setFromAxisAngle(yAxis, -Math.atan2(target.x,target.z) + THREE.MathUtils.degToRad(angle.y));
      pitch.setFromAxisAngle(xAxis, Math.asin(target.y) + THREE.MathUtils.degToRad(angle.x - 8));
      turn.copy(pitch).multiply(yaw);
      globe.quaternion.slerp(turn, .13);
      renderer.render(scene,camera);
    }
    draw();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); map.dispose();
      globe.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) { object.geometry.dispose(); object.material.dispose(); }
      });
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [ids]);
  return fallback ? <svg viewBox="0 0 900 405" className="block h-full w-full" aria-label="World map">{worldLand.map((path,i) => <path key={i} fill="#82998a" d={path} />)}</svg>
    : <div ref={mount} className="h-full w-full" role="img" aria-label="Rotatable world globe with venue markers" />;
}
