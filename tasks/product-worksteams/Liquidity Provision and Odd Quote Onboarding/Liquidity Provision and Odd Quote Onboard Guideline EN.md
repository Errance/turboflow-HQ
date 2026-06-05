# Liquidity Provision and Odd Quote Onboard Guideline

**Status:** Ready for review  
**Last updated:** 2026-05-25 18:38 +08  

## 1. How to Set Up a Liquidity Pool

1. Confirm the product scope with TurboFlow:
   - Event Contracts / Up-Down Prediction
   - Football Prediction Market
   - Or both

2. Create or confirm the TurboFlow account that will own / operate the liquidity pool.

3. Complete the required funding preparation:
   - Confirm funding asset.
   - Confirm initial pool amount.
   - Confirm settlement / operating wallet.
   - Confirm risk limit or max exposure.

4. Share the account identifier with TurboFlow:
   - UID / account ID
   - Wallet address, if applicable
   - Supported product and market list

5. TurboFlow creates the dedicated liquidity pool and returns:
   - `pool_id`
   - Supported markets
   - Chain / pool monitoring reference, if applicable
   - Settlement and reconciliation reference, if applicable

6. TurboFlow enables the pool after:
   - Funding is confirmed.
   - Product and market permissions are configured.
   - Pool risk limits are configured.
   - Quote API integration is ready, if the pool is tied to external quotes.

## 2. How to Start the Odd Quote

Use the product-specific API document for the quote integration. TurboFlow will provide environment host, credentials, and allowed market list during onboarding.

| Product | Quote Scope | API Document |
| --- | --- | --- |
| Event Contracts / Up-Down Prediction | Push `up` / `down` `return_rate` by market, such as `BTC-5m` | [Event Contracts v2.2 Odd Quote API](../事件合约（猜涨跌）/v2.2%20-%20多vendor流动性路由方案/API文档%20-%20多vendor流动性路由方案%20v2.2%20EN.md) |
| Football Prediction Market | Push football decimal odds by league, match / series market, and outcome | [Football Prediction Market v2.2 Odd Quote API](足球预测市场做市商赔率报价接口%20v2.2%20EN.md) |

Before starting quote push, confirm with TurboFlow:

- API credential and environment.
- Allowed markets / leagues / outcomes.
- Quote push frequency and expiry rule.
- Heartbeat / reconnect rule.
- Whether `best_quote` subscription is enabled.
