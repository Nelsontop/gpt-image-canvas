import type { Hono } from "hono";
import { runReferenceImageGeneration, runTextToImageGeneration } from "../../domain/generation/image-generation.js";
import { createConfiguredImageProvider } from "../../domain/providers/image-provider-selection.js";
import { ProviderError, type EditImageProviderInput, type ImageProviderInput } from "../../infrastructure/providers/image-provider.js";
import { providerErrorJson } from "../http/errors.js";
import { readJson } from "../http/json.js";
import { parseEditPayload, parseGeneratePayload } from "../http/validation.js";

export function registerImageRoutes(app: Hono): void {
  app.post("/api/images/generate", async (c) => {
    const payload = await readJson(c.req.raw);
    if (!payload.ok) {
      console.warn("[image-request] mode=generate status=invalid-json");
      return c.json(payload.error, 400);
    }

    const parsed = parseGeneratePayload(payload.value);
    if (!parsed.ok) {
      console.warn("[image-request] mode=generate status=invalid-request");
      return c.json(parsed.error, 400);
    }
    logImageRequestReceived("generate", parsed.value);

    try {
      const provider = await createConfiguredImageProvider(c.req.raw.signal);
      const result = await runTextToImageGeneration(parsed.value, provider, c.req.raw.signal);
      logImageRequestCompleted("generate", result.record.id, result.record.outputs.length);
      return c.json(result);
    } catch (error) {
      if (error instanceof ProviderError) {
        logImageRequestFailure("generate", error);
        return providerErrorJson(c, error);
      }

      console.error("[image-request] mode=generate status=unexpected-error", error);
      throw error;
    }
  });

  app.post("/api/images/edit", async (c) => {
    const payload = await readJson(c.req.raw);
    if (!payload.ok) {
      console.warn("[image-request] mode=edit status=invalid-json");
      return c.json(payload.error, 400);
    }

    const parsed = parseEditPayload(payload.value);
    if (!parsed.ok) {
      console.warn("[image-request] mode=edit status=invalid-request");
      return c.json(parsed.error, 400);
    }
    logImageRequestReceived("edit", parsed.value);

    try {
      const provider = await createConfiguredImageProvider(c.req.raw.signal);
      const result = await runReferenceImageGeneration(parsed.value, provider, c.req.raw.signal);
      logImageRequestCompleted("edit", result.record.id, result.record.outputs.length);
      return c.json(result);
    } catch (error) {
      if (error instanceof ProviderError) {
        logImageRequestFailure("edit", error);
        return providerErrorJson(c, error);
      }

      console.error("[image-request] mode=edit status=unexpected-error", error);
      throw error;
    }
  });
}

function sanitizeLogValue(value: string): string {
  return value.replace(/[\r\n]/gu, " ").trim().slice(0, 160);
}

function logImageRequestReceived(mode: "generate" | "edit", input: ImageProviderInput | EditImageProviderInput): void {
  console.info(
    `[image-request] mode=${mode} status=received size=${input.size.width}x${input.size.height} count=${input.count} quality=${input.quality} format=${input.outputFormat} promptLength=${input.prompt.trim().length}`
  );
}

function logImageRequestCompleted(mode: "generate" | "edit", recordId: string, outputCount: number): void {
  console.info(`[image-request] mode=${mode} status=completed recordId=${sanitizeLogValue(recordId)} outputs=${outputCount}`);
}

function logImageRequestFailure(mode: "generate" | "edit", error: ProviderError): void {
  console.warn(
    `[image-request] mode=${mode} status=failed code=${error.code} http=${error.status} message=${sanitizeLogValue(error.message)}`
  );
}
