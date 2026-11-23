async function replayDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('foursquare-replays', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('video');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeVideo(id: string, video?: Blob) {
  const db = await replayDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('video', 'readwrite');
      const store = transaction.objectStore('video');
      if (video) store.put(video, id);
      else store.delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

export const saveReplayVideo = (id: string, video: Blob) => writeVideo(id, video);
export const deleteReplayVideo = (id: string) => writeVideo(id);

export async function loadReplayVideo(id: string) {
  const db = await replayDatabase();
  try {
    return await new Promise<Blob | undefined>((resolve, reject) => {
      const request = db.transaction('video').objectStore('video').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
