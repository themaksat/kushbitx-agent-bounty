import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Buffer } from "buffer";
import { Transaction, TransactionInstruction } from "@solana/web3.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  COOKIE_GENESIS_HASH,
  COOKIE_RPC,
  MEMO_PROGRAM_ID,
  addressUrl,
  short,
  txUrl,
} from "./lib/cookie";
import {
  buildPayload,
  decodeSharedReceipt,
  encodeSharedReceipt,
  memoForDigest,
  receiptDigest,
  type SharedReceipt,
  type WorkReceiptPayload,
} from "./lib/receipt";

type Phase = "idle" | "signing" | "confirming" | "confirmed" | "failed";
type Verification = {
  status: "idle" | "checking" | "verified" | "invalid" | "not-found";
  message: string;
  digest?: string;
  receipt?: SharedReceipt;
};

const EMPTY = {
  task: "",
  artifact: "",
  commit: "",
  amount: "",
  currency: "USDC",
  note: "submitted for review; not accepted or settled",
};

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  wide?: boolean;
}) {
  return (
    <label className={props.wide ? "field field-wide" : "field"}>
      <span>{props.label}</span>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
      />
    </label>
  );
}

function ReceiptCard({ receipt, digest, verified }: {
  receipt: SharedReceipt;
  digest: string;
  verified: boolean;
}) {
  const p = receipt.payload;
  return (
    <section className={"receipt-card " + (verified ? "verified" : "")}>
      <div className="receipt-head">
        <div>
          <p className="eyebrow">WORK RECEIPT</p>
          <h2>{verified ? "On-chain match verified" : "Receipt details"}</h2>
        </div>
        <span className={"status-pill " + (verified ? "ok" : "")}>
          {verified ? "VERIFIED" : "UNVERIFIED"}
        </span>
      </div>
      <dl className="receipt-grid">
        <div><dt>Issuer</dt><dd><a href={addressUrl(p.issuer)} target="_blank">{short(p.issuer, 8)}</a></dd></div>
        <div><dt>Requested amount</dt><dd>{p.amount || "—"} {p.currency || ""}</dd></div>
        <div className="wide"><dt>Task</dt><dd>{p.task ? <a href={p.task} target="_blank">{p.task}</a> : "—"}</dd></div>
        <div className="wide"><dt>Artifact</dt><dd>{p.artifact ? <a href={p.artifact} target="_blank">{p.artifact}</a> : "—"}</dd></div>
        <div><dt>Commit / artifact hash</dt><dd>{p.commit || "—"}</dd></div>
        <div><dt>Digest</dt><dd>{short(digest, 12)}</dd></div>
        <div className="wide"><dt>Note</dt><dd>{p.note || "—"}</dd></div>
      </dl>
      <p className="disclaimer">
        CookieProof proves that the signing wallet anchored this exact record in the referenced
        Cookie Chain transaction. It does not prove that a bounty was accepted, paid, or legally owed.
      </p>
      <a className="explorer-link" href={txUrl(receipt.signature)} target="_blank">
        Open transaction on Cookiescan ↗
      </a>
    </section>
  );
}

