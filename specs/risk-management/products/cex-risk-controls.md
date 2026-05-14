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
| `RM-CEX-SLIP-001` | Buffer rate and slippage | Compute dynamic buffer rate and orderbook slippage from market data. | Implemented | `RISK_CONTROL_RULES.md`; `oracle-slippage` docs | Need metrics and consumer map. |
| `RM-CEX-MODE-001` | Weekend/stock-close modes | Override leverage/Profit Share/PM for metals, PAXG, ordinary pairs, and stock market state. | Implemented | `RISK_CONTROL_RULES.md`; `max_leverage_service.go` | Need runtime evidence. |

## Current Canonicality Decision

Branch `cex-order-service` `feature/main_fix` contains `docs/RISK_CONTROL_RULES.md` at commit `19dee65`. It appears newer than some local service READMEs and matches current spread-based max leverage code better than `max_leverage_service_README.md`.

Recommended interim rule:

- Treat `RISK_CONTROL_RULES.md` plus current code as the newest policy/implementation evidence.
- Treat older READMEs as implementation notes until they are updated or deprecated.

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

## Change Log

| Version | Date | Change | Status |
|------|------|------|------|
| v0.1 draft index | 2026-05-14 | Created central CEX risk policy page from branch risk rules, code, and local docs. | Draft |
