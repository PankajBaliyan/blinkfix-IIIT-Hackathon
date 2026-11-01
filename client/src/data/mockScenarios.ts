import { Scenario } from '../types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'payments-typeerror',
    name: 'TypeError in payments.js (Currency Null Pointer)',
    service: 'checkout-service',
    environment: 'prod-us-east-1',
    version: 'v1.0.4',
    commitHead: 'abc104',
    errorName: 'TypeError',
    errorMessage: "Cannot read properties of undefined (reading 'exchangeRate')",
    file: 'src/payments.js',
    line: 5,
    functionName: 'processPayment',
    culpritCommit: {
      hash: 'abc104',
      author: 'alex@company.com',
      message: 'Refactor payment processing currency conversion',
      timeAgo: '14 minutes ago',
      prNumber: 104,
    },
    infraStatus: [
      { service: 'Stripe API Gateway', status: 'HEALTHY', latencyMs: 38 },
      { service: 'Redis Session Store', status: 'HEALTHY', latencyMs: 2 },
      { service: 'PostgreSQL Primary', status: 'HEALTHY', latencyMs: 12 },
    ],
    blastRadius: {
      scope: 'European Checkout Flow & Multi-Currency Carts',
      impactPercentage: '14.2% of live traffic',
      affectedRoutes: ['POST /api/v2/checkout/process', 'POST /api/v2/cart/convert-currency'],
      severity: 'P0 - CRITICAL',
    },
    mitigation: {
      action: 'Rollback to Deployment v1.0.3 (Revert PR #104)',
      description: 'Reverts commit abc104 to restore the previous stable currency fallback handler.',
      targetPr: 104,
      riskLevel: 'LOW',
    },
    originalCode: `const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function processPayment(cart, customer) {
  // Bug: user currency metadata is undefined when cart.currency is omitted
  const amountInCents = cart.total * cart.currency.exchangeRate;
  
  return await stripe.charges.create({
    amount: Math.round(amountInCents),
    currency: cart.currency.code || 'usd',
    customer: customer.id,
  });
}

module.exports = { processPayment };`,
    fixedCode: `const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function processPayment(cart, customer) {
  // Safe patch: optional chaining with fallback exchange rate and currency code
  const rate = cart?.currency?.exchangeRate ?? 1.0;
  const currencyCode = cart?.currency?.code ?? 'usd';
  const amountInCents = cart.total * rate;
  
  return await stripe.charges.create({
    amount: Math.round(amountInCents),
    currency: currencyCode,
    customer: customer.id,
  });
}

module.exports = { processPayment };`,
    patches: [
      {
        id: 'patch-a',
        title: 'Patch A: Standard ES6 Optional Chaining (Winner)',
        strategy: 'Modern ES6 + Nullish Coalescing',
        explanation: 'Safely access cart?.currency?.exchangeRate ?? 1.0 with zero runtime overhead and clean idiom.',
        confidence: 0.98,
        isWinner: true,
        validation: {
          targetFileMatch: true,
          astSyntaxValid: true,
          unitTestsPassed: '3/3 passing',
          diffLineChange: '+3 / -2 lines',
          score: 96,
        },
        code: `const rate = cart?.currency?.exchangeRate ?? 1.0;\nconst currencyCode = cart?.currency?.code ?? 'usd';\nconst amountInCents = cart.total * rate;`,
      },
      {
        id: 'patch-b',
        title: 'Patch B: Strict Runtime Type-Checking',
        strategy: 'Strict Type-Check Guard',
        explanation: 'Explicit typeof validation checking both object existence and numeric exchangeRate property.',
        confidence: 0.89,
        isWinner: false,
        validation: {
          targetFileMatch: true,
          astSyntaxValid: true,
          unitTestsPassed: '3/3 passing',
          diffLineChange: '+6 / -1 lines',
          score: 87,
        },
        code: `const hasCurrency = cart && typeof cart.currency === 'object' && typeof cart.currency.exchangeRate === 'number';\nconst rate = hasCurrency ? cart.currency.exchangeRate : 1.0;\nconst amountInCents = cart.total * rate;`,
      },
      {
        id: 'patch-c',
        title: 'Patch C: Defensive Fallback Guard',
        strategy: 'Defensive Object Fallback',
        explanation: 'Constructs a default fallback currency object before dereferencing keys.',
        confidence: 0.84,
        isWinner: false,
        validation: {
          targetFileMatch: true,
          astSyntaxValid: true,
          unitTestsPassed: '2/3 passing',
          diffLineChange: '+4 / -1 lines',
          score: 79,
        },
        code: `const currency = cart.currency || { exchangeRate: 1.0, code: 'usd' };\nconst amountInCents = cart.total * currency.exchangeRate;`,
      },
      {
        id: 'patch-d',
        title: 'Patch D: Minimal Character Modification',
        strategy: 'Minimal AST Edit',
        explanation: 'Minimal inline ternary expression avoiding variable assignments.',
        confidence: 0.78,
        isWinner: false,
        validation: {
          targetFileMatch: true,
          astSyntaxValid: true,
          unitTestsPassed: '3/3 passing',
          diffLineChange: '+1 / -1 lines',
          score: 82,
        },
        code: `const amountInCents = cart.total * (cart.currency ? cart.currency.exchangeRate : 1.0);`,
      },
      {
        id: 'patch-e',
        title: 'Patch E: Guard Clause Early Rejection',
        strategy: 'Guard Clause Early Return',
        explanation: 'Throws informative descriptive Error if currency metadata is missing.',
        confidence: 0.65,
        isWinner: false,
        validation: {
          targetFileMatch: true,
          astSyntaxValid: true,
          unitTestsPassed: '1/3 passing (rejected)',
          diffLineChange: '+3 / -0 lines',
          score: 61,
        },
        code: `if (!cart || !cart.currency) throw new Error('Missing cart currency context');`,
      },
    ],
  },
  {
    id: 'stripe-timeout',
    name: 'Upstream Stripe Gateway Timeout (External Outage)',
    service: 'checkout-service',
    environment: 'prod-us-east-1',
    version: 'v1.0.4',
    commitHead: 'abc102',
    errorName: 'GatewayTimeoutError',
    errorMessage: 'StripeConnectionError: Connection to api.stripe.com timed out after 5000ms',
    file: 'src/services/stripeClient.js',
    line: 42,
    functionName: 'createPaymentIntent',
    culpritCommit: {
      hash: 'abc102',
      author: 'devops-bot',
      message: 'Bump network request timeout parameter to 5s',
      timeAgo: '4 hours ago',
      prNumber: 99,
    },
    infraStatus: [
      { service: 'Stripe API Gateway', status: 'DEGRADED', latencyMs: 5120 },
      { service: 'Redis Session Store', status: 'HEALTHY', latencyMs: 2 },
      { service: 'PostgreSQL Primary', status: 'HEALTHY', latencyMs: 14 },
    ],
    blastRadius: {
      scope: 'Global Credit Card Checkout Operations',
      impactPercentage: '68.5% of live checkout attempts',
      affectedRoutes: ['POST /api/v2/checkout/create-intent'],
      severity: 'P0 - CRITICAL',
    },
    mitigation: {
      action: 'Activate Circuit Breaker & Failover to Adyen Gateway',
      description: 'Diverts card transactions from degraded Stripe API to secondary payment rail (Adyen) via feature toggle.',
      targetPr: 99,
      riskLevel: 'LOW',
    },
    originalCode: `const stripe = new Stripe(process.env.STRIPE_KEY, { timeout: 5000 });\n\nasync function createPaymentIntent(order) {\n  return await stripe.paymentIntents.create(order);\n}`,
    fixedCode: `const stripe = new Stripe(process.env.STRIPE_KEY, { timeout: 3000 });\nconst adyen = require('./adyenClient');\n\nasync function createPaymentIntent(order) {\n  try {\n    return await stripe.paymentIntents.create(order);\n  } catch (err) {\n    if (err.type === 'StripeConnectionError') {\n      console.warn('Stripe degraded: falling back to Adyen');\n      return await adyen.createPaymentIntent(order);\n    }\n    throw err;\n  }\n}`,
    patches: [
      {
        id: 'patch-a',
        title: 'Patch A: Dual-Rail Failover with Try/Catch (Winner)',
        strategy: 'Resilient Payment Rail Fallover',
        explanation: 'Catches StripeConnectionError and seamlessly delegates payment intent creation to secondary processor.',
        confidence: 0.94,
        isWinner: true,
        validation: {
          targetFileMatch: true,
          astSyntaxValid: true,
          unitTestsPassed: '4/4 passing',
          diffLineChange: '+9 / -2 lines',
          score: 94,
        },
        code: `try {\n  return await stripe.paymentIntents.create(order);\n} catch (err) {\n  if (err.type === 'StripeConnectionError') return await adyen.createPaymentIntent(order);\n  throw err;\n}`,
      },
      {
        id: 'patch-b',
        title: 'Patch B: Exponential Backoff Retry',
        strategy: 'Retry Backoff Strategy',
        explanation: 'Retries Stripe up to 2 times with 500ms jitter before throwing error.',
        confidence: 0.81,
        isWinner: false,
        validation: {
          targetFileMatch: true,
          astSyntaxValid: true,
          unitTestsPassed: '3/4 passing',
          diffLineChange: '+12 / -1 lines',
          score: 79,
        },
        code: `return await retryWithBackoff(() => stripe.paymentIntents.create(order), { retries: 2, delayMs: 500 });`,
      },
    ],
  },
  {
    id: 'auth-nullpointer',
    name: 'Auth Token Null Pointer in auth.js',
    service: 'identity-service',
    environment: 'prod-us-east-1',
    version: 'v1.0.4',
    commitHead: 'abc108',
    errorName: 'TypeError',
    errorMessage: "Cannot read properties of null (reading 'roles')",
    file: 'src/auth.js',
    line: 18,
    functionName: 'verifyToken',
    culpritCommit: {
      hash: 'abc108',
      author: 'jordan@company.com',
      message: 'Extract user roles from decoded bearer token payload',
      timeAgo: '28 minutes ago',
      prNumber: 108,
    },
    infraStatus: [
      { service: 'OAuth Provider / Keycloak', status: 'HEALTHY', latencyMs: 18 },
      { service: 'Redis Token Cache', status: 'HEALTHY', latencyMs: 3 },
    ],
    blastRadius: {
      scope: 'Authenticated API Gateway Requests with Expired / Guest Tokens',
      impactPercentage: '9.4% of total requests',
      affectedRoutes: ['ALL /api/v2/* (Protected Routes)'],
      severity: 'P1 - HIGH',
    },
    mitigation: {
      action: 'Revert PR #108 or Enable Fallback Anonymous Role Policy',
      description: 'Restores default guest permission assignments when decoded token user claims are null.',
      targetPr: 108,
      riskLevel: 'LOW',
    },
    originalCode: `function verifyToken(req, res, next) {\n  const decoded = jwt.decode(req.headers.authorization);\n  if (decoded.roles.includes('admin')) {\n    return next();\n  }\n  res.status(403).json({ error: 'Forbidden' });\n}`,
    fixedCode: `function verifyToken(req, res, next) {\n  const token = req.headers?.authorization;\n  const decoded = token ? jwt.decode(token) : null;\n  const roles = decoded?.roles ?? [];\n  \n  if (roles.includes('admin')) {\n    return next();\n  }\n  res.status(403).json({ error: 'Forbidden' });\n}`,
    patches: [
      {
        id: 'patch-a',
        title: 'Patch A: Safe Claims Extraction & Null Coalesce (Winner)',
        strategy: 'Defensive JWT Claims Access',
        explanation: 'Ensures decoded?.roles defaults to an empty array before checking roles.includes().',
        confidence: 0.97,
        isWinner: true,
        validation: {
          targetFileMatch: true,
          astSyntaxValid: true,
          unitTestsPassed: '5/5 passing',
          diffLineChange: '+4 / -2 lines',
          score: 98,
        },
        code: `const token = req.headers?.authorization;\nconst decoded = token ? jwt.decode(token) : null;\nconst roles = decoded?.roles ?? [];`,
      },
    ],
  },
];

