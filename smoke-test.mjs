import { request } from "node:http";

process.env.PORT = process.env.SMOKE_PORT || "4175";

await import("./server.mjs");

const body = JSON.stringify({
  seed: process.env.SMOKE_SEED || "RevenueCat Shipaton hackathon",
  skills: "JavaScript and UI development",
  timeframe: 48,
  goal: "Best overall chance of winning",
});

const result = await new Promise((resolve, reject) => {
  const outgoing = request({
    hostname: "127.0.0.1",
    port: Number(process.env.PORT),
    path: "/api/research",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  }, response => {
    let responseBody = "";
    response.setEncoding("utf8");
    response.on("data", chunk => { responseBody += chunk; });
    response.on("end", () => resolve({ status: response.statusCode || 0, body: responseBody }));
  });
  outgoing.on("error", reject);
  outgoing.end(body);
});

console.log(`SMOKE_STATUS=${result.status}`);
let payload;
try { payload = JSON.parse(result.body); } catch { payload = null; }
if (result.status >= 200 && result.status < 300 && payload?.result) {
  if (!payload.result.hackathon?.name || !payload.result.recommendation?.name || !Array.isArray(payload.sources)) {
    console.error("Smoke response is missing required dossier fields");
    process.exit(1);
  }
  console.log(`PROVIDER=${payload.provider}/${payload.model}`);
  console.log(`CACHE=${payload.cached ? "hit" : "miss"}`);
  console.log(`HACKATHON=${payload.result.hackathon.name}`);
  console.log(`RECOMMENDATION=${payload.result.recommendation.name}`);
  console.log(`SOURCES=${payload.sources.length}`);
  process.exit(0);
}
console.error(result.body);
process.exit(1);
