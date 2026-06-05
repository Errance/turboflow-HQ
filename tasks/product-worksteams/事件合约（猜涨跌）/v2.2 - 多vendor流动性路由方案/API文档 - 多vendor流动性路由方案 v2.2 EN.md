# Event Contract Odds Quote API v2.2

| Item | Content |
| --- | --- |
| Document version | v2.2 |
| Last updated | 2026-06-03 |
| Audience | Technical integration teams at **external odds Vendors** |
| Protocol version | Phase 1 |
| Service provider | TurboFlow |
| Chinese version | API文档 - 多vendor流动性路由方案 v2.2 CN.md |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Connection and Authentication](#2-connection-and-authentication)
3. [General Conventions](#3-general-conventions)
4. [Supported Markets](#4-supported-markets)
5. [Message Protocol](#5-message-protocol)
6. [Integration Sequence](#6-integration-sequence)
7. [Error Codes and Rate Limits](#7-error-codes-and-rate-limits)
8. [Integration Checklist](#8-integration-checklist)
9. [Appendix](#9-appendix)

---

## 1. Overview

### 1.1 What TurboFlow Provides

TurboFlow exposes an **inbound WebSocket** endpoint. Vendors push up/down odds (`return_rate`) by predict market. The platform aggregates quotes from multiple Vendors and selects the best price for display and order routing.

### 1.2 What Vendors Need to Do

| Capability | Description |
| --- | --- |
| Establish WebSocket connection | Complete authentication using the Ed25519 `API-KEY / SIGN / TIMESTAMP` method issued by TurboFlow. |
| Query allowed markets (optional) | Call `GET /vendor/predict-quotes/markets` before connecting. |
| Continuously push quotes | Send `quote_batch`; include both `up` and `down` for each market where possible. |
| Keep the connection alive | Respond to server `heartbeat` with `heartbeat_ack` within 30 seconds. |
| Handle ack | Correct data according to `accepted`, `rejected`, and `errors`. |
| Subscribe to best price (optional) | Subscribe to `best_quote` to observe the platform's current best odds (sanitized). |

### 1.3 What Vendors Do Not Need to Do

| Item | Description |
| --- | --- |
| User order placement | Users still place orders through the existing App/API; this WebSocket does not carry trading actions. |
| Treat `best_quote` as an execution guarantee | `best_quote` is for observation only; real orders re-run live price selection on the server. |
| Access competitor information | `best_quote` never exposes winning vendor id, quote id, second-best price, or competitor details. |

### 1.4 Environments and Endpoints

TurboFlow exposes WebSocket and HTTP through the **same public API host** (`{api_host}`). Paths are fixed.

| Capability | Path | Description |
| --- | --- | --- |
| WebSocket quotes | `/ws/vendor/predict-quotes` | Connection, `quote_batch`, heartbeat, and `best_quote`. |
| HTTP allowed markets | `/vendor/predict-quotes/markets` | `GET`; uses the same authentication as WebSocket; optional pre-connection query. |

Full URL format:

| Capability | URL |
| --- | --- |
| WebSocket | `wss://{api_host}/ws/vendor/predict-quotes` |
| HTTP allowed markets | `https://{api_host}/vendor/predict-quotes/markets` |

#### API Hosts by Environment

| Environment | `{api_host}` | WebSocket | HTTP allowed markets |
| --- | --- | --- | --- |
| **UAT** | `api.turboflow-test.xyz` | `wss://api.turboflow-test.xyz/ws/vendor/predict-quotes` | `https://api.turboflow-test.xyz/vendor/predict-quotes/markets` |
| **Production** | Issued by Operations | `wss://{prod_api_host}/ws/vendor/predict-quotes` | `https://{prod_api_host}/vendor/predict-quotes/markets` |

TurboFlow provides the public API key, private seed delivery channel, and `allowed_markets` by environment.

---

## 2. Connection and Authentication

### 2.1 Protocol Requirements

| Item | Value |
| --- | --- |
| Transport | WebSocket over `wss://`. |
| Frame type | JSON **text frames**, UTF-8; Phase 1 does not use binary frames. |
| Subprotocol | None. |

### 2.2 HTTP Upgrade Headers

Authentication is upgraded to the TurboFlow API authentication method:

`https://devdoc-3.gitbook.io/devdoc-docs/turboflow-api-doc-1#authentication`

Both the WebSocket upgrade request and the HTTP `GET /vendor/predict-quotes/markets` request must send the following headers:

| Header | Type | Description |
| --- | --- | --- |
| `API-KEY` | string | Vendor Ed25519 public key, 64-character hex. TurboFlow stores it in `vendor_api_keys.api_key`. |
| `SIGN` | string | Ed25519 signature hex generated for this request. |
| `TIMESTAMP` | string | Unix timestamp in seconds, tolerance +/- 300 seconds. |

If the WebSocket client cannot conveniently set headers, it may fall back to same-name query parameters: `api_key`, `sign`, `timestamp`. Header authentication is recommended.

v2.2 integration no longer uses the old `X-API-KEY / X-API-TS / X-API-SIGN` HMAC flow.

### 2.3 Signature Algorithm

For the current WebSocket and allowed-markets endpoints:

- Method is fixed to `GET`.
- Body is empty.
- `path` uses only the plain URL path and does not include query parameters.
- Every connection / request must generate a new `TIMESTAMP` and `SIGN`. Do not hardcode signatures.

Signing string:

```text
method=GET&path={path}&timestamp={timestamp}&access-key={apiKey}
```

Signing steps:

1. Construct the signing string above.
2. Decode the hex `API-KEY` into bytes and use it as the HMAC-SHA256 key.
3. Run HMAC-SHA256 over the signing string to produce a digest.
4. Decode the Vendor private seed from hex and construct an Ed25519 private key.
5. Sign the HMAC digest with the Ed25519 private key.
6. Put the signature result hex into `SIGN`.

Python example:

```python
import hashlib
import hmac
import time

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey


API_KEY = "your_64_hex_public_key"
PRIVATE_SEED = "your_64_hex_private_seed"
PATH = "/ws/vendor/predict-quotes"


def sign_request(path: str) -> dict[str, str]:
    timestamp = str(int(time.time()))
    message = f"method=GET&path={path}&timestamp={timestamp}&access-key={API_KEY}"
    digest = hmac.new(bytes.fromhex(API_KEY), message.encode("utf-8"), hashlib.sha256).digest()
    private_key = Ed25519PrivateKey.from_private_bytes(bytes.fromhex(PRIVATE_SEED))
    signature = private_key.sign(digest).hex()
    return {
        "API-KEY": API_KEY,
        "SIGN": signature,
        "TIMESTAMP": timestamp,
    }
```

`GET /vendor/predict-quotes/markets` uses path `/vendor/predict-quotes/markets` for signing. WebSocket uses path `/ws/vendor/predict-quotes` for signing.

### 2.4 Clock Skew

| Checkpoint | Rule |
| --- | --- |
| Authentication header `TIMESTAMP` | `abs(server_now_sec - TIMESTAMP) <= 300`. |
| `quote_batch.sent_at` | Millisecond Unix timestamp. TurboFlow validates it according to the configured quote time-skew window. |

If the authentication timestamp is outside the tolerance, WebSocket setup returns **HTTP 401** before the connection is established. If `quote_batch.sent_at` is outside the tolerance, `CLOCK_SKEW` is returned in `ack.errors`.

### 2.5 Authentication Failure

| Scenario | Behavior |
| --- | --- |
| Invalid signature or timestamp skew | HTTP **401**; WebSocket is not established. |
| Vendor status is not enabled | Connection is rejected or immediately closed. |
| Maximum concurrent connection count exceeded | HTTP **429**. |

### 2.6 Concurrent Connections

The same API key (same `vendor_id`) may open multiple concurrent WebSocket connections, subject to the `max_inbound_connections` limit in `keeperPredictVendorRegistry`.

| Configuration | Meaning |
| --- | --- |
| Omitted or `0` | Default **5** concurrent connections. |
| `1` | Only one active inbound connection is allowed; a second connection returns **429** and does not kick the existing connection. |
| `N > 1` | Up to `N` concurrent connections. |

Each connection has independent heartbeat, rate limit, and `best_quote` subscription state. Quotes share the same vendor quote book; avoid using conflicting `vendor_quote_id` values across connections.

---

## 3. General Conventions

| Convention | Description |
| --- | --- |
| `type` | Required for every WebSocket message. |
| Timestamps | Message payloads use millisecond Unix epoch (`int64`), unless a field explicitly states Unix seconds. |
| `return_rate` | Decimal string, range `(0, 1]`, for example `"0.80"`; before price selection, TurboFlow truncates toward zero to at most 6 decimal places. |
| `market` | `{SYMBOL}-{DURATION}`, for example `BTC-5m`, `ETH-1h`. |
| `pair_id` | TurboFlow event contract market id. Include it when known; required in `markets[]` for `best_quote` subscriptions. |
| `outcome` / `side` | `up` = bullish, `down` = bearish. |
| Idempotency | Within a single connection, evaluated by `(vendor_id, vendor_quote_id)`: same content is accepted; different content returns `DUPLICATE_QUOTE_ID`. |

### 3.1 Quote Validity

| Rule | Description |
| --- | --- |
| Continuously valid | Within the validity window, until a new quote for the same market + side is received. |
| Hard expiry | By default, quotes that are not refreshed for **5 minutes** no longer participate in price selection. |
| Refresh recommendation | Even if the price is unchanged, push a full `quote_batch` at least every **5 minutes**. |
| Disconnect | After heartbeat timeout, old quotes no longer participate in price selection; after reconnecting, push `quote_batch` again. |

---

## 4. Supported Markets

### 4.1 Market Format

Aligned with legacy SIG:

```text
BTC-30s, BTC-1m, BTC-3m, BTC-5m, BTC-15m, BTC-1h
ETH-30s, ETH-1m, ETH-3m, ETH-5m, ETH-15m, ETH-1h
```

| Suffix | Duration, seconds |
| --- | --- |
| `*-30s` | 30 |
| `*-1m` | 60 |
| `*-3m` | 180 |
| `*-5m` | 300 |
| `*-15m` | 900 |
| `*-1h` | 3600 |

### 4.2 Permission Scope

Markets that a Vendor may push are strictly equal to the `allowed_markets` configured for that Vendor in the TurboFlow registry.

Important: empty `allowed_markets` means **all markets will be rejected**. Confirm the list with TurboFlow before integration.

### 4.3 HTTP Query for allowed markets

Before opening the WebSocket, the Vendor may query the allowed markets for the current API key.

| Item | Value |
| --- | --- |
| Method / path | `GET /vendor/predict-quotes/markets` |
| Base host | Same `{api_host}` as in 1.4. |
| Authentication | Same `API-KEY / SIGN / TIMESTAMP` authentication as section 2. |
| Success | HTTP **200**, body is a JSON array with no wrapper. |
| No enabled markets | HTTP **200**, `[]`. |
| Authentication failure | HTTP **401**. |
| Service unavailable | HTTP **502** / **503**, temporary error, retry briefly. |

Response example:

```json
[
  {
    "pair_id": 5,
    "market": "BTC-30s",
    "symbol": "BTC",
    "interval_in_seconds": 30
  },
  {
    "pair_id": 5,
    "market": "BTC-5m",
    "symbol": "BTC",
    "interval_in_seconds": 300
  }
]
```

| Field | Type | Description |
| --- | --- | --- |
| `pair_id` | int64 | TurboFlow event contract market id. |
| `market` | string | Same as `quote_batch.market`, for example `BTC-5m`. |
| `symbol` | string | Underlying symbol, for example `BTC`. |
| `interval_in_seconds` | int64 | Period in seconds. |

Python request example:

```python
import requests

headers = sign_request("/vendor/predict-quotes/markets")
response = requests.get(
    "https://api.turboflow-test.xyz/vendor/predict-quotes/markets",
    headers=headers,
    timeout=10,
)
response.raise_for_status()
print(response.json())
```

---

## 5. Message Protocol

### 5.1 Message Types

| Direction | `type` | Description |
| --- | --- | --- |
| Vendor -> Server | `hello` | Optional capability declaration. |
| Vendor -> Server | `quote_batch` | Core batched quote push. |
| Vendor -> Server | `subscribe` | Subscribe to `best_quote`. |
| Vendor -> Server | `unsubscribe` | Unsubscribe from `best_quote`. |
| Vendor -> Server | `heartbeat_ack` | Heartbeat response. |
| Server -> Vendor | `ack` | `quote_batch` processing result. |
| Server -> Vendor | `subscribed` | Subscription confirmation. |
| Server -> Vendor | `best_quote` | Sanitized best quote push. |
| Server -> Vendor | `heartbeat` | Heartbeat probe. |
| Server -> Vendor | `error` | Error frame, for example subscription rejection. |

### 5.2 Vendor -> Server Message Examples

#### (1) `hello`, optional

```json
{
  "type": "hello",
  "client_ts": 1757908892351,
  "markets": ["BTC-5m", "ETH-3m"]
}
```

#### (2) `quote_batch`, core quote push

```json
{
  "type": "quote_batch",
  "vendor_quote_id": "vendor-1757908892351-001",
  "sent_at": 1757908892351,
  "quotes": [
    {
      "pair_id": 5,
      "market": "BTC-5m",
      "outcomes": [
        {
          "outcome": "up",
          "return_rate": "0.80"
        },
        {
          "outcome": "down",
          "return_rate": "0.79"
        }
      ]
    }
  ]
}
```

#### (3) `subscribe`, request for best_quote

Use this message to request the current and subsequent sanitized best quotes.

```json
{
  "type": "subscribe",
  "topic": "best_quote",
  "markets": [
    {
      "pair_id": 5,
      "market": "BTC-5m"
    }
  ],
  "sides": ["up", "down"]
}
```

`markets[]` uses an array of objects, not an array of strings. Each object must identify both `pair_id` and `market` to avoid ambiguity.

#### (4) `unsubscribe`

```json
{
  "type": "unsubscribe",
  "topic": "best_quote",
  "markets": [
    {
      "pair_id": 5,
      "market": "BTC-5m"
    }
  ],
  "sides": ["up"]
}
```

#### (5) `heartbeat_ack`

```json
{
  "type": "heartbeat_ack",
  "server_ts": 1757908892399,
  "client_ts": 1757908892405
}
```

### 5.3 Server -> Vendor Message Examples

#### (1) `ack`, fully accepted

```json
{
  "type": "ack",
  "vendor_quote_id": "vendor-1757908892351-001",
  "accepted": 2,
  "rejected": 0,
  "server_ts": 1757908892399
}
```

#### (2) `ack`, partially rejected

```json
{
  "type": "ack",
  "vendor_quote_id": "vendor-1757908892351-002",
  "accepted": 1,
  "rejected": 1,
  "server_ts": 1757908892399,
  "errors": [
    {
      "market": "BTC-5m",
      "outcome": "down",
      "code": "QUOTE_OUT_OF_RANGE",
      "message": "return_rate must be in (0, 1]"
    }
  ]
}
```

#### (3) `subscribed`

```json
{
  "type": "subscribed",
  "topic": "best_quote",
  "markets": [
    {
      "pair_id": 5,
      "market": "BTC-5m"
    }
  ],
  "sides": ["up", "down"],
  "server_ts": 1757908892399
}
```

#### (4) `best_quote`, valid snapshot / update

```json
{
  "type": "best_quote",
  "event": "snapshot",
  "pair_id": 5,
  "market": "BTC-5m",
  "side": "up",
  "status": "valid",
  "return_rate": "0.80",
  "quote_ts": 1757908892351,
  "selected_at": 1757908892399,
  "quote_age_ms": 48,
  "routing_strategy": "best_return_rate"
}
```

#### (5) `best_quote`, no valid quote

```json
{
  "type": "best_quote",
  "event": "update",
  "pair_id": 5,
  "market": "BTC-5m",
  "side": "up",
  "status": "no_valid_quote",
  "reason": "all_quotes_expired_or_unavailable",
  "selected_at": 1757908894399
}
```

#### (6) `heartbeat`

```json
{
  "type": "heartbeat",
  "server_ts": 1757908892399
}
```

#### (7) `error`

```json
{
  "type": "error",
  "code": "SUBSCRIPTION_DENIED",
  "message": "vendor is not allowed to subscribe to best_quote",
  "server_ts": 1757908892399
}
```

### 5.4 Heartbeat Rules

| Parameter | ms | Description |
| --- | --- | --- |
| `heartbeat_interval_ms` | 10000 | Server sends `heartbeat` about every 10 seconds. |
| `heartbeat_timeout_ms` | 30000 | Disconnect if `heartbeat_ack` is not received within 30 seconds. |

### 5.5 best_quote Privacy and Semantics

`best_quote` never includes:

- `winning_vendor_id`
- `vendor_id`
- `pool_id`
- `quote_id`
- `is_own_quote`
- `second_best_quote`
- Any competitor identity or quote-depth information.

Important: `best_quote` is **not** an execution guarantee. Price selection is re-run when the user places an order.

---

## 6. Integration Sequence

```mermaid
sequenceDiagram
    participant V as Vendor
    participant T as TurboFlow

    opt Query markets (recommended)
        V->>T: GET /vendor/predict-quotes/markets + Ed25519 headers
        T-->>V: 200 JSON array
    end

    V->>T: HTTP Upgrade + API-KEY/SIGN/TIMESTAMP
    T-->>V: 101 WebSocket Established

    opt Subscribe to best_quote
        V->>T: subscribe best_quote
        T-->>V: subscribed
        T-->>V: best_quote snapshot
    end

    loop About every 10s
        T-->>V: heartbeat
        V->>T: heartbeat_ack
    end

    loop Quotes
        V->>T: quote_batch
        T-->>V: ack
    end
```

---

## 7. Error Codes and Rate Limits

### 7.1 `ack.errors` code

| code | Description | Recommended handling |
| --- | --- | --- |
| `QUOTE_OUT_OF_RANGE` | `return_rate` is not in `(0, 1]`. | Correct the odds. |
| `MARKET_INVALID` | Market cannot be parsed / is not configured. | Check the market string. |
| `MARKET_NOT_ALLOWED` | Market is not in `allowed_markets`. | Contact TurboFlow. |
| `CLOCK_SKEW` | `sent_at` is outside the time-skew window. | Sync NTP and resend. |
| `DUPLICATE_QUOTE_ID` | Same `vendor_quote_id` has different content. | Use a new ID or keep the content identical. |
| `MISSING_OUTCOME` | `outcomes` is empty. | Add `up` / `down`. |
| `POOL_NOT_CONFIGURED` | Vendor pool is not configured. | Contact TurboFlow. |
| `RATE_LIMITED` | Rate limit exceeded. | Slow down and retry. |

### 7.2 Connection-Level Errors

| Scenario | Behavior |
| --- | --- |
| Authentication failure | HTTP **401**. |
| Vendor disabled | Connection is closed. |
| Reject ratio too high | More than 30% rejects within 1 minute -> disconnect. |
| Heartbeat timeout | Disconnect; quotes become invalid. |
| Push rate too high | More than 20 `quote_batch` messages per second per connection -> rate-limited or disconnected. |

After disconnecting, reconnect and push `quote_batch` again.

### 7.3 Limits

| Rule | Threshold |
| --- | --- |
| `quote_batch` frequency | <= 20 per connection per second. |
| Batch size | <= 24 markets, each market <= 2 outcomes. |
| Reject disconnect | More than 30% within 1 minute. |
| Heartbeat timeout | No `heartbeat_ack` for 30 seconds. |

---

## 8. Integration Checklist

- Ed25519 `API-KEY / SIGN / TIMESTAMP` authentication is implemented.
- A new `TIMESTAMP` and `SIGN` are generated for every request / connection; signatures are not hardcoded.
- Recommended: call `GET /vendor/predict-quotes/markets` before connecting to validate `allowed_markets`.
- `quote_batch` is implemented; refresh at least once every 5 minutes.
- `best_quote` `subscribe` / `unsubscribe` uses a `markets[]` object array containing both `pair_id` and `market`.
- `ack` / `errors` are handled.
- `heartbeat` -> `heartbeat_ack` is completed within 30 seconds.
- After disconnecting, reconnect and push quotes again.
- Optional `best_quote` subscription is understood as not being an execution commitment.
- UAT covers multiple markets, up/down, reconnect, clock skew, partial reject, and subscription behavior.

---

## 9. Appendix

### 9.1 Contacts

| Topic | Contact |
| --- | --- |
| API key, private seed delivery, hosts | TurboFlow Business / Operations |
| `allowed_markets`, pool config | TurboFlow Technical Integration |
| UAT window | Coordinate with TurboFlow |

### 9.2 Revision History

| Version | Date | Description |
| --- | --- | --- |
| v2.2.2 | 2026-06-03 | Authentication upgraded to TurboFlow Ed25519 `API-KEY / SIGN / TIMESTAMP`; added explicit examples for each WebSocket message type, including `best_quote` subscription requests with `pair_id` + `market`. |
| v2.2.1 | 2026-05-27 | Updated environment endpoint hosts according to the shared endpoint reference. |
| v2.2 | 2026-05-27 | Kept only a single public API host; hid internal Plan A/B from Vendors. |
| v2.1.1 | 2026-05-27 | Historical environment host settings; the current external document exposes only UAT. |
| v2.1 | 2026-05-27 | Recorded the cex-api `GET /vendor/predict-quotes/markets` route and proxy; English version. |
| v2.0 | 2026-05-23 | Initial Vendor-facing API document. |
