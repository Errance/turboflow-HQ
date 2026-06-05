# Perpetual DEX Trading 永续合约交易

## Product Catalogue

Perpetual DEX Trading is the perpetual futures trading product line. This catalogue tracks product/API notes, vendor integration references, and implementation discussion docs.

## API Docs

- [[Orders Feed API]]

## Source Links

- Notion source: https://www.notion.so/turboflow-Orders-feed-32fd8bbd23318061be83fa607a428de3?source=copy_link
- Reference: Oracle Integration Technical Specification
- External API reference: https://devdoc-3.gitbook.io/devdoc-docs/turboflow-api-doc-1#base-urls

## Progress

2026-05-22

- Created HQ product catalogue for Perpetual DEX Trading.
- Imported and normalized Orders Feed API from Notion into markdown.
- Preserved the original feed semantics:
  - `public_trades`
  - `order_updates`
  - order lifecycle events
  - WebSocket auth/subscribe/unsubscribe/heartbeat flow
