const UUID_BYTE_LENGTH = 16;
const UUID_VERSION_INDEX = 6;
const UUID_VARIANT_INDEX = 8;
const UUID_VERSION_MASK = 0x0f;
const UUID_VERSION_VALUE = 0x40;
const UUID_VARIANT_MASK = 0x3f;
const UUID_VARIANT_VALUE = 0x80;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function uuidFromRandomValues(cryptoObject: Crypto): string {
  const bytes = new Uint8Array(UUID_BYTE_LENGTH);
  cryptoObject.getRandomValues(bytes);
  bytes[UUID_VERSION_INDEX] = (bytes[UUID_VERSION_INDEX] & UUID_VERSION_MASK) | UUID_VERSION_VALUE;
  bytes[UUID_VARIANT_INDEX] = (bytes[UUID_VARIANT_INDEX] & UUID_VARIANT_MASK) | UUID_VARIANT_VALUE;

  const hex = bytesToHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function insecureUuidFallback(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createClientUuid(): string {
  const cryptoObject = globalThis.crypto;
  if (typeof cryptoObject?.randomUUID === "function") {
    return cryptoObject.randomUUID();
  }

  if (typeof cryptoObject?.getRandomValues === "function") {
    return uuidFromRandomValues(cryptoObject);
  }

  return insecureUuidFallback();
}

export function createClientId(prefix: string): string {
  return `${prefix}${createClientUuid()}`;
}
