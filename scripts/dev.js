import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const serverEnvPath = path.join(root, "server", ".env");
let serverEnv = "";

try {
  serverEnv = readFileSync(serverEnvPath, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const configuredPort = serverEnv.match(/^\s*PORT\s*=\s*['"]?(\d+)/m)?.[1];
const apiPort = process.env.PORT || configuredPort || "5000";
const apiHealthUrl = `http://localhost:${apiPort}/api/health`;
const children = new Set();
let shuttingDown = false;

function stop(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = exitCode;
  for (const child of children) child.kill("SIGINT");
}

function start(args, env = process.env) {
  const child = spawn(npmCommand, args, {
    cwd: root,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  children.add(child);
  child.once("error", (error) => {
    console.error(`Could not start ${args.join(" ")}:`, error.message);
    stop(1);
  });
  child.once("exit", (code) => {
    children.delete(child);
    if (!shuttingDown) stop(code ?? 1);
  });
  return child;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForApi() {
  const deadline = Date.now() + 120_000;
  console.log(`Waiting for API health at ${apiHealthUrl} before starting the client...`);

  while (!shuttingDown && Date.now() < deadline) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    try {
      const response = await fetch(apiHealthUrl, { signal: controller.signal });
      if (response.ok) return;
    } catch {
      // The API is expected to refuse connections until MongoDB is ready.
    } finally {
      clearTimeout(timeout);
    }
    await delay(500);
  }

  if (!shuttingDown) {
    console.error(`API did not become healthy within 120 seconds: ${apiHealthUrl}`);
    stop(1);
  }
}

process.on("SIGINT", () => stop(130));
process.on("SIGTERM", () => stop(143));

start(["run", "dev", "-w", "server"], {
  ...process.env,
  PORT: String(apiPort),
});

await waitForApi();

if (!shuttingDown) {
  console.log("API is ready; starting the client.");
  start(["run", "dev", "-w", "client"], {
    ...process.env,
    PORT: String(apiPort),
  });
}
