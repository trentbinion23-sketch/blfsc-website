/**
 * Cross-platform GitHub login without relying on PowerShell or PATH.
 * Opens the browser (-w) instead of device-code flow.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

function resolveGh() {
  const pf = process.env.PROGRAMFILES;
  const pfx86 = process.env["PROGRAMFILES(X86)"] || process.env.ProgramFilesX86;
  const candidates = [
    pf && path.join(pf, "GitHub CLI", "gh.exe"),
    pfx86 && path.join(pfx86, "GitHub CLI", "gh.exe"),
  ].filter(Boolean);
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  try {
    const which = spawnSync(process.platform === "win32" ? "where.exe" : "which", ["gh"], {
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    if (which.status === 0 && which.stdout?.trim()) {
      const first = which.stdout.trim().split(/\r?\n/)[0];
      if (first && existsSync(first)) return first;
    }
  } catch {
    /* ignore */
  }
  return null;
}

const gh = resolveGh();
if (!gh) {
  console.error("");
  console.error("GitHub CLI (gh.exe) not found.");
  console.error("Install:  winget install GitHub.cli");
  console.error("Then run:  npm run git:login");
  console.error("");
  process.exit(1);
}

console.log("");
console.log(`Using: ${gh}`);
console.log("Your browser should open to sign in to GitHub.");
console.log("");

const result = spawnSync(gh, ["auth", "login", "-h", "github.com", "-p", "https", "-w"], {
  stdio: "inherit",
});

process.exit(result.status === null ? 1 : result.status);