export default function App() {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  const [form, setForm] = useState(EMPTY);
  const [network, setNetwork] = useState<"checking" | "cookie" | "wrong" | "offline">("checking");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ receipt: SharedReceipt; digest: string; link: string } | null>(null);
  const [verification, setVerification] = useState<Verification>({ status: "idle", message: "" });

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const checkNetwork = useCallback(async () => {
    setNetwork("checking");
    try {
      const genesis = await connection.getGenesisHash();
      setNetwork(genesis === COOKIE_GENESIS_HASH ? "cookie" : "wrong");
    } catch {
      setNetwork("offline");
    }
  }, [connection]);

  useEffect(() => {
    void checkNetwork();
  }, [checkNetwork]);

  const verify = useCallback(async (receipt: SharedReceipt) => {
    setVerification({ status: "checking", message: "Checking Cookie Chain…" });
    try {
      const digest = await receiptDigest(receipt.payload);
      const memo = memoForDigest(digest);
      const tx = await connection.getParsedTransaction(receipt.signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (!tx) {
        setVerification({ status: "not-found", message: "Transaction not found on the connected Cookie Chain RPC.", digest, receipt });
        return;
      }

      const instructionText = tx.transaction.message.instructions.map((ix) => JSON.stringify(ix)).join("\n");
      const memoMatches = instructionText.includes(memo);
      const signerMatches = tx.transaction.message.accountKeys.some((key) =>
        key.signer && key.pubkey.toBase58() === receipt.payload.issuer
      );

      if (memoMatches && signerMatches && tx.meta?.err == null) {
        setVerification({ status: "verified", message: "Digest, signer, and confirmed transaction all match.", digest, receipt });
      } else {
        setVerification({
          status: "invalid",
          message: !memoMatches
            ? "The transaction exists, but its CookieProof digest does not match this receipt."
            : !signerMatches
              ? "The transaction exists, but the receipt issuer is not a transaction signer."
              : "The transaction did not confirm successfully.",
          digest,
          receipt,
        });
      }
    } catch (e) {
      setVerification({
        status: "invalid",
        message: e instanceof Error ? e.message : "Verification failed.",
        receipt,
      });
    }
  }, [connection]);

  useEffect(() => {
    const encoded = window.location.hash.startsWith("#r=") ? window.location.hash.slice(3) : "";
    if (!encoded) return;
    try {
      const receipt = decodeSharedReceipt(encoded);
      void verify(receipt);
    } catch (e) {
      setVerification({
        status: "invalid",
        message: e instanceof Error ? e.message : "Invalid receipt link.",
      });
    }
  }, [verify]);

  const canAnchor = connected && publicKey && network === "cookie" && form.task && form.artifact && phase !== "signing" && phase !== "confirming";

  const anchor = async () => {
    if (!publicKey || !connected) {
      setError("Connect Nightly first.");
      return;
    }
    if (network !== "cookie") {
      setError("Cookie Chain RPC verification has not passed.");
      return;
    }

    setError("");
    setCreated(null);
    setPhase("signing");

    try {
      const payload: WorkReceiptPayload = buildPayload({
        issuer: publicKey.toBase58(),
        task: form.task,
        artifact: form.artifact,
        commit: form.commit,
        amount: form.amount,
        currency: form.currency,
        note: form.note,
      });
      const digest = await receiptDigest(payload);
      const latest = await connection.getLatestBlockhash("confirmed");
      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      }).add(
        new TransactionInstruction({
          programId: MEMO_PROGRAM_ID,
          keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
          data: Buffer.from(memoForDigest(digest), "utf8"),
        }),
      );

      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 3,
      });
      setPhase("confirming");

      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      }, "confirmed");

      if (confirmation.value.err) throw new Error("Transaction confirmed with an on-chain error.");

      const receipt = { payload, signature };
      const encoded = encodeSharedReceipt(receipt);
      const link = window.location.origin + window.location.pathname + "#r=" + encoded;
      setCreated({ receipt, digest, link });
      setPhase("confirmed");
      window.history.replaceState(null, "", "#r=" + encoded);
      await verify(receipt);
    } catch (e) {
      setPhase("failed");
      setError(e instanceof Error ? e.message : "Unable to anchor receipt.");
    }
  };

  const networkLabel = useMemo(() => {
    if (network === "cookie") return "Cookie Chain verified";
    if (network === "wrong") return "Wrong network";
    if (network === "offline") return "RPC unavailable";
    return "Checking Cookie Chain";
  }, [network]);

  return (
    <main>
      <nav>
        <div className="brand">
          <span className="cookie">🍪</span>
          <div><strong>CookieProof</strong><small>agent work receipts</small></div>
        </div>
        <div className="nav-actions">
          <span className={"network " + network}>{networkLabel}</span>
          <WalletMultiButton />
        </div>
      </nav>

      <header className="hero">
        <p className="eyebrow">COOKIE CHAIN × VERIFIABLE WORK</p>
        <h1>Anchor the work.<br />Verify the receipt.</h1>
        <p className="lede">
          Create a tamper-evident record for a bounty submission, coding deliverable, research artifact,
          or agent job. CookieProof hashes the record locally and anchors only the digest on Cookie Chain.
        </p>
        <div className="hero-badges">
          <span>Nightly wallet</span><span>Cookie Chain Memo</span><span>No backend</span><span>No custody</span>
        </div>
      </header>

      <section className="panel">
        <div className="panel-title">
          <div><p className="eyebrow">CREATE</p><h2>New work receipt</h2></div>
          <span className="step">01</span>
        </div>

        <div className="form-grid">
          <Field label="Task / bounty URL *" value={form.task} onChange={set("task")} placeholder="https://…" wide />
          <Field label="Artifact / submission URL *" value={form.artifact} onChange={set("artifact")} placeholder="https://github.com/…" wide />
          <Field label="Commit or artifact hash" value={form.commit} onChange={set("commit")} placeholder="e.g. de7fb9d…" />
          <Field label="Requested amount" value={form.amount} onChange={set("amount")} placeholder="500" />
          <Field label="Currency" value={form.currency} onChange={set("currency")} placeholder="USDC" />
          <Field label="Status note" value={form.note} onChange={set("note")} placeholder="submitted for review; not settled" wide />
        </div>

        <div className="action-row">
          <button className="anchor" disabled={!canAnchor} onClick={() => void anchor()}>
            {phase === "signing" ? "Approve in Nightly…" : phase === "confirming" ? "Confirming on Cookie Chain…" : "Anchor receipt on Cookie Chain"}
          </button>
          <p>Only a SHA-256 digest goes on-chain. URLs and notes stay in the shareable link.</p>
        </div>

        {error && <div className="alert error">{error}</div>}
        {created && (
          <div className="created">
            <div><strong>Receipt confirmed.</strong><span>{short(created.receipt.signature, 12)}</span></div>
            <button onClick={() => void navigator.clipboard.writeText(created.link)}>Copy verification link</button>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-title">
          <div><p className="eyebrow">VERIFY</p><h2>Shared receipt</h2></div>
          <span className="step">02</span>
        </div>
        {verification.status === "idle" ? (
          <div className="empty">Open a CookieProof verification link to re-hash its payload and compare it with the confirmed on-chain Memo.</div>
        ) : verification.status === "checking" ? (
          <div className="empty">Checking transaction, signer, and digest…</div>
        ) : (
          <>
            <div className={"alert " + (verification.status === "verified" ? "success" : "error")}>
              {verification.message}
            </div>
            {verification.receipt && verification.digest && (
              <ReceiptCard receipt={verification.receipt} digest={verification.digest} verified={verification.status === "verified"} />
            )}
          </>
        )}
      </section>

      <section className="how">
        <article><span>1</span><h3>Canonicalize</h3><p>Normalize the work record and hash it locally with SHA-256.</p></article>
        <article><span>2</span><h3>Anchor</h3><p>Nightly signs a Cookie Chain Memo containing only <code>cookieproof:1:&lt;digest&gt;</code>.</p></article>
        <article><span>3</span><h3>Share</h3><p>The URL fragment carries the human-readable record plus transaction signature. It never reaches a server.</p></article>
        <article><span>4</span><h3>Verify</h3><p>Recompute the digest, fetch the transaction from Cookie Chain RPC, and match the signer + Memo.</p></article>
      </section>

      <footer>
        <p>CookieProof is a proof-of-commitment tool, not an escrow, oracle, payment processor, or acceptance authority.</p>
        <div>
          <a href="https://docs.cookiechain.wtf" target="_blank">Cookie Chain docs ↗</a>
          <a href={COOKIE_RPC} target="_blank">RPC ↗</a>
          <a href="https://hyperlane.cookiescan.io" target="_blank">Bridge ↗</a>
        </div>
      </footer>
    </main>
  );
}
