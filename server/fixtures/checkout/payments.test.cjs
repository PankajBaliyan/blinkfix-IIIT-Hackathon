const { test } = require('node:test');
const assert = require('node:assert/strict');
const { processPayment } = require('./payments.cjs');
test('explicit EUR conversion charges once', async () => {
  const calls = [];
  await processPayment({ total: 1000, currency: { code: 'eur', exchangeRate: 0.9 } }, p => calls.push(p));
  assert.deepEqual(calls, [{ amount: 900, currency: 'eur' }]);
});
test('USD rate one and zero total are valid', async () => {
  for (const total of [0, 1200]) {
    const calls = [];
    await processPayment({ total, currency: { code: 'usd', exchangeRate: 1 } }, p => calls.push(p));
    assert.deepEqual(calls, [{ amount: total, currency: 'usd' }]);
  }
});
test('round destination minor units', async () => {
  const calls = [];
  await processPayment({ total: 101, currency: { code: 'eur', exchangeRate: 0.5 } }, p => calls.push(p));
  assert.equal(calls[0].amount, 51);
});
const invalid = [
  ['missing currency', { total: 1000 }], ['null currency', { total: 1000, currency: null }],
  ...[undefined, 0, -1, NaN, Infinity, '1'].map(rate => ['rate ' + String(rate), { total: 1000, currency: { code: 'eur', exchangeRate: rate } }]),
  ...[undefined, 'btc', 'USD'].map(code => ['currency ' + code, { total: 1000, currency: { code, exchangeRate: 1 } }]),
  ...[-1, 1.5, NaN, Infinity, '100', Number.MAX_SAFE_INTEGER + 1].map(total => ['total ' + total, { total, currency: { code: 'usd', exchangeRate: 1 } }]),
  ['overflow', { total: Number.MAX_SAFE_INTEGER, currency: { code: 'eur', exchangeRate: 2 } }],
  ['missing cart', undefined],
];
for (const [label, cart] of invalid) {
  test(label + ': typed rejection and zero charges', async () => {
    const calls = [];
    await assert.rejects(async () => processPayment(cart, p => calls.push(p)), { name: 'InvalidCurrencyError', message: 'INVALID_CURRENCY' });
    assert.deepEqual(calls, []);
  });
}
