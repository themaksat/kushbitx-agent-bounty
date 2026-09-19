const DEFAULT_TOKEN = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

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
      return client.previewToken(address);
    },

    async evaluateSpend(input = buildSpendInput()) {
      return client.evaluateSpend(input);
    },

    async discoverX402Challenge(address = DEFAULT_TOKEN) {
      return client.getPaymentChallenge('token-risk', {
        chain: 'base',
        address
      });
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
