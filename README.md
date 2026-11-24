
English | [中文](README.zh.md)

> [!IMPORTANT]
> **Unofficial community integration.** This project is independently developed
> and maintained by the ramen ai community. It is not reviewed, endorsed, or
> supported by DeepSeek. Evaluate third-party plugins before using them. See the
> [DeepSeek Harness plugin category guidelines](https://github.com/deepseek-ai/deepseek-harness/discussions/2004).

<p align="center">
  <img src="assets/ramen-logo.png" alt="ramen ai" width="100"/>
</p>

<p align="center"><strong>Secure DeepSeek Harness at the moment intent becomes action.</strong></p>

`dsh-ramen-guard` is a fail-closed
[Cordis](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-primer.md)
plugin that evaluates DeepSeek Harness tool calls against ramen ai policy
before execution. It intercepts the official `tools/pre-execute` waterfall,
submits the resolved tool name and arguments through `@ramen-ai/node-core`, and
permits execution only after an allowed verdict with a locally verified Ed25519
receipt.

It runs with **no API key**. Leave `apiKey` unset and the plugin uses the keyless
public trial. Pick one of five ramen foundry profiles (authorization,
eligibility, provenance, kinematic or shield), route each tool to its own
profile, and you have a governed multi-tool demo in a few lines of YAML.

DeepSeek Harness can give autonomous agents real shell, code, data, and API
capabilities. This plugin adds an independent policy gate outside the model's
own reasoning. In the default enforcement mode, policy-violating calls are
stopped before side effects, while an approved call continues through the
remaining Cordis guard chain only with a locally verified receipt bound to the
evaluated tool intent. Audit mode is explicitly non-blocking.

Requires **Node.js 24 or newer** and is tested against DeepSeek Harness
`@deepseek-ai/cordis@4.0.1` and `@deepseek-ai/dsh-tools@0.1.1-rc.2`.

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

## Why it matters

A capable agent can turn one manipulated instruction into a shell command,
database mutation, cloud change, or payment request. Once the tool runs, a log
entry is too late. `dsh-ramen-guard` moves the decision to the last responsible
moment: after DeepSeek Harness resolves the tool call, but before the tool body
can create side effects.

- **Block before execution.** Enforce policy on the resolved `{ tool,
  arguments }` intent rather than trying to repair damage afterward.
- **Apply semantic policy, not just string matching.** Configured ramen ai
  policies can identify encoded payloads, euphemisms, or indirect wording when
  those risks are covered by the selected policy or bundle scope.
- **Fail closed when the boundary is unavailable.** In enforcement mode, a
  timeout, malformed response, cancellation, or unverifiable receipt cannot
  silently authorize the action.
- **Require cryptographic evidence for execution.** An allow response cannot
  reach the tool unless it includes an Ed25519 receipt verified locally against
  the evaluated intent and signed as an ALLOW verdict; boundary failures deny
  with the fixed unavailable reason.
- **Preserve defence in depth.** Allowed calls continue with `next()`, so the
  guard complements rather than bypasses downstream Cordis policies.

### Core IT interception

This illustrative terminal view shows `dsh-ramen-guard` denying a log-derived
credential-exfiltration attempt before downstream dispatch.

<p align="center">
  <img src="assets/core-it-interception.png" alt="Illustrative dsh-ramen-guard Core IT interception of a log-derived credential-exfiltration attempt" width="840"/>
</p>

---

## Can you bypass it?

Standard safety filters catch basic syntax. They fail against encoded payloads
and corporate jargon. We challenge you to bypass the ramen ai execution boundary
using the zero-day evasion vectors in our official
**[Red Team Guide](https://github.com/ramen-ai-dev/ramen-ai-integrations/blob/master/RED_TEAM_GUIDE.md)**.

Below is a simulation of the Grok/Bankr heist. We fed the raw adversarial
prompt directly into our sandbox. It uses a social engineering wrapper
(claiming a visual impairment) to smuggle a 3,000,000,000 DRB transfer
instruction encoded in Morse code. ramen ai evaluated the underlying
semantic intent, intercepted the unauthorized financial transfer, and blocked
it pre-execution, issuing a verified Ed25519 receipt.

<p align="center">
  <img src="assets/grok-bankr.png" alt="ramen ai intercepting the Grok/Bankr Morse-code heist pre-execution" width="720"/>
</p>

---

## Quickstart (no API key)

1. Install the package into the DeepSeek Harness profile:

   ```bash
   dsh plugin --profile web add @ramen-ai/dsh-ramen-guard
   ```

2. Add the plugin to the profile's `cordis.patch.yml`, normally under
   `${DSH_HOME:-$HOME/.dsh}/profiles/<profile>/cordis.patch.yml`. Leave
   `apiKey` out:

   ```yaml
   - insert:
       - id: dsh-ramen-guard
         name: '@ramen-ai/dsh-ramen-guard'
         config:
           profile: shield
   ```

3. Restart the profile and inspect the composed configuration if needed:

   ```bash
   dsh --profile web --dump-config
   dsh web
   ```

Every tool call that reaches the official `tools/pre-execute` waterfall is now
evaluated before the tool body runs, against the `ramen__shield_core_it` bundle,
on the keyless public trial. See [Keyless trial](#keyless-trial) for the limits.

Use the profile you actually run instead of `web` where appropriate.

---

## Foundry profiles

A profile selects one production bundle and is the quickest way to point the
guard at a workload. The five profiles mirror the ramen foundry core
architectures.

| Profile | Bundle slug | ramen foundry template | Typical tools |
|---|---|---|---|
| `authorization` | `ramen__financial_authorization_invariance` | `AuthorizationGateAgent` | `approve_expenditure`, `release_payment` |
| `eligibility` | `ramen__contractual_eligibility_invariance` | `EligibilityGateAgent` | `confirm_eligibility`, `bind_contract_terms` |
| `provenance` | `ramen__compliance_provenance_invariance` | `ProvenanceGateAgent` | `submit_filing`, `release_report` |
| `kinematic` | `ramen__industrial_iot_actuation_invariance` | `IndustrialAutomationAgent` | `adjust_plc_setpoint`, `mutate_safety_parameter`, `dispatch_manipulation` |
| `shield` | `ramen__shield_core_it` | `DevboxShieldAgent`, `DbShieldAgent`, `ScoutShieldAgent` | `inspect_directory`, `delete_path`, `terminate_process` |

`profile` sets the default for every tool. `routes` maps an exact tool name to a
profile and overrides the default for that tool. Together they assemble a
governed multi-tool demo:

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

Here `release_payment`, `confirm_eligibility` and `dispatch_manipulation` each
use their own bundle, and every other tool uses `shield`. With `routes` and no
`profile`, a tool that has no route is denied with
`ramen ai has no profile configured for this tool`.

Only the profile metadata is embedded. ramen foundry is a Python package, and
its local pre-checks do not run here: the bundle evaluates the evidence that
the tool call carries. The metadata is importable for demo builders:

```ts
import { PROFILES, PROFILE_IDS } from '@ramen-ai/dsh-ramen-guard/profiles';

PROFILES.authorization.bundleId;      // 'ramen__financial_authorization_invariance'
PROFILES.authorization.sampleIntent;  // an illustrative { tool, arguments } intent
```

Sample intents are illustrative inputs and make no claim about the verdict.
`provenance` checks evidence receipts, and a real evidence set is usually larger
than the 2,048-byte trial limit. Use an API key for full provenance checks.

---

## Keyless trial

With `apiKey` unset, the plugin evaluates through `RamenClient.trial()` from
`@ramen-ai/node-core` (`POST https://api.ramenai.dev/api/v1/paas/try`). The
trial sends no credentials and no context, and every verdict must carry a
locally verified `trial_<uuid>` Schema V5 receipt.

| Trial rule | Behaviour |
|---|---|
| Allowance | About 10 evaluations per day per network, 30 per ASN and 150 globally. The allowance resets at 00:00 UTC. |
| Scope | Exactly one bundle per request. `profile`, `routes` and `bundleIds` must resolve to one bundle per tool, and the bundle must be one the trial lists. |
| Size | The request body is limited to 2,048 bytes. A larger tool call is denied before any request is sent. |
| Not available | `policyIds` and `providerKey` fail at startup. |

Each tool call is one evaluation, so the trial suits a short demo and not a
long working session. When the allowance is used up, or a call is too large, the
tool is denied with a message that names the limit, the UTC reset time and
[ramenai.dev](https://ramenai.dev).

A key is never downgraded to the trial. If `apiKey` is set, the plugin uses it,
and an invalid key fails closed. If `apiKey` is set but empty or blank, plugin
activation fails.

---

## API key

For production use, get a ramen ai API key at
**[https://ramenai.dev/pricing](https://ramenai.dev/pricing)**.

Starter and Professional BYOK accounts also need a provider API key. Enterprise
accounts use managed inference and omit `providerKey`.

Store ramen ai and provider keys in environment variables, then resolve them
through Cordis configuration. Never place real keys directly in
`cordis.patch.yml` or source control.

```bash
export RAMEN_API_KEY=ramen_ak_...
export OPENAI_API_KEY=sk-...
```

The plugin does not read environment variables implicitly. The configuration
example below uses the official Cordis `!!js` loader expression to pass values
into `apiKey` and optional `providerKey` at load time.

---

## Installation

### From npm

DeepSeek Harness forwards `dsh plugin` package operations to the selected
profile's package manager:

```bash
dsh plugin --profile web add @ramen-ai/dsh-ramen-guard
```

### From this repository

```bash
npm install
npm run build
npm pack

dsh plugin --profile web add /absolute/path/to/ramen-ai-dsh-ramen-guard-<version>.tgz
```

Use the profile you actually run instead of `web` where appropriate.

---

## Configuration

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

At least one of `profile`, `bundleIds`, `policyIds` or `routes` is required.
`profile` and `bundleIds` combine into the default bundle scope, and `policyIds`
may be added with an API key. Invalid or incomplete configuration fails plugin
activation rather than starting an unprotected boundary.

### Enforcement mode

`mode: enforce` is the default and the production safety boundary. It denies a
tool call when:

- ramen ai returns a blocked verdict;
- the evaluation request fails, times out, or is cancelled;
- the response is malformed; or
- the cryptographic receipt is missing, cannot be verified locally, or does not
  carry a signed ALLOW verdict for an allowed call.

Infrastructure and receipt failures deterministically return:

```text
ramen ai execution boundary unavailable
```

In keyless trial mode, an exhausted allowance, an oversized request and a
server rejection return an explanatory message instead. There is no fail-open
configuration.

### Audit mode

Use `mode: audit` only when deliberately observing policy outcomes without
making ramen ai an enforcement gate:

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

Audit mode logs allowed, denied, unavailable, and unverified outcomes, then
delegates to the remaining Cordis tool policy chain. Other Harness guards may
still deny the call.

### BYOK account compatibility

Starter and Professional accounts configure `providerKey` with their provider
API key. The core SDK forwards it as the `X-Provider-Key` request header; this
plugin never places it in the evaluated tool intent. Enterprise accounts omit
`providerKey` and use managed inference. Do not put provider credentials into
tool arguments or source-controlled configuration.

---

## Example use cases

### Secure coding and operations agents

Place a policy boundary in front of shell, filesystem, database, Kubernetes,
cloud, or deployment tools. For example, deny destructive commands, unsafe
production changes, or privilege escalation before the underlying tool runs.

### Prevent secret and data exfiltration

Evaluate the destination and payload already resolved into a tool call. Policies
can deny attempts to send API keys, credentials, source code, customer records,
or other sensitive data to an unapproved endpoint.

### Guard financial and administrative workflows

Require an allowed ramen ai verdict before transfer, payment, account-management,
or access-control tools execute. Route payment tools to the `authorization`
profile when an agent can take actions with real monetary or permission
consequences.

### Add verifiable controls to high-risk workflows

Apply a profile, a standard ramen ai bundle or explicit policy IDs to each
privileged tool call. An allow response can reach the tool only when its receipt
verifies locally against the evaluated tool intent.

### Roll out policy without blocking on day one

Start with `mode: audit` to observe verdicts and tune policies while every call
continues through the Cordis chain. Switch explicitly to `mode: enforce` when
you are ready for a fail-closed boundary. Audit mode itself never blocks.

> [!NOTE]
> The plugin evaluates the resolved tool name and arguments for calls that reach
> `tools/pre-execute`. It does not scan source documents or prompts directly,
> and it cannot govern actions performed outside the Harness tool pipeline.

---

## How it works

```text
DeepSeek model proposes a tool call
                |
                v
      tools/pre-execute waterfall
                |
                v
   route: tool name -> profile bundle
                |
                v
 JSON { tool, arguments } intent payload
                |
                v
 @ramen-ai/node-core
   evaluateCompliance()  (API key)
   RamenClient.trial()   (no API key)
                |
                v
 ramen ai verdict + local Ed25519 verification
        |                         |
 verified, signed allow     block / unavailable /
        |                    missing receipt
        v                         |
     next()                       v
 remaining Cordis policy      { kind: 'deny', reason }
        |
        v
 tool body may execute
```

The listener delegates verified allowed calls with `next()`, preserving every
downstream Harness policy. A verified blocked verdict returns the evaluator's
steering rationale. Evaluation and receipt failures never reach the tool body
in enforcement mode.

---

## API reference

### Cordis exports

| Export | Description |
|---|---|
| `name` | Stable plugin display name: `dsh-ramen-guard`. |
| `inject` | Requires the Harness `tools` service. |
| `Config` | Schemastery validator consumed by the Cordis loader. |
| `apply(ctx, config)` | Registers the `tools/pre-execute` listener and creates the `RamenClient` or the trial client. |
| `BOUNDARY_UNAVAILABLE_REASON` | Stable enforcement denial reason for unavailable or unverifiable evaluations. |
| `NO_PROFILE_REASON` | Denial reason for a tool that has no route and no default scope. |
| `PROFILES`, `PROFILE_IDS`, `isProfileId` | Foundry profile metadata. Also available from `@ramen-ai/dsh-ramen-guard/profiles`. |

### Configuration

| Field | Required | Default | Description |
|---|---|---|---|
| `apiKey` | no | unset | ramen ai API key. Resolve from `RAMEN_API_KEY` with `!!js`. Unset selects the keyless trial. A blank value fails activation. |
| `providerKey` | no | — | BYOK provider API key. Resolve from `OPENAI_API_KEY` with `!!js`; omitted for managed inference. Needs `apiKey`. |
| `profile` | one of | — | Default foundry profile: `authorization`, `eligibility`, `provenance`, `kinematic` or `shield`. |
| `routes` | one of | `{}` | Map of exact tool name to profile. Overrides the default scope for that tool. |
| `bundleIds` | one of | `[]` | Bundle slugs evaluated by default. Combined with `profile`. |
| `policyIds` | one of | `[]` | Explicit policy UUIDs; may be combined with bundles. Needs `apiKey`. |
| `mode` | no | `enforce` | `enforce` or explicit non-blocking `audit`. |
| `baseUrl` | no | SDK default | ramen ai API base URL override. |

The intent sent to the SDK is:

```json
{
  "tool": "shell",
  "arguments": { "command": "rm -rf /" }
}
```

With an API key, the SDK also receives `context.tool_name` for policy and audit
context. The keyless trial sends no context.

---

## Running the tests

```bash
npm install
npm run typecheck
npm test
npm run build
```

The isolated Vitest suite uses a mock Cordis context and a mocked
`RamenClient`. It makes no network calls and needs no credentials. Coverage
includes configuration validation, keyless and keyed mode selection, profile
routing, verified allow/deny decisions, signed ALLOW checks, steering,
transport failures, trial limits, cancellation, missing and invalid receipts,
payload shape, and audit delegation.

---

## Available bundles

| Bundle slug | Coverage |
|---|---|
| `ramen__shield_core_it` | Destructive execution, infrastructure abuse, prompt leakage, jailbreaks, secret exfiltration, and indirect prompt injection. |
| `ramen__financial_authorization_invariance` | System-of-record budget clearance, platform order limit, cumulative vendor exposure and independent out-of-band approvals. |
| `ramen__contractual_eligibility_invariance` | Verified coverage window, exclusions as written, out-of-band inspection evidence and scheduled limits. |
| `ramen__compliance_provenance_invariance` | Verified current evidence, subject and record-type binding, tokens as issued and no self-attestation. |
| `ramen__industrial_iot_actuation_invariance` | Telemetry degradation, safety envelope and slew rate, SIS isolation and interlocks, and physical safety around people. |
| `ramen__fintech_banking_invariance` | Credit adverse-action notices and commercial-loan wire disbursement. |
| `ramen__eu_ai_act_baseline` | EU AI Act prohibited-practice, data-governance, and transparency controls. |

Pass explicit `policyIds` for custom policies. Bundle and policy details are
available at [ramenai.dev/pricing](https://ramenai.dev/pricing).

---

## Limitations

- DeepSeek Harness is in developer preview and may introduce breaking plugin
  API changes. The tested peer versions are pinned in `package.json`.
- Evaluation adds one network round-trip before each tool execution.
- The keyless trial has daily limits and a 2,048-byte request limit. It is a demo
  path and not a production boundary.
- Audit mode is observability, not an execution boundary.
- BYOK accounts must provide `providerKey`; managed-inference accounts omit it.
- This plugin governs calls that reach the Harness tool pipeline; it does not
  govern actions performed outside that pipeline or by unrelated processes.
- This is an unofficial community integration. DeepSeek does not review or
  endorse its policy behavior, security guarantees, or release process.
