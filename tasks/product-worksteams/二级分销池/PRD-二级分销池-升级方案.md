# PRD：二级分销池渠道隔离升级方案（v2.3）

**状态：** Draft（待架构 / 工程评审）  
**版本：** v2.3（统一作用于事件合约与足球预测市场）  
**最后更新：** 2026-05-25 17:02 +08  
**交付目标：** 世界杯开赛前按阶段上线  

**关联文档：**

- [二级分销池index.md](二级分销池index.md)
- [技术方案开放问题清单.md](技术方案开放问题清单.md)
- [事件合约 v2.3 Index](../事件合约（猜涨跌）/v2.3%20-%20二级分销池渠道隔离升级/Index.md)
- [足球预测市场 v2.3 Index](../足球预测市场项目/v2.3%20-%20二级分销池渠道隔离升级/Index.md)

---

## 1. 背景

做市商 / 渠道方 A 希望作为 TurboFlow 的二级分销渠道，面向两个产品提供独立入口：

1. **事件合约（猜涨跌）**
2. **足球预测市场**

渠道方将独立运营自己的域名、前端、用户入口与入金体验；TurboFlow 继续提供底层报价、交易、合约、清结算、池子与风控基础设施。

本次 v2.3 升级不是单纯的 odds quote 改造。它会同时影响：

- Gateway / domain routing
- API service / authentication / user context
- Odds quote provision
- Keeper order routing
- Settlement / cashbook / revenue share
- User asset / deposit / withdrawal isolation
- Pool / contract / chain-side mapping

因此本文作为跨工程域 PRD，用于拆分给 gateway、API、报价、结算、合约与资金系统相关工程。

---

## 2. 核心决策：渠道独立身份域 + 独立资金域

渠道站是**独立运营站点**，不应只是 TurboFlow 主站上的一个轻量 referral / builder code。

本期明确采用以下模型：

1. **渠道用户与 TurboFlow 主站用户隔离**
   - 从渠道站注册的用户必须打上 `channel_id` / `identity_domain`。
   - 渠道站用户不能直接登录 TurboFlow 主站。
   - TurboFlow 主站用户不能直接登录渠道站。
   - 如未来需要迁移或绑定，必须走显式流程，不做隐式跨站登录。

2. **渠道余额与 TurboFlow 主站余额完全隔离**
   - 渠道站充值进入渠道资金域，例如 `fund_domain = channel:A`。
   - TurboFlow 主站充值进入主站资金域，例如 `fund_domain = TF`。
   - 渠道站只能展示、交易、提现渠道资金域余额。
   - TurboFlow 主站只能展示、交易、提现主站资金域余额。

3. **禁止跨域充值、提现与余额复用**
   - 不允许 `TF 充值 -> 渠道站提现`。
   - 不允许 `渠道站充值 -> TF 主站提现`。
   - 不允许使用 TF 主站余额在渠道站交易。
   - 不允许使用渠道站余额在 TF 主站交易。

4. **隔离必须由后端强制**
   - 前端隐藏余额或按钮不构成隔离。
   - API、JWT/session、user_asset、cashbook、withdraw、settlement 都必须校验 `identity_domain` 与 `fund_domain`。

---

## 3. v2.3 目标

- [ ] **G1 — Gateway 识别并强制渠道上下文**  
  通过域名 / API key / gateway header 解析 `channel_id`，并把 `channel_id`、`identity_domain`、`fund_domain` 贯穿到 API、报价、下单、结算与提现路径。

- [ ] **G2 — 渠道身份隔离**  
  渠道站独立注册、独立登录、独立 session / Privy app。渠道用户不能跨登录 TF 主站，TF 主站用户不能跨登录渠道站。

- [ ] **G3 — 渠道资金隔离**  
  用户资产、充值、提现、cashbook、交易盈亏全部按 `fund_domain` 隔离，禁止跨域余额复用与跨域出入金。

- [ ] **G4 — 渠道报价 markup p%**  
  渠道站用户看到的 odds quote = TurboFlow base quote / best quote 经渠道 markup 调整后的价格；展示价、下单价、结算价必须一致。

- [ ] **G5 — 分销池路由开关**  
  足球预测市场支持按渠道 / 市场配置分销池路由开关。开关 ON 时订单进入渠道分销池；OFF 时进入 TF 公共路由池。

- [ ] **G6 — 渠道收入与结算对账**  
  markup 收入、分销池盈亏、手续费、cashbook 与结算报表必须能按 `channel_id` 对账。

---

## 4. 非目标

