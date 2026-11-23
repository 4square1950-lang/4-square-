export const IMAGE_LIMIT = 1000;
export const VIDEO_SECONDS_LIMIT = 100 * 60;

export function downloadMedia(data: Blob, name: string) {
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Record the selected frames into a fresh local clip without changing the original.
export async function exportClip(video: HTMLVideoElement, start: number, end: number) {
  if (end <= start || !video.videoWidth || typeof MediaRecorder === 'undefined') throw Error('Choose a valid clip range.');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx || !canvas.captureStream) throw Error('Clip export is unavailable on this browser.');
  video.pause();
  if (Math.abs(video.currentTime-start) > .015) {
    await new Promise<void>((resolve,reject)=>{
      video.addEventListener('seeked',()=>resolve(),{once:true});
      video.addEventListener('error',()=>reject(Error('Could not seek in the recording.')),{once:true});
      video.currentTime=start;
    });
  }
  const stream=canvas.captureStream(24);
  let frame=0;
  try {
    const recorder=new MediaRecorder(stream, {videoBitsPerSecond:2_000_000});
    const chunks:Blob[]=[];
    recorder.ondataavailable=({data})=>{if(data.size)chunks.push(data);};
    const complete=new Promise<Blob>((resolve,reject)=>{
      recorder.onstop=()=>resolve(new Blob(chunks,{type:recorder.mimeType}));
      recorder.onerror=()=>reject(Error('Clip recording failed.'));
    });
    recorder.start();
    const draw=()=>{
      ctx.drawImage(video,0,0,canvas.width,canvas.height);
      if (video.currentTime>=end || video.ended || video.paused) {
        video.pause();
        if(recorder.state==='recording') recorder.stop();
        return;
      }
      frame=requestAnimationFrame(draw);
    };
    await video.play();
    draw();
    return await complete;
  } finally {
    cancelAnimationFrame(frame);
    stream.getTracks().forEach((track)=>track.stop());
  }
}
