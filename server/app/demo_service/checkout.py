"""A small checkout service used to demo Blinkfix.

It contains deliberate bugs. Hit the routes below to make the service crash and
start an incident:

  POST /api/demo/checkout                       cart without a currency -> TypeError
  GET  /api/demo/orders/ord_empty/average-price empty order             -> ZeroDivisionError
  POST /api/demo/payments/charge                Stripe is unreachable   -> TimeoutError
"""
import asyncio
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.log_store import capture_service_logs

SERVICE_NAME = "checkout-service"
logger = capture_service_logs(SERVICE_NAME)

router = APIRouter(prefix="/api/demo", tags=["demo-service"])

CURRENCIES = {
    "USD": {"code": "USD", "exchange_rate": 1.0},
    "EUR": {"code": "EUR", "exchange_rate": 1.08},
    "GBP": {"code": "GBP", "exchange_rate": 1.27},
}

ORDERS = {
    "ord_1001": [{"sku": "kb-01", "price": 79.0}, {"sku": "ms-02", "price": 25.0}],
    "ord_empty": [],
}


class CheckoutRequest(BaseModel):
    customer_id: str
    total: float
    currency: Optional[str] = None


class ChargeRequest(BaseModel):
    customer_id: str
    amount: float


def lookup_currency(code: Optional[str]):
    # Refactor from PR #104: returns None when the cart has no currency or an unknown one.
    return CURRENCIES.get(code)


def convert_to_cents(cart: CheckoutRequest) -> int:
    currency = lookup_currency(cart.currency)
    # BUG: currency is None when the cart has no currency, so this line raises a TypeError.
    rate = currency["exchange_rate"]
    return round(cart.total * rate * 100)


def average_item_price(items: list) -> float:
    # BUG: an order with no items divides by zero.
    return sum(i["price"] for i in items) / len(items)


async def call_stripe(amount: float) -> dict:
    # Simulates the payment provider being down.
    await asyncio.sleep(0.3)
    raise TimeoutError("Connection to api.stripe.com timed out after 5000ms")


@router.post("/checkout")
async def checkout(cart: CheckoutRequest):
    logger.info("Checkout started for customer=%s total=%.2f currency=%s", cart.customer_id, cart.total, cart.currency)
    logger.info("Converting cart total to cents")
    amount_cents = convert_to_cents(cart)
    logger.info("Checkout completed for customer=%s amount_cents=%d", cart.customer_id, amount_cents)
    return {"status": "paid", "customer_id": cart.customer_id, "amount_cents": amount_cents}


@router.get("/orders/{order_id}/average-price")
async def order_average_price(order_id: str):
    items = ORDERS.get(order_id)
    if items is None:
        logger.warning("Order %s not found", order_id)
        raise HTTPException(status_code=404, detail="Order not found")
    logger.info("Computing average item price for %s (%d items)", order_id, len(items))
    return {"order_id": order_id, "average_price": average_item_price(items)}


@router.post("/payments/charge")
async def charge(req: ChargeRequest):
    logger.info("Charging customer=%s amount=%.2f via Stripe", req.customer_id, req.amount)
    logger.warning("Stripe response slower than expected, retrying once")
    result = await call_stripe(req.amount)
    return {"status": "charged", "result": result}
