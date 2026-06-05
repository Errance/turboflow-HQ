# 预测市场 Chainlink 报价 — 需求说明

本文档描述预测市场（事件合约）BTC/ETH 接入 **Chainlink Data Streams** 的业务需求、架构约定与接口行为，供 `cex-oracle-service`、`surfv2-dex-svm-keeper`、`cex-api-service` 及前端联调使用。

**范围**：一期仅 **BTC、ETH**；通过 **新增 event 专用 `pair_id`** 与 **独立 oracle** 实现与永续（perp）价格隔离。

**落地方案**：[predict-market-chainlink-pair-implementation.md](predict-market-chainlink-pair-implementation-max.md)

---

## 1. 背景与目标

### 1.1 背景

预测市场的开仓、结算、K 线、Tick 需要独立、可审计的价格源。业务要求预测 BTC/ETH 使用 **Chainlink Data Streams**，与永续使用的 **CEX 聚合价** 分离。

现网 event 与 perp **共用 `pair_id` 5 / 6**（同一 oracle）。切流后拆为两套 pair + 两套 oracle，**perp 行保留不变**。

### 1.2 目标

| 目标 | 说明 |
|------|------|
| 预测定价 | event Tick / K 线来自 **Chainlink（主）+ CEX（备，方案 C）** |
| 架构解耦 | **新增 event 专用 Pair + oracle**，不引入 `biz_type` / `bt` 双轨 |
| 永续不变 | **perp 继续 `pair_id` 5（ETH）、6（BTC）**；原 oracle、CEX 配置不变 |
| 预测专用 | **event 使用 `pair_id` 15（ETH）、16（BTC）**；独立 Chainlink oracle |
| 协议兼容 | Keeper、cex-api **不改 WS/HTTP 协议**；客户端按配置切换 `pair_id` |
| 历史连续 | 上线时将 **5→15、6→16** 的 Tick/K 线 **只读复制**；切流后 event 新价仅 Chainlink 路径 |

### 1.3 设计原则

1. **新增 Pair**：perp / event 各用独立 `pair_id` + 独立 `oracle_key` / `oracle_id`。
2. **Chainlink 为 quote_source**：与 Binance/OKX 同级接入 Oracle，不走业务侧双轨字段。
3. **配置域分离**：**perp 看 `trade_pool_pairs`**；**event 看 `chain_predict_config`**（经 Redis 下发）。
4. **方案 C（主备）**：Chainlink 健康时 **仅 Chainlink**；不可用时不混价，切 CEX 兜底；恢复自动切回。
5. **同名 `pair_name`**：5/15=`ETH/USDT`，6/16=`BTC/USDT`；隔离靠 **`pair_id` + `oracle_key`**（§2.4 #15）。

---

## 2. 已确认需求（冻结）

| # | 项 | 结论 |
|---|-----|------|
| 1 | 一期币对 | **仅 BTC、ETH** |
| 2 | 隔离方式 | **新 `pair_id` + 新 oracle**（不用 `biz_type` 双轨） |
| 3 | **B1 pair_id** | **perp**：ETH **5**、BTC **6**（保留）；**event**：ETH **15**、BTC **16**（新建） |
| 4 | **B4 pair_name** | perp / event **同名**（5/15=`ETH/USDT`，6/16=`BTC/USDT`）；**无 `-PM` 后缀** |
| 5 | 定价 | **方案 C**：Chainlink 主，CEX 备，不混价 |
| 6 | 配置域 | **perp → `trade_pool_pairs`**；**event → `chain_predict_config`**，互不影响 |
| 7 | event 列表 | 15/16 在 `trade_pool_pairs` **`status` 非 active** → 不进 perp 列表（**D2**） |
| 8 | Keeper WS | 价格 WS **零改**；仍 `SetPairTicker(pairID)` |
| 9 | Keeper 开仓 | **D1**：`CreateOrderForPredictMarket` **去掉** `IsOpenTrading`；保留 `EnablePredictMarket` + Redis 预测配置 |
| 10 | cex-api | **零业务代码**（D2）；event 用 `spot_token_key` 15/16 |
| 11 | Chainlink 凭证 | **`sys_config`** 单键 JSON（见落地 §5.7） |
| 12 | 延迟告警 | Chainlink **30s** 无新 Tick 视为异常；复用 Oracle → Slack（**A2**） |
| 13 | **B2 CEX 兜底** | 从 perp **5/6** 对应 oracle 的 `price_rule` **复制 CEX 部分**；event 前插 Chainlink |
| 14 | **B3 历史数据** | 上线 **只读复制** 5→15、6→16 的 Tick/K 线；5/6 及 oracle **保留** |
| 15 | 统计 / 风控 | **本期 P0**：中间表 **`oracle_key` 聚合** + **`pair_id` 回写**；停用 `Where("pair_name=?")` |
| 16 | 切流 | **关预测 → 清在途单 → 升级 → 复制历史 → 切配置 → 开预测** |

