"""Tests for the parts of the demo checkout service that work today.

They cover behaviour a fix must not break. They deliberately do not cover the three
known bugs (no currency, empty order, Stripe down): those are what incidents are about.

Run from the server folder:  python -m unittest discover -s tests -t .
"""
import unittest
import warnings

warnings.filterwarnings("ignore")

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.demo_service.checkout import router


class DemoServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app = FastAPI()
        app.include_router(router)
        cls.client = TestClient(app, raise_server_exceptions=False)

    def test_checkout_in_usd_charges_the_total_in_cents(self):
        resp = self.client.post("/api/demo/checkout", json={"customer_id": "cus_1", "total": 49.99, "currency": "USD"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["amount_cents"], 4999)

    def test_checkout_in_eur_applies_the_exchange_rate(self):
        resp = self.client.post("/api/demo/checkout", json={"customer_id": "cus_1", "total": 100, "currency": "EUR"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["amount_cents"], 10800)

    def test_checkout_rejects_a_missing_total(self):
        resp = self.client.post("/api/demo/checkout", json={"customer_id": "cus_1", "currency": "USD"})
        self.assertEqual(resp.status_code, 422)

    def test_average_price_of_a_normal_order(self):
        resp = self.client.get("/api/demo/orders/ord_1001/average-price")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["average_price"], 52.0)

    def test_unknown_order_is_a_404(self):
        resp = self.client.get("/api/demo/orders/does_not_exist/average-price")
        self.assertEqual(resp.status_code, 404)


if __name__ == "__main__":
    unittest.main()
