const API_BASE = "https://black-square-api.hiroshinagano0113.workers.dev";

/** 動画ファイルをR2にアップロードしてIDを返す */
export async function saveVideo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("アップロードに失敗しました");
  }

  const data = await res.json();
  return data.id;
}

/** IDから動画のURLを返す（Worker経由のR2 URL） */
export async function getVideoURL(id: string): Promise<string> {
  return `${API_BASE}/video/${id}`;
}

/** 順序配列を保存 */
export async function saveOrder(order: string[]): Promise<void> {
  const res = await fetch(`${API_BASE}/order`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order }),
  });

  if (!res.ok) {
    throw new Error("順序の保存に失敗しました");
  }
}

/** 動画を削除 */
export async function deleteVideo(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/video/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("削除に失敗しました");
  }
}

/** メディアタイプを判定（video or image） */
export async function getMediaType(_id: string): Promise<"video" | "image"> {
  return mediaTypeCache.get(_id) || "video";
}

/** 順序配列とメディア情報を取得 */
export async function getOrder(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/videos`);

  if (!res.ok) {
    throw new Error("データの取得に失敗しました");
  }

  const data = await res.json();
  // メディアタイプ情報をキャッシュに保存
  if (data.videos) {
    mediaTypeCache.clear();
    for (const v of data.videos) {
      mediaTypeCache.set(v.id, v.type);
    }
  }
  return data.order;
}

// メディアタイプのキャッシュ（getOrderで一括取得した情報を保持）
const mediaTypeCache = new Map<string, "video" | "image">();

/** キャッシュからメディアタイプを取得 */
export function getMediaTypeCached(id: string): "video" | "image" {
  return mediaTypeCache.get(id) || "video";
}