- **本期不做 L1:L2 同一笔订单比例拆分。** v2.3 使用布尔路由开关；同一笔订单只进入一个结算池。
- **本期不做渠道用户与主站用户的统一登录。** 统一登录与跨站绑定不属于 v2.3。
- **本期不允许跨域资金划转。** 如未来需要 TF 与渠道资金互转，必须单独立项并走财务对账流程。
- **本期不做通用自助渠道平台。** 先围绕渠道 A 落地，但数据模型预留多渠道扩展。
- **本期不强依赖多 Vendor best_quote 完整落地。** v2.3 的 markup 叠加点应兼容当前 base quote，也兼容未来 v2.2 多 Vendor best_quote。

---

## 5. 适用产品范围

| 产品        | v2.3 改造范围                                       | 池子策略                         | 版本索引                                                       |
| --------- | ----------------------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| 事件合约（猜涨跌） | 渠道站入口、独立用户域、独立资金域、渠道报价 markup、收入对账              | 本期 100% 走 TF 公共池，不走渠道分销池     | [事件合约 v2.3](../事件合约（猜涨跌）/v2.3%20-%20二级分销池渠道隔离升级/Index.md)  |
| 足球预测市场    | 渠道站入口、独立用户域、独立资金域、渠道报价 markup、分销池路由开关、收入 / 盈亏对账 | 开关 OFF 走 TF 公共池；开关 ON 走渠道分销池 | [足球预测市场 v2.3](../足球预测市场项目/v2.3%20-%20二级分销池渠道隔离升级/Index.md) |
|           |                                                 |                              |                                                            |

---

## 6. 名词定义

| 术语                | 定义                                                  |
| ----------------- | --------------------------------------------------- |
| `channel_id`      | 渠道标识，例如 `channel:A`。用于域名识别、报价、订单、池子、结算与报表归因。        |
| `identity_domain` | 身份域。用于区分用户是 TF 主站用户还是某个渠道站用户。                       |
| `fund_domain`     | 资金域。用于区分余额、充值、提现、cashbook 与盈亏所属财务体系。                |
| `base quote`      | TurboFlow 当前公共池基础报价。未来可替换为多 Vendor 聚合 `best_quote`。 |
| `markup p%`       | 渠道在 base quote 之上配置的报价加成，是渠道收入来源之一。                 |
| TF 公共池 / L1       | TurboFlow 公共自营 / 聚合流动性池。                            |
| 渠道分销池 / L2        | 渠道方自己的流动性池。足球预测市场开关 ON 时订单进入该池。                     |
| 分销池开关             | 控制足球预测市场订单进入 TF 公共池还是渠道分销池的布尔配置。                    |

---

## 7. 端到端架构

### 7.1 请求上下文

所有渠道站请求必须形成统一上下文：

```text
Host / API Key / Gateway Header
  -> channel_id
  -> identity_domain
  -> fund_domain
  -> API context / JWT claims / RPC metadata
  -> quote / order / settlement / asset / withdraw
```

建议上下文字段：

| 字段 | 示例 | 用途 |
| --- | --- | --- |
| `channel_id` | `channel:A` | 渠道归因、报价、路由、报表 |
| `identity_domain` | `channel:A` / `TF` | 登录、注册、用户隔离 |
| `fund_domain` | `channel:A` / `TF` | 余额、cashbook、充值、提现、盈亏隔离 |
| `source_host` | `a.example.com` | 审计与故障排查 |

### 7.2 Gateway / API Service

Gateway 与 `cex-api-service` 需要从“单品牌入口”升级为“按域名识别渠道入口”。

要求：

1. Gateway / ALB / API Gateway 根据 `Host` 映射 `channel_id`。
2. `cex-api-service` 在请求入口解析并校验 `channel_id`。
3. 渠道域名只能使用渠道对应的 Privy app / auth config。
4. 主站域名只能生成 `identity_domain = TF` 的 session。
5. 渠道域名只能生成 `identity_domain = channel:A` 的 session。
6. API context / JWT claims 必须包含 `channel_id`、`identity_domain`、`fund_domain`。
7. 所有下游 RPC 调用必须透传渠道上下文。
8. 无渠道上下文的主站请求必须保持现有行为不回归。

### 7.3 用户注册与登录隔离

用户服务需要支持同一外部身份标识在不同身份域下独立存在，或明确禁止同一外部标识跨域复用。无论底层使用单表还是多表，业务语义必须满足：

| 场景 | 期望结果 |
| --- | --- |
| 用户在渠道站注册 | 创建 / 绑定 `identity_domain = channel:A` 用户 |
| 渠道站用户访问 TF 主站 | 不允许直接登录；需要重新注册或走显式绑定流程 |
| TF 主站用户访问渠道站 | 不允许直接登录；需要重新注册或走显式绑定流程 |
| 同一个钱包 / 邮箱在两个站点出现 | 两边账户、余额、订单、提现权限互相独立 |

