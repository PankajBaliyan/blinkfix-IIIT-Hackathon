# Checkout currency contract

`cart.total` is a nonnegative safe integer in source minor units. Only lowercase
`usd` and `eur` are supported; both have two decimal places. `currency.code`
specifies the destination, and `exchangeRate` is destination units per source
unit, always an explicit finite positive number. Charge
`Math.round(total * exchangeRate)` destination minor units; reject overflow.
Missing or unknown currency, invalid total, or missing/zero/negative/nonnumeric/
nonfinite rate must throw `InvalidCurrencyError` with message `INVALID_CURRENCY`
before calling the injected gateway. No implicit rate or currency is allowed.
The gateway is a stub: no money moves. This fixture is not a production FX
engine (no quote expiry or rate lookup).
