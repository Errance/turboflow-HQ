# Orders Feed API

Source: https://www.notion.so/turboflow-Orders-feed-32fd8bbd23318061be83fa607a428de3?source=copy_link

Product: Perpetual DEX Trading

Status: Imported from Notion and normalized for HQ notes.

Last updated in HQ: 2026-05-22

## 1. Overview

TurboFlow provides WebSocket feeds for perpetual DEX trading events. The feed format loosely follows a Binance-style stream model and uses `symbol@stream` subscription topics.

Main feeds:

- `@public_trades`: public market trade stream.
- `@order_updates`: full order lifecycle stream for pending, fill, cancel, and fail events.

Supported order types:

- `market`
- `limit`
- `stop_market`
- `stop_limit`

Important behavior:

- There is a 600 ms delay between `pending` and `fill` / `fail` events for all order types.
- The delay allows oracle price adjustment after receiving the order, so the user's fill price can be controlled before execution.
- Order cancellation does not have the 600 ms delay.

## 2. Endpoint

Base URL reference:

- `https://api.turboflow.xyz/`
- https://devdoc-3.gitbook.io/devdoc-docs/turboflow-api-doc-1#base-urls

WebSocket path:

```text
/realtime/feeds
```

## 3. Feeds

TurboFlow -> SCB feeds:

| Feed | Purpose |
| --- | --- |
| `@public_trades` | Public market data. |
| `@order_updates` | Full order lifecycle: `pending`, `fill`, `cancel`, `fail`. |

Subscription format:

```text
{symbol}@{stream}
```

Example:

```json
{
  "type": "subscribe",
  "symbols": ["BTCUSDT@public_trades", "BTCUSDT@order_updates"]
}
```

## 4. Order Lifecycles

### 4.1 Market Orders

Users cannot cancel market orders.

```text
pending -> fill (full)
        -> fail (insufficient funds)
```

### 4.2 Limit / Stop Market / Stop Limit Orders

Limit-style orders can be cancelled before they are filled.

```text
pending -> fill (partial) -> fill (full) -> done
        -> fill (partial) -> cancel      -> done
        -> cancel                        -> done
        -> fail                          -> done
```

## 5. Message Format

### 5.1 Common Fields

| Field | Meaning |
| --- | --- |
| `f` | Feed / stream type. |
| `e` | Event type. |
| `E` | Event time in milliseconds. |
| `s` | Symbol, such as `BTCUSDT`. |
| `d` | Order ID, for order update events. |
| `o` | Order type: `market`, `limit`, `stop_market`, `stop_limit`. |
| `p` | Price. For fills, this is the fill price. |
| `l` | Limit / trigger price. |
| `q` | Quantity. For fills, this is the fill quantity. |
| `z` | Cumulative filled quantity. |
| `T` | Trade time in milliseconds. |
| `u` | User ATA public key. |
| `S` | Trade direction: `LONG` or `SHORT`. |
| `ps` | Position status: `OPEN_LONG`, `CLOSE_LONG`, `OPEN_SHORT`, `CLOSE_SHORT`. |
| `i` | Transaction signature. |
| `r` | Failure reason, only for `fail` events. |

### 5.2 Side And Position Status

`S` is the pure trade direction:

```text
LONG | SHORT
```

`ps` explicitly tracks the user's position intent:

```text
OPEN_LONG | CLOSE_LONG | OPEN_SHORT | CLOSE_SHORT
```

Notes:

- `@order_updates` should include `ps` on `pending`, `fill`, `cancel`, and `fail`, so all lifecycle events keep the same intent.
- `@public_trades` is public market data and has no user-specific open/close intent, so it omits `ps`.

## 6. Public Trades

Topic:

```text
{symbol}@public_trades
```

Example:

```json
{
  "f": "public_trades",
  "e": "trade",
  "E": 1672515782136,
  "s": "BTCUSDT",
  "t": 12345,
  "p": "68420.50",
  "q": "0.15",
  "T": 1672515782136,
  "S": "LONG"
}
```

`S` can be:

```text
LONG | SHORT
```

For `public_trades`, `S` indicates market direction only, not user position effect.

## 7. Order Updates

Topic:

```text
{symbol}@order_updates
```

Event types:

```text
pending | fill | cancel | fail
```

### 7.1 Market Order Pending

```json
{
  "f": "order_updates",
  "e": "pending",
  "E": 1672515782136,
  "s": "BTCUSDT",
  "d": "ord_8a3f1b",
  "o": "market",
  "p": "68420.50",
  "q": "0.15",
  "T": 1672515782136,
  "u": "7pYQewCygX9wqMLzaNiJz8tkCSDpWDb8AidxBz5...",
  "S": "LONG",
  "ps": "OPEN_LONG"
}
```

### 7.2 Limit Order Pending

