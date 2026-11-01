class InvalidCurrencyError extends Error {
  constructor() { super('INVALID_CURRENCY'); this.name = 'InvalidCurrencyError'; }
}
async function processPayment(cart, charge) {
  const currency = cart?.currency;
  if (!Number.isSafeInteger(cart?.total) || cart.total < 0 ||
      !currency || !['usd', 'eur'].includes(currency.code) ||
      !Number.isFinite(currency.exchangeRate) || currency.exchangeRate <= 0) {
    throw new InvalidCurrencyError();
  }
  const amount = Math.round(cart.total * currency.exchangeRate);
  if (!Number.isSafeInteger(amount)) throw new InvalidCurrencyError();
  return charge({ amount, currency: currency.code });
}
module.exports = { processPayment, InvalidCurrencyError };
