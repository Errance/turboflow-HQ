# Prediction-Market Risk Policy

Policy ID: `RM-PM-POLICY`
Current version: v3.0 draft import
Policy status: Draft
Implementation status: Partially implemented
Evidence status: Linked
Runtime status: Unknown
Owner: `surfv2-dex-svm-keeper` owner / CTO
Last reviewed: 2026-05-14

## Scope

This policy governs pre-trade risk controls for Turboflow prediction-market orders.

Primary source inputs:

- `Turboflow_Risk_Management_Spec_v3.0 (1).docx`
- [`surfv2-dex-svm-keeper/预测市场json配置文档.md`](../../../../surfv2-dex-svm-keeper/预测市场json配置文档.md)
- [`surfv2-dex-svm-keeper/domain/services/predict_market_risk_service.go`](../../../../surfv2-dex-svm-keeper/domain/services/predict_market_risk_service.go)

## Policy Summary

Prediction-market risk is enforced synchronously before order acceptance. Each order contributes signed, risk-weighted notional to the settlement band where it will settle. UP and DOWN orders offset each other. A new order should be rejected if it would push the absolute net exposure beyond the band cap.

## Governed Controls

| Control ID | Control | Policy Rule | Implementation Status | Evidence | Open Gap |
|------|------|------|------|------|------|
| `RM-PM-BAND-001` | Settlement-band exposure cap | Compute settlement band from submit time + duration; cap absolute signed risk-weighted net exposure. | Partially implemented | `buildPredictBandRiskWindow`, `checkAndAccountPredictBandRisk` | `RM-GAP-002`, `RM-GAP-007` |
| `RM-PM-VOL-001` | Volatility regime and risk weights | Use LOW/NORMAL volatility regime and duration-specific risk weights. | Partially implemented | `refreshPredictVolatilityLevel`, `GetPredictVolLevel` | `RM-GAP-001`, `RM-GAP-003`, `RM-GAP-004` |
| `RM-PM-AMOUNT-001` | Order amount limits | Enforce per-duration min/max order amount. | Implemented | `checkPredictOrderAmountRisk` | `RM-GAP-003` |
| `RM-PM-HOLD-001` | Holding amount limits | Enforce platform/user holding caps before accepting new exposure. | Implemented | `checkPredictHoldingAmountRisk` | Runtime config surface not mapped. |
| `RM-PM-PERIOD-001` | Special period overrides | Apply period-specific cap, risk multiplier, and max amount overrides. | Implemented | `getActivePredictBandRiskPeriod`, `getPredictPeriodRiskWeightMultiplier` | Needs runtime config evidence. |

## Current Policy Defaults To Confirm

| Parameter | v3.0 Spec | Current Code Default / Config Example | Decision Needed |
|------|------|------|------|
| Band width | `5s` | Code default `5`; JSON example `5`; JSON doc prose also says `180` | Confirm `5s` as canonical and fix prose. |
| Vol history size | 5 completed candles per timeframe | Code default `5` | Confirm. |
| Low-vol threshold | `0.10` annualized | Code default `0.10`; JSON example `0.25` | Choose canonical default and override policy. |
| Supported durations | `30s/1m/5m/15m/1h` | JSON example also includes `180s` | Choose supported set. |
| Atomic accounting | Redis WATCH/MULTI/EXEC or DB row lock | Local memory check + Redis `INCRBYFLOAT` + rollback | Decide implementation requirement. |

## Implementation Facts

- Keeper normalizes missing `band_risk` config with defaults.
- Keeper calculates band key as `pm:band:risk:{pair_id}:{band_ts}`.
- Keeper signs UP/open-long exposure positive and DOWN/open-short exposure negative.
- Keeper performs local memory check before Redis accounting.
- Keeper rolls back memory and Redis accounting if a later step fails.
- Current volatility refresh is based on `predictVolatilityBaseDuration = 30`.

## Open Gaps

See [gap-register.md](../gap-register.md):

- `RM-GAP-001`
- `RM-GAP-002`
- `RM-GAP-003`
- `RM-GAP-004`
- `RM-GAP-007`

## Change Log

| Version | Date | Change | Status |
|------|------|------|------|
| v3.0 draft import | 2026-05-14 | Imported v3.0 spec into HQ policy wiki and linked implementation evidence. | Draft |
