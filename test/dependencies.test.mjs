import test from 'node:test';
import assert from 'node:assert/strict';
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';
import { KushBitxClient } from '@kushbitx/sdk';

test('runtime dependencies expose the APIs used by the agent', () => {
  assert.equal(typeof Agent, 'function');
  assert.equal(typeof run, 'function');
  assert.equal(typeof tool, 'function');
  assert.equal(typeof z.object, 'function');
  assert.equal(typeof KushBitxClient, 'function');
});
