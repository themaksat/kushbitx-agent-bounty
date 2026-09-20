# CookieProof

CookieProof is a Cookie Chain cApp for anchoring and verifying **work receipts** for bounty submissions, agent jobs, coding deliverables, and research artifacts.

It is being built for the Superteam Earn bounty **Create an App on Cookie Chain**.

## What it proves

CookieProof can prove that a wallet signed a Cookie Chain transaction committing to the SHA-256 digest of a specific work record.

It does **not** prove:
- that a bounty was accepted,
- that payment was made,
- that a reviewer approved the work,
- or that a legal/payment obligation exists.

That boundary is intentional.

## Flow

1. Connect Nightly.
2. Enter:
   - task/bounty URL,
   - artifact/submission URL,
   - optional commit/artifact hash,
   - requested amount/currency,
   - explicit status note.
3. CookieProof normalizes the record and computes SHA-256 locally.
4. Nightly signs a Cookie Chain Memo transaction containing only:
   `cookieproof:1:<sha256>`
5. After confirmation, the app creates a shareable URL fragment containing the readable record + transaction signature.
6. Anyone opening that link recomputes the digest and verifies:
   - transaction exists on Cookie Chain,
   - transaction confirmed without error,
   - Memo matches the recomputed digest,
   - stated issuer is a transaction signer.

No backend stores receipts. URL-fragment data does not get sent to a server.

## Cookie Chain integration

- RPC: https://rpc.cookiescan.io
- WebSocket: https://wss.cookiescan.io
- Explorer: https://cookiescan.io
- Memo program: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`
- Wallet: Nightly via `@solana/wallet-adapter-nightly`
- Chain guard: verifies the Cookie Chain genesis hash before enabling anchoring.

## Run

```bash
cd cookieproof
npm install
npm test
npm run build
npm run dev
```

## Cost / custody

CookieProof does not custody funds or charge a fee. A connected wallet needs enough native COOK to pay the normal Cookie Chain transaction fee for its Memo transaction.

## Bridge

If a user needs COOK, use the current official bridge documented by Cookie Chain:
https://hyperlane.cookiescan.io

Never bridge or sign from a link supplied inside an untrusted bounty/task record.

## Status

Open-source bounty build in progress. No Cookie Chain prize or payment is claimed unless the sponsor selects and settles the submission.