---

## 3. 架构概览

### 3.1 pair 分工

| 业务 | 资产 | `pair_id` | `pair_name` | oracle |
|------|------|-----------|-------------|--------|
| Perp | ETH | **5** | `ETH/USDT` | 现网 CEX（不变） |
| Perp | BTC | **6** | `BTC/USDT` | 现网 CEX（不变） |
| Event | ETH | **15** | `ETH/USDT` | 新建 Chainlink + CEX 备 |
| Event | BTC | **16** | `BTC/USDT` | 新建 Chainlink + CEX 备 |

### 3.2 逻辑结构

```text
┌─ Perp ── trade_pool_pairs（5 / 6）────────────────────────────┐
│  status = active；enable_predict_market = false               │
│  oracle → CEX（不变）                                          │
└───────────────────────────────────────────────────────────────┘

┌─ Event ── chain_predict_config + trade_pool_pairs（15 / 16）──┐
│  chain_predict_config.status = active → Redis → /pm/config    │
│  trade_pool_pairs.status = 非 active（仅 perp 列表排除）        │
│  enable_predict_market = true；oracle → Chainlink + CEX 备     │
└───────────────────────────────────────────────────────────────┘
```

### 3.3 数据流

```text
Chainlink Data Streams
        ▼
exchanges/chainlink（新 quote_source）
        ▼
GetTokenPriceRule（方案 C）
        ├─► /ws/price → Keeper SetPairTicker(15/16) → 预测开/结算
        └─► quote → kline_{event_oracle_id}_*
                    ▼
            cex-api：/market/kline（spot_token_key=15/16）
            WS：dex_ticker.15 / dex_ticker.16

（并行）perp 5/6 → 原 CEX oracle → kline_{perp_oracle_id}_*（不变）
```

### 3.4 分叉主键

| 层级 | 主键 |
|------|------|
| 业务路由 | **`pair_id`**（5/6 vs 15/16） |
| 定价 / K 线存储 | **`oracle_key`** / **`oracle_id`** |
| 统计 / buffer | **`oracle_key`** 聚合；回写 **`pair_id`** |
| event 展示 / 下单 | **`chain_predict_config`** → Redis `PairConfigs` |

---

## 4. 功能需求

### 4.1 预测价格源（F1）

- event BTC/ETH 各 **新建** `trade_pool_pairs` 行 + **新建** oracle pair。
- event oracle `price_rule`：**Chainlink 主 + CEX 兜底**（方案 C）。
- 聚合价、Tick、K 线写入 **新 `oracle_id`**，与 perp 隔离。

### 4.2 K 线与 Tick（F2）

- K 线粒度与现网一致（minute / hour / day / second 等）。
- Tick：Oracle WS → Keeper `SetPairTicker(15/16)` → cex-api `dex_ticker.15/16`。
- **历史**：切流前从 perp oracle（5/6）**只读复制**至 event oracle（15/16）；切流后 event 新数据 **仅 Chainlink（方案 C）**。

### 4.3 Perp 与 Event 分离（F3）

| 业务 | 配置表 | 展示 / 列表 | 下单 |
|------|--------|------------|------|
| Perp | `trade_pool_pairs` | `status ∈ {active, closing}` | 永续撮合 |
| Event | `chain_predict_config` | `/pm/config` ← Redis | Keeper 预测校验 + 全局开关 |

> `trade_pool_pairs.status` **不是** event 开关；event **不读** perp `status`。  
> `enable_predict_market` 为 Keeper 预测下单 **辅助校验**，非 `/pm/config` 数据源。

| 维度 | Perp（5/6） | Event（15/16） |
|------|------------|----------------|
| `enable_predict_market` | false | true |
| `max_leverage` | 正常 | **0** |
| `status` | active | **非 active** |
| 价格源 | CEX | Chainlink + CEX 备 |

### 4.4 方案 C 主备（F5）

| 状态 | 行为 |
|------|------|
| Chainlink **健康有价** | 对外价 **仅 Chainlink** |
| Chainlink **断线 / 超时 / 无价** | **CEX 兜底**（`price_rule` 中非 chainlink 源） |
| Chainlink **恢复** | **自动切回** Chainlink |

> 现网多源默认「健康则混价」，**不满足**预测需求；须在 `GetTokenPriceRule` 过滤（见落地 §4.2）。

### 4.5 同名 `pair_name` 与统计（B4 / #15）