```json
{
  "f": "order_updates",
  "e": "pending",
  "E": 1672515782136,
  "s": "BTCUSDT",
  "d": "ord_c72e9f",
  "o": "limit",
  "l": "67500.00",
  "p": "68420.50",
  "q": "1.00",
  "T": 1672515782136,
  "u": "7pYQewCygX9wqMLzaNiJz8tkCSDpWDb8AidxBz5...",
  "S": "LONG",
  "ps": "OPEN_LONG"
}
```

### 7.3 Market Order Filled

The fill event is sent after oracle-price execution.

```json
{
  "f": "order_updates",
  "e": "fill",
  "E": 1672515782736,
  "s": "BTCUSDT",
  "d": "ord_8a3f1b",
  "o": "market",
  "t": 12346,
  "p": "68418.00",
  "q": "0.15",
  "x": "full",
  "z": "0.15",
  "T": 1672515782736,
  "u": "7pYQewCygX9wqMLzaNiJz8tkCSDpWDb8AidxBz5...",
  "i": "4Dt4T64pp7nwfz7BNwDoMJ2gBM6mtgnpBGAqx7N...",
  "S": "LONG",
  "ps": "CLOSE_LONG"
}
```

### 7.4 Limit Order Partial Fill

```json
{
  "f": "order_updates",
  "e": "fill",
  "E": 1672515900000,
  "s": "BTCUSDT",
  "d": "ord_c72e9f",
  "o": "limit",
  "t": 12350,
  "p": "67500.00",
  "q": "0.40",
  "x": "partial",
  "z": "0.40",
  "T": 1672515900000,
  "u": "7pYQewCygX9wqMLzaNiJz8tkCSDpWDb8AidxBz5...",
  "i": "sig_abc...",
  "S": "LONG",
  "ps": "OPEN_LONG"
}
```

When `x = "full"`, `z` equals the original order quantity.

### 7.5 Limit Order Final Fill

```json
{
  "f": "order_updates",
  "e": "fill",
  "E": 1672516000000,
  "s": "BTCUSDT",
  "d": "ord_c72e9f",
  "o": "limit",
  "t": 12355,
  "p": "67500.00",
  "q": "0.60",
  "x": "full",
  "z": "1.00",
  "T": 1672516000000,
  "u": "7pYQewCygX9wqMLzaNiJz8tkCSDpWDb8AidxBz5...",
  "i": "sig_def..."
}
```

### 7.6 Limit Order Cancelled After Partial Fill

```json
{
  "f": "order_updates",
  "e": "cancel",
  "E": 1672516100000,
  "s": "BTCUSDT",
  "d": "ord_c72e9f",
  "o": "limit",
  "l": "67500.00",
  "q": "1.00",
  "z": "0.40",
  "T": 1672516100000,
  "u": "7pYQewCygX9wqMLzaNiJz8tkCSDpWDb8AidxBz5..."
}
```

### 7.7 Execution Failed

Example reason: insufficient funds.

```json
{
  "f": "order_updates",
  "e": "fail",
  "E": 1672515782800,
  "s": "BTCUSDT",
  "d": "ord_9b4e2c",
  "o": "market",
  "r": "insufficient_funds",
  "p": "68420.50",
  "q": "0.15",
  "z": "0",
  "T": 1672515782800,
  "u": "7pYQewCygX9wqMLzaNiJz8tkCSDpWDb8AidxBz5...",
  "S": "LONG",
  "ps": "OPEN_LONG"
}
```

## 8. WebSocket Protocol

The feed follows the same WebSocket feed pattern as the Oracle Integration Technical Specification.

### 8.1 Connect

Open WebSocket connection:

```text
/realtime/feeds
```

### 8.2 Auth

```json
{
  "type": "auth",
  "token": "..."
}
```

### 8.3 Subscribe

```json
{
  "type": "subscribe",
  "symbols": ["BTCUSDT@public_trades", "BTCUSDT@order_updates"]
}
```

### 8.4 Unsubscribe

```json
{
  "type": "unsubscribe",
  "symbols": ["BTCUSDT@order_updates"]
}
```

### 8.5 Heartbeat

Server pings every 30 seconds. Client must respond with pong.

```text
server ping interval: 30s
client response: pong
```

## 9. Review Notes

- The source Notion examples contained JavaScript-style comments inside JSON examples. This HQ copy preserves field semantics but normalizes examples as valid JSON.
- Some source examples omit `S` / `ps` on later lifecycle events. The Notion note says `@order_updates` should include `ps` on `pending`, `fill`, `cancel`, and `fail`; implementation should confirm whether all examples should be updated to include `S` and `ps` consistently.
- The source mentions a 600 ms pending-to-fill/fail delay for oracle adjustment. This behavior should be reviewed with product and risk before implementation commitments.