实现建议：

- 用户唯一键从 `external_user_id` 扩展为 `(identity_domain, external_user_id)`。
- session / JWT 必须绑定 `identity_domain`。
- API 查询用户资产、订单、持仓时必须带 `identity_domain` / `fund_domain` 条件。
- 管理后台可以按 `channel_id` 查询，但普通用户 API 不允许跨域查询。

### 7.4 资金域与资产隔离

用户资产账本必须从“按用户 + 资产”升级为“按用户 + 资产 + 资金域”。

建议模型：

```text
user_asset(user_id, asset_id, fund_domain, available, frozen, ...)
cashbook(user_id, asset_id, fund_domain, channel_id, action, amount, ref_id, ...)
withdraw_order(user_id, asset_id, fund_domain, channel_id, ...)
deposit_order(user_id, asset_id, fund_domain, channel_id, ...)
```

强制规则：

1. 渠道站只展示 `fund_domain = channel:A` 的余额。
2. TF 主站只展示 `fund_domain = TF` 的余额。
3. 渠道站下单只能冻结 / 扣减 / 结算渠道资金域余额。
4. TF 主站下单只能冻结 / 扣减 / 结算主站资金域余额。
5. 渠道站提现只能从渠道资金域扣减，并进入渠道对应出金链路。
6. TF 主站提现只能从主站资金域扣减，并进入 TF 出金链路。
7. 充值入账必须由来源决定 `fund_domain`，不能由前端传参决定。
8. 默认不提供跨 `fund_domain` 内部划转。

### 7.5 报价 markup

报价公式：

```text
channel_quote = apply_markup(base_quote, channel_markup_config)
```

要求：

1. markup 必须在服务端权威计算，不能只做前端展示。
2. 用户看到的报价、下单时锁定的价格、最终结算价格必须一致。
3. markup 配置至少支持 `(channel_id, product, market_id/pair_id)` 粒度。
4. 无渠道配置时必须回退主站报价。
5. v2.3 需要兼容当前 base quote，也需要兼容未来 v2.2 多 Vendor `best_quote`。
6. 每笔订单需要记录 `base_quote`、`markup_rate`、`channel_quote`、`channel_id`，用于结算与对账。

markup 形式建议使用乘法因子，以复用现有 price factor / slippage / buffer-rate 机制：

```text
channel_quote = base_quote * (1 + markup_rate)
```

如产品侧坚持按 odds 点数加法处理，需要在 API 文档中单独明确。

### 7.6 分销池路由

事件合约：

- v2.3 不启用渠道分销池。
- 所有渠道站事件合约订单仍进入 TF 公共池。
- 仅叠加渠道身份、资金域、markup 与收入对账。

足球预测市场：

- v2.3 支持分销池开关。
- 开关 OFF：订单进入 TF 公共池。
- 开关 ON：订单进入渠道分销池。
- 路由结果必须写入订单 `pool_id`，并参与结算与对账。

建议逻辑：

```text
resolve_pool(channel_id, product, market_id):
  if product == event_contract:
    return TF_PUBLIC_POOL

  if product == football_prediction:
    if channel_pool_switch(channel_id, market_id) == true
       and channel_pool_healthy(channel_id, market_id):
      return CHANNEL_POOL
    return TF_PUBLIC_POOL
```

风险护栏：

- 渠道分销池不存在：回退公共池或拒单，需配置化。
- 渠道分销池保证金不足：默认拒单或自动回退公共池，需评审确认。
- 渠道分销池暂停：强制回退公共池或暂停渠道市场。
- 路由开关变更应只影响新订单，不回溯已成交订单。

### 7.7 渠道收入、结算与对账

每笔渠道订单至少需要可追踪：

- `channel_id`
- `identity_domain`
- `fund_domain`
- `product`
- `market_id / pair_id`
- `pool_id`
- `base_quote`
- `markup_rate`
- `channel_quote`
- `markup_amount`
- fee / PnL / settlement ref

结算要求：

1. markup 收入独立记录，可按渠道汇总。
2. 足球预测市场进入分销池的订单，其池子盈亏归渠道分销池。
3. 事件合约即使来自渠道站，也只进入 TF 公共池，但 markup 收入仍归渠道。
4. 渠道收入结算到指定渠道提成地址或先进入 TF 分销中转地址后清分。具体路径需工程 / 财务确认。
5. 报表至少支持按渠道、产品、市场、日期查询订单量、markup 收入、池子盈亏、充值、提现与余额。

