# Turboflow Risk Management Index

Status: Draft
Date: 2026-05-14
Scope: cross-repo risk-management source map for later product, architecture, and implementation work.

## Purpose

This index gathers the risk-management materials currently visible in Turboflow HQ and local product repos. It is not the canonical risk spec; it is the working map for finding source documents, code ownership, implementation evidence, and known gaps before the next risk-management pass.

For the CTO governance view, start with [README.md](README.md), then use [policy-register.md](policy-register.md) and [gap-register.md](gap-register.md) for live screening.

## Primary Sources

| Source | Location | Status | Notes |
|------|------|------|------|
| Pre-trade risk management framework v3.0 | `Turboflow_Risk_Management_Spec_v3.0 (1).docx` | Local HQ input, untracked | Canonical product/spec input for 5-second settlement-band exposure control, volatility regimes, risk weights, pre-trade checks, monitoring, and fail-closed behavior. |
| Prediction-market JSON config doc | [`surfv2-dex-svm-keeper/预测市场json配置文档.md`](../../../surfv2-dex-svm-keeper/预测市场json配置文档.md) | Local repo doc | Documents prediction-market order limits, holding limits, period controls, and `band_risk` JSON fields. |
| Prediction-market band-risk implementation | [`surfv2-dex-svm-keeper/domain/services/predict_market_risk_service.go`](../../../surfv2-dex-svm-keeper/domain/services/predict_market_risk_service.go) | Local code evidence | Implements band risk normalization, risk-weight lookup, volatility level refresh, local memory check, Redis accounting, and rollback. |
| Prediction-risk publication / frontend slim schema | [`surfv2-dex-svm-keeper/domain/services/predict_risk_pub.go`](../../../surfv2-dex-svm-keeper/domain/services/predict_risk_pub.go) | Local code evidence | Parses global/pair slim risk blocks and duration-specific order blocking windows. |
| CEX pair risk service doc | [`cex-order-service/docs/pair_risk_service_README.md`](../../../cex-order-service/docs/pair_risk_service_README.md) | Local repo doc | Covers volatility monitoring, dynamic risk parameter adjustment, consecutive-win detection, trade-frequency monitoring, alerting, and slippage management. |
| CEX max leverage service doc | [`cex-order-service/docs/max_leverage_service_README.md`](../../../cex-order-service/docs/max_leverage_service_README.md) | Local repo doc | Covers spread, choppiness, funding-rate, stock-market-hours, MMR, max order size, and leverage downgrade logic. |
| Oracle slippage calculation doc | [`oracle-slippage/docs/design/SLIPPAGE_CALCULATION_LOGIC.md`](../../../oracle-slippage/docs/design/SLIPPAGE_CALCULATION_LOGIC.md) | Local repo doc | Covers order-book to slippage pipeline, fixed and max slippage, max natural depth, Redis/DB/metric updates, and API consumption. |
| CEX risk-control rules doc | `https://github.com/turboflow-xyz/cex-order-service/blob/feature/main_fix/docs/RISK_CONTROL_RULES.md` | Verified on `origin/feature/main_fix` | Branch refreshed as `thomson-yee`; file exists at `cex-order-service` commit `19dee65`. Covers Tier Tag, PM/RM, Profit Share, max leverage, weekend mode, stock close, MMR/order limits, buffer rate, and orderbook slippage. |

## Theme Areas

### Prediction-Market Pre-Trade Band Risk

Primary owner: `surfv2-dex-svm-keeper`

The v3.0 framework defines a pre-trade control where each accepted prediction-market order consumes signed, risk-weighted notional in a short settlement band. UP and DOWN exposure offsets inside the same band, and orders are rejected before acceptance when the absolute net exposure would exceed the configured cap.

Current implementation evidence:

- `normalizePredictBandRiskConfig` supplies defaults for `band_width_sec`, `default_band_cap`, `vol_current_window`, `vol_low_threshold`, `vol_default_level`, and risk weights.
- `buildPredictBandRiskWindow` maps order submit time plus duration into a band key, currently `pm:band:risk:{pair_id}:{band_ts}`.
- `buildPredictBandRiskContribution` signs weighted notional positive for UP/open-long and negative for DOWN/open-short.
- `checkAndAccountPredictBandRisk` performs two-layer accounting: process-local memory check first, then Redis `INCRBYFLOAT` with rollback if Redis pushes the band over cap.
- `getPredictBandRiskCap` applies cap priority: active period override, then pair cap, then default cap.
- `getPredictPeriodRiskWeightMultiplier` supports special period weight multipliers.

Key controls indexed here:

