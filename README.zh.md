# dsh-ramen-guard

[English](README.md) | 中文

> [!IMPORTANT]
> **非官方社区集成。** 本项目由 ramen ai 社区独立开发和维护，未经 DeepSeek
> 审核、推荐或支持。使用任何第三方插件前，请自行评估其安全性。详见
> [DeepSeek Harness 插件专区规则](https://github.com/deepseek-ai/deepseek-harness/discussions/2004)。

<p align="center">
  <img src="assets/ramen-logo.png" alt="ramen ai" width="100"/>
</p>

<p align="center"><strong>在意图变成行动之前，保护 DeepSeek Harness 工具执行。</strong></p>

`dsh-ramen-guard` 是一个故障关闭（fail-closed）的
[Cordis](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-primer.zh.md)
插件。它会在 DeepSeek Harness 工具执行之前，依据 ramen ai 策略评估工具调用。
插件拦截官方 `tools/pre-execute` waterfall，将已解析的工具名称和参数交给
`@ramen-ai/node-core`，并且只有在 verdict 允许且 Ed25519 收据已在本地验证后，
才会继续执行。

插件**无需 API 密钥**即可运行。不设置 `apiKey` 时，插件使用免密钥的公共试用（keyless trial）。
选择五个 ramen foundry profile 之一（authorization、eligibility、provenance、kinematic 或 shield），
把每个工具路由到各自的 profile，几行 YAML 就能搭出一个受治理的多工具演示。

DeepSeek Harness 可以赋予自主代理真实的 shell、代码、数据和 API 操作能力。
本插件在模型自身推理之外增加一道独立的策略门禁。在默认的强制执行模式中，
违反策略的调用会在产生副作用前被阻止；允许的调用只有携带与已评估工具意图绑定、
并经过本地验证的收据，才会继续进入后续 Cordis guard 链。审计模式明确为非阻止模式。

需要 **Node.js 24 或更高版本**。已针对 DeepSeek Harness
`@deepseek-ai/cordis@4.0.1` 和 `@deepseek-ai/dsh-tools@0.1.1-rc.2` 测试。

---

<p align="center">
  <a href="https://github.com/ramen-ai-dev/ramen-foundry">
    <img src="https://img.shields.io/badge/ramen%20foundry-D97706?style=flat&logo=python&logoColor=white" alt="ramen foundry"/>
  </a>
  &nbsp;
  <a href="https://github.com/ramen-ai-dev/ramen-ai-integrations/tree/master/plugins/langchain-python">
    <img src="https://img.shields.io/badge/LangChain-1C3C3C?style=flat&logo=langchain&logoColor=white" alt="LangChain"/>
  </a>
  &nbsp;
  <a href="https://github.com/ramen-ai-dev/ramen-ai-integrations/tree/master/plugins/pydantic-ai">
    <img src="https://img.shields.io/badge/PydanticAI-E92063?style=flat&logo=pydantic&logoColor=white" alt="PydanticAI"/>
  </a>
  &nbsp;
  <a href="https://github.com/ramen-ai-dev/mcp-shield-proxy">
    <img src="https://img.shields.io/badge/MCP-6B21A8?style=flat&logo=anthropic&logoColor=white" alt="MCP"/>
  </a>
  &nbsp;
  <a href="https://github.com/ramen-ai-dev/ramen-ai-integrations/tree/master/plugins/agt-typescript">
    <img src="https://img.shields.io/badge/Microsoft%20AGT-0078D4?style=flat&logo=microsoft&logoColor=white" alt="Microsoft AGT"/>
  </a>
  &nbsp;
  <a href="https://github.com/ramen-ai-dev/ramen-ai-integrations/tree/master/plugins/github-action">
    <img src="https://img.shields.io/badge/GitHub%20Actions-2088FF?style=flat&logo=githubactions&logoColor=white" alt="GitHub Actions"/>
  </a>
  &nbsp;
  <a href="https://github.com/ramen-ai-dev/ramen-ai-integrations/tree/master/plugins/cmcp-python">
    <img src="https://img.shields.io/badge/cMCP-00A67E?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6TTIgMTdsOCA0VjExbC04LTR6TTE0IDIxbDgtNFYxMWwtOCA0eiIvPjwvc3ZnPg==&logoColor=white" alt="cMCP"/>
  </a>
  &nbsp;
  <a href="https://github.com/ramen-ai-dev/ramen-ai-integrations/tree/master/plugins/mlflow-python">
    <img src="https://img.shields.io/badge/MLflow-0194E2?style=flat&logo=mlflow&logoColor=white" alt="MLflow"/>
  </a>
  &nbsp;
  <img src="https://img.shields.io/badge/DeepSeek%20Harness-4D6BFE?style=flat&logo=deepseek&logoColor=white" alt="DeepSeek Harness"/>
</p>

---

## 为什么值得使用？

具备真实操作能力的代理，可能把一条被操纵的指令变成 shell 命令、数据库变更、
云资源操作或支付请求。工具一旦执行，仅记录日志已经太晚。`dsh-ramen-guard`
把策略判断放在最后一个仍可安全阻止动作的时刻：DeepSeek Harness 已解析工具调用，
但工具函数尚未产生副作用。

- **在执行前阻止。** 对已解析的 `{ tool, arguments }` 意图执行策略，而不是事后补救。
- **使用语义策略，而不只是字符串匹配。** 当所选 policy 或 bundle scope 覆盖相关风险时，
  配置的 ramen ai 策略可以识别编码 payload、委婉表达或间接措辞。
- **边界不可用时故障关闭。** 在强制执行模式中，超时、格式错误的响应、取消或无法验证的
  收据都不能静默授权动作。
- **要求执行具备加密证据。** allow 响应只有包含与已评估意图绑定、经过本地验证，
  且签名结果为 ALLOW 的 Ed25519 收据，才能到达工具；边界故障则使用固定的 unavailable 原因拒绝调用。
- **保留纵深防御。** 允许的调用通过 `next()` 继续，因此本 guard 会补充而不是绕过
  后续 Cordis 策略。

### Core IT 拦截

下图为示意性的终端视图，展示 `dsh-ramen-guard` 在下游分发之前，拒绝了一次源自日志的凭据外泄尝试。

<p align="center">
  <img src="assets/core-it-interception.png" alt="dsh-ramen-guard 对源自日志的凭据外泄尝试进行 Core IT 拦截（示意）" width="840"/>
</p>

---

## 你能绕过它吗？

标准安全过滤器可以识别基础语法，却难以识别编码后的 payload 和企业话术。
欢迎使用官方 **[Red Team Guide](https://github.com/ramen-ai-dev/ramen-ai-integrations/blob/master/RED_TEAM_GUIDE.md)** 中的零日规避向量，
测试 ramen ai 执行边界。

下图模拟 Grok/Bankr 攻击：对抗性 prompt 以“视觉障碍”为社会工程包装，
把一条 3,000,000,000 DRB 转账指令编码为摩尔斯电码。ramen ai 理解其真实语义，
在执行前拦截未授权转账，并生成经过验证的 Ed25519 收据。

<p align="center">
  <img src="assets/grok-bankr.png" alt="ramen ai 在执行前拦截 Grok/Bankr 摩尔斯电码攻击" width="720"/>
</p>

---

## 快速开始（无需 API 密钥）

1. 把 package 安装到 DeepSeek Harness profile：

   ```bash
   dsh plugin --profile web add @ramen-ai/dsh-ramen-guard
   ```

2. 在所选 profile 的 `cordis.patch.yml` 中添加插件，该文件通常位于
   `${DSH_HOME:-$HOME/.dsh}/profiles/<profile>/cordis.patch.yml`。不要写 `apiKey`：

   ```yaml
   - insert:
       - id: dsh-ramen-guard
         name: '@ramen-ai/dsh-ramen-guard'
         config:
           profile: shield
   ```

3. 重启 profile；如需检查组合后的配置，可运行：

   ```bash
   dsh --profile web --dump-config
   dsh web
   ```

此后，所有进入官方 `tools/pre-execute` waterfall 的工具调用，都会在工具函数运行前，
通过免密钥公共试用依据 `ramen__shield_core_it` bundle 完成评估。限制见[免密钥试用](#免密钥试用)。

如果你运行的不是 `web` profile，请替换为实际 profile 名称。

---

## Foundry profiles

profile 对应一个生产 bundle，是把 guard 指向某类工作负载的最快方式。五个 profile
对应 ramen foundry 的核心架构。

| Profile | Bundle slug | ramen foundry 模板 | 典型工具 |
|---|---|---|---|
| `authorization` | `ramen__financial_authorization_invariance` | `AuthorizationGateAgent` | `approve_expenditure`、`release_payment` |
| `eligibility` | `ramen__contractual_eligibility_invariance` | `EligibilityGateAgent` | `confirm_eligibility`、`bind_contract_terms` |
| `provenance` | `ramen__compliance_provenance_invariance` | `ProvenanceGateAgent` | `submit_filing`、`release_report` |
| `kinematic` | `ramen__industrial_iot_actuation_invariance` | `IndustrialAutomationAgent` | `adjust_plc_setpoint`、`mutate_safety_parameter`、`dispatch_manipulation` |
| `shield` | `ramen__shield_core_it` | `DevboxShieldAgent`、`DbShieldAgent`、`ScoutShieldAgent` | `inspect_directory`、`delete_path`、`terminate_process` |

`profile` 为所有工具设置默认值。`routes` 把确切的工具名称映射到某个 profile，
并覆盖该工具的默认值。两者结合即可搭出受治理的多工具演示：

```yaml
- insert:
    - id: dsh-ramen-guard
      name: '@ramen-ai/dsh-ramen-guard'
      config:
        profile: shield
        routes:
          release_payment: authorization
          confirm_eligibility: eligibility
          dispatch_manipulation: kinematic
```

这里 `release_payment`、`confirm_eligibility` 和 `dispatch_manipulation` 各自使用自己的
bundle，其余所有工具使用 `shield`。如果只配置 `routes` 而没有 `profile`，没有路由的工具会被拒绝，
原因为 `ramen ai has no profile configured for this tool`。

这里只内置 profile 元数据。ramen foundry 是 Python 包，其本地预检查不会在此运行：
bundle 评估的是工具调用所携带的证据。元数据可供演示构建者导入：

```ts
import { PROFILES, PROFILE_IDS } from '@ramen-ai/dsh-ramen-guard/profiles';

PROFILES.authorization.bundleId;      // 'ramen__financial_authorization_invariance'
PROFILES.authorization.sampleIntent;  // 示意性的 { tool, arguments } intent
```

示例 intent 仅为示意输入，不代表任何 verdict。`provenance` 会检查证据收据，
而真实证据集通常超过 2,048 字节的试用上限。完整的 provenance 检查请使用 API 密钥。

---

## 免密钥试用

不设置 `apiKey` 时，插件通过 `@ramen-ai/node-core` 的 `RamenClient.trial()` 评估
（`POST https://api.ramenai.dev/api/v1/paas/try`）。试用不发送凭据，也不发送 context，
每个 verdict 都必须携带经过本地验证的 `trial_<uuid>` Schema V5 收据。

| 试用规则 | 行为 |
|---|---|
| 额度 | 每个网络每天约 10 次评估，每个 ASN 30 次，全局 150 次。额度在 00:00 UTC 重置。 |
| 范围 | 每次请求恰好一个 bundle。`profile`、`routes` 和 `bundleIds` 必须为每个工具解析到一个 bundle，且该 bundle 在试用列表中。 |
| 大小 | 请求体上限为 2,048 字节。过大的工具调用会在发送任何请求之前被拒绝。 |
| 不可用 | `policyIds` 和 `providerKey` 会在启动时报错。 |

每次工具调用算一次评估，因此试用适合简短演示，不适合长时间的工作会话。额度用完或调用过大时，
工具会被拒绝，并返回包含限制类型、UTC 重置时间和 [ramenai.dev](https://ramenai.dev) 的说明。

密钥永远不会被降级为试用。设置了 `apiKey` 时插件使用该密钥，无效密钥会故障关闭。
`apiKey` 已设置但为空或仅含空白字符时，插件激活失败。

---

## API 密钥

生产环境请在以下页面获取 ramen ai API 密钥：
**[https://ramenai.dev/pricing](https://ramenai.dev/pricing)**

Starter 和 Professional BYOK 套餐还需要 provider API 密钥。Enterprise 账户使用托管推理，
无需配置 `providerKey`。

请把 ramen ai 和 provider 密钥存放在环境变量中，并通过 Cordis 配置解析。不要把真实密钥
直接写入 `cordis.patch.yml` 或提交到源代码仓库。

```bash
export RAMEN_API_KEY=ramen_ak_...
export OPENAI_API_KEY=sk-...
```

插件不会隐式读取环境变量。下方配置使用 Cordis 官方的 `!!js` loader 表达式，
在加载时把环境变量传给 `apiKey` 和可选的 `providerKey`。

---

## 安装

### 从 npm 安装

DeepSeek Harness 会把 `dsh plugin` 的包管理操作转发到所选 profile：

```bash
dsh plugin --profile web add @ramen-ai/dsh-ramen-guard
```

### 从本仓库安装

```bash
npm install
npm run build
npm pack

dsh plugin --profile web add /absolute/path/to/ramen-ai-dsh-ramen-guard-<version>.tgz
```

如果你运行的不是 `web` profile，请替换为实际 profile 名称。

---

## 配置

```yaml
- insert:
    - id: dsh-ramen-guard
      name: '@ramen-ai/dsh-ramen-guard'
      config:
        apiKey: !!js process.env.RAMEN_API_KEY
        providerKey: !!js process.env.OPENAI_API_KEY
        profile: shield
        mode: enforce
```

`profile`、`bundleIds`、`policyIds` 和 `routes` 至少需要提供一个。`profile` 与 `bundleIds`
合并为默认 bundle scope，`policyIds` 可在使用 API 密钥时添加。配置无效或缺失时，
插件会加载失败，而不是启动一个未受保护的边界。

### 强制执行模式

`mode: enforce` 是默认值，也是生产安全边界。出现以下任一情况时，工具调用会被拒绝：

- ramen ai 返回阻止 verdict；
- 评估请求失败、超时或被取消；
- 响应格式无效；
- 加密收据缺失、无法在本地验证，或对允许的调用而言签名结果不是 ALLOW。

基础设施或收据失败会确定性返回：

```text
ramen ai execution boundary unavailable
```

在免密钥试用模式中，额度用尽、请求过大和服务端拒绝会返回说明性消息。
本插件不存在 fail-open 配置。

### 审计模式

只有在明确需要观察策略结果、但不把 ramen ai 作为强制门禁时，才使用 `mode: audit`：

```yaml
- insert:
    - id: dsh-ramen-guard-audit
      name: '@ramen-ai/dsh-ramen-guard'
      config:
        apiKey: !!js process.env.RAMEN_API_KEY
        providerKey: !!js process.env.OPENAI_API_KEY
        policyIds: ['<POLICY_UUID>']
        mode: audit
```

审计模式会记录允许、拒绝、不可用和未验证结果，然后继续执行 Cordis 策略链。
Harness 中的其他 guard 仍然可以拒绝调用。

### BYOK 账户兼容性

Starter 和 Professional 账户可通过 `providerKey` 配置其 provider API 密钥。核心 SDK 会将其
作为 `X-Provider-Key` 请求头发送；本插件不会把该密钥放入被评估的工具 intent。Enterprise
账户省略 `providerKey` 并使用托管推理。不要把 provider 凭据放入工具参数或受版本控制的配置。

---

## 使用场景示例

### 保护编码与运维代理

在 shell、文件系统、数据库、Kubernetes、云平台或部署工具前增加策略边界。
例如，可在底层工具运行前拒绝破坏性命令、不安全的生产环境变更或权限提升。

### 防止密钥和数据外泄

评估已经解析到工具调用中的目标地址和 payload。策略可以拒绝把 API key、凭据、
源代码、客户记录或其他敏感数据发送到未批准端点的尝试。

### 保护财务与管理工作流

在转账、支付、账户管理或访问控制工具执行前，要求 ramen ai 返回允许 verdict。
当代理能够执行具有真实资金或权限后果的动作时，可把支付类工具路由到 `authorization` profile。

### 为高风险工作流增加可验证控制

对每个特权工具调用应用 profile、标准 ramen ai bundle 或显式 policy ID。allow 响应只有在其收据
已在本地针对所评估的工具意图完成验证后，才能到达工具。

### 首日不阻断，逐步上线策略

先使用 `mode: audit` 观察 verdict 并调优策略，同时让所有调用继续进入 Cordis 链。
准备好启用真实边界后，再显式切换到 `mode: enforce`。审计模式本身永远不会阻止调用。

> [!NOTE]
> 本插件只评估进入 `tools/pre-execute` 的已解析工具名称和参数。它不会直接扫描源文档
> 或 prompt，也无法治理 Harness 工具 pipeline 之外执行的动作。

---

## 工作原理

```text
DeepSeek 模型提出工具调用
             |
             v
   tools/pre-execute waterfall
             |
             v
   路由：工具名称 -> profile bundle
             |
             v
 JSON { tool, arguments } intent payload
             |
             v
 @ramen-ai/node-core
   evaluateCompliance()  （有 API 密钥）
   RamenClient.trial()   （无 API 密钥）
             |
             v
 ramen ai verdict + 本地 Ed25519 验证
        |                         |
 已验证且签名为允许        阻止 / 不可用 /
        |                   收据缺失
        v                         |
     next()                       v
 后续 Cordis 策略          { kind: 'deny', reason }
        |
        v
 工具函数可以执行
```

对于已验证且允许的调用，listener 会调用 `next()`，因此不会绕过任何后续 Harness 策略。
已验证的阻止 verdict 会返回 evaluator 的 steering 原因。在强制执行模式中，
评估或收据失败永远不会进入工具函数。

---

## API 参考

### Cordis exports

| Export | 说明 |
|---|---|
| `name` | 稳定的插件显示名称：`dsh-ramen-guard`。 |
| `inject` | 要求 Harness `tools` service。 |
| `Config` | Cordis loader 使用的 Schemastery validator。 |
| `apply(ctx, config)` | 注册 `tools/pre-execute` listener，并创建 `RamenClient` 或试用客户端。 |
| `BOUNDARY_UNAVAILABLE_REASON` | 评估不可用或无法验证时使用的稳定拒绝原因。 |
| `NO_PROFILE_REASON` | 既没有路由也没有默认 scope 的工具所使用的拒绝原因。 |
| `PROFILES`、`PROFILE_IDS`、`isProfileId` | Foundry profile 元数据。也可从 `@ramen-ai/dsh-ramen-guard/profiles` 导入。 |

### 配置字段

| 字段 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `apiKey` | 否 | 未设置 | ramen ai API 密钥。通过 `!!js` 从 `RAMEN_API_KEY` 解析。未设置时使用免密钥试用；空白值会导致激活失败。 |
| `providerKey` | 否 | — | BYOK provider API 密钥。通过 `!!js` 从 `OPENAI_API_KEY` 解析；托管推理时省略。需要 `apiKey`。 |
| `profile` | 多选一 | — | 默认 foundry profile：`authorization`、`eligibility`、`provenance`、`kinematic` 或 `shield`。 |
| `routes` | 多选一 | `{}` | 确切工具名称到 profile 的映射，覆盖该工具的默认 scope。 |
| `bundleIds` | 多选一 | `[]` | 默认使用的 bundle slug，与 `profile` 合并。 |
| `policyIds` | 多选一 | `[]` | 显式 policy UUID；可与 bundle 同时使用。需要 `apiKey`。 |
| `mode` | 否 | `enforce` | `enforce` 或显式的非阻止 `audit`。 |
| `baseUrl` | 否 | SDK 默认值 | ramen ai API base URL override。 |

发送给 SDK 的 intent：

```json
{
  "tool": "shell",
  "arguments": { "command": "rm -rf /" }
}
```

使用 API 密钥时，SDK 还会收到 `context.tool_name`，用于策略和审计上下文。免密钥试用不发送 context。

---

## 运行测试

```bash
npm install
npm run typecheck
npm test
npm run build
```

隔离的 Vitest 测试使用 mock Cordis context 和 mock `RamenClient`，
不发送网络请求，也不需要凭据。覆盖配置验证、有密钥与免密钥的模式选择、profile 路由、
已验证的 allow/deny、已签名 ALLOW 检查、steering、transport 失败、试用额度、取消、
收据缺失或无效、payload 结构以及审计模式 delegation。

---

## 可用 bundles

| Bundle slug | 覆盖范围 |
|---|---|
| `ramen__shield_core_it` | 破坏性执行、基础设施滥用、prompt 泄漏、jailbreak、密钥外泄和间接 prompt injection。 |
| `ramen__financial_authorization_invariance` | 系统记录的预算放行、平台订单上限、供应商累计敞口和独立的带外审批。 |
| `ramen__contractual_eligibility_invariance` | 经验证的保障期间、按原文适用的除外条款、带外检查证据和约定限额。 |
| `ramen__compliance_provenance_invariance` | 经验证的当前证据、主体与记录类型绑定、令牌按原样使用，以及禁止自我证明。 |
| `ramen__industrial_iot_actuation_invariance` | 遥测降级、安全包络与转换速率、SIS 隔离与联锁，以及人员周边的物理安全。 |
| `ramen__fintech_banking_invariance` | 信贷不利行动通知和商业贷款电汇发放。 |
| `ramen__eu_ai_act_baseline` | 欧盟 AI 法案中的禁止行为、数据治理和透明度控制。 |

自定义策略请使用显式 `policyIds`。Bundle 和 policy 详情见
[ramenai.dev/pricing](https://ramenai.dev/pricing)。

---

## 限制

- DeepSeek Harness 仍处于 developer preview，plugin API 可能发生破坏性变更。
  已测试的 peer 版本固定在 `package.json` 中。
- 每次工具执行前都会增加一次网络往返。
- 免密钥试用有每日额度和 2,048 字节的请求上限。它是演示路径，不是生产边界。
- 审计模式仅用于可观测性，不构成执行边界。
- BYOK 账户必须提供 `providerKey`；托管推理账户省略该字段。
- 本插件只治理进入 Harness 工具 pipeline 的调用，不治理 pipeline 之外或其他进程中的动作。
- 这是非官方社区集成。DeepSeek 不审核或推荐其策略行为、安全保证或发布流程。
