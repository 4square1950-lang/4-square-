import * as THREE from 'three';
import {ANNEX,ANNEX_STAIRS,SCHOOL_STAIRS,SCHOOL_UPPER,SCHOOL_LIFT} from './campusLayout';
import type {BoxCollider,PhysicsEngine} from './physicsEngine';
import {getVenueArt} from './venueArt';
import type {VenueId} from '../types/campaign';

export function buildCampusAnnex(id:VenueId, physics:PhysicsEngine) {
  const group=new THREE.Group();
  group.name='campusAnnex';
  const art=getVenueArt(id);
  const mat=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.82});
  const wall=mat(art.facade), trim=mat(art.trim),floor=mat(0x928773), timber=mat(0x755840), metal=mat(0x425652),paper=mat(0xe6d7b8);
  let fixtureId=0;
  const item=(surface:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,collider=false)=>{
    const object=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),surface); object.position.set(x,y,z);
    object.castShadow=h>.25;object.receiveShadow=true;group.add(object);
    if(collider){
      const hit:BoxCollider={id:'annex-'+fixtureId++,type:'wall',minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2};
      physics.addBox(hit); if(h>1.4)object.userData.cameraWall=true;
    }
    return object;
  };
  const sign=(title:string,x:number,y:number,z:number,scale:number)=>{
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
    const ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.fillStyle='#263a38';ctx.fillRect(0,0,512,96);ctx.fillStyle='#f4ecd6';ctx.textAlign='center';ctx.font='bold 43px Georgia';
    ctx.fillText(title,256,63,482);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    const plate=new THREE.Mesh(new THREE.PlaneGeometry(scale,.58),new THREE.MeshStandardMaterial({map,roughness:.92}));
    plate.position.set(x,y,z);group.add(plate);
  };

  item(floor,0,-.013,-78,30,.05,24).name='classroomFloor';
  for(const edge of [ANNEX.left,ANNEX.right])item(wall,edge,3.62,-78,.25,7.24,24,true);
  item(wall,0,3.62,ANNEX.rear,30,7.24,.25,true);
  for(const x of [-8.6,8.6])item(wall,x,3.62,ANNEX.front,12.8,7.24,.25,true);
  item(wall,0,4.18,ANNEX.front,4.4,4.36,.26,true);
  item(trim,0,7.22,-78,30.5,.22,24.5);
  sign('Four Square Academy · Library',0,2.35,-65.83,8.4);
  sign('Reading Room',6,5.1,-88.8,5.4);
  sign('Hallway · Stairs',-4,2.5,-88.8,5.4);
  const glass = mat(0x4d6267);
  for (const level of [0, ANNEX.floor]) for (const x of [-12, -8, -4, 4, 8, 12]) {
    item(trim, x, level + 1.84, ANNEX.front + .15, 1.8, 1.52, .12);
    item(glass, x, level + 1.84, ANNEX.front + .224, 1.62, 1.34, .04);
    item(trim, x, level + 1.84, ANNEX.front + .254, .065, 1.34, .02);
    item(trim, x, level + 1.84, ANNEX.front + .254, 1.62, .065, .02);
  }
  for (const level of [0, ANNEX.floor]) {
    // The east corridor connects separate reading and study rooms.
    for (const [x, z, depth] of [[1,-69.2,6.4],[1,-78.2,6.9],[1,-87.4,5.2]]) {
      item(wall, x, level + 1.39, z, .21, 2.78, depth, true);
    }
    item(wall, 8, level + 1.39, -81.3, 13.8, 2.78, .19, true);
    sign('Study Hall', 7.3, level + 2.3, -81.18, 4);
    for (const z of [-75.4,-83.2]) item(trim, 1, level + 2.55, z, .28, .36, 2.3);
  }

  const {left,right,bottom,top}=ANNEX_STAIRS;
  const y=ANNEX.floor;
  for(const [x,z,w,d] of [
    [(ANNEX.left+left)/2,-78,left-ANNEX.left,24],
    [(right+ANNEX.right)/2,-78,ANNEX.right-right,24],
    [(left+right)/2,(ANNEX.rear+top)/2,right-left,top-ANNEX.rear],
    [(left+right)/2,(ANNEX.front+bottom)/2,right-left,ANNEX.front-bottom],
  ]) item(floor,x,y-.10,z,w,.20,d).name='classroomFloor';
  const depth=bottom-top;
  const ramp=item(timber,(left+right)/2,y/2-.08,(bottom+top)/2,right-left,.18,Math.hypot(depth,y));
  ramp.name='classroomFloor';
  ramp.rotation.x=Math.atan(y/depth);
  for(const edge of [left,right]) {
    item(metal,edge,2.35,(bottom+top)/2,.10,4.7,depth,true);
    item(trim,edge,4.58,(bottom+top)/2,.16,.14,depth);
  }
  item(metal,(left+right)/2,3.95,bottom,right-left,1.02,.09,true);

  for(const level of [0,y]){
    for(const [x,z] of [[3,-77],[9.6,-77],[5.8,-85],[10.6,-85]]){
      item(timber,x,level+.70,z,2,.12,1.15,true);
      item(paper,x+.31,level+.775,z+.08,.52,.032,.37);
      for(const dx of [-.86,.86])item(metal,x+dx,level+.31,z,.08,.62,.9,true);
      item(timber,x,level+.32,z+1,.62,.07,.52,true);
      item(timber,x,level+.56,z+1.25,.62,.41,.065,true);
    }
    for(const z of [-73,-80.8,-87.1]){
      item(timber,13.6,level+1,z,.65,2.03,2.2,true);
      for(const shelf of [.43,.91,1.39]){
        item(timber,13.12,level+shelf,z,.36,.11,2.2);
        for(let j=0;j<7;j++){
          const book=item(j%3===0?paper:j%3===1?trim:metal,13.08,level+shelf+.20,z-.89+j*.29,.21,.30+(j%3)*.035,.17);
          book.userData.bookIndex=j%3;
          item(paper,12.965,level+shelf+.28,z-.89+j*.29,.01,.022,.15).userData.bookIndex=j%3;
        }
      }
    }
  }
  return group;
}

