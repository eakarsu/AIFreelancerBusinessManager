import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateInvoice, validateTransition } from '../src/domain/businessWorkflow.js';

test('invoice calculations preserve line quantities and tax', () => {
  assert.deepEqual(calculateInvoice([{ quantity: 2, unit_price: 50 }, { quantity: 1, unit_price: 25 }], 0.1), { subtotal: 125, tax: 12.5, total: 137.5 });
});
test('activation requires an approved contract version', () => assert.throws(() => validateTransition('contract', 'active', { role: 'owner' }), /contract/));
test('financial transitions require authority and reconciliation', () => {
  assert.throws(() => validateTransition('invoiced', 'paid', { role: 'user', reconciliationReference: 'r' }), /authority/);
  assert.equal(validateTransition('invoiced', 'paid', { role: 'finance', reconciliationReference: 'r' }), true);
});
