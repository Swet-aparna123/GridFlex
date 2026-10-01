import { createServer } from 'node:http';
import { CONFIG } from '../src/engine/config.js';
import { SCENARIOS, solveGridFlex } from '../src/engine/gridflexEngine.js';

const port = Number(process.env.GRIDFLEX_API_PORT || 4174);
const maxRequestBytes = 16 * 1024;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > maxRequestBytes) {
        reject(Object.assign(new Error('Request body exceeds 16 KB.'), { statusCode: 413 }));
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error('Request body must be valid JSON.'), { statusCode: 400 }));
      }
    });
    request.on('error', reject);
  });
}

function validateRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw Object.assign(new Error('Request body must be a JSON object.'), { statusCode: 400 });
  }

  const scenarioId = payload.scenarioId ?? 'evening_peak';
  const batteryEnabled = payload.batteryEnabled ?? CONFIG.battery.enabled;
  const participationRate = payload.participationRate ?? CONFIG.participation.defaultRate * 100;
  const batteryInitialSoC = payload.batteryInitialSoC ?? CONFIG.battery.initialSoc * 100;

  if (!SCENARIOS[scenarioId]) {
    throw Object.assign(new Error('scenarioId must be a supported GridFlex scenario.'), { statusCode: 400 });
  }
  if (typeof batteryEnabled !== 'boolean') {
    throw Object.assign(new Error('batteryEnabled must be a boolean.'), { statusCode: 400 });
  }
  if (!Number.isFinite(participationRate) || participationRate < 0 || participationRate > 100) {
    throw Object.assign(new Error('participationRate must be between 0 and 100.'), { statusCode: 400 });
  }
  if (!Number.isFinite(batteryInitialSoC) || batteryInitialSoC < 20 || batteryInitialSoC > 95) {
    throw Object.assign(new Error('batteryInitialSoC must be between 20 and 95.'), { statusCode: 400 });
  }

  return { scenarioId, batteryEnabled, participationRate, batteryInitialSoC, feederCapacityMW: CONFIG.feeder.limitKw / 1000 };
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  if (request.method === 'GET' && pathname === '/api/health') {
    sendJson(response, 200, { status: 'ok', service: 'gridflex-local-engine' });
    return;
  }

  if (request.method !== 'POST' || pathname !== '/api/solve') {
    sendJson(response, 404, { error: 'Route not found.' });
    return;
  }

  try {
    const input = validateRequest(await readJson(request));
    const result = solveGridFlex(input);
    sendJson(response, 200, {
      ...result,
      engine: {
        name: 'GridFlex Local Decision Engine',
        version: '1.0.0',
        solvedAt: new Date().toISOString(),
        dataMode: 'synthetic simulation',
      },
    });
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message || 'GridFlex solve failed.' });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`GridFlex API listening on http://127.0.0.1:${port}`);
});
