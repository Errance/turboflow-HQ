# Risk Gap Register

Status: Draft
Owner: CTO / Platform risk governance
Last reviewed: 2026-05-14

This register tracks drift between policy, implementation, docs, tests, runtime config, and monitoring evidence.

## Open Gaps

| Gap ID | Severity | Domain | Related Controls | Gap | Evidence | Owner | Decision Needed | Status |
|------|------|------|------|------|------|------|------|------|
| `RM-GAP-001` | High | Prediction market | `RM-PM-VOL-001` | v3.0 requires independent volatility regimes per timeframe, but keeper uses 30s volatility for all durations. | v3.0 docx; `predictVolatilityBaseDuration = 30`; `GetPredictVolLevel(pairID, duration)` reads 30s cache. | Keeper owner / CTO | Implement per-duration volatility or revise policy. | Open |
| `RM-GAP-002` | High | Prediction market | `RM-PM-BAND-001` | v3.0 requires atomic read-modify-write with Redis WATCH/MULTI/EXEC or DB row lock, but keeper uses `INCRBYFLOAT` with rollback. | v3.0 docx; `accountPredictBandRiskRedis`; `checkAndAccountPredictBandRisk`. | Keeper owner / CTO | Accept current concurrency behavior or change implementation. | Open |
| `RM-GAP-003` | Medium | Prediction market | `RM-PM-VOL-001`, `RM-PM-AMOUNT-001` | Product duration and risk-weight sets differ across v3.0 and JSON config. | v3.0 has `30s/1m/5m/15m/1h`; JSON includes `180s` and different `60s` weights. | Keeper owner / CTO | Choose canonical supported durations and default weights. | Open |
| `RM-GAP-004` | Medium | Prediction market | `RM-PM-VOL-001` | Volatility threshold default differs: `0.10` vs `0.25`. | v3.0 and code default `0.10`; JSON example uses `0.25`. | Keeper owner / CTO | Choose canonical threshold and override policy. | Open |
| `RM-GAP-005` | Medium | CEX | `RM-CEX-LEV-001` | `max_leverage_service_README.md` is stale relative to current code and branch risk rules. | README says spread tier leverage is `500x/200x`; code and branch rules use `200x/100x`. | Order-service owner | Update/deprecate stale README. | Open |
| `RM-GAP-006` | Low | CEX | `RM-CEX-POLICY` | `RISK_CONTROL_RULES.md` links to missing English doc. | Branch docs tree lacks `RISK_CONTROL_RULES_EN.md`. | Order-service owner | Add English doc or remove link. | Open |
| `RM-GAP-007` | Low | Prediction market | `RM-PM-BAND-001` | Prediction config doc contradicts itself on `band_width_sec`. | JSON uses `5`; prose says `180`. | Keeper owner | Correct doc after canonical band width is confirmed. | Open |
| `RM-GAP-008` | Medium | Runtime config | `RM-CONFIG-ADMIN-001` | Admin/DB/sys_config edit surfaces for risk policy are not mapped. | Current index only names likely repos. | Admin backend owner / CTO | Inventory fields, owners, and release gates. | Open |
| `RM-GAP-009` | Medium | Monitoring | `RM-OPS-MON-001` | Metrics/alerts/runbooks are not fully inventoried. | v3.0 specifies metrics and alerts; implementation evidence not yet mapped. | Platform owner | Inventory emitted metrics, alerts, and runbook paths. | Open |
| `RM-GAP-010` | Medium | CEX | `RM-CEX-MARGIN-002`, `RM-CEX-LEV-001`, `RM-CEX-MMR-001` | New exchange margin/leverage PDF proposes tier max leverage and position caps that differ from current CEX risk policy and implementation. | PDF proposes Tier 1/2/3/4 max leverage `200x/100x/50x/20x` and caps `$10m/$2m/$1m/$500k`; current branch rules/code use different CEX leverage and MMR tables. | CTO / Order-service owner | Decide whether PDF is future canonical policy, replacement policy, or reference-only artifact. | Open |

## Closed Gaps

| Gap ID | Closed Date | Resolution |
|------|------|------|
| _None yet_ | | |

## Triage Rules

- `High`: policy and implementation may materially disagree on order acceptance, exposure cap, leverage, or concurrency safety.
- `Medium`: policy or docs disagree, or enforcement exists but evidence/config ownership is unclear.
- `Low`: documentation hygiene, missing bilingual docs, naming, or minor consistency work.

Each open high gap should have either:

- a product implementation ticket,
- a CTO policy decision,
- or an explicit risk acceptance entry.
