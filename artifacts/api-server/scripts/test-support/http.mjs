export function createApiClient(baseUrl = process.env.BEHAVIORAL_API_URL ?? "http://127.0.0.1:8080") {
  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { accept: "application/json", ...(options.body ? { "content-type": "application/json" } : {}), ...(options.headers ?? {}) },
    });
    const text = await response.text();
    let body;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!response.ok) throw new Error(`${options.method ?? "GET"} ${path} returned HTTP ${response.status}: ${text.slice(0, 300)}`);
    return body;
  }
  return {
    baseUrl,
    get: (path) => request(path),
    post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  };
}

export async function captureEventDelta(api, run) {
  const before = await api.get("/api/events");
  const result = await run();
  const after = await api.get("/api/events");
  const beforeIds = new Set(before.map((event) => event.id));
  return { result, events: after.filter((event) => !beforeIds.has(event.id)), beforeCount: before.length, afterCount: after.length };
}