- 5/15、6/16 **`pair_name` 同名**；用户链路 **只认 `pair_id`**，无 `-PM`、无前端映射问题。
- buffer / choppiness 等 **禁止** 再按 `pair_name` 写库；**必须** `oracle_key` 分桶 + `pair_id` 回写（落地 §4.5）。

---

## 5. 非功能需求

| 项 | 要求 |
|----|------|
| 可用性 | CEX 兜底；Chainlink 短时不可用不致长期无价 |
| 监控 | 30s 无 Tick → 异常；Oracle Slack（A2） |
| 切流 | 关预测 → 清在途 → 升级；**5/6 保留**，**新建 15/16** |
| 兼容性 | Keeper / cex-api 协议不变；前端从 `/pm/config` 读 **15/16** |
| 凭证 | Chainlink → `sys_config` |

---

## 6. 各组件需求约定

### 6.1 cex-oracle-service

- 新建 Chainlink `quote_source`；event oracle 走方案 C。
- 新 oracle 自动建 `kline_{oracle_id}_*`；**不参与** `kline_volume_fix`。
- **§4.5 统计链路改造为 P0**（与 Chainlink 同期上线）。
- **§5.6 历史 K 线复制**为 P0。

### 6.2 surfv2-dex-svm-keeper

- 价格 WS：**零改**（按 `pair_id` 写 ticker）。
- **D1**：预测开仓去掉 `IsOpenTrading`。
- **`PredictMarketCfg`**：`pair_caps` 等 **5→15、6→16**。
- 预测主风控仍 **`chain_predict_config` + Keeper**；buffer 为补充。

### 6.3 cex-api-service

- **零业务代码**（D2）。
- event K 线：`spot_token_key` = `"15"` / `"16"`。
- event Ticker：`dex_ticker.15` / `dex_ticker.16`；perp 仍 5/6。
- perp 列表：**含 5/6**，**不含 15/16**。

### 6.4 前端

- 预测页：`/pm/config` → **`pair_id` 15/16**；**禁止** event 再订阅 5/6。
- 展示名来自配置 symbol / base·quote，**不读** `trade_pool_pairs.pair_name`。

---

## 7. 一期范围外

- 同 `pair_id` + `biz_type` 双轨（WS/HTTP 增加 `bt` / `biz_type` 参数）。
- 预测 pair 参与 `kline_volume_fix`。
- B/C 聚合可配置切换（本期固定方案 C）。
- 统计中间表（`surf_v2_oracle_price_log` 等）跨 oracle **回填**。
- 历史数据以外币对扩展（流程可复用落地文档）。

---

## 8. 发版依赖顺序（概要）

```text
1. §4.5 表结构 + oracle_key/pair_id 统计改造（Oracle）
2. Chainlink adapter + 方案 C + event oracle/pair（15/16）上架
3. §5.6 历史 K 线复制（5→15、6→16）
4. Keeper D1 + PredictMarketCfg / chain_predict_config 切 15/16
5. 前端 / E2E（预测 Chainlink + perp 5/6 回归）
```

细节见 [落地方案 §4.6 / §7.1](predict-market-chainlink-pair-implementation-max.md)。

---

## 9. 联调检查清单

- [ ] **B1**：5/6 perp、15/16 event；5/15=`ETH/USDT`，6/16=`BTC/USDT`
- [ ] event 价来自 Chainlink 主路径；perp 5/6 仍为 CEX
- [ ] `/pm/config`、订单、K 线、Ticker 均用 **15/16**（非 5/6）
- [ ] perp 列表含 **5/6**，不含 **15/16**
- [ ] 预测 **status 非 active** 仍可开仓/结算（D1）
- [ ] 历史 K 线：15/16 在 `T_cutover` 前与 5/6 同源一致（B3）
- [ ] §4.5：同名 `pair_name` 下 buffer 按 **oracle_key** 分桶，回写 **不交叉**
- [ ] Chainlink 断线 → CEX 兜底 → 恢复切回
- [ ] 30s 无 Tick 告警可达 Slack

---

## 10. 术语对照

| 术语 | 含义 |
|------|------|
| `pair_id` | 业务交易对 ID；perp 与 event **不同 ID** |
| `oracle_key` / `oracle_id` | Oracle 定价标识；perp / event **各一套** |
| `pair_name` | 展示名；**可同名**；统计 **不得** 作主键 |
| 方案 C | Chainlink 主 + CEX 备，不混价 |
| `T_cutover` | 历史复制完成、Chainlink 对 event 开始写价时刻 |
| `chain_predict_config` | event 展示 / 收益率主配置 |

---

*文档版本：2026-05；与 [predict-market-chainlink-pair-implementation.md](predict-market-chainlink-pair-implementation-max.md) 配套使用。*
