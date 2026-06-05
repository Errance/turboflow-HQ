# Chainlink Production Monitor Final

## Objective
One production-ready live quote monitor for Chainlink-settled products that:
- assumes a 1 second entry delay for every product
- estimates fair `P(Higher)` first
- applies conservative product-level deployment rules
- then converts probability to a two-way quote at the chosen edge

## Source files for dev handoff
- `outputs/chainlink_product_suite_final_models.json`
- `live_chainlink_product_suite_console.html`
- `live_chainlink_product_suite_console.js`
- `build_chainlink_theoretical_mid_suite.py`
- `build_chainlink_production_config.py`
- `build_chainlink_final_config.py`

## Production logic
1. Build live features from:
   - Chainlink mid
   - Binance spot
   - Binance perp
   - recent gap changes and return/vol context
2. Score the fitted raw model.
3. Calibrate raw probability using the saved calibration block.
4. Apply any explicit overlay rules.
5. Apply deployment shrink:
   - `deployed_p = 0.5 + alpha * (model_p - 0.5)`
6. Apply neutral-band logic and probability cap.
7. Convert deployed probability to payouts at user-selected edge:
   - favored payout = `100 * (1 - edge) / p - 100`
   - other payout = `100 * (1 - edge) / (1 - p) - 100`

## Defensive-side floor
- minimum low-side payout is `70`
- no quote may go below `70` on the defensive / favored side
- there is no extra production soft cap beyond what the payout floor already implies

## Product policy
- BTC 30s: flat by default plus delayed basis overlay
- ETH 30s: mild skew only
- BTC 1m: mild skew only
- ETH 1m: mild to moderate skew
- BTC 3m: flat
- ETH 3m: flat
- BTC 5m: flat
- ETH 5m: moderate skew
- BTC 15m: moderate skew
- ETH 15m: moderate skew
- BTC 1h: light skew
- ETH 1h: flat

## BTC 30s explicit overlay
- metric: `delta_gap_spot_1u`
- interpretation: current Chainlink-vs-spot gap minus gap 30 seconds ago
- entry assumption: signal at `t`, trade enters at `t+1s`
- rules:
  - if `delta_gap_spot_1u >= 3bp`, set fair `P(Higher)=55%`
  - if `delta_gap_spot_1u <= -3bp`, set fair `P(Higher)=45%`
  - else if `delta_gap_spot_1u >= 2bp`, set fair `P(Higher)=53%`
  - else if `delta_gap_spot_1u <= -2bp`, set fair `P(Higher)=47%`
  - else use flat `50%`

## Operating note
Weak products are intentionally held flat at `50/50`. That is correct behavior when the fair-mid model does not show trustworthy signal.
