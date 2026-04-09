interface Env {
  BUCKET: R2Bucket;
  KV: KVNamespace;
}

const CORS_ORIGIN = "https://paul13131313.github.io";
const ORDER_KEY = "wall:order";

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin === CORS_ORIGIN || origin === "http://localhost:3020";
  return {
    "Access-Control-Allow-Origin": allowed ? origin! : CORS_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

async function getOrder(kv: KVNamespace): Promise<string[]> {
  const raw = await kv.get(ORDER_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveOrder(kv: KVNamespace, order: string[]): Promise<void> {
  await kv.put(ORDER_KEY, JSON.stringify(order));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const origin = request.headers.get("Origin");

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // POST /upload — ファイルをR2に保存
    if (method === "POST" && path === "/upload") {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return jsonResponse({ error: "file is required" }, 400, origin);
      }

      const id = crypto.randomUUID();
      const contentType = file.type || "application/octet-stream";

      await env.BUCKET.put(id, file.stream(), {
        httpMetadata: { contentType },
        customMetadata: { originalName: file.name, mediaType: contentType },
      });

      // 順序配列の先頭に追加
      const order = await getOrder(env.KV);
      order.unshift(id);
      await saveOrder(env.KV, order);

      return jsonResponse({ id, contentType }, 201, origin);
    }

    // GET /videos — 順序配列とメタデータを返す
    if (method === "GET" && path === "/videos") {
      const order = await getOrder(env.KV);

      const videos = await Promise.all(
        order.map(async (id) => {
          const obj = await env.BUCKET.head(id);
          if (!obj) return null;
          const mediaType = obj.customMetadata?.mediaType || "video/mp4";
          return {
            id,
            type: mediaType.startsWith("image/") ? "image" : "video",
          };
        })
      );

      // R2に存在しないIDを除外
      const validVideos = videos.filter(Boolean);
      const validIds = validVideos.map((v) => v!.id);

      // 順序配列にゴミが残っていたら掃除
      if (validIds.length !== order.length) {
        await saveOrder(env.KV, validIds);
      }

      return jsonResponse({ order: validIds, videos: validVideos }, 200, origin);
    }

    // GET /video/:id — R2からファイルを返す
    const videoMatch = path.match(/^\/video\/([a-f0-9-]+)$/);
    if (method === "GET" && videoMatch) {
      const id = videoMatch[1];
      const obj = await env.BUCKET.get(id);
      if (!obj) {
        return jsonResponse({ error: "not found" }, 404, origin);
      }

      const headers = new Headers(corsHeaders(origin));
      headers.set("Content-Type", obj.httpMetadata?.contentType || "application/octet-stream");
      headers.set("Cache-Control", "public, max-age=31536000, immutable");

      return new Response(obj.body, { status: 200, headers });
    }

    // DELETE /video/:id — R2から削除 + 順序から除去
    const deleteMatch = path.match(/^\/video\/([a-f0-9-]+)$/);
    if (method === "DELETE" && deleteMatch) {
      const id = deleteMatch[1];
      await env.BUCKET.delete(id);

      const order = await getOrder(env.KV);
      await saveOrder(env.KV, order.filter((v) => v !== id));

      return jsonResponse({ ok: true }, 200, origin);
    }

    // PUT /order — 順序配列を更新
    if (method === "PUT" && path === "/order") {
      const body = await request.json<{ order: string[] }>();
      if (!Array.isArray(body.order)) {
        return jsonResponse({ error: "order must be an array" }, 400, origin);
      }
      await saveOrder(env.KV, body.order);
      return jsonResponse({ ok: true }, 200, origin);
    }

    return jsonResponse({ error: "not found" }, 404, origin);
  },
};
