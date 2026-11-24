import type { Context } from "@deepseek-ai/cordis";
import type { PreToolDecision } from "@deepseek-ai/dsh-tools";
import z from "@deepseek-ai/schemastery";
import {
  RamenClient,
  RamenTrialError,
  TRIAL_BUNDLE_IDS,
  TrialLimitError,
  verifyAllowReceiptSignature,
  type ComplianceVerdict,
  type EvaluateOptions,
  type RamenTrialClient,
} from "@ramen-ai/node-core";
import { PROFILE_IDS, isProfileId, profileBundleId, type ProfileId } from "./profiles.js";

export {
  PROFILES,
  PROFILE_IDS,
  isProfileId,
  type FoundryProfile,
  type ProfileId,
  type ProfileIntent,
} from "./profiles.js";

export const name = "dsh-ramen-guard";
export const inject = ["tools"];

export const BOUNDARY_UNAVAILABLE_REASON = "ramen ai execution boundary unavailable";
const DENIED_WITHOUT_STEERING_REASON = "ramen ai denied tool execution";
export const NO_PROFILE_REASON = "ramen ai has no profile configured for this tool";
const SIGNUP_URL = "https://ramenai.dev";

export type GuardMode = "enforce" | "audit";

export interface Config {
  /**
   * ramen ai API key. Omit it (leave it undefined) to use the keyless public
   * trial. An empty or blank value is a startup error and never selects the trial.
   */
  apiKey?: string;
  /** Optional LLM provider API key for BYOK inference. Needs `apiKey`. */
  providerKey?: string;
  /** Optional ramen ai API base URL override. */
  baseUrl?: string;
  /** Enforcement is fail-closed; audit records outcomes and delegates every call. */
  mode?: GuardMode;
  /** Default ramen foundry profile, evaluated for every tool without a route. */
  profile?: ProfileId;
  /** Per-tool profile overrides, keyed by exact tool name. */
  routes?: Record<string, ProfileId>;
  /** Default bundle slugs. Combined with `profile`. */
  bundleIds?: string[];
  /** Explicit policy UUIDs. Not available in keyless trial mode. */
  policyIds?: string[];
}

const configSchema = z.object({
  apiKey: z.string(),
  providerKey: z.string(),
  baseUrl: z.string(),
  mode: z.union(["enforce", "audit"] as const).default("enforce"),
  profile: z.union(PROFILE_IDS),
  routes: z.dict(z.union(PROFILE_IDS)),
  bundleIds: z.array(z.string().required()),
  policyIds: z.array(z.string().required()),
});

export const Config: z<Config> = z.transform(configSchema, (config) => {
  resolveConfig(config as Config);
  return config as Config;
});

interface Scope {
  bundleIds: string[];
  policyIds: string[];
}

type Engine =
  | { kind: "paid"; client: RamenClient }
  | { kind: "trial"; client: RamenTrialClient };

interface ResolvedConfig {
  trial: boolean;
  mode: GuardMode;
  defaultScope: Scope | undefined;
  routes: ReadonlyMap<string, Scope>;
}

