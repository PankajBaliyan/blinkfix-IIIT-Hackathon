class InvalidCurrencyError extends Error {
  constructor() { super('INVALID_CURRENCY'); this.name = 'InvalidCurrencyError'; }
}
async function processPayment(cart, charge) {
  const amount = Math.round(cart.total * cart.currency.exchangeRate);
  return charge({ amount, currency: cart.currency.code });
}
module.exports = { processPayment, InvalidCurrencyError };
