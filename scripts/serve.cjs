#!/usr/bin/env node
// serve.cjs — Starts the production server and keeps it alive.
// Runs in the background and auto-restarts on crash.
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
const LOG = path.join(ROOT, "dev.log");

let child = null;
let restarts = 0;
const MAX = 50;

function start() {
  if (restarts >= MAX) { process.exit(0); }
  restarts++;
  
  // Clear log on first start
  if (restarts === 1) { try { fs.writeFileSync(LOG, ""); } catch {} }

  child = spawn("npx", ["next", "start", "-p", "3000"], {
    cwd: ROOT,
    env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=1024" },
    stdio: ["ignore", fs.openSync(LOG, "a"), fs.openSync(LOG, "a")],
    detached: true,
  });
  child.unref(); // Let parent exit independently
  child.on("exit", () => { setTimeout(start, 2000); });
}

start();
// Immediately exit — child runs independently via detached+unref
process.exit(0);
