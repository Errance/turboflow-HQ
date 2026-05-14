# CEX Pair Risk Controls Policy

Policy ID: `RM-CEX-POLICY`
Current version: v0.1 draft index
Policy status: Draft
Implementation status: Implemented with doc drift
Evidence status: Linked
Runtime status: Unknown
Owner: `cex-order-service` owner / CTO
Last reviewed: 2026-05-14

## Scope

This policy governs CEX pair-level risk controls, including tiering, PM/RM, Profit Share, max leverage, MMR, order limits, buffer rate, slippage, weekend mode, stock close behavior, and alerting.

Primary source inputs:

- `https://github.com/turboflow-xyz/cex-order-service/blob/feature/main_fix/docs/RISK_CONTROL_RULES.md`
- [`../source-assets/exchange_margin_leverage_framework_10m_2m_1m_500k.pdf`](../source-assets/exchange_margin_leverage_framework_10m_2m_1m_500k.pdf)
- [`cex-order-service/domain/services/max_leverage_service.go`](../../../../cex-order-service/domain/services/max_leverage_service.go)
- [`cex-order-service/docs/pair_risk_service_README.md`](../../../../cex-order-service/docs/pair_risk_service_README.md)
- [`cex-order-service/docs/max_leverage_service_README.md`](../../../../cex-order-service/docs/max_leverage_service_README.md)
- [`oracle-slippage/docs/design/SLIPPAGE_CALCULATION_LOGIC.md`](../../../../oracle-slippage/docs/design/SLIPPAGE_CALCULATION_LOGIC.md)

## Policy Summary

CEX risk is primarily enforced by scheduled and event-driven parameter updates. Market data and slippage services produce spread, orderbook, slippage, kline, and volatility inputs. `cex-order-service` consumes those inputs and writes pair-level limits and risk parameters that order paths and API consumers enforce.

## Governed Controls

| Control ID | Control | Policy Rule | Implementation Status | Evidence | Open Gap |
|------|------|------|------|------|------|
| `RM-CEX-TIER-001` | Tier Tag | Classify pairs by major coin and `Spread1k`. | Implemented | `RISK_CONTROL_RULES.md`; code references | Need canonical doc decision. |
| `RM-CEX-PMRM-001` | PM/RM | Compute PM from `Spread50k`; compute RM from `Spread1k`. | Implemented | `RISK_CONTROL_RULES.md`; pair risk docs | Need runtime evidence. |
| `RM-CEX-PS-001` | Profit Share eligibility | Enable/disable by tier, spread, market mode, and symbol class. | Implemented | `RISK_CONTROL_RULES.md`; max leverage service docs | Need admin/config map. |
| `RM-CEX-LEV-001` | Max leverage | Use conservative result from spread, choppiness, funding-rate, stock state, and weekend mode. | Implemented with doc drift | `RISK_CONTROL_RULES.md`; `max_leverage_service.go` | `RM-GAP-005` |
| `RM-CEX-MMR-001` | MMR and order limits | Set MMR tiers, max order size, pair hold limits, PnL cut, base fee by tier. | Implemented | `RISK_CONTROL_RULES.md`; `max_leverage_service.go` | Need runtime evidence. |
| `RM-CEX-MARGIN-002` | Candidate 4-tier margin/leverage framework | Proposed exchange perpetuals framework with formulaic IMR/MMR, exact maintenance deduction, and caps `10m/2m/1m/500k`. | Not started | `exchange_margin_leverage_framework_10m_2m_1m_500k.pdf` | `RM-GAP-010` |
| `RM-CEX-SLIP-001` | Buffer rate and slippage | Compute dynamic buffer rate and orderbook slippage from market data. | Implemented | `RISK_CONTROL_RULES.md`; `oracle-slippage` docs | Need metrics and consumer map. |
| `RM-CEX-MODE-001` | Weekend/stock-close modes | Override leverage/Profit Share/PM for metals, PAXG, ordinary pairs, and stock market state. | Implemented | `RISK_CONTROL_RULES.md`; `max_leverage_service.go` | Need runtime evidence. |

## Current Canonicality Decision

Branch `cex-order-service` `feature/main_fix` contains `docs/RISK_CONTROL_RULES.md` at commit `19dee65`. It appears newer than some local service READMEs and matches current spread-based max leverage code better than `max_leverage_service_README.md`.

Recommended interim rule:

- Treat `RISK_CONTROL_RULES.md` plus current code as the newest policy/implementation evidence.
- Treat older READMEs as implementation notes until they are updated or deprecated.
- Treat the new exchange margin/leverage PDF as a candidate source until CTO/product/risk decides whether it supersedes current CEX rules.

## Candidate Margin/Leverage Framework

The source asset [`exchange_margin_leverage_framework_10m_2m_1m_500k.pdf`](../source-assets/exchange_margin_leverage_framework_10m_2m_1m_500k.pdf) proposes a separate exchange perpetuals margin/leverage framework:

| Tier | Classification | Max Leverage | Max Position Cap | Brackets |
|------|------|------|------|------|
| Tier 1 | `BTC`, `ETH`, `SOL`, `XRP`, `BNB` | `200x` | `$10,000,000` | 8 |
| Tier 2 | Binance 1K spread `< 3 bp` | `100x` | `$2,000,000` | 7 |
| Tier 3 | Binance 1K spread `3-7 bp` | `50x` | `$1,000,000` | 6 |
| Tier 4 | Low liquidity / long tail | `20x` | `$500,000` | 5 |

It also defines formulaic margin rules:

- `IMR = 1 / Max_Leverage`
- `MMR = 1 / (2 x Max_Leverage)`
- `Initial Margin = Position_Value / Max_Leverage`
- `Maintenance Margin = Position_Value x MMR - MD`
- `MD(n) = MD(n-1) + Upper_Bound(n-1) x [MMR(n) - MMR(n-1)]`

This conflicts with the currently indexed CEX risk rules and implementation, so it is tracked as `RM-CEX-MARGIN-002` and `RM-GAP-010`.

## Implementation Facts

- Tiering is based on major coin status and `Spread1k`.
- Max leverage spread tier currently uses `<3 -> 1000x`, `[3,7) -> 200x`, `>=7 -> 100x`.
- MMR/order-limit tiers are tier-specific.
- Funding-rate downgrade can force leverage to `25x`.
- Weekend mode affects metals, PAXG, and ordinary pairs differently.
- Stock close mode forces stock-pair leverage and Profit Share behavior.
- Slippage inputs depend on orderbook-derived `fixed_slippage`, `max_slippage`, and `max_slippage_amount`.

## Open Gaps

See [gap-register.md](../gap-register.md):

- `RM-GAP-005`
- `RM-GAP-006`
- `RM-GAP-008`
- `RM-GAP-009`
- `RM-GAP-010`

## Change Log

| Version | Date | Change | Status |
|------|------|------|------|
| v0.1 draft index | 2026-05-14 | Created central CEX risk policy page from branch risk rules, code, and local docs. | Draft |