export function buildCampusCrowd(physics:PhysicsEngine) {
  const people: { x: number; y: number; z: number; phase: number; seated: boolean; heading?: number }[] = [];
  const add = (x: number, y: number, z: number, seated = false, heading?: number) =>
    people.push({ x, y, z, seated, heading, phase: people.length * 1.93 });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      const group = Math.floor(i / 3);
      const angle = i % 3 * Math.PI * 2 / 3 + group * .6;
      add(side * (28.3 + group * 1.45) + Math.cos(angle) * .9, 0, -30.2 + Math.sin(angle) * .92,
        false, -Math.PI / 2 - angle);
    }
  }
  // Clusters in the quiet library corridor and seated groups at study tables.
  for (const y of [0, ANNEX.floor]) {
    for (const [x,z] of [[3,-77],[9.6,-77],[5.8,-85],[10.6,-85]]) {
      add(x,y,z+1,true,Math.PI);
    }
    for (let cluster=0;cluster<3;cluster++) {
      const z = -72.7 - cluster*6.4;
      for (let i=0;i<4;i++) {
        const angle=i*Math.PI/2;
        add(-4+Math.sin(angle)*.88,y,z+Math.cos(angle)*.86,false,Math.PI+angle);
      }
    }
  }
  for (const z of [-19,-17,-13.3]) for (const x of [4.45,5.45])
    add(x,SCHOOL_UPPER.floor,z+.76,true,Math.PI);

  const crowd = new THREE.Group();
  crowd.name = 'campusCrowd';
  const material = new THREE.MeshStandardMaterial({ roughness: .87 });
  const parts: { geometry: THREE.BufferGeometry; x: number; y: number; z: number; bodyPart: string }[] = [
    {geometry:new THREE.SphereGeometry(.175,15,12), x:0,y:1.22,z:0,bodyPart:'head'},
    {geometry:new THREE.SphereGeometry(.175,14,10,0,Math.PI*2,0,Math.PI*.41),x:0,y:1.256,z:-.013,bodyPart:'hair'},
    {geometry:new THREE.CapsuleGeometry(.17,.19,4,12),x:0,y:.86,z:0,bodyPart:'shirt'},
    ...[-1,1].flatMap((side) => [
      {geometry:new THREE.SphereGeometry(.024,8,6),x:.061*side,y:1.229,z:.16,bodyPart:'eye'},
      {geometry:new THREE.SphereGeometry(.010,7,6),x:.061*side,y:1.229,z:.180,bodyPart:'pupil'},
      {geometry:new THREE.CapsuleGeometry(.061,.30,4,8),x:.10*side,y:.40,z:0,bodyPart:'leg'},
      {geometry:new THREE.CapsuleGeometry(.048,.22,4,8),x:.209*side,y:.78,z:.02,bodyPart:'arm'},
      {geometry:new THREE.BoxGeometry(.12,.10,.21),x:.1*side,y:.08,z:.037,bodyPart:'shoe'},
    ]),
    {geometry:new THREE.SphereGeometry(.037,9,6),x:0,y:1.156,z:.158,bodyPart:'mouth'},
  ];
  const meshes = parts.map(({ geometry }) => {
    const mesh=new THREE.InstancedMesh(geometry,material,people.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;crowd.add(mesh);
    return mesh;
  });
  const skins = [0x9b694f,0xcfa179,0x78533d,0xd79c75,0xaa7b5a,0xe4bb9b];
  const hairs = [0x222023,0x583522,0x2f211b,0x8d492c,0x987342,0x403736];
  people.forEach((person,index)=>{
    const shirt=new THREE.Color().setHSL((index*.61803399)%1, .25 + (index%3)*.06, .34 + (index%6)*.032);
    const skin = new THREE.Color(skins[Math.floor(index/3)%skins.length]);
    parts.forEach(({bodyPart},part) => {
      const color = bodyPart==='head' || bodyPart==='arm' ? skin : bodyPart==='shirt' ? shirt :
        new THREE.Color(bodyPart==='hair' ? hairs[index%hairs.length] : bodyPart==='eye' ? 0xf2e6d6 :
          bodyPart==='pupil' ? 0x1c1717 : bodyPart==='mouth' ? 0x603b37 : bodyPart==='shoe' ? 0x232225 : 0x394049);
      meshes[part].setColorAt(index,color);
    });
    physics.addCylinder({id:'campus-student-'+index,type:'person',x:person.x,y:person.y,z:person.z,radius:.24,height:1.45,isStatic:true});
  });
  const dummy=new THREE.Object3D();
  crowd.userData.update=(time:number)=>{
    people.forEach((person,index)=>{
      const gesture = Math.sin(time*(person.seated?3.2:1.15)+person.phase);
      const heading = (person.heading ?? person.phase)+Math.sin(time*.71+person.phase)*.13;
      const scale = .89 + (index%11)*.014;
      const width = .92 + (index%7)*.027;
      const sway = gesture*.021;
      parts.forEach(({x,y,z,bodyPart},part)=>{
        const seatedHeight = person.seated && y > .50 ? -.24 : 0;
        const handOffset = person.seated && bodyPart==='arm' ? .105 + gesture*.029 : 0;
        const depth = (z + handOffset) * scale;
        dummy.position.set(person.x+x*width*Math.cos(heading)+Math.sin(heading)*depth+sway,person.y+y*scale+seatedHeight,person.z-x*width*Math.sin(heading)+Math.cos(heading)*depth);
        dummy.rotation.set(bodyPart==='arm' ? (person.seated ? -.92 : gesture*.19) : 0,heading,0);
        dummy.scale.set(width*(bodyPart==='hair'?1+(index%4)*.035:1), bodyPart==='mouth'?.32+Math.abs(gesture)*.10:scale, bodyPart==='mouth'?.24:1);
        dummy.updateMatrix();
        meshes[part].setMatrixAt(index,dummy.matrix);
      });
    });
    meshes.forEach((mesh)=>{mesh.instanceMatrix.needsUpdate=true;});
  };
  crowd.userData.update(0);
  return crowd;
}

