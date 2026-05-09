import assert from "node:assert/strict";
import test from "node:test";

const { createClientId, createClientUuid } = await import(new URL("./id.ts", import.meta.url).href);

function withMockCrypto<T>(value: Crypto | undefined, run: () => T): T {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value
  });

  try {
    return run();
  } finally {
    if (original) {
      Object.defineProperty(globalThis, "crypto", original);
    } else {
      Reflect.deleteProperty(globalThis, "crypto");
    }
  }
}

test("createClientUuid uses crypto.randomUUID when available", () => {
  const value = withMockCrypto(
    {
      randomUUID: () => "fixed-uuid"
    } as unknown as Crypto,
    () => createClientUuid()
  );

  assert.equal(value, "fixed-uuid");
});

test("createClientUuid falls back to getRandomValues when randomUUID is unavailable", () => {
  const value = withMockCrypto(
    {
      getRandomValues: (buffer: Uint8Array) => {
        buffer.set(Uint8Array.from({ length: buffer.length }, (_, index) => index));
        return buffer;
      }
    } as unknown as Crypto,
    () => createClientUuid()
  );

  assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("createClientId prefixes generated uuids", () => {
  const value = withMockCrypto(
    {
      randomUUID: () => "fixed-uuid"
    } as unknown as Crypto,
    () => createClientId("agent-message-")
  );

  assert.equal(value, "agent-message-fixed-uuid");
});
