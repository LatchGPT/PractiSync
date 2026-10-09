import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readExecutionProfile } from "./execution-profile.mjs";

const [command, ...args] = process.argv.slice(2);
if (!["dev", "build"].includes(command)) throw new Error("Expected dev or build.");
const managedLinux = readExecutionProfile() === "managed-linux";

if (managedLinux && command === "build") {
  const result = spawnSync("bash", [
    fileURLToPath(new URL("./build-verified.sh", import.meta.url)), ...args,
  ], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

// Import in this process so the preview owner retains its PID and signals.
const cli = new URL(managedLinux
  ? "../node_modules/vite/bin/vite.js"
  : "../node_modules/vinext/dist/cli.js", import.meta.url);
process.argv = [process.execPath, fileURLToPath(cli), command,
  ...(!managedLinux && command === "dev" ? ["--port", "5173"] : []), ...args];

if (command === "build") {
  const { existsSync, copyFileSync } = await import("node:fs");
  const path = (await import("node:path")).default;
  const projectRoot = fileURLToPath(new URL("../", import.meta.url));
  const devVars = path.join(projectRoot, ".dev.vars");
  const distVars = path.join(projectRoot, "dist/server/.dev.vars");
  process.on("exit", (code) => {
    if (code === 0 && existsSync(devVars) && existsSync(path.join(projectRoot, "dist/server"))) {
      copyFileSync(devVars, distVars);
    }
  });
}

await import(cli.href);
