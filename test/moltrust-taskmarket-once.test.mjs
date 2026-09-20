import test from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";

function leadingZeroBits(buf) {
  let n = 0;
  for (const byte of buf) {
    if (byte === 0) { n += 8; continue; }
    for (let bit = 7; bit >= 0; bit--) {
      if ((byte & (1 << bit)) === 0) n++;
      else return n;
    }
  }
  return n;
}

async function getJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...(init.headers || {}) },
  });
  const raw = await response.text();
  let body;
  try { body = JSON.parse(raw); } catch { body = { raw }; }
  assert.equal(response.ok, true, `${url} HTTP ${response.status}: ${raw.slice(0,500)}`);
  return { status: response.status, body };
}

test("one-shot MolTrust TaskMarket evidence", { timeout: 120000 }, async () => {
  const challengeResponse = await getJson("https://api.moltrust.ch/identity/register-challenge");
  const { challenge, pow } = challengeResponse.body;
  assert.equal(typeof challenge, "string");
  assert.equal(typeof pow?.seed, "string");
  const difficulty = Number(pow.difficulty_bits ?? 18);

  let powNonce = null;
  for (let i = 0; i < 20_000_000; i++) {
    const candidate = String(i);
    const digest = createHash("sha256").update(pow.seed + candidate).digest();
    if (leadingZeroBits(digest) >= difficulty) { powNonce = candidate; break; }
  }
  assert.notEqual(powNonce, null);

  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const jwk = publicKey.export({ format: "jwk" });
  const publicKeyHex = Buffer.from(jwk.x, "base64url").toString("hex");
  const signature = sign(null, Buffer.from(challenge, "utf8"), privateKey).toString("base64url");

  const registration = await getJson("https://api.moltrust.ch/identity/register-pop", {
    method: "POST",
    body: JSON.stringify({
      public_key: publicKeyHex,
      challenge,
      signature,
      pow_nonce: powNonce,
      display_name: "RevenueSwarmAgent",
      platform: "taskmarket",
    }),
  });

  const rb = registration.body;
  const did = rb.did || rb.agent_did || rb.id || rb.credential?.credentialSubject?.id || rb.credential?.credentialSubject?.did || rb.vc?.credentialSubject?.id;
  assert.match(did, /^did:moltrust:/);

  const score = await getJson(`https://api.moltrust.ch/skill/trust-score/${encodeURIComponent(did)}`);
  const evidence = {
    task_id: "0xea9b5bd5310567979355dcc4a14995a21769cc413c4f29a3b83b03429f461168",
    did,
    trust_score_response: score.body,
  };
  console.log("MOLTRUST_EVIDENCE=" + JSON.stringify(evidence));
});
