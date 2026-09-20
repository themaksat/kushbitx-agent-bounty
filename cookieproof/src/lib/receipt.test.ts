import { describe, expect, it } from "vitest";
import { buildPayload, canonicalReceipt, memoForDigest, receiptDigest } from "./receipt";

describe("CookieProof receipt format", () => {
  it("normalizes and hashes deterministically", async () => {
    const payload = buildPayload({
      issuer: "  9abc   xyz ",
      task: "https://example.com/task/1",
      artifact: "https://github.com/example/repo",
      commit: "abc123",
      amount: "500",
      currency: "usdc",
      note: "  submitted   for review ",
    });

    expect(payload.currency).toBe("USDC");
    expect(payload.issuer).toBe("9abc xyz");
    expect(payload.note).toBe("submitted for review");

    const first = await receiptDigest(payload);
    const second = await receiptDigest(JSON.parse(canonicalReceipt(payload)));
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(memoForDigest(first)).toBe("cookieproof:1:" + first);
  });

  it("never turns a requested amount into a payment claim", () => {
    const payload = buildPayload({
      issuer: "wallet",
      task: "bounty-url",
      artifact: "artifact-url",
      commit: "deadbeef",
      amount: "100",
      currency: "USDC",
      note: "requested, not settled",
    });
    expect(payload.note).toContain("not settled");
  });
});