### 7.8 合约与池子

合约 / 池子侧需要支持渠道池映射，而不是只依赖全局默认池。

要求：

1. 渠道分销池创建后必须绑定 `channel_id`。
2. 池子状态、保证金、风险参数需要可被 keeper 路由读取。
3. 足球预测市场订单进入渠道分销池时，链上 / 合约 / keeper 记录应能追溯到对应 `pool_id`。
4. 若合约层需要新增 channel pool metadata，应与订单 `pool_id` 和后台配置保持一致。
5. 合约事件 / chain listener / settlement record 需要保留足够字段供渠道对账。

---

## 8. 分销商参数管理 API

v2.3 至少需要以下控制面能力：

| 能力 | 关键字段 | 说明 |
| --- | --- | --- |
| 渠道注册 / 配置 | `channel_id`, domain, auth config, status | 建立渠道域名、Privy app、默认资金域 |
| 设置 markup | `channel_id`, product, market_id/pair_id, markup_rate | 控制用户端 odds quote 加成 |
| 设置分销池开关 | `channel_id`, `product`, `market_id`, `enabled` | 主要用于足球预测市场 |
| 绑定渠道分销池 | `channel_id`, product, market_id, pool_id | 建立渠道池路由关系 |
| 设置提成地址 | `channel_id`, asset, address | 用于 markup / revenue share 结算 |
| 查询渠道对账 | `channel_id`, product, date range | 订单、收入、盈亏、充值、提现 |

权限要求：

- 渠道方只能查看 / 修改自己渠道的配置。
- TF 管理后台可以管理全部渠道。
- 所有配置变更必须审计记录。
- 影响报价 / 路由的配置变更需要记录生效时间。

---

## 9. 工程拆分建议

| 工程域 / 服务 | v2.3 改造内容 | 关键验收 |
| --- | --- | --- |
| Gateway / Infra | Host -> `channel_id` 映射；注入可信 header；渠道域名 CORS / origin 配置 | 渠道域名请求能稳定解析，伪造 header 不被信任 |
| `cex-api-service` | 渠道上下文解析；JWT/session claims；下游 RPC 透传；渠道报价 API | 主站无回归；渠道上下文全链路可见 |
| Auth / Privy config | 按渠道使用独立 Privy app / auth config | 渠道用户与 TF 主站用户不能跨登录 |
| `surfv2-dex-svm-user-service` | `identity_domain` 用户隔离；`fund_domain` 资产隔离；提现按域校验 | 跨站登录、跨域余额、跨域提现全部被拒 |
| `cex-chain-listen-service` | 充值入账按来源写入 `fund_domain` / `channel_id` | 主站充值和渠道充值进入各自资金域 |
| Fiat / provider callback | 渠道法币入金 callback 写入渠道资金域 | 渠道入金不污染 TF 主站余额 |
| `cex-oracle-service` / quote path | base quote 上叠加渠道 markup；兼容 future best_quote | 展示价与下单价一致 |
| `surfv2-dex-svm-keeper` | 下单时权威 markup；足球预测池路由去硬编码；订单记录渠道字段 | 事件合约公共池；足球按开关进公共池或分销池 |
| Settlement / cashbook | markup、PnL、fee、pool settlement 按渠道 / 资金域入账 | 渠道收入、池子盈亏、用户资金可对账 |
| `cex-mgt-backend` | 渠道注册、markup、分销池开关、pool 绑定、提成地址、对账查询 | 控制面可配置且权限隔离 |
| `base` / shared schema | 新增 / 扩展 `channel_id`, `identity_domain`, `fund_domain`, channel config, RPC metadata | 字段命名一致，跨服务不会各自实现 |
| Contracts / pool module | 渠道池 metadata、pool ownership、settlement event 字段补充 | 渠道分销池可追溯、可结算、可审计 |

---

## 10. 数据模型变更清单

建议新增或扩展以下数据对象，最终以工程设计为准：

| 对象 | 变更 |
| --- | --- |
| `channel` / `third_party_app` | 新增渠道注册、域名、auth config、状态、提成地址 |
| user identity | 用户唯一性增加 `identity_domain` 维度 |
| session / JWT | 增加 `channel_id`, `identity_domain`, `fund_domain` |
| `user_asset` | 增加 `fund_domain`, `channel_id` 或建立资金域维度表 |
| `cashbook` | 增加 `fund_domain`, `channel_id`, channel settlement action types |
| order | 增加 `channel_id`, `identity_domain`, `fund_domain`, `pool_id`, markup fields |
| pool config | 增加 `channel_id -> pool_id` 映射与健康状态 |
| quote config | 增加 `(channel_id, product, market_id/pair_id) -> markup_rate` |
| withdraw / deposit | 增加 `fund_domain`, `channel_id`，并由服务端写入 |

