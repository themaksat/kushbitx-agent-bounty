export type WorkReceiptPayload = {
  v: 1;
  issuer: string;
  task: string;
  artifact: string;
  commit: string;
  amount: string;
  currency: string;
  note: string;
};

export type SharedReceipt = {
  payload: WorkReceiptPayload;
  signature: string;
};

export function normalizeText(value: string, max: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

export function buildPayload(input: Omit<WorkReceiptPayload, "v">): WorkReceiptPayload {
  return {
    v: 1,
    issuer: normalizeText(input.issuer, 64),
    task: normalizeText(input.task, 240),
    artifact: normalizeText(input.artifact, 240),
    commit: normalizeText(input.commit, 80),
    amount: normalizeText(input.amount, 32),
    currency: normalizeText(input.currency, 16).toUpperCase(),
    note: normalizeText(input.note, 160),
  };
}

export function canonicalReceipt(payload: WorkReceiptPayload): string {
  return JSON.stringify({
    v: payload.v,
    issuer: payload.issuer,
    task: payload.task,
    artifact: payload.artifact,
    commit: payload.commit,
    amount: payload.amount,
    currency: payload.currency,
    note: payload.note,
  });
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function receiptDigest(payload: WorkReceiptPayload): Promise<string> {
  return sha256Hex(canonicalReceipt(payload));
}

export function memoForDigest(digest: string): string {
  if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error("Invalid SHA-256 digest");
  return "cookieproof:1:" + digest;
}

export function encodeSharedReceipt(receipt: SharedReceipt): string {
  const bytes = new TextEncoder().encode(JSON.stringify(receipt));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeSharedReceipt(encoded: string): SharedReceipt {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (encoded.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed?.payload || typeof parsed.signature !== "string") throw new Error("Malformed receipt");
  if (parsed.payload.v !== 1) throw new Error("Unsupported receipt version");
  return parsed as SharedReceipt;
}
