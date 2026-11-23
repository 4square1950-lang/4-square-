import * as THREE from 'three';
import { BALLS, STARTER_BALL, type BallLook } from '../services/ballCatalog';

export function courtBallMaterial(look?: BallLook) {
  const ball = BALLS.find(({ id }) => id === look?.id) ?? STARTER_BALL;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.MeshStandardMaterial({ color: look?.color ?? ball.color });
  ctx.fillStyle = '#eeeeee';
  ctx.fillRect(0,0,512,256);
  for (let y=0;y<256;y+=8) for (let x=0;x<512;x+=8) {
    ctx.fillStyle = (x/8+y/8)%2 ? '#b4b4b4' : '#d5d5d5';
    if (ball.pattern === 'dimples') {
      ctx.beginPath(); ctx.arc(x+4,y+4,2,0,Math.PI*2); ctx.fill();
    } else if (ball.pattern === 'ribs') ctx.fillRect(x,y+3,7,1.6);
    else if (ball.pattern === 'tiles') ctx.fillRect(x+1,y+1,5,5);
    else {
      ctx.strokeStyle=ctx.fillStyle; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x,y+2); ctx.lineTo(x+8,y+6); ctx.stroke();
    }
  }
  const bumpMap = new THREE.CanvasTexture(canvas);
  bumpMap.anisotropy = 4;
  const finish=document.createElement('canvas');
  finish.width=512;finish.height=256;
  const paint=finish.getContext('2d');
  if (!paint) return new THREE.MeshStandardMaterial({color:look?.color ?? ball.color,bumpMap,bumpScale:.022,roughness:.58});
  paint.fillStyle=look?.color ?? ball.color;
  paint.fillRect(0,0,512,256);
  paint.strokeStyle=ball.trim;paint.fillStyle=ball.trim;
  if(ball.pattern==='panels' || ball.pattern==='diagonal') {
    paint.lineWidth=ball.pattern==='panels'?16:5;
    paint.globalAlpha=ball.pattern==='panels'?.68:.46;
    for (let offset=-256;offset<768;offset+=128) {
      paint.beginPath();paint.moveTo(offset,0);paint.lineTo(offset+192,256);paint.stroke();
    }
  } else if(ball.id==='franklin-mystic') {
    paint.globalAlpha=.77;
    for(let y=90;y<256;y+=14) for(let x=0;x<512;x+=22) {
      paint.beginPath();paint.arc(x+(y%28?9:0),y,1+(y-90)/28,0,Math.PI*2);paint.fill();
    }
  }
  const map=new THREE.CanvasTexture(finish);
  map.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map,bumpMap,bumpScale:.022,roughness:.58});
}
