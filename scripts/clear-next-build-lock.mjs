/**
 * Removes `.next/lock` so `next build` can start after a crashed or killed build (common on Windows).
 */
import { unlinkSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(rootDir, ".next", "lock");

if (existsSync(lockPath)) {
  try {
    unlinkSync(lockPath);
    console.log("clear-next-build-lock: removed stale .next/lock");
  } catch (error) {
    console.warn("clear-next-build-lock: could not remove lock:", error);
  }
}
