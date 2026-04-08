const DB_NAME = "black-square";
const DB_VERSION = 1;
const STORE_NAME = "videos";
const ORDER_KEY = "wall:order";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** 動画Blobを保存してIDを返す */
export async function saveVideo(file: File): Promise<string> {
  const id = crypto.randomUUID();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(file, id);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

/** IDから動画BlobのObjectURLを生成 */
export async function getVideoURL(id: string): Promise<string> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) {
        resolve(URL.createObjectURL(request.result));
      } else {
        reject(new Error("動画が見つかりません"));
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/** 順序配列を保存 */
export async function saveOrder(order: string[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(order, ORDER_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 動画を削除（Blob + 順序配列から除去） */
export async function deleteVideo(id: string): Promise<void> {
  const db = await openDB();
  // Blobを削除
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  // 順序配列から除去
  const order = await getOrder();
  await saveOrder(order.filter((v) => v !== id));
}

/** メディアタイプを判定（video or image） */
export async function getMediaType(id: string): Promise<"video" | "image"> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => {
      const file = request.result as File | undefined;
      if (file && file.type && file.type.startsWith("image/")) {
        resolve("image");
      } else {
        resolve("video");
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/** 順序配列を取得 */
export async function getOrder(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(ORDER_KEY);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}