function fail(message: string): never {
  throw new Error(`dsh-ramen-guard: ${message}`);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * Validate a configuration and resolve it to per-tool scopes. Throws on any
 * ambiguity so that an invalid configuration never starts an unprotected boundary.
 */
function resolveConfig(config: Config): ResolvedConfig {
  let trial: boolean;
  if (config.apiKey === undefined) {
    trial = true;
  } else if (typeof config.apiKey === "string" && config.apiKey.trim() !== "") {
    trial = false;
  } else {
    return fail(
      `apiKey is set but empty. Set a valid key, or leave apiKey undefined to use the keyless trial`,
    );
  }

  if (trial && config.providerKey) {
    fail("providerKey needs an apiKey; the keyless trial sends no credentials");
  }
  if (trial && config.policyIds?.length) {
    fail("policyIds need an apiKey; the keyless trial evaluates one bundle per tool call");
  }

  const bundleIds = unique([
    ...(config.bundleIds ?? []),
    ...(config.profile !== undefined ? [profileBundleId(profileOrFail(config.profile))] : []),
  ]);
  const policyIds = unique(config.policyIds ?? []);
  const defaultScope: Scope | undefined =
    bundleIds.length || policyIds.length ? { bundleIds, policyIds } : undefined;

  const routes = new Map<string, Scope>();
  for (const [tool, profile] of Object.entries(config.routes ?? {})) {
    if (!tool.trim()) fail("routes keys must be non-blank tool names");
    routes.set(tool, { bundleIds: [profileBundleId(profileOrFail(profile))], policyIds: [] });
  }

  if (!defaultScope && routes.size === 0) {
    fail("provide a profile, bundleIds, policyIds or routes");
  }

  if (trial) {
    const scopes: [string, Scope][] = [
      ...(defaultScope ? ([["the default scope", defaultScope]] as [string, Scope][]) : []),
      ...[...routes].map(([tool, scope]) => [`route "${tool}"`, scope] as [string, Scope]),
    ];
    for (const [label, scope] of scopes) {
      if (scope.bundleIds.length !== 1) {
        fail(`the keyless trial evaluates exactly one bundle per tool call; ${label} resolves to ${scope.bundleIds.length}`);
      }
      if (!(TRIAL_BUNDLE_IDS as readonly string[]).includes(scope.bundleIds[0])) {
        fail(`bundle "${scope.bundleIds[0]}" in ${label} is not available in the keyless trial`);
      }
    }
  }

  return { trial, mode: config.mode ?? "enforce", defaultScope, routes };
}

function profileOrFail(value: unknown): ProfileId {
  if (!isProfileId(value)) {
    return fail(`unknown profile "${String(value)}"; expected one of ${PROFILE_IDS.join(", ")}`);
  }
  return value;
}

function evaluationOptions(scope: Scope, toolName: string): EvaluateOptions {
  return {
    ...(scope.bundleIds.length ? { bundleIds: scope.bundleIds } : {}),
    ...(scope.policyIds.length ? { policyIds: scope.policyIds } : {}),
    context: { tool_name: toolName },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Why a verdict cannot be trusted, or null when it is sound. Every verdict
 * needs a receipt that the SDK verified against this exact intent. An ALLOW
 * must also carry a signed ALLOW verdict, so a genuine BLOCK receipt returned
 * with `allowed: true` is rejected.
 */
async function receiptProblem(verdict: ComplianceVerdict): Promise<string | null> {
  if (!verdict.receipt) return verdict.receiptAlert ?? "no Schema V5 receipt returned";
  if (!verdict.receiptVerified) return verdict.receiptReason ?? "receipt did not verify";
  if (!verdict.allowed) return null;
  try {
    const signed = await verifyAllowReceiptSignature(verdict.receipt);
    return signed.valid ? null : signed.reason;
  } catch (error) {
    return errorMessage(error);
  }
}

const TRIAL_SCOPE_LABEL: Record<string, string> = {
  network: "per-network daily limit",
  asn: "per-ASN daily limit",
  global: "global daily limit",
  burst: "short-term burst limit",
  unknown: "daily limit",
};

function trialResetText(error: TrialLimitError): string {
  const epoch = error.resetEpochSeconds ?? error.quota.resetEpochSeconds;
  if (epoch !== undefined) return `${new Date(epoch * 1000).toISOString()} (UTC)`;
  if (error.retryAfterSeconds !== undefined) return `in about ${error.retryAfterSeconds} seconds`;
  return "at the next 00:00 UTC";
}

/** Actionable denial text for a keyless trial failure, or null for any other error. */
function trialFailureReason(error: unknown, toolName: string): string | null {
  const head = `Tool "${toolName}" was not executed (fail-closed). `;
  if (error instanceof TrialLimitError) {
    return (
      head +
      `The ramen ai keyless trial reached its ${TRIAL_SCOPE_LABEL[error.scope] ?? TRIAL_SCOPE_LABEL.unknown} ` +
      `(scope: ${error.scope}). It resets ${trialResetText(error)}. ` +
      `Configure an apiKey to continue: ${SIGNUP_URL}`
    );
  }
  if (error instanceof RangeError) {
    return head + `${error.message} Configure an apiKey to evaluate larger tool calls: ${SIGNUP_URL}`;
  }
  if (error instanceof RamenTrialError) {
    return head + `The ramen ai keyless trial rejected the request (${error.code}): ${error.message}. ${SIGNUP_URL}`;
  }
  return null;
}

async function withCancellation<T>(run: () => Promise<T>, signal: AbortSignal): Promise<T> {
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => {
      const error = new Error("tool execution aborted");
      error.name = "AbortError";
      reject(error);
    };
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  });

  try {
    return await Promise.race([run(), aborted]);
  } finally {
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
}

function buildEngine(config: Config, trial: boolean): Engine {
  if (trial) {
    return {
      kind: "trial",
      client: RamenClient.trial({
        requireVerifiedReceipt: true,
        ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
      }),
    };
  }
  return {
    kind: "paid",
    client: new RamenClient({
      apiKey: config.apiKey as string,
      ...(config.providerKey ? { providerKey: config.providerKey } : {}),
      ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
    }),
  };
}

function evaluate(engine: Engine, payload: string, scope: Scope, toolName: string): Promise<ComplianceVerdict> {
  if (engine.kind === "trial") {
    // The trial takes exactly one bundle and no context, policy ids or credentials.
    return engine.client.tryEvaluate(payload, { bundleId: scope.bundleIds[0] });
  }
  return engine.client.evaluateCompliance(payload, evaluationOptions(scope, toolName));
}

/** Install the ramen ai execution boundary before DeepSeek Harness tool dispatch. */
export function apply(ctx: Context, config: Config): void {
  const resolved = resolveConfig(config);
  const { mode, routes, defaultScope } = resolved;
  const engine = buildEngine(config, resolved.trial);

  if (resolved.trial) {
    ctx.logger.info(
      "dsh-ramen-guard: keyless trial mode (no apiKey): one bundle per tool call, daily limits apply",
    );
  }

  ctx.on("tools/pre-execute", async (exec, next): Promise<PreToolDecision> => {
    const scope = routes.get(exec.name) ?? defaultScope;
    if (!scope) {
      if (mode === "audit") {
        ctx.logger.warn(`dsh-ramen-guard audit: no profile configured for tool "${exec.name}"`);
        return next();
      }
      return { kind: "deny", reason: NO_PROFILE_REASON };
    }

    const payload = JSON.stringify({
      tool: exec.name,
      arguments: exec.arguments,
    });

    let verdict: ComplianceVerdict;
    try {
      verdict = await withCancellation(
        () => evaluate(engine, payload, scope, exec.name),
        exec.signal,
      );
    } catch (error) {
      if (mode === "audit") {
        ctx.logger.warn(
          `dsh-ramen-guard audit: evaluation unavailable for tool "${exec.name}": ${errorMessage(error)}`,
        );
        return next();
      }
      const reason = engine.kind === "trial" ? trialFailureReason(error, exec.name) : null;
      return { kind: "deny", reason: reason ?? BOUNDARY_UNAVAILABLE_REASON };
    }

    const problem = await receiptProblem(verdict);

    if (mode === "audit") {
      ctx.logger.info(
        `dsh-ramen-guard audit: tool "${exec.name}" verdict=${verdict.allowed ? "allow" : "deny"} receipt=${problem === null ? "verified" : "unverified"}`,
      );
      return next();
    }

    if (problem !== null) {
      return { kind: "deny", reason: BOUNDARY_UNAVAILABLE_REASON };
    }
    if (!verdict.allowed) {
      return {
        kind: "deny",
        reason: verdict.steering ?? DENIED_WITHOUT_STEERING_REASON,
      };
    }

    return next();
  });
}
