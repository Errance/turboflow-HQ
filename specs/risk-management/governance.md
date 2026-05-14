# Risk Policy Governance

Status: Draft
Owner: CTO / Platform risk governance
Last reviewed: 2026-05-14

## Governance Model

Risk policy is governed in HQ and enforced in product repos.

```text
HQ policy wiki
  -> product policy page
  -> control register
  -> implementation evidence
  -> gap register
  -> product repo changes / runtime config changes
```

HQ does not replace product code or runtime configuration. HQ records the canonical policy, ownership, implementation status, and proof.

## Policy Lifecycle

| Status | Meaning | Required evidence |
|------|------|------|
| `Draft` | Policy is being shaped or extracted from existing docs/specs. | Source doc or product decision reference. |
| `Review` | Policy is ready for CTO/product/risk review. | Impacted products, owners, implementation plan, open questions. |
| `Approved` | Policy is accepted as the current rule. | Version, approver, effective date, source of truth. |
| `Deprecated` | Policy is superseded or no longer active. | Replacement policy or explicit retirement reason. |

## Implementation Lifecycle

| Status | Meaning |
|------|------|
| `Not started` | No implementation identified. |
| `In progress` | Work exists but is not fully enforcing policy. |
| `Partially implemented` | Some controls exist, but policy drift or missing coverage remains. |
| `Implemented` | Code/config enforces policy and evidence is linked. |
| `Blocked` | Implementation cannot proceed until a decision or dependency is resolved. |
| `Deprecated` | Implementation path is no longer active. |

## Versioning Rules

Each product policy page should include:

- Policy ID
- Current version
- Effective date
- Policy status
- Implementation status
- Evidence status
- Runtime status
- Owner
- Source of truth
- Change log

Version format:

```text
vMAJOR.MINOR
```

- Increment `MAJOR` for behavior changes that affect accept/reject decisions, leverage/order limits, caps, thresholds, or risk formulas.
- Increment `MINOR` for clarifications, ownership changes, non-functional evidence updates, or doc-only corrections.

## Change-Control Workflow

1. Update the product policy page with proposed changes and set policy status to `Review`.
2. Update [policy-register.md](policy-register.md) with the new version and changed controls.
3. Add or update gaps in [gap-register.md](gap-register.md) if implementation differs from policy.
4. Open product repo implementation PRs or runtime config tickets.
5. Link code paths, tests, metrics, and config evidence back into the policy page.
6. Mark policy `Approved` only when the decision is accepted.
7. Mark implementation `Implemented` only when enforcement evidence is verified.

## Review Cadence

| Review | Cadence | Output |
|------|------|------|
| CTO risk dashboard scan | Weekly | Updated high/medium gaps and decisions needed. |
| Product policy review | Per release or material risk change | Version bump and implementation status update. |
| Runtime evidence review | Monthly | Metrics/config/test evidence freshness update. |
| Incident-driven review | After any risk incident or major rejection anomaly | Gap entry, policy change, or implementation ticket. |

## Approval Gates

Do not mark a policy as `Approved` unless:

- The policy page names the canonical source of truth.
- Each control has an owner and product domain.
- Expected runtime state is clear.
- Known implementation drift is listed in the gap register.

Do not mark implementation as `Implemented` unless:

- Code path or config path is linked.
- Tests or runtime evidence are linked.
- Rollback or failure behavior is documented for pre-trade controls.
