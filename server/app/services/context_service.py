import json
import copy
from typing import Dict, Any, Optional
from ..config import settings

_cached_context: Optional[Dict[str, Any]] = None

def load_deployment_context() -> Dict[str, Any]:
    """Loads the pre-computed deployment context.json file."""
    global _cached_context
    if _cached_context is None:
        if settings.CONTEXT_PATH.exists():
            with open(settings.CONTEXT_PATH, "r", encoding="utf-8") as f:
                _cached_context = json.load(f)
        else:
            # Fallback default deployment intelligence
            _cached_context = {
                "repository": "swarm-zero-demo",
                "branch": "main",
                "deployment": {"version": "1.0.4"},
                "recentCommits": [
                    {
                        "hash": "abc104",
                        "author": "alex@company.com",
                        "message": "Refactor payment processing currency conversion",
                        "changedFiles": ["src/payments.js"],
                        "prNumber": 104,
                    }
                ],
                "dependencies": {"stripe": "12.4.0", "express": "4.18.2"},
                "files": {
                    "src/payments.js": "const stripe = require('stripe')(process.env.STRIPE_KEY);\n\nasync function processPayment(cart) {\n  const amountInCents = cart.total * cart.currency.exchangeRate;\n  return await stripe.charges.create({ amount: amountInCents });\n}\nmodule.exports = { processPayment };"
                },
            }
    # Return deep copy so callers can't mutate shared state
    return copy.deepcopy(_cached_context)

def get_file_content(filepath: str) -> str:
    """Returns the code snippet for a suspect file from deployment context."""
    context = load_deployment_context()
    return context.get("files", {}).get(filepath, "// Source file not found in context")

def get_recent_commits(limit: int = 5) -> list:
    context = load_deployment_context()
    return context.get("recentCommits", [])[:limit]

