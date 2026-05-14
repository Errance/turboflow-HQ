---
title: "Turboflow Risk Management Status"
subtitle: "CTO Brief"
date: "2026-05-14 14:07 +08"
---

# Turboflow Risk Management Status

## Executive Summary

Turboflow now has a central Risk Management Policy Wiki in HQ. The wiki gives a governance view across product policy, implementation status, evidence, and gaps.

Current overall status:

| Domain | Policy Status | Implementation Status | Highest Risk |
|---|---|---|---|
| Prediction market | Draft from v3.0 spec | Partially implemented | High |
| CEX pair risk controls | Draft from branch rules and code | Implemented with doc drift | Medium |
| Risk data inputs | Indexed | Partially implemented / evidence linked | Medium |
| Admin/runtime config governance | Draft placeholder | Unknown | Medium |

The biggest CTO decisions are:

1. Whether prediction-market volatility must be independent per duration, as v3.0 specifies, or whether the current 30s shared volatility cache is acceptable.
2. Whether prediction-market band exposure accounting must use Redis WATCH/MULTI/EXEC, Redis scripting, or DB row locks, instead of current `INCRBYFLOAT` plus rollback.
3. Whether `cex-order-service/docs/RISK_CONTROL_RULES.md` becomes the canonical CEX risk policy source, superseding older service READMEs.
4. How to map runtime admin/DB/sys_config fields back to each governed risk control.

## Source Freshness

Latest source checks were performed using workspace-scoped GitHub auth as `thomson-yee`.

| Source | Latest Verified Ref |
|---|---|
| `cex-order-service` `feature/main_fix` | `19dee65c6a640c9c78cc25a481f0a6a362b4347a` |
| `cex-order-service/docs/RISK_CONTROL_RULES.md` blob | `a802158211ee8761113ceb71cc3a0f892dbaa609` |
| `surfv2-dex-svm-keeper` `main` | `55baf70e520b8871a3168b94f997941487f25ea4` |
| HQ risk wiki | Local draft under `Turboflow-HQ/specs/risk-management/` |

## Governance Structure

The HQ risk wiki is structured as:

| File | Purpose |
|---|---|
| `README.md` | CTO dashboard and control view |
| `policy-register.md` | Central policy/control register |
| `gap-register.md` | Open gaps, severity, owner, decision needed |
| `governance.md` | Versioning, review cadence, approval gates |
| `products/prediction-market.md` | Prediction-market policy page |
| `products/cex-risk-controls.md` | CEX risk-control policy page |
| `templates/policy-page-template.md` | Template for future policy pages |

Policy governance and enforcement are separated:

```text
HQ policy wiki
  -> product policy page
  -> control register
  -> implementation evidence
  -> gap register
  -> product repo changes / runtime config changes
```

## Prediction-Market Risk

Policy source:

- `Turboflow_Risk_Management_Spec_v3.0`
- Prediction-market JSON config document
- `surfv2-dex-svm-keeper` implementation

Core controls:

- Settlement-band net exposure cap
- Signed UP/DOWN exposure offsetting
- Risk-weighted notional by duration and volatility regime
- Per-pair and special-period cap overrides
- Per-duration order min/max limits
- User/platform holding limits
- Rollback of risk accounting when downstream order creation fails

Current status: **Partially implemented**.

Key gaps:

| Gap | Severity | Summary |
|---|---|---|
| `RM-GAP-001` | High | v3.0 requires independent volatility regimes per duration, but keeper currently uses the 30s cache for all durations. |
| `RM-GAP-002` | High | v3.0 requires atomic accounting via Redis WATCH/MULTI/EXEC or DB lock; keeper currently uses `INCRBYFLOAT` plus rollback. |
| `RM-GAP-003` | Medium | v3.0 duration/weight set differs from JSON config example. |
| `RM-GAP-004` | Medium | Low-volatility threshold differs: `0.10` vs `0.25`. |
| `RM-GAP-007` | Low | Config doc says `band_width_sec` is `180`, while JSON example and code default use `5`. |

## CEX Risk Controls

Policy source:

- `cex-order-service/docs/RISK_CONTROL_RULES.md` on `feature/main_fix`
- Current `cex-order-service` code
- Older pair risk and max leverage service READMEs
- Oracle/slippage docs

Core controls:

- Tier Tag from `Spread1k`
- PM from `Spread50k`
- RM from `Spread1k`
- Profit Share eligibility
- Max leverage from spread, choppiness, funding rate, market hours, weekend mode
- MMR tiers and max order/holding limits
- Buffer rate and orderbook slippage
- Weekend and stock-close special modes

Current status: **Implemented with doc drift**.

Key gaps:

| Gap | Severity | Summary |
|---|---|---|
| `RM-GAP-005` | Medium | `max_leverage_service_README.md` has stale spread-tier leverage values compared with current code and `RISK_CONTROL_RULES.md`. |
| `RM-GAP-006` | Low | `RISK_CONTROL_RULES.md` links to `RISK_CONTROL_RULES_EN.md`, but the branch does not contain that file. |
| `RM-GAP-008` | Medium | Admin/DB/sys_config edit surfaces for CEX and prediction risk controls are not fully mapped. |
| `RM-GAP-009` | Medium | Metrics, alerts, and runbooks are not fully inventoried. |

## Recommended Next Actions

1. Hold a CTO decision pass for `RM-GAP-001` and `RM-GAP-002`; these are the highest-risk policy/implementation mismatches.
2. Promote `RISK_CONTROL_RULES.md` as canonical CEX policy, or explicitly mark it as branch-only until merged.
3. Create `risk-config-surfaces.md` to map each policy control to DB fields, sys_config keys, admin pages, owners, and release gates.
4. Add evidence columns for tests, metrics, alerts, and runtime config to each high-impact control.
5. Convert high and medium gaps into implementation tickets or explicit risk acceptances.

## Current Readiness View

| Capability | Current Readiness |
|---|---|
| Central policy wiki | Ready as draft |
| Product-level policy pages | Initial pages created |
| Version control model | Defined |
| Implementation status model | Defined |
| Gap tracking | Started |
| Runtime live status | Not yet connected |
| Metrics/alerts evidence | Not yet inventoried |
| Admin config map | Not yet inventoried |

## Conclusion

The governance foundation is now in place. Turboflow can centrally screen risk policy, ownership, implementation status, and gaps from HQ. The next maturity step is to connect policy controls to runtime config, tests, metrics, and alert evidence so the CTO view becomes a live operational control surface rather than a document-only register.
