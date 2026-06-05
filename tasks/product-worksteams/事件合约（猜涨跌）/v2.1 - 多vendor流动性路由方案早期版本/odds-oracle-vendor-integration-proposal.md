# TurboFlow Event Contract Odds Oracle & Liquidity Integration

**Tentative integration proposal**  
For liquidity providers and odds quotation vendors

**Version:** Draft v0.1  
**Date:** May 18, 2026  
**Scope:** Event contract up/down markets, vendor liquidity pools, and odds quote ingestion.

**Important note:** This document is a proof-of-concept proposal for technical validation. The final production API schema, authentication method, routing thresholds, and operational limits may change during implementation.

## 1. How Liquidity, Odds Quotes, and Best-Bid Routing Work

TurboFlow hosts event contract markets such as **BTC up/down** and **ETH up/down** over fixed durations including `30s`, `1m`, `3m`, `5m`, `15m`, and `1h`.

At order time, TurboFlow links three pieces of information:

- **Odds quote:** the return rate offered for up/down outcomes, for example `BTC-5m-up = 0.80`.
- **Liquidity pool:** the vendor-specific pool/account that backs the order and carries settlement PnL.
- **Routing decision:** the selected vendor quote and pool for the order, ensuring the vendor that offered the odds also backs the settlement.

In short:

```text
Vendor quote wins
  -> TurboFlow locks the selected odds into the order
  -> order is routed to that vendor's liquidity pool/account
  -> settlement uses the locked odds and selected pool
```

### Best-Quote Routing

TurboFlow will maintain a quote book of valid quotes from all enabled vendors. For each order request, TurboFlow selects the best available route based on:

1. Market and duration, for example `BTC-5m`.
2. Direction, either up or down.
3. Freshness of the vendor quote.
4. Vendor and market permission.
5. Vendor pool health and available capacity.
6. Routing strategy.

The default tentative strategy is **highest valid return rate wins**. Future strategies may include sticky routing windows, threshold-based switching, vendor priority, capacity-aware routing, or risk-adjusted routing.

## 2. How to Onboard as a Liquidity Provider

Liquidity providers follow the standard TurboFlow user liquidity pool creation procedure:

1. Log in to `tf.xyz` and create an account.
2. Complete the fund deposit.
3. Share the account UID with TurboFlow.
4. TurboFlow creates the provider's dedicated liquidity pool.
5. Once the pool is enabled and mapped, the vendor can become eligible for routed order flow.

Operational notes:

- A vendor cannot win routing unless its pool is enabled and healthy.
- TurboFlow may apply quote freshness, exposure, and capacity limits.
- Orders will persist the selected vendor, pool, quote, odds, and routing decision for audit.
- If no valid vendor quote is available, TurboFlow may reject the order or use a configured fallback policy.

## 3. How Odds Vendors Send Quotes to TurboFlow

TurboFlow will provide a vendor-facing WebSocket endpoint for odds push:

```text
wss://<turboflow-domain>/ws/vendor/predict-quotes
```

Authentication is still under final security review. The tentative phase-one option is HMAC-style handshake headers:

- `X-API-KEY`: Vendor API key.
- `X-API-TS`: Unix timestamp in milliseconds.
- `X-API-SIGN`: HMAC signature over `apiKey + timestamp`.

Tentative signature:

```text
X-API-SIGN = HMAC_SHA256(secret, apiKey + timestamp)
```

The message schema below is tentative and provided to validate the integration direction. TurboFlow may adjust field names, acknowledgement format, validation rules, or authentication details before production release.

### Quote Push Message

Vendors send quote batches whenever odds change.

```json
{
  "type": "quote_batch",
  "vendor_quote_id": "vendor-1757908892351-001",
  "sent_at": 1757908892351,
  "quotes": [
    {
      "market": "BTC-5m",
      "outcomes": [
        { "outcome": "up", "return_rate": "0.80" },
        { "outcome": "down", "return_rate": "0.79" }
      ]
    }
  ]
}
```

### Acknowledgement

TurboFlow returns an acknowledgement after validation.

```json
{
  "type": "ack",
  "vendor_quote_id": "vendor-1757908892351-001",
  "accepted": 2,
  "rejected": 0,
  "server_ts": 1757908892399
}
```

### Validation Rules

- **Market format:** `BTC-5m`, `ETH-3m`, etc.
- **Outcome:** `up` or `down`.
- **Return rate:** must be greater than `0` and less than or equal to `1` in the tentative model.
- **Freshness:** `sent_at` must be within the configured clock-skew and quote-age limits.
- **Idempotency:** `vendor_id + vendor_quote_id` should uniquely identify a quote batch.
- **Permission:** vendor must be enabled for the submitted market and duration.

## 4. Open Items Before Production

- **Authentication:** HMAC headers for phase one; PrivateLink, allowlist, mTLS, or client credentials can be evaluated.
- **Routing reaction speed:** UAT can start with immediate best-quote routing; production may use sticky windows or thresholds to reduce route oscillation.
- **Capacity model:** phase one checks pool health and basic capacity; later versions may add per-market and per-side exposure limits.
- **Fallback behavior:** if no vendor quote is valid, default is to reject unless TurboFlow config enables fallback.

## 5. Summary

Liquidity providers supply the capital pool. Odds vendors supply the live return rates. TurboFlow aggregates valid odds quotes, selects the best route according to the configured strategy, and sends each order to the vendor-specific pool that backs the winning quote.

This proposal is intentionally concise and tentative. Final endpoint, authentication, routing thresholds, and production limits will be confirmed during technical onboarding.