- Settlement-band exposure cap
- Pair-specific cap override
- Special time-period cap override
- Duration and volatility-dependent risk weights
- Period risk-weight multiplier
- Global and per-user holding amount limits
- Per-duration min/max order amount limits
- Frontend/order blocking windows from slim risk JSON

### Volatility Regime And Risk Weights

Primary owner: `surfv2-dex-svm-keeper`, dependent on oracle kline data

The v3.0 spec defines per-timeframe volatility regimes using the last five completed candles and annualized sample standard deviation. The keeper code computes log returns from completed klines and classifies LOW vs NORMAL using configured thresholds.

Important implementation note:

- The code currently updates volatility using `predictVolatilityBaseDuration = 30`.
- `GetPredictVolLevel(pairID, duration)` reads the 30-second cache regardless of the requested order duration.
- This differs from the v3.0 spec statement that each timeframe should have independent volatility history and regime.

### CEX Dynamic Pair Risk

Primary owner: `cex-order-service`

The CEX risk surface is broader than prediction-market band risk. Current docs describe:

- Canonical normal-market rule summary in `RISK_CONTROL_RULES.md` on `cex-order-service` `feature/main_fix`
- Trading-pair tiering from `Spread1k`
- PM from `Spread50k`
- RM from `Spread1k`
- Profit Share eligibility and forced close conditions
- Volatility monitoring and P50 volatility cache
- Dynamic `buffer_rate`, `max_leverage`, position multiplier, and impact-fee adjustment
- High-volatility state management and recovery
- Weekend mode handling for metals, PAXG, and ordinary pairs
- Stock close/open parameter switching
- Consecutive-profit monitoring for pairs and users
- User trade-frequency monitoring
- Alert types for risk adjustment, recovery, consecutive wins, and trade frequency
- PM/RM, hedge, ATR, decimal sync, and slippage-related background loops

### Max Leverage, MMR, And Position Limits

Primary owner: `cex-order-service`

The max leverage flow computes conservative leverage and risk parameters from several signals:

- Spread/liquidity tiers
- Choppiness/volatility
- Funding-rate downgrade logic
- Stock-market open/close state
- Major-coin overrides
- MMR config, max order size, pair max hold limits, base fee rate, and PnL cut

This area should be treated as a risk-control sibling to prediction-market band risk, not a direct implementation of the v3.0 band framework.

### Slippage And Market-Data Risk Inputs

Primary owners: `oracle-slippage`, `cex-oracle-service`, consumers in `cex-api-service` and `cex-order-service`

The slippage docs describe risk inputs that feed order routing, pair config, and risk displays:

- Exchange order books convert into fixed amount levels and maximum natural depth.
- `fixed_slippage`, `max_slippage`, and `max_slippage_amount` have different meanings.
- Tier tags and commodity overrides can multiply slippage.
- Results are written to Redis, DB, and metrics.
- API consumers expose or reuse these values in pair configuration and net-position price adjustment.

## Service Ownership Map

| Area | Primary repo | Supporting repos | Current source type |
|------|------|------|------|
| Prediction-market band risk | `surfv2-dex-svm-keeper` | `base`, `cex-oracle-service` | Spec, config doc, Go implementation |
| Prediction-risk publication and order blocking | `surfv2-dex-svm-keeper` | `cex-api-service` or frontend consumers | Go implementation |
| CEX pair risk adjustment | `cex-order-service` | `cex-oracle-service`, `oracle-slippage`, `base` | Service docs and Go implementation |
| CEX max leverage and MMR | `cex-order-service` | `base`, `cex-mgt-backend` | Service docs and Go implementation |
| Slippage risk inputs | `oracle-slippage`, `cex-oracle-service` | `cex-api-service`, `cex-order-service` | Design docs and Go implementation |
| Admin/runtime configuration | `cex-mgt-backend`, DB-backed `sys_config` | All service consumers | Appsmith export, code references, runtime config |
| Deployment and environment wiring | `amber-helm-charts` | service repos | Helm charts |

## Review Findings

These are evidence-backed issues found during the first index review. They should drive the next dedicated documents or tickets.

