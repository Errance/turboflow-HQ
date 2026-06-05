

> Audience: Chainlink ecosystem, partners, and market/PR context  
> Purpose: explain TurboFlow's planned Chainlink integration at a product and solution level without exposing internal implementation details.

## Integration Goal

TurboFlow plans to integrate Chainlink Data Streams as the primary BTC and ETH price source for its event-contract trading experience, starting with prediction-style BTC/ETH markets. The integration is designed to improve price reliability, reduce latency in price-sensitive user journeys, and strengthen the settlement foundation for real-time crypto market products.

TurboFlow will keep its existing oracle infrastructure as a backup source. This gives the product a resilient primary/backup model: Chainlink provides the primary market data layer, while TurboFlow's current pricing system remains available for continuity and operational fallback.

## Solution Brief

The planned integration uses Chainlink Data Streams to deliver low-latency BTC and ETH market data into TurboFlow's pricing infrastructure. TurboFlow's backend services will consume Chainlink stream reports, validate freshness and price quality, and publish normalized prices into the existing trading and settlement pipeline.

At a high level:

```text
Chainlink Data Streams
  -> TurboFlow price infrastructure
  -> primary/backup price selection
  -> BTC/ETH event-contract markets
  -> user-facing order and settlement flows
```

The integration is intended to preserve TurboFlow's existing product interfaces while upgrading the quality of the upstream price source. This allows the product team to improve market data reliability without forcing users or downstream systems through a disruptive migration.

## Why Chainlink Data Streams

Chainlink Data Streams is designed for applications that need low-latency, high-frequency market data with infrastructure suitable for decentralized finance and onchain applications. For TurboFlow, this aligns with three product needs:

- Fast BTC/ETH price updates for time-sensitive event-contract trading.
- A high-availability market data source that can support production trading traffic.
- A future path toward cryptographic/onchain verification if the product roadmap requires stronger settlement guarantees.

## Product Improvements

The integration is expected to improve TurboFlow in several ways:

- Better price freshness: BTC/ETH markets can use Chainlink's low-latency stream reports for more timely order and settlement decisions.
- Stronger reliability model: Chainlink operates as the primary source, while TurboFlow's existing pricing pipeline remains available as backup.
- Cleaner market-data governance: explicit primary/backup source selection makes price behavior easier to monitor, explain, and operate.
- Safer rollout path: the integration can be deployed in shadow mode first, then promoted to primary mode after live comparison.
- Future verification optionality: TurboFlow can later evaluate onchain report verification for products that require stronger trust-minimized settlement.

## Value Add

For users:

- More responsive BTC/ETH market pricing.
- Reduced risk from stale or delayed market data.
- More consistent settlement behavior during volatile market conditions.

For TurboFlow:

- A stronger oracle foundation for event-contract markets.
- Clear operational fallback if the primary stream is unavailable.
- Better observability around price source health, deviation, and fallback rates.
- A foundation for expanding Chainlink-backed market data coverage beyond BTC and ETH.

For the Chainlink ecosystem:

- A production-focused event-contract use case using Chainlink Data Streams.
- A practical example of integrating low-latency market data into a real trading product.
- Potential future expansion into onchain verification, additional crypto assets, and richer market data features.

## Rollout Approach

TurboFlow plans a staged rollout:

1. Shadow mode: ingest Chainlink BTC/ETH prices and compare them against existing pricing without affecting final user-facing prices.
2. Controlled primary mode: enable Chainlink as the primary source for one asset pair, with automatic fallback to TurboFlow's existing price source.
3. Expanded primary mode: enable the same model for the second asset pair after monitoring confirms expected behavior.
4. Production monitoring: track stream health, report freshness, source deviation, and fallback rates.

## Reference Links

- Chainlink Data Streams Overview: https://docs.chain.link/data-streams
- Chainlink Data Streams API Reference: https://docs.chain.link/data-streams/reference/data-streams-api
- Chainlink Data Streams Dashboard: https://data.chain.link/streams
- Chainlink Data Streams SDK: https://github.com/smartcontractkit/data-streams-sdk

