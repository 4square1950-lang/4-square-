import * as THREE from 'three';
import { buildCharacterMesh } from './characterModelBuilder';
import { CHARACTERS, DEFAULT_CUSTOMIZATION } from './characters';
import { CAMPUS_CAFE, CAMPUS_CAFETERIA } from './campusLayout';
import { SCHOOL_BOOKS } from './schoolBooks';

export interface RoomFixture { x: number; z: number; width: number; depth: number; height: number }
export const CLASS_TEACHER = { x: -11.8, z: -10.4 };
export const CLASS_SEATS = [-13.6, -17.4].flatMap((z) => [-12.2, -15.8, -19.4].map((x) => ({ x, z })));
export const EAST_OPENING = { start: -17.7, end: -12.4 };
export const STUDY_SEAT = { x:-10.35,z:-19.5 };
export const LIBRARY_READ_SPOT = { x:15.2,z:-13.6 };

export function poseCampusStudent(student:THREE.Object3D, elapsed:number, index=0) {
  const phase = elapsed*(index%2 ? 3.3 : 2.3)+index*1.6;
  const writing = Math.sin(phase);
  for (const side of ['left','right']) {
    const thigh = student.getObjectByName(side+'Leg'), shin = student.getObjectByName(side+'Shin');
    const upper = student.getObjectByName(side+'Arm'), forearm = student.getObjectByName(side+'Forearm');
    if (thigh && shin) { thigh.rotation.x=-1.5;shin.rotation.x=1.5; }
    if (upper && forearm) {
      upper.rotation.x=-1.63+(side==='right' ? writing*.075 : 0);
      forearm.rotation.x=-.12+(side==='right' ? writing*.07 : 0);
      upper.rotation.y=side==='right' ? -.12+writing*.05 : .12;
    }
  }
  const head=student.getObjectByName('headMesh');
  if (head) { head.rotation.x=.21+Math.sin(elapsed*.75+index)*.16;head.rotation.y=Math.sin(phase*.35)*.06; }
}

export function buildCampusTeacher() {
  const coach = CHARACTERS.find(({id}) => id === 'char-ref-leo') ?? CHARACTERS[0];
  const teacher = buildCharacterMesh(coach, {
    ...DEFAULT_CUSTOMIZATION, hairColor: '#b4b1aa', shirtColor: '#344a55',
    pantsColor: '#343834', shoeColor: '#292622',
  });
  teacher.userData.isTeacher = true;
  teacher.scale.setScalar(1.17);
  const head = teacher.getObjectByName('headMesh');
  if (head) {
    const frame = new THREE.MeshStandardMaterial({ color: '#443a31', roughness: .43 });
    for (const x of [-.092, .092]) {
      const lens = new THREE.Mesh(new THREE.TorusGeometry(.063,.009,8,24), frame);
      lens.position.set(x,.025,.244);
      lens.scale.y = .79;
      head.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(.066,.012,.018),frame);
    bridge.position.set(0,.027,.242);
    head.add(bridge);
  }
  return teacher;
}

