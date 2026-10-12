import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import workspace from '../aiWorkspace.cjs';

const { createAIWorkspaceRouter, validateFields } = workspace;

function createPool() {
  const rows = [];
  return {
    rows,
    async query(text, values = []) {
      if (/^CREATE TABLE/i.test(text.trim())) return { rows: [] };
      if (/^INSERT INTO ai_workspace_runs/i.test(text.trim())) {
        const [user_id, feature, input, result, result_json, model, usage] = values;
        const row = {
          id: rows.length + 1,
          user_id,
          feature,
          input,
          result,
          result_json,
          model,
          usage,
          created_at: new Date('2026-10-10T12:00:00Z').toISOString(),
          updated_at: new Date('2026-10-10T12:00:00Z').toISOString(),
        };
        rows.push(row);
        return { rows: [row] };
      }
      if (/^SELECT \* FROM ai_workspace_runs/i.test(text.trim())) {
        return { rows: rows.filter((row) => row.user_id === values[0] && row.feature === values[1]) };
      }
      throw new Error(`Unexpected test query: ${text}`);
    },
  };
}

test('workspace field validation requires complete required fields and keeps optional fields', () => {
  assert.deepEqual(validateFields({ input: '  Review this  ', goal: 'Plan next steps', context: 'Example only' }), {
    input: 'Review this',
    goal: 'Plan next steps',
    context: 'Example only',
  });
  assert.throws(() => validateFields({ input: 'Missing goal' }), /desired outcome/i);
  assert.throws(() => validateFields({ input: 'x', goal: 'y', unknown: 'z' }), /invalid/i);
});

test('workspace generates and lists an actor-owned structured report with a controlled provider', async (t) => {
  const pool = createPool();
  let providerCalls = 0;
  const app = express();
  app.use(express.json());
  app.use('/api/report-workspace', createAIWorkspaceRouter({
    pool,
    authenticateToken: (req, _res, next) => { req.user = { id: 7 }; next(); },
    aiRateLimiter: (_req, _res, next) => next(),
    features: [{ id: 'test-feature', title: 'Test feature', description: 'Controlled verification' }],
    env: { OPENROUTER_API_KEY: 'controlled-test-key', OPENROUTER_MODEL: 'test/model' },
    fetchImpl: async (_url, options) => {
      providerCalls += 1;
      assert.equal(options.signal.aborted, false);
      return new Response(JSON.stringify({
        model: 'test/model',
        usage: { total_tokens: 42 },
        choices: [{ message: { content: '{"summary":"Ready for review","actions":[{"owner":"Lead","task":"Confirm scope"}]}' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  }));

  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}/api/report-workspace`;
  const fields = {
    input: 'Prepare a controlled report',
    context: 'Fictional example',
    goal: 'Return a reviewable plan',
    audience: 'Owner',
    source_data: 'Example observation',
    constraints: 'Do not invent facts',
    budget: '$500 example budget',
    deadline: '2026-10-20',
    tone: 'Professional',
    output_format: 'Summary and action plan',
  };

  const generatedResponse = await fetch(`${base}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer controlled' },
    body: JSON.stringify({ feature: 'test-feature', fields }),
  });
  assert.equal(generatedResponse.status, 200);
  const generated = await generatedResponse.json();
  assert.equal(generated.item.user_id, '7');
  assert.equal(generated.item.result_json.summary, 'Ready for review');
  assert.equal(generated.item.result_json.actions[0].owner, 'Lead');

  const historyResponse = await fetch(`${base}/runs?feature=test-feature`, {
    headers: { Authorization: 'Bearer controlled' },
  });
  assert.equal(historyResponse.status, 200);
  const history = await historyResponse.json();
  assert.equal(history.items.length, 1);
  assert.equal(history.items[0].input.deadline, '2026-10-20');
  assert.equal(providerCalls, 1);
});