export function buildSchoolUpperFloor(physics: PhysicsEngine) {
  const group = new THREE.Group();
  group.name = 'schoolUpperFloor';
  const tiles = new THREE.MeshStandardMaterial({color: 0x827b68, roughness: .85});
  const walls = new THREE.MeshStandardMaterial({color: 0xb4a991, roughness: .88});
  const railing = new THREE.MeshStandardMaterial({color: 0x445454, roughness: .51});
  const desks = new THREE.MeshStandardMaterial({color: 0x6a543e, roughness: .79});
  const {left, right, front, rear, floor} = SCHOOL_UPPER;
  const stairs = SCHOOL_STAIRS;
  const lift = SCHOOL_LIFT;
  let index = 0;
  const add = (material: THREE.Material, x: number, y: number, z: number,
    width: number, height: number, depth: number, block = false) => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    object.position.set(x, y, z);
    object.receiveShadow = true;
    group.add(object);
    if (block) {
      physics.addBox({id: 'school-upper-' + index++, type: 'wall',
        minX: x - width / 2, maxX: x + width / 2, minY: y - height / 2, maxY: y + height / 2,
        minZ: z - depth / 2, maxZ: z + depth / 2});
      object.userData.cameraWall = height > 1.25;
    } else if (material === tiles) object.name = 'classroomFloor';
    return object;
  };
  for (const [x0,x1,z0,z1] of [
    [left, stairs.left, front, rear], [stairs.right, right, front, rear],
    [stairs.left, stairs.right, front, stairs.top], [stairs.left, stairs.right, stairs.bottom, rear],
  ]) add(tiles, (x0+x1)/2, floor-.09, (z0+z1)/2, x1-x0, .18, z1-z0);
  const rampLength = stairs.bottom - stairs.top;
  const rampX = (stairs.left + stairs.right)/2;
  const rampZ = (stairs.top + stairs.bottom)/2;
  const ramp = add(tiles, rampX, floor/2-.07, rampZ, stairs.right-stairs.left, .16, Math.hypot(rampLength,floor));
  ramp.rotation.x = Math.atan(floor / rampLength);
  // Rails close the sides of the stairwell while leaving both landings open.
  for (const x of [stairs.left, stairs.right]) {
    for (let i = 0; i < 8; i++) {
      const depth = rampLength/8;
      const z = stairs.bottom - depth*(i+.5);
      const height = (stairs.bottom-z)/rampLength*floor + .8;
      add(railing, x, height/2 + .05, z, .10, height, depth, true);
    }
  }
  for (const z of [front, rear]) add(railing, 0, floor+.44, z, right-left, .88, .19, true);
  for (const x of [left, right]) add(railing, x, floor+.44, -15, .19, .88, rear-front, true);
  // The central upstairs hall leads to the two rooms on the east side.
  for (const [z, depth] of [[-20.5,2.2],[-15.5,3.2],[-10.05,3.15]])
    add(walls, 1.2, floor+1.03, z, .15, 2.06, depth, true);
  add(walls, 4.19, floor+1.03, -15.35, 5.86, 2.06, .15, true);
  for (const z of [-19,-17,-13.3,-11.2]) {
    add(desks, 4.95, floor+.64, z, 2.3, .15, .69, true);
    for (const x of [4.01,5.9]) add(railing, x, floor+.29, z, .12, .58, .56, true);
  }
  // A compact platform lift serves the corridor and the upstairs study hall.
  for (const level of [0, floor]) {
    add(railing, lift.x, level+.025, lift.z, lift.size, .05, lift.size);
    add(walls, lift.x, level+1.12, lift.z+.86, lift.size, 2.24, .12, true);
    for (const x of [lift.x-.89,lift.x+.89]) add(walls,x,level+1.12,lift.z,.10,2.24,1.70,true);
    add(desks,lift.x+.68,level+1.08,lift.z-.9,.23,.28,.11);
  }
  const platform = add(railing,lift.x,.036,lift.z,lift.size-.16,.06,lift.size-.10);
  platform.name='schoolLiftPlatform';
  return group;
}
