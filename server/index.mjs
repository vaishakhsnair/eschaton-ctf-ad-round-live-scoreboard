import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

dotenv.config({ path: path.resolve(path.dirname(__dirname), '.env.local') });
dotenv.config({ path: path.resolve(path.dirname(__dirname), '.env') });

const config = {
  bindHost: process.env.LIVE_SCORE_BIND_HOST || '0.0.0.0',
  port: Number(process.env.LIVE_SCORE_PORT || 3101),
  gameserverBaseUrl: (process.env.LIVE_SCORE_GAMESERVER_BASE_URL || 'http://10.66.30.100').replace(/\/+$/, ''),
  scoreboardPath: process.env.LIVE_SCORE_SCOREBOARD_PATH || '/competition/scoreboard.json',
  statusPath: process.env.LIVE_SCORE_STATUS_PATH || '/competition/status.json',
  pollIntervalMs: Number(process.env.LIVE_SCORE_POLL_INTERVAL_MS || 4000),
  requestTimeoutMs: Number(process.env.LIVE_SCORE_REQUEST_TIMEOUT_MS || 3000),
  maxEvents: Number(process.env.LIVE_SCORE_MAX_EVENTS || 40),
  corsOrigin: process.env.LIVE_SCORE_CORS_ORIGIN || '*',
  fallbackScoreboardFile:
    process.env.LIVE_SCORE_FALLBACK_SCOREBOARD_FILE || path.join(projectRoot, 'scoreboard.json'),
  fallbackStatusFile: process.env.LIVE_SCORE_FALLBACK_STATUS_FILE || path.join(projectRoot, 'status.json'),
};

function buildUrl(baseUrl, endpointPath) {
  if (endpointPath.startsWith('http://') || endpointPath.startsWith('https://')) {
    return endpointPath;
  }
  return `${baseUrl}${endpointPath.startsWith('/') ? '' : '/'}${endpointPath}`;
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeStatusDescriptions(rawStatusDescriptions) {
  const entries = Object.entries(rawStatusDescriptions || {});
  const mapped = {};
  for (const [key, value] of entries) {
    mapped[Number(key)] = String(value);
  }
  return mapped;
}

function statusClass(statusCode) {
  if (statusCode === 0) return 'up';
  if (statusCode === 4) return 'recovering';
  if (statusCode === -1) return 'unknown';
  return 'down';
}

function createEvent(type, message) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    message,
    timestamp: Date.now(),
  };
}

function buildLiveState(scoreboard, status, previousState) {
  const statusByTeamId = new Map((status?.teams || []).map((team) => [team.id, team]));
  const serviceNames = status?.services || [];
  const statusDescriptions = normalizeStatusDescriptions(
    scoreboard?.['status-descriptions'] || status?.['status-descriptions']
  );
  const previousTeams = new Map((previousState?.teams || []).map((team) => [team.id, team]));
  const events = [];

  const teams = (scoreboard?.teams || []).map((rawTeam, teamIndex) => {
    const statusTeam = statusByTeamId.get(rawTeam.id);
    const previousTeam = previousTeams.get(rawTeam.id);

    const services = (rawTeam.services || []).map((rawService, serviceIndex) => {
      const serviceName = serviceNames[serviceIndex] || `service-${serviceIndex + 1}`;
      const statusCode = Number(rawService.status ?? statusTeam?.ticks?.at(-1)?.[serviceIndex] ?? -1);

      const previousStatus = previousTeam?.services?.[serviceIndex]?.status;
      if (previousStatus !== undefined && previousStatus !== statusCode) {
        if (statusCode === 0) {
          events.push(
            createEvent(
              'service_up',
              `[${rawTeam.name}] ${serviceName} recovered (${statusDescriptions[statusCode] || statusCode})`
            )
          );
        } else {
          events.push(
            createEvent(
              'service_down',
              `[${rawTeam.name}] ${serviceName} changed ${statusDescriptions[previousStatus] || previousStatus} -> ${statusDescriptions[statusCode] || statusCode}`
            )
          );
        }
      }

      return {
        id: serviceIndex,
        name: serviceName,
        status: statusCode,
        offense: Number(rawService.offense || 0),
        defense: Number(rawService.defense || 0),
        sla: Number(rawService.sla || 0),
      };
    });

    const offense = Number(rawTeam.offense || 0);
    const defense = Number(rawTeam.defense || 0);
    const sla = Number(rawTeam.sla || 0);
    const total = Number(rawTeam.total || 0);

    const previousOffense = previousTeam?.offense || offense;
    const previousDefense = previousTeam?.defense || defense;
    const previousSla = previousTeam?.sla || sla;
    const lastTickChange = {
      offense: offense - previousOffense,
      defense: defense - previousDefense,
      sla: sla - previousSla,
    };

    if (lastTickChange.defense < 0) {
      events.push(
        createEvent('attack', `[${rawTeam.name}] defense dropped by ${Math.abs(lastTickChange.defense).toFixed(1)}`)
      );
    }
    if (lastTickChange.sla > 0) {
      events.push(createEvent('sla_up', `[${rawTeam.name}] SLA increased by ${lastTickChange.sla.toFixed(1)}`));
    }

    const previousRank = previousTeam?.rank;
    if (previousRank !== undefined && previousRank !== rawTeam.rank) {
      const direction = rawTeam.rank < previousRank ? 'up' : 'down';
      events.push(
        createEvent(
          'rank_change',
          `[${rawTeam.name}] rank moved ${direction}: ${previousRank} -> ${rawTeam.rank}`
        )
      );
    }

    return {
      id: rawTeam.id,
      rank: rawTeam.rank || teamIndex + 1,
      name: rawTeam.name,
      image: `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(rawTeam.name)}`,
      nop: Boolean(statusTeam?.nop),
      services,
      offense,
      defense,
      sla,
      total,
      lastTickChange,
    };
  });

  teams.sort((a, b) => a.rank - b.rank);

  const mergedEvents = [...events, ...(previousState?.events || [])]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, config.maxEvents);

  const summary = {
    up: 0,
    recovering: 0,
    down: 0,
    unknown: 0,
  };
  for (const team of teams) {
    for (const service of team.services) {
      summary[statusClass(service.status)] += 1;
    }
  }

  return {
    tick: Number(scoreboard?.tick || 0),
    teams,
    events: mergedEvents,
    statusDescriptions,
    services: serviceNames,
    summary,
  };
}

