# Risk Policy Register

Status: Draft
Owner: CTO / Platform risk governance
Last reviewed: 2026-05-14

This register is the central control view for current Turboflow risk-management policy. Product pages own details; this page owns screening and status.

## Product Policy Register

| Policy ID | Product / Domain | Current Version | Policy Status | Implementation Status | Evidence Status | Runtime Status | Owner | Policy Page |
|------|------|------|------|------|------|------|------|------|
| `RM-PM-POLICY` | Prediction market | v3.0 draft import | Draft | Partially implemented | Linked | Unknown | `surfv2-dex-svm-keeper` owner / CTO | [products/prediction-market.md](products/prediction-market.md) |
| `RM-CEX-POLICY` | CEX pair risk controls | v0.1 draft index | Draft | Implemented with doc drift | Linked | Unknown | `cex-order-service` owner / CTO | [products/cex-risk-controls.md](products/cex-risk-controls.md) |
| `RM-DATA-POLICY` | Slippage, spread, volatility inputs | v0.1 indexed | Draft | Partially implemented | Linked | Unknown | Oracle/slippage owners | [index.md](index.md) |
| `RM-CONFIG-POLICY` | Admin/runtime risk config | v0.1 placeholder | Draft | Unknown | Missing | Unknown | CTO / admin backend owner | TBD |

## Control Register

| Control ID | Product | Control | Policy Version | Policy Status | Implementation Status | Evidence | Open Gap |
|------|------|------|------|------|------|------|------|
| `RM-PM-BAND-001` | Prediction market | Settlement-band net exposure cap | v3.0 draft import | Draft | Partially implemented | `predict_market_risk_service.go`; v3.0 docx | Atomicity approach differs from v3.0. |
| `RM-PM-VOL-001` | Prediction market | Volatility regime and risk weight selection | v3.0 draft import | Draft | Partially implemented | `predict_market_risk_service.go`; v3.0 docx | Implementation uses 30s cache for all durations. |
| `RM-PM-AMOUNT-001` | Prediction market | Per-duration min/max order amount | v0.1 indexed | Draft | Implemented | JSON config doc; keeper order amount checks | Need canonical source for durations and limits. |
| `RM-PM-HOLD-001` | Prediction market | User/platform holding caps | v0.1 indexed | Draft | Implemented | JSON config doc; keeper holding checks | Runtime config surface not mapped. |
| `RM-CEX-TIER-001` | CEX | Tier Tag from `Spread1k` | v0.1 branch rules | Draft | Implemented | `RISK_CONTROL_RULES.md`; `max_leverage_service.go` | Need canonical doc decision. |
| `RM-CEX-PMRM-001` | CEX | PM/RM calculation | v0.1 branch rules | Draft | Implemented | `RISK_CONTROL_RULES.md`; pair risk service docs | Runtime config surface not mapped. |
| `RM-CEX-LEV-001` | CEX | Max leverage from spread, choppiness, funding, market hours | v0.1 branch rules | Draft | Implemented with doc drift | `RISK_CONTROL_RULES.md`; `max_leverage_service.go` | Older README has stale leverage values. |
| `RM-CEX-MMR-001` | CEX | MMR tiers, max order size, holding limits | v0.1 branch rules | Draft | Implemented | `RISK_CONTROL_RULES.md`; `max_leverage_service.go` | Need runtime evidence and admin config map. |
| `RM-CEX-SLIP-001` | CEX | Buffer rate and orderbook slippage controls | v0.1 branch rules | Draft | Implemented | `RISK_CONTROL_RULES.md`; `oracle-slippage` docs | Need metrics/runtime evidence. |
| `RM-DATA-SLIP-001` | Data inputs | Fixed/max slippage and max natural depth | v0.1 indexed | Draft | Implemented | `oracle-slippage/docs/design/SLIPPAGE_CALCULATION_LOGIC.md` | Need consumer map and freshness checks. |
| `RM-CONFIG-ADMIN-001` | Runtime config | Admin/DB/sys_config policy editing surface | v0.1 placeholder | Draft | Unknown | Not yet mapped | Inventory required. |
| `RM-OPS-MON-001` | Monitoring | Risk metrics, alerts, and runbooks | v0.1 placeholder | Draft | Unknown | Not yet mapped | Inventory required. |

## Screening Rules

Review this page first when making risk changes:

- Any control with `High` open gap in [gap-register.md](gap-register.md) needs CTO decision before implementation claims.
- Any policy marked `Approved` must have `Verified` or intentionally scoped evidence.
- Any implementation marked `Implemented` must link code/config evidence.
- Any product release touching order acceptance, leverage, caps, slippage, PM/RM, MMR, or volatility must update this register.
