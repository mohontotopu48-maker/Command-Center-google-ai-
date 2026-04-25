#!/usr/bin/env node
// keepalive.cjs — Ensures the Next.js server stays running.
// Restarts automatically if the process dies (sandbox OOM, crash, etc).
// Usage: node scripts/keepalive.cjs

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const LOG = path.join(ROOT, "dev.log");
const MAX_RESTARTS = 20;
const COOLDOWN_MS = 2000;

let restartCount = 0;
let child = null;
let cooldown = false;

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  const line = `[${ts}] ${msg}\n`;
  process.stdout.write(line);
  try { fs.appendFileSync(LOG, line); } catch {}
}

function startServer() {
  if (restartCount >= MAX_RESTARTS) {
    log(`Max restarts (${MAX_RESTARTS}) reached. Stopping.`);
    process.exit(1);
  }

  restartCount++;
  log(`Starting server (attempt ${restartCount}/${MAX_RESTARTS})...`);

  // Clear old log on first start
  if (restartCount === 1) {
    try { fs.writeFileSync(LOG, ""); } catch {}
  }

  const env = { ...process.env, NODE_OPTIONS: "--max-old-space-size=1536" };

  child = spawn("npx", ["next", "start", "-p", "3000"], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  child.stdout.on("data", (data) => {
    const str = data.toString().trim();
    if (str) {
      process.stdout.write(str + "\n");
      try { fs.appendFileSync(LOG, str + "\n"); } catch {}
    }
  });

  child.stderr.on("data", (data) => {
    const str = data.toString().trim();
    if (str) {
      process.stderr.write(str + "\n");
      try { fs.appendFileSync(LOG, "[STDERR] " + str + "\n"); } catch {}
    }
  });

  child.on("exit", (code, signal) => {
    const reason = code ? `exit code ${code}` : `signal ${signal}`;
    log(`Server died: ${reason}`);

    if (cooldown) return;
    cooldown = true;
    setTimeout(() => {
      cooldown = false;
      startServer();
    }, COOLDOWN_MS);
  });
}

// Graceful shutdown
process.on("SIGINT", () => {
  log("Received SIGINT, shutting down...");
  if (child) child.kill("SIGTERM");
  setTimeout(() => process.exit(0), 1000);
});

process.on("SIGTERM", () => {
  log("Received SIGTERM, shutting down...");
  if (child) child.kill("SIGTERM");
  setTimeout(() => process.exit(0), 1000);
});

log("=== VBOS Keepalive Starting ===");
startServer();
