import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8787);
const API_KEY = "1cc69e78-85fb-4c1f-b36c-6b55e69c1865";
const USER_SECRET = "Wz5NRTA1GbSQw04oE7s8Ug1go18pse01yddl7VNSOLxyr9ltkMw3K3HFDLLI9g5lH3x823tyqvzTHUI3BG07hy7MFVbsR9uq6MK9327X9e2rVEN5iCZ3OsQ77ARtHB51";
const BASE_URL = "https://api.dataengine.chain.link";
const FEEDS = {
  "BTC/USDT": "0x00039d9e45394f473ab1f050a1b963e6b05351e52d71e507509ada0c95ed75b8",
  "ETH/USDT": "0x000362205e10b3a147d02792eccee483dca6c7b44ecce7012cb8c6e0b68b3ae9",
};
const SYMBOLS = {
  "BTC/USDT": "BTCUSDT",
  "ETH/USDT": "ETHUSDT",
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function send(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendJson(res, statusCode, payload) {
  send(res, statusCode, JSON.stringify(payload), "application/json; charset=utf-8");
}

function decodeChainlinkMid(fullReport) {
  const hex = fullReport.startsWith("0x") ? fullReport.slice(2) : fullReport;
  const bid = Number.parseInt(hex.slice(960, 1024), 16) / 1e18;
  const ask = Number.parseInt(hex.slice(1024, 1088), 16) / 1e18;
  return (bid + ask) / 2;
}

async function fetchChainlinkLatest(pair) {
  const feedId = FEEDS[pair];
  if (!feedId) {
    throw new Error(`Unknown pair: ${pair}`);
  }
  const pathQuery = `/api/v1/reports/latest?feedID=${feedId}`;
  const tsMs = `${Date.now()}`;
  const bodyHash = crypto.createHash("sha256").update("").digest("hex");
  const message = `GET ${pathQuery} ${bodyHash} ${API_KEY} ${tsMs}`;
  const signature = crypto.createHmac("sha256", USER_SECRET).update(message).digest("hex");
  const response = await fetch(`${BASE_URL}${pathQuery}`, {
    headers: {
      Authorization: API_KEY,
      "X-Authorization-Timestamp": tsMs,
      "X-Authorization-Signature-SHA256": signature,
    },
  });
  if (!response.ok) {
    throw new Error(`Chainlink ${response.status}`);
  }
  const payload = await response.json();
  return {
    pair,
    price: decodeChainlinkMid(payload.report.fullReport),
    observationTs: Number(payload.report.observationsTimestamp) * 1000,
  };
}

async function fetchBinanceLatest(pair) {
  const symbol = SYMBOLS[pair];
  if (!symbol) {
    throw new Error(`Unknown pair: ${pair}`);
  }
  const [spotResp, perpResp] = await Promise.all([
    fetch(`https://data-api.binance.vision/api/v3/ticker/bookTicker?symbol=${symbol}`),
    fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`),
  ]);
  if (!spotResp.ok) {
    throw new Error(`Spot ${spotResp.status}`);
  }
  if (!perpResp.ok) {
    throw new Error(`Perp ${perpResp.status}`);
  }
  const spot = await spotResp.json();
  const perp = await perpResp.json();
  const spotBid = Number(spot.bidPrice);
  const spotAsk = Number(spot.askPrice);
  return {
    pair,
    spot: Number.isFinite(spotBid) && Number.isFinite(spotAsk) ? (spotBid + spotAsk) / 2 : Number(spot.price),
    perp: Number(perp.markPrice),
    ts: Date.now(),
  };
}

function safePathFromUrl(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, "http://localhost").pathname);
  const relative = pathname === "/" ? "/index.html" : pathname;
  const resolved = path.resolve(ROOT, `.${relative}`);
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  try {
    const requestUrl = new URL(req.url || "/", "http://localhost");
    if (requestUrl.pathname === "/api/chainlink/latest") {
      const pair = requestUrl.searchParams.get("pair") || "";
      fetchChainlinkLatest(pair)
        .then((payload) => sendJson(res, 200, payload))
        .catch((error) => sendJson(res, 500, { error: error.message }));
      return;
    }
    if (requestUrl.pathname === "/api/binance/latest") {
      const pair = requestUrl.searchParams.get("pair") || "";
      fetchBinanceLatest(pair)
        .then((payload) => sendJson(res, 200, payload))
        .catch((error) => sendJson(res, 500, { error: error.message }));
      return;
    }

    const filePath = safePathFromUrl(req.url || "/");
    if (!filePath) {
      send(res, 403, "Forbidden");
      return;
    }

    fs.stat(filePath, (statErr, stats) => {
      if (statErr || !stats.isFile()) {
        send(res, 404, "Not found");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      const stream = fs.createReadStream(filePath);
      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      });
      stream.pipe(res);
      stream.on("error", () => {
        if (!res.headersSent) {
          send(res, 500, "Failed to read file");
        } else {
          res.destroy();
        }
      });
    });
  } catch (error) {
    send(res, 500, `Server error: ${error.message}`);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`3m dashboard listening on http://0.0.0.0:${PORT}`);
});
