# RustChain bounty #12787 — video claim package

## Title
video: RIP-PoA explainer

## Video
Live-URL: PENDING_YOUTUBE_PUBLICATION

## Runtime
Approximately 5 minutes 50 seconds.

## Summary
This video explains RustChain's Proof-of-Antiquity model for a general technical audience. It covers hardware attestation, the `/attest/submit` flow, hardware binding and replay defenses, the "1 CPU = 1 vote" design goal, why VMs/emulators are intended to receive negligible useful reward weight, and how a finite epoch reward pool is distributed among eligible miners.

The video deliberately avoids investment claims, profitability claims, exploit instructions, and absolute security guarantees. It describes hardware fingerprinting as raising the cost of spoofing and helping resist VM farms rather than making spoofing impossible.

## Script / outline

1. **What Proof of Antiquity is**
   - Physical hardware is attested before participation.
   - Vintage and exotic systems can receive higher antiquity weighting.
   - Antiquity is one input to reward weighting, not a bypass around validation.

2. **"1 CPU = 1 vote"**
   - Intended identity boundary is a real physical machine / CPU.
   - The design resists turning unlimited virtual copies into unlimited influence.
   - It is not described as a guarantee that every CPU receives an identical payout.

3. **The `/attest/submit` flow**
   - Miner identifier and timestamp.
   - Device family / architecture.
   - Hardware fingerprint.
   - Ed25519 signature.
   - Hardware binding and replay / duplicate defenses.

4. **Why VMs and emulators are treated differently**
   - Multiple physical / behavioral measurements are combined.
   - Timing, cache behavior, instruction jitter, thermal / architecture signals.
   - Goal is to raise spoofing cost and resist simple VM farms.

5. **Epoch rewards**
   - Successful attestation leads to eligibility / enrollment.
   - Rewards come from a finite epoch pool.
   - Hardware / antiquity weighting affects each eligible miner's share.
   - Supply limits remain part of settlement logic.

6. **Security framing**
   - Hardware attestation is not magic or perfect.
   - Continued testing and responsible disclosure remain necessary.
   - No exploit steps are shown.

## Sources shown in the video
- https://rustchain.org
- https://github.com/Scottcjn/Rustchain

## Production evidence
- Generated MP4: `rustchain_proof_of_antiquity_explainer.mp4`
- YouTube publication scheduled through the connected Metricool account.
- YouTube upload is marked as AI-generated content.
- Category: Science & Technology.
- Audience: not made for kids.
