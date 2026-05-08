import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const dataDir = resolve(repoRoot, ".codex-temp", `image-route-logging-smoke-${process.pid}-${Date.now()}`);
process.env.DATA_DIR = dataDir;
process.env.SQLITE_JOURNAL_MODE = "DELETE";
process.env.SQLITE_LOCKING_MODE = "EXCLUSIVE";

mkdirSync(dataDir, { recursive: true });

async function main(): Promise<void> {
  try {
    const [{ Hono }, { registerImageRoutes }] = await Promise.all([import("hono"), import("../server/routes/images.js")]);
    const app = new Hono();
    registerImageRoutes(app);

    await expectWarning(
      async () =>
        app.request("/api/images/generate", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: "{\"prompt\":"
        }),
      400,
      "[image-request] mode=generate status=invalid-json"
    );

    await expectWarning(
      async () =>
        app.request("/api/images/edit", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({})
        }),
      400,
      "[image-request] mode=edit status=invalid-request"
    );

    console.log("image route logging smoke checks passed");
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
}

async function expectWarning(
  sendRequest: () => Promise<Response>,
  expectedStatus: number,
  expectedMessage: string
): Promise<void> {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(" "));
  };

  try {
    const response = await sendRequest();
    expect(response.status === expectedStatus, `expected response status ${expectedStatus}, received ${response.status}`);
  } finally {
    console.warn = originalWarn;
  }

  expect(
    warnings.some((warning) => warning.includes(expectedMessage)),
    `expected warning containing "${expectedMessage}", received ${warnings.join(" | ") || "<none>"}`
  );
}

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

await main();