| Severity | Area | Finding | Evidence | Next action |
|------|------|------|------|------|
| High | Prediction-market band risk | v3.0 requires independent volatility history and regime per timeframe, but keeper currently refreshes only the 30s volatility cache and reads that cache for every duration. | v3.0 states each timeframe has independent vol history/regime; `predict_market_risk_service.go` uses `predictVolatilityBaseDuration = 30`, calls `updatePredictVolatilityLevelByDuration(30, ...)`, and `GetPredictVolLevel(pairID, duration)` reads the 30s cache. | Decide whether to implement per-duration volatility caches or explicitly revise the v3.0 requirement. |
| High | Prediction-market band risk | v3.0 requires atomic read-modify-write using Redis WATCH/MULTI/EXEC or DB row lock, while keeper uses process-local memory check plus Redis `INCRBYFLOAT` and rollback after second-check failure. | v3.0 atomicity requirement; `accountPredictBandRiskRedis` uses Redis `IncrByFloat`; `checkAndAccountPredictBandRisk` rolls back if `after.Abs()` exceeds cap. | Decide whether current rollback strategy is acceptable under multi-instance concurrency, or replace it with Redis script / WATCH-MULTI / DB lock. |
| Medium | Prediction-market source consistency | Product duration and weight sets differ across v3.0 and the prediction-market JSON example. | v3.0 product scope is `30s/1m/5m/15m/1h`; JSON config example includes `180s`, and uses `60s low/normal = 2/0.7` instead of v3.0 `1.5/0.5`. | Reconcile expected supported durations and default weights before writing implementation tickets. |
| Medium | Prediction-market source consistency | Volatility threshold defaults differ across sources. | v3.0 and keeper normalization default `vol_low_threshold` to `0.10`; JSON config example uses `0.25`. | Decide the canonical threshold and document whether pair overrides are expected. |
| Medium | CEX risk docs | `cex-order-service/docs/max_leverage_service_README.md` is stale relative to current code and `RISK_CONTROL_RULES.md` for spread-based max leverage. | README says `3 <= spread < 7` returns `500x` and `spread >= 7` returns `200x`; current `max_leverage_service.go` and branch `RISK_CONTROL_RULES.md` use `200x` and `100x`. | Treat `RISK_CONTROL_RULES.md` plus code as newer; update or deprecate the stale README. |
| Low | CEX risk docs | `RISK_CONTROL_RULES.md` links to `RISK_CONTROL_RULES_EN.md`, but the branch `docs/` tree does not contain that English file. | `origin/feature/main_fix` docs tree lists `RISK_CONTROL_RULES.md` but no `RISK_CONTROL_RULES_EN.md`. | Remove the link or add the English document if bilingual docs are required. |
| Low | Prediction-market config doc | The `band_risk.band_width_sec` text conflicts with its JSON example. | JSON example uses `band_width_sec: 5`; prose says current value is `180` and describes a 3-minute band. | Correct the config doc once canonical band width is confirmed. |

## Known Gaps And Follow-Ups

1. Decide whether HQ should vendor or mirror the branch-only `cex-order-service/docs/RISK_CONTROL_RULES.md` source, or keep it as an external branch reference.
2. Decide whether v3.0 requires independent volatility regimes per duration, then align keeper code or update the product spec.
3. Reconcile default risk weights across sources:
   - v3.0 spec defaults: `30s=4/1`, `1m=1.5/0.5`, `5m=0.6/0.2`, `15m=0.2/0.05`, `1h=0.1/0.02`.
   - Prediction-market config doc example includes `60s=2/0.7` and `180s=1.2/0.4`.
4. Reconcile volatility threshold defaults:
   - v3.0 spec and keeper normalization default to `0.10`.
   - Prediction-market config doc example uses `0.25`.
5. Fix or clarify the prediction-market config doc text for `band_risk.band_width_sec`: the JSON example uses `5`, while one description line says `180`.
6. Decide whether Redis `INCRBYFLOAT` plus after-the-fact rollback is acceptable for the required atomicity under multi-instance concurrency, or whether Redis scripting / WATCH-MULTI / DB row locking is required.
7. Inventory metrics and alerts actually emitted for band exposure, remaining capacity, rejection counts, stale volatility history, and cache misses.
8. Map admin UI / DB fields that edit prediction-market `band_risk`, CEX pair risk, leverage, MMR, and slippage controls.
9. Add focused tests or test index entries for:
   - accept/reject boundary at cap
   - UP/DOWN offset
   - special period overrides
   - pair cap overrides
   - volatility default behavior
   - concurrent same-band orders
   - rollback after downstream order failure

## Next Work Index

Recommended next documents under this folder:

- `prediction-market-band-risk.md`: reconcile v3.0 spec, keeper implementation, and JSON config into one implementation status document.
- `cex-risk-controls.md`: map pair risk, max leverage, slippage, MMR, funding-rate, and alert controls.
- `risk-config-surfaces.md`: inventory DB/sys_config/admin fields and the services that consume them.
- `risk-control-gap-analysis.md`: convert the known gaps above into prioritized tickets.
