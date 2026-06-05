# Risk Management Policy Wiki

Status: Draft
Owner: CTO / Platform risk governance
Last reviewed: 2026-05-14
Scope: central policy governance view for Turboflow risk controls across products.

## Purpose

This wiki is the HQ control plane for risk-management policy. It separates policy governance from product implementation, while keeping both visible in one place:

- What is the latest approved policy?
- Which product owns it?
- Where is it implemented?
- What is the implementation status?
- What evidence proves the policy is enforced?
- What gaps or drift need action?

## CTO Control View

| Product / Domain | Policy Page | Policy Status | Implementation Status | Highest Open Risk | Next Decision |
|------|------|------|------|------|------|
| Prediction market | [products/prediction-market.md](products/prediction-market.md) | Draft from v3.0 spec | Partially implemented | High | Decide per-duration volatility and atomic accounting requirements. |
| CEX pair risk controls | [products/cex-risk-controls.md](products/cex-risk-controls.md) | Draft, branch source verified | Implemented with doc drift | Medium | Decide whether `RISK_CONTROL_RULES.md` becomes canonical and update stale READMEs. |
| Risk data inputs | [policy-register.md](policy-register.md) | Indexed | Implemented across oracle/slippage services | Medium | Map runtime config and metrics evidence. |
| Admin/config governance | [policy-register.md](policy-register.md) | Not fully mapped | Unknown | Medium | Inventory DB/sys_config/admin edit surfaces. |

## Wiki Structure

- [index.md](Turboflow-HQ/specs/risk-management/index.md): source map and first-pass review findings.
- [policy-register.md](policy-register.md): central register of policies, controls, owners, versions, status, and evidence.
- [gap-register.md](gap-register.md): prioritized drift, missing evidence, and implementation gaps.
- [governance.md](governance.md): policy lifecycle, versioning rules, review cadence, and change-control workflow.
- [products/prediction-market.md](products/prediction-market.md): prediction-market policy page.
- [products/cex-risk-controls.md](products/cex-risk-controls.md): CEX pair risk policy page.
- [templates/policy-page-template.md](templates/policy-page-template.md): reusable template for new products or risk domains.

## Status Model

Use these status values consistently.

| Dimension | Values | Meaning |
|------|------|------|
| Policy status | `Draft`, `Review`, `Approved`, `Deprecated` | Whether the business/risk rule is accepted as policy. |
| Implementation status | `Not started`, `In progress`, `Partially implemented`, `Implemented`, `Blocked`, `Deprecated` | Whether product code and config enforce the policy. |
| Evidence status | `Missing`, `Linked`, `Verified`, `Stale` | Whether HQ has concrete proof from code/docs/tests/runtime data. |
| Runtime status | `Unknown`, `Disabled`, `Shadow`, `Live`, `Degraded` | Whether the control is currently active in production-like runtime. |

## Control ID Convention

Use stable control IDs so policy, implementation, alerts, tests, and gaps can be tied together.

| Prefix | Domain |
|------|------|
| `RM-PM-*` | Prediction-market controls |
| `RM-CEX-*` | CEX pair/order controls |
| `RM-DATA-*` | Oracle, slippage, spread, volatility, and market-data inputs |
| `RM-CONFIG-*` | Admin, DB, sys_config, and runtime configuration controls |
| `RM-OPS-*` | Monitoring, alerting, runbooks, and release gates |

## Current Priority

1. Promote prediction-market v3.0 into canonical policy pages and decide whether code should match the spec or the spec should match implementation.
2. Canonicalize the CEX risk-control source: branch `RISK_CONTROL_RULES.md` vs older service READMEs.
3. Build a config-surface inventory so each policy has explicit admin/DB/sys_config ownership.
4. Attach evidence to each control: source doc, code path, test, metric, and runtime config.
