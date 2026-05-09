import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const DEFAULT_URL = "http://127.0.0.1:5173";
const DEFAULT_OUTPUT = ".codex-temp/browser/screenshot.png";
const DEFAULT_WIDTH = 1440;
const DEFAULT_HEIGHT = 960;
const DEFAULT_TIMEOUT_MS = 30_000;

function readArg(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return fallback;
  }

  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }

  return value;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function numberArg(flag, fallback) {
  const raw = readArg(flag, String(fallback));
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid numeric value for ${flag}: ${raw}`);
  }
  return value;
}

async function main() {
  const url = readArg("--url", DEFAULT_URL);
  const outputPath = path.resolve(readArg("--out", DEFAULT_OUTPUT));
  const width = numberArg("--width", DEFAULT_WIDTH);
  const height = numberArg("--height", DEFAULT_HEIGHT);
  const timeout = numberArg("--timeout", DEFAULT_TIMEOUT_MS);
  const waitFor = readArg("--wait-for", "");
  const delay = numberArg("--delay", 0);
  const fullPage = hasFlag("--full-page");
  const dark = hasFlag("--dark");

  await mkdir(path.dirname(outputPath), { recursive: true });

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      colorScheme: dark ? "dark" : "light",
      viewport: { width, height }
    });

    page.setDefaultTimeout(timeout);
    await page.goto(url, { waitUntil: "networkidle", timeout });

    if (waitFor) {
      await page.waitForSelector(waitFor, { state: "visible", timeout });
    }

    if (delay > 0) {
      await page.waitForTimeout(delay);
    }

    await page.screenshot({
      fullPage,
      path: outputPath
    });

    console.log(outputPath);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