const pollState = {
  live: null,
  rawScoreboard: null,
  rawStatus: null,
  source: 'starting',
  lastSuccessAt: null,
  lastAttemptAt: null,
  lastError: null,
  failures: 0,
};

async function pollOnce() {
  pollState.lastAttemptAt = new Date().toISOString();

  const scoreboardUrl = buildUrl(config.gameserverBaseUrl, config.scoreboardPath);
  const statusUrl = buildUrl(config.gameserverBaseUrl, config.statusPath);

  try {
    const [rawScoreboard, rawStatus] = await Promise.all([
      fetchJson(scoreboardUrl, config.requestTimeoutMs),
      fetchJson(statusUrl, config.requestTimeoutMs),
    ]);

    pollState.rawScoreboard = rawScoreboard;
    pollState.rawStatus = rawStatus;
    pollState.live = buildLiveState(rawScoreboard, rawStatus, pollState.live);
    pollState.source = 'remote';
    pollState.lastSuccessAt = new Date().toISOString();
    pollState.lastError = null;
    pollState.failures = 0;
  } catch (error) {
    pollState.failures += 1;
    pollState.lastError = error instanceof Error ? error.message : String(error);

    if (!pollState.live) {
      try {
        const [fallbackScoreboard, fallbackStatus] = await Promise.all([
          readJsonFile(config.fallbackScoreboardFile),
          readJsonFile(config.fallbackStatusFile),
        ]);
        pollState.rawScoreboard = fallbackScoreboard;
        pollState.rawStatus = fallbackStatus;
        pollState.live = buildLiveState(fallbackScoreboard, fallbackStatus, pollState.live);
        pollState.source = 'fallback-file';
        pollState.lastSuccessAt = new Date().toISOString();
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        pollState.lastError = `${pollState.lastError}; fallback failed: ${fallbackMessage}`;
      }
      return;
    }

    if (pollState.source === 'remote') {
      pollState.source = 'remote-stale';
    }
  }
}

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', config.corsOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.get('/api/health', (_, res) => {
  res.json({
    ok: Boolean(pollState.live),
    source: pollState.source,
    lastSuccessAt: pollState.lastSuccessAt,
    lastAttemptAt: pollState.lastAttemptAt,
    failures: pollState.failures,
    lastError: pollState.lastError,
  });
});

app.get('/api/raw/scoreboard', (_, res) => {
  if (!pollState.rawScoreboard) {
    res.status(503).json({ error: 'No scoreboard snapshot yet' });
    return;
  }
  res.json(pollState.rawScoreboard);
});

app.get('/api/raw/status', (_, res) => {
  if (!pollState.rawStatus) {
    res.status(503).json({ error: 'No status snapshot yet' });
    return;
  }
  res.json(pollState.rawStatus);
});

app.get('/api/live', (_, res) => {
  if (!pollState.live) {
    res.status(503).json({
      error: 'No snapshot available yet',
      health: {
        source: pollState.source,
        lastSuccessAt: pollState.lastSuccessAt,
        lastAttemptAt: pollState.lastAttemptAt,
        failures: pollState.failures,
        lastError: pollState.lastError,
      },
    });
    return;
  }

  res.json({
    ...pollState.live,
    meta: {
      source: pollState.source,
      pollIntervalMs: config.pollIntervalMs,
      lastSuccessAt: pollState.lastSuccessAt,
      lastAttemptAt: pollState.lastAttemptAt,
      failures: pollState.failures,
      lastError: pollState.lastError,
      endpoints: {
        scoreboard: buildUrl(config.gameserverBaseUrl, config.scoreboardPath),
        status: buildUrl(config.gameserverBaseUrl, config.statusPath),
      },
    },
  });
});

app.listen(config.port, config.bindHost, async () => {
  console.log(
    `[live-score backend] listening on http://${config.bindHost}:${config.port} polling every ${config.pollIntervalMs}ms`
  );
  await pollOnce();
  setInterval(() => {
    void pollOnce().catch((error) => {
      pollState.lastError = error instanceof Error ? error.message : String(error);
    });
  }, config.pollIntervalMs);
});