---

## 11. 验收标准

- [ ] 渠道域名访问时，后端可获取正确 `channel_id`、`identity_domain`、`fund_domain`。
- [ ] TF 主站访问时，渠道上下文为空或为 `TF`，现有报价、登录、下单、提现无回归。
- [ ] 渠道站注册用户不能直接登录 TF 主站。
- [ ] TF 主站注册用户不能直接登录渠道站。
- [ ] 同一外部身份在两个站点出现时，账户、余额、订单、提现权限互相独立。
- [ ] 渠道站只展示渠道资金域余额，TF 主站只展示主站资金域余额。
- [ ] 渠道站余额不能提现到 TF 主站出金路径，TF 主站余额不能提现到渠道出金路径。
- [ ] 渠道报价 = base quote 经渠道 markup 调整后的报价。
- [ ] 展示价、下单价、结算价一致。
- [ ] 事件合约渠道订单 100% 进入 TF 公共池。
- [ ] 足球预测市场开关 OFF 时进入 TF 公共池。
- [ ] 足球预测市场开关 ON 且渠道池健康时进入渠道分销池。
- [ ] markup 收入、池子盈亏、手续费、充值、提现可以按渠道对账。
- [ ] 伪造 `channel_id` / `fund_domain` 的客户端请求不能越权访问或提现。

---

## 12. QA 测试场景

1. **域名解析**：渠道域名、TF 主站域名、未知域名、伪造 header。
2. **注册登录隔离**：渠道注册后访问主站；主站注册后访问渠道；同邮箱 / 钱包跨域场景。
3. **资产隔离**：TF 充值、渠道充值、资产列表、冻结、解冻、盈亏结算。
4. **提现隔离**：TF 余额尝试渠道提现；渠道余额尝试 TF 提现；伪造 `fund_domain`。
5. **报价一致性**：展示 quote、下单 quote、订单记录 quote、结算 quote 对齐。
6. **markup 配置**：按渠道 / 产品 / 市场修改 markup，校验只影响目标渠道。
7. **事件合约路由**：渠道订单始终进入 TF 公共池。
8. **足球预测路由**：开关 OFF / ON / 池不存在 / 池不健康 / 开关变更并发。
9. **渠道收入对账**：N 笔订单汇总 markup、手续费、PnL 与 cashbook 一致。
10. **主站回归**：主站登录、报价、下单、结算、充值、提现全链路冒烟。
11. **安全测试**：越权查询其它渠道订单、资产、配置；伪造 JWT claims；跨域 API 调用。

---

## 13. 分期计划

| 阶段 | 范围 | 说明 |
| --- | --- | --- |
| Phase 1 | 渠道入口、身份隔离、事件合约 markup、事件合约公共池结算、基础收入对账 | 世界杯前优先可上线范围 |
| Phase 2 | 足球预测市场 markup、分销池路由开关、渠道分销池结算、池子风险护栏 | 需要 keeper / settlement / contracts 联动 |
| Phase 3 | 渠道独立入金 / 出金完整链路、资金域充值提现隔离、渠道财务报表 | 可与 Phase 1/2 部分并行，但数据模型需先定 |

---

## 14. 开放问题

- [ ] markup 口径最终采用乘法因子还是 odds 点数加法？
- [ ] 渠道分销池不健康时，是自动回退公共池还是拒单？
- [ ] markup 收入是直接结算到渠道地址，还是先进入 TF 中转地址后清分？
- [ ] 渠道法币入金 provider、KYC / AML 主体、Merchant of Record 由谁承担？
- [ ] 同一钱包 / 邮箱跨身份域重复注册时，是允许并创建独立账户，还是提示用户换用不同凭证？
- [ ] 合约层是否需要新增显式 channel pool metadata，还是仅依赖后端 `pool_id` 映射？

---

## 15. Progress

- [x] `2026-05-25 17:02 +08` 将二级分销池 PRD 升级为 v2.3，明确渠道独立身份域、独立资金域、不可跨登录、不可跨充值 / 提现 / 余额复用。
- [x] `2026-05-25 17:02 +08` 将 v2.3 范围扩展为跨 gateway、API、报价、keeper、settlement、contracts、user asset 的工程拆分 PRD。
- [ ] `TBD` 工程评审 markup 口径、分销池健康降级策略、渠道收入结算路径。
- [ ] `TBD` 基于本 PRD 拆分 gateway / API / keeper / settlement / contracts / user-service 工程任务。



