import { z } from 'zod';

const DEFAULT_TOKEN = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const addressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const amountSchema = z.string().regex(/^\d+(\.\d{1,6})?$/);
const spendSchema = z.object({
  agentId: z.string().min(1), requestId: z.string().min(1),
  amount: amountSchema, chain: z.literal('base'), asset: z.literal('USDC'),
  recipient: addressSchema, service: z.string().optional(),
  policy: z.object({
    maxPerTransaction: amountSchema, remainingDailyBudget: amountSchema,
    requireHumanAbove: amountSchema, maxRepeats: z.number().int().nonnegative(),
    allowedRecipients: z.array(addressSchema), blockUnknownRecipients: z.boolean()
  }).strict()
}).strict();

function invalid(message) { throw new Error(message); }

function validateChallenge(challenge) {
  if (challenge?.x402Version !== 2 || !Array.isArray(challenge.accepts) || !challenge.accepts.length) {
    invalid('Missing or malformed x402 challenge');
  }
  for (const offer of challenge.accepts) {
    if (offer.scheme !== 'exact' || offer.network !== 'eip155:8453' ||
        typeof offer.amount !== 'string' || !/^[1-9]\d*$/.test(offer.amount) ||
        !addressSchema.safeParse(offer.asset).success ||
        offer.asset.toLowerCase() !== DEFAULT_TOKEN.toLowerCase() ||
        !addressSchema.safeParse(offer.payTo).success ||
        !Number.isInteger(offer.maxTimeoutSeconds) || offer.maxTimeoutSeconds <= 0) {
      invalid('Malformed Base USDC payment offer');
    }
  }
  return challenge;
}

export function buildSpendInput() {
  return {
    agentId: 'kushbitx-bounty-agent',
    requestId: `demo-${Date.now()}`,
    amount: '0.10',
    chain: 'base',
    asset: 'USDC',
    recipient: ZERO_ADDRESS,
    service: 'bounty-demo',
    policy: {
      maxPerTransaction: '1.00',
      remainingDailyBudget: '5.00',
      requireHumanAbove: '0.50',
      maxRepeats: 1,
      allowedRecipients: [ZERO_ADDRESS],
      blockUnknownRecipients: true
    }
  };
}

export function makeKushBitxOperations(client) {
  if (!client) throw new Error('client is required');

  return {
    async previewToken(address = DEFAULT_TOKEN) {
      addressSchema.parse(address);
      const data = await client.previewToken(address);
      if (data?.preview !== true || data?.token?.address?.toLowerCase() !== address.toLowerCase() ||
          typeof data?.token?.symbol !== 'string' || !data.token.symbol ||
          !data.market || typeof data.market !== 'object' || Array.isArray(data.market)) {
        invalid('Missing or malformed token preview');
      }
      return data;
    },

    async evaluateSpend(input = buildSpendInput()) {
      spendSchema.parse(input);
      const data = await client.evaluateSpend(input);
      if (!['ALLOW', 'WARN', 'BLOCK', 'HUMAN_APPROVAL'].includes(data?.decision) ||
          data.advisory !== true || data.executionAuthorized !== false) {
        invalid('Missing or malformed advisory SpendGuard evaluation');
      }
      return data;
    },

    async discoverX402Challenge(address = DEFAULT_TOKEN) {
      addressSchema.parse(address);
      const result = await client.getPaymentChallenge('token-risk', {
        chain: 'base',
        address
      });
      if (result?.service !== 'token-risk' || result?.path !== '/api/token-risk') invalid('Unexpected challenge service');
      validateChallenge(result.challenge);
      if (typeof result.paymentRequired !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(result.paymentRequired)) {
        invalid('Missing or malformed PAYMENT-REQUIRED header');
      }
      let header;
      try { header = JSON.parse(Buffer.from(result.paymentRequired, 'base64').toString('utf8')); }
      catch { invalid('Malformed PAYMENT-REQUIRED header'); }
      validateChallenge(header);
      const terms = (c) => c.accepts.map(({ scheme, network, amount, asset, payTo, maxTimeoutSeconds }) =>
        ({ scheme, network, amount, asset, payTo, maxTimeoutSeconds }));
      if (JSON.stringify(terms(header)) !== JSON.stringify(terms(result.challenge))) invalid('Conflicting payment challenge terms');
      return result;
    }
  };
}

export function assertNoPaymentSurface(operationNames) {
  const forbidden = ['sign', 'pay', 'payment', 'submit', 'recover', 'policy'];
  for (const name of operationNames) {
    const lower = name.toLowerCase();
    if (forbidden.some((word) => lower.includes(word))) {
      throw new Error(`Forbidden payment/signing surface exposed: ${name}`);
    }
  }
  return true;
}

export const SAFE_OPERATION_NAMES = Object.freeze([
  'previewToken',
  'evaluateSpend',
  'discoverX402Challenge'
]);