export function buildCampusRooms() {
  const group = new THREE.Group();
  group.name = 'campusRooms';
  const fixtures: RoomFixture[] = [];
  const mat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
  const timber = mat(0x6e5340), wall = mat(0xb6ac97), tile = mat(0x7c817d), metal = mat(0x384540), glass = mat(0x536a70);
  const mesh = (m: THREE.Material, x: number, y: number, z: number, width: number, height: number, depth: number) => {
    const item = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), m);
    item.position.set(x, y, z);
    item.receiveShadow = true;
    group.add(item);
    return item;
  };
  const fixture = (m: THREE.Material, x: number, z: number, width: number, height: number, depth: number) => {
    const item = mesh(m,x,height/2,z,width,height,depth);
    fixtures.push({x,z,width,depth,height});
    return item;
  };
  const floor = (x: number, z: number, width: number, depth: number, m: THREE.Material) => {
    const item = mesh(m,x,0.011,z,width,0.045,depth);
    item.name = 'classroomFloor';
  };
  const label = (value: string, x: number, y: number, z: number, rotation = 0, width=4.5, height=.96) => {
    const board = document.createElement('canvas');
    board.width = 448; board.height = 96;
    const ctx = board.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#263936'; ctx.fillRect(0,0,448,96);
    ctx.fillStyle = '#f0e8ce'; ctx.font = '600 42px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(value,224,63,412);
    const texture = new THREE.CanvasTexture(board); texture.colorSpace = THREE.SRGBColorSpace;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture }));
    plate.position.set(x,y,z); plate.rotation.y = rotation; group.add(plate);
  };
  const paper=mat(0xe5dbc5), pencil=mat(0xd4a050);
  const desk = (x: number, z: number, height=.91) => {
    const top=mesh(timber,x,height-.06,z,1.55,.12,.83);
    for (const dx of [-.65,.65]) mesh(metal,x+dx,(height-.12)/2,z,.08,height-.12,.63);
    fixtures.push({x,z,width:1.55,depth:.83,height});
    mesh(paper,x+.16,height+.014,z-.13,.46,.023,.32);
    return top;
  };
  const chair = (x:number,z:number) => {
    fixtures.push({x,z,width:.65,depth:.56,height:.82});
    mesh(timber,x,.31,z,.65,.075,.55);
    mesh(timber,x,.55,z-.265,.65,.46,.06);
    for (const dx of [-.25,.25]) for (const dz of [-.2,.2]) mesh(metal,x+dx,.14,z+dz,.041,.28,.041);
  };

  floor(-16.6,-15,17.1,13.2,timber);
  label('Room 101 · Court tactics',-16,3.55,-8.53,Math.PI,8,.65);
  mesh(metal,-16,2.02,-8.55,9.5,2.4,.13);
  label('Square 1 serves diagonally to Square 4',-14.36,2.68,-8.63,Math.PI,5.3,.55);
  label('Let the ball bounce once before returning',-14.36,1.95,-8.63,Math.PI,5.1,.55);
  const chalk = mat(0xe3dcc0);
  for (const x of [-19.9,-19.1,-18.3]) mesh(chalk,x,2.04,-8.63,.023,1.6,.018);
  for (const y of [1.24,2.04,2.84]) mesh(chalk,-19.1,y,-8.63,1.6,.023,.018);
  mesh(tile,-16,.83,-8.6,9.5,.09,.26);
  desk(STUDY_SEAT.x,STUDY_SEAT.z+.81,.69).userData.studyDesk=true;
  chair(STUDY_SEAT.x,STUDY_SEAT.z);
  for (const [index, { x, z }] of CLASS_SEATS.entries()) {
    desk(x,z+.40,.66);
    const student = buildCharacterMesh(CHARACTERS[index]);
    student.userData.character = CHARACTERS[index];
    student.position.set(x,-.035,z-.20);
    student.rotation.y = 0;
    student.userData.studyIndex=index;
    poseCampusStudent(student,0,index);
    const grip=student.getObjectByName('strikeHand');
    if (grip) {
      const pen=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.12,7),pencil);
      pen.position.set(.014,0,.064);pen.rotation.z=-.62;grip.add(pen);
    }
    chair(x,z-.2);
    group.add(student);
    fixtures.push({ x, z: z-.4, width: .85, depth: .75, height: 1.6 });
  }
  const teacher = buildCampusTeacher();
  teacher.position.set(CLASS_TEACHER.x,0,CLASS_TEACHER.z);
  teacher.name = 'campusTeacher'; teacher.rotation.y = Math.PI;
  teacher.userData.isTeacher = true; group.add(teacher);
  fixtures.push({ ...CLASS_TEACHER, width: .88, depth: .88, height: 1.65 });

  // The library opens directly off the opposite side of the hallway.
  floor(16.65,-15,17.2,13.2,tile);
  label('Library',7.1,3.02,-15.0,-Math.PI/2);
  const covers=SCHOOL_BOOKS.map((book)=>mat(book.color));
  const spineLabels = SCHOOL_BOOKS.map((book) => {
    const canvas=document.createElement('canvas');
    canvas.width=256;canvas.height=72;
    const ctx=canvas.getContext('2d');
    if (!ctx) return paper;
    ctx.fillStyle='#e0d0ab';ctx.fillRect(0,0,256,72);
    ctx.fillStyle='#312b21';ctx.textAlign='center';ctx.font='bold 24px Georgia';
    ctx.fillText(book.title,128,44,227);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({map,roughness:.9});
  });
  for (const z of [-19.2,-13.6,-10.8]) {
    fixture(timber,17.05,z,0.68,2.8,2.1);
    for(const y of [.5,1.18,1.87,2.58]) {
      mesh(timber,16.63,y,z,.38,.10,2.12);
      for(let i=0;i<7;i++) {
        const depth=.15+(i%3)*.022,height=.29+(i%4)*.035, bookZ=z-.86+i*.25;
        const body=mesh(covers[i%3],16.50,y+height/2+.06,bookZ,.30,height,depth);
        body.userData.bookIndex=i%3;
        mesh(paper,16.60,y+height+.063,bookZ,.23,.012,depth*.78).userData.bookIndex=i%3;
        const title=new THREE.Mesh(new THREE.PlaneGeometry(height*.76,depth*.72),spineLabels[i%3]);
        title.position.set(16.344,y+height/2+.06,bookZ);
        title.rotation.y=-Math.PI/2;title.rotation.z=Math.PI/2;
        title.userData.bookIndex=i%3;group.add(title);
        for (const band of [.08,.15]) mesh(paper,16.345,y+band,bookZ,.014,.012,depth*.8).userData.bookIndex=i%3;
      }
    }
  }
  for(const z of [-18.3,-12.2]) desk(12.9,z);
  fixture(wall,18,-19.65,.21,3.1,3.865);
  fixture(wall,18,-10.32,.21,3.1,3.865);
  mesh(wall,18,2.95,-15,.21,.3,5.45);
  label('Science lab',18.13,2.7,-16,Math.PI/2);
  for(const z of [-18.7,-11.8]) {
    fixture(metal,22.5,z,2.55,.96,1.25);
    mesh(glass,22.15,1.17,z,.2,.42,.2);
    mesh(tile,23.15,1.075,z,.37,.23,.37);
  }

  fixture(wall,-21.3,-19.6,.22,3,4.25);
  fixture(wall,-21.3,-10.2,.22,3,3.6);
  mesh(wall,-21.3,2.95,-14.75,.22,.3,5.15);
  label('Room 102 · Art',-21.18,2.65,-14.75,Math.PI/2);
  for (const z of [-19.1,-11.8]) {
    desk(-23.75,z);
    mesh(glass,-23.9,.95,z,.38,.09,.52);
  }
  fixture(metal,-25.05,-14.9,.68,1.55,2.8);

  for (const { x, z, width, depth, name } of [
    { ...CAMPUS_CAFE, name: 'Campus café' },
    { ...CAMPUS_CAFETERIA, name: 'Dining hall' },
  ]) {
    floor(x,z,width,depth,tile);
    const panel = (width - 2.6) / 2;
    for (const direction of [-1,1]) {
      fixture(wall,x+direction*width/2,z,.28,3.25,depth);
      fixture(wall,x+direction*(panel/2+1.3),z+depth/2,panel,3.25,.28);
      mesh(glass,x+direction*(panel/2+1.3),1.52,z+depth/2+.16,2.4,1.3,.08);
    }
    fixture(wall,x,z-depth/2,width,3.25,.28);
    mesh(metal,x,3.36,z,width+.38,.22,depth+.4);
    label(name,x,2.86,z+depth/2+.17);
    fixture(timber,x,z-depth/2+1,width*.6,1.05,.85);
    for (const dx of [-width*.27,width*.27]) {
      desk(x+dx,z+.52);
      mesh(timber,x+dx,.34,z+1.55,1.45,.12,.38);
    }
  }
  return { group, fixtures };
}

export function animateCampusTeacher(teacher: THREE.Object3D | undefined, elapsed: number) {
  const arm = teacher?.getObjectByName('rightArm');
  if (arm) {
    const gesture = (Math.sin(elapsed * 1.75) + 1) * 0.5;
    arm.rotation.x = -0.36 - gesture * 0.85;
    arm.rotation.z = -gesture * 0.34;
  }
  const head = teacher?.getObjectByName('headMesh');
  if (head) head.rotation.y = Math.sin(elapsed * 0.9) * 0.23;
}
