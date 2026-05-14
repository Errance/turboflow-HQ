# Risk Source Assets

Status: Draft
Last reviewed: 2026-05-14

This folder stores source artifacts that inform risk policy but are not themselves normalized policy pages.

## Inventory

| Asset | Type | Status | SHA-256 | Summary | Related Policy |
|------|------|------|------|------|------|
| [`exchange_margin_leverage_framework_10m_2m_1m_500k.pdf`](exchange_margin_leverage_framework_10m_2m_1m_500k.pdf) | PDF | Candidate CEX margin/leverage source | `45fd2bf59c520decb2462739ef509da435a2c987a418f7bcb09997cdc0cde550` | Exchange perpetuals margin and leverage framework with 4-tier coin classification, rescaled position caps, formulaic IMR/MMR, maintenance margin deduction, and max caps of `10m/2m/1m/500k`. | `RM-CEX-MARGIN-002`, `RM-CEX-LEV-001`, `RM-CEX-MMR-001` |

## Asset Notes

### Exchange Perpetuals: Margin & Leverage Framework

Observed content from the PDF:

- Title: `Exchange Perpetuals: Margin & Leverage Framework`
- Subtitle: `4-tier coin classification | Rescaled position caps | Formulaic MMR | Exact maintenance deduction`
- Core formulas:
  - `IMR = 1 / Max_Leverage`
  - `MMR = 1 / (2 x Max_Leverage)`
  - `Initial Margin = Position_Value / Max_Leverage`
  - `Maintenance Margin = Position_Value x MMR - MD`
  - `MD(n) = MD(n-1) + Upper_Bound(n-1) x [MMR(n) - MMR(n-1)]`
- Tier summary:
  - Tier 1: `BTC`, `ETH`, `SOL`, `XRP`, `BNB`; max leverage `200x`; max position cap `$10,000,000`; 8 brackets.
  - Tier 2: Binance 1K spread `< 3 bp`; max leverage `100x`; max position cap `$2,000,000`; 7 brackets.
  - Tier 3: Binance 1K spread `3-7 bp`; max leverage `50x`; max position cap `$1,000,000`; 6 brackets.
  - Tier 4: low liquidity / long tail; max leverage `20x`; max position cap `$500,000`; 5 brackets.

Policy treatment:

- This asset is not yet marked canonical.
- Its leverage and cap values differ from the current `cex-order-service` `RISK_CONTROL_RULES.md` source indexed in HQ.
- Treat it as a new candidate margin/leverage framework until CTO/product/risk decision confirms whether it supersedes current CEX rules.
