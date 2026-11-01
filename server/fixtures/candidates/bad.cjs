class InvalidCurrencyError extends Error {
  constructor() { super('INVALID_CURRENCY'); this.name = 'InvalidCurrencyError'; }
}
async function processPayment(cart, charge) {
  const rate = cart?.currency?.exchangeRate ?? 1.0;
  return charge({ amount: Math.round(cart.total * rate), currency: cart?.currency?.code ?? 'usd' });
}
module.exports = { processPayment, InvalidCurrencyError };
